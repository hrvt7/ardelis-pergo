// Ár megjelenítése a vevő felé, gyártónként (M05, D5): a gyártó az adminban választja.
//  • estimate – becsült teljes bruttó ár, tételes kalkulációval (alapértelmezés);
//  • from     – csak irányár „-tól” (lefelé kerekítve), tételek és pontos összeg nélkül;
//  • hidden   – nincs ár a vevő felé; a felárak sem látszanak, az ajánlatkérés marad.
// A szerver és a gyártó mindig a teljes, pontos becslést kapja (lead, admin). Böngészőben és szerveren is fut.
import type { Currency } from './money'

export const PRICE_DISPLAYS = ['estimate', 'from', 'hidden'] as const
export type PriceDisplay = (typeof PRICE_DISPLAYS)[number]

export const PRICE_DISPLAY_LABELS: Record<PriceDisplay, { title: string; hint: string }> = {
  estimate: { title: 'Becsült teljes ár', hint: 'A vevő a pontos becsült bruttó árat és a tételes kalkulációt látja, minden választásnál a felárral.' },
  from: { title: 'Irányár „-tól”', hint: 'Csak lefelé kerekített irányár látszik („5 600 000 Ft-tól”), tételek nélkül; a felárak a választásoknál megmaradnak.' },
  hidden: { title: 'Ár nélkül', hint: 'Sehol nincs ár a vevő felé (felár, csomagár, PDF-összeg sem); az ajánlatkérés megmarad. A becslést továbbra is megkapjátok a leadben.' },
}

export function priceDisplayOf(tenant: { priceDisplay?: PriceDisplay }): PriceDisplay {
  return tenant.priceDisplay && (PRICE_DISPLAYS as readonly string[]).includes(tenant.priceDisplay) ? tenant.priceDisplay : 'estimate'
}

/** Látszik-e bármilyen ár (felár, csomagár) a vevő felé. */
export function showsPrices(mode: PriceDisplay): boolean {
  return mode !== 'hidden'
}

/** A „-tól” irányár: a becsült bruttó ár lefelé kerekítve (Ft: 50 000-re, EUR: 100-ra), hogy ne tűnjön pontos ajánlatnak. */
export function fromPrice(gross: number, currency: Currency): number {
  const step = currency === 'EUR' ? 100 : 50_000
  if (!Number.isFinite(gross) || gross <= 0) return 0
  return Math.max(step, Math.floor(gross / step) * step)
}
