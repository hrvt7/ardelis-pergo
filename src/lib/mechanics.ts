// Mozgó elemek közös kinematikája (nyíló és tolóajtó), tiszta TypeScript.
// Egyetlen igazságforrás: a 3D jelenet ebből mozgatja a szárnyat, a kert elrendezése ebből tartja szabadon
// a nyitási ívet, és az ütközésteszt is ebből söpri végig a teljes mozgást. Minden pozíció egyetlen
// fázisból (progress: 0 = zárva, 1 = nyitva) számolódik, így a mozgás bármely pillanata reprodukálható.
import { hasCenterPost } from './modules'
import { isWallSide } from './mount'
import { doorLeafWidth, sideSegments } from './sides'
import type { SideSegment } from './sides'
import type { PergolaConfig, SideKey } from '../types/pergola'

/** Félbe osztott oldal közepén a függőleges osztóprofil szélessége (m). */
export const MULLION = 0.06
/** Az oldalfal helyi z tengelyének a tér belseje felé mutató előjele (az oldalak forgatása miatt oldalanként más). */
export const INWARD: Record<SideKey, 1 | -1> = { front: -1, back: 1, left: 1, right: -1 }
/** A nyíló szárny teljes nyitási szöge (rad, ~86°). */
export const DOOR_SWING_RAD = 1.5
/** Egy teljes nyitás/zárás ideje (s). */
export const DOOR_MOTION_SECONDS = 0.9
/** A szárny vastagsága a profilokkal (m). */
export const DOOR_LEAF_THICKNESS = 0.05
/**
 * A tolószárny síkja a fix tábla előtt, a külső oldalon (m). Kívül fut, mert az oszlopok a falsíktól befelé
 * állnak: belül a szárny a sarokoszlopba csúszna (a 4.96 előtt így volt), kívül a teljes úton szabad.
 */
export const SLIDING_OFFSET = 0.045
/** A tolószárny síkjának helyi z-je (kifelé). */
export const slidingLeafZ = (inward: 1 | -1) => -inward * SLIDING_OFFSET

type SideConfig = Pick<PergolaConfig, 'width' | 'depth' | 'mount' | 'sides' | 'split' | 'modules'>
export type Point = [number, number]

/** Az oldal helyi rendszere (x az oldal mentén, z merőlegesen) és a világ (x, z) közti átváltás. */
export function sideToWorld(config: Pick<PergolaConfig, 'width' | 'depth'>, side: SideKey, lx: number, lz: number): Point {
  if (side === 'front') return [lx, config.depth / 2 + lz]
  if (side === 'back') return [lx, -config.depth / 2 + lz]
  // Oldalt a csoport Y körül +90°-kal fordul: helyi x → világ −z, helyi z → világ +x.
  const ox = side === 'left' ? -config.width / 2 : config.width / 2
  return [ox + lz, -lx]
}

export interface SegmentPlacement {
  segment: SideSegment
  /** a szakasz középpontja az oldal mentén (helyi x, m) */
  center: number
  /** a szakasz tényleges hossza az osztóprofil/középoszlop rése nélkül (m) */
  length: number
}

/** Egy oldal szakaszai a 3D-ben: hol a közepük és milyen hosszúak (a félbe osztott oldal közepén rés marad). */
export function sideSegmentPlacements(config: SideConfig, side: SideKey): SegmentPlacement[] {
  const length = side === 'front' || side === 'back' ? config.width : config.depth
  const segments = sideSegments(config, side)
  const split = segments.length > 1
  const midPost = side === 'front' && hasCenterPost(config)
  const gap = split ? (midPost ? 0.09 : MULLION / 2 + 0.005) : 0
  return segments.map((segment) => {
    const center = ((segment.from + segment.to) / 2) * length
    return { segment, center: split ? center + Math.sign(center) * (gap / 2) : center, length: length * (segment.to - segment.from) - gap }
  })
}

export interface DoorKinematics {
  sliding: boolean
  length: number
  leafWidth: number
  fixedLength: number
  /** nyíló ajtó zsanérja a szakasz közepéhez képest (helyi x, tükrözés előtt) */
  hingeX: number
  /** a tolószárny teljes útja (m) */
  slide: number
}

/** Az ajtós falszakasz méretei: a 3D és az ütközésvizsgálat közös számítása. */
export function doorKinematics(type: 'door' | 'doorSliding', length: number): DoorKinematics {
  const sliding = type === 'doorSliding'
  const leafWidth = doorLeafWidth(type, length)
  const fixedLength = Math.max(0, length - leafWidth)
  // A tolószárny csak a fix tábla mögé (a falszakaszon belül) csúszik, soha nem lóg ki a keretből.
  const slide = Math.max(0, Math.min(leafWidth * 0.96, fixedLength - 0.04))
  // Nyíló ajtó: a zsanér a fix tábla felőli oldalon van, a szabad él a sarok felé esik.
  return { sliding, length, leafWidth, fixedLength, hingeX: length / 2 - leafWidth + 0.01, slide }
}

