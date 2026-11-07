import { describe, expect, it } from 'vitest'
import { crankPin, demoAngle, DRIVE, drivePlan, LOUVRE, louvreLayout, louvreMetrics, louvreProfile, motorLength } from '@/lib/louvreSystem'

const area = (pts: [number, number][]) => pts.reduce((sum, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return sum + x * y2 - x2 * y }, 0) / 2

describe('lamellaprofil (SB 400 rajz)', () => {
  const pts = louvreProfile(12)
  it('a befoglaló méret 215,8 × 39,8 mm', () => {
    const xs = pts.map(([x]) => x)
    const ys = pts.map(([, y]) => y)
    expect((Math.max(...xs) - Math.min(...xs)) * 1000).toBeCloseTo(215.8, 1)
    expect((Math.max(...ys) - Math.min(...ys)) * 1000).toBeCloseTo(39.8, 1)
  })
  it('a tengely a nyelvtől 112, az aljától 20 mm-re van', () => {
    expect(Math.max(...pts.map(([x]) => x)) * 1000).toBeCloseTo(112, 1)
    expect(Math.min(...pts.map(([, y]) => y)) * 1000).toBeCloseTo(-20, 1)
  })
  it('óramutatóval ellentétes körüljárás (three.js Shape)', () => {
    expect(area(pts)).toBeGreaterThan(0)
  })
})

describe('elrendezés', () => {
  it('4 × 4 m: egy modul, 200 mm-es osztás, a tengely 43 mm-rel a gerenda teteje alatt', () => {
    const l = louvreLayout(4, 4, 0.19, 2.715)
    expect(l.modules).toHaveLength(1)
    expect(l.modules[0].length).toBeCloseTo(4 - 0.19 - 0.02, 5)
    expect(l.z[1] - l.z[0]).toBeCloseTo(0.2, 6)
    expect(l.axleY).toBeCloseTo(2.672, 6)
    // zárt állásban a lamellasor + záró profilok kitöltik a gerendák közti teret
    const covered = (l.z.length - 1) * LOUVRE.pitch + LOUVRE.width + l.frontSeal + l.backSeal
    expect(covered).toBeCloseTo(4 - 0.19, 6)
    expect(l.frontSeal).toBeLessThan(LOUVRE.pitch)
  })
  it('4 m felett több egyforma modulra oszlik', () => {
    expect(louvreLayout(4, 4, 0.19, 3).modules).toHaveLength(1)
    expect(louvreLayout(5.5, 4, 0.19, 3).modules).toHaveLength(2)
    expect(louvreLayout(7, 4, 0.19, 3).modules.map((m) => m.x)).toEqual([-1.75, 1.75])
  })
})

describe('hajtás', () => {
  const l = louvreLayout(4, 4, 0.19, 2.715)
  const plan = drivePlan(l.z, l.axleY, 2.715, 2 - 0.12)
  it('a motor a gerendán belül marad', () => {
    expect(plan.pivot[0]).toBeLessThanOrEqual(2 - 0.12 + 1e-9)
  })
  it('a motor hossza zárva 732 mm, nyitva a rajz szerinti ~913 mm (±10)', () => {
    expect(motorLength(plan, l.z, l.axleY, 0) * 1000).toBeCloseTo(732, 3)
    const open = motorLength(plan, l.z, l.axleY, LOUVRE.maxAngle) * 1000
    expect(Math.abs(open - 913)).toBeLessThan(10)
  })
  it('a motor hossza monoton nő nyitáskor', () => {
    let last = 0
    for (let a = 0; a <= 110; a += 5) { const len = motorLength(plan, l.z, l.axleY, a); expect(len).toBeGreaterThan(last); last = len }
  })
  it('a hajtókar csapja a karsugáron mozog', () => {
    for (const a of [0, 40, 110]) expect(Math.hypot(...crankPin(a))).toBeCloseTo(DRIVE.crankR, 9)
  })
})

describe('mérőszámok', () => {
  it('zárva vízzáró, 90°-nál teljesen nyitott', () => {
    expect(louvreMetrics(0).sealed).toBe(true)
    expect(louvreMetrics(LOUVRE.sealAngle - 1).sealed).toBe(true)
    expect(louvreMetrics(90).open).toBeCloseTo(100, 5)
    expect(louvreMetrics(45).gap).toBeGreaterThan(40)
  })
  it('a bemutató ciklus 0 és 110° között mozog', () => {
    expect(demoAngle(0).angle).toBe(0)
    expect(demoAngle(7.5).angle).toBe(110)
    for (let t = 0; t < 30; t += 0.37) { const { angle } = demoAngle(t); expect(angle).toBeGreaterThanOrEqual(0); expect(angle).toBeLessThanOrEqual(110) }
  })
})
