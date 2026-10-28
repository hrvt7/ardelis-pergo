// Érdeklődő (lead) fogadása. Platformfüggetlen: Web-szabványos Request →
// Response, így Vercel függvényként (api/lead.ts) és a helyi fejlesztői
// szerveren (server/dev.ts) is ugyanez fut.
//
// Működés:
// 1. ellenőrzi a bemenetet, kiszűri a robotokat (rejtett mező + időzítés);
// 2. a konfigurációt a gyártó szabályaihoz igazítja és az árat SZERVEROLDALON
//    újraszámolja — a böngészőből érkező összeget nem fogadja el;
// 3. elmenti Supabase-be (ha be van állítva), e-mailt küld a gyártónak és
//    visszaigazolást az ügyfélnek (Resenddel, ha be van állítva).
import { z } from 'zod'
import { isWallSide, MOUNT_LABELS, wallLabel } from '../src/lib/mount'
import { formatHuf, formatNumber, SIDE_LABELS, SIDE_NAMES } from '../src/lib/pricing'
import { shareHash } from '../src/lib/shareCode'
import { getBom, getSpecCode } from '../src/lib/specification'
import { getTenant } from '../src/tenants'
import { parseConfig, roofLabels, tenantPrice } from '../src/tenants/rules'
import type { Tenant } from '../src/tenants/types'
import type { PergolaConfig, PriceBreakdown, SideKey } from '../src/types/pergola'

export type LeadEnv = Record<string, string | undefined>

const MAX_BODY_BYTES = 40_000
const MIN_FILL_MS = 2_500

const leadSchema = z.object({
  tenantId: z.string().trim().min(1).max(64),
  config: z.unknown(),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().min(6).max(40).regex(/^[+0-9 ()/-]+$/, 'Érvénytelen telefonszám'),
    postalCode: z.string().trim().min(4).max(12),
    city: z.string().trim().min(2).max(120),
    region: z.string().trim().min(2).max(60),
    address: z.string().trim().max(220).optional().default(''),
    notes: z.string().trim().max(2000).optional().default(''),
  }),
  consent: z.literal(true),
  /** Rejtett mező: ember nem tölti ki. */
  website: z.string().max(200).optional().default(''),
  /** Régi kliensek: az űrlap megnyitásának időpontja (ms). Az óraeltérés miatt nem használjuk szűrésre. */
  startedAt: z.number().int().positive().optional(),
  /** Mennyi ideig volt nyitva az űrlap a beküldésig (ms), a böngésző saját órájával mérve. */
  elapsedMs: z.number().int().nonnegative().max(1_000_000_000).optional(),
  source: z.enum(['demo', 'standalone', 'embed']).default('standalone'),
  pageUrl: z.string().max(2000).optional(),
})

export type LeadInput = z.infer<typeof leadSchema>

export interface LeadRecord {
  ref: string
  tenant: Tenant
  input: LeadInput
  config: PergolaConfig
  price: PriceBreakdown
  configUrl: string
  createdAt: Date
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

/** Egysoros szöveg (pl. e-mail tárgy): sortörés és vezérlőkarakter nélkül. */
const oneLine = (value: string) => Array.from(value, (character) => (character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? ' ' : character)).join('').replace(/\s+/g, ' ').trim()

const RATE_WINDOW_MS = 10 * 60_000
const RATE_MAX_PER_CLIENT = 6
const RATE_MAX_PER_EMAIL = 3
const recent = new Map<string, number[]>()

/** Tesztekhez: a visszaélés-fék számlálóinak törlése. */
export function resetLeadRateLimit() { recent.clear() }

function clientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return `ip:${forwarded || request.headers.get('x-real-ip') || 'unknown'}`
}

function rateLimited(client: string, email: string, now: number) {
  const hits = (key: string) => (recent.get(key) ?? []).filter((time) => now - time < RATE_WINDOW_MS)
  const clientHits = hits(client)
  const emailHits = hits(`email:${email}`)
  if (clientHits.length >= RATE_MAX_PER_CLIENT || emailHits.length >= RATE_MAX_PER_EMAIL) return true
  recent.set(client, [...clientHits, now])
  recent.set(`email:${email}`, [...emailHits, now])
  if (recent.size > 5000) for (const [key, times] of recent) if (!times.some((time) => now - time < RATE_WINDOW_MS)) recent.delete(key)
  return false
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)

