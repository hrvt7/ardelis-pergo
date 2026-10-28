// Gyártói nyilvántartás. Új gyártó: készíts egy új fájlt a demo.ts mintájára,
// importáld ide és tedd bele a TENANTS listába. Lásd docs/UJ-GYARTO.md.
import { demoTenant } from './demo'
import type { Tenant } from './types'

export type { Tenant } from './types'

const TENANTS: Tenant[] = [demoTenant]

const BY_ID = new Map(TENANTS.map((tenant) => [tenant.id, tenant]))

export const DEFAULT_TENANT_ID = 'demo'

export function getTenant(id: string | undefined | null): Tenant | undefined {
  if (!id) return undefined
  return BY_ID.get(id.toLowerCase())
}

export function listTenantIds() {
  return TENANTS.map((tenant) => tenant.id)
}
