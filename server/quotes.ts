// Számozott online ajánlat: a gyártó a felmérési kérelemből (lead) ajánlatot készít, a vevő egy titkos
// linken megnézi, elfogadja (egyszerű elektronikus aláírással) vagy elutasítja. Verziózott: új változat
// kiadásakor a régi „felülírt” lesz. Az árat a szerver számolja és az ajánlatba rögzíti (pillanatkép),
// a tartalomról SHA-256 ujjlenyomat készül, amit az elfogadáskor ellenőrzünk és az aláírás mellé mentünk.
// Platformfüggetlen (Request → Response), tárolás: Supabase REST (supabase/quotes.sql).
import { formatMoney } from '../src/lib/money'
import { z } from 'zod'
import { parseConfig, tenantPrice } from '../src/tenants/rules'
import { shareHash } from '../src/lib/shareCode'
import type { Tenant } from '../src/tenants/types'
import type { PergolaConfig, PriceBreakdown } from '../src/types/pergola'
import { permitNotes } from '../src/lib/buildings'
import { INTL_LOCALE, withLocale } from '../src/i18n/locale'
import { describeConfig, escapeHtml, oneLine, sendEmail, siteOrigin } from './lead'
import { authorize, json, resolveTenant, storeConfigured, storeHeaders, type AdminEnv } from './tenantAdmin'
import { discountFromPercent } from '../src/tenants/pricingRules'
import { deliverWebhook, quoteEventData } from './webhook'

export type QuoteStatus = 'sent' | 'accepted' | 'declined' | 'superseded' | 'withdrawn'

export interface QuoteRow {
  id: number
  tenant_id: string
  number: string
  version: number
  token: string
  lead_ref: string
  status: QuoteStatus
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_address: string | null
  config: unknown
  price: PriceBreakdown
  total_net: number
  total_gross: number
  discount_net: number
  deposit_percent: number
  deposit_gross: number
  valid_until: string
  note: string | null
  payment_info: string | null
  terms: string | null
  doc_hash: string
  view_count: number
  first_viewed_at: string | null
  last_viewed_at: string | null
  accepted_at: string | null
  signer_name: string | null
  declined_at: string | null
  decline_reason: string | null
  created_at: string
}

const DAY = 86_400_000
const MAX_BODY = 20_000

const createSchema = z.object({
  leadRef: z.string().trim().min(3).max(80),
  validDays: z.number().int().min(1).max(180).default(30),
  depositPercent: z.number().int().min(0).max(100).default(30),
  /** Nettó engedmény a gyártó pénznemében, az ajánlat nettó végösszegéből. */
  discountNet: z.number().int().min(0).max(100_000_000).default(0),
  /** Százalékos engedmény a nettó végösszegből; ha meg van adva, ez számít (a szerver számolja ki az összeget). */
  discountPercent: z.number().min(0).max(100).optional(),
  note: z.string().trim().max(2000).optional().default(''),
  paymentInfo: z.string().trim().max(600).optional(),
  terms: z.string().trim().max(3000).optional(),
  sendEmail: z.boolean().optional().default(true),
})

const adminPatchSchema = z.object({ number: z.string().min(3).max(60), version: z.number().int().min(1), action: z.literal('withdraw') })
const publicSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept'), t: z.string().length(32), name: z.string().trim().min(2).max(120), consent: z.literal(true) }),
  z.object({ action: z.literal('decline'), t: z.string().length(32), reason: z.string().trim().max(1000).optional().default('') }),
])

const TOKEN_RE = /^[0-9a-f]{32}$/

const randomHex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (byte) => byte.toString(16).padStart(2, '0')).join('')

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Az ajánlat tartalmának ujjlenyomata — bármely rögzített adat módosítása megváltoztatja. */
export function quoteHash(row: Pick<QuoteRow, 'tenant_id' | 'number' | 'version' | 'config' | 'price' | 'total_net' | 'total_gross' | 'discount_net' | 'deposit_percent' | 'deposit_gross' | 'valid_until' | 'note' | 'payment_info' | 'terms'>) {
  return sha256(JSON.stringify({
    t: row.tenant_id, n: row.number, v: row.version, c: row.config,
    l: row.price.lines.map((line) => [line.id, line.label, line.detail, line.amountNet]),
    tn: row.total_net, tg: row.total_gross, d: row.discount_net, dp: row.deposit_percent, dg: row.deposit_gross,
    vu: new Date(row.valid_until).toISOString(), note: row.note ?? '', pi: row.payment_info ?? '', tr: row.terms ?? '',
  }))
}

