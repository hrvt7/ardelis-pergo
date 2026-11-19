import { describe, expect, it } from 'vitest'
import { GENERIC_BEAM, OS140_BEAM, fanBarSpan, frameBeam, ledStripLayout, showsMotorHousing, sideWallTop } from '@/lib/fixtures'
import { OS140 } from '@/lib/os140'

describe('jelenet-szerelvények a vázhoz igazítva', () => {
  it('OS140 vázon a LED-szalag a 255 mm-es gerenda alján fut, nem lóg alá', () => {
    const led = ledStripLayout(4, 3, 2.5, frameBeam(true))
    const beamBottom = 2.5 - OS140.beamH / 2
    expect(led.y).toBeGreaterThan(beamBottom - 0.02)
    expect(led.y).toBeLessThan(beamBottom)
    // a gerenda belső síkján belül 1,2 cm-re
    expect(led.inset - OS140.beamW / 2).toBeCloseTo(0.012, 5)
    expect(led.runX).toBeCloseTo(4 - OS140.beamW - 0.04, 5)
  })

  it('generikus vázon a régi méret marad', () => {
    expect(frameBeam(false)).toBe(GENERIC_BEAM)
    expect(ledStripLayout(4, 3, 2.5, GENERIC_BEAM).y).toBeCloseTo(2.5 - 0.115 - 0.009, 5)
  })

  it('a ventilátor tartórúdja a két OS140 gerenda belső síkja közt végig ér', () => {
    const fan = fanBarSpan(4, 3, 2.5, OS140_BEAM)
    expect(fan.spanX).toBeCloseTo(4 - OS140.beamW, 5)
    expect(fan.spanZ).toBeCloseTo(3 - OS140.beamW, 5)
    expect(fan.beamBottom).toBeCloseTo(2.5 - OS140.beamH / 2, 5)
  })

  it('motorház csak mozgó tetőn és csak a generikus vázon', () => {
    expect(showsMotorHousing(false, 'louvered')).toBe(true)
    expect(showsMotorHousing(true, 'louvered')).toBe(false)
    for (const roof of ['fixed', 'glass', 'polycarbonate'] as const) expect(showsMotorHousing(false, roof)).toBe(false)
  })

  it('az oldalfal felső profilja a gerenda aljáig ér (OS140 és generikus)', () => {
    const top = sideWallTop(2.5)
    // nincs rés: a profil teteje legalább a gerenda aljáig ér, és a gerendában rejtve marad
    for (const beam of [OS140_BEAM, GENERIC_BEAM]) {
      expect(top).toBeGreaterThanOrEqual(2.5 - beam.halfHeight)
      expect(top).toBeLessThan(2.5)
    }
  })
})
