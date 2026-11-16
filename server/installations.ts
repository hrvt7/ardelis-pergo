// Telepítések (digitális ikerpéldány) — szerveroldal.
// - Admin: rögzítés egy megnyert/felszerelt leadből (befagyasztott pillanatkép + 256 bites nyilvános token), lista, törlés.
// - A törlés a fotókat, a bejelentéseket és a naplót is törli (adatvédelmi törlés felülírja a csak-hozzáfűzést).
// - Megőrzési idő: a napi cron (api/followup) a gyártónként beállított idő után törli a telepítéseket.
// Minden lekérdezés a bejelentkezett gyártó tenant_id-jára szűr.
import { z } from 'zod'
import { authorize, json, loadOverrides, resolveTenant, storeConfigured, storeHeaders, type AdminEnv } from './tenantAdmin'
import { parseOverrides, publicOverrides, type TenantOverrides } from '../src/tenants/overrides'
import { describeConfig } from './lead'
import { parseConfig, roofLabels, tenantPrice } from '../src/tenants/rules'
import { withLocale } from '../src/i18n/locale'
import { formatNumber } from '../src/lib/pricing'
import { buildSnapshot, DEFAULT_WARRANTY_MONTHS, INSTALLATION_TOKEN_RE, newInstallationToken, snapshotHash, warrantyState, type InstallationSnapshot, type WarrantyMonths } from '../src/lib/installations'
import type { Tenant } from '../src/tenants/types'

export const DEFAULT_RETENTION_MONTHS = 120
export const PHOTO_BUCKET = 'service-photos'

export interface InstallationRow {
  id: number
  tenant_id: string
  lead_id: number | null
  lead_ref: string | null
  public_token: string
  config_snapshot: InstallationSnapshot
  snapshot_hash: string
  schema_version: number
  product_type: string
  installed_at: string
  warranty: WarrantyMonths
  status: 'active' | 'archived'
  internal_note: string | null
  created_at: string
}

const rest = (env: AdminEnv, table: string) => `${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${table}`
const storage = (env: AdminEnv, path: string) => `${env.SUPABASE_URL!.replace(/\/$/, '')}/storage/v1/${path}`
const timeout = () => AbortSignal.timeout(6000)

export const tenantWarranty = (tenant: Tenant): WarrantyMonths => ({ ...DEFAULT_WARRANTY_MONTHS, ...tenant.installations?.warranty })
export const tenantRetentionMonths = (tenant: Tenant) => tenant.installations?.retentionMonths ?? DEFAULT_RETENTION_MONTHS

async function select<T>(env: AdminEnv, table: string, query: string): Promise<T[]> {
  const response = await fetch(`${rest(env, table)}?${query}`, { headers: storeHeaders(env), signal: timeout() })
  if (!response.ok) throw new Error(`Supabase ${table} ${response.status}: ${(await response.text()).slice(0, 200)}`)
  return response.json() as Promise<T[]>
}

export async function logEvent(env: AdminEnv, row: Pick<InstallationRow, 'id' | 'tenant_id'>, kind: 'created' | 'service_request' | 'status_change' | 'expansion_request', actor: 'manufacturer' | 'owner' | 'system', detail: Record<string, unknown> | null = null) {
  const response = await fetch(rest(env, 'installation_events'), {
    method: 'POST', headers: { ...storeHeaders(env), Prefer: 'return=minimal' },
    body: JSON.stringify({ installation_id: row.id, tenant_id: row.tenant_id, kind, actor, detail }), signal: timeout(),
  })
  if (!response.ok) console.error('[installations] Napló írása sikertelen', row.id, kind, response.status)
}

/** Fotók törlése a privát tárhelyről (egy hívásban, legfeljebb 1000 út). */
export async function removePhotos(env: AdminEnv, paths: string[]) {
  if (paths.length === 0) return
  const response = await fetch(storage(env, `object/${PHOTO_BUCKET}`), { method: 'DELETE', headers: storeHeaders(env), body: JSON.stringify({ prefixes: paths.slice(0, 1000) }), signal: timeout() })
  if (!response.ok) throw new Error(`Storage törlés ${response.status}: ${(await response.text()).slice(0, 200)}`)
}

/** A mappa fájljai (Supabase Storage list). */
export async function listPhotos(env: AdminEnv, prefix: string): Promise<string[]> {
  const response = await fetch(storage(env, `object/list/${PHOTO_BUCKET}`), { method: 'POST', headers: storeHeaders(env), body: JSON.stringify({ prefix, limit: 1000, offset: 0 }), signal: timeout() })
  if (!response.ok) throw new Error(`Storage lista ${response.status}`)
  return ((await response.json()) as { name: string; id?: string | null }[]).filter((item) => item.id !== null).map((item) => `${prefix}${item.name}`)
}

