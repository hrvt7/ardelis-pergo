// Havi riport a gyártónak (időzített futás minden hónap 1-jén, GET /api/monthly-report).
//
// Az előző naptári hónapról: tölcsér (megnyitás → tervmódosítás → űrlap → kitöltés → felmérési kérelem),
// PDF / AR / megosztás, az érdeklődők száma, irányár-összege és mostani állapota, összevetve az azelőtti hónappal.
// Csak névtelen napi számlálók (tenant_events) és összesítések: név, e-mail, telefon nem kerül a levélbe.
// A konverzió becsült: eseményszámokból számolt arány, nem egyedi látogatók követése.
//
// `?dry=1`: felmér és visszaadja a számokat, nem küld. `?month=2026-10`: adott hónap (újraküldéshez, teszthez).
// Platformfüggetlen (Request → Response): Vercel cron (api/monthly-report.ts) és helyi dev-szerver is futtatja.
import { formatHuf } from '../src/lib/pricing'
import { computeFunnel, type EventRow } from '../src/lib/statsFunnel'
import { ROOF_INFO } from '../src/lib/roofs'
import { listTenantIds } from '../src/tenants'
import type { Tenant } from '../src/tenants/types'
import type { RoofType } from '../src/types/pergola'
import { escapeHtml, oneLine, sendEmail, siteOrigin, type LeadEnv } from './lead'
import { json, resolveTenant, storeConfigured, storeHeaders } from './tenantAdmin'

export interface MonthRange { key: string; from: string; to: string; label: string }

const MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december']

/** Egy hónap határai (YYYY-MM-DD, a `to` már a következő hónap első napja). `offset`: -1 = előző hónap. */
export function monthRange(now: Date, offset = -1, explicit?: string | null): MonthRange {
  let year: number
  let month: number
  const match = explicit && /^(\d{4})-(\d{2})$/.exec(explicit)
  if (match) { year = Number(match[1]); month = Number(match[2]) - 1 } else {
    const shifted = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
    year = shifted.getUTCFullYear(); month = shifted.getUTCMonth()
  }
  const iso = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10)
  return { key: iso(year, month).slice(0, 7), from: iso(year, month), to: iso(year, month + 1), label: `${year}. ${MONTHS[month]}` }
}

export const previousOf = (range: MonthRange): MonthRange => monthRange(new Date(`${range.from}T00:00:00Z`), -1)

export interface ReportLead { status: string; estimate_gross: number; config?: { roof?: string } | null }

export interface MonthlyReport {
  month: MonthRange
  funnel: ReturnType<typeof computeFunnel>
  extras: { pdf: number; ar: number; share: number }
  leads: { count: number; value: number; average: number; byStatus: Record<string, number>; topRoofs: [string, number][] }
  previous: { opens: number; leads: number }
}

const STATUS_LABELS: [string, string][] = [['new', 'Új (még nem kerestétek)'], ['contacted', 'Kapcsolatba léptetek'], ['offered', 'Ajánlat kiment'], ['won', 'Megnyert'], ['lost', 'Elveszett']]
const sum = (events: EventRow[], name: string) => events.filter((event) => event.name === name).reduce((total, event) => total + event.count, 0)

/** A riport számai (tiszta függvény: tesztelhető, adatbázis nélkül). */
export function buildReport(month: MonthRange, events: EventRow[], leads: ReportLead[], previousEvents: EventRow[], previousLeads: number): MonthlyReport {
  const value = leads.reduce((total, lead) => total + (lead.estimate_gross || 0), 0)
  const byStatus = Object.fromEntries(STATUS_LABELS.map(([key]) => [key, leads.filter((lead) => lead.status === key).length]))
  const roofs = new Map<string, number>()
  for (const lead of leads) if (lead.config?.roof) roofs.set(lead.config.roof, (roofs.get(lead.config.roof) ?? 0) + 1)
  return {
    month,
    funnel: computeFunnel(events, leads.length),
    extras: { pdf: sum(events, 'pdf'), ar: sum(events, 'ar'), share: sum(events, 'share') },
    leads: { count: leads.length, value, average: leads.length ? Math.round(value / leads.length) : 0, byStatus, topRoofs: [...roofs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3) },
    previous: { opens: sum(previousEvents, 'open'), leads: previousLeads },
  }
}

