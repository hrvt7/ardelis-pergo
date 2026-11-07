// Használati csomagok: éttermi terasz, nyári konyha, bankett, bár-lounge. A bútorcsomagokkal szemben ezek
// a pergola méretéhez igazodnak: a konyhasor a hátsó fal mentén fut, az asztalok rácsban állnak, a közlekedősávok
// betartásával. Tiszta számítás (nincs 3D-függőség), így tesztelhető. Koordináták: x a szélesség, z a mélység mentén,
// a hátsó fal / hátsó oszlopsor z < 0 oldalon van, minden elem előlapja +z felé néz (forgatás 0).
import type { FurnitureSet, PergolaConfig } from '@/types/pergola'

export type PackKind = 'table4' | 'longTable' | 'kitchen' | 'island' | 'barRun' | 'dining6' | 'dining8' | 'lounge'
export interface PackItem { kind: PackKind; x: number; z: number; rot: number; /** Hossz méterben (konyhasor, bár, hosszú asztal, sziget). */ length?: number; seats?: number }

export type PackId = Extract<FurnitureSet, 'restaurant' | 'summerKitchen' | 'kitchenDining' | 'banquet' | 'barLounge' | 'mixed'>
export const PACK_IDS: PackId[] = ['restaurant', 'summerKitchen', 'kitchenDining', 'banquet', 'barLounge', 'mixed']
export const isPack = (set: FurnitureSet): set is PackId => (PACK_IDS as string[]).includes(set)

export interface PackPlan {
  items: PackItem[]
  /** Ülőhelyek száma összesen (a székek és bárszékek tényleges darabszáma). */
  seats: number
  /** A használt terület (az elemek befoglaló téglalapja), a középponttal. */
  bounds: { cx: number; cz: number; w: number; d: number }
  /** m² / ülőhely a teljes belső területre számolva, vagy null, ha nincs ülőhely. */
  areaPerSeat: number | null
  /** Vendéglátós irányérték m²/fő (átszámított nemzetközi tervezési ajánlás), ha van értelmezhető. */
  benchmark: [number, number] | null
  /** Rövid, a tervezőnek szóló megjegyzések (pl. a sziget csak nagyobb mélységnél fér el). */
  notes: string[]
}

const FRAME = 0.2
/** A hátsó fal és a konyhasor közti rés (oszlop, keret). */
const BACK_GAP = 0.1
const KITCHEN_DEPTH = 0.65
/** Munkasáv a konyhasor előtt (főzés, két ember elfér egymás mellett). */
const WORK_AISLE = 1.1
const SEAT_PITCH = 0.6

/** Kényelmes ülésenkénti helyigény vendéglátásban, m² (angolszász irányelv: 12–15 ft² = 1,1–1,4 m²; szálloda 1,4–1,7; bankett 0,9–1,0). */
const BENCH = { restaurant: [1.1, 1.4] as [number, number], banquet: [0.9, 1.0] as [number, number], hotel: [1.4, 1.7] as [number, number] }

/** A pack elemeinek befoglaló téglalapja; üres elemlistára nulla méret. */
function boundsOf(items: PackItem[], extent: (item: PackItem) => [number, number]) {
  if (!items.length) return { cx: 0, cz: 0, w: 0, d: 0 }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  for (const item of items) {
    const [w, d] = extent(item)
    x0 = Math.min(x0, item.x - w / 2); x1 = Math.max(x1, item.x + w / 2)
    z0 = Math.min(z0, item.z - d / 2); z1 = Math.max(z1, item.z + d / 2)
  }
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 }
}

const extentOf = (item: PackItem): [number, number] => {
  const length = item.length ?? 1
  switch (item.kind) {
    case 'table4': return [2.0, 2.3]
    case 'longTable': return [length + 0.5, 1.8]
    case 'kitchen': return [length, KITCHEN_DEPTH]
    case 'island': return [length, 0.9 + 0.5]
    case 'barRun': return [length, 0.7 + 0.6]
    case 'dining8': return [3.7, 2.5]
    case 'dining6': return [3.0, 2.4]
    default: return [3.0, 2.6]
  }
}

const inner = (config: Pick<PergolaConfig, 'width' | 'depth'>) => ({ w: config.width - FRAME, d: config.depth - FRAME })
const floorTo = (value: number, step: number) => Math.floor(value / step + 1e-9) * step
const round2 = (value: number) => Math.round(value * 100) / 100

