import { describe, expect, it } from 'vitest'
import { LOUVRE } from '../src/lib/louvreSystem'
import { smartLouver } from '../src/lib/smartLouver'
import { sunPosition } from '../src/lib/lightBalance'

/** A lamellák által átengedett közvetlen napfény aránya (0 = teljes árnyék) adott szögnél és napvektornál. */
function sunLeak(angleDeg: number, sun: [number, number, number]) {
  const [, y, z] = sun
  const a = (angleDeg * Math.PI) / 180
  const r = Math.hypot(y, z)
  const normalDot = (y * Math.cos(a) - z * Math.sin(a)) / r
  const covered = (LOUVRE.width * Math.abs(normalDot)) / (LOUVRE.pitch * (y / r))
  return Math.max(0, 1 - covered)
}

describe('smartLouver', () => {
  it('szemből (a pergola eleje felől) sütő nap: zárva vagy alig nyitva, teljes árnyékkal', () => {
    expect(smartLouver(sunPosition(7))).toEqual({ angle: 0, reason: 'front-sun' })
    expect(smartLouver(sunPosition(8)).angle).toBeLessThanOrEqual(4)
    const noon = sunPosition(13)
    expect(smartLouver(noon).angle).toBeLessThan(12)
    expect(sunLeak(smartLouver(noon).angle, noon)).toBe(0)
  })

  it('a ház felől érkező nap: nyitott lamellák, de még teljes árnyék', () => {
    const sun = sunPosition(13, 180)
    const { angle, reason } = smartLouver(sun)
    expect(reason).toBe('tracking')
    expect(angle).toBeGreaterThan(20)
    expect(sunLeak(angle, sun)).toBe(0)
  })

  it('a számított szög a határ: 5°-kal nyitottabban már átsüt a nap', () => {
    for (const hour of [9, 11, 14, 17]) {
      const sun = sunPosition(hour, 180)
      const { angle } = smartLouver(sun)
      expect(sunLeak(angle, sun)).toBe(0)
      if (angle < 85) expect(sunLeak(angle + 5, sun)).toBeGreaterThan(0)
    }
  })

  it('horizont alatt: nyitva', () => {
    expect(smartLouver([3, -0.5, 2])).toEqual({ angle: 90, reason: 'night' })
  })
})
