import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleAdminLogin, handleAdminSettings, handleTenantRequest, resetAdminRateLimit, signToken, verifyToken } from '../server/tenantAdmin'
import { applyOverrides, parseOverrides } from '../src/tenants/overrides'
import { calculatePrice } from '../src/lib/pricing'
import { demoTenant } from '../src/tenants/demo'

const env = { ADMIN_TOKEN_SECRET: 'titok', ADMIN_PASSWORD_DEMO: 'jelszo123', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }
const post = (url: string, body: unknown, headers: Record<string, string> = {}) => new Request(`https://t.test${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

describe('felülírások ráfésülése', () => {
  it('felülírja a márkát és az árat, az alapot nem módosítja', () => {
    const before = demoTenant.prices.louveredPerM2Net
    const t = applyOverrides(demoTenant, { brand: { name: 'ÚJ NÉV', phone: '' }, prices: { louveredPerM2Net: 200000, vatRate: 0.2 } })
    expect(t.brand.name).toBe('ÚJ NÉV')
    expect(t.brand.phone).toBeUndefined()
    expect(t.prices.louveredPerM2Net).toBe(200000)
    expect(t.prices.vatRate).toBe(0.2)
    expect(demoTenant.prices.louveredPerM2Net).toBe(before)
    const config = { ...t.defaultConfig, roof: 'louvered' as const }
    expect(calculatePrice(config, t.prices).totalNet).toBeGreaterThan(calculatePrice(config, demoTenant.prices).totalNet)
  })
  it('tiltott tető után az alapértelmezett konfiguráció érvényes marad', () => {
    const t = applyOverrides(demoTenant, { roofs: ['fixed'] })
    expect(Object.keys(t.roofs)).toEqual(['fixed'])
    expect(t.defaultConfig.roof).toBe('fixed')
  })
  it('hibás adatot elutasít, az alapot adja vissza', () => {
    expect(parseOverrides({ brand: { email: 'nem-email' } }).ok).toBe(false)
    expect(parseOverrides({ roofs: [] }).ok).toBe(false)
    expect(parseOverrides({ prices: { louveredPerM2Net: -5 } }).ok).toBe(false)
    expect(parseOverrides({ prices: { ismeretlen: 1 } }).ok).toBe(false)
    expect(applyOverrides(demoTenant, { roofs: [] })).toBe(demoTenant)
  })
})

describe('admin háttér', () => {
  beforeEach(() => { resetAdminRateLimit(); vi.restoreAllMocks() })

  it('token: érvényes, lejárt és hamisított', async () => {
    const token = await signToken('titok', 'demo', 1000)
    expect(await verifyToken('titok', token, 2000)).toBe('demo')
    expect(await verifyToken('titok', token, 1000 + 9 * 3600_000)).toBeNull()
    expect(await verifyToken('más', token, 2000)).toBeNull()
    expect(await verifyToken('titok', token.replace('demo', 'masik'), 2000)).toBeNull()
  })
  it('belépés: jó jelszó token, rossz 401, nincs beállítva 503, sok próba 429', async () => {
    const ok = await handleAdminLogin(post('/api/admin-login', { tenantId: 'demo', password: 'jelszo123' }), env)
    expect(ok.status).toBe(200)
    expect((await ok.json()).token).toBeTruthy()
    expect((await handleAdminLogin(post('/api/admin-login', { tenantId: 'demo', password: 'rossz' }), env)).status).toBe(401)
    expect((await handleAdminLogin(post('/api/admin-login', { tenantId: 'demo', password: 'x' }), { ADMIN_TOKEN_SECRET: 'a' })).status).toBe(503)
    for (let i = 0; i < 6; i++) await handleAdminLogin(post('/api/admin-login', { tenantId: 'demo', password: 'rossz' }), env)
    expect((await handleAdminLogin(post('/api/admin-login', { tenantId: 'demo', password: 'jelszo123' }), env)).status).toBe(429)
  })
  it('mentés token nélkül 401; tokennel validál és a Supabase-be ír', async () => {
    const noAuth = await handleAdminSettings(new Request('https://t.test/api/admin-settings', { method: 'PUT', body: '{}' }), env)
    expect(noAuth.status).toBe(401)
    const token = await signToken('titok', 'demo')
    const auth = { Authorization: `Bearer ${token}` }
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const bad = await handleAdminSettings(new Request('https://t.test/api/admin-settings', { method: 'PUT', headers: auth, body: JSON.stringify({ brand: { email: 'x' } }) }), env)
    expect(bad.status).toBe(422)
    expect(fetchMock).not.toHaveBeenCalled()
    const good = await handleAdminSettings(new Request('https://t.test/api/admin-settings', { method: 'PUT', headers: auth, body: JSON.stringify({ prices: { vatRate: 0.2 }, lead: { recipients: ['a@b.hu'] } }) }), env)
    expect(good.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
  it('a nyilvános végpont nem adja ki a lead-címzetteket', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ data: { prices: { vatRate: 0.2 }, lead: { recipients: ['titkos@ceg.hu'] } } }]), { status: 200 })))
    const response = await handleTenantRequest(new Request('https://t.test/api/tenant?id=demo'), env)
    const body = await response.json()
    expect(body.overrides.prices.vatRate).toBe(0.2)
    expect(JSON.stringify(body)).not.toContain('titkos@ceg.hu')
    vi.unstubAllGlobals()
  })
})
