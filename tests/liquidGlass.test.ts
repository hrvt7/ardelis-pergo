import { describe, expect, it } from 'vitest'
import { displacementMap } from '../src/lib/liquidGlass'

const at = (data: Uint8ClampedArray, w: number, x: number, y: number) => [data[(y * w + x) * 4], data[(y * w + x) * 4 + 1]]

describe('liquid glass elmozdítási térkép', () => {
  const w = 200
  const h = 120
  const map = displacementMap(w, h, 24, 16)

  it('a megfelelő méretű RGBA-tömb', () => {
    expect(map.length).toBe(w * h * 4)
  })

  it('a panel belseje torzítatlan', () => {
    expect(at(map, w, 100, 60)).toEqual([128, 128])
  })

  it('a peremen a háttér befelé hajlik', () => {
    const [leftX] = at(map, w, 1, 60)
    const [rightX] = at(map, w, w - 2, 60)
    const [, topY] = at(map, w, 100, 1)
    const [, bottomY] = at(map, w, 100, h - 2)
    expect(leftX).toBeGreaterThan(128)
    expect(rightX).toBeLessThan(128)
    expect(topY).toBeGreaterThan(128)
    expect(bottomY).toBeLessThan(128)
  })

  it('a hatás a perem felé erősödik', () => {
    const edge = Math.abs(at(map, w, 1, 60)[0] - 128)
    const inner = Math.abs(at(map, w, 10, 60)[0] - 128)
    expect(edge).toBeGreaterThan(inner)
  })
})
