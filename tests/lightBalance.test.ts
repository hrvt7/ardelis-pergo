import { describe, expect, it } from 'vitest'
import { daylightBalance, sunPosition, sunToSkyRatio } from '../src/lib/lightBalance'

describe('sunPosition', () => {
  it('0°-nál a megszokott ív: délben magasan, reggel keleten alacsonyan', () => {
    const [x, y] = sunPosition(13)
    expect(y).toBeGreaterThan(9)
    expect(Math.abs(x)).toBeLessThan(1)
    expect(sunPosition(6)[0]).toBeCloseTo(9)
    expect(sunPosition(6)[1]).toBe(0.8)
  })

  it('a napirány a vízszintes ívet forgatja, a nap magassága változatlan', () => {
    const [x, y, z] = sunPosition(9)
    const [rx, ry, rz] = sunPosition(9, 180)
    expect(ry).toBeCloseTo(y)
    expect(rx).toBeCloseTo(-x)
    expect(rz).toBeCloseTo(-z)
    expect(Math.hypot(rx, rz)).toBeCloseTo(Math.hypot(x, z))
  })

  it('360° ugyanaz, mint 0°', () => {
    expect(sunPosition(15, 360).map((v) => +v.toFixed(6))).toEqual(sunPosition(15, 0).map((v) => +v.toFixed(6)))
  })
})

describe('daylightBalance', () => {
  it('délben a nap legalább négyszer erősebb az égbolt szórt fényénél (éles árnyék, látható lamellacsíkok)', () => {
    expect(sunToSkyRatio(daylightBalance(1, false))).toBeGreaterThanOrEqual(4)
  })

  it('aranyórában is napsütéses marad az arány, de gyengébb, mint délben', () => {
    const golden = sunToSkyRatio(daylightBalance(0.5, true))
    expect(golden).toBeGreaterThanOrEqual(3)
    expect(golden).toBeLessThan(sunToSkyRatio(daylightBalance(1, false)))
  })

  it('alacsony napnál több égboltfény marad, hogy a reggeli jelenet ne sötétüljön be', () => {
    expect(daylightBalance(0, false).environment).toBeGreaterThan(daylightBalance(1, false).environment)
    expect(daylightBalance(0, false).sun).toBeLessThan(daylightBalance(1, false).sun)
  })

  it('a tartományon kívüli erősséget 0–1 közé szorítja', () => {
    expect(daylightBalance(5, false)).toEqual(daylightBalance(1, false))
    expect(daylightBalance(-2, false)).toEqual(daylightBalance(0, false))
  })
})
