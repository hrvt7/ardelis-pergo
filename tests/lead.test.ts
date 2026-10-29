import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleLeadRequest, resetLeadRateLimit } from '../server/lead'
import { demoTenant } from '../src/tenants/demo'

const body = (patch: Record<string, unknown> = {}) => ({
  tenantId: 'demo',
  config: demoTenant.defaultConfig,
  customer: { name: 'Teszt Elek', email: 'teszt@example.com', phone: '+36 30 123 4567', postalCode: '9600', city: 'Sárvár', region: 'Vas', address: '', notes: '' },
  consent: true,
  website: '',
  elapsedMs: 60_000,
  source: 'demo',
  ...patch,
})

const post = (payload: unknown) => new Request('https://example.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

beforeEach(() => resetLeadRateLimit())

describe('POST /api/lead', () => {
  it('élesben kézbesítés nélkül 503-at ad, nem tesz úgy, mintha sikerült volna', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await handleLeadRequest(post(body()), { NODE_ENV: 'production' })
    expect(response.status).toBe(503)
  })

  it('fejlesztői módban naplóz és azonosítót ad', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const response = await handleLeadRequest(post(body()), { NODE_ENV: 'development' })
    expect(response.status).toBe(200)
    expect(((await response.json()) as { ref: string }).ref).toMatch(/^DEMO-\d{8}-[0-9A-F]{6}$/)
  })

  it('a szerver a gyártói árral számol, nem a böngészőből küldöttel, és e-mailt küld', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) })
      return new Response('{}', { status: 200 })
    }))
    const response = await handleLeadRequest(post(body({ estimateGross: 1 })), { NODE_ENV: 'production', RESEND_API_KEY: 'k', LEAD_FALLBACK_EMAIL: 'gyarto@example.com', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 's' })
    expect(response.status).toBe(200)
    const stored = calls.find((call) => call.url.includes('/rest/v1/leads'))!
    expect(stored.body.estimate_gross).toBe(5648000)
    const manager = calls.find((call) => call.url.includes('resend') && (call.body.to as string[])[0] === 'gyarto@example.com')!
    expect(String(manager.body.subject)).toContain('8')
    expect(manager.body.reply_to).toBe('teszt@example.com')
    expect(String(manager.body.html)).toContain('Teszt Elek')
    const customer = calls.find((call) => call.url.includes('resend') && (call.body.to as string[])[0] === 'teszt@example.com')
    expect(customer).toBeDefined()
  })

  it('osztott oldal és komfort-opciók: ár a szerveren, leírás a gyártói e-mailben', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) })
      return new Response('{}', { status: 200 })
    }))
    const config = { ...demoTenant.defaultConfig, sides: { ...demoTenant.defaultConfig.sides, front: 'glassFramed' }, split: { front: 'slatWood' }, led: true, ledRgb: true, fans: 2, smartHome: true }
    const response = await handleLeadRequest(post(body({ config })), { NODE_ENV: 'production', RESEND_API_KEY: 'k', LEAD_FALLBACK_EMAIL: 'gyarto@example.com', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 's' })
    expect(response.status).toBe(200)
    const stored = calls.find((call) => call.url.includes('/rest/v1/leads'))!
    expect(stored.body.estimate_gross).toBeGreaterThan(5648000)
    const html = String(calls.find((call) => call.url.includes('resend') && (call.body.to as string[])[0] === 'gyarto@example.com')!.body.html)
    expect(html).toContain('bal fél: Keretes tolóüveg · jobb fél: Fa lécfal')
    expect(html).toContain('2 db mennyezeti ventilátor')
    expect(html).toContain('okosotthon-vezérlés')
    expect(html).toContain('színváltós RGB+W LED')
  })

  it('a robotot (kitöltött rejtett mező) csendben elnyeli', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await handleLeadRequest(post(body({ website: 'spam.example' })), { NODE_ENV: 'production', RESEND_API_KEY: 'k', LEAD_FALLBACK_EMAIL: 'a@b.hu' })
    expect(response.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('hiányos adatra és ismeretlen gyártóra érthető hibát ad', async () => {
    expect((await handleLeadRequest(post(body({ customer: { name: 'X' } })), {})).status).toBe(422)
    expect((await handleLeadRequest(post(body({ tenantId: 'nincs-ilyen' })), {})).status).toBe(404)
    expect((await handleLeadRequest(post(body({ consent: false })), {})).status).toBe(422)
  })

  it('a kliens órájának eltérése nem dob el valódi kérelmet (régi startedAt a jövőben)', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const response = await handleLeadRequest(post(body({ elapsedMs: undefined, startedAt: Date.now() + 10 * 60_000 })), { NODE_ENV: 'development' })
    expect(((await response.json()) as { delivered?: string }).delivered).toBe('dev-log')
  })

  it('a túl gyors (2,5 s alatti) kitöltést csendben elnyeli', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await handleLeadRequest(post(body({ elapsedMs: 800 })), { NODE_ENV: 'production', RESEND_API_KEY: 'k', LEAD_FALLBACK_EMAIL: 'a@b.hu' })
    expect(response.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ugyanarra az e-mailre rövid időn belül legfeljebb 3 kérelem megy ki', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const statuses: number[] = []
    for (let i = 0; i < 4; i++) statuses.push((await handleLeadRequest(post(body()), { NODE_ENV: 'development' })).status)
    expect(statuses).toEqual([200, 200, 200, 429])
  })

  it('sortörés a névben nem kerül az e-mail tárgyába', async () => {
    const calls: Record<string, unknown>[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => { calls.push(JSON.parse(String(init.body))); return new Response('{}', { status: 200 }) }))
    const customer = { ...body().customer, name: 'Teszt\r\nBcc: x@y.hu' }
    await handleLeadRequest(post(body({ customer })), { NODE_ENV: 'production', RESEND_API_KEY: 'k', LEAD_FALLBACK_EMAIL: 'gyarto@example.com' })
    for (const call of calls) expect(String(call.subject)).not.toMatch(/[\r\n]/)
  })

  it('ha minden kézbesítés elbukik, 502-t ad', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response('hiba', { status: 500 })))
    const response = await handleLeadRequest(post(body()), { NODE_ENV: 'production', RESEND_API_KEY: 'k', LEAD_FALLBACK_EMAIL: 'a@b.hu' })
    expect(response.status).toBe(502)
  })
})

describe('lead e-mail tartalma', () => {
  it('a rögzítési mód és a falas oldal olvashatóan szerepel', async () => {
    const { describeConfig } = await import('../server/lead')
    const { tenantPrice } = await import('../src/tenants/rules')
    const config = { ...demoTenant.defaultConfig, mount: 'corner-left' as const }
    const rows = Object.fromEntries(describeConfig(demoTenant, config, tenantPrice(demoTenant, config)))
    expect(rows['Rögzítés']).toBe('L-alakú ház sarkába, balra')
    expect(rows['Oldalak']).toContain('Bal oldali: házszárny')
    expect(rows['Oldalak']).toContain('Hátsó: házfal')
  })
})