/** Konyhasor hossza a belső szélességhez: 2,4–4,8 m, 30 cm-es lépcsőkben. */
export function kitchenLength(innerWidth: number) {
  return Math.min(4.8, Math.max(2.4, floorTo(innerWidth - 0.4, 0.3)))
}

/** A konyhasor moduljai balról jobbra: hűtő, előkészítő, grill, előkészítő, mosogató, előkészítő; rövidebb soron a fontosak maradnak. */
export type KitchenModule = 'fridge' | 'prep' | 'grill' | 'sink'
const MODULE_WIDTH: Record<KitchenModule, number> = { fridge: 0.6, prep: 0.6, grill: 0.9, sink: 0.6 }
export function kitchenModules(length: number): { kind: KitchenModule; width: number }[] {
  const display: KitchenModule[] = ['fridge', 'prep', 'grill', 'prep', 'sink', 'prep']
  const priority = [2, 4, 0, 1, 3, 5] // grill, mosogató, hűtő, majd az előkészítők
  const keep = new Set<number>()
  let used = 0
  for (const index of priority) {
    const width = MODULE_WIDTH[display[index]]
    if (used + width <= length + 1e-9) { keep.add(index); used += width }
  }
  const modules = display.map((kind, index) => ({ kind, index })).filter((entry) => keep.has(entry.index)).map((entry) => ({ kind: entry.kind, width: MODULE_WIDTH[entry.kind] }))
  // A maradék hossz az előkészítő felületekre kerül (vagy, ha nincs, a grill melletti munkafelületre).
  const extra = length - used
  const preps = modules.filter((module) => module.kind === 'prep')
  const targets = preps.length ? preps : modules.filter((module) => module.kind === 'grill')
  targets.forEach((module) => { module.width = round2(module.width + extra / targets.length) })
  return modules
}

function restaurant(config: Pick<PergolaConfig, 'width' | 'depth'>): PackPlan {
  const { w, d } = inner(config)
  const cols = Math.max(1, Math.floor((w + 1e-9) / 2.0))
  const rows = Math.max(1, Math.floor((d + 1e-9) / 2.3))
  const pitchX = Math.min(w / cols, 2.0 * 1.3)
  const pitchZ = Math.min(d / rows, 2.3 * 1.3)
  const items: PackItem[] = []
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) items.push({ kind: 'table4', x: round2((col - (cols - 1) / 2) * pitchX), z: round2((row - (rows - 1) / 2) * pitchZ), rot: 0, seats: 4 })
  const seats = items.length * 4
  return { items, seats, bounds: boundsOf(items, extentOf), areaPerSeat: round2((w * d) / seats), benchmark: BENCH.restaurant, notes: ['Asztalok közt legalább 1,0 m, a székek mögött közlekedősáv: a rács ezt tartja.'] }
}

function summerKitchen(config: Pick<PergolaConfig, 'width' | 'depth'>): PackPlan {
  const { w, d } = inner(config)
  const length = kitchenLength(w)
  const runZ = -d / 2 + BACK_GAP + KITCHEN_DEPTH / 2
  const items: PackItem[] = [{ kind: 'kitchen', x: 0, z: round2(runZ), rot: 0, length }]
  const notes: string[] = ['Munkafelület a grill két oldalán, a mosogató mellett szabad fal: a főzőzóna szélvédett.']
  let seats = 0
  const islandNeed = KITCHEN_DEPTH + BACK_GAP + WORK_AISLE + 0.9 + 0.5 + 0.2
  if (d >= islandNeed) {
    const islandLength = Math.min(length, 2.4)
    const islandZ = runZ + KITCHEN_DEPTH / 2 + WORK_AISLE + 0.45
    seats = Math.floor(islandLength / SEAT_PITCH)
    items.push({ kind: 'island', x: 0, z: round2(islandZ), rot: 0, length: islandLength, seats })
  } else notes.push(`Szigetpult és bárszékek ${(islandNeed + FRAME).toFixed(1).replace('.', ',')} m mélységtől férnek el.`)
  return { items, seats, bounds: boundsOf(items, extentOf), areaPerSeat: seats ? round2((w * d) / seats) : null, benchmark: null, notes }
}

