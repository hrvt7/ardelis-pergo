// Bútorcsomagok helyigénye a pergola alatt. A zóna a bútor + a használathoz
// szükséges szabad hely (székek kihúzása 75 cm, közlekedés legalább 60 cm).
import type { FurnitureSet, PergolaConfig } from '@/types/pergola'
import { isPack, packPlan, type PackItem, type PackPlan } from './usePacks'

export interface FurnitureSpec {
  label: string
  people: string
  description: string
  /** Helyigény bútorral és mozgástérrel együtt, méterben: [hossz, mélység]. */
  zone: [number, number]
  /** Az elemek a zónában, a hosszanti tengely mentén (m a középponttól): a 3D és a kanapé-nézet ebből dolgozik. */
  parts: { kind: 'lounge' | 'dining6' | 'dining8' | 'spa' | 'bistro' | 'bar' | 'sunbed'; x: number }[]
  /** Vendégek száma egy csomagban (a kapacitás-kijelzéshez). */
  seats: number
  /** Nagy teraszon ismételhető-e (étterem, kávézó). A jacuzzi és a bár egyedi, nem ismétlődik. */
  repeatable: boolean
  /** Használati csomag: a pergola méretéhez igazodó elrendezés (usePacks.ts), fix tájolással. */
  pack?: { audience: string }
}

export const FURNITURE_SETS: Record<Exclude<FurnitureSet, 'none'>, FurnitureSpec> = {
  lounge: { label: 'Pihenősarok', people: '4–5 fő', description: '3 személyes kanapé, dohányzóasztal', zone: [3.0, 2.6], parts: [{ kind: 'lounge', x: 0 }], seats: 5, repeatable: true },
  dining6: { label: 'Étkező 6 főre', people: '6 fő', description: '180 × 90 cm asztal, 6 szék', zone: [3.0, 2.4], parts: [{ kind: 'dining6', x: 0 }], seats: 6, repeatable: true },
  dining8: { label: 'Étkező 8 főre', people: '8 fő', description: '220 × 100 cm asztal, 8 szék', zone: [3.7, 2.5], parts: [{ kind: 'dining8', x: 0 }], seats: 8, repeatable: true },
  combo: { label: 'Pihenő + étkező', people: '6 fő', description: 'Kanapé és 6 fős étkező egymás mellett', zone: [6.0, 2.6], parts: [{ kind: 'lounge', x: -1.5 }, { kind: 'dining6', x: 1.5 }], seats: 6, repeatable: true },
  spa: { label: 'Jacuzzi', people: '5–6 fős', description: '2 × 2 m-es jacuzzi lépcsővel, körben 30–60 cm szabad hellyel', zone: [2.6, 2.6], parts: [{ kind: 'spa', x: 0 }], seats: 6, repeatable: false },
  loungeSpa: { label: 'Pihenő + jacuzzi', people: 'kanapé + jacuzzi', description: '3 személyes kanapé, dohányzóasztal és 2 × 2 m-es jacuzzi egymás mellett', zone: [5.6, 2.6], parts: [{ kind: 'lounge', x: -1.3 }, { kind: 'spa', x: 1.5 }], seats: 5, repeatable: false },
  diningSpa: { label: 'Étkező + jacuzzi', people: '6 fő + jacuzzi', description: '180 × 90 cm asztal 6 székkel és 2 × 2 m-es jacuzzi egymás mellett', zone: [5.6, 2.6], parts: [{ kind: 'dining6', x: -1.3 }, { kind: 'spa', x: 1.5 }], seats: 6, repeatable: false },
  // Vendéglátós és napozós elrendezések: kávézó-terasz, bárpult, nyugágyak.
  bistro: { label: 'Bisztró', people: '4 fő', description: 'Két 70 cm-es kerek asztal, 2–2 székkel', zone: [3.4, 2.4], parts: [{ kind: 'bistro', x: 0 }], seats: 4, repeatable: true },
  bar: { label: 'Kültéri bár', people: '4 fő', description: '220 × 60 cm bárpult, 4 bárszék', zone: [3.2, 2.3], parts: [{ kind: 'bar', x: 0 }], seats: 4, repeatable: false },
  sunbed: { label: 'Napozó', people: '2 fő', description: 'Két nyugágy kisasztallal', zone: [3.2, 2.4], parts: [{ kind: 'sunbed', x: 0 }], seats: 2, repeatable: true },
  // Használati csomagok: a pergola méretéhez igazodnak (usePacks.ts). A zóna a legkisebb méret, ahol értelmes az elrendezés.
  restaurant: { label: 'Éttermi terasz', people: 'asztalok rácsban', description: '4 fős asztalok, a méretből adódó darabszámban, közlekedősávokkal', zone: [4.0, 4.6], parts: [{ kind: 'dining6', x: 0 }], seats: 4, repeatable: false, pack: { audience: 'Étterem, kávézó, szálloda terasza' } },
  summerKitchen: { label: 'Nyári konyha', people: 'főzőzóna', description: 'Konyhasor a hátsó fal mentén: hűtő, grill, mosogató, munkafelületek; nagyobb mélységnél szigetpult bárszékekkel', zone: [2.8, 2.2], parts: [{ kind: 'bar', x: 0 }], seats: 0, repeatable: false, pack: { audience: 'Családi ház, vendégház, panzió' } },
  kitchenDining: { label: 'Nyári konyha + étkező', people: '6–8 fő', description: 'Konyhasor és étkezőasztal egy tető alatt, tálalási távolsággal', zone: [3.4, 4.2], parts: [{ kind: 'dining6', x: 0 }], seats: 6, repeatable: false, pack: { audience: 'Családi ház, vendégház, panzió' } },
  banquet: { label: 'Bankett / rendezvény', people: 'hosszú asztalok', description: 'Hosszú asztalok 60 cm-es ülésosztással, sorok közt közlekedősávval', zone: [4.2, 2.4], parts: [{ kind: 'dining6', x: 0 }], seats: 12, repeatable: false, pack: { audience: 'Rendezvényhelyszín, borászat, szálloda' } },
  barLounge: { label: 'Bár + lounge', people: 'bárpult és pihenő sarkok', description: 'Bárpult bárszékekkel a hátsó fal mentén, előtte pihenő sarkok', zone: [3.4, 4.6], parts: [{ kind: 'lounge', x: 0 }], seats: 9, repeatable: false, pack: { audience: 'Szálloda, borbár, étterem' } },
}

