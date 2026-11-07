import { describe, expect, it } from 'vitest'
import { furnitureLayout } from '../src/lib/furniture'

describe('furnitureLayout', () => {
  it('kis pergolán egy példány marad, középen', () => {
    const layout = furnitureLayout('dining6', { width: 4, depth: 3 })!
    expect(layout.count).toBe(1)
    expect(layout.cells).toEqual([{ x: 0, z: 0 }])
    expect(layout.seats).toBe(6)
  })

  it('nagy pergolán ismétlődik, a példányok a keretben maradnak és nem fedik egymást', () => {
    const layout = furnitureLayout('dining6', { width: 12, depth: 5 })!
    expect(layout.count).toBeGreaterThan(3)
    expect(layout.seats).toBe(layout.count * 6)
    const along = layout.alongWidth
    const innerLong = (along ? 12 : 5) - 0.2
    const innerShort = (along ? 5 : 12) - 0.2
    for (const cell of layout.cells) {
      expect(Math.abs(cell.x) + 1.5).toBeLessThanOrEqual(innerLong / 2 + 1e-6)
      expect(Math.abs(cell.z) + 1.2).toBeLessThanOrEqual(innerShort / 2 + 1e-6)
    }
    const xs = layout.cells.map((cell) => cell.x).filter((x, i, all) => all.indexOf(x) === i).sort((a, b) => a - b)
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(3 - 1e-6)
  })

  it('a jacuzzi és a bár nem ismétlődik, nagy pergolán sem', () => {
    expect(furnitureLayout('spa', { width: 12, depth: 5 })!.count).toBe(1)
    expect(furnitureLayout('bar', { width: 12, depth: 5 })!.count).toBe(1)
  })

  it('szűkös helyen és üres csomagnál nem ismétel', () => {
    expect(furnitureLayout('dining8', { width: 3.6, depth: 2.5 })!.count).toBe(1)
    expect(furnitureLayout('none', { width: 12, depth: 5 })).toBeNull()
  })

  it('legfeljebb 12 példányt ad', () => {
    expect(furnitureLayout('bistro', { width: 40, depth: 40 })!.count).toBeLessThanOrEqual(12)
  })
})
