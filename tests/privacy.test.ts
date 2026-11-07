import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleDemoRequest, resetDemoRateLimit } from '../server/demoRequest'
import { PRIVACY_VERSION } from '../src/lib/privacyVersion'
import { hasPrivacyUrl } from '../src/tenants/privacy'

const valid = { name: 'Teszt Elek', company: 'Pergola Kft.', email: 'elek@pergola.hu', product: 'pergola', plan: 'pro', consent: true, elapsedMs: 9000 }
const post = (body: unknown) => new Request('https://x.test/api/demo-request', { method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body: JSON.stringify(body) })

describe('adatvédelem', () => {
  beforeEach(() => resetDemoRateLimit())
  afterEach(() => vi.unstubAllGlobals())

  it('a demókérés a hozzájárulás időpontját és a tájékoztató verzióját tárolja', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const before = Date.now()
    const response = await handleDemoRequest(post(valid), { SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_ROLE_KEY: 'k' })
    expect(response.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/rest/v1/demo_requests')
    const row = JSON.parse(String(init.body))
    expect(row.consent_version).toBe(PRIVACY_VERSION)
    expect(Date.parse(row.consent_at)).toBeGreaterThanOrEqual(before - 1000)
  })

  it('éles gyártónál csak valós https adatkezelési cím fogadható el', () => {
    const live = (privacyUrl?: string) => ({ demo: false, brand: { name: 'X', legalName: 'X', privacyUrl } })
    expect(hasPrivacyUrl(live(undefined))).toBe(false)
    expect(hasPrivacyUrl(live(''))).toBe(false)
    expect(hasPrivacyUrl(live('http://gyarto.example/adat'))).toBe(false)
    expect(hasPrivacyUrl(live('https://www.gyarto.hu/adatkezeles'))).toBe(false)
    expect(hasPrivacyUrl(live('nem-url'))).toBe(false)
    expect(hasPrivacyUrl(live('https://pergolagyarto.hu/adatkezeles'))).toBe(true)
    expect(hasPrivacyUrl({ demo: true, brand: { name: 'D', legalName: 'D' } })).toBe(true)
  })
})
