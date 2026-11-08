// Automatikus utánkövetés (napi időzített futás, GET /api/followup).
//
// A legtöbb érdeklődő a csendben vész el: a gyártó nem ér rá visszahívni, a vevő elfelejti.
// Ez a feladat két dolgot tesz a gyártó helyett, mindkettőt egyszer, érdeklődőnként:
// 1. VEVŐI EMLÉKEZTETŐ — 3 nappal a kérelem után, ha a lead még „Új” vagy „Kapcsolatba léptünk”:
//    egyetlen e-mail a saját 3D-tervének linkjével és „Időpontot kérek” gombbal.
// 2. GYÁRTÓI JELZÉS — 7 nap után, ha a lead még mindig „Új” (senki nem nyúlt hozzá):
//    összesítő a gyártói címzetteknek a válasz nélkül maradt érdeklődőkről.
//
// Dupla küldés ellen: előbb „lefoglaljuk” a leadet (PATCH, csak ha a dátumoszlop még üres), és
// csak a sikeres foglalás után küldünk. Így két egyidejű futás sem küld kétszer.
// A bevezetéskor régi leadeket nem keresünk meg: csak a megadott ablakon belülieket.
// Platformfüggetlen (Request → Response): Vercel cron (api/followup.ts) és helyi dev-szerver is futtatja.
import { formatHuf } from '../src/lib/pricing'
import { scoreLead, TIER_LABELS, type LeadEngagement } from '../src/lib/leadScore'
import type { Tenant } from '../src/tenants/types'
import { escapeHtml, oneLine, sendEmail, siteOrigin, type LeadEnv } from './lead'
import { json, resolveTenant, storeConfigured, storeHeaders } from './tenantAdmin'

const DAY = 86_400_000
/** Vevői emlékeztető: ennyi nap után… */
export const CUSTOMER_AFTER_DAYS = 3
/** …és legfeljebb ennyi napos leadnek (bevezetéskor ne kapjon régi érdeklődő váratlan levelet). */
export const CUSTOMER_UNTIL_DAYS = 14
export const OWNER_AFTER_DAYS = 7
export const OWNER_UNTIL_DAYS = 28
const BATCH = 30

export interface FollowUpLead {
  ref: string
  tenant_id: string
  customer_name: string
  email: string
  phone: string
  city: string
  notes: string | null
  address: string | null
  estimate_gross: number
  config_url: string
  status: string
  created_at: string
  engagement?: LeadEngagement | null
}

const COLUMNS = 'ref,tenant_id,customer_name,email,phone,city,notes,address,estimate_gross,config_url,status,created_at'

const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY).toISOString()

async function dueLeads(env: LeadEnv, filter: string): Promise<FollowUpLead[]> {
  const base = `${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/leads`
  const list = (columns: string) => fetch(`${base}?${filter}&select=${columns}&order=created_at.asc&limit=${BATCH}`, { headers: storeHeaders(env), signal: AbortSignal.timeout(8000) })
  let response = await list(`${COLUMNS},engagement`)
  if (response.status === 400) response = await list(COLUMNS)
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 200)}`)
  return (await response.json()) as FollowUpLead[]
}

/** Lefoglalja a leadet (a dátumoszlop kitöltése, csak ha még üres). Igaz, ha ez a futás nyerte el. */
async function claim(env: LeadEnv, lead: FollowUpLead, column: 'followup_sent_at' | 'reminder_sent_at', now: Date) {
  const base = `${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/leads`
  const response = await fetch(`${base}?ref=eq.${encodeURIComponent(lead.ref)}&tenant_id=eq.${encodeURIComponent(lead.tenant_id)}&${column}=is.null`, {
    method: 'PATCH',
    headers: { ...storeHeaders(env), Prefer: 'return=representation' },
    body: JSON.stringify({ [column]: now.toISOString() }),
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 200)}`)
  const rows = (await response.json()) as unknown[]
  return rows.length > 0
}

const tel = (phone: string) => phone.replace(/[^+0-9]/g, '')

/** A gyártó kapcsolati címe a vevő felé: a márka e-mailje, ennek híján az első lead-címzett. */
function contactEmail(tenant: Tenant, env: LeadEnv) {
  return tenant.brand.email || tenant.lead.recipients[0] || (env.LEAD_FALLBACK_EMAIL ?? '').split(',')[0]?.trim() || ''
}

