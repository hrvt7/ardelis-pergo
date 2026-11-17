// Hibabejelentés a tulajdonosi oldalról és a gyártói „Szerviz” nézet.
//
// Tulajdonos (token, bejelentkezés nélkül):
//   POST /api/service-photo?t=…   egy JPEG (≤ 4 MB) → ellenőrzés + metaadat-eltávolítás → privát tárhely; válasz: fotóazonosító
//   POST /api/service-request     { t, component, description, photos[≤4], consent: true } → bejelentés + napló + e-mail a gyártónak
// Gyártó (admin token):
//   GET   /api/admin-service       bejelentések a fotók 10 perces aláírt linkjeivel
//   PATCH /api/admin-service       { id, status } → állapotváltás + napló
// A komponens csak a telepítés befagyasztott, zárt listájából választható. A tárolt fotóutat mindig a szerver képzi.
import { z } from 'zod'
import { authorize, json, resolveTenant, storeConfigured, storeHeaders, type AdminEnv } from './tenantAdmin'
import { escapeHtml, oneLine, sendEmail, siteOrigin } from './lead'
import { installationByToken, logEvent, PHOTO_BUCKET, rateLimited, type InstallationRow } from './installations'
import { sanitizeJpeg } from './jpeg'
import { PRIVACY_VERSION } from '../src/lib/privacyVersion'
import { withLocale, tr } from '../src/i18n/locale'
import type { Tenant } from '../src/tenants/types'

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024
export const MAX_PHOTOS = 4
export const SIGNED_URL_SECONDS = 600
const PHOTO_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export const SERVICE_STATUSES = ['new', 'in_progress', 'closed'] as const
export type ServiceStatus = typeof SERVICE_STATUSES[number]

const rest = (env: AdminEnv, table: string) => `${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${table}`
const storage = (env: AdminEnv, path: string) => `${env.SUPABASE_URL!.replace(/\/$/, '')}/storage/v1/${path}`
const timeout = (ms = 8000) => AbortSignal.timeout(ms)
const privateJson = (status: number, body: unknown) => json(status, body, { 'X-Robots-Tag': 'noindex, nofollow, noarchive' })

/** A fotó tárolási útja: gyártó / telepítés / véletlen azonosító. A tulajdonos csak az azonosítót látja. */
export const photoPath = (row: Pick<InstallationRow, 'tenant_id' | 'id'>, photoId: string) => `${row.tenant_id}/${row.id}/${photoId}.jpg`

/** Egy telepítéshez tárolható fotók száma (a bejelentésekhez csatolt és a még nem csatolt képek együtt). */
export const MAX_PHOTOS_PER_INSTALLATION = 60

async function storedPhotoCount(env: AdminEnv, row: Pick<InstallationRow, 'tenant_id' | 'id'>) {
  const response = await fetch(storage(env, `object/list/${PHOTO_BUCKET}`), { method: 'POST', headers: { ...storeHeaders(env), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: `${row.tenant_id}/${row.id}/`, limit: MAX_PHOTOS_PER_INSTALLATION + 1 }), signal: timeout() })
  if (!response.ok) return 0
  const items = await response.json().catch(() => []) as unknown[]
  return Array.isArray(items) ? items.length : 0
}

