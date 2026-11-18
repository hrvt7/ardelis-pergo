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
import { formatMoney } from '../src/lib/money'
import { scoreLead, TIER_LABELS, type LeadEngagement } from '../src/lib/leadScore'
import type { Tenant } from '../src/tenants/types'
import { escapeHtml, oneLine, sendEmail, siteOrigin, type LeadEnv } from './lead'
import { bookingLink } from '../src/lib/booking'
import { json, resolveTenant, storeConfigured, storeHeaders } from './tenantAdmin'
import { purgeExpiredInstallations } from './installations'
import { tr, withLocale } from '../src/i18n/locale'
import { priceDisplayOf } from '../src/lib/priceDisplay'

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
  return withLocale(tenant.locale ?? 'hu', () => customerFollowUpHtmlIn(tenant, lead, env))
}

function customerFollowUpHtmlIn(tenant: Tenant, lead: FollowUpLead, env: LeadEnv) {
  const to = contactEmail(tenant, env)
  const subject = encodeURIComponent(tr(`Időpontkérés – ${lead.ref}`, `Terminanfrage – ${lead.ref}`))
  const body = encodeURIComponent(tr(`Kedves ${tenant.brand.name}!\n\nSzeretnék helyszíni felmérési időpontot egyeztetni a(z) ${lead.ref} számú pergolatervemhez.\nNekem megfelelő időpontok: \n\nÜdvözlettel,\n${lead.customer_name}`, `Guten Tag ${tenant.brand.name},\n\nich möchte einen Aufmaß-Termin vor Ort für meinen Pergola-Entwurf ${lead.ref} vereinbaren.\nPassende Termine für mich: \n\nMit freundlichen Grüßen\n${lead.customer_name}`))
  const booking = bookingLink(tenant)
  const button = (href: string, label: string) => `<a href="${escapeHtml(href)}" style="display:inline-block;background:#007fae;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(label)}</a>`
  return `<!doctype html><html lang="${tr('hu', 'de')}"><body style="margin:0;background:#f1f4f4;font-family:Arial,Helvetica,sans-serif;color:#233039">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:8px;padding:20px 24px">
<p style="font-size:12px;letter-spacing:1px;color:#62727a;margin:0 0 8px">${escapeHtml(tenant.brand.name.toUpperCase())} · ${escapeHtml(lead.ref)}</p>
<h1 style="font-size:20px;margin:0 0 12px">${tr('A pergolaterved még vár rád', 'Ihr Pergola-Entwurf wartet auf Sie')}</h1>
<p>${tr(`Kedves ${escapeHtml(lead.customer_name)}!`, `Guten Tag ${escapeHtml(lead.customer_name)},`)}</p>
<p>${(priceDisplayOf(tenant) === 'estimate' ? tr(`Néhány napja felmérést kértél a(z) ${escapeHtml(tenant.brand.name)} csapatától egy ${escapeHtml(formatMoney(lead.estimate_gross, tenant.currency))} bruttó irányárú pergolára (${escapeHtml(lead.city)}). A 3D-terved bármikor megnyitható és továbbformálható:`, `vor einigen Tagen haben Sie bei ${escapeHtml(tenant.brand.name)} ein Aufmaß für eine Pergola mit einem Richtpreis von ${escapeHtml(formatMoney(lead.estimate_gross, tenant.currency))} brutto angefragt (${escapeHtml(lead.city)}). Ihren 3D-Entwurf können Sie jederzeit öffnen und weiter anpassen:`) : tr(`Néhány napja felmérést kértél a(z) ${escapeHtml(tenant.brand.name)} csapatától egy pergolára (${escapeHtml(lead.city)}). A 3D-terved bármikor megnyitható és továbbformálható:`, `vor einigen Tagen haben Sie bei ${escapeHtml(tenant.brand.name)} ein Aufmaß für eine Pergola angefragt (${escapeHtml(lead.city)}). Ihren 3D-Entwurf können Sie jederzeit öffnen und weiter anpassen:`))}</p>
<p><a href="${escapeHtml(lead.config_url)}" style="color:#007fae">${tr('A konfigurációm megnyitása →', 'Meine Konfiguration öffnen →')}</a></p>
<p>${tr('Ha szeretnéd, egyeztessünk egy helyszíni felmérési időpontot – ez kötelezettség nélküli, és ekkor készül a pontos árajánlat.', 'Wenn Sie möchten, vereinbaren wir einen Aufmaß-Termin vor Ort – unverbindlich, dabei entsteht das genaue Angebot.')}</p>
<p style="margin:20px 0">${booking ? button(booking, tr('Időpontot foglalok', 'Termin buchen')) : to ? button(`mailto:${to}?subject=${subject}&body=${body}`, tr('Időpontot kérek', 'Termin anfragen')) : ''}${tenant.brand.phone ? ` <a href="tel:${escapeHtml(tel(tenant.brand.phone))}" style="display:inline-block;color:#007fae;font-weight:600;padding:12px 8px">${tr('Inkább hívlak', 'Lieber anrufen')}: ${escapeHtml(tenant.brand.phone)}</a>` : ''}</p>
<p style="font-size:12px;color:#62727a">${tr('Ez az egyetlen emlékeztető, amit küldünk. Ha a terv már nem aktuális, nincs teendőd.', 'Dies ist die einzige Erinnerung, die wir senden. Ist der Entwurf nicht mehr aktuell, müssen Sie nichts tun.')}</p>
${[tenant.brand.phone, to, tenant.brand.website].filter(Boolean).length ? `<p style="font-size:12px;color:#62727a">${[tenant.brand.phone, to, tenant.brand.website].filter(Boolean).map((item) => escapeHtml(item!)).join(' · ')}</p>` : ''}
</div></div></body></html>`
}