function makeRef(tenant: Tenant, now: Date) {
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const random = crypto.getRandomValues(new Uint8Array(3)).reduce((text, byte) => text + byte.toString(16).padStart(2, '0'), '').toUpperCase()
  return `${tenant.id.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()}-${date}-${random}`
}

function siteOrigin(request: Request, env: LeadEnv) {
  if (env.PUBLIC_SITE_URL) return env.PUBLIC_SITE_URL.replace(/\/$/, '')
  return new URL(request.url).origin
}

/** A konfiguráció olvasható sorai (e-mailhez, adatbázishoz). */
export function describeConfig(tenant: Tenant, config: PergolaConfig, price: PriceBreakdown): [string, string][] {
  const labels = roofLabels(tenant)
  const color = config.frameColor === 'custom'
    ? `Egyedi RAL ${config.customRal ?? ''}`.trim()
    : (() => { const item = tenant.colors.find((entry) => entry.id === config.frameColor); return item ? `${item.name} · ${item.detail}` : config.frameColor })()
  const sides = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => `${SIDE_NAMES[side]}: ${isWallSide(config.mount, side) ? wallLabel(side).toLowerCase() : SIDE_LABELS[config.sides[side]]}`).join(' · ')
  const extras = [config.led && 'periméter LED', config.heaters > 0 && `${config.heaters} db fűtés`, config.speakers && 'hangrendszer', config.sensors && 'eső- és szélszenzor'].filter(Boolean).join(', ')
  return [
    ['Tetőrendszer', labels[config.roof]],
    ['Méret (sz × m × m)', `${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} × ${formatNumber(config.height, 2)} m · ${formatNumber(price.area)} m²`],
    ['Rögzítés', MOUNT_LABELS[config.mount]],
    ['Szín', color],
    ['Oldalak', sides],
    ['Kiegészítők', extras || 'nincs'],
    ['Konfigurációs kód', getSpecCode(config)],
  ]
}

