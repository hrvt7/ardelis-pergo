// Éves üzemeltetési költség (áram) — tiszta TypeScript, tesztelhető.
//
// Forrás és módszer (2026. október):
// - Lakossági egyetemes szolgáltatás (A1): 36,386 Ft/kWh bruttó a 2523 kWh/év kedvezményes
//   mennyiségig, felette 70,104 Ft/kWh (rendszerhasználati díjjal, ÁFA-val). MVM Next.
// - A pergola fogyasztása a háztartás fogyasztására rakódik, ezért a határköltséggel számolunk:
//   ha nem ismert a háztartás fogyasztása, a felső sávval (a számla ennél nem lesz kevesebb).
// - Fogyasztók: infrapanel (gyártói névleges teljesítmény), LED (W/fm), motorok (Somfy adatlapok:
//   lamellás 45 W, textil 240 W, ZIP ~120 W menetidőben), készenlét (vezérlő, tápegység, átjáró).
import { closedSegments } from './sides'
import type { PergolaConfig } from '../types/pergola'

export const TARIFF = {
  /** Az árak érvényességének jelölése a felületen. */
  asOf: '2026. október',
  source: 'MVM Next lakossági egyetemes szolgáltatás (A1)',
  /** Ft/kWh bruttó, a kedvezményes mennyiségig. */
  below: 36.386,
  /** Ft/kWh bruttó, a kedvezményes mennyiség felett. */
  above: 70.104,
  /** kWh/év kedvezményes mennyiség (mérési pontonként). */
  limit: 2523,
  /** Bruttó elszámolású napelemes betáplálás, Ft/kWh (elosztónként 4,94–5,25). */
  feedIn: 5,
} as const

/** A szabadtéri szezon napjai (április–október). */
export const SEASON_DAYS = 214

export interface EnergyUsage {
  /** A teraszfűtés üzemórái évente (összesen, panelenként). */
  heaterHours: number
  /** Fél teljesítményen használja-e a fűtést. */
  heaterHalf: boolean
  /** LED-világítás óra/este a szezonban. */
  ledHoursPerEvening: number
  /** A háztartás éves fogyasztása a pergola nélkül (kWh); null = nem ismert → felső sáv. */
  householdKwh: number | null
}

export const DEFAULT_USAGE: EnergyUsage = { heaterHours: 120, heaterHalf: false, ledHoursPerEvening: 3, householdKwh: null }

/** Kültéri DC mennyezeti ventilátor közepes fokozaton; június–augusztus esténként. */
const FAN_W = 35
const FAN_HOURS = 3
const FAN_DAYS = 92
/** Okosotthon-központ (Wi-Fi/Zigbee átjáró) készenléti fogyasztása. */
const SMART_HOME_W = 0.9

export interface EnergyLine { id: 'heaters' | 'led' | 'motors' | 'speakers' | 'fans' | 'climate' | 'standby'; label: string; detail: string; kwh: number }

export interface EnergyEstimate {
  lines: EnergyLine[]
  kwh: number
  /** Éves költség, Ft (bruttó). */
  cost: number
  /** Átlagos Ft/kWh, amivel a pergola fogyasztása elszámolódik. */
  rate: number
  /** Melyik sávban számoltunk. */
  band: 'below' | 'above' | 'split'
  hasElectrics: boolean
}

const LED_W_PER_M = 10
/** RGB+W szalag: színes jeleneteknél átlagosan ennyivel több (a fehér csatorna mellett). */
const LED_RGB_FACTOR = 1.3
const SPEAKER_W = 10
const SPEAKER_HOURS = 300