/** Hatályos állapot: a lejárt „sent” ajánlat „expired”. */
export const effectiveStatus = (row: Pick<QuoteRow, 'status' | 'valid_until'>, now = Date.now()): QuoteStatus | 'expired' =>
  row.status === 'sent' && new Date(row.valid_until).getTime() < now ? 'expired' : row.status

const quoteLabel = (row: Pick<QuoteRow, 'number' | 'version'>) => (row.version > 1 ? `${row.number}/v${row.version}` : row.number)

const base = (env: AdminEnv) => `${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/quotes`
const timeout = () => AbortSignal.timeout(6000)

async function selectQuotes(env: AdminEnv, query: string): Promise<QuoteRow[]> {
  const response = await fetch(`${base(env)}?${query}`, { headers: storeHeaders(env), signal: timeout() })
  if (!response.ok) throw new Error(`Supabase ${response.status}`)
  return (await response.json()) as QuoteRow[]
}

async function patchQuote(env: AdminEnv, id: number, patch: Record<string, unknown>, onlyIfStatus?: QuoteStatus) {
  const response = await fetch(`${base(env)}?id=eq.${id}${onlyIfStatus ? `&status=eq.${onlyIfStatus}` : ''}`, {
    method: 'PATCH', headers: { ...storeHeaders(env), Prefer: 'return=representation' }, body: JSON.stringify(patch), signal: timeout(),
  })
  if (!response.ok) throw new Error(`Supabase ${response.status}`)
  return (await response.json()) as QuoteRow[]
}

const tenantPrefix = (tenant: Tenant) => tenant.id.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() || 'AJ'

/** A következő szabad ajánlatszám az adott évben: PREFIX-ÉÉÉÉ-0001. */
async function nextNumber(env: AdminEnv, tenant: Tenant, year: number) {
  const prefix = `${tenantPrefix(tenant)}-${year}-`
  const rows = await selectQuotes(env, `tenant_id=eq.${encodeURIComponent(tenant.id)}&number=like.${encodeURIComponent(`${prefix}*`)}&select=number&order=number.desc&limit=1`)
  const last = rows[0]?.number.startsWith(prefix) ? Number(rows[0].number.slice(prefix.length)) : 0
  return `${prefix}${String((Number.isFinite(last) ? last : 0) + 1).padStart(4, '0')}`
}

/** A vevőnek látható (megtisztított) ajánlat. */
function publicView(row: QuoteRow, tenant: Tenant, now = Date.now()) {
  // A vevői ajánlatoldal a gyártó nyelvén és pénznemében (specifikáció, építési tudnivalók).
  return withLocale(tenant.locale ?? 'hu', () => publicViewIn(row, tenant, now))
}

function publicViewIn(row: QuoteRow, tenant: Tenant, now: number) {
  const config = row.config as PergolaConfig
  return {
    number: row.number,
    version: row.version,
    label: quoteLabel(row),
    status: effectiveStatus(row, now),
    createdAt: row.created_at,
    validUntil: row.valid_until,
    brand: { name: tenant.brand.name, legalName: tenant.brand.legalName, phone: tenant.brand.phone ?? null, email: tenant.brand.email ?? null, address: tenant.brand.address ?? null, website: tenant.brand.website ?? null, logoUrl: tenant.brand.logoUrl ?? null },
    customer: { name: row.customer_name, address: row.customer_address },
    spec: describeConfig(tenant, config, row.price),
    permit: permitNotes(config.building),
    lines: row.price.lines.map((line) => ({ label: line.label, detail: line.detail, amountNet: line.amountNet })),
    subtotalNet: row.price.subtotalNet,
    installationNet: row.price.installationNet,
    discountNet: row.discount_net,
    totalNet: row.total_net,
    totalGross: row.total_gross,
    vatRate: tenant.prices.vatRate,
    locale: tenant.locale ?? 'hu',
    currency: tenant.currency,
    depositPercent: row.deposit_percent,
    depositGross: row.deposit_gross,
    note: row.note,
    paymentInfo: row.payment_info,
    terms: row.terms,
    hash: row.doc_hash,
    acceptedAt: row.accepted_at,
    signerName: row.signer_name,
    declinedAt: row.declined_at,
    platformCredit: tenant.platformCredit !== false,
  }
}