export function customerFollowUpHtml(tenant: Tenant, lead: FollowUpLead, env: LeadEnv) {
  const to = contactEmail(tenant, env)
  const subject = encodeURIComponent(`Időpontkérés – ${lead.ref}`)
  const body = encodeURIComponent(`Kedves ${tenant.brand.name}!\n\nSzeretnék helyszíni felmérési időpontot egyeztetni a(z) ${lead.ref} számú pergolatervemhez.\nNekem megfelelő időpontok: \n\nÜdvözlettel,\n${lead.customer_name}`)
  const button = (href: string, label: string) => `<a href="${escapeHtml(href)}" style="display:inline-block;background:#007fae;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(label)}</a>`
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#f1f4f4;font-family:Arial,Helvetica,sans-serif;color:#233039">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:8px;padding:20px 24px">
<p style="font-size:12px;letter-spacing:1px;color:#62727a;margin:0 0 8px">${escapeHtml(tenant.brand.name.toUpperCase())} · ${escapeHtml(lead.ref)}</p>
<h1 style="font-size:20px;margin:0 0 12px">A pergolaterved még vár rád</h1>
<p>Kedves ${escapeHtml(lead.customer_name)}!</p>
<p>Néhány napja felmérést kértél a(z) ${escapeHtml(tenant.brand.name)} csapatától egy ${escapeHtml(formatHuf(lead.estimate_gross))} bruttó irányárú pergolára (${escapeHtml(lead.city)}). A 3D-terved bármikor megnyitható és továbbformálható:</p>
<p><a href="${escapeHtml(lead.config_url)}" style="color:#007fae">A konfigurációm megnyitása →</a></p>
<p>Ha szeretnéd, egyeztessünk egy helyszíni felmérési időpontot – ez kötelezettség nélküli, és ekkor készül a pontos árajánlat.</p>
<p style="margin:20px 0">${to ? button(`mailto:${to}?subject=${subject}&body=${body}`, 'Időpontot kérek') : ''}${tenant.brand.phone ? ` <a href="tel:${escapeHtml(tel(tenant.brand.phone))}" style="display:inline-block;color:#007fae;font-weight:600;padding:12px 8px">Inkább hívlak: ${escapeHtml(tenant.brand.phone)}</a>` : ''}</p>
<p style="font-size:12px;color:#62727a">Ez az egyetlen emlékeztető, amit küldünk. Ha a terv már nem aktuális, nincs teendőd.</p>
${[tenant.brand.phone, to, tenant.brand.website].filter(Boolean).length ? `<p style="font-size:12px;color:#62727a">${[tenant.brand.phone, to, tenant.brand.website].filter(Boolean).map((item) => escapeHtml(item!)).join(' · ')}</p>` : ''}
</div></div></body></html>`
}

export function ownerReminderHtml(tenant: Tenant, leads: FollowUpLead[], now: Date, adminUrl: string) {
  const rows = leads.map((lead) => {
    const score = scoreLead({ estimate_gross: lead.estimate_gross, notes: lead.notes ?? undefined, address: lead.address ?? undefined, engagement: lead.engagement ?? undefined })
    const days = Math.floor((now.getTime() - new Date(lead.created_at).getTime()) / DAY)
    return `<tr>
<td style="padding:8px 12px 8px 0;vertical-align:top"><strong>${escapeHtml(lead.customer_name)}</strong><br><span style="color:#62727a;font-size:12px">${escapeHtml(lead.city)} · ${escapeHtml(lead.ref)}</span></td>
<td style="padding:8px 12px 8px 0;vertical-align:top;white-space:nowrap">${escapeHtml(formatHuf(lead.estimate_gross))}</td>
<td style="padding:8px 12px 8px 0;vertical-align:top;white-space:nowrap">${escapeHtml(TIER_LABELS[score.tier])} · ${score.score}</td>
<td style="padding:8px 12px 8px 0;vertical-align:top;white-space:nowrap">${days} napja vár</td>
<td style="padding:8px 0;vertical-align:top;white-space:nowrap"><a href="tel:${escapeHtml(tel(lead.phone))}" style="color:#007fae">${escapeHtml(lead.phone)}</a></td>
</tr>`
  }).join('')
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#f1f4f4;font-family:Arial,Helvetica,sans-serif;color:#233039">
<div style="max-width:680px;margin:0 auto;padding:24px">
<p style="font-size:12px;letter-spacing:1px;color:#62727a;margin:0 0 8px">UTÁNKÖVETÉS · ${escapeHtml(tenant.brand.name.toUpperCase())}</p>
<h1 style="font-size:22px;margin:0 0 4px">${leads.length} érdeklődő egy hete válasz nélkül</h1>
<p style="margin:0 0 20px;color:#62727a">Ezek a kérelmek még „Új” státuszban állnak. A legtöbb érdeklődő két héten belül máshol rendel – érdemes ma hívni.</p>
<div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:16px"><table style="border-collapse:collapse;font-size:14px;width:100%">${rows}</table></div>
<p><a href="${escapeHtml(adminUrl)}" style="color:#007fae">Megnyitás az adminban →</a></p>
<p style="font-size:11px;color:#8a979d;margin-top:16px">Ezt a jelzést érdeklődőnként egyszer küldjük. A státusz átállításával („Kapcsolatba léptünk”) a lead kikerül a listából.</p>
</div></body></html>`
}

async function tenantsFor(env: LeadEnv, leads: FollowUpLead[]) {
  const tenants = new Map<string, Tenant | undefined>()
  for (const id of new Set(leads.map((lead) => lead.tenant_id))) tenants.set(id, await resolveTenant(env, id))
  return tenants
}

