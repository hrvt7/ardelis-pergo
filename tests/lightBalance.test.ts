import { describe, expect, it } from 'vitest'
import { daylightBalance, sunToSkyRatio } from '../src/lib/lightBalance'

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