/** A pergola elektromos fogyasztói egy évre, kWh-ban. */
export function energyLines(config: PergolaConfig, usage: EnergyUsage, heaterWatts = 2000): EnergyLine[] {
  const lines: EnergyLine[] = []
  const perimeter = 2 * (config.width + config.depth)
  if (config.heaters > 0) {
    const kw = (heaterWatts / 1000) * (usage.heaterHalf ? 0.5 : 1)
    lines.push({ id: 'heaters', label: 'Teraszfűtés', detail: `${config.heaters} × ${(heaterWatts / 1000).toLocaleString('hu-HU')} kW${usage.heaterHalf ? ' (fél teljesítmény)' : ''} · ${usage.heaterHours} óra/év`, kwh: config.heaters * kw * usage.heaterHours })
  }
  if (config.led) {
    const watts = perimeter * LED_W_PER_M * (config.ledRgb ? LED_RGB_FACTOR : 1)
    lines.push({ id: 'led', label: config.ledRgb ? 'RGB+W LED-világítás' : 'LED-világítás', detail: `${Math.round(watts)} W · ${usage.ledHoursPerEvening.toLocaleString('hu-HU')} óra/este, ${SEASON_DAYS} este`, kwh: (watts * usage.ledHoursPerEvening * SEASON_DAYS) / 1000 })
  }
  // Motorok: percenkénti menetidő × napi mozgatás. Elhanyagolható, de kiírjuk, mert a vevő kérdezi.
  const zipCount = closedSegments(config).filter((segment) => segment.type === 'zip').length
  const roofMotor = config.roof === 'louvered' ? { w: 45, cycles: 4, days: 365 } : config.roof === 'retractable' ? { w: 72, cycles: 4, days: 365 } : config.roof === 'fabric' ? { w: 240, cycles: 2, days: SEASON_DAYS } : null
  const motorKwh = (roofMotor ? (roofMotor.w * (1 / 60) * roofMotor.cycles * roofMotor.days) / 1000 : 0) + (zipCount * 120 * (1 / 60) * 2 * SEASON_DAYS) / 1000
  if (roofMotor || zipCount) lines.push({ id: 'motors', label: 'Motorok', detail: [roofMotor && 'tető', zipCount && `${zipCount} ZIP`].filter(Boolean).join(' + ') + ' · napi néhány perc menetidő', kwh: motorKwh })
  if (config.speakers) lines.push({ id: 'speakers', label: 'Hangrendszer', detail: `${SPEAKER_W} W átlag · ${SPEAKER_HOURS} óra/év`, kwh: (SPEAKER_W * SPEAKER_HOURS) / 1000 })
  // Készenlét: vezérlő/tápegység/rádióvevő folyamatosan (Somfy TaHoma 0,92 W, io vevők ~0,4–0,5 W).
  if (config.fans) lines.push({ id: 'fans', label: 'Mennyezeti ventilátor', detail: `${config.fans} × ${FAN_W} W (DC) · ${FAN_HOURS} óra/nap, ${FAN_DAYS} nyári nap`, kwh: (config.fans * FAN_W * FAN_HOURS * FAN_DAYS) / 1000 })
  // Zárt tér klímája és padlófűtése (tájékoztató átlag: split ~0,9 kW × 1 000 üzemóra, padlófűtés 70 W/m² × 700 óra).
  if (config.climate === 'split' || config.climate === 'both') {
    lines.push({ id: 'climate', label: 'Split klíma (fűtés + hűtés)', detail: '~0,9 kW átlag · ~1 000 üzemóra/év', kwh: 900 })
  }
  if (config.climate === 'underfloor' || config.climate === 'both') {
    const area = config.width * config.depth
    lines.push({ id: 'climate', label: 'Padlófűtés', detail: `${Math.round(area * 10) / 10} m² · ~70 W/m² · ~700 üzemóra/év`, kwh: (area * 70 * 700) / 1000 })
  }
  const standbyW = (config.smartHome ? SMART_HOME_W : 0) + (config.roofShade ? 0.4 : 0) + (config.fans ? 0.3 * config.fans : 0) + (roofMotor ? 1 : 0) + zipCount * 0.45 + (config.sensors ? 1.2 : 0) + (config.led ? 0.5 : 0) + (config.speakers ? 0.5 : 0) + (config.heaters > 0 ? 0.3 : 0)
  if (standbyW > 0) lines.push({ id: 'standby', label: 'Készenlét', detail: `${standbyW.toLocaleString('hu-HU', { maximumFractionDigits: 1 })} W folyamatosan (vezérlő, tápegység, vevők)`, kwh: (standbyW * 8760) / 1000 })
  return lines
}

/** Az extra fogyasztás költsége a háztartás sávja szerint (bruttó Ft). */
export function marginalCost(extraKwh: number, householdKwh: number | null): { cost: number; band: EnergyEstimate['band'] } {
  if (extraKwh <= 0) return { cost: 0, band: householdKwh === null ? 'above' : 'below' }
  if (householdKwh === null || householdKwh >= TARIFF.limit) return { cost: extraKwh * TARIFF.above, band: 'above' }
  if (householdKwh + extraKwh <= TARIFF.limit) return { cost: extraKwh * TARIFF.below, band: 'below' }
  const cheap = TARIFF.limit - householdKwh
  return { cost: cheap * TARIFF.below + (extraKwh - cheap) * TARIFF.above, band: 'split' }
}

export function estimateEnergy(config: PergolaConfig, usage: EnergyUsage = DEFAULT_USAGE, heaterWatts = 2000): EnergyEstimate {
  const lines = energyLines(config, usage, heaterWatts)
  const kwh = lines.reduce((sum, line) => sum + line.kwh, 0)
  const { cost, band } = marginalCost(kwh, usage.householdKwh)
  return { lines, kwh, cost, rate: kwh > 0 ? cost / kwh : TARIFF.above, band, hasElectrics: lines.length > 0 }
}

/** Kerekítés a megjelenítéshez: 100 Ft-ra, hogy ne tűnjön hamis pontosságnak. */
export const roundCost = (value: number) => Math.round(value / 100) * 100
