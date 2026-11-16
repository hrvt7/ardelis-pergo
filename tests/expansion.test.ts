import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleAdminInstallations, resetInstallationRateLimit } from '../server/installations'
import { handleLeadRequest, resetLeadRateLimit } from '../server/lead'
import { signToken } from '../server/tenantAdmin'
import { clearExpansion, readExpansion, startExpansion } from '../src/lib/expansion'
import { demoTenant } from '../src/tenants/demo'
import { tenantPrice } from '../src/tenants/rules'
import type { PergolaConfig } from '../src/types/pergola'
import { createFakeStore, type FakeStore } from './fixtures/fakeStore'

const env = { ADMIN_TOKEN_SECRET: 'titok', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', NODE_ENV: 'production' }
const NOW = new Date('2026-11-16T10:00:00Z')
const original: PergolaConfig = { ...demoTenant.defaultConfig, led: false, heaters: 0, sensors: false, sides: { ...demoTenant.defaultConfig.sides, front: 'none', left: 'none', right: 'none' } }

async function installed(tenantId = 'demo'): Promise<{ store: FakeStore; token: string }> {
  const store = createFakeStore({ leads: [{ id: 1, ref: 'ORIG-1', tenant_id: tenantId, status: 'won', product: 'pergola', config: original, customer_name: 'Régi Vevő', email: 'regi@example.com' }] })
  vi.stubGlobal('fetch', store.fetch)
  const request = new Request('https://t.test/api/admin-installations', { method: 'POST', headers: { Authorization: `Bearer ${await signToken('titok', tenantId)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ leadRef: 'ORIG-1', installedAt: '2026-06-01', warranty: { structure: 60, electronics: 24, led: 24, other: 24 } }) })
  expect((await handleAdminInstallations(request, env, NOW)).status).toBe(201)
  return { store, token: String(store.tables.installations[0].public_token) }
}

const lead = (config: unknown, token: string, tenantId = 'demo') => handleLeadRequest(new Request('https://t.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `5.5.5.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify({
  tenantId, product: 'pergola', config, consent: true, elapsedMs: 60_000, source: 'expansion', expansion: { t: token },
  customer: { name: 'Régi Vevő', email: `regi${Math.random()}@example.com`, phone: '+36 30 123 4567', postalCode: '9600', city: 'Sárvár', region: 'Vas' },
}) }), env)

beforeEach(() => { resetLeadRateLimit(); resetInstallationRateLimit() })
afterEach(() => vi.unstubAllGlobals())

describe('bővítés — lead a tulajdonosi oldalról', () => {
  it('a szerver zárolja a meglévő szerkezetet, csak a hozzáadást engedi; a lead a telepítésre hivatkozik, a becsült ár a különbözet', async () => {
    const { store, token } = await installed()
    // A kliens megpróbálja a méretet és a tetőt is módosítani, és LED-et meg oldalfalat ad hozzá.
    const attempt = { ...original, width: original.width + 1.5, roof: 'glass', frameColor: 'white', led: true, sides: { ...original.sides, left: 'zip' } }
    const response = await lead(attempt, token)
    expect(response.status).toBe(200)
    const stored = store.tables.leads.find((row) => row.source === 'expansion')!
    expect(stored).toBeDefined()
    const config = stored.config as PergolaConfig
    expect([config.width, config.roof, config.frameColor]).toEqual([original.width, original.roof, original.frameColor])
    expect([config.led, config.sides.left]).toEqual([true, 'zip'])
    expect(stored.installation_id).toBe(store.tables.installations[0].id)
    const delta = tenantPrice(demoTenant, config).totalGross - tenantPrice(demoTenant, original).totalGross
    expect(stored.estimate_gross).toBe(delta)
    expect(String(stored.notes)).toMatch(/^\[Bővítés\] Eredeti: ORIG-1\. Hozzáadva: /)
    expect(store.tables.installation_events.at(-1)).toMatchObject({ kind: 'expansion_request', actor: 'owner' })
  })
  it('új elem nélkül nem fogad el', async () => {
    const { token } = await installed()
    expect((await lead({ ...original, width: original.width + 1 }, token)).status).toBe(422)
  })
  it('érvénytelen token vagy másik gyártó telepítése: elutasítva, lead nem keletkezik', async () => {
    const { store, token } = await installed('demo-at')
    expect((await lead({ ...original, led: true }, token, 'demo')).status).toBe(422)
    expect((await lead({ ...original, led: true }, 'x'.repeat(43), 'demo')).status).toBe(422)
    expect(store.tables.leads.filter((row) => row.source === 'expansion')).toHaveLength(0)
  })
})

describe('bővítés — böngészős munkamenet', () => {
  const memory = new Map<string, string>()
  beforeEach(() => {
    memory.clear()
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) })
  })
  it('csak ?bovites=1 mellett, ugyanannál a gyártónál, 2 órán belül érvényes; a token nem kerül az URL-be', () => {
    startExpansion({ tenantId: 'demo', token: 'T'.repeat(43), config: original, headline: 'Aero' })
    expect(readExpansion('demo', '?bovites=1')?.token).toBe('T'.repeat(43))
    expect(readExpansion('demo', '')).toBeNull()
    expect(readExpansion('demo-at', '?bovites=1')).toBeNull()
    expect(readExpansion('demo', '?bovites=1', Date.now() + 3 * 3_600_000)).toBeNull()
    clearExpansion()
    expect(readExpansion('demo', '?bovites=1')).toBeNull()
  })
})