function kitchenDining(config: Pick<PergolaConfig, 'width' | 'depth'>): PackPlan {
  const { w, d } = inner(config)
  const length = kitchenLength(w)
  const runZ = -d / 2 + BACK_GAP + KITCHEN_DEPTH / 2
  const items: PackItem[] = [{ kind: 'kitchen', x: 0, z: round2(runZ), rot: 0, length }]
  const tableKind: PackKind = w >= 4.2 ? 'dining8' : 'dining6'
  const [tw, td] = extentOf({ kind: tableKind, x: 0, z: 0, rot: 0 })
  const cols = Math.max(1, Math.floor((w + 1e-9) / tw))
  const pitch = Math.min(w / cols, tw * 1.25)
  const freeFrom = runZ + KITCHEN_DEPTH / 2 + WORK_AISLE - 0.1
  const tableZ = Math.max(freeFrom + td / 2, Math.min(d / 2 - td / 2, freeFrom + (d / 2 - freeFrom) / 2))
  let seats = 0
  for (let col = 0; col < cols; col++) { items.push({ kind: tableKind, x: round2((col - (cols - 1) / 2) * pitch), z: round2(tableZ), rot: 0, seats: tableKind === 'dining8' ? 8 : 6 }); seats += tableKind === 'dining8' ? 8 : 6 }
  // A konyhasor területe miatt a m²/fő itt nem összehasonlítható a vendéglátós irányértékkel, ezért nem jelenítjük meg.
  return { items, seats, bounds: boundsOf(items, extentOf), areaPerSeat: null, benchmark: null, notes: ['A konyhasor és az étkező egy tető alatt: rövid útvonal a tálaláshoz.'] }
}

function banquet(config: Pick<PergolaConfig, 'width' | 'depth'>): PackPlan {
  const { w, d } = inner(config)
  const band = 1.8 // asztal 0,9 m + székek 2 × 0,45 m
  const rows = Math.max(1, Math.floor((d - 0.6 + 0.8) / (band + 0.8) + 1e-9))
  const maxLength = 6.0
  const cols = Math.max(1, Math.floor((w - 0.6 + 1.0) / (maxLength + 1.0) + 1e-9))
  const length = cols > 1 ? maxLength : Math.min(maxLength, Math.max(1.8, floorTo(w - 0.6, SEAT_PITCH)))
  const pitchX = w / cols
  const pitchZ = rows > 1 ? Math.min((d - band - 0.6) / (rows - 1), band + 1.1) : 0
  const perSide = Math.floor(length / SEAT_PITCH + 1e-9)
  const items: PackItem[] = []
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) items.push({ kind: 'longTable', x: round2((col - (cols - 1) / 2) * pitchX), z: round2((row - (rows - 1) / 2) * pitchZ), rot: 0, length, seats: perSide * 2 })
  const seats = items.length * perSide * 2
  return { items, seats, bounds: boundsOf(items, extentOf), areaPerSeat: round2((w * d) / seats), benchmark: BENCH.banquet, notes: ['Hosszú asztalok 60 cm-es ülésosztással; a sorok közt legalább 0,8 m közlekedősáv marad.'] }
}

function barLounge(config: Pick<PergolaConfig, 'width' | 'depth'>): PackPlan {
  const { w, d } = inner(config)
  const length = Math.min(4.8, Math.max(2.4, floorTo(w - 0.4, 0.3)))
  const barZ = -d / 2 + BACK_GAP + 0.35
  const stools = Math.floor(length / 0.55)
  const items: PackItem[] = [{ kind: 'barRun', x: 0, z: round2(barZ), rot: 0, length, seats: stools }]
  const loungeStart = barZ + 0.35 + 0.6 + 0.6 + 1.3 // pult + bárszék + közlekedés + a lounge-zóna fele
  const loungeZ = Math.min(d / 2 - 1.3, loungeStart)
  const zones = fillRow(w, loungeZ, 0)
  const items2: PackItem[] = [...items, ...zones]
  const seats = stools + zones.reduce((sum, item) => sum + (item.seats ?? 0), 0)
  return { items: items2, seats, bounds: boundsOf(items2, extentOf), areaPerSeat: round2((w * d) / seats), benchmark: BENCH.hotel, notes: ['Bárpult a hátsó fal mentén, előtte váltakozó pihenő- és étkezőzónák: esti vendégtér szállodának, bornak, koktélbárnak.'] }
}

/** A zónák sorrendje egy soron belül: a szomszédos elemek soha nem egyformák (pihenő → étkező → bisztró-asztal → tükrözött pihenő …). */
const ZONE_CYCLE: { kind: PackKind; width: number; seats: number; rot: number }[] = [
  { kind: 'lounge', width: 3.0, seats: 5, rot: 0 },
  { kind: 'dining6', width: 3.0, seats: 6, rot: 0 },
  { kind: 'table4', width: 2.0, seats: 4, rot: 0 },
  { kind: 'lounge', width: 3.0, seats: 5, rot: Math.PI },
]
const ZONE_GAP = 0.3