/** A nyíló szárny elfordulása (rad, Y körül, a szakasz csoportjában) adott fázisnál. Kifelé nyílik. */
export const doorSwingAngle = (inward: 1 | -1, progress: number) => inward * clamp01(progress) * DOOR_SWING_RAD

/** A tolószárny középpontja a szakasz közepéhez képest (helyi x, tükrözés előtt). */
export const slidingLeafX = (k: DoorKinematics, progress: number) => k.length / 2 - k.leafWidth / 2 - k.slide * clamp01(progress)

/**
 * A szárny középvonala (két végpont) a szakasz helyi rendszerében, adott fázisnál, tükrözéssel együtt.
 * Ugyanaz a transzformáció, amit a jelenet a csoportokkal alkalmaz (rotation.y, majd x-tükrözés).
 */
export function doorLeafLine(k: DoorKinematics, inward: 1 | -1, mirror: boolean, progress: number): [Point, Point] {
  const flip = (p: Point): Point => (mirror ? [-p[0], p[1]] : p)
  if (k.sliding) {
    const x = slidingLeafX(k, progress)
    const z = slidingLeafZ(inward)
    return [flip([x - k.leafWidth / 2, z]), flip([x + k.leafWidth / 2, z])]
  }
  // A szárny teste a zsanértól −0,01 … szélesség − 0,01 között fekszik (a jelenetben a test középre igazítva ül a zsanércsoportban).
  const angle = doorSwingAngle(inward, progress)
  const ux = Math.cos(angle)
  const uz = -Math.sin(angle)
  const near = -0.01
  const far = k.leafWidth - 0.01
  return [flip([k.hingeX + near * ux, near * uz]), flip([k.hingeX + far * ux, far * uz])]
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Lágy indulás és megállás (smootherstep). */
export const doorEase = (u: number) => { const x = clamp01(u); return x * x * x * (x * (x * 6 - 15) + 10) }

/**
 * Időalapú ajtófázis: csak az indulás pillanatától és a mostani időtől függ (képkockaszámtól nem),
 * ezért bármelyik pillanat kimerevíthető. `still` (csökkentett mozgás vagy kimerevített jelenet) esetén azonnal a cél.
 */
export function doorProgress(motion: { from: number; to: number; start: number }, now: number, still = false) {
  if (still) return motion.to
  const distance = Math.abs(motion.to - motion.from)
  if (distance < 1e-6) return motion.to
  const u = (now - motion.start) / (DOOR_MOTION_SECONDS * distance)
  return motion.from + (motion.to - motion.from) * doorEase(u)
}

export interface DoorSweep {
  side: SideKey
  half: 0 | 1 | null
  type: 'door' | 'doorSliding'
  mirror: boolean
  kinematics: DoorKinematics
  /** a szárny középvonala világkoordinátában, fázisonként (0 … 1) */
  frames: { progress: number; line: [Point, Point] }[]
}

/** Minden ajtószárny teljes mozgása világkoordinátában, `steps` + 1 egyenközű fázisban. */
export function doorSweeps(config: SideConfig & Pick<PergolaConfig, 'doorMirror'>, steps = 24): DoorSweep[] {
  const sweeps: DoorSweep[] = []
  for (const side of ['front', 'back', 'left', 'right'] as SideKey[]) {
    if (isWallSide(config.mount, side)) continue
    for (const placement of sideSegmentPlacements(config, side)) {
      const type = placement.segment.type
      if (type !== 'door' && type !== 'doorSliding') continue
      const kinematics = doorKinematics(type, placement.length)
      const mirror = Boolean(config.doorMirror?.[side])
      const frames = Array.from({ length: steps + 1 }, (_, index) => {
        const progress = index / steps
        const [a, b] = doorLeafLine(kinematics, INWARD[side], mirror, progress)
        const line: [Point, Point] = [sideToWorld(config, side, placement.center + a[0], a[1]), sideToWorld(config, side, placement.center + b[0], b[1])]
        return { progress, line }
      })
      sweeps.push({ side, half: placement.segment.half, type, mirror, kinematics, frames })
    }
  }
  return sweeps
}

/** Egy pont távolsága egy szakasztól (síkban). */
export function pointSegmentDistance(p: Point, a: Point, b: Point) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const len2 = dx * dx + dz * dz
  const t = len2 < 1e-12 ? 0 : clamp01(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2)
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz))
}

const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
const segmentsCross = (a: Point, b: Point, c: Point, d: Point) => cross(c, d, a) * cross(c, d, b) < 0 && cross(a, b, c) * cross(a, b, d) < 0

/** Pont a sokszögön belül (páros-páratlan szabály). */
export function pointInPolygon(p: Point, polygon: Point[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Metszi-e egymást két (nem feltétlenül konvex) sokszög: élmetszés vagy teljes tartalmazás. Az érintés nem metszés. */
export function polygonsIntersect(a: Point[], b: Point[]) {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) if (segmentsCross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true
  }
  return pointInPolygon(a[0], b) || pointInPolygon(b[0], a)
}

/** Tengelyhez igazított téglalap sokszögként (z, y). */
export const rectPolygon = (z0: number, z1: number, y0: number, y1: number): Point[] => [[z0, y0], [z1, y0], [z1, y1], [z0, y1]]
