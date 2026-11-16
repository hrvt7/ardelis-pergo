import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleAdminInstallations, purgeExpiredInstallations, type InstallationRow } from '../server/installations'
import { signToken } from '../server/tenantAdmin'
import { INSTALLATION_TOKEN_RE, snapshotHash } from '../src/lib/installations'
import { demoTenant } from '../src/tenants/demo'
import { createFakeStore } from './fixtures/fakeStore'

const env = { ADMIN_TOKEN_SECRET: 'titok', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', ADMIN_PASSWORD_DEMO: 'x' }
const warranty = { structure: 60, electronics: 24, led: 24, other: 12 }
const lead = (patch: Record<string, unknown> = {}) => ({ id: 1, ref: 'DEMO-1', tenant_id: 'demo', status: 'won', product: 'pergola', config: demoTenant.defaultConfig, customer_name: 'Teszt Elek', email: 'teszt@example.com', ...patch })

async function call(method: string, body?: unknown, tenantId = 'demo', query = '') {
  return handleAdminInstallations(new Request(`https://t.test/api/admin-installations${query}`, { method, headers: { Authorization: `Bearer ${await signToken('titok', tenantId)}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }), env, new Date('2026-11-16T10:00:00Z'))
}

afterEach(() => { vi.unstubAllGlobals() })

describe('telepítés rögzítése — admin', () => {
  it('bejelentkezés nélkül 401', async () => {
    const response = await handleAdminInstallations(new Request('https://t.test/api/admin-installations'), env)
    expect(response.status).toBe(401)
  })

  it('megnyert leadből befagyasztott pillanatképet rögzít, 256 bites tokennel; a lead „Felszerelve” lesz, napló készül', async () => {
    const store = createFakeStore({ leads: [lead()] })
    vi.stubGlobal('fetch', store.fetch)
    const response = await call('POST', { leadRef: 'DEMO-1', installedAt: '2026-11-10', warranty, note: 'sorozatszám 42' })
    expect(response.status).toBe(201)
    const [row] = store.tables.installations as unknown as InstallationRow[]
    expect(row.tenant_id).toBe('demo')
    expect(row.public_token).toMatch(INSTALLATION_TOKEN_RE)
    expect(row.schema_version).toBe(1)
    expect(row.config_snapshot.config).toEqual(demoTenant.defaultConfig)
    expect(row.config_snapshot.components.map((item) => item.key)).toContain('frame')
    expect(row.snapshot_hash).toBe(await snapshotHash(row.config_snapshot))
    expect(row.warranty).toEqual(warranty)
    expect(store.tables.leads[0].status).toBe('installed')
    expect(store.tables.installation_events).toMatchObject([{ kind: 'created', actor: 'manufacturer', tenant_id: 'demo' }])
  })

  it('elfogadott ajánlat esetén annak árát fagyasztja be', async () => {
    const store = createFakeStore({ leads: [lead()], quotes: [{ id: 5, tenant_id: 'demo', lead_ref: 'DEMO-1', status: 'accepted', total_net: 1000, total_gross: 1270, accepted_at: '2026-11-01' }] })
    vi.stubGlobal('fetch', store.fetch)
    expect((await call('POST', { leadRef: 'DEMO-1', installedAt: '2026-11-10', warranty })).status).toBe(201)
    expect((store.tables.installations[0] as unknown as InstallationRow).config_snapshot.price).toMatchObject({ totalGross: 1270, source: 'quote' })
  })

  it('csak „Megnyert”/„Felszerelve” állapotból; jövőbeli dátum és dupla rögzítés elutasítva', async () => {
    const store = createFakeStore({ leads: [lead({ status: 'offered' }), lead({ id: 2, ref: 'DEMO-2' })] })
    vi.stubGlobal('fetch', store.fetch)
    expect((await call('POST', { leadRef: 'DEMO-1', installedAt: '2026-11-10', warranty })).status).toBe(409)
    expect((await call('POST', { leadRef: 'DEMO-2', installedAt: '2026-12-01', warranty })).status).toBe(422)
    expect((await call('POST', { leadRef: 'DEMO-2', installedAt: '2026-11-10', warranty })).status).toBe(201)
    expect((await call('POST', { leadRef: 'DEMO-2', installedAt: '2026-11-10', warranty })).status).toBe(409)
    expect((await call('POST', { leadRef: 'DEMO-2', installedAt: '2026-11-10', warranty: { ...warranty, led: 999 } })).status).toBe(422)
  })

  it('tenant-elkülönítés: más gyártó leadjéből nem rögzíthet, a listában és törlésnél csak a sajátját látja', async () => {
    const store = createFakeStore({ leads: [lead({ id: 9, ref: 'AT-1', tenant_id: 'demo-at' })] })
    vi.stubGlobal('fetch', store.fetch)
    // A demo gyártó a demo-at leadjére hivatkozik → nem található.
    expect((await call('POST', { leadRef: 'AT-1', installedAt: '2026-11-10', warranty })).status).toBe(404)
    // A demo-at rögzíti a sajátját.
    expect((await call('POST', { leadRef: 'AT-1', installedAt: '2026-11-10', warranty }, 'demo-at')).status).toBe(201)
    const foreignId = (store.tables.installations[0] as { id: number }).id
    const list = await (await call('GET')).json() as { installations: unknown[] }
    expect(list.installations).toEqual([])
    expect((await call('DELETE', undefined, 'demo', `?id=${foreignId}`)).status).toBe(404)
    expect(store.tables.installations).toHaveLength(1)
    const own = await (await call('GET', undefined, 'demo-at')).json() as { installations: { token: string }[] }
    expect(own.installations[0].token).toMatch(INSTALLATION_TOKEN_RE)
  })

  it('törlés: a fotók, a bejelentések és a napló is törlődik', async () => {
    const store = createFakeStore({ leads: [lead()] })
    vi.stubGlobal('fetch', store.fetch)
    await call('POST', { leadRef: 'DEMO-1', installedAt: '2026-11-10', warranty })
    const id = (store.tables.installations[0] as { id: number }).id
    store.tables.service_requests.push({ id: 1, installation_id: id, tenant_id: 'demo', photo_paths: ['demo/1/a.jpg', 'demo/1/b.jpg'] })
    store.storage.set('service-photos/demo/1/a.jpg', new Uint8Array([1]))
    store.storage.set('service-photos/demo/1/b.jpg', new Uint8Array([1]))
    expect((await call('DELETE', undefined, 'demo', `?id=${id}`)).status).toBe(200)
    expect(store.tables.installations).toHaveLength(0)
    expect(store.tables.service_requests).toHaveLength(0)
    expect(store.tables.installation_events).toHaveLength(0)
    expect(store.storage.size).toBe(0)
  })
})

describe('telepítés — megőrzési idő', () => {
  it('csak a gyártó megőrzési idején túli telepítést törli', async () => {
    const store = createFakeStore({
      installations: [
        { id: 1, tenant_id: 'demo', installed_at: '2015-01-01' },
        { id: 2, tenant_id: 'demo', installed_at: '2020-01-01' },
        { id: 3, tenant_id: 'demo', installed_at: '2026-01-01' },
      ],
      tenant_settings: [{ tenant_id: 'demo', data: { installations: { retentionMonths: 120 } } }],
    })
    vi.stubGlobal('fetch', store.fetch)
    const result = await purgeExpiredInstallations(env, new Date('2026-11-16T00:00:00Z'))
    expect(result).toEqual({ deleted: 1, failed: 0 })
    expect(store.tables.installations.map((row) => row.id)).toEqual([2, 3])
  })
})
