import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleAdminQuotes, resetQuoteRateLimit, type QuoteRow } from '../server/quotes'
import { signToken } from '../server/tenantAdmin'
import { demoTenant } from '../src/tenants/demo'
import { applyOverrides } from '../src/tenants/overrides'
import { tenantPrice } from '../src/tenants/rules'

const env = { ADMIN_TOKEN_SECRET: 'titok', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const authed = async (body: unknown) => new Request('https://t.test/api/admin-quotes', { method: 'POST', headers: { Authorization: `Bearer ${await signToken('titok', 'demo')}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const lead = (patch: Record<string, unknown> = {}) => ({ ref: 'DEMO-1', customer_name: 'Teszt Elek', email: 'teszt@example.com', phone: '+36 30 1', address: null, postal_code: '9600', city: 'Sárvár', region: 'Vas', config: demoTenant.defaultConfig, status: 'new', ...patch })

/** Ajánlat létrehozása mockolt Supabase-szel; visszaadja a beszúrt sort és a fetch-hívásokat. */
async function createQuote(overrides: unknown, body: Record<string, unknown>, leadRow = lead(), extraFetch?: (url: string, init?: RequestInit) => Response | undefined) {
  let inserted: QuoteRow | null = null
  const calls: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const extra = extraFetch?.(url, init)
    if (extra) return extra
    if (url.includes('/tenant_settings')) return json(overrides ? [{ tenant_id: 'demo', data: overrides }] : [])
    if (url.includes('/leads?') && init?.method === 'PATCH') return json({})
    if (url.includes('/leads?')) return json([leadRow])
    if (url.includes('/quotes') && init?.method === 'POST') { inserted = JSON.parse(init.body as string); return json([{ ...(inserted as object), id: 2, token: 'b'.repeat(32), created_at: new Date().toISOString() }]) }
    if (url.includes('/quotes')) return json([])
    return json({})
  }))
  const response = await handleAdminQuotes(await authed({ leadRef: 'DEMO-1', sendEmail: false, ...body }), env)
  return { response, inserted: inserted as QuoteRow | null, calls }
}

beforeEach(() => resetQuoteRateLimit())
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('ajánlat: a gyártó szerkesztett beállításaival számol', () => {
  it('hiba volt: az ajánlat a kódban lévő alapárakkal számolt, nem az adminban szerkesztett árakkal', async () => {
    const overrides = { prices: { louveredPerM2Net: demoTenant.prices.louveredPerM2Net * 2 } }
    const { response, inserted } = await createQuote(overrides, {})
    expect(response.status).toBe(200)
    const expected = tenantPrice(applyOverrides(demoTenant, overrides), demoTenant.defaultConfig)
    expect(inserted!.total_net).toBe(expected.totalNet)
    expect(inserted!.total_net).toBeGreaterThan(tenantPrice(demoTenant, demoTenant.defaultConfig).totalNet)
  })
})

import { createHmac } from 'node:crypto'
import { handleLeadRequest, resetLeadRateLimit } from '../server/lead'
import { handleWebhookTest, sendWebhook, signWebhook, webhookPayload } from '../server/webhook'
import { demoAtTenant } from '../src/tenants/demo-at'
import { parseOverrides, publicOverrides } from '../src/tenants/overrides'
import { applyRegionSurcharge, dealerPrices, discountFromPercent } from '../src/tenants/pricingRules'
import { isAllowedWebhookUrl } from '../src/tenants/crm'
import { calculatePrice } from '../src/lib/pricing'
import { presetConfig, roofLabels } from '../src/tenants/rules'

describe('árazási szabályok: számítás', () => {
  it('viszonteladói árrés: a pénzösszegek szorzódnak, az arányok (telepítés, ÁFA, színfelár) nem; az ármátrix is', () => {
    const prices = { ...demoAtTenant.prices, priceMatrix: { louvered: [{ width: 3, depth: 3, netPrice: 1000 }, { width: 6, depth: 5, netPrice: 3000 }] } }
    const scaled = dealerPrices(prices, 12, 'EUR')
    expect(scaled.louveredPerM2Net).toBe(Math.round(prices.louveredPerM2Net * 1.12))
    expect(scaled.vatRate).toBe(prices.vatRate)
    expect(scaled.installationRate).toBe(prices.installationRate)
    expect(scaled.customColorRate).toBe(prices.customColorRate)
    expect(scaled.priceMatrix!.louvered!.map((point) => point.netPrice)).toEqual([1120, 3360])
    expect(dealerPrices(prices, 0, 'EUR')).toBe(prices)
  })

  it('viszonteladói ár: a tételleírás egységára és az összeg egymással konzisztens (nem a végösszegre szorzunk)', () => {
    const price = tenantPrice(demoAtTenant, demoAtTenant.defaultConfig, demoAtTenant.prices, { dealerId: 'graz' })
    const direct = calculatePrice(demoAtTenant.defaultConfig, dealerPrices(demoAtTenant.prices, 12, 'EUR'), roofLabels(demoAtTenant), 'EUR')
    expect(price).toEqual(direct)
    const base = tenantPrice(demoAtTenant, demoAtTenant.defaultConfig)
    expect(price.totalNet / base.totalNet).toBeGreaterThan(1.1)
    expect(price.totalNet / base.totalNet).toBeLessThan(1.14)
    expect(price.lines.find((line) => line.id === 'structure')!.detail.replace(/\s/g, ' ')).toContain(`€ ${Math.round(420 * 1.12)}`)
    // Ismeretlen viszonteladó: gyártói ár.
    expect(tenantPrice(demoAtTenant, demoAtTenant.defaultConfig, demoAtTenant.prices, { dealerId: 'nincs' })).toEqual(base)
  })

  it('regionális felár: külön tétel, a telepítés nem nő, az ÁFA újraszámolódik; ismeretlen vagy felár nélküli régió: változatlan', () => {
    const base = tenantPrice(demoAtTenant, demoAtTenant.defaultConfig)
    const tirol = tenantPrice(demoAtTenant, demoAtTenant.defaultConfig, demoAtTenant.prices, { region: 'Tirol' })
    const line = tirol.lines.at(-1)!
    expect(line.id).toBe('regionSurcharge')
    expect(line.amountNet).toBe(390)
    expect(tirol.installationNet).toBe(base.installationNet)
    expect(tirol.totalNet).toBe(base.totalNet + 390)
    expect(tirol.totalNet).toBe(tirol.subtotalNet + tirol.installationNet)
    expect(tirol.vatNet).toBe(Math.round(tirol.totalNet * 0.2))
    expect(tirol.totalGross).toBe(tirol.totalNet + tirol.vatNet)
    expect(tenantPrice(demoAtTenant, demoAtTenant.defaultConfig, demoAtTenant.prices, { region: 'Wien' })).toEqual(base)
  })

  it('százalékos + fix felár, HUF-nál 1000 Ft-ra kerekítve', () => {
    const base = tenantPrice(demoTenant, demoTenant.defaultConfig)
    const rules = { regionSurcharges: { Vas: { percent: 5, net: 20_000 } } }
    const price = applyRegionSurcharge(base, rules, 'Vas', demoTenant.prices, 'HUF')
    const line = price.lines.at(-1)!
    expect(line.amountNet).toBe(Math.round((base.subtotalNet * 0.05 + 20_000) / 1000) * 1000)
    expect(line.detail).toContain('5%')
    expect(applyRegionSurcharge(base, rules, 'Zala', demoTenant.prices, 'HUF')).toBe(base)
  })

  it('százalékos engedmény: a nettó végösszegből, a pénznem lépcsőjére kerekítve, legfeljebb a végösszeg', () => {
    expect(discountFromPercent(10_000, 7.5, 'EUR')).toBe(750)
    expect(discountFromPercent(4_447_000, 10, 'HUF')).toBe(445_000)
    expect(discountFromPercent(1000, 150, 'EUR')).toBe(1000)
  })
})

describe('árazási szabályok és CRM: beállítások', () => {
  const valid = { pricingRules: { regionSurcharges: { Tirol: { net: 390 } }, dealers: [{ id: 'graz', name: 'Graz', marginPercent: 12, email: 'graz@example.com' }, { id: 'linz', name: 'Linz', marginPercent: 8 }] }, crm: { webhookUrl: 'https://hook.eu1.make.com/abc', secret: 's'.repeat(24), events: ['lead.created' as const] } }

  it('érvényes beállítás elfogadva; hibás viszonteladó-azonosító, ismétlődő azonosító, túl nagy felár elutasítva', () => {
    expect(parseOverrides(valid).ok).toBe(true)
    expect(parseOverrides({ pricingRules: { dealers: [{ id: 'Graz Süd', name: 'x', marginPercent: 5 }] } }).ok).toBe(false)
    expect(parseOverrides({ pricingRules: { dealers: [{ id: 'a', name: 'x', marginPercent: 5 }, { id: 'a', name: 'y', marginPercent: 6 }] } }).ok).toBe(false)
    expect(parseOverrides({ pricingRules: { regionSurcharges: { Tirol: { percent: 80 } } } }).ok).toBe(false)
  })

  it('CRM: csak nyilvános https cím és legalább 16 karakteres titok', () => {
    expect(parseOverrides({ crm: { webhookUrl: 'http://hook.example.com/x', secret: 's'.repeat(20) } }).ok).toBe(false)
    expect(parseOverrides({ crm: { webhookUrl: 'https://hook.example.com/x', secret: 'rovid' } }).ok).toBe(false)
    for (const url of ['https://localhost/x', 'https://127.0.0.1/x', 'https://10.0.0.5/x', 'https://192.168.1.2/x', 'https://169.254.169.254/latest', 'https://[::1]/x', 'https://db.internal/x', 'https://user:pw@hook.example.com/x', 'https://intranet/x'])
      expect(isAllowedWebhookUrl(url), url).toBe(false)
    for (const url of ['https://hook.eu1.make.com/abc', 'https://n8n.example.com/webhook/x', 'https://hooks.zapier.com/hooks/catch/1/abc'])
      expect(isAllowedWebhookUrl(url), url).toBe(true)
  })

  it('a böngészőbe nem kerül: CRM, lead-címzettek, viszonteladói e-mail, más viszonteladók', () => {
    const parsed = parseOverrides({ ...valid, lead: { recipients: ['titkos@example.com'] } })
    if (!parsed.ok) throw new Error(parsed.error)
    const anonymous = publicOverrides(parsed.data)
    expect(JSON.stringify(anonymous)).not.toMatch(/hook\.eu1|ssss|titkos@|graz@|"Linz"|"Graz"/)
    expect(anonymous.pricingRules?.regionSurcharges).toEqual({ Tirol: { net: 390 } })
    const graz = publicOverrides(parsed.data, 'graz')
    expect(graz.pricingRules?.dealers).toEqual([{ id: 'graz', name: 'Graz', marginPercent: 12 }])
    // 4.92: a nyilvános végpont (szerver) a felszorzott árlistát küldi, az árrés-százalék 0 – nem olvasható ki.
    const effective = applyOverrides(demoAtTenant, valid)
    const shared = publicOverrides(parsed.data, 'graz', (margin) => dealerPrices(effective.prices, margin, effective.currency))
    expect(shared.pricingRules?.dealers).toEqual([{ id: 'graz', name: 'Graz', marginPercent: 0 }])
    expect(JSON.stringify(shared)).not.toMatch(/"marginPercent":12/)
    const browser = applyOverrides(demoAtTenant, shared)
    const server = applyOverrides(demoAtTenant, valid)
    const config = presetConfig(server, {})
    expect(tenantPrice(browser, config, undefined, { dealerId: 'graz' }).totalGross).toBe(tenantPrice(server, config, undefined, { dealerId: 'graz' }).totalGross)
    expect(JSON.stringify(graz)).not.toMatch(/graz@|Linz|hook\.eu1/)
  })

  it('a ráfésült tenant tartalmazza a szabályokat és a CRM-et (szerveroldalon)', () => {
    const tenant = applyOverrides(demoAtTenant, valid)
    expect(tenant.pricingRules?.dealers?.[0].email).toBe('graz@example.com')
    expect(tenant.crm?.webhookUrl).toBe('https://hook.eu1.make.com/abc')
  })
})

describe('webhook: aláírás és kézbesítés', () => {
  const crm = { webhookUrl: 'https://hook.example.com/in', secret: 'k'.repeat(32) }

  it('HMAC-SHA256 aláírás: a fogadó Node-os ellenőrzése egyezik', async () => {
    const signature = await signWebhook(crm.secret, '1700000000', '{"a":1}')
    expect(signature).toBe('sha256=' + createHmac('sha256', crm.secret).update('1700000000.{"a":1}').digest('hex'))
  })

  it('fejlécek, törzs és ellenőrizhető aláírás; 2xx = siker', async () => {
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }))
    const payload = webhookPayload(demoAtTenant, 'test', { x: 1 })
    const result = await sendWebhook(crm, payload, fetchMock as unknown as typeof fetch)
    expect(result).toMatchObject({ ok: true, status: 200, attempts: 1 })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(url).toBe(crm.webhookUrl)
    expect(init.redirect).toBe('manual')
    expect(headers['X-Lamelix-Event']).toBe('test')
    expect(headers['X-Lamelix-Delivery']).toBe(payload.id)
    expect(headers['X-Lamelix-Signature']).toBe('sha256=' + createHmac('sha256', crm.secret).update(`${headers['X-Lamelix-Timestamp']}.${init.body}`).digest('hex'))
    expect(JSON.parse(String(init.body))).toMatchObject({ event: 'test', tenant: { id: 'demo-at' }, data: { x: 1 } })
  })

  it('5xx után egyszer újrapróbál; 4xx-nél nem; hálózati hibánál sem dob', async () => {
    const flaky = vi.fn().mockResolvedValueOnce(new Response('', { status: 502 })).mockResolvedValueOnce(new Response('', { status: 200 }))
    expect(await sendWebhook(crm, webhookPayload(demoAtTenant, 'test', {}), flaky as unknown as typeof fetch)).toMatchObject({ ok: true, attempts: 2 })
    const rejected = vi.fn(async () => new Response('', { status: 410 }))
    expect(await sendWebhook(crm, webhookPayload(demoAtTenant, 'test', {}), rejected as unknown as typeof fetch)).toMatchObject({ ok: false, status: 410, attempts: 1 })
    const broken = vi.fn(async () => { throw new Error('ECONNRESET') })
    const result = await sendWebhook(crm, webhookPayload(demoAtTenant, 'test', {}), broken as unknown as typeof fetch)
    expect(result).toMatchObject({ ok: false, attempts: 2 })
    expect(result.error).toContain('ECONNRESET')
  })

  it('belső címre nem küld', async () => {
    const fetchMock = vi.fn()
    expect(await sendWebhook({ ...crm, webhookUrl: 'https://169.254.169.254/x' }, webhookPayload(demoAtTenant, 'test', {}), fetchMock as unknown as typeof fetch)).toMatchObject({ ok: false, attempts: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('admin tesztküldés: token kell; a még nem mentett címre megy, minta-vevővel', async () => {
    expect((await handleWebhookTest(new Request('https://t.test/api/admin-webhook-test', { method: 'POST', body: '{}' }), env)).status).toBe(401)
    const sent: { url: string; body: string }[] = []
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => { sent.push({ url, body: String(init?.body) }); return new Response('', { status: 200 }) })
    vi.stubGlobal('fetch', vi.fn(async () => json([])))
    const request = new Request('https://t.test/api/admin-webhook-test', { method: 'POST', headers: { Authorization: `Bearer ${await signToken('titok', 'demo')}` }, body: JSON.stringify({ webhookUrl: 'https://hook.example.com/t', secret: 'x'.repeat(20) }) })
    const response = await handleWebhookTest(request, env, fetchImpl as unknown as typeof fetch)
    expect(response.status).toBe(200)
    expect(((await response.json()) as { result: { ok: boolean } }).result.ok).toBe(true)
    expect(sent[0].url).toBe('https://hook.example.com/t')
    expect(JSON.parse(sent[0].body)).toMatchObject({ event: 'test', data: { ref: 'TEST-0001' } })
    const bad = new Request('https://t.test/api/admin-webhook-test', { method: 'POST', headers: { Authorization: `Bearer ${await signToken('titok', 'demo')}` }, body: JSON.stringify({ webhookUrl: 'https://10.1.1.1/t', secret: 'x'.repeat(20) }) })
    expect((await handleWebhookTest(bad, env, fetchImpl as unknown as typeof fetch)).status).toBe(422)
  })
})

describe('lead végponttól végpontig: viszonteladó, régiós felár, CRM', () => {
  beforeEach(() => resetLeadRateLimit())
  const settings = { pricingRules: { regionSurcharges: { Tirol: { net: 390 } }, dealers: [{ id: 'graz', name: 'Händler Graz', marginPercent: 12, email: 'graz@example.com' }] }, crm: { webhookUrl: 'https://hook.example.com/lead', secret: 's'.repeat(24) }, lead: { recipients: ['gyarto@example.com'] } }

  async function send(body: Record<string, unknown>, opts: { failColumn?: string; hookStatus?: number } = {}) {
    const calls: { url: string; init?: RequestInit }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      if (url.includes('/tenant_settings')) return json([{ tenant_id: 'demo-at', data: settings }])
      if (url.includes('/rest/v1/leads') && opts.failColumn && String(init?.body).includes(opts.failColumn)) return new Response(`column "${opts.failColumn}" does not exist`, { status: 400 })
      if (url.includes('hook.example.com')) return new Response('', { status: opts.hookStatus ?? 200 })
      return json({})
    }))
    const payload = { tenantId: 'demo-at', config: demoAtTenant.defaultConfig, customer: { name: 'Max Muster', email: 'max@example.com', phone: '+43 664 1234567', postalCode: '6020', city: 'Innsbruck', region: 'Tirol', address: '', notes: '' }, consent: true, website: '', elapsedMs: 60_000, source: 'standalone', ...body }
    const response = await handleLeadRequest(new Request('https://t.test/api/lead', { method: 'POST', body: JSON.stringify(payload) }), { NODE_ENV: 'production', RESEND_API_KEY: 'r', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 's' })
    return { response, calls }
  }

  it('a szerver a viszonteladói árréssel és a tiroli felárral számol; a viszonteladó másolatot kap; a CRM aláírt eseményt kap', async () => {
    const { response, calls } = await send({ dealer: 'graz' })
    expect(response.status).toBe(200)
    const tenant = applyOverrides(demoAtTenant, settings)
    const expected = tenantPrice(tenant, demoAtTenant.defaultConfig, tenant.prices, { region: 'Tirol', dealerId: 'graz' })
    const stored = JSON.parse(String(calls.find((call) => call.url.includes('/rest/v1/leads'))!.init!.body))
    expect(stored).toMatchObject({ dealer_id: 'graz', estimate_net: expected.totalNet, estimate_gross: expected.totalGross })
    const manager = calls.map((call) => call.url.includes('resend') ? JSON.parse(String(call.init!.body)) : null).find((body) => body?.to?.includes('gyarto@example.com'))
    expect(manager.to).toEqual(['gyarto@example.com', 'graz@example.com'])
    expect(manager.subject).toContain('[Händler Graz]')
    expect(manager.html).toContain('Regionalzuschlag · Tirol')
    const hook = calls.find((call) => call.url === 'https://hook.example.com/lead')!
    const headers = hook.init!.headers as Record<string, string>
    expect(headers['X-Lamelix-Event']).toBe('lead.created')
    expect(headers['X-Lamelix-Signature']).toBe('sha256=' + createHmac('sha256', 's'.repeat(24)).update(`${headers['X-Lamelix-Timestamp']}.${hook.init!.body}`).digest('hex'))
    const event = JSON.parse(String(hook.init!.body))
    expect(event.data).toMatchObject({ dealer: { id: 'graz', name: 'Händler Graz' }, customer: { email: 'max@example.com', region: 'Tirol' }, price: { currency: 'EUR', gross: expected.totalGross } })
    expect(event.data.price.lines.some((line: { id: string }) => line.id === 'regionSurcharge')).toBe(true)
  })

  it('ismeretlen viszonteladó: gyártói ár, nincs dealer_id; a hibás webhook nem akasztja meg a leadet', async () => {
    const { response, calls } = await send({ dealer: 'nincs-ilyen' }, { hookStatus: 500 })
    expect(response.status).toBe(200)
    const stored = JSON.parse(String(calls.find((call) => call.url.includes('/rest/v1/leads'))!.init!.body))
    expect(stored.dealer_id).toBeUndefined()
    expect(calls.filter((call) => call.url.includes('hook.example.com'))).toHaveLength(2)
  })

  it('régi adatbázis `dealer_id` oszlop nélkül: a lead a viszonteladó nélkül is elmentődik', async () => {
    const { response, calls } = await send({ dealer: 'graz' }, { failColumn: 'dealer_id' })
    expect(response.status).toBe(200)
    const inserts = calls.filter((call) => call.url.includes('/rest/v1/leads') && call.init?.method === 'POST')
    expect(inserts).toHaveLength(2)
    expect(JSON.parse(String(inserts[1].init!.body)).dealer_id).toBeUndefined()
  })
})

describe('ajánlat: régió, viszonteladó, százalékos engedmény, CRM', () => {
  it('a lead régiójával és viszonteladójával számol; %-os engedmény; quote.sent webhook', async () => {
    const settings = { crm: { webhookUrl: 'https://hook.example.com/q', secret: 'q'.repeat(24) }, pricingRules: { regionSurcharges: { Vas: { net: 50_000 } }, dealers: [{ id: 'gyor', name: 'Győr', marginPercent: 10 }] } }
    const hooks: string[] = []
    const { response, inserted } = await createQuote(settings, { discountPercent: 10 }, lead({ dealer_id: 'gyor' }), (url, init) => {
      if (url.includes('hook.example.com')) { hooks.push(String(init?.body)); return new Response('', { status: 200 }) }
      return undefined
    })
    expect(response.status).toBe(200)
    const tenant = applyOverrides(demoTenant, settings)
    const price = tenantPrice(tenant, demoTenant.defaultConfig, tenant.prices, { region: 'Vas', dealerId: 'gyor' })
    const discount = Math.round(price.totalNet * 0.1 / 1000) * 1000
    expect(inserted!.discount_net).toBe(discount)
    expect(inserted!.total_net).toBe(price.totalNet - discount)
    expect(inserted!.price.lines.some((line) => line.id === 'regionSurcharge')).toBe(true)
    expect(JSON.parse(hooks[0])).toMatchObject({ event: 'quote.sent', data: { leadRef: 'DEMO-1', discountNet: discount, currency: 'HUF' } })
  })

  it('régi adatbázis `dealer_id` oszlop nélkül: az ajánlat nélküle olvassa a leadet', async () => {
    const { response, calls } = await createQuote(null, {}, lead(), (url) => (url.includes('/leads?') && url.includes('dealer_id') ? new Response('column leads.dealer_id does not exist', { status: 400 }) : undefined))
    expect(response.status).toBe(200)
    expect(calls.filter((call) => call.url.includes('/leads?') && !call.init?.method).length).toBe(2)
  })
})
