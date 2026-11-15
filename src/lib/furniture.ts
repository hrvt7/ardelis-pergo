// Bútorcsomagok helyigénye a pergola alatt. A zóna a bútor + a használathoz
// szükséges szabad hely (székek kihúzása 75 cm, közlekedés legalább 60 cm).
import type { FurnitureSet, PergolaConfig } from '@/types/pergola'
import { isPack, packPlan, type PackItem, type PackPlan } from './usePacks'
import { localized, tr } from '../i18n/locale'

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

export const FURNITURE_SETS: Record<Exclude<FurnitureSet, 'none'>, FurnitureSpec> = localized(() => ({
  lounge: { label: tr('Pihenősarok', 'Lounge-Ecke'), people: tr('4–5 fő', '4–5 Pers.'), description: tr('3 személyes kanapé, dohányzóasztal', '3-Sitzer-Sofa, Couchtisch'), zone: [3.0, 2.6], parts: [{ kind: 'lounge', x: 0 }], seats: 5, repeatable: false },
  dining6: { label: tr('Étkező 6 főre', 'Essplatz für 6'), people: tr('6 fő', '6 Pers.'), description: tr('180 × 90 cm asztal, 6 szék', 'Tisch 180 × 90 cm, 6 Stühle'), zone: [3.0, 2.4], parts: [{ kind: 'dining6', x: 0 }], seats: 6, repeatable: true },
  dining8: { label: tr('Étkező 8 főre', 'Essplatz für 8'), people: tr('8 fő', '8 Pers.'), description: tr('220 × 100 cm asztal, 8 szék', 'Tisch 220 × 100 cm, 8 Stühle'), zone: [3.7, 2.5], parts: [{ kind: 'dining8', x: 0 }], seats: 8, repeatable: true },
  combo: { label: tr('Pihenő + étkező', 'Lounge + Essplatz'), people: tr('6 fő', '6 Pers.'), description: tr('Kanapé és 6 fős étkező egymás mellett', 'Sofa und Essplatz für 6 nebeneinander'), zone: [6.0, 2.6], parts: [{ kind: 'lounge', x: -1.5 }, { kind: 'dining6', x: 1.5 }], seats: 6, repeatable: false },
  spa: { label: tr('Jacuzzi', 'Whirlpool'), people: tr('5–6 fős', '5–6 Pers.'), description: tr('2 × 2 m-es jacuzzi lépcsővel, körben 30–60 cm szabad hellyel', 'Whirlpool 2 × 2 m mit Stufe, rundum 30–60 cm frei'), zone: [2.6, 2.6], parts: [{ kind: 'spa', x: 0 }], seats: 6, repeatable: false },
  loungeSpa: { label: tr('Pihenő + jacuzzi', 'Lounge + Whirlpool'), people: tr('kanapé + jacuzzi', 'Sofa + Whirlpool'), description: tr('3 személyes kanapé, dohányzóasztal és 2 × 2 m-es jacuzzi egymás mellett', '3-Sitzer-Sofa, Couchtisch und Whirlpool 2 × 2 m nebeneinander'), zone: [5.6, 2.6], parts: [{ kind: 'lounge', x: -1.3 }, { kind: 'spa', x: 1.5 }], seats: 5, repeatable: false },
  diningSpa: { label: tr('Étkező + jacuzzi', 'Essplatz + Whirlpool'), people: tr('6 fő + jacuzzi', '6 Pers. + Whirlpool'), description: tr('180 × 90 cm asztal 6 székkel és 2 × 2 m-es jacuzzi egymás mellett', 'Tisch 180 × 90 cm mit 6 Stühlen und Whirlpool 2 × 2 m nebeneinander'), zone: [5.6, 2.6], parts: [{ kind: 'dining6', x: -1.3 }, { kind: 'spa', x: 1.5 }], seats: 6, repeatable: false },
  // Vendéglátós és napozós elrendezések: kávézó-terasz, bárpult, nyugágyak.
  bistro: { label: tr('Bisztró', 'Bistro'), people: tr('4 fő', '4 Pers.'), description: tr('Két 70 cm-es kerek asztal, 2–2 székkel', 'Zwei runde Tische 70 cm, je 2 Stühle'), zone: [3.4, 2.4], parts: [{ kind: 'bistro', x: 0 }], seats: 4, repeatable: true },
  bar: { label: tr('Kültéri bár', 'Outdoor-Bar'), people: tr('4 fő', '4 Pers.'), description: tr('220 × 60 cm bárpult, 4 bárszék', 'Bartheke 220 × 60 cm, 4 Barhocker'), zone: [3.2, 2.3], parts: [{ kind: 'bar', x: 0 }], seats: 4, repeatable: false },
  sunbed: { label: tr('Napozó', 'Sonnenliegen'), people: tr('2 fő', '2 Pers.'), description: tr('Két nyugágy kisasztallal', 'Zwei Liegen mit Beistelltisch'), zone: [3.2, 2.4], parts: [{ kind: 'sunbed', x: 0 }], seats: 2, repeatable: true },
  // Használati csomagok: a pergola méretéhez igazodnak (usePacks.ts). A zóna a legkisebb méret, ahol értelmes az elrendezés.
  restaurant: { label: tr('Éttermi terasz', 'Gastgarten'), people: tr('asztalok rácsban', 'Tische im Raster'), description: tr('4 fős asztalok, a méretből adódó darabszámban, közlekedősávokkal', '4er-Tische, Anzahl nach Größe, mit Gehwegen'), zone: [4.0, 4.6], parts: [{ kind: 'dining6', x: 0 }], seats: 4, repeatable: false, pack: { audience: tr('Étterem, kávézó, szálloda terasza', 'Restaurant, Café, Hotelterrasse') } },
  summerKitchen: { label: tr('Nyári konyha', 'Outdoor-Küche'), people: tr('főzőzóna', 'Kochzone'), description: tr('Konyhasor a hátsó fal mentén: hűtő, grill, mosogató, munkafelületek; nagyobb mélységnél szigetpult bárszékekkel', 'Küchenzeile an der Rückwand: Kühlschrank, Grill, Spüle, Arbeitsflächen; bei größerer Tiefe Kochinsel mit Barhockern'), zone: [2.8, 2.2], parts: [{ kind: 'bar', x: 0 }], seats: 0, repeatable: false, pack: { audience: tr('Családi ház, vendégház, panzió', 'Einfamilienhaus, Gästehaus, Pension') } },
  kitchenDining: { label: tr('Nyári konyha + étkező', 'Outdoor-Küche + Essplatz'), people: tr('6–8 fő', '6–8 Pers.'), description: tr('Konyhasor és étkezőasztal egy tető alatt, tálalási távolsággal', 'Küchenzeile und Esstisch unter einem Dach, mit Servierabstand'), zone: [3.4, 4.2], parts: [{ kind: 'dining6', x: 0 }], seats: 6, repeatable: false, pack: { audience: tr('Családi ház, vendégház, panzió', 'Einfamilienhaus, Gästehaus, Pension') } },
  banquet: { label: tr('Bankett / rendezvény', 'Bankett / Event'), people: tr('hosszú asztalok', 'lange Tische'), description: tr('Hosszú asztalok 60 cm-es ülésosztással, sorok közt közlekedősávval', 'Lange Tische mit 60 cm Sitzteilung, Gehweg zwischen den Reihen'), zone: [4.2, 2.4], parts: [{ kind: 'dining6', x: 0 }], seats: 12, repeatable: false, pack: { audience: tr('Rendezvényhelyszín, borászat, szálloda', 'Eventlocation, Weingut, Hotel') } },
  mixed: { label: tr('Vegyes terasz', 'Gemischte Terrasse'), people: tr('pihenő, étkező, bisztró, bár', 'Lounge, Essplatz, Bistro, Bar'), description: tr('Váltakozó zónák: pihenősarok, étkező, bisztró-asztal, hátsó bárpult — nagy teraszon sem ismétlődik ugyanaz egymás mellett', 'Wechselnde Bereiche: Lounge, Essplatz, Bistrotisch, Bar hinten — auch auf großen Terrassen wiederholt sich nichts nebeneinander'), zone: [3.4, 2.8], parts: [{ kind: 'lounge', x: 0 }], seats: 11, repeatable: false, pack: { audience: tr('Szálloda, vendégház, étterem, családi terasz', 'Hotel, Gästehaus, Restaurant, Familienterrasse') } },
  barLounge: { label: tr('Bár + lounge', 'Bar + Lounge'), people: tr('bárpult és pihenő sarkok', 'Bartheke und Lounge-Ecken'), description: tr('Bárpult bárszékekkel a hátsó fal mentén, előtte pihenő sarkok', 'Bartheke mit Barhockern an der Rückwand, davor Lounge-Ecken'), zone: [3.4, 4.6], parts: [{ kind: 'lounge', x: 0 }], seats: 9, repeatable: false, pack: { audience: tr('Szálloda, borbár, étterem', 'Hotel, Weinbar, Restaurant') } },
}))

