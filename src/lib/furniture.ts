// Bútorcsomagok helyigénye a pergola alatt. A zóna a bútor + a használathoz
// szükséges szabad hely (székek kihúzása 75 cm, közlekedés legalább 60 cm).
import type { FurnitureSet, PergolaConfig } from '@/types/pergola'

export interface FurnitureSpec {
  label: string
  people: string
  description: string
  /** Helyigény bútorral és mozgástérrel együtt, méterben: [hossz, mélység]. */
  zone: [number, number]
}

export const FURNITURE_SETS: Record<Exclude<FurnitureSet, 'none'>, FurnitureSpec> = {
  lounge: { label: 'Pihenősarok', people: '4–5 fő', description: '3 személyes kanapé, dohányzóasztal', zone: [3.0, 2.6] },
  dining6: { label: 'Étkező 6 főre', people: '6 fő', description: '180 × 90 cm asztal, 6 szék', zone: [3.0, 2.4] },
  dining8: { label: 'Étkező 8 főre', people: '8 fő', description: '220 × 100 cm asztal, 8 szék', zone: [3.7, 2.5] },
  combo: { label: 'Pihenő + étkező', people: '6 fő', description: 'Kanapé és 6 fős étkező egymás mellett', zone: [6.0, 2.6] },
}

export const FURNITURE_ORDER: FurnitureSet[] = ['lounge', 'dining6', 'dining8', 'combo', 'none']

/** Az oszlopok és a keret miatt a hasznos belső méret ennyivel kisebb. */
const FRAME = 0.2
/** Ennyivel kisebb hely még használható, csak szűkösebb (pl. 60 cm helyett 45 cm közlekedés). */
const TIGHT = 0.3

export type FitLevel = 'comfortable' | 'tight' | 'no'

export interface FitResult {
  level: FitLevel
  /** A zóna iránya: a hosszabb oldala a pergola szélessége mentén fekszik-e. */
  alongWidth: boolean
  /** A legkisebb méret, ahol kényelmesen elfér (a mostaninál nem kisebb), vagy null, ha nem kell. */
  suggestion: { width: number; depth: number } | null
}

const up = (value: number) => Math.ceil(value * 10 - 1e-9) / 10

export function furnitureFit(set: FurnitureSet, config: Pick<PergolaConfig, 'width' | 'depth'>, limits?: { width: [number, number]; depth: [number, number] }): FitResult | null {
  if (set === 'none') return null
  const [a, b] = FURNITURE_SETS[set].zone
  const innerW = config.width - FRAME
  const innerD = config.depth - FRAME
  const check = (zw: number, zd: number): FitLevel => (zw <= innerW + 1e-9 && zd <= innerD + 1e-9 ? 'comfortable' : zw <= innerW + TIGHT && zd <= innerD + TIGHT ? 'tight' : 'no')
  const rank = { comfortable: 2, tight: 1, no: 0 }
  const along = check(a, b)
  const across = check(b, a)
  const alongWidth = rank[along] >= rank[across]
  const level = alongWidth ? along : across
  if (level === 'comfortable') return { level, alongWidth, suggestion: null }
  // Javaslat: a két elrendezés közül az, amelyik kisebb alapterülettel kényelmes.
  const options = [[a, b], [b, a]].map(([zw, zd]) => {
    let width = Math.max(config.width, up(zw + FRAME))
    let depth = Math.max(config.depth, up(zd + FRAME))
    if (limits) {
      if (width > limits.width[1] + 1e-9 || depth > limits.depth[1] + 1e-9) return null
      width = Math.max(width, limits.width[0])
      depth = Math.max(depth, limits.depth[0])
    }
    return { width, depth }
  }).filter((item): item is { width: number; depth: number } => item !== null)
  options.sort((x, y) => x.width * x.depth - y.width * y.depth)
  return { level, alongWidth, suggestion: options[0] ?? null }
}

/** A legkisebb méret, amelynél a bútor legalább szűkösen elfér (a költségkeret-tervezőhöz). */
export function furnitureMinimum(set: FurnitureSet): { width: number; depth: number }[] {
  if (set === 'none') return []
  const [a, b] = FURNITURE_SETS[set].zone
  return [[a, b], [b, a]].map(([zw, zd]) => ({ width: zw + FRAME - TIGHT, depth: zd + FRAME - TIGHT }))
}
