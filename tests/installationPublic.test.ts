import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleAdminInstallations, handleInstallation, resetInstallationRateLimit } from '../server/installations'
import { signToken } from '../server/tenantAdmin'
import { newInstallationToken } from '../src/lib/installations'
import { redactPrivatePath } from '../src/lib/privatePath'
import { isPrivatePage } from '../src/lib/swRoutes'
import { demoTenant } from '../src/tenants/demo'
import { createFakeStore, type FakeStore } from './fixtures/fakeStore'

const env = { ADMIN_TOKEN_SECRET: 'titok', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }
const NOW = new Date('2026-11-16T10:00:00Z')
const view = (token: string, ip = '1.1.1.1') => handleInstallation(new Request(`https://t.test/api/installation?t=${token}`, { headers: { 'x-forwarded-for': ip } }), env, NOW)

async function recorded(): Promise<{ store: FakeStore; token: string }> {
  const store = createFakeStore({ leads: [{ id: 1, ref: 'DEMO-77', tenant_id: 'demo', status: 'won', product: 'pergola', config: demoTenant.defaultConfig, customer_name: 'Titkos Tulajdonos', email: 'titkos@example.com', phone: '+36301234567', address: 'Rejtett utca 1.' }] })
  vi.stubGlobal('fetch', store.fetch)
  const request = new Request('https://t.test/api/admin-installations', { method: 'POST', headers: { Authorization: `Bearer ${await signToken('titok', 'demo')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ leadRef: 'DEMO-77', installedAt: '2025-01-15', warranty: { structure: 60, electronics: 12, led: 24, other: 24 }, note: 'BELSŐ-MEGJEGYZÉS' }) })
  expect((await handleAdminInstallations(request, env, NOW)).status).toBe(201)
  return { store, token: String(store.tables.installations[0].public_token) }
}

beforeEach(() => resetInstallationRateLimit())
afterEach(() => vi.unstubAllGlobals())

describe('tulajdonosi oldal — /api/installation', () => {
  it('érvénytelen formátumú tokenre 404, adatbázis-hívás nélkül', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    for (const bad of ['', 'rossz', 'a'.repeat(42), `${'a'.repeat(42)}!`, 'a'.repeat(44)]) expect((await view(bad)).status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('ismeretlen vagy archivált tokenre 404', async () => {
    const { store } = await recorded()
    expect((await view(newInstallationToken())).status).toBe(404)
    store.tables.installations[0].status = 'archived'
    expect((await view(String(store.tables.installations[0].public_token))).status).toBe(404)
  })
  it('személyes adat, belső megjegyzés, ár, lead-azonosító és token nélkül; noindex fejléccel', async () => {
    const { token } = await recorded()
    const response = await view(token)
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const text = await response.text()
    for (const secret of ['Titkos Tulajdonos', 'titkos@example.com', '+36301234567', 'Rejtett utca', 'BELSŐ-MEGJEGYZÉS', 'DEMO-77', token, 'totalGross', 'totalNet']) expect(text).not.toContain(secret)
    const data = JSON.parse(text) as { installation: { components: { key: string; active: boolean; expiresAt: string; months: number }[]; installedAt: string } }
    const drive = data.installation.components.find((item) => item.key === 'roof-drive')!
    expect(drive).toMatchObject({ months: 12, expiresAt: '2026-01-15', active: false })
    expect(data.installation.components.find((item) => item.key === 'frame')).toMatchObject({ months: 60, active: true })
  })
  it('a pillanatkép befagyott: a gyártó későbbi termékátnevezése nem változtat a tulajdonosi oldalon', async () => {
    const { store, token } = await recorded()
    const before = (await (await view(token)).json()) as { installation: { headline: string; components: { label: string }[] } }
    store.tables.tenant_settings.push({ tenant_id: 'demo', data: { roofNames: { [demoTenant.defaultConfig.roof]: { name: 'Átnevezett' } } } })
    const after = (await (await view(token)).json()) as { installation: { headline: string; components: { label: string }[] } }
    expect(after.installation.headline).toBe(before.installation.headline)
    expect(after.installation.components).toEqual(before.installation.components)
    expect(JSON.stringify(after.installation.components)).not.toContain('Átnevezett')
  })
  it('visszaélés-fék: IP-nként percenként 60 megnyitás', async () => {
    vi.stubGlobal('fetch', vi.fn())
    for (let index = 0; index < 60; index++) expect((await view('rossz', '9.9.9.9')).status).toBe(404)
    expect((await view('rossz', '9.9.9.9')).status).toBe(429)
    expect((await view('rossz', '8.8.8.8')).status).toBe(404)
  })
})

describe('tulajdonosi oldal — nem indexelt, nem mért', () => {
  it('a token nem kerül analitikába és naplóba', () => {
    expect(redactPrivatePath('https://lamelix.vercel.app/t/AbC-_123?x=1')).toBe('https://lamelix.vercel.app/t/[token]?x=1')
    expect(redactPrivatePath('/ajanlat/abcdef')).toBe('/ajanlat/[token]')
    expect(redactPrivatePath('/konfigurator')).toBe('/konfigurator')
  })
  it('robots.txt tiltja, a szolgáltatásmunkás nem tárolja, a válasz noindex fejlécet kap', () => {
    expect(readFileSync('vite.config.ts', 'utf8')).toContain('Disallow: /t/')
    expect(isPrivatePage('/t/abc')).toBe(true)
    expect(isPrivatePage('/tervezo')).toBe(false)
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] }
    expect(vercel.headers.find((rule) => rule.source === '/t/(.*)')?.headers.some((header) => header.key === 'X-Robots-Tag' && header.value.includes('noindex'))).toBe(true)
  })
  it('nincs a sitemapben', async () => {
    const { SEO_SITEMAP_PATHS } = await import('../contracts/seo')
    expect(SEO_SITEMAP_PATHS.some((path) => path.startsWith('/t'))).toBe(false)
  })
})