// ── Tulajdonos: fotó ────────────────────────────────────────────────────────
export async function handleServicePhoto(request: Request, env: AdminEnv, now = new Date()): Promise<Response> {
  if (request.method !== 'POST') return privateJson(405, { ok: false, error: 'Csak POST kérés engedélyezett.' })
  if (rateLimited(request, 'photo', 16, 10 * 60_000, now.getTime())) return privateJson(429, { ok: false, error: 'Túl sok feltöltés. Próbáld újra néhány perc múlva.' })
  if (!storeConfigured(env)) return privateJson(503, { ok: false, error: 'A szolgáltatás most nem érhető el.' })
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_PHOTO_BYTES) return privateJson(413, { ok: false, error: 'A kép túl nagy (legfeljebb 4 MB).' })
  try {
    const row = await installationByToken(env, new URL(request.url).searchParams.get('t') ?? '')
    if (!row) return privateJson(404, { ok: false, error: 'A link érvénytelen vagy megszűnt.' })
    const body = new Uint8Array(await request.arrayBuffer())
    if (body.length > MAX_PHOTO_BYTES) return privateJson(413, { ok: false, error: 'A kép túl nagy (legfeljebb 4 MB).' })
    const clean = sanitizeJpeg(body)
    if (!clean.ok) return privateJson(415, { ok: false, error: 'Csak JPEG kép tölthető fel.' })
    // 4.94: telepítésenkénti felső korlát – egy kiszivárgott QR-link sem töltheti meg korlátlanul a tárhelyet.
    if (await storedPhotoCount(env, row) >= MAX_PHOTOS_PER_INSTALLATION) return privateJson(429, { ok: false, error: 'Ehhez a termékhez már sok fotó érkezett. Küldd el a bejelentést a meglévő képekkel, vagy keresd a gyártót.' })
    const id = crypto.randomUUID()
    const upload = await fetch(storage(env, `object/${PHOTO_BUCKET}/${photoPath(row, id)}`), {
      method: 'POST', headers: { ...storeHeaders(env), 'Content-Type': 'image/jpeg', 'x-upsert': 'false', 'Cache-Control': 'private, max-age=0' }, body: clean.bytes, signal: timeout(15000),
    })
    if (!upload.ok) throw new Error(`Storage ${upload.status}: ${(await upload.text()).slice(0, 200)}`)
    return privateJson(201, { ok: true, photo: id })
  } catch (error) {
    console.error('[service] Fotófeltöltés sikertelen', error)
    return privateJson(502, { ok: false, error: 'A kép feltöltése nem sikerült. Próbáld újra.' })
  }
}

// ── Tulajdonos: bejelentés ──────────────────────────────────────────────────
const reportSchema = z.object({
  t: z.string(),
  component: z.string().trim().min(1).max(60),
  description: z.string().trim().min(10, 'Írd le pár mondatban a hibát (legalább 10 karakter).').max(2000),
  photos: z.array(z.string().regex(PHOTO_ID_RE)).max(MAX_PHOTOS).default([]),
  consent: z.literal(true),
  /** Rejtett mező: ember nem tölti ki. */
  website: z.string().max(200).optional().default(''),
})

async function photoExists(env: AdminEnv, path: string) {
  const response = await fetch(storage(env, `object/sign/${PHOTO_BUCKET}/${path}`), { method: 'POST', headers: storeHeaders(env), body: JSON.stringify({ expiresIn: 60 }), signal: timeout() })
  return response.ok
}

function recipients(env: AdminEnv, tenant: Tenant) {
  if (tenant.lead.recipients.length) return tenant.lead.recipients
  return (env.LEAD_FALLBACK_EMAIL ?? '').split(',').map((item) => item.trim()).filter(Boolean)
}

export function serviceEmailHtml(tenant: Tenant, input: { headline: string; leadRef: string | null; component: string; description: string; photos: number; adminUrl: string; createdAt: Date }) {
  return withLocale(tenant.locale ?? 'hu', () => `<!doctype html><html lang="${tr('hu', 'de')}"><body style="margin:0;background:#f1f4f4;font-family:Arial,Helvetica,sans-serif;color:#233039">
<div style="max-width:600px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:8px;padding:20px 24px">
<p style="font-size:12px;letter-spacing:1px;color:#62727a;margin:0 0 8px">${tr('HIBABEJELENTÉS', 'SERVICEMELDUNG')}${input.leadRef ? ` · ${escapeHtml(input.leadRef)}` : ''}</p>
<h1 style="font-size:20px;margin:0 0 6px">${escapeHtml(input.component)}</h1>
<p style="margin:0 0 16px;color:#62727a">${escapeHtml(input.headline)}</p>
<p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(input.description)}</p>
<p style="margin:0 0 16px;color:#62727a">${tr('Fotók', 'Fotos')}: ${input.photos}</p>
<p><a href="${escapeHtml(input.adminUrl)}" style="display:inline-block;background:#007fae;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${tr('Megnyitás a Szerviz nézetben →', 'In der Service-Ansicht öffnen →')}</a></p>
<p style="font-size:12px;color:#8a979d">${tr('A fotók csak az adminban, belépés után nyithatók meg. A bejelentő elérhetőségét az érdeklődő adatlapján találod.', 'Die Fotos sind nur im Admin nach Anmeldung abrufbar. Die Kontaktdaten finden Sie im Datensatz der Anfrage.')} · ${escapeHtml(input.createdAt.toISOString())}</p>
</div></div></body></html>`)
}

