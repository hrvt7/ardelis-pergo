import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectiveStatus, handleAdminQuotes, handleQuote, quoteHash, resetQuoteRateLimit, type QuoteRow } from '../server/quotes'
import { signToken } from '../server/tenantAdmin'
import { demoTenant } from '../src/tenants/demo'
import { tenantPrice } from '../src/tenants/rules'

const env = { ADMIN_TOKEN_SECRET: 'titok', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }
const TOKEN = 'a'.repeat(32)

async function row(patch: Partial<QuoteRow> = {}): Promise<QuoteRow> {
  const config = demoTenant.defaultConfig
  const price = tenantPrice(demoTenant, config)
  const base = {
    id: 1, tenant_id: 'demo', number: 'DEMO-2026-0001', version: 1, token: TOKEN, lead_ref: 'DEMO-1', status: 'sent' as const,
    customer_name: 'Teszt Elek', customer_email: 'teszt@example.com', customer_phone: '+36 30 123 4567', customer_address: '9600 Sárvár',
    config, price, total_net: price.totalNet, total_gross: price.totalGross, discount_net: 0, deposit_percent: 30,
    deposit_gross: Math.round(price.totalGross * 0.3), valid_until: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    note: null, payment_info: 'Számlaszám: 1', terms: null, doc_hash: '', view_count: 0, first_viewed_at: null, last_viewed_at: null,
    accepted_at: null, signer_name: null, declined_at: null, decline_reason: null, created_at: new Date().toISOString(),
  }
  const merged = { ...base, ...patch } as QuoteRow
  return { ...merged, doc_hash: patch.doc_hash ?? await quoteHash(merged) }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const get = (t: string) => new Request(`https://t.test/api/quote?t=${t}`)
const post = (body: unknown) => new Request('https://t.test/api/quote', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => resetQuoteRateLimit())
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('ajánlat — vevői oldal', () => {
  it('érvénytelen tokenre 404-et ad, adatbázis-hívás nélkül', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    expect((await handleQuote(get('rossz'), env)).status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('megnyitáskor számolja a megtekintést és megtisztított adatot ad (token/IP nélkül)', async () => {
    const stored = await row()
    const calls: { url: string; method?: string; body?: string }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body as string })
      return init?.method === 'PATCH' ? json([{ ...stored, view_count: 1 }]) : json([stored])
    }))
    const response = await handleQuote(get(TOKEN), env)
    expect(response.status).toBe(200)
    const data = await response.json() as { quote: Record<string, unknown> }
    expect(data.quote.label).toBe('DEMO-2026-0001')
    expect(data.quote.totalGross).toBe(stored.total_gross)
    expect(JSON.stringify(data)).not.toContain(TOKEN)
    expect(calls.some((call) => call.method === 'PATCH' && JSON.parse(call.body!).view_count === 1)).toBe(true)
  })
  it('elfogadáskor rögzíti az aláírást, a lead nyertre áll, e-mail megy', async () => {
    const stored = await row()
    const calls: { url: string; method?: string; body?: string }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body as string })
      if (url.includes('resend')) return json({})
      if (init?.method === 'PATCH') return json([{ ...stored, status: 'accepted' }])
      return json([stored])
    }))
    const request = new Request('https://t.test/api/quote', { method: 'POST', headers: { 'x-forwarded-for': '1.2.3.4' }, body: JSON.stringify({ action: 'accept', t: TOKEN, name: 'Teszt Elek', consent: true }) })
    const response = await handleQuote(request, { ...env, RESEND_API_KEY: 'r', LEAD_FALLBACK_EMAIL: 'gyarto@example.com' })
    expect(response.status).toBe(200)
    const accept = calls.find((call) => call.method === 'PATCH' && call.url.includes('quotes'))!
    expect(JSON.parse(accept.body!)).toMatchObject({ status: 'accepted', signer_name: 'Teszt Elek', signer_ip: '1.2.3.4' })
    expect(calls.some((call) => call.url.includes('/leads?') && JSON.parse(call.body!).status === 'won')).toBe(true)
    expect(calls.filter((call) => call.url.includes('resend'))).toHaveLength(2)
  })
  it('név és nyilatkozat nélkül nem fogad el', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect((await handleQuote(post({ action: 'accept', t: TOKEN, name: 'T', consent: true }), env)).status).toBe(422)
    expect((await handleQuote(post({ action: 'accept', t: TOKEN, name: 'Teszt Elek', consent: false }), env)).status).toBe(422)
  })
  it('lejárt és már elfogadott ajánlatot nem lehet elfogadni', async () => {
    const accept = { action: 'accept', t: TOKEN, name: 'Teszt Elek', consent: true }
    vi.stubGlobal('fetch', vi.fn(async () => json([await row({ valid_until: new Date(Date.now() - 1000).toISOString() })])))
    expect((await handleQuote(post(accept), env)).status).toBe(410)
    vi.stubGlobal('fetch', vi.fn(async () => json([await row({ status: 'accepted' })])))
    expect((await handleQuote(post(accept), env)).status).toBe(409)
  })
  it('megváltoztatott tartalomnál (ujjlenyomat-eltérés) nem fogad el', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const tampered = { ...(await row()), total_gross: 1 }
    vi.stubGlobal('fetch', vi.fn(async () => json([tampered])))
    expect((await handleQuote(post({ action: 'accept', t: TOKEN, name: 'Teszt Elek', consent: true }), env)).status).toBe(409)
  })
  it('elutasítás indokkal mentődik', async () => {
    const stored = await row()
    const bodies: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') { bodies.push(init.body as string); return json([{ ...stored, status: 'declined' }]) }
      return json([stored])
    }))
    expect((await handleQuote(post({ action: 'decline', t: TOKEN, reason: 'Drága' }), env)).status).toBe(200)
    expect(JSON.parse(bodies[0])).toMatchObject({ status: 'declined', decline_reason: 'Drága' })
  })
})

