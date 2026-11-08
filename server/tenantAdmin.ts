// Gyártói admin háttér: belépés (tenant-onkénti jelszó), aláírt munkamenet-token, a beállítások
// tárolása Supabase-ben (tenant_settings), és a nyilvános olvasás a konfigurátornak.
// Platformfüggetlen (Request → Response, Web Crypto), így Vercel Edge-en és helyben is fut.
import { z } from 'zod'
import { getTenant } from '../src/tenants'
import { applyOverrides, parseOverrides, publicOverrides } from '../src/tenants/overrides'
import { priceSettingsSchema } from '../src/tenants/rules'
import type { Tenant } from '../src/tenants/types'

export type AdminEnv = Record<string, string | undefined>

const TOKEN_TTL_MS = 8 * 60 * 60_000
const MAX_BODY_BYTES = 120_000
const LOGIN_WINDOW_MS = 10 * 60_000
const LOGIN_MAX = 6
const attempts = new Map<string, number[]>()

/** Tesztekhez: a belépési próbálkozások számlálójának törlése. */
export function resetAdminRateLimit() { attempts.clear() }

export const json = (status: number, body: unknown, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
})

const encoder = new TextEncoder()
const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message))))
}

/** Időzítés-biztos összehasonlítás (azonos hosszra hashelve). */
async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([hmac('cmp', a), hmac('cmp', b)])
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0
}

const passwordEnvKey = (tenantId: string) => `ADMIN_PASSWORD_${tenantId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`

export async function signToken(secret: string, tenantId: string, now = Date.now()) {
  const payload = `${tenantId}.${now + TOKEN_TTL_MS}`
  return `${payload}.${await hmac(secret, payload)}`
}

/** A tokenből a tenant azonosítója, ha az aláírás érvényes és nem járt le; különben null. */
export async function verifyToken(secret: string, token: string, now = Date.now()): Promise<string | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [tenantId, expires, signature] = parts
  if (!(Number(expires) > now)) return null
  if (!(await safeEqual(signature, await hmac(secret, `${tenantId}.${expires}`)))) return null
  return tenantId
}

// ── Tárolás (Supabase REST, csak szerveroldalon, service role kulccsal) ──
export const storeConfigured = (env: AdminEnv) => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
export const storeHeaders = (env: AdminEnv) => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' })
const storeUrl = (env: AdminEnv) => `${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/tenant_settings`

/** A tárolt felülírások; ha nincs adattár vagy hiba van, null (az alap-tenant érvényes). */
export async function loadOverrides(env: AdminEnv, tenantId: string): Promise<unknown | null> {
  if (!storeConfigured(env)) return null
  try {
    const response = await fetch(`${storeUrl(env)}?tenant_id=eq.${encodeURIComponent(tenantId)}&select=data`, { headers: storeHeaders(env), signal: AbortSignal.timeout(3000) })
    if (!response.ok) return null
    const rows = await response.json() as { data: unknown }[]
    return rows[0]?.data ?? null
  } catch (error) {
    console.error('[tenant] Beállítások olvasása sikertelen', tenantId, error)
    return null
  }
}

async function saveOverrides(env: AdminEnv, tenantId: string, data: unknown) {
  const response = await fetch(`${storeUrl(env)}?on_conflict=tenant_id`, {
    method: 'POST',
    headers: { ...storeHeaders(env), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ tenant_id: tenantId, data, updated_at: new Date().toISOString() }),
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`Supabase ${response.status}`)
}

/** Az érvényes (felülírt) tenant a szerveren: lead-fogadók és árak is a gyártó szerkesztett adatai. */
export async function resolveTenant(env: AdminEnv, tenantId: string): Promise<Tenant | undefined> {
  const base = getTenant(tenantId)
  if (!base) return undefined
  const stored = await loadOverrides(env, base.id)
  return stored ? applyOverrides(base, stored) : base
}