export async function handleServiceRequest(request: Request, env: AdminEnv, now = new Date()): Promise<Response> {
  if (request.method !== 'POST') return privateJson(405, { ok: false, error: 'Csak POST kérés engedélyezett.' })
  if (rateLimited(request, 'report', 5, 60 * 60_000, now.getTime())) return privateJson(429, { ok: false, error: 'Túl sok bejelentés. Próbáld újra később, vagy hívd a gyártót.' })
  const parsed = reportSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = issue?.path[0]
    return privateJson(422, { ok: false, error: field === 'consent' ? 'Az adatkezelési hozzájárulás kötelező.' : field === 'description' ? issue.message : 'Érvénytelen bejelentés.' })
  }
  const input = parsed.data
  if (input.website) return privateJson(200, { ok: true })
  if (!storeConfigured(env)) return privateJson(503, { ok: false, error: 'A szolgáltatás most nem érhető el.' })
  try {
    const row = await installationByToken(env, input.t)
    if (!row) return privateJson(404, { ok: false, error: 'A link érvénytelen vagy megszűnt.' })
    const component = row.config_snapshot.components.find((item) => item.key === input.component)
    if (!component) return privateJson(422, { ok: false, error: 'Ismeretlen komponens.' })
    // Telepítésenként naponta legfeljebb 10 bejelentés (a token kiszivárgása esetén se lehessen elárasztani a gyártót).
    const since = new Date(now.getTime() - 86_400_000).toISOString()
    const recent = await fetch(`${rest(env, 'service_requests')}?installation_id=eq.${row.id}&tenant_id=eq.${encodeURIComponent(row.tenant_id)}&created_at=gte.${encodeURIComponent(since)}&select=id`, { headers: storeHeaders(env), signal: timeout() })
    if (recent.ok && ((await recent.json()) as unknown[]).length >= 10) return privateJson(429, { ok: false, error: 'Erre a termékre ma már sok bejelentés érkezett. Kérjük, hívd a gyártót.' })
    const photos = [...new Set(input.photos)]
    const paths = photos.map((id) => photoPath(row, id))
    for (const path of paths) if (!(await photoExists(env, path))) return privateJson(422, { ok: false, error: 'Egy fotó feltöltése nem fejeződött be. Töltsd fel újra.' })

    const insert = await fetch(rest(env, 'service_requests'), {
      method: 'POST', headers: { ...storeHeaders(env), Prefer: 'return=representation' }, signal: timeout(),
      body: JSON.stringify({ installation_id: row.id, tenant_id: row.tenant_id, component_key: component.key, description: input.description, photo_paths: paths, status: 'new', consent_at: now.toISOString(), consent_version: PRIVACY_VERSION }),
    })
    if (!insert.ok) throw new Error(`Supabase ${insert.status}: ${(await insert.text()).slice(0, 200)}`)
    const [created] = await insert.json() as { id: number }[]
    await logEvent(env, row, 'service_request', 'owner', { requestId: created?.id, component: component.key, photos: paths.length })

    const tenant = await resolveTenant(env, row.tenant_id)
    const to = tenant ? recipients(env, tenant) : []
    if (tenant && to.length && env.RESEND_API_KEY) {
      await sendEmail(env, {
        to,
        subject: oneLine(`${tenant.lead.subjectPrefix} ${tenant.locale === 'de' ? 'Servicemeldung' : 'Hibabejelentés'}: ${component.label}${row.lead_ref ? ` (${row.lead_ref})` : ''}`),
        html: serviceEmailHtml(tenant, { headline: row.config_snapshot.headline, leadRef: row.lead_ref, component: component.label, description: input.description, photos: paths.length, adminUrl: `${siteOrigin(request, env)}/k/${tenant.id}/admin#szerviz`, createdAt: now }),
      }).catch((error) => console.error('[service] E-mail sikertelen', row.id, error))
    }
    return privateJson(201, { ok: true, id: created?.id ?? null })
  } catch (error) {
    console.error('[service] Bejelentés sikertelen', error)
    return privateJson(502, { ok: false, error: 'A bejelentés most nem sikerült. Próbáld újra, vagy hívd a gyártót.' })
  }
}