/** Az admin listában látszó sor (token nélkül nem, azt a link másolásához kapja). */
function adminView(row: QuoteRow, origin: string, now = Date.now()) {
  return {
    number: row.number, version: row.version, label: quoteLabel(row), leadRef: row.lead_ref, status: effectiveStatus(row, now),
    customerName: row.customer_name, totalGross: row.total_gross, depositGross: row.deposit_gross, depositPercent: row.deposit_percent,
    validUntil: row.valid_until, createdAt: row.created_at, viewCount: row.view_count, firstViewedAt: row.first_viewed_at, lastViewedAt: row.last_viewed_at,
    acceptedAt: row.accepted_at, signerName: row.signer_name, declinedAt: row.declined_at, declineReason: row.decline_reason,
    url: `${origin}/ajanlat/${row.token}`,
  }
}

export type AdminQuote = ReturnType<typeof adminView>

/** Kétnyelvű szöveg a gyártó nyelvén (magyar / német). */
const say = (tenant: Tenant, hu: string, de: string) => (tenant.locale === 'de' ? de : hu)
const dateText = (tenant: Tenant, date: Date) => date.toLocaleDateString(INTL_LOCALE[tenant.locale ?? 'hu'])
const dateTimeText = (tenant: Tenant, date: Date) => date.toLocaleString(INTL_LOCALE[tenant.locale ?? 'hu'])

/** A CRM-webhook ajánlat-eseménye egy ajánlatsorból. */
const quoteEvent = (tenant: Tenant, row: QuoteRow, url?: string) => quoteEventData({
  tenant, number: row.number, version: row.version, label: quoteLabel(row), leadRef: row.lead_ref, status: row.status, url,
  customer: { name: row.customer_name, email: row.customer_email, phone: row.customer_phone ?? null },
  price: row.price, totalNet: row.total_net, totalGross: row.total_gross, discountNet: row.discount_net,
  depositPercent: row.deposit_percent, depositGross: row.deposit_gross, validUntil: row.valid_until,
  acceptedAt: row.accepted_at, signerName: row.signer_name, declinedAt: row.declined_at, declineReason: row.decline_reason,
})

const mailShell = (tenant: Tenant, title: string, body: string) => `<!doctype html><html lang="${tenant.locale ?? 'hu'}"><body style="margin:0;background:#f1f4f4;font-family:Arial,Helvetica,sans-serif;color:#233039">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:8px;padding:20px 24px">
<p style="font-size:12px;letter-spacing:1px;color:#62727a;margin:0 0 8px">${escapeHtml(tenant.brand.name.toUpperCase())}</p>
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>${body}
</div></div></body></html>`

async function notify(env: AdminEnv, tenant: Tenant, message: { to: string[]; subject: string; html: string; replyTo?: string }) {
  if (!env.RESEND_API_KEY || message.to.length === 0) return false
  try { await sendEmail(env, message); return true } catch (error) { console.error('[quote] E-mail küldése sikertelen', error); return false }
}

const ownerRecipients = (env: AdminEnv, tenant: Tenant) => (tenant.lead.recipients.length ? tenant.lead.recipients : (env.LEAD_FALLBACK_EMAIL ?? '').split(',').map((item) => item.trim()).filter(Boolean))

const LEAD_FIELDS = 'ref,customer_name,email,phone,address,postal_code,city,region,config,status'
/** A `dealer_id` oszlop újabb (supabase/leads.sql 4.79); ha még nincs az adatbázisban, nélküle olvasunk. */
const LEAD_FIELDS_WITH_DEALER = `${LEAD_FIELDS},dealer_id`

