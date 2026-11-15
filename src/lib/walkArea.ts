// Bejárás (első személyű nézet): járható terület és ütközők a talaj síkjában (x, z), tiszta TypeScript.
// Fizikai motor helyett egyszerű 2D alakzatok (kör, elforgatott téglalap): gyors, determinisztikus és tesztelhető.
// Minden ütköző a konfigurációból és a jelenet közös elrendezéséből (sceneLayout) számolódik, ezért a bejárás
// mindig ugyanazt a pergolát járja be, amit a konfigurátor mutat.
import { furnitureFit, furnitureLayout, FURNITURE_SETS } from './furniture'
import { carportBays } from './buildings'
import { isWallSide, postPositions } from './mount'
import { gardenLayout, wingFootprints } from './sceneLayout'
import { sideSegments } from './sides'
import type { FurnitureSet, HouseStyle, PergolaConfig, SideKey, SideType } from '../types/pergola'

/** Alapértelmezett szemmagasság (m). */
export const EYE_HEIGHT = 1.75
/** A „test” sugara: ennél közelebb nem megy a kamera akadályhoz (m). */
export const BODY_RADIUS = 0.25
/** Ennyivel kell a belmagasságnak a szem fölött lennie, hogy a tető alá be lehessen sétálni (m). */
const HEAD_CLEARANCE = 0.1

export type Collider =
  | { kind: 'circle'; x: number; z: number; r: number; label: string }
  | { kind: 'box'; x: number; z: number; hw: number; hd: number; angle: number; label: string }

export interface WalkArea {
  colliders: Collider[]
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  eye: number
  /** Túl alacsony a pergola: a tető alá nem lehet besétálni. */
  roofBlocked: boolean
}

type WalkConfig = PergolaConfig

const box = (x: number, z: number, w: number, d: number, angle: number, label: string): Collider => ({ kind: 'box', x, z, hw: w / 2, hd: d / 2, angle, label })

/** Átjárható-e egy oldalelem: a nyitott oldal igen; a ZIP-screen csak ha eléggé fel van húzva; minden más fal. */
export function isPassable(type: SideType, config: Pick<PergolaConfig, 'height' | 'screenOpen'>, eye = EYE_HEIGHT) {
  if (type === 'none') return true
  if (type === 'zip') return (config.height - 0.32) * (config.screenOpen / 100) >= eye + HEAD_CLEARANCE
  return false
}

/** Egy oldal szakaszának világkoordinátás középpontja, hossza és iránya (elöl/hátul x mentén, oldalt z mentén). */
function sideSegmentBox(config: WalkConfig, side: SideKey, from: number, to: number, label: string): Collider {
  const thickness = 0.12
  if (side === 'front' || side === 'back') {
    const z = side === 'front' ? config.depth / 2 : -config.depth / 2
    const x0 = from * config.width
    const x1 = to * config.width
    return box((x0 + x1) / 2, z, Math.abs(x1 - x0), thickness, 0, label)
  }
  // Oldalt a helyi −0,5 az elülső (+z) vég.
  const x = side === 'left' ? -config.width / 2 : config.width / 2
  const z0 = -from * config.depth
  const z1 = -to * config.depth
  return box(x, (z0 + z1) / 2, thickness, Math.abs(z1 - z0), 0, label)
}

/** Bútorok közelítő alaprajza (a zóna belső része, a közlekedősáv nélkül). */
function furnitureColliders(config: WalkConfig, set: FurnitureSet): Collider[] {
  if (config.building === 'carport') {
    const bays = carportBays(config.width)
    if (bays === 0) return []
    const xs = bays === 2 ? [-config.width / 4, config.width / 4] : [0]
    return xs.map((x) => box(x, Math.min(0.2, config.depth / 2 - 2.5), 1.9, 4.6, 0, 'autó'))
  }
  if (set === 'none') return []
  const fit = furnitureFit(set, config)
  const layout = furnitureLayout(set, config)
  if (!fit || !layout) return []
  // A bútorcsoport a pergola mélysége mentén elforgatva áll, ha nem a szélesség mentén fér el (Y körüli +90°).
  const toWorld = (x: number, z: number): [number, number] => (fit.alongWidth ? [x, z] : [z, -x])
  const turn = fit.alongWidth ? 0 : Math.PI / 2
  if (layout.pack) {
    return layout.pack.items.map((item) => {
      const [x, z] = toWorld(item.x, item.z)
      const long = Math.max(1.1, item.length ?? 1.1)
      return box(x, z, long, 1.0, turn + item.rot, `bútor: ${item.kind}`)
    })
  }
  const [zoneLong, zoneShort] = FURNITURE_SETS[set].zone
  return layout.cells.map((cell) => {
    const [x, z] = toWorld(cell.x, cell.z)
    return box(x, z, zoneLong * 0.6, zoneShort * 0.6, turn, 'bútor')
  })
}

