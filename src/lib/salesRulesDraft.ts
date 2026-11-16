// Az admin árazási szabályainak és CRM-beállításának szerkesztési állapota (űrlap ↔ mentett beállítás).
import { WEBHOOK_EVENTS, type CrmSettings } from '../tenants/crm'
import type { PricingRules } from '../tenants/pricingRules'
import type { Tenant } from '../tenants/types'

export interface DealerDraft { id: string; name: string; margin: string; email: string }
export interface PricingDraft { regions: Record<string, { percent: string; net: string }>; dealers: DealerDraft[] }

export function pricingDraftFrom(tenant: Tenant): PricingDraft {
  const rules = tenant.pricingRules
  return {
    regions: Object.fromEntries(tenant.regions.map((region) => {
      const rule = rules?.regionSurcharges?.[region]
      return [region, { percent: rule?.percent ? String(rule.percent) : '', net: rule?.net ? String(rule.net) : '' }]
    })),
    dealers: (rules?.dealers ?? []).map((dealer) => ({ id: dealer.id, name: dealer.name, margin: String(dealer.marginPercent), email: dealer.email ?? '' })),
  }
}

export const num = (value: string) => {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/** A szerkesztett állapotból a mentendő szabályok (üres régiók nélkül). Érvényességet a parseOverrides ellenőrzi. */
export function pricingRulesFromDraft(draft: PricingDraft): PricingRules | undefined {
  const regionSurcharges = Object.fromEntries(Object.entries(draft.regions).flatMap(([region, rule]) => {
    const percent = num(rule.percent)
    const net = num(rule.net)
    return percent || net ? [[region, { ...(percent ? { percent } : {}), ...(net ? { net: Math.round(net) } : {}) }]] : []
  }))
  const dealers = draft.dealers
    .filter((dealer) => dealer.id.trim() || dealer.name.trim())
    .map((dealer) => ({ id: dealer.id.trim().toLowerCase(), name: dealer.name.trim(), marginPercent: Number(dealer.margin.replace(',', '.')) || 0, ...(dealer.email.trim() ? { email: dealer.email.trim() } : {}) }))
  if (!Object.keys(regionSurcharges).length && !dealers.length) return undefined
  return { regionSurcharges, dealers }
}

export interface CrmDraft { webhookUrl: string; secret: string; events: (typeof WEBHOOK_EVENTS)[number][] }

export const crmDraftFrom = (tenant: Tenant): CrmDraft => ({
  webhookUrl: tenant.crm?.webhookUrl ?? '',
  secret: tenant.crm?.secret ?? '',
  events: tenant.crm?.events ?? [...WEBHOOK_EVENTS],
})

export const crmFromDraft = (draft: CrmDraft): CrmSettings | undefined =>
  draft.webhookUrl.trim() || draft.secret.trim() ? { webhookUrl: draft.webhookUrl.trim(), secret: draft.secret.trim(), events: draft.events } : undefined

