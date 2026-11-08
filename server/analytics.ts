// Adatvédelmi barát konverziómérés: névtelen napi számlálók (süti, azonosító és IP-tárolás nélkül).
// POST /api/track nyilvános (csak ismert tenant + ismert eseménynév); GET /api/admin-stats a gyártó tokenjével.
import { z } from 'zod'
import { getTenant } from '../src/tenants'
import { authorize, json, storeConfigured, storeHeaders, type AdminEnv } from './tenantAdmin'

export const TRACK_EVENTS = ['open', 'configure', 'lead_view', 'lead_start', 'pdf', 'ar', 'share'] as const
const trackSchema = z.object({ tenantId: z.string().trim().min(1).max(64), name: z.enum(TRACK_EVENTS) })

const WINDOW_MS = 10 * 60_000
const MAX_PER_WINDOW = 80
const hits = new Map<string, number[]>()
const BOT = /bot|crawl|spider|headless|lighthouse|preview|curl|python-requests/i

/** Tesztekhez: a kérésszámláló törlése. */
export function resetTrackRateLimit() { hits.clear() }

const limited = (key: string, now: number) => {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > MAX_PER_WINDOW
}

const rest = (env: AdminEnv) => env.SUPABASE_URL!.replace(/\/$/, '')

/** POST /api/track { tenantId, name } → 204 (mindig csendes: a mérés sosem akadályozza a látogatót). */
export async function handleTrack(request: Request, env: AdminEnv): Promise<Response> {
  const quiet = new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Csak POST kérés engedélyezett.' })
  if (!storeConfigured(env) || BOT.test(request.headers.get('user-agent') ?? '')) return quiet
  const parsed = trackSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || !getTenant(parsed.data.tenantId)) return json(422, { ok: false, error: 'Érvénytelen esemény.' })
  const caller = (request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim()
  if (limited(caller, Date.now())) return quiet
  try {
    await fetch(`${rest(env)}/rest/v1/rpc/track_event`, {
      method: 'POST',
      headers: storeHeaders(env),
      body: JSON.stringify({ p_tenant: parsed.data.tenantId, p_name: parsed.data.name }),
      signal: AbortSignal.timeout(3000),
    })
  } catch (error) { console.error('[track] Mérés sikertelen', error) }
  return quiet
}

/** GET /api/admin-stats?days=30 → a saját tenant napi eseményszámlálói. */
export async function handleAdminStats(request: Request, env: AdminEnv): Promise<Response> {
  if (request.method !== 'GET') return json(405, { ok: false, error: 'Csak GET kérés engedélyezett.' })
  const auth = await authorize(request, env)
  if (auth instanceof Response) return auth
  if (!storeConfigured(env)) return json(503, { ok: false, error: 'Az adattár (Supabase) nincs beállítva.' })
  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get('days')) || 30))
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
  try {
    const response = await fetch(`${rest(env)}/rest/v1/tenant_events?tenant_id=eq.${encodeURIComponent(auth.tenant.id)}&day=gte.${since}&select=day,name,count&order=day.asc&limit=5000`, { headers: storeHeaders(env), signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`Supabase ${response.status}`)
    return json(200, { ok: true, events: await response.json() })
  } catch (error) {
    console.error('[track] Statisztika olvasása sikertelen', auth.tenant.id, error)
    return json(502, { ok: false, error: 'A látogatottsági adatok most nem érhetők el.' })
  }
}
