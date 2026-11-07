import { describe, expect, it } from 'vitest'
import { fitDistance, maxOrbitDistance } from '../src/lib/cameraFit'

const small = { width: 5, depth: 4, height: 2.6 }
const wide = { width: 15, depth: 4, height: 2.6 }

describe('kamera-keretezés', () => {
  it('a kis pergola a megszokott (~16 m-es) nézet-távolságon belül marad, így a beállás nem változik', () => {
    expect(fitDistance(small, 38, 0.93)).toBeLessThan(16)
  })

  it('a háromszor szélesebb pergola arányosan távolabbi kamerát kér', () => {
    const near = fitDistance(small, 38, 0.93)
    const far = fitDistance(wide, 38, 0.93)
    expect(far).toBeGreaterThan(near * 1.6)
    expect(far).toBeGreaterThan(24) // a régi, rögzített távolságkorlát kevés volt
  })

  it('keskeny (álló) vásznon a vízszintes látószög a szűk keresztmetszet: nagyobb távolság kell', () => {
    expect(fitDistance(wide, 38, 0.5)).toBeGreaterThan(fitDistance(wide, 38, 1.6))
  })

  it('a forgatás távolságkorlátja kis pergolánál 24 m, nagynál arányosan nő', () => {
    expect(maxOrbitDistance(small)).toBe(24)
    expect(maxOrbitDistance(wide)).toBe(36)
  })
})
