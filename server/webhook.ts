// CRM-webhook: aláírt JSON-események a gyártó saját rendszerébe (Make, n8n, Zapier, saját szerver; HubSpot ezeken át).
//
// Kézbesítés: POST application/json, fejlécek:
//   X-Lamelix-Event: lead.created | quote.sent | quote.accepted | quote.declined | test
//   X-Lamelix-Delivery: egyedi azonosító (az ismétlések kiszűréséhez)
//   X-Lamelix-Timestamp: Unix-másodperc
//   X-Lamelix-Signature: sha256=<hex HMAC-SHA256(titok, `${timestamp}.${törzs}`)>
// 5 másodperc időkorlát, hálózati hibánál vagy 5xx-nél egy újrapróbálás. A webhook hibája soha nem akasztja meg
// a leadet vagy az ajánlatot: a kézbesítés eredménye csak naplózódik.
import { z } from 'zod'
import { authorize, json, resolveTenant, type AdminEnv } from './tenantAdmin'
import { isAllowedWebhookUrl, webhookEnabled, type CrmSettings, type WebhookEvent } from '../src/tenants/crm'
import { findDealer } from '../src/tenants/pricingRules'
import type { Tenant } from '../src/tenants/types'
import type { PriceBreakdown } from '../src/types/pergola'

export const WEBHOOK_TIMEOUT_MS = 5000
const encoder = new TextEncoder()

export interface WebhookResult { ok: boolean; status?: number; error?: string; attempts: number; ms: number }

export interface WebhookPayload {
  event: WebhookEvent
  id: string
  createdAt: string
  tenant: { id: string; name: string }
  data: Record<string, unknown>
}

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