const followUpEnabled = (tenant: Tenant) => tenant.lead.followUp !== false

export interface FollowUpReport {
  ok: true
  dryRun: boolean
  customers: { sent: string[]; skipped: string[]; failed: string[] }
  owners: { sent: string[]; skipped: string[]; failed: string[] }
}

/** GET /api/followup — csak a CRON_SECRET-tel (Vercel cron automatikusan küldi). `?dry=1`: csak felmér, nem küld és nem ír. */
export async function handleFollowUp(request: Request, env: LeadEnv, now = new Date()): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') return json(405, { ok: false, error: 'Nem engedélyezett metódus.' })
  if (!env.CRON_SECRET) return json(503, { ok: false, error: 'A CRON_SECRET nincs beállítva, az utánkövetés nem fut.' })
  if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) return json(401, { ok: false, error: 'Nincs jogosultság.' })
  if (!storeConfigured(env)) return json(503, { ok: false, error: 'Az adattár (Supabase) nincs beállítva.' })
  if (!env.RESEND_API_KEY) return json(503, { ok: false, error: 'A RESEND_API_KEY nincs beállítva, e-mail nem küldhető.' })
  const dryRun = new URL(request.url).searchParams.get('dry') === '1'
  const origin = siteOrigin(request, env)
  const report: FollowUpReport = { ok: true, dryRun, customers: { sent: [], skipped: [], failed: [] }, owners: { sent: [], skipped: [], failed: [] } }

  try {
    // 1. Vevői emlékeztetők
    const customerDue = await dueLeads(env, `status=in.(new,contacted)&followup_sent_at=is.null&created_at=lte.${encodeURIComponent(daysAgo(now, CUSTOMER_AFTER_DAYS))}&created_at=gte.${encodeURIComponent(daysAgo(now, CUSTOMER_UNTIL_DAYS))}`)
    const tenants = await tenantsFor(env, customerDue)
    for (const lead of customerDue) {
      const tenant = tenants.get(lead.tenant_id)
      if (!tenant || !followUpEnabled(tenant)) { report.customers.skipped.push(lead.ref); continue }
      if (dryRun) { report.customers.sent.push(lead.ref); continue }
      try {
        if (!(await claim(env, lead, 'followup_sent_at', now))) { report.customers.skipped.push(lead.ref); continue }
        await sendEmail(env, {
          to: [lead.email],
          subject: oneLine(`${tenant.brand.name}: a pergolaterved még vár rád (${lead.ref})`),
          html: customerFollowUpHtml(tenant, lead, env),
          replyTo: contactEmail(tenant, env) || undefined,
        })
        report.customers.sent.push(lead.ref)
      } catch (error) {
        console.error('[followup] Vevői emlékeztető sikertelen', lead.ref, error)
        report.customers.failed.push(lead.ref)
      }
    }

    // 2. Gyártói jelzés (tenantonként egy összesítő)
    const ownerDue = await dueLeads(env, `status=eq.new&reminder_sent_at=is.null&created_at=lte.${encodeURIComponent(daysAgo(now, OWNER_AFTER_DAYS))}&created_at=gte.${encodeURIComponent(daysAgo(now, OWNER_UNTIL_DAYS))}`)
    for (const [id, tenant] of await tenantsFor(env, ownerDue)) {
      const leads = ownerDue.filter((lead) => lead.tenant_id === id)
      const recipients = tenant ? (tenant.lead.recipients.length ? tenant.lead.recipients : (env.LEAD_FALLBACK_EMAIL ?? '').split(',').map((item) => item.trim()).filter(Boolean)) : []
      if (!tenant || !followUpEnabled(tenant) || recipients.length === 0) { report.owners.skipped.push(...leads.map((lead) => lead.ref)); continue }
      if (dryRun) { report.owners.sent.push(...leads.map((lead) => lead.ref)); continue }
      try {
        const claimed: FollowUpLead[] = []
        for (const lead of leads) {
          if (await claim(env, lead, 'reminder_sent_at', now)) claimed.push(lead)
          else report.owners.skipped.push(lead.ref)
        }
        if (claimed.length === 0) continue
        await sendEmail(env, {
          to: recipients,
          subject: oneLine(`${tenant.lead.subjectPrefix} ${claimed.length} érdeklődő egy hete válasz nélkül`),
          html: ownerReminderHtml(tenant, claimed, now, `${origin}/k/${tenant.id}/admin`),
        })
        report.owners.sent.push(...claimed.map((lead) => lead.ref))
      } catch (error) {
        console.error('[followup] Gyártói jelzés sikertelen', id, error)
        report.owners.failed.push(...leads.map((lead) => lead.ref))
      }
    }
  } catch (error) {
    console.error('[followup] Futás megszakadt', error)
    return json(502, { ok: false, error: 'Az utánkövetés futása megszakadt.', report })
  }
  return json(200, report)
}