const pct = (value: number | null) => (value === null ? '—' : `${(value * 100).toFixed(1).replace('.', ',')}%`)
const delta = (now: number, before: number) => {
  if (before === 0) return now === 0 ? '' : ' (előző hónapban 0)'
  const change = Math.round(((now - before) / before) * 100)
  return ` (${change >= 0 ? '+' : '−'}${Math.abs(change)}% az előző hónaphoz)`
}

export function reportHtml(tenant: Tenant, report: MonthlyReport, adminUrl: string) {
  const roofName = (roof: string) => tenant.roofs[roof as RoofType]?.name ?? ROOF_INFO[roof as RoofType]?.name ?? roof
  const row = (label: string, value: string, strong = false) => `<tr><td style="padding:7px 0;color:#62727a;border-bottom:1px solid #edf1f1">${escapeHtml(label)}</td><td style="padding:7px 0;text-align:right;border-bottom:1px solid #edf1f1${strong ? ';font-weight:700' : ''}">${escapeHtml(value)}</td></tr>`
  const opens = report.funnel.steps[0].count
  const quiet = opens === 0 && report.leads.count === 0
  const funnelRows = report.funnel.steps.map((step) => row(step.label, `${step.count}${step.rate === null ? '' : ` · ${pct(step.rate)}`}`, step.key === 'lead')).join('')
  const statusRows = STATUS_LABELS.filter(([key]) => report.leads.byStatus[key]).map(([key, label]) => row(label, String(report.leads.byStatus[key]))).join('')
  const unanswered = report.leads.byStatus.new ?? 0
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#f1f4f4;font-family:Arial,Helvetica,sans-serif;color:#233039">
<div style="max-width:600px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:8px;padding:22px 26px">
<p style="font-size:12px;letter-spacing:1px;color:#62727a;margin:0 0 8px">${escapeHtml(tenant.brand.name.toUpperCase())} · HAVI RIPORT</p>
<h1 style="font-size:21px;margin:0 0 6px">${escapeHtml(report.month.label)}</h1>
${quiet ? '<p>Ebben a hónapban nem volt mérhető forgalom a konfigurátorban. Érdemes ellenőrizni, hogy a beágyazás vagy a „Tervezze meg” gomb kint van-e a weboldalon.</p>' : `
<p style="font-size:15px;margin:14px 0"><strong>${report.leads.count} felmérési kérelem</strong>${delta(report.leads.count, report.previous.leads)}, összesen <strong>${escapeHtml(formatHuf(report.leads.value))}</strong> bruttó irányárral${report.leads.count ? ` (átlag ${escapeHtml(formatHuf(report.leads.average))})` : ''}.</p>
<p style="margin:0 0 4px;font-size:13px;color:#62727a">Becsült konverzió (kérelem / megnyitás): <strong style="color:#233039">${pct(report.funnel.conversion)}</strong> · megnyitások: ${opens}${delta(opens, report.previous.opens)}</p>
${unanswered ? `<p style="margin:14px 0;padding:10px 12px;background:#fff6e5;border-radius:6px">⚠ ${unanswered} érdeklődő még „Új” állapotú, vagyis senki nem kereste. Érdemes ma felhívni őket.</p>` : ''}
<h2 style="font-size:15px;margin:20px 0 6px">Tölcsér</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${funnelRows}</table>
<h2 style="font-size:15px;margin:20px 0 6px">A vevők döntéstámogató eszközei</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${row('PDF-összefoglaló letöltés', String(report.extras.pdf))}${row('AR-nézet (a saját kertben)', String(report.extras.ar))}${row('Megosztás (kép, videó, összefoglaló)', String(report.extras.share))}</table>
${statusRows ? `<h2 style="font-size:15px;margin:20px 0 6px">A hónap érdeklődőinek állapota ma</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${statusRows}</table>` : ''}
${report.leads.topRoofs.length ? `<p style="margin:14px 0 0;font-size:13px;color:#62727a">Legtöbbet kért tetőrendszer: ${report.leads.topRoofs.map(([roof, count]) => `${escapeHtml(roofName(roof))} (${count})`).join(', ')}</p>` : ''}`}
<p style="margin:22px 0 6px"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#007fae;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">Gyártói admin megnyitása →</a></p>
<p style="font-size:11px;color:#8a979d;margin:16px 0 0">A számok névtelen napi számlálókból és az érdeklődők összesítéséből készülnek, személyes adat nélkül. Egy látogató több eseményt is kiválthat, ezért a konverzió becsült érték. A riport az admin Beállítások oldalán kikapcsolható.</p>
</div></div></body></html>`
}

async function rows<T>(env: LeadEnv, path: string): Promise<T[]> {
  const response = await fetch(`${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${path}`, { headers: storeHeaders(env), signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 200)}`)
  return (await response.json()) as T[]
}

