import { describe, expect, it } from 'vitest'
import reference from './fixtures/sun-reference.json'
import { sunDay, sunPosition, sunVectorInScene, zonedTimeToUtc } from '../src/lib/sun'

const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

describe('napállás a NREL SPA referenciához képest', () => {
  it('a helyi idő → UTC átváltás a nyári időszámítással együtt egyezik', () => {
    for (const row of reference.positions) {
      const [y, m, d] = row.date.split('-').map(Number)
      expect(zonedTimeToUtc(y, m, d, row.hour, 'Europe/Budapest')).toBe(row.utc)
    }
  })

  it('azimut és magasság 0,02°-on belül (a horizont fölött)', () => {
    let worstAz = 0
    let worstEl = 0
    for (const row of reference.positions) {
      const sun = sunPosition(row.utc, row.lat, row.lon)
      if (row.elevation > 1) {
        worstAz = Math.max(worstAz, angleDiff(sun.azimuth, row.azimuth))
        worstEl = Math.max(worstEl, Math.abs(sun.elevation - row.elevation))
      }
    }
    expect(worstAz).toBeLessThan(0.02)
    expect(worstEl).toBeLessThan(0.02)
  })

  it('napkelte, napnyugta, delelés 1 percen belül', () => {
    for (const row of reference.days) {
      const [y, m, d] = row.date.split('-').map(Number)
      const day = sunDay(y, m, d, row.lat, row.lon, 'Europe/Budapest')
      expect(Math.abs(day.sunrise! - row.sunrise) * 60).toBeLessThan(1)
      expect(Math.abs(day.sunset! - row.sunset) * 60).toBeLessThan(1)
      expect(Math.abs(day.noon - row.noon) * 60).toBeLessThan(1)
    }
  })
})

describe('nap iránya a jelenetben', () => {
  it('délre néző pergolánál a déli nap elölről süt (+z)', () => {
    const [x, y, z] = sunVectorInScene({ azimuth: 180, elevation: 30, trueElevation: 30 }, 180)
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(0.5)
    expect(z).toBeCloseTo(Math.cos(Math.PI / 6))
  })
  it('délre néző pergolánál a nyugati nap a fal felől nézve jobbról (−x) süt', () => {
    const [x, , z] = sunVectorInScene({ azimuth: 270, elevation: 0, trueElevation: 0 }, 180)
    expect(x).toBeCloseTo(-1)
    expect(z).toBeCloseTo(0)
  })
  it('északra néző pergolánál a déli nap a ház mögül (−z) süt', () => {
    const [, , z] = sunVectorInScene({ azimuth: 180, elevation: 20, trueElevation: 20 }, 0)
    expect(z).toBeLessThan(-0.9)
  })
})