export const FURNITURE_ORDER: FurnitureSet[] = ['lounge', 'dining6', 'dining8', 'combo', 'bistro', 'bar', 'sunbed', 'spa', 'loungeSpa', 'diningSpa', 'none']
/** Használati csomagok a kiválasztóban, a lakossági bútorok után. */
/** A választó csoportjai: egy listában, használat szerint rendezve (a „Üresen” külön, a lista végén). */
export const FURNITURE_GROUPS: { id: string; label: string; sets: FurnitureSet[] }[] = localized(() => ([
  { id: 'home', label: tr('Otthon és pihenés', 'Zuhause und Entspannung'), sets: ['lounge', 'dining6', 'dining8', 'combo', 'sunbed'] },
  { id: 'kitchen', label: tr('Konyha és étkezés', 'Küche und Essen'), sets: ['summerKitchen', 'kitchenDining'] },
  { id: 'wellness', label: tr('Wellness', 'Wellness'), sets: ['spa', 'loungeSpa', 'diningSpa'] },
  { id: 'hospitality', label: tr('Vendéglátás és rendezvény', 'Gastronomie und Events'), sets: ['mixed', 'restaurant', 'bistro', 'bar', 'barLounge', 'banquet'] },
]))

export const PACK_ORDER: FurnitureSet[] = ['mixed', 'summerKitchen', 'kitchenDining', 'restaurant', 'banquet', 'barLounge']

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
