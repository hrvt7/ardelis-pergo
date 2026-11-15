import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildReport, handleMonthlyReport, monthRange, previousOf, reportHtml, type MonthlyRunReport } from '../server/monthlyReport'
import { demoTenant } from '../src/tenants/demo'

const NOW = new Date('2026-12-01T06:00:00Z')
const env = { CRON_SECRET: 'cron-titok', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 're', LEAD_FALLBACK_EMAIL: 'gyarto@pelda.hu', PUBLIC_SITE_URL: 'https://lamelix.vercel.app' }
const request = (auth = 'Bearer cron-titok', query = '') => new Request(`https://a.test/api/monthly-report${query}`, { headers: auth ? { authorization: auth } : {} })

const EVENTS = [{ day: '2026-11-03', name: 'open', count: 120 }, { day: '2026-11-04', name: 'open', count: 80 }, { day: '2026-11-04', name: 'configure', count: 90 }, { day: '2026-11-05', name: 'lead_view', count: 30 }, { day: '2026-11-05', name: 'lead_start', count: 12 }, { day: '2026-11-06', name: 'pdf', count: 18 }, { day: '2026-11-06', name: 'ar', count: 7 }, { day: '2026-11-07', name: 'share', count: 5 }]
const LEADS = [
  { status: 'new', estimate_gross: 4_000_000, config: { roof: 'louvered' } },
  { status: 'won', estimate_gross: 6_000_000, config: { roof: 'louvered' } },
  { status: 'contacted', estimate_gross: 5_000_000, config: { roof: 'glass' } },
  { status: 'new', estimate_gross: 3_000_000, config: { roof: 'fabric' } },
]

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('havi riport', () => {
  it('az előző naptári hónapot veszi (évváltáskor is); kézzel megadott hónap is működik', () => {
    expect(monthRange(NOW)).toMatchObject({ key: '2026-11', from: '2026-11-01', to: '2026-12-01', label: '2026. november' })
    expect(monthRange(new Date('2027-01-01T06:00:00Z'))).toMatchObject({ key: '2026-12', from: '2026-12-01', to: '2027-01-01' })
    expect(previousOf(monthRange(NOW)).key).toBe('2026-10')
    expect(monthRange(NOW, -1, '2026-10').key).toBe('2026-10')
  })

  it('tölcsér, becsült konverzió, összeg, átlag, állapotok és tetők', () => {
    const report = buildReport(monthRange(NOW), EVENTS, LEADS, [{ day: '2026-10-10', name: 'open', count: 100 }], 2)
    expect(report.funnel.steps.map((step) => step.count)).toEqual([200, 90, 30, 12, 4])
    expect(report.funnel.conversion).toBeCloseTo(0.02)
    expect(report.extras).toEqual({ pdf: 18, ar: 7, share: 5 })
    expect(report.leads).toMatchObject({ count: 4, value: 18_000_000, average: 4_500_000 })
    expect(report.leads.byStatus).toMatchObject({ new: 2, won: 1, contacted: 1 })
    expect(report.leads.topRoofs[0]).toEqual(['louvered', 2])
    expect(report.previous).toEqual({ opens: 100, leads: 2 })
  })

  it('a levél „becsült” konverziót mond, jelzi a meg nem keresett érdeklődőket, és nincs benne személyes adat', () => {
    const html = reportHtml(demoTenant, buildReport(monthRange(NOW), EVENTS, LEADS, [], 2), 'https://lamelix.vercel.app/k/demo/admin')
    expect(html).toContain('Becsült konverzió')
    expect(html).toContain('2,0%')
    expect(html).toContain('4 felmérési kérelem')
    expect(html).toContain('+100% az előző hónaphoz')
    expect(html).toContain('2 érdeklődő még „Új”')
    expect(html).toContain('személyes adat nélkül')
    expect(html).not.toMatch(/@|\+36/)
  })

  it('csendes hónap: nem mutat üres táblát, hanem a beágyazás ellenőrzését javasolja', () => {
    const html = reportHtml(demoTenant, buildReport(monthRange(NOW), [], [], [], 0), 'https://x/admin')
    expect(html).toContain('nem volt mérhető forgalom')
  })

  it('csak a cron-titokkal fut; próbafutás nem küld; éles futás a gyártói címzetteknek küld', async () => {
    const calls: { url: string; body?: { to: string[]; subject: string; html: string } }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      if (url.includes('tenant_settings')) return new Response('[]', { status: 200 })
      if (url.includes('tenant_events')) return new Response(JSON.stringify(url.includes('2026-11-01') ? EVENTS : []), { status: 200 })
      if (url.includes('/rest/v1/leads')) return new Response(JSON.stringify(url.includes('2026-11-01') ? LEADS : []), { status: 200 })
      if (url.includes('api.resend.com')) return new Response('{}', { status: 200 })
      return new Response('nem várt hívás', { status: 500 })
    }))
    expect((await handleMonthlyReport(request('Bearer rossz'), env, NOW)).status).toBe(401)
    expect((await handleMonthlyReport(request(), { ...env, CRON_SECRET: undefined }, NOW)).status).toBe(503)

    const dry = (await (await handleMonthlyReport(request('Bearer cron-titok', '?dry=1'), env, NOW)).json()) as MonthlyRunReport
    expect(dry.sent).toContain('demo')
    expect(dry.numbers!.demo).toMatchObject({ opens: 200, leads: 4 })
    expect(calls.some((call) => call.url.includes('resend'))).toBe(false)

    const live = (await (await handleMonthlyReport(request(), env, NOW)).json()) as MonthlyRunReport
    expect(live.month).toBe('2026-11')
    const mail = calls.find((call) => call.url.includes('resend'))!.body!
    expect(mail.to).toEqual(['gyarto@pelda.hu'])
    expect(mail.subject).toContain('Havi riport – 2026. november: 4 felmérési kérelem')
  })

  it('a gyártó kikapcsolhatja: ekkor nem megy levél', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('tenant_settings')) return new Response(JSON.stringify([{ data: { lead: { monthlyReport: false } } }]), { status: 200 })
      if (url.includes('api.resend.com')) throw new Error('nem küldhet')
      return new Response('[]', { status: 200 })
    }))
    const run = (await (await handleMonthlyReport(request(), env, NOW)).json()) as MonthlyRunReport
    expect(run.skipped).toContain('demo')
    expect(run.sent).toEqual([])
  })
})