function managerEmailHtml(record: LeadRecord) {
  const { tenant, input, config, price } = record
  const rows = (pairs: [string, string][]) => pairs.map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0;color:#62727a;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(value)}</td></tr>`).join('')
  const customer: [string, string][] = [
    ['Név', input.customer.name],
    ['Telefon', input.customer.phone],
    ['E-mail', input.customer.email],
    ['Helyszín', [input.customer.postalCode, input.customer.city, input.customer.address].filter(Boolean).join(' ')],
    ['Régió', input.customer.region],
    ...(input.customer.notes ? [['Megjegyzés', input.customer.notes] as [string, string]] : []),
  ]
  const lines: [string, string][] = [...price.lines.map((line) => [line.label, formatHuf(line.amountNet)] as [string, string]), ['Telepítés', formatHuf(price.installationNet)]]
  const bom = getBom(config).map((line) => [line.label, line.value] as [string, string])
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#f1f4f4;font-family:Arial,Helvetica,sans-serif;color:#233039">
<div style="max-width:640px;margin:0 auto;padding:24px">
<p style="font-size:12px;letter-spacing:1px;color:#62727a;margin:0 0 8px">ÚJ FELMÉRÉSI KÉRELEM · ${escapeHtml(record.ref)}</p>
<h1 style="font-size:22px;margin:0 0 4px">${escapeHtml(input.customer.name)} – ${escapeHtml(formatHuf(price.totalGross))} bruttó irányár</h1>
<p style="margin:0 0 20px;color:#62727a">${escapeHtml(input.customer.city)} · ${escapeHtml(roofLabels(tenant)[config.roof])} · ${escapeHtml(`${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} m`)}</p>
<div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:16px"><h2 style="font-size:15px;margin:0 0 8px">Ügyfél</h2><table style="border-collapse:collapse;font-size:14px">${rows(customer)}</table>
<p style="margin:12px 0 0"><a href="tel:${escapeHtml(input.customer.phone.replace(/[^+0-9]/g, ''))}" style="color:#007fae">Hívás</a> · <a href="mailto:${escapeHtml(input.customer.email)}" style="color:#007fae">Válasz e-mailben</a></p></div>
<div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:16px"><h2 style="font-size:15px;margin:0 0 8px">Konfiguráció</h2><table style="border-collapse:collapse;font-size:14px">${rows(describeConfig(tenant, config, price))}</table>
<p style="margin:12px 0 0"><a href="${escapeHtml(record.configUrl)}" style="color:#007fae">Megnyitás a 3D konfigurátorban →</a></p></div>
<div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:16px"><h2 style="font-size:15px;margin:0 0 8px">Irányár (nettó tételek)</h2><table style="border-collapse:collapse;font-size:14px">${rows(lines)}</table>
<p style="margin:12px 0 0;font-size:15px"><strong>Nettó: ${escapeHtml(formatHuf(price.totalNet))} · Bruttó: ${escapeHtml(formatHuf(price.totalGross))}</strong></p>
<p style="margin:6px 0 0;font-size:12px;color:#62727a">A szerver a(z) ${escapeHtml(tenant.brand.name)} árlistájával számolta újra.</p></div>
<div style="background:#fff;border-radius:8px;padding:16px 20px"><h2 style="font-size:15px;margin:0 0 8px">Tájékoztató anyaglista</h2><table style="border-collapse:collapse;font-size:13px">${rows(bom)}</table></div>
<p style="font-size:11px;color:#8a979d;margin-top:16px">Forrás: ${escapeHtml(input.source)}${input.pageUrl ? ` · ${escapeHtml(input.pageUrl)}` : ''} · ${escapeHtml(record.createdAt.toISOString())}</p>
</div></body></html>`
}

function customerEmailHtml(record: LeadRecord) {
  const { tenant, input, config, price } = record
  const contact = [tenant.brand.phone, tenant.brand.email, tenant.brand.website].filter(Boolean).map((item) => escapeHtml(item!)).join(' · ')
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#f1f4f4;font-family:Arial,Helvetica,sans-serif;color:#233039">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:8px;padding:20px 24px">
<p style="font-size:12px;letter-spacing:1px;color:#62727a;margin:0 0 8px">${escapeHtml(tenant.brand.name.toUpperCase())} · ${escapeHtml(record.ref)}</p>
<h1 style="font-size:20px;margin:0 0 12px">Köszönjük, megkaptuk a felmérési kérelmedet!</h1>
<p>Kedves ${escapeHtml(input.customer.name)}!</p>
<p>A(z) ${escapeHtml(tenant.brand.name)} munkatársa hamarosan felveszi veled a kapcsolatot a helyszíni felmérés egyeztetéséhez.</p>
<p style="margin:16px 0 4px"><strong>${escapeHtml(roofLabels(tenant)[config.roof])} · ${escapeHtml(`${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} m`)}</strong></p>
<p style="margin:0 0 16px">Bruttó irányár: <strong>${escapeHtml(formatHuf(price.totalGross))}</strong> (telepítéssel)</p>
<p><a href="${escapeHtml(record.configUrl)}" style="color:#007fae">A konfigurációd megnyitása →</a></p>
<p style="font-size:12px;color:#62727a">Az irányár tájékoztató jellegű, nem minősül árajánlatnak. A végleges ár helyszíni felmérés után készül.</p>
${contact ? `<p style="font-size:12px;color:#62727a">${contact}</p>` : ''}
</div></div></body></html>`
}

