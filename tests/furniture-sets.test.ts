import { describe, expect, it } from 'vitest'
import { FURNITURE_GROUPS, FURNITURE_ORDER, FURNITURE_SETS, furnitureFit, furnitureMinimum } from '../src/lib/furniture'

const limits = { width: [2.5, 7] as [number, number], depth: [2, 6] as [number, number] }

describe('vendéglátós és napozós bútorcsomagok', () => {
  it('a bisztró, a bár és a napozó választható, és a listában az étkezők után áll', () => {
    expect(FURNITURE_ORDER.indexOf('bistro')).toBeGreaterThan(FURNITURE_ORDER.indexOf('combo'))
    expect(FURNITURE_ORDER.indexOf('bar')).toBeGreaterThan(FURNITURE_ORDER.indexOf('bistro'))
    expect(FURNITURE_ORDER.indexOf('sunbed')).toBeGreaterThan(FURNITURE_ORDER.indexOf('bar'))
    expect(FURNITURE_ORDER.at(-1)).toBe('none')
  })

  it('az alap 5 × 4 m-es pergola alatt mindhárom kényelmesen elfér', () => {
    for (const set of ['bistro', 'bar', 'sunbed'] as const) expect(furnitureFit(set, { width: 5, depth: 4 }, limits)?.level).toBe('comfortable')
  })

  it('3 × 2,5 m-en a bisztró nem fér el, és a javasolt méretben már kényelmes', () => {
    const fit = furnitureFit('bistro', { width: 3, depth: 2.5 }, limits)!
    expect(fit.level).not.toBe('comfortable')
    expect(fit.suggestion).not.toBeNull()
    expect(furnitureFit('bistro', fit.suggestion!, limits)?.level).toBe('comfortable')
  })

  it('minden csomagnak van leírása, létszáma és legalább egy 3D-eleme', () => {
    for (const set of ['bistro', 'bar', 'sunbed'] as const) {
      const spec = FURNITURE_SETS[set]
      expect(spec.label.length).toBeGreaterThan(0)
      expect(spec.people.length).toBeGreaterThan(0)
      expect(spec.parts.length).toBeGreaterThan(0)
      expect(furnitureMinimum(set)).toHaveLength(2)
    }
  })

  it('a választó csoportjai pontosan egyszer tartalmazzák az összes bútorcsomagot (a „Üresen” kivételével)', () => {
    const grouped = FURNITURE_GROUPS.flatMap((group) => group.sets)
    expect(new Set(grouped).size).toBe(grouped.length)
    expect([...grouped].sort()).toEqual(Object.keys(FURNITURE_SETS).sort())
  })
})
