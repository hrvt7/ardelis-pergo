// Mennyezeti ventilátorok elhelyezése (3D és műszaki rajz közös forrása).
// A ventilátor egy keretgerendák közé feszített tartógerendán lóg; kettőnél a hosszabbik
// irányban, a felezőpontokban.
import type { PergolaConfig } from '../types/pergola'

/** Lapátátmérő (m) — 52"-os kültéri ventilátor. */
export const FAN_DIAMETER = 1.32
/** A lapátsík a gerenda alja alatt (m). */
export const FAN_DROP = 0.3
/** Ennél alacsonyabb szabad belmagasságnál figyelmeztetünk (a lapátok alatt ≥ 2,1 m maradjon). */
export const FAN_MIN_HEIGHT = 2.55

export interface FanLayout {
  /** Ventilátorok középpontja [x, z]. */
  positions: [number, number][]
  /** Tartógerendák: irány és helyzet. Az „x” irányú gerenda z-nél fut végig a szélességen. */
  bars: { along: 'x' | 'z'; at: number }[]
}

export function fanLayout(config: Pick<PergolaConfig, 'width' | 'depth' | 'fans'>): FanLayout {
  const count = Math.max(0, Math.min(2, config.fans ?? 0))
  if (count === 0) return { positions: [], bars: [] }
  if (count === 1) return { positions: [[0, 0]], bars: [{ along: 'x', at: 0 }] }
  return config.width >= config.depth
    ? { positions: [[-config.width / 4, 0], [config.width / 4, 0]], bars: [{ along: 'x', at: 0 }] }
    : { positions: [[0, -config.depth / 4], [0, config.depth / 4]], bars: [{ along: 'x', at: -config.depth / 4 }, { along: 'x', at: config.depth / 4 }] }
}