async function sendEmail(env: LeadEnv, message: { to: string[]; subject: string; html: string; replyTo?: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.LEAD_FROM_EMAIL || 'Konfigurátor <onboarding@resend.dev>',
      to: message.to,
      subject: message.subject,
      html: message.html,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  })
  if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 300)}`)
}

async function storeLead(env: LeadEnv, record: LeadRecord) {
  const response = await fetch(`${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      ref: record.ref,
      tenant_id: record.tenant.id,
      source: record.input.source,
      customer_name: record.input.customer.name,
      email: record.input.customer.email.toLowerCase(),
      phone: record.input.customer.phone,
      postal_code: record.input.customer.postalCode,
      city: record.input.customer.city,
      region: record.input.customer.region,
      address: record.input.customer.address || null,
      notes: record.input.customer.notes || null,
      config: record.config,
      estimate_net: record.price.totalNet,
      estimate_gross: record.price.totalGross,
      config_url: record.configUrl,
      page_url: record.input.pageUrl ?? null,
      consent_at: record.createdAt.toISOString(),
    }),
  })
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 300)}`)
}

export async function handleLeadRequest(request: Request, env: LeadEnv): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Csak POST kérés engedélyezett.' })

  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'A kérés túl nagy.' })

  let raw: unknown
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'A kérés túl nagy.' })
    raw = JSON.parse(text)
  } catch {
    return json(400, { ok: false, error: 'Érvénytelen kérés.' })
  }

  const parsed = leadSchema.safeParse(raw)
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join('.') ?? ''
    return json(422, { ok: false, error: 'Kérlek, ellenőrizd a megadott adatokat.', field })
  }
  const input = parsed.data
  const tenant = getTenant(input.tenantId)
  if (!tenant) return json(404, { ok: false, error: 'Ismeretlen konfigurátor.' })
  if (!tenant.regions.includes(input.customer.region)) return json(422, { ok: false, error: 'Kérlek, válassz régiót a listából.', field: 'customer.region' })

  const config = parseConfig(tenant, input.config)
  if (!config) return json(422, { ok: false, error: 'A konfiguráció nem érvényes. Frissítsd az oldalt, és próbáld újra.', field: 'config' })

  const now = new Date()
  const ref = makeRef(tenant, now)

  // Robotszűrés: a robot sikert lát, de semmi nem megy ki. A kitöltési időt a böngésző
  // méri (elapsedMs) — a kliens és a szerver órájának eltérése így nem dob el valódi kérelmet.
  const tooFast = input.elapsedMs !== undefined && input.elapsedMs < MIN_FILL_MS
  if (input.website || tooFast) return json(200, { ok: true, ref })

  // Visszaélés elleni fék (példányonként, legjobb szándékkal): ugyanarról a címről vagy
  // ugyanarra az e-mailre rövid idő alatt csak néhány kérelem mehet ki.
  const limited = rateLimited(clientKey(request), input.customer.email.toLowerCase(), now.getTime())
  if (limited) return json(429, { ok: false, error: 'Túl sok kérelem érkezett rövid idő alatt. Kérlek, próbáld újra néhány perc múlva.' })

  const price = tenantPrice(tenant, config)
  const configUrl = `${siteOrigin(request, env)}/k/${tenant.id}#${shareHash(config)}`
  const record: LeadRecord = { ref, tenant, input, config, price, configUrl, createdAt: now }

  const recipients = tenant.lead.recipients.length ? tenant.lead.recipients : (env.LEAD_FALLBACK_EMAIL ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  const canEmail = Boolean(env.RESEND_API_KEY && recipients.length)
  const canStore = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)

  if (!canEmail && !canStore) {
    if (env.NODE_ENV !== 'production' || env.LEAD_DEV_LOG === '1') {
      console.info('[lead] Fejlesztői mód — nincs beállított kézbesítés, a lead csak naplózva:', JSON.stringify({ ref, tenant: tenant.id, customer: input.customer, gross: price.totalGross, configUrl }))
      return json(200, { ok: true, ref, delivered: 'dev-log' })
    }
    console.error('[lead] Nincs beállítva sem RESEND_API_KEY + címzett, sem Supabase — a lead nem kézbesíthető.')
    return json(503, { ok: false, error: 'Az űrlap jelenleg nem érhető el. Kérlek, keresd a gyártót telefonon vagy e-mailben.' })
  }

  const results = await Promise.allSettled([
    canStore ? storeLead(env, record) : Promise.resolve('skipped'),
    canEmail ? sendEmail(env, {
      to: recipients,
      subject: oneLine(`${tenant.lead.subjectPrefix} ${input.customer.name} – ${input.customer.city} – ${formatHuf(price.totalGross)}`),
      html: managerEmailHtml(record),
      replyTo: input.customer.email,
    }) : Promise.resolve('skipped'),
  ])
  const [stored, emailed] = results
  if (stored.status === 'rejected') console.error('[lead] Supabase mentés sikertelen', ref, stored.reason)
  if (emailed.status === 'rejected') console.error('[lead] Gyártói e-mail sikertelen', ref, emailed.reason)

  const deliveredSomewhere = (canStore && stored.status === 'fulfilled') || (canEmail && emailed.status === 'fulfilled')
  if (!deliveredSomewhere) return json(502, { ok: false, error: 'A kérelmet most nem sikerült továbbítani. Kérlek, próbáld újra pár perc múlva.' })

  if (env.RESEND_API_KEY && env.LEAD_SEND_CONFIRMATION !== '0') {
    try {
      await sendEmail(env, {
        to: [input.customer.email],
        subject: oneLine(`${tenant.brand.name}: megkaptuk a felmérési kérelmedet (${ref})`),
        html: customerEmailHtml(record),
        replyTo: tenant.brand.email,
      })
    } catch (error) {
      console.error('[lead] Visszaigazoló e-mail sikertelen', ref, error)
    }
  }

  return json(200, { ok: true, ref })
}