/** POST/GET/PATCH /api/admin-quotes — gyártói ajánlatkezelés (a belépési tokennel). */
export async function handleAdminQuotes(request: Request, env: AdminEnv): Promise<Response> {
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) return json(405, { ok: false, error: 'Nem engedélyezett metódus.' })
  const auth = await authorize(request, env)
  if (auth instanceof Response) return auth
  if (!storeConfigured(env)) return json(503, { ok: false, error: 'Az adattár (Supabase) nincs beállítva, az ajánlatok nem érhetők el.' })
  // A gyártó szerkesztett beállításaival (árak, árazási szabályok, CRM), ugyanúgy, mint a lead-végpont.
  const tenant = (await resolveTenant(env, auth.tenant.id)) ?? auth.tenant
  const tenantId = encodeURIComponent(tenant.id)
  const origin = siteOrigin(request, env)

  try {
    if (request.method === 'GET') {
      const rows = await selectQuotes(env, `tenant_id=eq.${tenantId}&select=*&order=created_at.desc&limit=300`)
      const now = Date.now()
      return json(200, { ok: true, quotes: rows.map((row) => adminView(row, origin, now)) })
    }

    const text = await request.text()
    if (text.length > MAX_BODY) return json(413, { ok: false, error: 'A kérés túl nagy.' })
    let raw: unknown
    try { raw = JSON.parse(text) } catch { return json(400, { ok: false, error: 'Érvénytelen kérés.' }) }

    if (request.method === 'PATCH') {
      const parsed = adminPatchSchema.safeParse(raw)
      if (!parsed.success) return json(422, { ok: false, error: 'Érvénytelen módosítás.' })
      const rows = await selectQuotes(env, `tenant_id=eq.${tenantId}&number=eq.${encodeURIComponent(parsed.data.number)}&version=eq.${parsed.data.version}&select=*&limit=1`)
      const row = rows[0]
      if (!row) return json(404, { ok: false, error: 'Az ajánlat nem található.' })
      if (row.status !== 'sent') return json(409, { ok: false, error: 'Csak a kiküldött, még függő ajánlat vonható vissza.' })
      await patchQuote(env, row.id, { status: 'withdrawn' }, 'sent')
      return json(200, { ok: true })
    }

    const parsed = createSchema.safeParse(raw)
    if (!parsed.success) return json(422, { ok: false, error: 'Kérlek, ellenőrizd az ajánlat adatait.', field: parsed.error.issues[0]?.path.join('.') ?? '' })
    const input = parsed.data

    const leadUrl = (fields: string) => `${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/leads?ref=eq.${encodeURIComponent(input.leadRef)}&tenant_id=eq.${tenantId}&select=${fields}&limit=1`
    let leadResponse = await fetch(leadUrl(LEAD_FIELDS_WITH_DEALER), { headers: storeHeaders(env), signal: timeout() })
    if (leadResponse.status === 400) leadResponse = await fetch(leadUrl(LEAD_FIELDS), { headers: storeHeaders(env), signal: timeout() })
    if (!leadResponse.ok) throw new Error(`Supabase ${leadResponse.status}`)
    const lead = ((await leadResponse.json()) as { ref: string; customer_name: string; email: string; phone: string; address: string | null; postal_code: string; city: string; region?: string; dealer_id?: string | null; config: unknown; status: string }[])[0]
    if (!lead) return json(404, { ok: false, error: 'Az érdeklődő nem található.' })

    const config = parseConfig(tenant, lead.config)
    if (!config) return json(422, { ok: false, error: 'A konfiguráció már nem érvényes a gyártó jelenlegi beállításaival. Nyisd meg a tervet, és mentsd újra.' })
    // A tételek a gyártó nyelvén kerülnek az ajánlatba (a vevő ezt látja és ezt fogadja el).
    // A lead régiójának felára és a viszonteladó árrése az ajánlatban is ugyanúgy érvényes, mint az érdeklődéskor.
    const price = withLocale(tenant.locale ?? 'hu', () => tenantPrice(tenant, config, tenant.prices, { region: lead.region, dealerId: lead.dealer_id ?? undefined }))

    // Engedmény: a nettó összegből (százalékból vagy összegként); az ÁFÁ-s érték az árképpel azonos arányból jön.
    const discountNet = input.discountPercent !== undefined ? discountFromPercent(price.totalNet, input.discountPercent, tenant.currency) : Math.min(input.discountNet, price.totalNet)
    const totalNet = price.totalNet - discountNet
    const totalGross = price.totalNet > 0 ? Math.round(totalNet * (price.totalGross / price.totalNet)) : 0
    const depositGross = Math.round((totalGross * input.depositPercent) / 100)

    const existing = await selectQuotes(env, `tenant_id=eq.${tenantId}&lead_ref=eq.${encodeURIComponent(lead.ref)}&select=*&order=created_at.desc`)
    if (existing.some((row) => row.status === 'accepted')) return json(409, { ok: false, error: 'Ehhez az érdeklődőhöz már van elfogadott ajánlat — új ajánlat nem adható ki.' })
    const previous = existing.find((row) => row.status === 'sent')
    const latest = existing[0]

    const now = new Date()
    const validUntil = new Date(now.getTime() + input.validDays * DAY)
    // A lejárat a nap végéig tart (Budapest idő szerinti napvég nélkül, egyszerűen UTC 21:59 körül kerekítünk fel naphatárra).
    validUntil.setUTCHours(21, 59, 59, 0)

    const paymentInfo = (input.paymentInfo ?? tenant.quote?.paymentInfo ?? '').trim() || null
    const terms = (input.terms ?? tenant.quote?.terms ?? '').trim() || null

    let created: QuoteRow | null = null
    for (let attempt = 0; attempt < 4 && !created; attempt++) {
      const number = latest ? latest.number : await nextNumber(env, tenant, now.getUTCFullYear())
      const version = latest ? Math.max(...existing.map((row) => row.version)) + 1 + attempt : 1
      const draft = {
        tenant_id: tenant.id, number, version, token: randomHex(16), lead_ref: lead.ref, status: 'sent' as const,
        customer_name: lead.customer_name, customer_email: lead.email, customer_phone: lead.phone,
        customer_address: [lead.postal_code, lead.city, lead.address].filter(Boolean).join(' ') || null,
        config, price, total_net: totalNet, total_gross: totalGross, discount_net: discountNet,
        deposit_percent: input.depositPercent, deposit_gross: depositGross, valid_until: validUntil.toISOString(),
        note: input.note || null, payment_info: paymentInfo, terms,
      }
      const doc_hash = await quoteHash(draft)
      const response = await fetch(base(env), { method: 'POST', headers: { ...storeHeaders(env), Prefer: 'return=representation' }, body: JSON.stringify({ ...draft, doc_hash }), signal: timeout() })
      if (response.status === 409) continue // ajánlatszám-ütközés (egyidejű kiadás) — újra
      if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 200)}`)
      created = ((await response.json()) as QuoteRow[])[0] ?? null
    }
    if (!created) return json(503, { ok: false, error: 'Az ajánlatszám kiosztása most nem sikerült. Próbáld újra.' })

    // A korábbi függő változat felülíródik, az érdeklődő státusza „ajánlatot kapott”.
    if (previous) await patchQuote(env, previous.id, { status: 'superseded' }, 'sent').catch((error) => console.error('[quote] Régi változat lezárása sikertelen', error))
    await fetch(`${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/leads?ref=eq.${encodeURIComponent(lead.ref)}&tenant_id=eq.${tenantId}&status=in.(new,contacted)`, {
      method: 'PATCH', headers: { ...storeHeaders(env), Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'offered' }), signal: timeout(),
    }).catch(() => undefined)

    const url = `${origin}/ajanlat/${created.token}`
    let emailed = false
    if (input.sendEmail) {
      const contact = [tenant.brand.phone, tenant.brand.email].filter(Boolean).map((item) => escapeHtml(item!)).join(' · ')
      emailed = await notify(env, tenant, {
        to: [lead.email],
        subject: oneLine(say(tenant, `Árajánlat ${quoteLabel(created)} – ${tenant.brand.name}`, `Angebot ${quoteLabel(created)} – ${tenant.brand.name}`)),
        replyTo: tenant.brand.email,
        html: tenant.locale === 'de'
          ? mailShell(tenant, `Ihr Angebot ist fertig (${quoteLabel(created)})`, `<p>Guten Tag ${escapeHtml(lead.customer_name)},</p>
<p>wir haben Ihr persönliches Angebot erstellt. Gesamtbetrag brutto: <strong>${escapeHtml(formatMoney(totalGross, tenant.currency))}</strong>, gültig bis <strong>${escapeHtml(dateText(tenant, validUntil))}</strong>.</p>
<p style="margin:18px 0"><a href="${escapeHtml(url)}" style="background:#007fae;color:#fff;text-decoration:none;padding:11px 18px;border-radius:6px;display:inline-block">Angebot öffnen</a></p>
<p style="font-size:12px;color:#62727a">Auf der Seite sehen Sie alle Details und können das Angebot online annehmen.</p>${contact ? `<p style="font-size:12px;color:#62727a">${contact}</p>` : ''}`)
          : mailShell(tenant, `Elkészült az árajánlatod (${quoteLabel(created)})`, `<p>Kedves ${escapeHtml(lead.customer_name)}!</p>
<p>Elkészítettük a személyre szabott árajánlatodat. Bruttó végösszeg: <strong>${escapeHtml(formatMoney(totalGross, tenant.currency))}</strong>, érvényes <strong>${escapeHtml(validUntil.toLocaleDateString('hu-HU'))}</strong>-ig.</p>
<p style="margin:18px 0"><a href="${escapeHtml(url)}" style="background:#007fae;color:#fff;text-decoration:none;padding:11px 18px;border-radius:6px;display:inline-block">Ajánlat megnyitása</a></p>
<p style="font-size:12px;color:#62727a">Az oldalon áttekintheted a részleteket, és online el is fogadhatod az ajánlatot.</p>${contact ? `<p style="font-size:12px;color:#62727a">${contact}</p>` : ''}`),
      })
    }
    await deliverWebhook(tenant, 'quote.sent', quoteEvent(tenant, created, url))
    return json(200, { ok: true, quote: adminView(created, origin), emailed, superseded: previous ? quoteLabel(previous) : null, configUrl: `${origin}/k/${tenant.id}#${shareHash(config)}` })
  } catch (error) {
    console.error('[quote] Ajánlatkezelés sikertelen', tenant.id, error)
    return json(502, { ok: false, error: 'Az ajánlatok most nem érhetők el. Próbáld újra.' })
  }
}

