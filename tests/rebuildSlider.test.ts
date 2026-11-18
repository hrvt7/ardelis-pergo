import { describe, expect, it } from 'vitest'
import { arcAngle, arcOffset, parseCentimetres, parsePlain, sliderFraction } from '../src/lib/rebuildSlider'

describe('folyékony csúszka', () => {
  it('a sávon elfoglalt hely', () => {
    expect(sliderFraction(2, 2, 7)).toBe(0)
    expect(sliderFraction(7, 2, 7)).toBe(1)
    expect(sliderFraction(4.5, 2, 7)).toBe(0.5)
    expect(sliderFraction(9, 2, 7)).toBe(1)
    expect(sliderFraction(3, 3, 3)).toBe(0)
  })

  it('a beírt centiméter méterré alakul, 5 cm-re kerekítve, a határok között', () => {
    expect(parseCentimetres('400', 2, 7, 0.05)).toBe(4)
    expect(parseCentimetres('412', 2, 7, 0.05)).toBe(4.1)
    expect(parseCentimetres('413', 2, 7, 0.05)).toBe(4.15)
    expect(parseCentimetres('950', 2, 7, 0.05)).toBe(7)
    expect(parseCentimetres('50', 2, 7, 0.05)).toBe(2)
    expect(parseCentimetres('387,5', 2, 7, 0.05)).toBe(3.9)
    expect(parseCentimetres('', 2, 7, 0.05)).toBeNull()
    expect(parseCentimetres('abc', 2, 7, 0.05)).toBeNull()
  })
})

describe('egyéb mértékegységek és az íves csúszka', () => {
  it('fok és százalék beírása', () => {
    expect(parsePlain('12', 0, 15, 1)).toBe(12)
    expect(parsePlain('20', 0, 15, 1)).toBe(15)
    expect(parsePlain('7,6', 0, 15, 1)).toBe(8)
    expect(parsePlain('x', 0, 100, 1)).toBeNull()
  })

  it('a mutató helyéből a lamellaszög (0° vízszintes, 90° függőleges)', () => {
    expect(arcAngle(10, 0)).toBe(0)
    expect(arcAngle(0, -10)).toBe(90)
    expect(Math.round(arcAngle(10, -10))).toBe(45)
    expect(arcAngle(10, 5)).toBe(0)
    expect(arcAngle(-10, -1)).toBe(90)
    expect(arcAngle(-10, 3)).toBe(90)
  })
})

describe('íves választó', () => {
  it('középen nincs eltolás, távolodva az ív kifelé hajlik, szimmetrikusan', () => {
    expect(arcOffset(0)).toBe(0)
    expect(arcOffset(64)).toBeGreaterThan(0)
    expect(arcOffset(128)).toBeGreaterThan(arcOffset(64))
    expect(arcOffset(-90)).toBeCloseTo(arcOffset(90))
    expect(arcOffset(1000, 300)).toBe(300)
  })
})
