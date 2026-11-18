import { describe, expect, it } from 'vitest'
import { parseCentimetres, sliderFraction } from '../src/lib/rebuildSlider'

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