const eventsFor = (env: LeadEnv, tenantId: string, range: MonthRange) => rows<EventRow>(env, `tenant_events?tenant_id=eq.${encodeURIComponent(tenantId)}&day=gte.${range.from}&day=lt.${range.to}&select=day,name,count&limit=5000`)
const leadsFor = (env: LeadEnv, tenantId: string, range: MonthRange) => rows<ReportLead>(env, `leads?tenant_id=eq.${encodeURIComponent(tenantId)}&created_at=gte.${range.from}&created_at=lt.${range.to}&select=status,estimate_gross,config&limit=2000`)

export interface MonthlyRunReport { ok: true; dryRun: boolean; month: string; sent: string[]; skipped: string[]; failed: string[]; numbers?: Record<string, { opens: number; leads: number; conversion: number | null }> }

/** GET /api/monthly-report — csak a CRON_SECRET-tel. `?dry=1`: nem küld. `?month=YYYY-MM`: adott hónap. `?tenant=id`: csak egy gyártó. */
export async function handleMonthlyReport(request: Request, env: LeadEnv, now = new Date()): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') return json(405, { ok: false, error: 'Nem engedélyezett metódus.' })
  if (!env.CRON_SECRET) return json(503, { ok: false, error: 'A CRON_SECRET nincs beállítva, a havi riport nem fut.' })
  if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) return json(401, { ok: false, error: 'Nincs jogosultság.' })
  if (!storeConfigured(env)) return json(503, { ok: false, error: 'Az adattár (Supabase) nincs beállítva.' })
  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dry') === '1'
  if (!dryRun && !env.RESEND_API_KEY) return json(503, { ok: false, error: 'A RESEND_API_KEY nincs beállítva, e-mail nem küldhető.' })
  const month = monthRange(now, -1, url.searchParams.get('month'))
  const previous = previousOf(month)
  const only = url.searchParams.get('tenant')
  const origin = siteOrigin(request, env)
  const result: MonthlyRunReport = { ok: true, dryRun, month: month.key, sent: [], skipped: [], failed: [], numbers: {} }

  for (const id of listTenantIds().filter((item) => !only || item === only)) {
    try {
      const tenant = await resolveTenant(env, id)
      const recipients = tenant ? (tenant.lead.recipients.length ? tenant.lead.recipients : (env.LEAD_FALLBACK_EMAIL ?? '').split(',').map((item) => item.trim()).filter(Boolean)) : []
      if (!tenant || tenant.lead.monthlyReport === false || recipients.length === 0) { result.skipped.push(id); continue }
      const [events, leads, previousEvents, previousLeads] = await Promise.all([eventsFor(env, id, month), leadsFor(env, id, month), eventsFor(env, id, previous), leadsFor(env, id, previous)])
      const report = buildReport(month, events, leads, previousEvents, previousLeads.length)
      result.numbers![id] = { opens: report.funnel.steps[0].count, leads: report.leads.count, conversion: report.funnel.conversion }
      if (dryRun) { result.sent.push(id); continue }
      await sendEmail(env, {
        to: recipients,
        subject: oneLine(`${tenant.lead.subjectPrefix} Havi riport – ${month.label}: ${report.leads.count} felmérési kérelem`),
        html: reportHtml(tenant, report, `${origin}/k/${tenant.id}/admin`),
      })
      result.sent.push(id)
    } catch (error) {
      console.error('[monthly-report] Sikertelen', id, error)
      result.failed.push(id)
    }
  }
  return json(200, result)
}
