// Pénznemek: formázás és kerekítés gyártónként (HUF vagy EUR).
// Böngészőben és szerveren (Edge) is fut: import nélkül, tiszta TypeScript.
//
// A szerver mindig kifejezetten adja át a gyártó pénznemét (formatMoney(value, tenant.currency)).
// A böngészőben egy oldal egy gyártót mutat, ezért ott a TenantProvider egyszer beállítja a
// megjelenítési pénznemet (setDisplayCurrency), és a felület a formatPrice-szal formáz.

export type Currency = 'HUF' | 'EUR'

export const CURRENCIES: readonly Currency[] = ['HUF', 'EUR']

interface CurrencyInfo {
  /** Számformázás nyelvi kódja. */
  locale: string
  /** Ártételek kerekítési lépcsője (HUF: 1000 Ft, EUR: 1 €). */
  step: number
  /** Rövid egységjel a mezőcímkékhez (pl. „Ft / m²”, „€ / m²”). */
  symbol: string
}

export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  HUF: { locale: 'hu-HU', step: 1000, symbol: 'Ft' },
  // Osztrák formázás: „€ 12.345”. Egész euró: az irányár és az ajánlat is egész euróban számol.
  EUR: { locale: 'de-AT', step: 1, symbol: '€' },
}

const FORMATS = new Map<Currency, Intl.NumberFormat>()

function format(currency: Currency) {
  let value = FORMATS.get(currency)
  if (!value) {
    value = new Intl.NumberFormat(CURRENCY_INFO[currency].locale, { style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 })
    FORMATS.set(currency, value)
  }
  return value
}

/** Összeg a megadott pénznemben, egészre kerekítve (pl. „1 234 000 Ft”, „€ 12.345”). */
export function formatMoney(value: number, currency: Currency): string {
  // A -0 ne jelenjen meg „-0 Ft”-ként.
  const rounded = Math.round(value) || 0
  return format(currency).format(rounded)
}

/** Ártétel kerekítése a pénznem lépcsőjére. */
export function roundMoney(value: number, currency: Currency): number {
  const step = CURRENCY_INFO[currency].step
  return (Math.round(value / step) * step) || 0
}

export const isCurrency = (value: unknown): value is Currency => value === 'HUF' || value === 'EUR'

let displayCurrency: Currency = 'HUF'

/** A böngészős felület pénzneme (a TenantProvider állítja). Szerveren ne használd. */
export function setDisplayCurrency(currency: Currency) {
  displayCurrency = currency
}

export const getDisplayCurrency = () => displayCurrency

/** Felületi árformázás a megjelenítési pénznemben. */
export const formatPrice = (value: number) => formatMoney(value, displayCurrency)

/** Egységjel a megjelenítési pénznemben (pl. „Ft”, „€”). */
export const priceSymbol = () => CURRENCY_INFO[displayCurrency].symbol

/**
 * Előjeles különbözet a felületen (pl. „+120 000 Ft”, „−€ 340”, „±0 Ft”). Nullának számít, ami a pénznem
 * kerekítési lépcsőjének felénél kisebb (HUF: 500 Ft, EUR: 0,50 €) — EUR-nál így egy 300 €-s felár nem tűnik el.
 */
export function signedPrice(value: number, currency: Currency = displayCurrency): string {
  if (Math.abs(value) < CURRENCY_INFO[currency].step / 2) return `±${formatMoney(0, currency)}`
  return `${value > 0 ? '+' : '−'}${formatMoney(Math.abs(value), currency)}`
}

/** Gyártói mezőcímke egysége a megjelenítési pénznemben: „Ft/m²” → „€/m²” (EUR gyártónál). */
export const unitLabel = (unit: string) => unit.replace(/^Ft\b/, CURRENCY_INFO[displayCurrency].symbol)

/** Árbeviteli mező léptetése: HUF 1000 Ft, EUR 10 €. */
export const priceInputStep = () => (displayCurrency === 'HUF' ? 1000 : 10)