// ── Végpontok ──
/** GET /api/tenant?id=… — a konfigurátor ebből tölti be a gyártó szerkesztett adatait (lead-címzettek nélkül). */
export async function handleTenantRequest(request: Request, env: AdminEnv): Promise<Response> {
  if (request.method !== 'GET') return json(405, { ok: false, error: 'Csak GET kérés engedélyezett.' })
  const id = new URL(request.url).searchParams.get('id') ?? ''
  const base = getTenant(id)
  if (!base) return json(404, { ok: false, error: 'Ismeretlen konfigurátor.' })
  const stored = await loadOverrides(env, base.id)
  const parsed = stored ? parseOverrides(stored) : null
  return json(200, { ok: true, overrides: parsed?.ok ? publicOverrides(parsed.data) : null })
}

const loginSchema = z.object({ tenantId: z.string().trim().min(1).max(64), password: z.string().max(200).default('') })

/** Demó-alapértelmezések: a `demo` tenant jelszava 1111, amíg ADMIN_PASSWORD_DEMO nincs beállítva. Más gyártóra nem érvényes. */
const DEMO_PASSWORD = '1111'
const DEMO_SECRET = 'ardelis-demo-only-token-secret'
/** A token aláírókulcsa: ADMIN_TOKEN_SECRET, ennek hiányában a Supabase service key; végső esetben a demó-kulcs (csak a demo tenantra). */
const tokenSecret = (env: AdminEnv) => env.ADMIN_TOKEN_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || DEMO_SECRET
const expectedPassword = (tenantId: string, env: AdminEnv) => env[passwordEnvKey(tenantId)] || (tenantId === 'demo' ? DEMO_PASSWORD : undefined)

/** POST /api/admin/login — { tenantId, password } → { token } */
export async function handleAdminLogin(request: Request, env: AdminEnv): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Csak POST kérés engedélyezett.' })
  const parsed = loginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json(400, { ok: false, error: 'Add meg a jelszót.' })
  const { tenantId, password } = parsed.data
  const tenant = getTenant(tenantId)
  const expected = tenant ? expectedPassword(tenant.id, env) : undefined
  const secret = tokenSecret(env)
  if (!tenant || !expected || (secret === DEMO_SECRET && tenant.id !== 'demo')) return json(503, { ok: false, error: 'Az admin belépés ehhez a gyártóhoz még nincs beállítva.' })

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const key = `${forwarded}|${tenant!.id}`
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < LOGIN_WINDOW_MS)
  if (recent.length >= LOGIN_MAX) return json(429, { ok: false, error: 'Túl sok próbálkozás. Próbáld újra néhány perc múlva.' })
  attempts.set(key, [...recent, now])

  if (!(await safeEqual(password, expected))) return json(401, { ok: false, error: 'Hibás jelszó.' })
  attempts.delete(key)
  return json(200, { ok: true, token: await signToken(secret, tenant.id, now) })
}

export async function authorize(request: Request, env: AdminEnv): Promise<{ tenant: Tenant } | Response> {
  const secret = tokenSecret(env)
  const header = request.headers.get('authorization') ?? ''
  const tenantId = header.startsWith('Bearer ') ? await verifyToken(secret, header.slice(7)) : null
  const tenant = tenantId && (secret !== DEMO_SECRET || tenantId === 'demo') ? getTenant(tenantId) : undefined
  if (!tenant) return json(401, { ok: false, error: 'A munkamenet lejárt. Jelentkezz be újra.' })
  return { tenant }
}