export const FURNITURE_ORDER: FurnitureSet[] = ['lounge', 'dining6', 'dining8', 'combo', 'bistro', 'bar', 'sunbed', 'spa', 'loungeSpa', 'diningSpa', 'none']
/** Használati csomagok a kiválasztóban, a lakossági bútorok után. */
export const PACK_ORDER: FurnitureSet[] = ['summerKitchen', 'kitchenDining', 'restaurant', 'banquet', 'barLounge']

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
  const fixed = !!FURNITURE_SETS[set].pack
  const along = check(a, b)
  const across = fixed ? 'no' as FitLevel : check(b, a)
  const alongWidth = fixed || rank[along] >= rank[across]
  const level = alongWidth ? along : across
  if (level === 'comfortable') return { level, alongWidth, suggestion: null }
  // Javaslat: a két elrendezés közül az, amelyik kisebb alapterülettel kényelmes.
  const options = (fixed ? [[a, b]] : [[a, b], [b, a]]).map(([zw, zd]) => {
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
  return (FURNITURE_SETS[set].pack ? [[a, b]] : [[a, b], [b, a]]).map(([zw, zd]) => ({ width: zw + FRAME - TIGHT, depth: zd + FRAME - TIGHT }))
}

export interface FurnitureCell { x: number; z: number }
export interface FurnitureLayout {
  /** Használati csomagnál a terv (elemek, ülőhelyek, m²/fő, megjegyzések); egyébként nincs. */
  pack?: PackPlan
  alongWidth: boolean
  /** A csomag példányai a zóna saját (elforgatás előtti) koordinátarendszerében, méterben. */
  cells: FurnitureCell[]
  /** Hány példány fér el (1, ha a csomag nem ismételhető vagy csak egy fér). */
  count: number
  /** Vendégek száma összesen (becsült, a csomagok névleges létszámából). */
  seats: number
}

/** Legfeljebb ennyi példányt rajzolunk: a 3D jelenet terhelése miatt. */
const MAX_CELLS = 12
/** Az egyenletesen szétosztott példányok közt legfeljebb ennyiszer akkora a távolság, mint a zóna (ne legyen „lógó” elrendezés). */
const MAX_STRETCH = 1.35

/**
 * Nagy pergolán (étterem, kávézó, rendezvény) a bútorcsomag a rendelkezésre álló helyen ismétlődik:
 * rácsban, a közlekedő sávokat a zónába beépített mozgástér adja. Kis pergolán egy példány marad, középen.
 */
export function furnitureLayout(set: FurnitureSet, config: Pick<PergolaConfig, 'width' | 'depth'>): FurnitureLayout | null {
  const fit = furnitureFit(set, config)
  if (!fit || set === 'none') return null
  const spec = FURNITURE_SETS[set]
  if (isPack(set)) {
    const plan = packPlan(set, config)
    return { pack: plan, alongWidth: true, cells: plan.items.map((item: PackItem) => ({ x: item.x, z: item.z })), count: plan.items.length, seats: plan.seats }
  }
  const [zoneLong, zoneShort] = spec.zone
  const single: FurnitureLayout = { alongWidth: fit.alongWidth, cells: [{ x: 0, z: 0 }], count: 1, seats: spec.seats }
  if (!spec.repeatable || fit.level !== 'comfortable') return single
  const availLong = (fit.alongWidth ? config.width : config.depth) - FRAME
  const availShort = (fit.alongWidth ? config.depth : config.width) - FRAME
  let cols = Math.max(1, Math.floor((availLong + 1e-9) / zoneLong))
  let rows = Math.max(1, Math.floor((availShort + 1e-9) / zoneShort))
  while (cols * rows > MAX_CELLS) { if (cols >= rows) cols -= 1; else rows -= 1 }
  if (cols * rows === 1) return single
  const pitchLong = Math.min(availLong / cols, zoneLong * MAX_STRETCH)
  const pitchShort = Math.min(availShort / rows, zoneShort * MAX_STRETCH)
  const cells: FurnitureCell[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) cells.push({ x: (col - (cols - 1) / 2) * pitchLong, z: (row - (rows - 1) / 2) * pitchShort })
  }
  return { alongWidth: fit.alongWidth, cells, count: cells.length, seats: cells.length * spec.seats }
}