/** A bejárás ütközői és határai az aktuális konfigurációhoz. */
export function buildWalkArea(config: WalkConfig, scene: { furniture: FurnitureSet; houseStyle?: HouseStyle; studio?: boolean }, eye = EYE_HEIGHT): WalkArea {
  const colliders: Collider[] = []
  // Oszlopok (kb. 18 cm-es szelvény, kis ráhagyással).
  for (const [x, z] of postPositions(config)) colliders.push({ kind: 'circle', x, z, r: 0.12, label: 'oszlop' })
  // Zárt oldalak: üveg, lamella, lécfal, ajtós fal (zárt ajtóval), leengedett ZIP.
  for (const side of ['front', 'back', 'left', 'right'] as SideKey[]) {
    for (const segment of sideSegments(config, side)) {
      if (!isPassable(segment.type, config, eye)) colliders.push(sideSegmentBox(config, side, segment.from, segment.to, `oldal: ${segment.type}`))
    }
  }
  // Alacsony pergola: a tető alá nem lehet bemenni (a szem a tetőbe érne).
  const roofBlocked = config.height < eye + HEAD_CLEARANCE
  if (roofBlocked) colliders.push(box(0, 0, config.width, config.depth, 0, 'alacsony tető'))
  colliders.push(...furnitureColliders(config, scene.furniture))

  if (scene.studio) {
    // Stúdió-háttér: nincs ház és kert, csak a pergola környéke járható.
    const reach = Math.max(config.width, config.depth) / 2 + 4
    return { colliders, bounds: { minX: -reach, maxX: reach, minZ: -reach, maxZ: reach }, eye, roofBlocked }
  }

  const style = scene.houseStyle ?? 'classic'
  const garden = gardenLayout(config, style)
  const { house } = garden
  // A ház tömbje és a falas oldalakon a házszárnyak.
  colliders.push(box(0, house.frontZ - house.depth / 2, house.width, house.depth, 0, 'ház'))
  for (const wing of wingFootprints(config, style)) {
    colliders.push(box((wing.inner + wing.outer) / 2, (wing.zBack + wing.zFront) / 2, Math.abs(wing.outer - wing.inner), wing.zFront - wing.zBack, 0, 'házszárny'))
  }
  // Falhoz rögzített pergolánál a hátsó oldal maga a homlokzat; oldalfalnál a fal a pergola mellett.
  for (const side of ['left', 'right'] as const) {
    if (isWallSide(config.mount, side)) colliders.push(sideSegmentBox(config, side, -0.5, 0.5, 'házfal'))
  }
  // Kert: ültetőládák, kerti lámpák, dézsák.
  for (const [x, z] of garden.planters) colliders.push({ kind: 'circle', x, z, r: 0.5, label: 'ültetőláda' })
  for (const [x, z] of garden.bollards) colliders.push({ kind: 'circle', x, z, r: 0.12, label: 'kerti lámpa' })
  for (const [x, z, , scale] of garden.pots) colliders.push({ kind: 'circle', x, z, r: 0.3 * scale, label: 'dézsa' })
  // Telekhatár: a sövény belső oldala, az utca felől a járda, hátul a ház mögötti sáv.
  const side = garden.boundary - 1.0
  return { colliders, bounds: { minX: -side, maxX: side, minZ: house.frontZ - house.depth - 0.6, maxZ: 8.3 }, eye, roofBlocked }
}

