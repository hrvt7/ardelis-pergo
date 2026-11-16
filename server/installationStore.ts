// Telepítések: közös adatelérés (a lead-fogadás és a telepítés-kezelés is használja, körkörös import nélkül).
import { storeHeaders, type AdminEnv } from './tenantAdmin'
import { INSTALLATION_TOKEN_RE, type InstallationSnapshot, type WarrantyMonths } from '../src/lib/installations'

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

export const rest = (env: AdminEnv, table: string) => `${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${table}`
export const storage = (env: AdminEnv, path: string) => `${env.SUPABASE_URL!.replace(/\/$/, '')}/storage/v1/${path}`
export const timeout = () => AbortSignal.timeout(6000)
export const INSTALL_COLUMNS = 'id,tenant_id,lead_id,lead_ref,public_token,config_snapshot,snapshot_hash,schema_version,product_type,installed_at,warranty,status,internal_note,created_at'

export async function select<T>(env: AdminEnv, table: string, query: string): Promise<T[]> {
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

/** A token alapján az aktív telepítés (vagy null). Érvénytelen formátumnál adatbázis-hívás sincs. */
export async function installationByToken(env: AdminEnv, token: string): Promise<InstallationRow | null> {
  if (!INSTALLATION_TOKEN_RE.test(token)) return null
  const [row] = await select<InstallationRow>(env, 'installations', `public_token=eq.${encodeURIComponent(token)}&status=eq.active&select=${INSTALL_COLUMNS}&limit=1`)
  return row ?? null
}
