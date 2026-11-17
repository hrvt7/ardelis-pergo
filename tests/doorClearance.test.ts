import { describe, expect, it } from 'vitest'
import { demoTenant } from '../src/tenants/demo'
import { normalizeConfig } from '../src/tenants/rules'
import { doorClearance, leafOverlap } from '../src/lib/clearance'
import { doorKinematics, doorLeafLine, doorProgress, doorSweeps, DOOR_MOTION_SECONDS, INWARD } from '../src/lib/mechanics'
import type { HouseStyle, MountType, PergolaConfig, SideKey } from '../src/types/pergola'

const OPEN = { front: 'none', back: 'none', left: 'none', right: 'none' } as PergolaConfig['sides']
const base = normalizeConfig(demoTenant, { ...demoTenant.defaultConfig, sides: OPEN })

type Variant = { label: string; patch: (side: SideKey) => Partial<PergolaConfig> }
const VARIANTS: Variant[] = [
  { label: 'nyíló, egész oldal', patch: (side) => ({ sides: { ...OPEN, [side]: 'door' } }) },
  { label: 'toló, egész oldal', patch: (side) => ({ sides: { ...OPEN, [side]: 'doorSliding' } }) },
  { label: 'nyíló, első fél', patch: (side) => ({ sides: { ...OPEN, [side]: 'door' }, split: { [side]: 'glassFixed' } }) },
  { label: 'nyíló, második fél', patch: (side) => ({ sides: { ...OPEN, [side]: 'glassFixed' }, split: { [side]: 'door' } }) },
]
const MOUNTS: MountType[] = ['freestanding', 'wall', 'corner-left', 'corner-right', 'niche']
const STYLES: HouseStyle[] = ['classic', 'modern', 'gable']
const WIDTHS = [2.5, 3, 3.6, 4.2, 5, 6, 7]
const DEPTHS = [2.5, 3, 3.5, 4, 4.5, 5]
const SIDES: SideKey[] = ['front', 'back', 'left', 'right']

describe('ajtók kinematikája (egyetlen fázisból)', () => {
  it('a nyíló szárny a zsanér körül forog, hossza minden fázisban állandó', () => {
    const k = doorKinematics('door', 3)
    for (const progress of [0, 0.25, 0.5, 1]) {
      const [a, b] = doorLeafLine(k, -1, false, progress)
      expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeCloseTo(k.leafWidth, 6)
    }
  })
  it('a nyíló ajtó mindig kifelé nyílik, a tükrözés a másik sarokba teszi', () => {
    for (const side of SIDES) {
      const k = doorKinematics('door', 3)
      const [, open] = doorLeafLine(k, INWARD[side], false, 1)
      // a helyi z előjele a belső tér felé mutató iránnyal ellentétes = kifelé
      expect(Math.sign(open[1])).toBe(-INWARD[side])
      const [, mirrored] = doorLeafLine(k, INWARD[side], true, 1)
      expect(mirrored[0]).toBeCloseTo(-open[0], 9)
      expect(mirrored[1]).toBeCloseTo(open[1], 9)
    }
  })
  it('a tolószárny a falszakaszon belül marad a teljes úton', () => {
    for (const length of [1.2, 2, 2.6, 3.5, 5]) {
      const k = doorKinematics('doorSliding', length)
      for (let i = 0; i <= 20; i++) for (const [x] of doorLeafLine(k, 1, false, i / 20)) expect(Math.abs(x)).toBeLessThanOrEqual(length / 2 + 1e-9)
    }
  })
  it('az ajtó fázisa csak az időtől függ, kimerevítve azonnal a cél', () => {
    const motion = { from: 0, to: 1, start: 10 }
    expect(doorProgress(motion, 10)).toBe(0)
    expect(doorProgress(motion, 10 + DOOR_MOTION_SECONDS / 2)).toBeCloseTo(0.5, 9)
    expect(doorProgress(motion, 10 + DOOR_MOTION_SECONDS)).toBe(1)
    expect(doorProgress(motion, 10.1)).toBe(doorProgress(motion, 10.1))
    expect(doorProgress(motion, 10, true)).toBe(1)
    // félútról visszafordítva arányosan rövidebb ideig tart
    expect(doorProgress({ from: 0.5, to: 0, start: 0 }, DOOR_MOTION_SECONDS / 2)).toBe(0)
  })
  it('világkoordinátában a szárny az ajtós oldal síkjából indul', () => {
    const config = normalizeConfig(demoTenant, { ...base, width: 4, depth: 3, mount: 'freestanding', sides: { ...OPEN, front: 'door', left: 'door' } })
    const sweeps = doorSweeps(config)
    const front = sweeps.find((sweep) => sweep.side === 'front')!
    for (const [, z] of front.frames[0].line) expect(z).toBeCloseTo(config.depth / 2, 6)
    const left = sweeps.find((sweep) => sweep.side === 'left')!
    for (const [x] of left.frames[0].line) expect(x).toBeCloseTo(-config.width / 2, 6)
    // kinyitva kifelé lóg: elöl +z, balra −x
    expect(Math.max(...front.frames.at(-1)!.line.map(([, z]) => z))).toBeGreaterThan(config.depth / 2 + 0.8)
    expect(Math.min(...left.frames.at(-1)!.line.map(([x]) => x))).toBeLessThan(-config.width / 2 - 0.8)
  })
})