const recent = new Map<string, number[]>()
/** Tesztekhez. */
export function resetQuoteRateLimit() { recent.clear() }
function limited(request: Request, now: number) {
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const hits = (recent.get(key) ?? []).filter((time) => now - time < 60_000)
  if (hits.length >= 30) return true
  recent.set(key, [...hits, now])
  if (recent.size > 5000) for (const [id, times] of recent) if (!times.some((time) => now - time < 60_000)) recent.delete(id)
  return false
}

/** GET /api/quote?t=… → megtekintés (számlálással); POST → elfogadás / elutasítás. A titkos link a hitelesítés. */
export async function handleQuote(request: Request, env: AdminEnv): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') return json(405, { ok: false, error: 'Nem engedélyezett metódus.' })
  if (!storeConfigured(env)) return json(503, { ok: false, error: 'Az ajánlat most nem érhető el.' })
  const now = Date.now()
  if (limited(request, now)) return json(429, { ok: false, error: 'Túl sok kérés. Próbáld újra egy perc múlva.' })

  let token = ''
  let body: z.infer<typeof publicSchema> | null = null
  if (request.method === 'GET') {
    token = new URL(request.url).searchParams.get('t') ?? ''
  } else {
    const text = await request.text()
    if (text.length > MAX_BODY) return json(413, { ok: false, error: 'A kérés túl nagy.' })
    let raw: unknown
    try { raw = JSON.parse(text) } catch { return json(400, { ok: false, error: 'Érvénytelen kérés.' }) }
    const parsed = publicSchema.safeParse(raw)
    if (!parsed.success) return json(422, { ok: false, error: 'Kérlek, add meg a teljes nevedet, és jelöld be az elfogadó nyilatkozatot.' })
    body = parsed.data
    token = body.t
  }
  if (!TOKEN_RE.test(token)) return json(404, { ok: false, error: 'Az ajánlat nem található.' })

  try {
    const row = (await selectQuotes(env, `token=eq.${token}&select=*&limit=1`))[0]
    if (!row) return json(404, { ok: false, error: 'Az ajánlat nem található.' })
    const tenant = await resolveTenant(env, row.tenant_id)
    if (!tenant) return json(404, { ok: false, error: 'Az ajánlat nem található.' })

    if (request.method === 'GET') {
      const seen = await patchQuote(env, row.id, { view_count: row.view_count + 1, first_viewed_at: row.first_viewed_at ?? new Date(now).toISOString(), last_viewed_at: new Date(now).toISOString() }).catch(() => null)
      const view = publicView(seen?.[0] ?? row, tenant, now)
      // Régi változat megnyitásakor jelezzük, hogy van újabb.
      const newer = row.status === 'superseded' ? (await selectQuotes(env, `tenant_id=eq.${encodeURIComponent(row.tenant_id)}&number=eq.${encodeURIComponent(row.number)}&status=in.(sent,accepted,declined)&select=token&limit=1`).catch(() => []))[0] : undefined
      return json(200, { ok: true, quote: view, newerToken: newer?.token ?? null })
    }

    const input = body!
    if (row.status !== 'sent') return json(409, { ok: false, error: row.status === 'accepted' ? 'Ezt az ajánlatot már elfogadták.' : 'Ez az ajánlat már nem érvényes.', status: effectiveStatus(row, now) })
    if (effectiveStatus(row, now) === 'expired') return json(410, { ok: false, error: 'Ez az ajánlat lejárt. Kérj újat a kivitelezőtől.', status: 'expired' })

    // Integritás: az eltárolt tartalom ujjlenyomata egyezzen azzal, amit a vevő látott.
    if ((await quoteHash(row)) !== row.doc_hash) {
      console.error('[quote] Ujjlenyomat-eltérés', row.number, row.version)
      return json(409, { ok: false, error: 'Az ajánlat tartalma megváltozott. Kérj új ajánlatot.' })
    }

    const nowIso = new Date(now).toISOString()
    const label = quoteLabel(row)
    const recipients = ownerRecipients(env, tenant)
    const contact = [tenant.brand.phone, tenant.brand.email].filter(Boolean).map((item) => escapeHtml(item!)).join(' · ')

    if (input.action === 'accept') {
      const agent = (request.headers.get('user-agent') ?? '').slice(0, 300)
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''
      const updated = await patchQuote(env, row.id, { status: 'accepted', accepted_at: nowIso, signer_name: input.name, signer_ip: ip || null, signer_agent: agent || null }, 'sent')
      if (updated.length === 0) return json(409, { ok: false, error: 'Az ajánlat állapota közben megváltozott. Töltsd újra az oldalt.' })
      await fetch(`${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/leads?ref=eq.${encodeURIComponent(row.lead_ref)}&tenant_id=eq.${encodeURIComponent(row.tenant_id)}`, {
        method: 'PATCH', headers: { ...storeHeaders(env), Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'won' }), signal: timeout(),
      }).catch(() => undefined)
      const pay = row.payment_info ? `<p style="white-space:pre-line">${escapeHtml(row.payment_info)}</p>` : ''
      await Promise.all([
        notify(env, tenant, {
          to: recipients, replyTo: row.customer_email, subject: oneLine(`${say(tenant, 'ELFOGADVA', 'ANGENOMMEN')}: ${label} – ${row.customer_name} – ${formatMoney(row.total_gross, tenant.currency)}`),
          html: mailShell(tenant, say(tenant, `${row.customer_name} elfogadta az ajánlatot`, `${row.customer_name} hat das Angebot angenommen`), `<p><strong>${escapeHtml(label)}</strong> · ${escapeHtml(formatMoney(row.total_gross, tenant.currency))} (${say(tenant, 'bruttó', 'brutto')})</p><p>${say(tenant, 'Aláírta', 'Unterzeichnet von')}: <strong>${escapeHtml(input.name)}</strong>, ${escapeHtml(dateTimeText(tenant, new Date(now)))}</p><p>${say(tenant, 'Foglaló', 'Anzahlung')} (${row.deposit_percent}%): <strong>${escapeHtml(formatMoney(row.deposit_gross, tenant.currency))}</strong></p><p style="font-size:12px;color:#62727a">Telefon: ${escapeHtml(row.customer_phone ?? '')} · E-Mail: ${escapeHtml(row.customer_email)}<br>${say(tenant, 'Ujjlenyomat', 'Fingerabdruck')}: ${escapeHtml(row.doc_hash)}</p>`),
        }),
        notify(env, tenant, {
          to: [row.customer_email], replyTo: tenant.brand.email, subject: oneLine(`${say(tenant, 'Visszaigazolás', 'Bestätigung')}: ${label} – ${tenant.brand.name}`),
          html: tenant.locale === 'de'
            ? mailShell(tenant, 'Danke, Sie haben das Angebot angenommen!', `<p>Guten Tag ${escapeHtml(row.customer_name)},</p><p>Sie haben das Angebot <strong>${escapeHtml(label)}</strong> angenommen (${escapeHtml(formatMoney(row.total_gross, tenant.currency))}, brutto). Die Anzahlung beträgt <strong>${escapeHtml(formatMoney(row.deposit_gross, tenant.currency))}</strong> (${row.deposit_percent}%).</p>${pay}<p>Wir melden uns in Kürze mit den Details zur Ausführung.</p>${contact ? `<p style="font-size:12px;color:#62727a">${contact}</p>` : ''}`)
            : mailShell(tenant, 'Köszönjük, elfogadtad az ajánlatot!', `<p>Kedves ${escapeHtml(row.customer_name)}!</p><p>Az <strong>${escapeHtml(label)}</strong> számú ajánlatot elfogadtad (${escapeHtml(formatMoney(row.total_gross, tenant.currency))}, bruttó). A foglaló összege <strong>${escapeHtml(formatMoney(row.deposit_gross, tenant.currency))}</strong> (${row.deposit_percent}%).</p>${pay}<p>Hamarosan jelentkezünk a kivitelezés részleteivel.</p>${contact ? `<p style="font-size:12px;color:#62727a">${contact}</p>` : ''}`),
        }),
      ])
      await deliverWebhook(tenant, 'quote.accepted', quoteEvent(tenant, { ...row, status: 'accepted', accepted_at: nowIso, signer_name: input.name }))
      return json(200, { ok: true, status: 'accepted', acceptedAt: nowIso })
    }

    const updated = await patchQuote(env, row.id, { status: 'declined', declined_at: nowIso, decline_reason: input.reason || null }, 'sent')
    if (updated.length === 0) return json(409, { ok: false, error: 'Az ajánlat állapota közben megváltozott. Töltsd újra az oldalt.' })
    await notify(env, tenant, {
      to: recipients, replyTo: row.customer_email, subject: oneLine(`${say(tenant, 'Elutasítva', 'Abgelehnt')}: ${label} – ${row.customer_name}`),
      html: mailShell(tenant, say(tenant, `${row.customer_name} elutasította az ajánlatot`, `${row.customer_name} hat das Angebot abgelehnt`), `<p><strong>${escapeHtml(label)}</strong> · ${escapeHtml(formatMoney(row.total_gross, tenant.currency))}</p>${input.reason ? `<p>${say(tenant, 'Indok', 'Grund')}: ${escapeHtml(input.reason)}</p>` : ''}<p style="font-size:12px;color:#62727a">Telefon: ${escapeHtml(row.customer_phone ?? '')} · E-mail: ${escapeHtml(row.customer_email)}</p>`),
    })
    await deliverWebhook(tenant, 'quote.declined', quoteEvent(tenant, { ...row, status: 'declined', declined_at: nowIso, decline_reason: input.reason || null }))
    return json(200, { ok: true, status: 'declined' })
  } catch (error) {
    console.error('[quote] Ajánlat kezelése sikertelen', error)
    return json(502, { ok: false, error: 'Az ajánlat most nem érhető el. Próbáld újra.' })
  }
}
