import { describe, expect, it } from 'vitest'
import { demoTenant } from '../src/tenants/demo'
import { normalizeConfig } from '../src/tenants/rules'
import { sensorsApplicable } from '../src/lib/roofs'
import type { PergolaConfig } from '../src/types/pergola'

const base = normalizeConfig(demoTenant, { ...demoTenant.defaultConfig })
const open = { front: 'none', back: 'none', left: 'none', right: 'none' } as PergolaConfig['sides']

describe('eső- és szélszenzor csak ott, ahol van mit vezérelnie', () => {
  it('mozgó tetőnél (lamella) választható', () => {
    expect(sensorsApplicable({ roof: 'louvered', sides: open })).toBe(true)
  })
  it('fix tetőnél csak ZIP-screennel van értelme', () => {
    expect(sensorsApplicable({ roof: 'fixed', sides: open })).toBe(false)
    expect(sensorsApplicable({ roof: 'fixed', sides: { ...open, front: 'zip' } })).toBe(true)
    expect(sensorsApplicable({ roof: 'fixed', sides: { ...open, front: 'glass' }, split: { front: 'zip' } })).toBe(true)
  })
  it('fix tetőre váltva a szenzor kikerül a konfigurációból (és így az árból is)', () => {
    if (!demoTenant.extras.sensors || !demoTenant.roofs.fixed) return
    const withSensor = normalizeConfig(demoTenant, { ...base, roof: 'louvered', sides: open, sensors: true })
    expect(withSensor.sensors).toBe(true)
    const fixed = normalizeConfig(demoTenant, { ...withSensor, roof: 'fixed', sides: open })
    expect(fixed.sensors).toBe(false)
  })
})