// ── Gyártó: Szerviz nézet ───────────────────────────────────────────────────
interface ServiceRow { id: number; installation_id: number; tenant_id: string; component_key: string; description: string; photo_paths: string[]; status: ServiceStatus; consent_at: string; consent_version: string; created_at: string }

async function signPaths(env: AdminEnv, paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map()
  const response = await fetch(storage(env, `object/sign/${PHOTO_BUCKET}`), { method: 'POST', headers: storeHeaders(env), body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS, paths }), signal: timeout() })
  if (!response.ok) throw new Error(`Storage aláírás ${response.status}`)
  const rows = await response.json() as { path: string; signedURL?: string | null; error?: string | null }[]
  const base = storage(env, '').replace(/\/$/, '')
  return new Map(rows.filter((row) => row.signedURL).map((row) => [row.path, `${base}${row.signedURL!.startsWith('/') ? '' : '/'}${row.signedURL}`]))
}

const patchSchema = z.object({ id: z.number().int().positive(), status: z.enum(SERVICE_STATUSES) })

export async function handleAdminService(request: Request, env: AdminEnv): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'PATCH') return json(405, { ok: false, error: 'Nem engedélyezett metódus.' })
  const auth = await authorize(request, env)
  if (auth instanceof Response) return auth
  if (!storeConfigured(env)) return json(503, { ok: false, error: 'A szerver tárhelye nincs bekapcsolva.' })
  const tenantId = encodeURIComponent(auth.tenant.id)
  try {
    if (request.method === 'GET') {
      const response = await fetch(`${rest(env, 'service_requests')}?tenant_id=eq.${tenantId}&select=id,installation_id,tenant_id,component_key,description,photo_paths,status,consent_at,consent_version,created_at&order=created_at.desc&limit=200`, { headers: storeHeaders(env), signal: timeout() })
      if (!response.ok) throw new Error(`Supabase ${response.status}`)
      const rows = await response.json() as ServiceRow[]
      // Csak a saját tenant fotóútjai írhatók alá (kétszeres védelem a szűrő mellett).
      const own = rows.flatMap((row) => row.photo_paths ?? []).filter((path) => path.startsWith(`${auth.tenant.id}/`))
      const signed = await signPaths(env, own).catch((error) => { console.error('[service] Aláírt linkek sikertelenek', error); return new Map<string, string>() })
      return json(200, {
        ok: true,
        expiresIn: SIGNED_URL_SECONDS,
        requests: rows.map((row) => ({ id: row.id, installationId: row.installation_id, component: row.component_key, description: row.description, status: row.status, createdAt: row.created_at, consentVersion: row.consent_version, photos: (row.photo_paths ?? []).map((path) => signed.get(path)).filter(Boolean) })),
      })
    }
    const parsed = patchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return json(422, { ok: false, error: 'Érvénytelen módosítás.' })
    const current = await fetch(`${rest(env, 'service_requests')}?id=eq.${parsed.data.id}&tenant_id=eq.${tenantId}&select=id,installation_id,status`, { headers: storeHeaders(env), signal: timeout() })
    const [row] = current.ok ? await current.json() as { id: number; installation_id: number; status: ServiceStatus }[] : []
    if (!row) return json(404, { ok: false, error: 'A bejelentés nem található.' })
    if (row.status === parsed.data.status) return json(200, { ok: true })
    const response = await fetch(`${rest(env, 'service_requests')}?id=eq.${row.id}&tenant_id=eq.${tenantId}`, { method: 'PATCH', headers: { ...storeHeaders(env), Prefer: 'return=minimal' }, body: JSON.stringify({ status: parsed.data.status }), signal: timeout() })
    if (!response.ok) throw new Error(`Supabase ${response.status}`)
    await logEvent(env, { id: row.installation_id, tenant_id: auth.tenant.id }, 'status_change', 'manufacturer', { requestId: row.id, from: row.status, to: parsed.data.status })
    return json(200, { ok: true })
  } catch (error) {
    console.error('[service] Admin művelet sikertelen', auth.tenant.id, error)
    return json(502, { ok: false, error: 'A szerviz-bejelentések most nem érhetők el.' })
  }
}