describe('ajánlat — hatályos állapot és ujjlenyomat', () => {
  it('a lejárt függő ajánlat „expired”', async () => {
    expect(effectiveStatus({ status: 'sent', valid_until: new Date(Date.now() - 1).toISOString() })).toBe('expired')
    expect(effectiveStatus({ status: 'accepted', valid_until: new Date(Date.now() - 1).toISOString() })).toBe('accepted')
  })
  it('az ujjlenyomat minden rögzített adatra érzékeny', async () => {
    const a = await row()
    expect(await quoteHash(a)).toBe(a.doc_hash)
    expect(await quoteHash({ ...a, deposit_percent: 50 })).not.toBe(a.doc_hash)
    expect(await quoteHash({ ...a, version: 2 })).not.toBe(a.doc_hash)
  })
})

describe('ajánlat — gyártói kezelés', () => {
  const authed = async (method: string, body?: unknown, url = 'https://t.test/api/admin-quotes') => new Request(url, { method, headers: { Authorization: `Bearer ${await signToken('titok', 'demo')}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  it('token nélkül 401', async () => {
    expect((await handleAdminQuotes(new Request('https://t.test/api/admin-quotes'), env)).status).toBe(401)
  })
  it('új ajánlat: szerveren számolt ár, számozás, engedmény, e-mail; a régi függő felülíródik', async () => {
    const config = demoTenant.defaultConfig
    const lead = { ref: 'DEMO-1', customer_name: 'Teszt Elek', email: 'teszt@example.com', phone: '+36 30 1', address: 'Fő u. 1', postal_code: '9600', city: 'Sárvár', config, status: 'new' }
    const prior = await row({ version: 1 })
    let inserted: Record<string, unknown> | null = null
    const patches: { url: string; body: string }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('resend')) return json({})
      if (url.includes('/leads?') && init?.method === 'PATCH') { patches.push({ url, body: init.body as string }); return json({}) }
      if (url.includes('/leads?')) return json([lead])
      if (url.includes('/quotes') && init?.method === 'POST') { inserted = JSON.parse(init.body as string); return json([{ ...(inserted as object), id: 2, token: 'b'.repeat(32), created_at: new Date().toISOString(), view_count: 0 }], 201) }
      if (url.includes('/quotes') && init?.method === 'PATCH') { patches.push({ url, body: init.body as string }); return json([{}]) }
      return json([prior])
    }))
    const response = await handleAdminQuotes(await authed('POST', { leadRef: 'DEMO-1', validDays: 14, depositPercent: 40, discountNet: 100000 }), { ...env, RESEND_API_KEY: 'r' })
    expect(response.status).toBe(200)
    const price = tenantPrice(demoTenant, config)
    expect(inserted).toMatchObject({ number: 'DEMO-2026-0001', version: 2, deposit_percent: 40, discount_net: 100000, total_net: price.totalNet - 100000 })
    expect((inserted as unknown as QuoteRow).total_gross).toBeLessThan(price.totalGross)
    expect(Math.abs((inserted as unknown as QuoteRow).deposit_gross - (inserted as unknown as QuoteRow).total_gross * 0.4)).toBeLessThan(1)
    expect(patches.some((patch) => patch.body.includes('superseded'))).toBe(true)
    expect(patches.some((patch) => patch.body.includes('offered'))).toBe(true)
    const data = await response.json() as { emailed: boolean; quote: { url: string } }
    expect(data.emailed).toBe(true)
    expect(data.quote.url).toBe(`https://t.test/ajanlat/${'b'.repeat(32)}`)
  })
  it('elfogadott ajánlat mellé nem ad ki újat', async () => {
    const config = demoTenant.defaultConfig
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/leads?')) return json([{ ref: 'DEMO-1', customer_name: 'T', email: 't@example.com', phone: '1', address: null, postal_code: '9600', city: 'S', config, status: 'won' }])
      return json([await row({ status: 'accepted' })])
    }))
    expect((await handleAdminQuotes(await authed('POST', { leadRef: 'DEMO-1' }), env)).status).toBe(409)
  })
  it('csak a függő ajánlat vonható vissza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json([await row({ status: 'accepted' })])))
    expect((await handleAdminQuotes(await authed('PATCH', { number: 'DEMO-2026-0001', version: 1, action: 'withdraw' }), env)).status).toBe(409)
  })
})
