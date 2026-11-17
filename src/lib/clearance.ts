// Ütközésvizsgálat a mozgó elemekre: a nyíló és tolóajtók szárnya a teljes mozgási útja alatt
// nem metszhet bele semmibe (dézsa, ültetőláda, kerti lámpa, bútor, ház, házszárny, oszlop, más oldalfal).
// Az akadályok a bejárás ütközőiből (walkArea) jönnek, a szárny útja a közös kinematikából (mechanics),
// így a teszt pontosan azt ellenőrzi, amit a 3D jelenet rajzol.
import { DOOR_LEAF_THICKNESS, doorSweeps, pointSegmentDistance } from './mechanics'
import type { DoorSweep, Point } from './mechanics'
import { buildWalkArea } from './walkArea'
import type { Collider } from './walkArea'
import type { FurnitureSet, HouseStyle, PergolaConfig } from '../types/pergola'

/** Az oszlop szelvényének fele (m): 16 cm-es oszlop. */
const POST_HALF = 0.08

export interface ClearanceHit {
  door: Pick<DoorSweep, 'side' | 'half' | 'type' | 'mirror'>
  obstacle: string
  /** a mozgás fázisa, ahol először ütközik (0 = zárva, 1 = nyitva) */
  progress: number
  /** a legnagyobb belógás (m) */
  overlap: number
}

/**
 * A keret részei (oszlop, a saját és a szomszédos oldalfal, házfal) zárt állásban eleve érintkeznek a
 * szárnnyal (a fal az oszlopsoron fut). Ezeket csak akkor hagyjuk ki, ha már zárt állásban is érintkeznek;
 * minden más akadályt (kert, bútor, ház) a zárt állásban is ellenőrzünk.
 */
const isFrame = (label: string) => label === 'oszlop' || label === 'házfal' || label.startsWith('oldal:')

/** Mennyivel lóg bele a szárny (vastagsággal együtt) az akadályba; ≤ 0, ha nem érinti. */
export function leafOverlap(line: [Point, Point], collider: Collider, halfThickness = DOOR_LEAF_THICKNESS / 2) {
  if (collider.kind === 'circle') return collider.r + halfThickness - pointSegmentDistance([collider.x, collider.z], line[0], line[1])
  // Gyors kizárás: a szárny középpontja messzebb van, mint a fél hossza + a doboz átlója.
  const mx = (line[0][0] + line[1][0]) / 2 - collider.x
  const mz = (line[0][1] + line[1][1]) / 2 - collider.z
  const halfLength = Math.hypot(line[1][0] - line[0][0], line[1][1] - line[0][1]) / 2
  if (Math.hypot(mx, mz) > halfLength + Math.hypot(collider.hw, collider.hd) + halfThickness + 0.05) return -1
  // Doboz: a szárnyat 1 cm-enként mintavételezzük a doboz helyi rendszerében.
  const cos = Math.cos(collider.angle)
  const sin = Math.sin(collider.angle)
  const length = Math.hypot(line[1][0] - line[0][0], line[1][1] - line[0][1])
  const steps = Math.max(2, Math.ceil(length / 0.01))
  let worst = -Infinity
  for (let index = 0; index <= steps; index++) {
    const t = index / steps
    const dx = line[0][0] + (line[1][0] - line[0][0]) * t - collider.x
    const dz = line[0][1] + (line[1][1] - line[0][1]) * t - collider.z
    const lx = dx * cos - dz * sin
    const lz = dx * sin + dz * cos
    const ox = Math.abs(lx) - collider.hw
    const oz = Math.abs(lz) - collider.hd
    // előjeles távolság a doboz szélétől (belül negatív)
    const distance = ox > 0 || oz > 0 ? Math.hypot(Math.max(ox, 0), Math.max(oz, 0)) : Math.max(ox, oz)
    worst = Math.max(worst, halfThickness - distance)
  }
  return worst
}

export interface ClearanceScene { furniture: FurnitureSet; houseStyle?: HouseStyle; studio?: boolean }

/** Minden ajtószárny teljes mozgásának ütközései az adott konfigurációban (üres lista = minden szabad). */
export function doorClearance(config: PergolaConfig, scene: ClearanceScene, steps = 24, tolerance = 0.002, extra: Collider[] = []): ClearanceHit[] {
  const sweeps = doorSweeps(config, steps)
  if (!sweeps.length) return []
  // A tárgyak a talajon állnak, a szárny alja a küszöb felett: a bejárás „alacsony tető” ütközője itt nem akadály.
  // Az oszlopok a bejárásban kör alakúak (a test sugarához); itt a valós 16 × 16 cm-es szelvény számít.
  const colliders = buildWalkArea(config, scene).colliders
    .filter((collider) => collider.label !== 'alacsony tető')
    .map((collider): Collider => (collider.label === 'oszlop' ? { kind: 'box', x: collider.x, z: collider.z, hw: POST_HALF, hd: POST_HALF, angle: 0, label: 'oszlop' } : collider))
    .concat(extra)
  const hits: ClearanceHit[] = []
  for (const sweep of sweeps) {
    const closed = sweep.frames[0].line
    for (const collider of colliders) {
      if (isFrame(collider.label) && leafOverlap(closed, collider) > -tolerance) continue
      let first = -1
      let worst = 0
      for (const frame of sweep.frames) {
        const overlap = leafOverlap(frame.line, collider)
        if (overlap > tolerance) { if (first < 0) first = frame.progress; worst = Math.max(worst, overlap) }
      }
      if (first >= 0) hits.push({ door: { side: sweep.side, half: sweep.half, type: sweep.type, mirror: sweep.mirror }, obstacle: collider.label, progress: first, overlap: worst })
    }
  }
  return hits
}
