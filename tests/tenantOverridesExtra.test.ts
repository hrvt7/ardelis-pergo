import { describe, expect, it } from 'vitest'
import { applyOverrides, parseOverrides } from '../src/tenants/overrides'
import { normalizeConfig } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'

describe('gyártói terméknevek és méretkorlátok (admin)', () => {
  it('a tetőnév felülírja a platform nevét, az üres mező az alapot hagyja', () => {
    const tenant = applyOverrides(demoTenant, { roofNames: { louvered: { name: 'SkyLine 400', short: '' }, glass: { name: '', short: 'edzett üveg' } } })
    expect(tenant.roofs.louvered?.name).toBe('SkyLine 400')
    expect(tenant.roofs.louvered?.short).toBe(demoTenant.roofs.louvered?.short)
    expect(tenant.roofs.glass?.name).toBe(demoTenant.roofs.glass?.name)
    expect(tenant.roofs.glass?.short).toBe('edzett üveg')
  })
  it('a méretkorlát érvényes a konfigurációra; hibás tartomány elutasítva', () => {
    const tenant = applyOverrides(demoTenant, { limits: { width: [3, 6], depth: [2.5, 4.5], maxHeaters: 2 } })
    expect(tenant.limits.width).toEqual([3, 6])
    expect(tenant.limits.height).toEqual(demoTenant.limits.height)
    const config = normalizeConfig(tenant, { ...demoTenant.defaultConfig, width: 7, depth: 5, heaters: 6 })
    expect(config.width).toBe(6)
    expect(config.depth).toBe(4.5)
    expect(config.heaters).toBe(2)
    expect(parseOverrides({ limits: { width: [6, 3] } }).ok).toBe(false)
    expect(parseOverrides({ limits: { width: [0.5, 3] } }).ok).toBe(false)
  })
})