/** Mennyivel lóg bele a test egy ütközőbe, és merre kell kitolni (normál, mélység). */
function penetration(x: number, z: number, radius: number, collider: Collider): { nx: number; nz: number; depth: number } | null {
  if (collider.kind === 'circle') {
    const dx = x - collider.x
    const dz = z - collider.z
    const distance = Math.hypot(dx, dz)
    const overlap = radius + collider.r - distance
    if (overlap <= 0) return null
    if (distance < 1e-9) return { nx: 0, nz: 1, depth: overlap }
    return { nx: dx / distance, nz: dz / distance, depth: overlap }
  }
  // Doboz: a pontot a doboz helyi rendszerébe forgatjuk.
  const cos = Math.cos(collider.angle)
  const sin = Math.sin(collider.angle)
  const dx = x - collider.x
  const dz = z - collider.z
  const lx = dx * cos - dz * sin
  const lz = dx * sin + dz * cos
  const inside = Math.abs(lx) <= collider.hw && Math.abs(lz) <= collider.hd
  let nlx: number
  let nlz: number
  let depth: number
  if (inside) {
    // A dobozon belül: a legközelebbi oldal felé tolunk ki.
    const toX = collider.hw - Math.abs(lx)
    const toZ = collider.hd - Math.abs(lz)
    if (toX < toZ) { nlx = Math.sign(lx) || 1; nlz = 0; depth = toX + radius }
    else { nlx = 0; nlz = Math.sign(lz) || 1; depth = toZ + radius }
  } else {
    const cx = Math.max(-collider.hw, Math.min(collider.hw, lx))
    const cz = Math.max(-collider.hd, Math.min(collider.hd, lz))
    const ex = lx - cx
    const ez = lz - cz
    const distance = Math.hypot(ex, ez)
    if (distance >= radius) return null
    nlx = ex / distance
    nlz = ez / distance
    depth = radius - distance
  }
  // Vissza világkoordinátába (a fordított forgatással).
  return { nx: nlx * cos + nlz * sin, nz: -nlx * sin + nlz * cos, depth }
}

/** A test kitolása az ütközőkből és a határok közé (ütközéskor a fal mentén csúszik, nem akad meg). */
export function resolvePosition(x: number, z: number, area: WalkArea, radius = BODY_RADIUS): [number, number] {
  let px = x
  let pz = z
  for (let iteration = 0; iteration < 6; iteration += 1) {
    let moved = false
    for (const collider of area.colliders) {
      const hit = penetration(px, pz, radius, collider)
      if (!hit) continue
      px += hit.nx * (hit.depth + 1e-4)
      pz += hit.nz * (hit.depth + 1e-4)
      moved = true
    }
    px = Math.max(area.bounds.minX + radius, Math.min(area.bounds.maxX - radius, px))
    pz = Math.max(area.bounds.minZ + radius, Math.min(area.bounds.maxZ - radius, pz))
    if (!moved) break
  }
  return [px, pz]
}

/** Egy lépés: legfeljebb 10 cm-es részlépésekben, hogy vékony falon se lehessen átugrani. */
export function stepPosition(x: number, z: number, dx: number, dz: number, area: WalkArea, radius = BODY_RADIUS): [number, number] {
  const length = Math.hypot(dx, dz)
  const parts = Math.max(1, Math.ceil(length / 0.1))
  let px = x
  let pz = z
  for (let index = 0; index < parts; index += 1) [px, pz] = resolvePosition(px + dx / parts, pz + dz / parts, area, radius)
  return [px, pz]
}

/** Szabad-e a hely (nincs ütközés és a határokon belül van). */
export function isFree(x: number, z: number, area: WalkArea, radius = BODY_RADIUS) {
  if (x < area.bounds.minX + radius || x > area.bounds.maxX - radius || z < area.bounds.minZ + radius || z > area.bounds.maxZ - radius) return false
  return area.colliders.every((collider) => !penetration(x, z, radius, collider))
}

/** Kezdőpont: a pergola előtt, kívül, a pergola felé nézve (yaw 0 = −z irány). */
export function entryPoint(config: Pick<PergolaConfig, 'depth'>, area: WalkArea): { x: number; z: number; yaw: number } {
  const [x, z] = resolvePosition(0, Math.min(config.depth / 2 + 2.6, area.bounds.maxZ - 0.6), area)
  return { x, z, yaw: 0 }
}
