import { describe, expect, it } from 'vitest'
import { GLASS_SLIDE_SECONDS, glideEase, glideStep, MAX_FRAME_DELTA } from '../src/lib/mechanics'

describe('tolóüveg csúszása', () => {
  it('lassan indul és lassan áll meg, a két vége pontos', () => {
    expect(glideEase(0)).toBe(0)
    expect(glideEase(1)).toBe(1)
    expect(glideEase(0.5)).toBeCloseTo(0.5)
    expect(glideEase(0.05)).toBeLessThan(0.002)
    expect(1 - glideEase(0.95)).toBeLessThan(0.002)
  })
  it('hosszú szünet utáni első képkockán sem ugrik a végére (nincs becsapódás)', () => {
    const after = glideStep(0, 1, 5, GLASS_SLIDE_SECONDS)
    expect(after).toBeCloseTo(MAX_FRAME_DELTA / GLASS_SLIDE_SECONDS)
    expect(glideEase(after)).toBeLessThan(0.001)
  })
  it('60 fps-en kb. 2,2 s alatt ér végig, és menet közben visszafordítható', () => {
    let phase = 0
    let frames = 0
    while (phase < 1 && frames < 1000) { phase = glideStep(phase, 1, 1 / 60, GLASS_SLIDE_SECONDS); frames++ }
    expect(frames).toBeGreaterThanOrEqual(Math.floor(GLASS_SLIDE_SECONDS * 60) - 1)
    expect(frames).toBeLessThanOrEqual(Math.ceil(GLASS_SLIDE_SECONDS * 60) + 1)
    const half = glideStep(0.5, 0, 1 / 60, GLASS_SLIDE_SECONDS)
    expect(half).toBeLessThan(0.5)
    expect(0.5 - half).toBeLessThan(0.01)
  })
})
