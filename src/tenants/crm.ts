// CRM-webhook beállításai és ellenőrzése. A kézbesítés: server/webhook.ts. Böngészőben (admin) és szerveren is fut.

/** A gyártó által választható események. */
export const WEBHOOK_EVENTS = ['lead.created', 'quote.sent', 'quote.accepted', 'quote.declined'] as const
export type WebhookEvent = typeof WEBHOOK_EVENTS[number] | 'test'

export interface CrmSettings {
  /** HTTPS végpont (Make „Custom webhook”, n8n „Webhook” node, Zapier „Catch Hook”, saját szerver). Üres = kikapcsolva. */
  webhookUrl?: string
  /** Közös titok az aláíráshoz (HMAC-SHA256). Csak a szerver és az admin látja. */
  secret?: string
  /** Mely eseményekről menjen értesítés (alapértelmezés: mind). */
  events?: (typeof WEBHOOK_EVENTS)[number][]
}

/** Belső vagy nem nyilvános címre a szerver nem küld (SSRF-védelem): csak https és nyilvános hosztnév. */
export function isAllowedWebhookUrl(value: string): boolean {
  let url: URL
  try { url = new URL(value) } catch { return false }
  if (url.protocol !== 'https:' || url.username || url.password) return false
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return false
  if (host === 'localhost' || host === '0.0.0.0' || host.includes(':')) return false
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224) return false
  }
  return true
}

export const webhookEnabled = (crm: CrmSettings | undefined, event: WebhookEvent) =>
  Boolean(crm?.webhookUrl && crm.secret && (event === 'test' || !crm.events || crm.events.includes(event)))