export function ownerReminderHtml(tenant: Tenant, leads: FollowUpLead[], now: Date, adminUrl: string) {
  return withLocale(tenant.locale ?? 'hu', () => ownerReminderHtmlIn(tenant, leads, now, adminUrl))
}

function ownerReminderHtmlIn(tenant: Tenant, leads: FollowUpLead[], now: Date, adminUrl: string) {
  const rows = leads.map((lead) => {
    const score = scoreLead({ estimate_gross: lead.estimate_gross, notes: lead.notes ?? undefined, address: lead.address ?? undefined, engagement: lead.engagement ?? undefined })
    const days = Math.floor((now.getTime() - new Date(lead.created_at).getTime()) / DAY)
    return `<tr>
<td style="padding:8px 12px 8px 0;vertical-align:top"><strong>${escapeHtml(lead.customer_name)}</strong><br><span style="color:#62727a;font-size:12px">${escapeHtml(lead.city)} · ${escapeHtml(lead.ref)}</span></td>
<td style="padding:8px 12px 8px 0;vertical-align:top;white-space:nowrap">${escapeHtml(formatMoney(lead.estimate_gross, tenant.currency))}</td>
<td style="padding:8px 12px 8px 0;vertical-align:top;white-space:nowrap">${escapeHtml(TIER_LABELS[score.tier])} · ${score.score}</td>
<td style="padding:8px 12px 8px 0;vertical-align:top;white-space:nowrap">${tr(`${days} napja vár`, `wartet seit ${days} Tagen`)}</td>
<td style="padding:8px 0;vertical-align:top;white-space:nowrap"><a href="tel:${escapeHtml(tel(lead.phone))}" style="color:#007fae">${escapeHtml(lead.phone)}</a></td>
</tr>`
  }).join('')
  return `<!doctype html><html lang="${tr('hu', 'de')}"><body style="margin:0;background:#f1f4f4;font-family:Arial,Helvetica,sans-serif;color:#233039">
<div style="max-width:680px;margin:0 auto;padding:24px">
<p style="font-size:12px;letter-spacing:1px;color:#62727a;margin:0 0 8px">${tr('UTÁNKÖVETÉS', 'NACHFASSEN')} · ${escapeHtml(tenant.brand.name.toUpperCase())}</p>
<h1 style="font-size:22px;margin:0 0 4px">${tr(`${leads.length} érdeklődő egy hete válasz nélkül`, `${leads.length} Anfragen seit einer Woche ohne Antwort`)}</h1>
<p style="margin:0 0 20px;color:#62727a">${tr('Ezek a kérelmek még „Új” státuszban állnak. A legtöbb érdeklődő két héten belül máshol rendel – érdemes ma hívni.', 'Diese Anfragen stehen noch auf „Neu“. Die meisten Interessenten bestellen binnen zwei Wochen woanders – heute anzurufen lohnt sich.')}</p>
<div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:16px"><table style="border-collapse:collapse;font-size:14px;width:100%">${rows}</table></div>
<p><a href="${escapeHtml(adminUrl)}" style="color:#007fae">${tr('Megnyitás az adminban →', 'Im Admin öffnen →')}</a></p>
<p style="font-size:11px;color:#8a979d;margin-top:16px">${tr('Ezt a jelzést érdeklődőnként egyszer küldjük. A státusz átállításával („Kapcsolatba léptünk”) a lead kikerül a listából.', 'Diesen Hinweis senden wir je Anfrage einmal. Wenn Sie den Status ändern („Kontaktiert“), verschwindet die Anfrage aus der Liste.')}</p>
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
  /** Megőrzési idő miatt törölt telepítések (próbafutásnál null). */
  purged?: { deleted: number; failed: number } | null
  customers: { sent: string[]; skipped: string[]; failed: string[] }
  owners: { sent: string[]; skipped: string[]; failed: string[] }
}

/** GET /api/followup — csak a CRON_SECRET-tel (Vercel cron automatikusan küldi). `?dry=1`: csak felmér, nem küld és nem ír. */
export async function handleFollowUp(request: Request, env: LeadEnv, now = new Date()): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') return json(405, { ok: false, error: 'Nem engedélyezett metódus.' })
  if (!env.CRON_SECRET) return json(503, { ok: false, error: 'A CRON_SECRET nincs beállítva, az utánkövetés nem fut.' })
  if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) return json(401, { ok: false, error: 'Nincs jogosultság.' })
  if (!storeConfigured(env)) return json(503, { ok: false, error: 'Az adattár (Supabase) nincs beállítva.' })
  // Telepítések megőrzési ideje: a lejártak törlése (fotókkal együtt). E-mail nélkül is fut; próbafutásnál nem töröl.
  const purge = new URL(request.url).searchParams.get('dry') === '1' ? null : await purgeExpiredInstallations(env, now).catch((error) => { console.error('[followup] Megőrzési törlés megszakadt', error); return null })
  if (!env.RESEND_API_KEY) return json(503, { ok: false, error: 'A RESEND_API_KEY nincs beállítva, e-mail nem küldhető.' })
  const dryRun = new URL(request.url).searchParams.get('dry') === '1'
  const origin = siteOrigin(request, env)
  const report: FollowUpReport = { ok: true, dryRun, purged: purge, customers: { sent: [], skipped: [], failed: [] }, owners: { sent: [], skipped: [], failed: [] } }

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
          subject: oneLine(tenant.locale === 'de' ? `${tenant.brand.name}: Ihr Pergola-Entwurf wartet auf Sie (${lead.ref})` : `${tenant.brand.name}: a pergolaterved még vár rád (${lead.ref})`),
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
          subject: oneLine(tenant.locale === 'de' ? `${tenant.lead.subjectPrefix} ${claimed.length} Anfragen seit einer Woche ohne Antwort` : `${tenant.lead.subjectPrefix} ${claimed.length} érdeklődő egy hete válasz nélkül`),
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
