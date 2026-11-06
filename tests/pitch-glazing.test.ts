import { describe, expect, it } from 'vitest'
import { decodeShareHash, shareHash } from '../src/lib/shareCode'
import { parseConfig, tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import { effectiveGlazing, glazingOptions, roofRise } from '../src/lib/roofs'
import type { PergolaConfig } from '../src/types/pergola'

const base = demoTenant.defaultConfig
const make = (patch: Partial<PergolaConfig>) => parseConfig(demoTenant, { ...base, ...patch })!

describe('tetődőlés és tetőburkolat', () => {
  it('a dőlés egész fokra kerekedik, 0 esetén elmarad, 12° fölött korlátozódik', () => {
    expect(make({ pitch: 0 }).pitch).toBeUndefined()
    expect(make({ pitch: 7.4 }).pitch).toBe(7)
    expect(make({ pitch: 25 }).pitch).toBe(12)
  })
  it('az emelkedés a mélységből és a dőlésből jön', () => {
    expect(roofRise({ pitch: 8, depth: 4 })).toBeCloseTo(0.56, 2)
    expect(roofRise({ pitch: undefined, depth: 4 })).toBe(0)
  })
  it('burkolat csak üveg- és polikarbonát tetőn érvényes, az alapkivitel elmarad', () => {
    expect(make({ roof: 'glass', glazing: 'satin' }).glazing).toBe('satin')
    expect(make({ roof: 'glass', glazing: 'clear' }).glazing).toBeUndefined()
    expect(make({ roof: 'glass', glazing: 'opal' }).glazing).toBeUndefined()
    expect(make({ roof: 'polycarbonate', glazing: 'opal' }).glazing).toBeUndefined()
    expect(make({ roof: 'polycarbonate', glazing: 'heat' }).glazing).toBe('heat')
    expect(make({ roof: 'louvered', glazing: 'heat' }).glazing).toBeUndefined()
    expect(effectiveGlazing({ roof: 'glass', glazing: undefined })).toBe('clear')
    expect(glazingOptions('louvered')).toEqual([])
  })
  it('a felár bekerül az árba, az alapkivitel nem drágább', () => {
    const clear = tenantPrice(demoTenant, make({ roof: 'glass' }))
    const satin = tenantPrice(demoTenant, make({ roof: 'glass', glazing: 'satin' }))
    const heat = tenantPrice(demoTenant, make({ roof: 'glass', glazing: 'heat' }))
    expect(satin.totalNet).toBeGreaterThan(clear.totalNet)
    expect(heat.totalNet).toBeGreaterThan(satin.totalNet)
    expect(clear.lines.some((line) => line.id === 'glazing')).toBe(false)
    expect(heat.lines.some((line) => line.id === 'glazing')).toBe(true)
  })
  it('a dőlés felára az árban szerepel, vízszintesnél nincs', () => {
    const flat = tenantPrice(demoTenant, make({ roof: 'glass' }))
    const tilted = tenantPrice(demoTenant, make({ roof: 'glass', pitch: 10 }))
    expect(flat.lines.some((line) => line.id === 'pitch')).toBe(false)
    expect(tilted.totalNet - flat.totalNet).toBeGreaterThan(0)
  })
  it('a megosztó linken át változatlanul visszajön', () => {
    const config = make({ roof: 'polycarbonate', glazing: 'heat', pitch: 9 })
    const decoded = parseConfig(demoTenant, decodeShareHash(`#${shareHash(config)}`))
    expect(decoded).toEqual(config)
    const plain = make({ roof: 'glass' })
    expect(parseConfig(demoTenant, decodeShareHash(`#${shareHash(plain)}`))).toEqual(plain)
  })
})
