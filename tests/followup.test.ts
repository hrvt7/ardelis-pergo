import { afterEach, describe, expect, it, vi } from 'vitest'
import { CUSTOMER_AFTER_DAYS, handleFollowUp, OWNER_AFTER_DAYS, type FollowUpLead, type FollowUpReport } from '../server/followup'
import { applyOverrides } from '../src/tenants/overrides'
import { demoTenant } from '../src/tenants/demo'

const DAY = 86_400_000
const NOW = new Date('2026-11-08T07:00:00Z')
const env = { CRON_SECRET: 'cron-titok', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 're', LEAD_FALLBACK_EMAIL: 'gyarto@pelda.hu', PUBLIC_SITE_URL: 'https://lamelix.vercel.app' }
const request = (auth = 'Bearer cron-titok', query = '') => new Request(`https://a.test/api/followup${query}`, { headers: auth ? { authorization: auth } : {} })

const lead = (patch: Partial<FollowUpLead> = {}): FollowUpLead => ({
  ref: 'DEMO-20261104-ABC123', tenant_id: 'demo', customer_name: 'Kiss Béla', email: 'bela@example.com', phone: '+36 30 111 2222', city: 'Sárvár',
  notes: null, address: null, estimate_gross: 3_200_000, config_url: 'https://lamelix.vercel.app/k/demo#abc', status: 'new',
  created_at: new Date(NOW.getTime() - (CUSTOMER_AFTER_DAYS + 1) * DAY).toISOString(), ...patch,
})

interface Call { url: string; method: string; body?: Record<string, unknown> }

/** Supabase + Resend álválasz: a leads lekérdezések sorban kapják a megadott listákat, a foglalás (PATCH) az adott választ. */
function mockFetch(options: { customerDue?: FollowUpLead[]; ownerDue?: FollowUpLead[]; claimRows?: unknown[]; overrides?: unknown }) {
  const calls: Call[] = []
  const lists = [options.customerDue ?? [], options.ownerDue ?? []]
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined })
    if (url.includes('/rest/v1/tenant_settings')) return new Response(JSON.stringify(options.overrides ? [{ data: options.overrides }] : []), { status: 200 })
    if (url.includes('/rest/v1/leads') && method === 'GET') return new Response(JSON.stringify(lists.shift() ?? []), { status: 200 })
    if (url.includes('/rest/v1/leads') && method === 'PATCH') return new Response(JSON.stringify(options.claimRows ?? [{ ref: 'x' }]), { status: 200 })
    if (url.includes('api.resend.com')) return new Response('{}', { status: 200 })
    return new Response('nem várt hívás', { status: 500 })
  }))
  return calls
}

