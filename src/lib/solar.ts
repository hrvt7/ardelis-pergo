// Napelemes tető (fix alumínium tetőre) — panelkiosztás, teljesítmény, termelés, érték.
//
// Alapadatok (2026):
// - Modul: 1134 × 1762 mm, 430 Wp (a piacon jellemző 108 cellás méret).
// - Fajlagos termelés: 900 kWh/kWp/év — Budapest 0–10° dőlésnél 1010–1103 kWh/kWp
//   (Global Solar Atlas, Baranyai et al. 2025), csökkentve a házfal árnyéka, a sík
//   felület szennyeződése és a rendszerveszteség miatt (konzervatív becslés).
// - Új rendszerek bruttó elszámolásban: a betáplált áram ~5 Ft/kWh, csak a saját
//   felhasználás ér a lakossági árat. Akkumulátor nélkül ~30% saját felhasználás.
import { TARIFF } from './energy'
import type { PergolaConfig } from '../types/pergola'

export const PANEL = { width: 1.134, length: 1.762, wp: 430, gap: 0.02 } as const
export const YIELD_KWH_PER_KWP = 900
export const SELF_USE_DEFAULT = 0.3
/** A tetőpanel szélétől tartott távolság (keret, vízelvezetés). */
const EDGE = 0.14

export interface PanelLayout {
  count: number
  cols: number
  rows: number
  /** A panel hosszabb oldala a pergola mélysége mentén fekszik-e. */
  portrait: boolean
  /** Panelközéppontok (x, z) méterben, a pergola közepéhez képest. */
  positions: [number, number][]
  kwp: number
  /** A panel mérete a tetőn: [x irány, z irány]. */
  size: [number, number]
}

/** A legtöbb panelt adó kiosztás (álló vagy fekvő), a tetőn középre igazítva. */
export function panelLayout(config: Pick<PergolaConfig, 'width' | 'depth'>): PanelLayout {
  const usableW = config.width - 2 * EDGE
  const usableD = config.depth - 2 * EDGE
  const fit = (span: number, size: number) => Math.max(0, Math.floor((span + PANEL.gap) / (size + PANEL.gap)))
  const options = [true, false].map((portrait) => {
    const sx = portrait ? PANEL.width : PANEL.length
    const sz = portrait ? PANEL.length : PANEL.width
    const cols = fit(usableW, sx)
    const rows = fit(usableD, sz)
    return { portrait, cols, rows, sx, sz }
  })
  const best = options.sort((a, b) => b.cols * b.rows - a.cols * a.rows)[0]
  const positions: [number, number][] = []
  const totalW = best.cols * best.sx + Math.max(0, best.cols - 1) * PANEL.gap
  const totalD = best.rows * best.sz + Math.max(0, best.rows - 1) * PANEL.gap
  for (let row = 0; row < best.rows; row += 1) for (let col = 0; col < best.cols; col += 1) {
    positions.push([-totalW / 2 + best.sx / 2 + col * (best.sx + PANEL.gap), -totalD / 2 + best.sz / 2 + row * (best.sz + PANEL.gap)])
  }
  const count = best.cols * best.rows
  return { count, cols: best.cols, rows: best.rows, portrait: best.portrait, positions, kwp: (count * PANEL.wp) / 1000, size: [best.sx, best.sz] }
}

export interface SolarEstimate {
  layout: PanelLayout
  /** Éves termelés, kWh. */
  production: number
  /** Saját felhasználás, kWh. */
  selfUse: number
  /** Betáplálás, kWh. */
  exported: number
  /** Éves pénzbeli érték, Ft. */
  value: number
  /** Ft/kWh, amivel a saját felhasználás számol. */
  selfRate: number
}

/** A termelés éves értéke: a saját felhasználás a háztartás sávja szerint, a többi betáplálási áron. */
export function estimateSolar(config: Pick<PergolaConfig, 'width' | 'depth'>, householdKwh: number | null, selfUseShare = SELF_USE_DEFAULT): SolarEstimate {
  const layout = panelLayout(config)
  const production = layout.kwp * YIELD_KWH_PER_KWP
  const selfUse = production * selfUseShare
  const exported = production - selfUse
  // A saját felhasználás a háztartás legdrágább kWh-it váltja ki (felülről). Ismeretlen
  // fogyasztásnál óvatosan a kedvezményes árral számolunk, hogy ne ígérjünk többet.
  const aboveShare = householdKwh === null ? 0 : Math.min(selfUse, Math.max(0, householdKwh - TARIFF.limit))
  const saved = aboveShare * TARIFF.above + (selfUse - aboveShare) * TARIFF.below
  const selfRate = selfUse > 0 ? saved / selfUse : TARIFF.below
  const value = saved + exported * TARIFF.feedIn
  return { layout, production, selfUse, exported, value, selfRate }
}

/** Nettó ár a gyártói kWp-árból (a beépítéssel együtt, inverter-csatlakozással). */
export const solarNet = (config: Pick<PergolaConfig, 'width' | 'depth'>, perKwpNet: number) => panelLayout(config).kwp * perKwpNet