/** Egy sor zóna a szélességen: a ciklus elemei egymás után, amíg férnek; az eltolás (offset) a következő sort más elemmel indítja. */
function fillRow(innerWidth: number, z: number, offset: number): PackItem[] {
  const picked: typeof ZONE_CYCLE = []
  let used = 0
  for (let i = 0; i < ZONE_CYCLE.length * 2; i++) {
    const zone = ZONE_CYCLE[(i + offset) % ZONE_CYCLE.length]
    const need = zone.width + (picked.length ? ZONE_GAP : 0)
    if (used + need > innerWidth + 1e-9) break
    picked.push(zone); used += need
  }
  if (!picked.length) picked.push(ZONE_CYCLE[(offset + 2) % ZONE_CYCLE.length])
  // A maradék helyet egyenletesen osztjuk szét, de a hézag legfeljebb 1,2 m: ne lógjanak szét az elemek.
  const free = Math.max(0, innerWidth - picked.reduce((sum, zone) => sum + zone.width, 0))
  const gap = picked.length > 1 ? Math.min(1.2, free / (picked.length - 1)) : 0
  const total = picked.reduce((sum, zone) => sum + zone.width, 0) + gap * (picked.length - 1)
  let cursor = -total / 2
  return picked.map((zone) => {
    const x = cursor + zone.width / 2
    cursor += zone.width + gap
    return { kind: zone.kind, x: round2(x), z: round2(z), rot: zone.rot, seats: zone.seats }
  })
}

/** Vegyes terasz: hátsó bárpult (ha elég mély), előtte egy vagy több sor váltakozó zóna. Nagy pergolán sem ismétlődik ugyanaz egymás mellett. */
function mixed(config: Pick<PergolaConfig, 'width' | 'depth'>): PackPlan {
  const { w, d } = inner(config)
  const ROW = 2.7
  const items: PackItem[] = []
  const notes: string[] = []
  let seats = 0
  let top = -d / 2
  if (d >= 4.9 && w >= 3.4) {
    const length = Math.min(4.8, Math.max(2.4, floorTo(w - 0.4, 0.3)))
    const barZ = top + BACK_GAP + 0.35
    const stools = Math.floor(length / 0.55)
    items.push({ kind: 'barRun', x: 0, z: round2(barZ), rot: 0, length, seats: stools })
    seats += stools
    top = barZ + 0.35 + 0.6 + 0.6
    notes.push('Bárpult a hátsó fal mentén, előtte a zónák.')
  } else if (d >= 4.9) notes.push('Bárpult 3,4 m szélességtől kerül a hátsó falhoz.')
  // A sorok a bárpult mögötti (vagy ennek hiányában a teljes) mélységen osztoznak; a maradék szabad hely a sorok közé kerül.
  const avail = d / 2 - top
  const rowCount = Math.max(1, Math.min(3, Math.floor(avail / ROW + 1e-9)))
  const pitchZ = ROW + Math.min(0.8, Math.max(0, (avail - rowCount * ROW) / rowCount))
  const blockDepth = pitchZ * (rowCount - 1) + ROW
  const startZ = top + (avail - blockDepth) / 2 + ROW / 2
  for (let row = 0; row < rowCount; row++) {
    const rowItems = fillRow(w, startZ + row * pitchZ, row * 2)
    items.push(...rowItems)
    seats += rowItems.reduce((sum, item) => sum + (item.seats ?? 0), 0)
  }
  notes.push('A zónák váltakoznak (pihenő, étkező, bisztró-asztal), a közlekedősáv a sorok közt szabad marad.')
  return { items, seats, bounds: boundsOf(items, extentOf), areaPerSeat: seats ? round2((w * d) / seats) : null, benchmark: BENCH.hotel, notes }
}

export function packPlan(set: PackId, config: Pick<PergolaConfig, 'width' | 'depth'>): PackPlan {
  switch (set) {
    case 'restaurant': return restaurant(config)
    case 'summerKitchen': return summerKitchen(config)
    case 'kitchenDining': return kitchenDining(config)
    case 'banquet': return banquet(config)
    case 'barLounge': return barLounge(config)
    case 'mixed': return mixed(config)
  }
}
