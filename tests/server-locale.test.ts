import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleLeadRequest, resetLeadRateLimit } from '../server/lead'
import { handleQuote, quoteHash, resetQuoteRateLimit, type QuoteRow } from '../server/quotes'
import { customerFollowUpHtml, ownerReminderHtml, type FollowUpLead } from '../server/followup'
import { demoTenant } from '../src/tenants/demo'
import { demoAtTenant } from '../src/tenants/demo-at'
import { withLocale } from '../src/i18n/locale'
import { tenantPrice } from '../src/tenants/rules'

// Magyar ékezetek, amelyek németben nem fordulnak elő.
const HUNGARIAN = /[áéíóőúűÁÉÍÓŐÚŰ]/
const visible = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')

const ENV = { NODE_ENV: 'production', RESEND_API_KEY: 'k', LEAD_FALLBACK_EMAIL: 'gyarto@example.com', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 's' }

function leadBody(tenant: typeof demoTenant, customer: Record<string, string>) {
  return { tenantId: tenant.id, config: { ...tenant.defaultConfig, heaters: 1, fans: 1, mount: 'corner-left' }, customer: { address: '', notes: '', ...customer }, consent: true, website: '', elapsedMs: 60_000, source: 'demo' }
}

async function sendLead(payload: unknown) {
  const calls: { url: string; body: Record<string, unknown> }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) })
    return new Response('{}', { status: 200 })
  }))
  const response = await handleLeadRequest(new Request('https://example.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }), ENV)
  const mail = (to: string) => calls.find((call) => call.url.includes('resend') && (call.body.to as string[])[0] === to)!.body
  return { response, mail }
}

beforeEach(() => { resetLeadRateLimit(); resetQuoteRateLimit() })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('szerver: a gyártó nyelvén', () => {
  it('osztrák gyártó: a gyártói és a vevői e-mail németül, euróban, magyar szöveg nélkül', async () => {
    const { response, mail } = await sendLead(leadBody(demoAtTenant, { name: 'Max Muster', email: 'max@example.com', phone: '+43 664 1234567', postalCode: '8010', city: 'Graz', region: 'Steiermark' }))
    expect(response.status).toBe(200)
    const manager = mail('gyarto@example.com')
    const customer = mail('max@example.com')
    for (const html of [String(manager.html), String(customer.html)]) {
      expect(html).toContain('lang="de"')
      expect(visible(html)).not.toMatch(HUNGARIAN)
      expect(html).toContain('€')
    }
    expect(String(manager.html)).toContain('Seitliche Wandbefestigung')
    expect(String(customer.subject)).toContain('Aufmaß-Anfrage')
  })

  it('magyar gyártó: változatlanul magyar', async () => {
    const { response, mail } = await sendLead(leadBody(demoTenant, { name: 'Teszt Elek', email: 'teszt@example.com', phone: '+36 30 123 4567', postalCode: '9600', city: 'Sárvár', region: 'Vas' }))
    expect(response.status).toBe(200)
    expect(String(mail('gyarto@example.com').html)).toContain('Oldalfali rögzítés')
    expect(String(mail('teszt@example.com').subject)).toContain('megkaptuk a felmérési kérelmedet')
  })

  it('osztrák gyártó hibaüzenete németül (rossz tartomány)', async () => {
    const { response } = await sendLead(leadBody(demoAtTenant, { name: 'Max Muster', email: 'max@example.com', phone: '+43 664 1234567', postalCode: '8010', city: 'Graz', region: 'Vas' }))
    expect(response.status).toBe(422)
    expect(((await response.json()) as { error: string }).error).toBe('Bitte wählen Sie ein Bundesland aus der Liste.')
  })

  it('a szerver nyelve kérés után visszaáll magyarra (nem szivárog át a következő gyártóhoz)', () => {
    const de = withLocale('de', () => tenantPrice(demoAtTenant, { ...demoAtTenant.defaultConfig, mount: 'corner-left' }))
    const hu = tenantPrice(demoTenant, { ...demoTenant.defaultConfig, mount: 'corner-left' })
    expect(de.lines.map((line) => line.label).join(' ')).toContain('Seitliche Wandbefestigung')
    expect(hu.lines.map((line) => line.label).join(' ')).toContain('Oldalfali rögzítés')
  })

  it('ajánlatoldal: osztrák gyártónál német specifikáció, nyelv és pénznem a válaszban', async () => {
    const config = demoAtTenant.defaultConfig
    const price = withLocale('de', () => tenantPrice(demoAtTenant, config))
    const base = {
      id: 1, tenant_id: 'demo-at', number: 'AT-2026-0001', version: 1, token: 'b'.repeat(32), lead_ref: 'AT-1', status: 'sent' as const,
      customer_name: 'Max Muster', customer_email: 'max@example.com', customer_phone: '+43 664 1234567', customer_address: '8010 Graz',
      config, price, total_net: price.totalNet, total_gross: price.totalGross, discount_net: 0, deposit_percent: 30,
      deposit_gross: Math.round(price.totalGross * 0.3), valid_until: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      note: null, payment_info: null, terms: null, doc_hash: '', view_count: 0, first_viewed_at: null, last_viewed_at: null,
      accepted_at: null, signer_name: null, declined_at: null, decline_reason: null, created_at: new Date().toISOString(),
    } as QuoteRow
    const stored = { ...base, doc_hash: await quoteHash(base) }
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init?.method === 'PATCH' ? [{ ...stored, view_count: 1 }] : [stored]), { status: 200 })))
    const response = await handleQuote(new Request(`https://t.test/api/quote?t=${'b'.repeat(32)}`), { ADMIN_TOKEN_SECRET: 'titok', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
    expect(response.status).toBe(200)
    const { quote } = await response.json() as { quote: { locale: string; currency: string; spec: [string, string][]; lines: { label: string }[] } }
    expect(quote.locale).toBe('de')
    expect(quote.currency).toBe('EUR')
    expect(quote.spec.flat().filter((text) => HUNGARIAN.test(text))).toEqual([])
    expect(quote.lines.map((line) => line.label).filter((text) => HUNGARIAN.test(text))).toEqual([])
  })

  it('utánkövetés: osztrák gyártónál a vevői emlékeztető és a gyártói jelzés németül', () => {
    const lead = { ref: 'AT-1', tenant_id: 'demo-at', customer_name: 'Max Muster', email: 'max@example.com', phone: '+43 664 1234567', city: 'Graz', estimate_gross: 13578, config_url: 'https://example.test/k/demo-at', created_at: new Date(Date.now() - 8 * 86_400_000).toISOString(), notes: null, address: null, engagement: null } as unknown as FollowUpLead
    const customer = customerFollowUpHtml(demoAtTenant, lead, {})
    const owner = ownerReminderHtml(demoAtTenant, [lead], new Date(), 'https://example.test/k/demo-at/admin')
    for (const html of [customer, owner]) expect(visible(html)).not.toMatch(HUNGARIAN)
    expect(customer).toContain('Ihr Pergola-Entwurf wartet auf Sie')
    expect(owner).toContain('wartet seit 8 Tagen')
  })
})
