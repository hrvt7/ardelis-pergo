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

const json = (status: number, body: unknown, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), {
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
const storeConfigured = (env: AdminEnv) => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
const storeHeaders = (env: AdminEnv) => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' })
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

const loginSchema = z.object({ tenantId: z.string().trim().min(1).max(64), password: z.string().min(1).max(200) })

/** POST /api/admin/login — { tenantId, password } → { token } */
export async function handleAdminLogin(request: Request, env: AdminEnv): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Csak POST kérés engedélyezett.' })
  const parsed = loginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json(400, { ok: false, error: 'Add meg a jelszót.' })
  const { tenantId, password } = parsed.data
  const tenant = getTenant(tenantId)
  const expected = tenant ? env[passwordEnvKey(tenant.id)] : undefined
  if (!env.ADMIN_TOKEN_SECRET || !expected) return json(503, { ok: false, error: 'Az admin belépés ehhez a gyártóhoz még nincs beállítva.' })

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const key = `${forwarded}|${tenant!.id}`
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < LOGIN_WINDOW_MS)
  if (recent.length >= LOGIN_MAX) return json(429, { ok: false, error: 'Túl sok próbálkozás. Próbáld újra néhány perc múlva.' })
  attempts.set(key, [...recent, now])

  if (!(await safeEqual(password, expected))) return json(401, { ok: false, error: 'Hibás jelszó.' })
  attempts.delete(key)
  return json(200, { ok: true, token: await signToken(env.ADMIN_TOKEN_SECRET, tenant!.id, now) })
}

async function authorize(request: Request, env: AdminEnv): Promise<{ tenant: Tenant } | Response> {
  if (!env.ADMIN_TOKEN_SECRET) return json(503, { ok: false, error: 'Az admin belépés nincs beállítva.' })
  const header = request.headers.get('authorization') ?? ''
  const tenantId = header.startsWith('Bearer ') ? await verifyToken(env.ADMIN_TOKEN_SECRET, header.slice(7)) : null
  const tenant = tenantId ? getTenant(tenantId) : undefined
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
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return json(413, { ok: false, error: 'A kérés túl nagy.' })
  const body = await request.json().catch(() => null)
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
