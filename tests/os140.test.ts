import { describe, expect, it } from 'vitest'
import { OS140, os140Count, os140Layout, os140Limits, os140Metrics, os140PostSpot } from '../src/lib/os140'
import { os140Details } from '../src/lib/os140Details'
import { OS140_BEAM, OS140_GUTTER, OS140_POST, OS140_SLAT } from '../src/lib/os140Profiles'

const bbox = (loops: [number, number][][]) => {
  const xs = loops.flat().map((p) => p[0]); const ys = loops.flat().map((p) => p[1])
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

describe('MB-OpenSky 140 profilok (gyári DWG)', () => {
  it('a profilok befoglaló méretei a gyári feliratokkal egyeznek', () => {
    expect(bbox(OS140_POST.map((s) => s.outer)).w).toBeCloseTo(0.14, 3)
    expect(bbox(OS140_BEAM.map((s) => s.outer)).h).toBeCloseTo(0.255, 3)
    const slat = bbox(OS140_SLAT.map((s) => s.outer))
    expect(slat.w).toBeCloseTo(0.223, 2)
    expect(slat.h).toBeCloseTo(0.0436, 2)
    expect(bbox(OS140_GUTTER.map((s) => s.outer)).w).toBeCloseTo(0.09, 3)
  })
  it('az üregek a külső kontúron belül vannak (a gerenda kétkamrás, az oszlop cső)', () => {
    expect(OS140_BEAM[0].holes).toHaveLength(2)
    expect(OS140_POST[0].holes).toHaveLength(1)
  })
})

describe('os140Layout', () => {
  it('5 × 6 m: 28 lamella 200 mm-es osztással, 4705 mm hosszú (a Blender-referenciával egyezik)', () => {
    const l = os140Layout(5 - OS140.beamW, 6 - OS140.beamW, 2.8 - OS140.beamH / 2)
    expect(l.z).toHaveLength(28)
    expect(l.z[1] - l.z[0]).toBeCloseTo(0.2, 6)
    expect(l.spans).toHaveLength(1)
    expect(l.spans[0].length).toBeCloseTo(4.705, 3)
    expect(l.axleY).toBeCloseTo(2.8 - 0.05795, 6)
  })
  it('az első és utolsó tengely legalább 150 mm-re van a gerenda belső síkjától, a sor középre igazított', () => {
    for (const depth of [2.5, 3.33, 4, 5.9, 6.98]) {
      const l = os140Layout(4, depth, 2.5)
      const half = l.clearDepth / 2
      expect(half - l.z[l.z.length - 1]).toBeGreaterThanOrEqual(OS140.axleFromBeam - 1e-9)
      expect(l.z[0] + l.z[l.z.length - 1]).toBeCloseTo(0, 9)
    }
  })
  it('5 m feletti mező két lamellamezőre oszlik', () => {
    expect(os140Layout(5.5, 4, 2.5).spans).toHaveLength(2)
    expect(os140Layout(5, 4, 2.5).spans).toHaveLength(1)
  })
  it('darabszám több modulnál', () => {
    const c = os140Count(4, 4, 2)
    expect(c.total).toBe(c.perSpan * 2)
  })
})

describe('os140Metrics és mérethatárok', () => {
  it('zárt állásban átfed, 90°-nál teljesen nyitott', () => {
    expect(os140Metrics(0).sealed).toBe(true)
    expect(os140Metrics(90).open).toBeCloseTo(100, 6)
  })
  it('a mintaprojekt határait jelzi', () => {
    expect(os140Limits(4, 6, 2.8)).toEqual([])
    expect(os140Limits(4, 7.2, 3.2)).toHaveLength(2)
  })
})

describe('os140PostSpot', () => {
  it('a sarokoszlop a gerendatengelyek metszésében áll', () => {
    expect(os140PostSpot([1.91, 1.41], 4, 3)).toEqual({ x: 2, z: 1.5, corner: true })
    expect(os140PostSpot([0, 1.41], 4, 3)).toEqual({ x: 0, z: 1.5, corner: false })
  })
})

describe('os140Details', () => {
  it('nem állít terhelési vagy motoradatot (a források ellentmondanak / hiányoznak)', () => {
    const text = JSON.stringify(os140Details({ width: 4, depth: 3, height: 2.5, modules: 1, led: true }))
    expect(text).not.toMatch(/kg\/m|km\/h|\d+ N\b/)
    expect(text).toContain('K440565X')
  })
})