/** HMAC-SHA256 aláírás: `sha256=` + hex(HMAC(titok, `${timestamp}.${törzs}`)). A fogadó ugyanezt számolja és összeveti. */
export async function signWebhook(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return `sha256=${hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`)))}`
}

const randomId = () => hex(crypto.getRandomValues(new Uint8Array(12)).buffer as ArrayBuffer)

/** Az esemény burkolója: azonosító, időpont, gyártó. */
export function webhookPayload(tenant: Tenant, event: WebhookEvent, data: Record<string, unknown>, now = new Date()): WebhookPayload {
  return { event, id: `evt_${randomId()}`, createdAt: now.toISOString(), tenant: { id: tenant.id, name: tenant.brand.name }, data }
}

/** Egy kézbesítés a megadott beállítással (a teszthez el nem mentett beállítással is). Soha nem dob hibát. */
export async function sendWebhook(crm: CrmSettings, payload: WebhookPayload, fetchImpl: typeof fetch = fetch): Promise<WebhookResult> {
  const started = Date.now()
  if (!crm.webhookUrl || !crm.secret) return { ok: false, error: 'Nincs beállítva webhook-cím vagy titok.', attempts: 0, ms: 0 }
  if (!isAllowedWebhookUrl(crm.webhookUrl)) return { ok: false, error: 'Csak nyilvános https:// cím engedélyezett.', attempts: 0, ms: 0 }
  const body = JSON.stringify(payload)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Lamelix-Webhook/1.0',
    'X-Lamelix-Event': payload.event,
    'X-Lamelix-Delivery': payload.id,
    'X-Lamelix-Timestamp': timestamp,
    'X-Lamelix-Signature': await signWebhook(crm.secret, timestamp, body),
  }
  let last: WebhookResult = { ok: false, attempts: 0, ms: 0 }
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)
    try {
      // Átirányítást nem követünk: egy nyilvános cím ne vihesse a kérést belső címre.
      const response = await fetchImpl(crm.webhookUrl, { method: 'POST', headers, body, signal: controller.signal, redirect: 'manual' })
      last = { ok: response.status >= 200 && response.status < 300, status: response.status, attempts: attempt, ms: Date.now() - started }
      if (last.ok || response.status < 500) {
        if (!last.ok) last.error = `A fogadó ${response.status} választ adott.`
        return last
      }
      last.error = `A fogadó ${response.status} választ adott.`
    } catch (error) {
      last = { ok: false, attempts: attempt, ms: Date.now() - started, error: controller.signal.aborted ? `Nem válaszolt ${WEBHOOK_TIMEOUT_MS / 1000} mp alatt.` : `Hálózati hiba: ${(error as Error).message}` }
    } finally {
      clearTimeout(timer)
    }
  }
  return last
}

/** Esemény küldése, ha a gyártó bekapcsolta (és kérte ezt az eseményt). Soha nem dob hibát; az eredményt naplózza. */
/** Vercel Edge futási környezet: `waitUntil` a válasz után is befejezi a háttérmunkát. Helyben és tesztben hiányzik. */
export interface BackgroundContext { waitUntil?: (promise: Promise<unknown>) => void }

/**
 * 4.93: a CRM-webhook ne tartsa vissza a vevő és a gyártó válaszát (5 s időkorlát + újrapróbálás = akár 10 s pörgés).
 * Ha van `waitUntil`, a kézbesítés a válasz után fut le; ha nincs (helyi fejlesztés, teszt), megvárjuk.
 */
export async function queueWebhook(context: BackgroundContext | undefined, ...args: Parameters<typeof deliverWebhook>): Promise<void> {
  const delivery = deliverWebhook(...args).catch((error) => { console.error('[webhook] Kézbesítés megszakadt', error); return null })
  if (context?.waitUntil) context.waitUntil(delivery)
  else await delivery
}

export async function deliverWebhook(tenant: Tenant, event: WebhookEvent, data: Record<string, unknown>, fetchImpl: typeof fetch = fetch): Promise<WebhookResult | null> {
  if (!webhookEnabled(tenant.crm, event)) return null
  const result = await sendWebhook(tenant.crm!, webhookPayload(tenant, event, data), fetchImpl)
  if (!result.ok) console.error('[webhook] Kézbesítés sikertelen', tenant.id, event, result.status ?? '', result.error ?? '')
  return result
}

const priceData = (tenant: Tenant, price: PriceBreakdown) => ({
  currency: tenant.currency,
  net: price.totalNet,
  vat: price.vatNet,
  gross: price.totalGross,
  installationNet: price.installationNet,
  lines: price.lines.map((line) => ({ id: line.id, label: line.label, detail: line.detail, net: line.amountNet })),
})

export interface LeadEventInput {
  ref: string
  tenant: Tenant
  createdAt: Date
  product: string
  source: string
  dealerId?: string
  customer: { name: string; email: string; phone: string; postalCode?: string; city: string; region: string; address?: string; notes?: string }
  /** Bővítési kérés meglévő telepítéshez: a CRM-be a bővítés becsült különbözete megy (mint az adminba és az e-mailbe). */
  expansion?: { installationId: number; originalRef: string | null; added: string[]; deltaNet: number; deltaGross: number }
  headline: string
  configUrl: string
  pageUrl?: string
  spec: [string, string][]
  price: PriceBreakdown
}

/** lead.created: minden, ami egy CRM-kártyához kell (kapcsolat, terv, irányár, viszonteladó). */
export function leadEventData(lead: LeadEventInput): Record<string, unknown> {
  const dealer = findDealer(lead.tenant.pricingRules, lead.dealerId)
  return {
    ref: lead.ref,
    createdAt: lead.createdAt.toISOString(),
    product: lead.product,
    source: lead.source,
    dealer: dealer ? { id: dealer.id, name: dealer.name } : null,
    customer: {
      name: lead.customer.name, email: lead.customer.email, phone: lead.customer.phone,
      postalCode: lead.customer.postalCode || null, city: lead.customer.city, region: lead.customer.region,
      address: lead.customer.address || null, notes: lead.customer.notes || null,
    },
    configuration: { headline: lead.headline, url: lead.configUrl, pageUrl: lead.pageUrl ?? null, spec: lead.spec.map(([label, value]) => ({ label, value })) },
    price: lead.expansion
      ? { currency: lead.tenant.currency, net: lead.expansion.deltaNet, vat: lead.expansion.deltaGross - lead.expansion.deltaNet, gross: lead.expansion.deltaGross, estimate: true, lines: [] }
      : priceData(lead.tenant, lead.price),
    expansion: lead.expansion
      ? { installationId: lead.expansion.installationId, originalRef: lead.expansion.originalRef, added: lead.expansion.added, fullConfigurationPrice: priceData(lead.tenant, lead.price) }
      : null,
  }
}

export interface QuoteEventInput {
  tenant: Tenant
  number: string
  version: number
  label: string
  leadRef: string
  status: string
  url?: string
  customer: { name: string; email: string; phone: string | null }
  price: PriceBreakdown
  totalNet: number
  totalGross: number
  discountNet: number
  depositPercent: number
  depositGross: number
  validUntil: string
  acceptedAt?: string | null
  signerName?: string | null
  declinedAt?: string | null
  declineReason?: string | null
}

/** quote.sent / quote.accepted / quote.declined. */
export function quoteEventData(quote: QuoteEventInput): Record<string, unknown> {
  return {
    number: quote.number, version: quote.version, label: quote.label, leadRef: quote.leadRef, status: quote.status, url: quote.url ?? null,
    customer: quote.customer,
    currency: quote.tenant.currency,
    totalNet: quote.totalNet, totalGross: quote.totalGross, discountNet: quote.discountNet,
    depositPercent: quote.depositPercent, depositGross: quote.depositGross, validUntil: quote.validUntil,
    acceptedAt: quote.acceptedAt ?? null, signerName: quote.signerName ?? null,
    declinedAt: quote.declinedAt ?? null, declineReason: quote.declineReason ?? null,
    lines: priceData(quote.tenant, quote.price).lines,
  }
}

/** Minta-lead a teszthez és az admin minta-payloadjához (kitalált adatok, nem valódi vevő). */
export function sampleLeadData(tenant: Tenant): Record<string, unknown> {
  const de = tenant.locale === 'de'
  return {
    ref: 'TEST-0001', createdAt: new Date().toISOString(), product: 'pergola', source: 'standalone', dealer: null,
    customer: de
      ? { name: 'Max Muster (Test)', email: 'max.muster@example.com', phone: '+43 664 0000000', postalCode: '8010', city: 'Graz', region: 'Steiermark', address: null, notes: 'Testereignis aus dem Lamelix-Admin' }
      : { name: 'Minta Péter (teszt)', email: 'minta.peter@example.com', phone: '+36 30 000 0000', postalCode: '9600', city: 'Sárvár', region: 'Vas', address: null, notes: 'Tesztesemény a Lamelix adminból' },
    configuration: { headline: '5,0 × 4,0 m', url: 'https://lamelix.vercel.app/', pageUrl: null, spec: [] },
    price: { currency: tenant.currency, net: 0, vat: 0, gross: 0, installationNet: 0, lines: [] },
  }
}

const testSchema = z.object({ webhookUrl: z.string().trim().max(500).optional(), secret: z.string().max(200).optional() })

/**
 * POST /api/admin-webhook-test → tesztesemény küldése. A törzsben megadott (még nem mentett) cím és titok is
 * kipróbálható; ha üres, a mentett beállítás. Csak a bejelentkezett gyártó saját tenantjához.
 */
export async function handleWebhookTest(request: Request, env: AdminEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Csak POST kérés engedélyezett.' })
  const auth = await authorize(request, env)
  if (auth instanceof Response) return auth
  const parsed = testSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return json(422, { ok: false, error: 'Érvénytelen kérés.' })
  const tenant = (await resolveTenant(env, auth.tenant.id)) ?? auth.tenant
  const crm: CrmSettings = {
    webhookUrl: parsed.data.webhookUrl || tenant.crm?.webhookUrl,
    secret: parsed.data.secret || tenant.crm?.secret,
  }
  if (!crm.webhookUrl) return json(422, { ok: false, error: 'Add meg a webhook címét.' })
  if (!isAllowedWebhookUrl(crm.webhookUrl)) return json(422, { ok: false, error: 'Csak nyilvános https:// cím adható meg.' })
  if (!crm.secret || crm.secret.length < 16) return json(422, { ok: false, error: 'A teszthez legalább 16 karakteres titok kell.' })
  const result = await sendWebhook(crm, webhookPayload(tenant, 'test', sampleLeadData(tenant)), fetchImpl)
  return json(200, { ok: true, result })
}