/** GET /api/admin/settings → a tárolt beállítások; PUT → mentés (validálva). Mindig csak a token tenantjához. */
export async function handleAdminSettings(request: Request, env: AdminEnv): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'PUT') return json(405, { ok: false, error: 'Nem engedélyezett metódus.' })
  const auth = await authorize(request, env)
  if (auth instanceof Response) return auth
  const { tenant } = auth

  if (request.method === 'GET') return json(200, { ok: true, storage: storeConfigured(env), overrides: await loadOverrides(env, tenant.id) })

  if (!storeConfigured(env)) return json(503, { ok: false, error: 'Az adattár (Supabase) nincs beállítva, a mentés nem lehetséges.' })
  // Az alapértelmezett (nyilvános) demó-jelszóval a demó beállításai nem írhatók: különben bárki átírhatná a nyilvános demót.
  if (tenant.id === 'demo' && !env[passwordEnvKey('demo')]) return json(403, { ok: false, error: 'A demó beállításai nem menthetők (csak kipróbálható). Saját gyártói fiókkal minden menthető.' })
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'A kérés túl nagy.' })
  const body: unknown = (() => { try { return JSON.parse(raw) } catch { return null } })()
  const checked = parseOverrides(body)
  if (!checked.ok) return json(422, { ok: false, error: checked.error })

  // A teljes, ráfésült árlista is feleljen meg a sémának (pl. tartományok).
  const applied = applyOverrides(tenant, checked.data)
  const pricesOk = priceSettingsSchema.safeParse(applied.prices)
  if (!pricesOk.success) return json(422, { ok: false, error: `Árak: ${pricesOk.error.issues[0]?.message ?? 'érvénytelen érték'} (${pricesOk.error.issues[0]?.path.join('.')})` })

  try {
    await saveOverrides(env, tenant.id, checked.data)
  } catch (error) {
    console.error('[tenant] Mentés sikertelen', tenant.id, error)
    return json(502, { ok: false, error: 'A mentés most nem sikerült. Próbáld újra.' })
  }
  return json(200, { ok: true })
}

const LEAD_STATUSES = ['new', 'contacted', 'offered', 'won', 'lost'] as const
const LEAD_COLUMNS = 'ref,customer_name,email,phone,postal_code,city,region,address,notes,estimate_gross,config_url,status,source,created_at,config,owner_note'
const statusSchema = z.object({ ref: z.string().trim().min(3).max(60), status: z.enum(LEAD_STATUSES).optional(), ownerNote: z.string().max(2000).optional() })
  .refine((value) => value.status !== undefined || value.ownerNote !== undefined, { message: 'Nincs módosítandó adat.' })

/** GET /api/admin-leads → a gyártó érdeklődői (legfrissebb elöl); PATCH { ref, status } → státusz módosítása. Csak a saját tenant. */
export async function handleAdminLeads(request: Request, env: AdminEnv): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'PATCH') return json(405, { ok: false, error: 'Nem engedélyezett metódus.' })
  const auth = await authorize(request, env)
  if (auth instanceof Response) return auth
  if (!storeConfigured(env)) return json(503, { ok: false, error: 'Az adattár (Supabase) nincs beállítva, az érdeklődők nem érhetők el.' })
  const base = `${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/leads`
  const tenantId = encodeURIComponent(auth.tenant.id)

  try {
    if (request.method === 'GET') {
      const list = (columns: string) => fetch(`${base}?tenant_id=eq.${tenantId}&select=${columns}&order=created_at.desc&limit=200`, { headers: storeHeaders(env), signal: AbortSignal.timeout(5000) })
      let response = await list(`${LEAD_COLUMNS},engagement`)
      // Ha a gyártó adatbázisában még nincs `engagement` oszlop (supabase/leads.sql), a lista enélkül is jöjjön le.
      if (response.status === 400) response = await list(LEAD_COLUMNS)
      if (!response.ok) throw new Error(`Supabase ${response.status}`)
      return json(200, { ok: true, leads: await response.json() })
    }
    const parsed = statusSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return json(422, { ok: false, error: 'Érvénytelen módosítás.' })
    const response = await fetch(`${base}?ref=eq.${encodeURIComponent(parsed.data.ref)}&tenant_id=eq.${tenantId}`, {
      method: 'PATCH',
      headers: { ...storeHeaders(env), Prefer: 'return=minimal' },
      body: JSON.stringify({ ...(parsed.data.status !== undefined && { status: parsed.data.status }), ...(parsed.data.ownerNote !== undefined && { owner_note: parsed.data.ownerNote.trim() || null }) }),
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(`Supabase ${response.status}`)
    return json(200, { ok: true })
  } catch (error) {
    console.error('[tenant] Érdeklődők kezelése sikertelen', auth.tenant.id, error)
    return json(502, { ok: false, error: 'Az érdeklődők most nem érhetők el. Próbáld újra.' })
  }
}