/** Teljes törlés: fotók → telepítés (a bejelentések és a napló kaszkádolva törlődnek). */
export async function deleteInstallation(env: AdminEnv, tenantId: string, id: number): Promise<boolean> {
  const tenant = encodeURIComponent(tenantId)
  const rows = await select<{ id: number }>(env, 'installations', `id=eq.${id}&tenant_id=eq.${tenant}&select=id`)
  if (rows.length === 0) return false
  const requests = await select<{ photo_paths: string[] }>(env, 'service_requests', `installation_id=eq.${id}&tenant_id=eq.${tenant}&select=photo_paths`)
  // A bejelentéshez nem csatolt (félbehagyott) feltöltések is a telepítés mappájában vannak: azok is törlődnek.
  const orphans = await listPhotos(env, `${tenantId}/${id}/`).catch((error) => { console.error('[installations] Fotólista sikertelen', id, error); return [] as string[] })
  await removePhotos(env, [...new Set([...requests.flatMap((request) => request.photo_paths ?? []), ...orphans])])
  const response = await fetch(`${rest(env, 'installations')}?id=eq.${id}&tenant_id=eq.${tenant}`, { method: 'DELETE', headers: { ...storeHeaders(env), Prefer: 'return=minimal' }, signal: timeout() })
  if (!response.ok) throw new Error(`Supabase törlés ${response.status}`)
  return true
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Érvénytelen dátum.')
const monthsSchema = z.number().int().min(0).max(240)
const createSchema = z.object({
  leadRef: z.string().trim().min(3).max(60),
  installedAt: dateSchema,
  warranty: z.object({ structure: monthsSchema, electronics: monthsSchema, led: monthsSchema, other: monthsSchema }),
  note: z.string().trim().max(2000).optional().default(''),
})

interface LeadForInstall { id: number; ref: string; status: string; config: unknown; product?: string | null; installation_id?: number | null }

/** Admin nézethez: a token benne van (a link és a QR újra letölthető), a pillanatképből csak a megjelenítéshez szükséges rész. */
function adminView(row: InstallationRow) {
  return {
    id: row.id, leadRef: row.lead_ref, token: row.public_token, product: row.product_type, installedAt: row.installed_at,
    warranty: row.warranty, status: row.status, note: row.internal_note, createdAt: row.created_at,
    headline: row.config_snapshot?.headline ?? '', components: row.config_snapshot?.components ?? [], price: row.config_snapshot?.price ?? null,
  }
}
export type AdminInstallation = ReturnType<typeof adminView>

const INSTALL_COLUMNS = 'id,tenant_id,lead_id,lead_ref,public_token,config_snapshot,snapshot_hash,schema_version,product_type,installed_at,warranty,status,internal_note,created_at'

/**
 * GET /api/admin-installations → a gyártó telepítései;
 * POST { leadRef, installedAt, warranty, note } → rögzítés (befagyasztás);
 * DELETE ?id= → törlés fotókkal, bejelentésekkel, naplóval együtt.
 */
export async function handleAdminInstallations(request: Request, env: AdminEnv, now = new Date()): Promise<Response> {
  if (!['GET', 'POST', 'DELETE'].includes(request.method)) return json(405, { ok: false, error: 'Nem engedélyezett metódus.' })
  const auth = await authorize(request, env)
  if (auth instanceof Response) return auth
  if (!storeConfigured(env)) return json(503, { ok: false, error: 'A szerver tárhelye nincs bekapcsolva, a telepítések most nem érhetők el.' })
  const tenantId = encodeURIComponent(auth.tenant.id)

  try {
    if (request.method === 'GET') {
      const rows = await select<InstallationRow>(env, 'installations', `tenant_id=eq.${tenantId}&select=${INSTALL_COLUMNS}&order=created_at.desc&limit=500`)
      return json(200, { ok: true, installations: rows.map(adminView) })
    }

    if (request.method === 'DELETE') {
      const id = Number(new URL(request.url).searchParams.get('id'))
      if (!Number.isSafeInteger(id) || id <= 0) return json(422, { ok: false, error: 'Érvénytelen azonosító.' })
      if (auth.tenant.demo && !env.ADMIN_PASSWORD_DEMO) return json(403, { ok: false, error: 'A bemutató fiókban nem lehet törölni.' })
      return (await deleteInstallation(env, auth.tenant.id, id)) ? json(200, { ok: true }) : json(404, { ok: false, error: 'A telepítés nem található.' })
    }

    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return json(422, { ok: false, error: `Érvénytelen adat: ${parsed.error.issues[0]?.path.join('.') || 'kérés'}` })
    const input = parsed.data
    const today = now.toISOString().slice(0, 10)
    if (input.installedAt > today) return json(422, { ok: false, error: 'A telepítés napja nem lehet a jövőben.' })

    const [lead] = await select<LeadForInstall>(env, 'leads', `ref=eq.${encodeURIComponent(input.leadRef)}&tenant_id=eq.${tenantId}&select=id,ref,status,config,product&limit=1`)
    if (!lead) return json(404, { ok: false, error: 'Az érdeklődő nem található.' })
    if (lead.status !== 'won' && lead.status !== 'installed') return json(409, { ok: false, error: 'Telepítést csak „Megnyert” vagy „Felszerelve” állapotú érdeklődőhöz lehet rögzíteni.' })
    if (lead.product && lead.product !== 'pergola') return json(422, { ok: false, error: 'Ez a termékcsalád még nem rögzíthető telepítésként.' })

    const tenant = (await resolveTenant(env, auth.tenant.id)) ?? auth.tenant
    const config = parseConfig(tenant, lead.config)
    if (!config) return json(422, { ok: false, error: 'Az érdeklődő konfigurációja nem olvasható.' })

    // Az akkori ár: az elfogadott ajánlat, ha van; különben a mai árlista szerinti irányár.
    const [quote] = await select<{ total_net: number; total_gross: number }>(env, 'quotes', `lead_ref=eq.${encodeURIComponent(lead.ref)}&tenant_id=eq.${tenantId}&status=eq.accepted&select=total_net,total_gross&order=accepted_at.desc&limit=1`).catch(() => [])
    const listPrice = tenantPrice(tenant, config)
    const labels = roofLabels(tenant)
    const snapshot = withLocale(tenant.locale ?? 'hu', () => buildSnapshot({
      config,
      price: quote ? { totalNet: quote.total_net, totalGross: quote.total_gross } : listPrice,
      priceSource: quote ? 'quote' : 'pricelist',
      currency: tenant.currency,
      roofName: labels[config.roof],
      headline: `${labels[config.roof].split(' · ')[0]} · ${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} m`,
      spec: describeConfig(tenant, config, listPrice),
    }))
    if (!snapshot) return json(422, { ok: false, error: 'Ez a termék (carport) még nem rögzíthető telepítésként.' })

    const response = await fetch(rest(env, 'installations'), {
      method: 'POST', headers: { ...storeHeaders(env), Prefer: 'return=representation' }, signal: timeout(),
      body: JSON.stringify({
        tenant_id: auth.tenant.id, lead_id: lead.id, lead_ref: lead.ref, public_token: newInstallationToken(),
        config_snapshot: snapshot, snapshot_hash: await snapshotHash(snapshot), schema_version: snapshot.version, product_type: snapshot.product,
        installed_at: input.installedAt, warranty: input.warranty, internal_note: input.note || null,
      }),
    })
    if (response.status === 409) return json(409, { ok: false, error: 'Ehhez az érdeklődőhöz már van rögzített telepítés.' })
    if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 200)}`)
    const [row] = await response.json() as InstallationRow[]
    await logEvent(env, row, 'created', 'manufacturer', { leadRef: lead.ref })
    if (lead.status !== 'installed') {
      await fetch(`${rest(env, 'leads')}?id=eq.${lead.id}&tenant_id=eq.${tenantId}`, { method: 'PATCH', headers: { ...storeHeaders(env), Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'installed' }), signal: timeout() })
        .catch((error) => console.error('[installations] Lead állapot frissítése sikertelen', lead.ref, error))
    }
    return json(201, { ok: true, installation: adminView(row) })
  } catch (error) {
    console.error('[installations] Admin művelet sikertelen', auth.tenant.id, error)
    return json(502, { ok: false, error: 'A telepítések most nem érhetők el. Próbáld újra.' })
  }
}

/** Megőrzési idő lejárta: a napi cron hívja. A gyártónként beállított hónap a telepítés napjától számít. */
export async function purgeExpiredInstallations(env: AdminEnv, now = new Date(), limit = 100): Promise<{ deleted: number; failed: number }> {
  const minCutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, now.getUTCDate())).toISOString().slice(0, 10)
  const candidates = await select<{ id: number; tenant_id: string; installed_at: string }>(env, 'installations', `installed_at=lt.${minCutoff}&select=id,tenant_id,installed_at&order=installed_at.asc&limit=${limit}`)
  const tenants = new Map<string, Tenant | undefined>()
  let deleted = 0
  let failed = 0
  for (const row of candidates) {
    if (!tenants.has(row.tenant_id)) tenants.set(row.tenant_id, await resolveTenant(env, row.tenant_id))
    const owner = tenants.get(row.tenant_id)
    const months = owner ? tenantRetentionMonths(owner) : DEFAULT_RETENTION_MONTHS
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate())).toISOString().slice(0, 10)
    if (row.installed_at >= cutoff) continue
    try {
      if (await deleteInstallation(env, row.tenant_id, row.id)) deleted += 1
    } catch (error) {
      failed += 1
      console.error('[installations] Megőrzési törlés sikertelen', row.id, error)
    }
  }
  return { deleted, failed }
}

// ── Tulajdonosi oldal (/t/:token) ───────────────────────────────────────────
// Bejelentkezés nélkül, a titkos tokennel. A válaszban NINCS személyes adat (név, cím, telefon, e-mail),
// belső megjegyzés, ár vagy lead-azonosító; a token sem kerül vissza.

const PUBLIC_WINDOW_MS = 60_000
const PUBLIC_MAX = 60
const publicHits = new Map<string, number[]>()
/** Tesztekhez: a nyilvános végpontok visszaélés-fékjének törlése. */
export function resetInstallationRateLimit() { publicHits.clear() }
export function rateLimited(request: Request, bucket: string, max: number, windowMs: number, now = Date.now()) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const key = `${bucket}:${ip}`
  const hits = (publicHits.get(key) ?? []).filter((time) => now - time < windowMs)
  if (hits.length >= max) return true
  publicHits.set(key, [...hits, now])
  if (publicHits.size > 5000) for (const [entry, times] of publicHits) if (!times.some((time) => now - time < windowMs)) publicHits.delete(entry)
  return false
}

const privateJson = (status: number, body: unknown) => json(status, body, { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' })

/** A token alapján az aktív telepítés (vagy null). Érvénytelen formátumnál adatbázis-hívás sincs. */
export async function installationByToken(env: AdminEnv, token: string): Promise<InstallationRow | null> {
  if (!INSTALLATION_TOKEN_RE.test(token)) return null
  const [row] = await select<InstallationRow>(env, 'installations', `public_token=eq.${encodeURIComponent(token)}&status=eq.active&select=${INSTALL_COLUMNS}&limit=1`)
  return row ?? null
}

export function publicInstallation(row: InstallationRow, tenant: Tenant, overrides: TenantOverrides | null, now = new Date()) {
  const snapshot = row.config_snapshot
  return {
    tenantId: tenant.id,
    overrides,
    brand: { name: tenant.brand.name, legalName: tenant.brand.legalName, logoUrl: tenant.brand.logoUrl ?? null, phone: tenant.brand.phone ?? null, email: tenant.brand.email ?? null, website: tenant.brand.website ?? null, privacyUrl: tenant.brand.privacyUrl ?? null },
    product: row.product_type,
    headline: snapshot.headline,
    spec: snapshot.spec.filter(([label]) => !/ár|preis/i.test(label)),
    config: snapshot.config,
    shareCode: snapshot.shareCode,
    installedAt: row.installed_at,
    schemaVersion: row.schema_version,
    components: snapshot.components.map((component) => {
      const months = row.warranty[component.group] ?? 0
      return { ...component, months, ...warrantyState(row.installed_at, months, now) }
    }),
  }
}
export type PublicInstallation = ReturnType<typeof publicInstallation>

/** GET /api/installation?t=… — a tulajdonosi oldal adatai. */
export async function handleInstallation(request: Request, env: AdminEnv, now = new Date()): Promise<Response> {
  if (request.method !== 'GET') return privateJson(405, { ok: false, error: 'Nem engedélyezett metódus.' })
  if (rateLimited(request, 'view', PUBLIC_MAX, PUBLIC_WINDOW_MS, now.getTime())) return privateJson(429, { ok: false, error: 'Túl sok kérés. Próbáld újra egy perc múlva.' })
  const token = new URL(request.url).searchParams.get('t') ?? ''
  if (!INSTALLATION_TOKEN_RE.test(token)) return privateJson(404, { ok: false, error: 'A link érvénytelen vagy megszűnt.' })
  if (!storeConfigured(env)) return privateJson(503, { ok: false, error: 'A szolgáltatás most nem érhető el.' })
  try {
    const row = await installationByToken(env, token)
    if (!row) return privateJson(404, { ok: false, error: 'A link érvénytelen vagy megszűnt.' })
    const tenant = await resolveTenant(env, row.tenant_id)
    if (!tenant) return privateJson(404, { ok: false, error: 'A link érvénytelen vagy megszűnt.' })
    const stored = await loadOverrides(env, tenant.id)
    const checked = stored ? parseOverrides(stored) : null
    return privateJson(200, { ok: true, installation: publicInstallation(row, tenant, checked?.ok ? publicOverrides(checked.data) : null, now) })
  } catch (error) {
    console.error('[installations] Tulajdonosi oldal hiba', error)
    return privateJson(502, { ok: false, error: 'A szolgáltatás most nem érhető el. Próbáld újra később.' })
  }
}
