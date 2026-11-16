// Gyártói árazási szabályok: regionális felár és viszonteladói árrés.
// Böngészőben és szerveren (Edge) is fut, ezért érték-import csak relatív úton.
//
// - Viszonteladói árrés: a gyártó viszonteladói hálózatának minden tagja saját linket kap (…/k/:gyártó?h=:viszonteladó).
//   Az árrés az egységárakra és az ármátrixra kerül (nem a végösszegre), így a vevő tételes kalkulációja konzisztens marad:
//   minden tétel a viszonteladói egységárral számol. A vevő az árrés mértékét nem látja külön tételként.
// - Regionális felár: régiónként (megye / Bundesland) százalékos és/vagy fix nettó felár, külön, látható tételként.
//   A konfigurátor ára régió nélkül számol; a felár az ajánlatkérő űrlapon, a régió kiválasztása után jelenik meg,
//   és a szerver a leadnél és az ajánlatnál ugyanígy számolja.
import { formatMoney, roundMoney, type Currency } from '../lib/money'
import { tr } from '../i18n/locale'
import type { PriceBreakdown, PriceSettings } from '../types/pergola'

export interface RegionSurcharge {
  /** Százalékos felár a tételek nettó összegére (telepítés nélkül), pl. 5 = 5%. */
  percent?: number
  /** Fix nettó felár (kiszállás, daru, távolsági díj) a gyártó pénznemében. */
  net?: number
}

export interface Dealer {
  /** URL-azonosító (kisbetű, szám, kötőjel), pl. „graz”: …/k/gyarto?h=graz */
  id: string
  /** Megjelenített név (a gyártó e-mailjében, a CRM-ben és az adminban). */
  name: string
  /** Árrés százalékban az egységárakra, pl. 15 = +15%. */
  marginPercent: number
  /** A viszonteladó e-mail címe: a hozzá érkező leadekről másolatot kap. Nem kerül a böngészőbe. */
  email?: string
}

export interface PricingRules {
  /** Régiónév (a gyártó régiólistájából) → felár. */
  regionSurcharges?: Record<string, RegionSurcharge>
  dealers?: Dealer[]
}

/** Az árszámítás környezete: a vevő régiója (az űrlapról) és a viszonteladó (a linkből). */
export interface PriceContext {
  region?: string
  dealerId?: string
}

export const DEALER_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/

export const findDealer = (rules: PricingRules | undefined, id: string | undefined): Dealer | undefined =>
  id ? rules?.dealers?.find((dealer) => dealer.id === id) : undefined

/** Az árrés nem pénzösszeg mezői: arányok (0–1), ezek nem szorzódnak. */
const isRateKey = (key: string) => key.endsWith('Rate')

/**
 * Viszonteladói egységárak: minden pénzösszeg (m²-ár, darabár, folyóméter-ár, ármátrix-pont) × (1 + árrés).
 * Az arányok (telepítés, ÁFA, színfelár stb.) változatlanok. Az eredmény a pénznem lépcsőjére kerekít.
 */
export function dealerPrices(prices: PriceSettings, marginPercent: number, currency: Currency): PriceSettings {
  if (!marginPercent) return prices
  const factor = 1 + marginPercent / 100
  const scaled: Record<string, unknown> = { ...prices }
  for (const [key, value] of Object.entries(prices)) {
    if (typeof value === 'number' && !isRateKey(key)) scaled[key] = roundUnit(value * factor, currency)
  }
  if (prices.priceMatrix) {
    scaled.priceMatrix = Object.fromEntries(Object.entries(prices.priceMatrix).map(([roof, points]) => [
      roof, points?.map((point) => ({ ...point, netPrice: roundUnit(point.netPrice * factor, currency) })),
    ]))
  }
  return scaled as unknown as PriceSettings
}

// Egységár kerekítése egészre (EUR: egész euró, HUF: egész forint; a tételek a pénznem lépcsőjére kerekednek).
const roundUnit = (value: number, currency: Currency) => { void currency; return Math.round(value) }

export function regionSurcharge(rules: PricingRules | undefined, region: string | undefined): RegionSurcharge | undefined {
  if (!region) return undefined
  const rule = rules?.regionSurcharges?.[region]
  return rule && ((rule.percent ?? 0) > 0 || (rule.net ?? 0) > 0) ? rule : undefined
}

/**
 * Regionális felár hozzáadása külön tételként. A telepítési arány NEM vonatkozik rá (a felár maga a helyszíni többletköltség).
 * Az ÁFA a teljes nettóra számolódik újra, a pergola árképzésével azonos kerekítéssel.
 */
export function applyRegionSurcharge(price: PriceBreakdown, rules: PricingRules | undefined, region: string | undefined, prices: PriceSettings, currency: Currency): PriceBreakdown {
  const rule = regionSurcharge(rules, region)
  if (!rule || !region) return price
  const percentPart = (price.subtotalNet * (rule.percent ?? 0)) / 100
  const amountNet = roundMoney(percentPart + (rule.net ?? 0), currency)
  if (amountNet <= 0) return price
  const parts = [
    rule.percent ? `${String(rule.percent).replace('.', ',')}%` : '',
    rule.net ? formatMoney(rule.net, currency) : '',
  ].filter(Boolean).join(' + ')
  const line = {
    id: 'regionSurcharge',
    label: tr(`Regionális felár · ${region}`, `Regionalzuschlag · ${region}`),
    detail: tr(`${parts} · kiszállás és helyszíni többletköltség`, `${parts} · Anfahrt und Mehraufwand vor Ort`),
    amountNet,
  }
  const subtotalNet = price.subtotalNet + amountNet
  const totalNet = subtotalNet + price.installationNet
  const vatNet = roundMoney(totalNet * prices.vatRate, currency)
  return { ...price, lines: [...price.lines, line], subtotalNet, totalNet, vatNet, totalGross: totalNet + vatNet }
}

/** Engedmény százalékból: a nettó végösszeg adott százaléka, a pénznem lépcsőjére kerekítve. */
export const discountFromPercent = (totalNet: number, percent: number, currency: Currency) =>
  Math.min(totalNet, Math.max(0, roundMoney((totalNet * percent) / 100, currency)))
