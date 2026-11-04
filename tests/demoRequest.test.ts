import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_REQUEST_EMAIL, handleDemoRequest, resetDemoRateLimit } from '../server/demoRequest'

const valid = { name: 'Teszt Elek', company: 'Pergola Kft.', email: 'elek@pergola.hu', phone: '+36 30 123 4567', product: 'pergola', plan: 'pro', message: 'Demót kérek.', consent: true, elapsedMs: 9000 }
const post = (body: unknown, ip = '1.2.3.4') => new Request('https://x.test/api/demo-request', { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify(body) })

describe('demókérés', () => {
  beforeEach(() => resetDemoRateLimit())
  afterEach(() => vi.unstubAllGlobals())

  it('e-mailt küld a platform címére, válaszcím az érdeklődő', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const response = await handleDemoRequest(post(valid), { RESEND_API_KEY: 'k', NODE_ENV: 'production' })
    expect(response.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    const sent = JSON.parse(String(init.body))
    expect(sent.to).toEqual([DEMO_REQUEST_EMAIL])
    expect(sent.reply_to).toBe('elek@pergola.hu')
    expect(sent.html).toContain('Pergola Kft.')
  })

  it('a HTML-t escape-eli', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await handleDemoRequest(post({ ...valid, company: '<script>x</script>' }), { RESEND_API_KEY: 'k' })
    const sent = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(sent.html).not.toContain('<script>')
  })

  it('beállítás nélkül élesben 503 + közvetlen e-mail-cím', async () => {
    const response = await handleDemoRequest(post(valid), { NODE_ENV: 'production' })
    expect(response.status).toBe(503)
    expect((await response.json()).fallbackEmail).toBe(DEMO_REQUEST_EMAIL)
  })

  it('hiányzó hozzájárulásnál és hibás e-mailnél 400', async () => {
    expect((await handleDemoRequest(post({ ...valid, consent: false }), {})).status).toBe(400)
    expect((await handleDemoRequest(post({ ...valid, email: 'nem-email' }), {})).status).toBe(400)
  })

  it('robotot csendben elnyel', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await handleDemoRequest(post({ ...valid, fax: 'spam' }), { RESEND_API_KEY: 'k' })
    expect(response.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('korlátozza az ismételt beküldést', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    const statuses = []
    for (let i = 0; i < 6; i++) statuses.push((await handleDemoRequest(post({ ...valid, email: `a${i}@b.hu` }), { RESEND_API_KEY: 'k' })).status)
    expect(statuses.slice(0, 4)).toEqual([200, 200, 200, 200])
    expect(statuses[5]).toBe(429)
  })
})
