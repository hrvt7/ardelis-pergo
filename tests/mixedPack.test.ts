import { describe, expect, it } from 'vitest'
import { furnitureLayout, furnitureFit } from '../src/lib/furniture'
import { packPlan, type PackItem } from '../src/lib/usePacks'

const SIZES: [number, number][] = [[4, 3.5], [5, 4], [6, 4], [6, 5], [8, 5], [8, 6], [10, 6], [10, 7], [12, 7], [12, 8]]
const half = (item: PackItem): [number, number, number] => {  // [fél szélesség, fél mélység, z-eltolás]
  switch (item.kind) {
    case 'lounge': return [1.5, 1.3, 0]
    case 'dining6': return [1.5, 1.2, 0]
    case 'dining8': return [1.85, 1.25, 0]
    case 'table4': return [1.0, 1.15, 0]
    case 'barRun': return [(item.length ?? 3) / 2, 0.65, 0.3] // pult hátul (z−0,35), bárszékek előtte (z+0,95)
    default: return [1, 1, 0]
  }
}

describe('Vegyes terasz csomag', () => {
  for (const [width, depth] of SIZES) {
    it(`${width} × ${depth} m: nincs átfedés, nem lóg ki, szomszédok nem egyformák`, () => {
      const plan = packPlan('mixed', { width, depth })
      expect(plan.items.length).toBeGreaterThan(0)
      // Kifér a belső területen
      for (const item of plan.items) {
        const [hx, hz, oz] = half(item)
        expect(Math.abs(item.x) + hx).toBeLessThanOrEqual((width - 0.2) / 2 + 1e-6)
        expect(item.z + oz - hz).toBeGreaterThanOrEqual(-(depth - 0.2) / 2 - 1e-6)
        expect(item.z + oz + hz).toBeLessThanOrEqual((depth - 0.2) / 2 + 1e-6)
      }
      // Nincs átfedés
      for (let i = 0; i < plan.items.length; i++) for (let j = i + 1; j < plan.items.length; j++) {
        const a = plan.items[i], b = plan.items[j]
        const [ax, az, ao] = half(a), [bx, bz, bo] = half(b)
        const overlap = Math.abs(a.x - b.x) < ax + bx - 1e-6 && Math.abs(a.z + ao - (b.z + bo)) < az + bz - 1e-6
        expect(overlap, `${a.kind}@${a.x},${a.z} és ${b.kind}@${b.x},${b.z}`).toBe(false)
      }
      // Egy soron belül nincs két egymás melletti egyforma elem (azonos típus és forgatás)
      const rows = new Map<number, PackItem[]>()
      for (const item of plan.items.filter((entry) => entry.kind !== 'barRun')) rows.set(item.z, [...(rows.get(item.z) ?? []), item].sort((a, b) => a.x - b.x))
      for (const row of rows.values()) for (let i = 1; i < row.length; i++) expect(`${row[i].kind}:${row[i].rot}`).not.toBe(`${row[i - 1].kind}:${row[i - 1].rot}`)
      // Ülőhelyek összege egyezik
      expect(plan.seats).toBe(plan.items.reduce((sum, item) => sum + (item.seats ?? 0), 0))
    })
  }

  it('nagy pergolán több különböző elemtípus van, nem csak egyfajta', () => {
    const kinds = new Set(packPlan('mixed', { width: 10, depth: 7 }).items.map((item) => item.kind))
    expect(kinds.size).toBeGreaterThanOrEqual(3)
  })

  it('a pihenősarok és a pihenő+étkező nem ismétlődik klónként', () => {
    for (const set of ['lounge', 'combo'] as const) expect(furnitureLayout(set, { width: 12, depth: 7 })!.count).toBe(1)
  })

  it('a csomag minden méretre ad elrendezést vagy jelzi, hogy nem fér', () => {
    for (const [width, depth] of SIZES) expect(furnitureFit('mixed', { width, depth })).not.toBeNull()
  })
})