const emails = (calls: Call[]) => calls.filter((call) => call.url.includes('api.resend.com')).map((call) => call.body as { to: string[]; subject: string; html: string; reply_to?: string })
const claims = (calls: Call[]) => calls.filter((call) => call.method === 'PATCH')

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('automatikus utánkövetés', () => {
  it('csak a cron-titokkal fut; titok vagy adattár nélkül nem', async () => {
    const calls = mockFetch({})
    expect((await handleFollowUp(request('Bearer rossz'), env, NOW)).status).toBe(401)
    expect((await handleFollowUp(request(''), env, NOW)).status).toBe(401)
    expect((await handleFollowUp(request(), { ...env, CRON_SECRET: undefined }, NOW)).status).toBe(503)
    expect((await handleFollowUp(request(), { ...env, SUPABASE_URL: undefined }, NOW)).status).toBe(503)
    expect((await handleFollowUp(request(), { ...env, RESEND_API_KEY: undefined }, NOW)).status).toBe(503)
    expect(calls).toHaveLength(0)
  })

  it('3 nap után a vevő egyetlen emlékeztetőt kap a 3D-linkjével és időpontkérés gombbal — előbb foglalás, aztán küldés', async () => {
    const calls = mockFetch({ customerDue: [lead()] })
    const response = await handleFollowUp(request(), env, NOW)
    expect(response.status).toBe(200)
    const report = (await response.json()) as FollowUpReport
    expect(report.customers.sent).toEqual(['DEMO-20261104-ABC123'])

    // Lekérdezés: csak nyitott, még nem emlékeztetett, 3–14 napos leadek.
    const query = calls.find((call) => call.url.includes('/rest/v1/leads') && call.method === 'GET')!.url
    expect(query).toContain('status=in.(new,contacted)')
    expect(query).toContain('followup_sent_at=is.null')
    expect(query).toContain('created_at=lte.')
    expect(query).toContain('created_at=gte.')

    // Foglalás csak üres oszlopra, a küldés előtt.
    const claim = claims(calls)[0]
    expect(claim.url).toContain('followup_sent_at=is.null')
    expect(claim.url).toContain('tenant_id=eq.demo')
    expect(claim.body).toEqual({ followup_sent_at: NOW.toISOString() })
    expect(calls.indexOf(claim)).toBeLessThan(calls.findIndex((call) => call.url.includes('api.resend.com')))

    const [mail] = emails(calls)
    expect(mail.to).toEqual(['bela@example.com'])
    expect(mail.subject).toContain('a pergolaterved még vár rád')
    expect(mail.html).toContain('https://lamelix.vercel.app/k/demo#abc')
    expect(mail.html).toContain('Időpontot kérek')
    expect(mail.html).toContain('mailto:gyarto@pelda.hu?subject=')
    expect(mail.html).toContain(encodeURIComponent('DEMO-20261104-ABC123'))
    expect(mail.html).toContain('Ez az egyetlen emlékeztető')
    expect(mail.reply_to).toBe('gyarto@pelda.hu')
  })

  it('ha a foglalást egy másik futás már megnyerte, nem küld újra', async () => {
    const calls = mockFetch({ customerDue: [lead()], claimRows: [] })
    const report = (await (await handleFollowUp(request(), env, NOW)).json()) as FollowUpReport
    expect(report.customers.skipped).toEqual(['DEMO-20261104-ABC123'])
    expect(emails(calls)).toHaveLength(0)
  })

  it('7 nap után a gyártó egy összesítőt kap a válasz nélküli „Új” leadekről, pontszámmal és telefonnal', async () => {
    const old = (ref: string, name: string) => lead({ ref, customer_name: name, created_at: new Date(NOW.getTime() - (OWNER_AFTER_DAYS + 2) * DAY).toISOString(), engagement: { pdf: true, visits: 2 } })
    const calls = mockFetch({ ownerDue: [old('DEMO-1', 'Nagy Anna'), old('DEMO-2', 'Tóth Géza')] })
    const report = (await (await handleFollowUp(request(), env, NOW)).json()) as FollowUpReport
    expect(report.owners.sent).toEqual(['DEMO-1', 'DEMO-2'])
    expect(claims(calls).map((call) => call.body)).toEqual([{ reminder_sent_at: NOW.toISOString() }, { reminder_sent_at: NOW.toISOString() }])
    const [mail] = emails(calls)
    expect(mail.to).toEqual(['gyarto@pelda.hu'])
    expect(mail.subject).toContain('2 érdeklődő egy hete válasz nélkül')
    expect(mail.html).toContain('Nagy Anna')
    expect(mail.html).toContain('Tóth Géza')
    expect(mail.html).toContain('9 napja vár')
    expect(mail.html).toContain('tel:+36301112222')
    expect(mail.html).toContain('Meleg · 40')
    expect(mail.html).toContain('https://lamelix.vercel.app/k/demo/admin')
  })

  it('a gyártó kikapcsolhatja: ekkor sem vevői, sem gyártói levél nem megy', async () => {
    const calls = mockFetch({ customerDue: [lead()], ownerDue: [lead({ ref: 'DEMO-9', created_at: new Date(NOW.getTime() - 8 * DAY).toISOString() })], overrides: { lead: { followUp: false } } })
    const report = (await (await handleFollowUp(request(), env, NOW)).json()) as FollowUpReport
    expect(report.customers.skipped).toEqual(['DEMO-20261104-ABC123'])
    expect(report.owners.skipped).toEqual(['DEMO-9'])
    expect(claims(calls)).toHaveLength(0)
    expect(emails(calls)).toHaveLength(0)
  })

  it('próbafutás (?dry=1): felmér, de nem ír és nem küld', async () => {
    const calls = mockFetch({ customerDue: [lead()] })
    const report = (await (await handleFollowUp(request('Bearer cron-titok', '?dry=1'), env, NOW)).json()) as FollowUpReport
    expect(report.dryRun).toBe(true)
    expect(report.customers.sent).toEqual(['DEMO-20261104-ABC123'])
    expect(claims(calls)).toHaveLength(0)
    expect(emails(calls)).toHaveLength(0)
  })

  it('ismeretlen tenant leadje kimarad, a futás nem áll le', async () => {
    const calls = mockFetch({ customerDue: [lead({ ref: 'X-1', tenant_id: 'nincs-ilyen' }), lead()] })
    const report = (await (await handleFollowUp(request(), env, NOW)).json()) as FollowUpReport
    expect(report.customers.skipped).toEqual(['X-1'])
    expect(report.customers.sent).toEqual(['DEMO-20261104-ABC123'])
    expect(emails(calls)).toHaveLength(1)
  })

  it('utánkövetés-beállítás: alapból bekapcsolva, felülírással kikapcsolható', () => {
    expect(applyOverrides(demoTenant, {}).lead.followUp).toBe(true)
    expect(applyOverrides(demoTenant, { lead: { followUp: false } }).lead.followUp).toBe(false)
  })
})