describe('ütközésvizsgálat: az ajtószárny útja szabad minden konfigurációnál', () => {
  // Önellenőrzés: ha a vizsgálat semmit sem mérne (üres minta, rossz irány), ezek buknának.
  const front = normalizeConfig(demoTenant, { ...base, width: 4, depth: 3, mount: 'freestanding', sides: { ...OPEN, front: 'door' } })
  const scene = { furniture: 'none' as const, houseStyle: 'classic' as const }
  it('a mintavétel nem üres: van szárny, és minden fázisa megvan', () => {
    const sweeps = doorSweeps(front)
    expect(sweeps).toHaveLength(1)
    expect(sweeps[0].frames).toHaveLength(25)
  })
  it('a kinyíló szárny útjába tett dézsát megtalálja, a mellé tettet nem', () => {
    // A szárny a jobb sarok felé nyílik: zsanér x = 2 − 0,95, kifelé (+z).
    const inPath = doorClearance(front, scene, 24, 0.002, [{ kind: 'circle', x: 1.45, z: front.depth / 2 + 0.7, r: 0.3, label: 'dézsa' }])
    expect(inPath.map((hit) => hit.obstacle)).toContain('dézsa')
    expect(inPath[0].progress).toBeGreaterThan(0)
    const aside = doorClearance(front, scene, 24, 0.002, [{ kind: 'circle', x: 1.45, z: front.depth / 2 + 1.5, r: 0.3, label: 'dézsa' }])
    expect(aside).toEqual([])
  })
  it('a régi dézsahely (0,75 m-re a nyíló oldalajtótól) ütközne – ezt javította a 3.61', () => {
    const left = normalizeConfig(demoTenant, { ...base, width: 4, depth: 3, mount: 'freestanding', sides: { ...OPEN, left: 'door' }, doorMirror: { left: true } })
    const hits = doorClearance(left, scene, 24, 0.002, [{ kind: 'circle', x: -left.width / 2 - 0.75, z: left.depth / 2, r: 0.3 * 1.25, label: 'régi dézsa' }])
    expect(hits.map((hit) => hit.obstacle)).toContain('régi dézsa')
  })
  it('a fal belső oldalán futó tolószárny a sarokoszlopba csúszna – ezért fut kívül', () => {
    const k = doorKinematics('doorSliding', 2.5)
    const post = { kind: 'box' as const, x: -1.25 + 0.09, z: -0.09, hw: 0.08, hd: 0.08, angle: 0, label: 'oszlop' }
    // elülső oldal (inward = −1): a belső oldal a −z
    const [a, b] = doorLeafLine(k, -1, false, 1)
    expect(leafOverlap([[a[0], -0.045], [b[0], -0.045]], post)).toBeGreaterThan(0)
    expect(leafOverlap([a, b], post)).toBeLessThan(0)
  })
  it('kert, ház, bútor, oszlopok: egyetlen ütközés sincs', () => {
    const failures: string[] = []
    let checked = 0
    for (const mount of MOUNTS) for (const width of WIDTHS) for (const depth of DEPTHS) for (const side of SIDES) for (const variant of VARIANTS) for (const mirror of [false, true]) {
      const config = normalizeConfig(demoTenant, { ...base, mount, width, depth, ...variant.patch(side), doorMirror: { [side]: mirror } })
      if (!doorSweeps(config).length) continue
      for (const houseStyle of STYLES) {
        checked += 1
        for (const hit of doorClearance(config, { furniture: 'dining6', houseStyle }, 16)) {
          if (failures.length < 25) failures.push(`${mount} ${width}×${depth} ${side} (${variant.label}${mirror ? ', tükrözve' : ''}, ${houseStyle}) → ${hit.obstacle} @${hit.progress.toFixed(2)} ${Math.round(hit.overlap * 1000)} mm`)
          else break
        }
      }
    }
    expect(checked).toBeGreaterThan(2000)
    expect(failures).toEqual([])
  })
  it('modulos pergola, télikert és stúdió háttér: egyetlen ütközés sincs', () => {
    const failures: string[] = []
    let checked = 0
    for (const modules of [2, 3]) for (const width of [6, 9, 12, 14]) for (const building of [undefined, 'conservatory'] as const) for (const mount of MOUNTS) for (const side of SIDES) for (const variant of VARIANTS) for (const mirror of [false, true]) {
      const config = normalizeConfig(demoTenant, { ...base, modules, width, depth: 4, building, mount, ...variant.patch(side), doorMirror: { [side]: mirror } })
      if (!doorSweeps(config).length) continue
      for (const studio of [false, true]) {
        checked += 1
        for (const hit of doorClearance(config, { furniture: 'restaurant', houseStyle: 'classic', studio }, 12)) if (failures.length < 25) failures.push(`${modules}× ${config.width} ${building ?? 'pergola'} ${mount} ${side} (${variant.label}${mirror ? ', tükrözve' : ''}${studio ? ', stúdió' : ''}) → ${hit.obstacle} @${hit.progress.toFixed(2)} ${Math.round(hit.overlap * 1000)} mm`)
      }
    }
    expect(checked).toBeGreaterThan(500)
    expect(failures).toEqual([])
  })
})
