import { describe, expect, it } from 'vitest'
import { demoTenant } from '../src/tenants/demo'
import { normalizeConfig } from '../src/tenants/rules'
import { allIssues, FIX_RULES, resolveFix } from '../src/lib/issueFixes'
import type { PergolaConfig } from '../src/types/pergola'
import type { Tenant } from '../src/tenants/types'

const tenant: Tenant = { ...demoTenant, extras: { ...demoTenant.extras, sensors: true, roofShade: true } }
const base = normalizeConfig(tenant, { ...demoTenant.defaultConfig })
const make = (patch: Partial<PergolaConfig>, t: Tenant = tenant) => normalizeConfig(t, { ...base, ...patch })
const ids = (config: PergolaConfig) => allIssues(config).map((issue) => issue.id)

describe('figyelmeztetés + egy kattintásos javítás', () => {
  it('nagy lamellás tető érzékelő nélkül: a javítás bekapcsolja az érzékelőt, és a jelzés eltűnik', () => {
    const config = make({ roof: 'louvered', width: 6, depth: 4, sensors: false })
    expect(ids(config)).toContain('rain-sensor')
    const fix = resolveFix(tenant, config, 'rain-sensor')!
    expect(fix.patch).toEqual({ sensors: true })
    expect(ids(normalizeConfig(tenant, { ...config, ...fix.patch }))).not.toContain('rain-sensor')
  })

  it('ha a gyártó nem kínálja a megoldást, nincs gomb (a jelzés marad)', () => {
    const noSensors: Tenant = { ...tenant, extras: { ...tenant.extras, sensors: false } }
    const config = make({ roof: 'louvered', width: 6, depth: 4, sensors: false }, noSensors)
    expect(resolveFix(noSensors, config, 'rain-sensor')).toBeNull()
  })

  it('a rendszer magától nem módosít: a jelzés a javítás elfogadásáig a konfigurációban marad', () => {
    const config = make({ roof: 'louvered', width: 6, depth: 4, sensors: false })
    expect(config.sensors).toBe(false)
  })

  it('ismeretlen vagy éppen nem fennálló jelzéshez nincs javítás', () => {
    expect(resolveFix(tenant, base, 'nincs-ilyen')).toBeNull()
    expect(resolveFix(tenant, make({ sensors: true }), 'rain-sensor')).toBeNull()
  })

  it('egyetlen javítás sem hoz be új figyelmeztetést (minden szabály, a demó gyártóval)', () => {
    const scenarios: Partial<PergolaConfig>[] = [
      { roof: 'louvered', width: 6, depth: 4, sensors: false },
      { roof: 'glass', roofShade: undefined },
      { sides: { ...base.sides, front: 'glass' }, width: 6 },
      { building: 'conservatory', roof: 'glass', foundation: false, pitch: undefined, sides: { front: 'none', back: 'none', left: 'none', right: 'none' } },
      { building: 'veranda', roof: 'glass', sides: { front: 'none', back: 'none', left: 'glassFixed', right: 'glassFixed' } },
    ]
    for (const patch of scenarios) {
      const config = make(patch)
      const before = allIssues(config)
      for (const issue of before) {
        const fix = resolveFix(tenant, config, issue.id)
        if (!fix) continue
        expect(FIX_RULES[issue.id]).toBeDefined()
        const after = allIssues(normalizeConfig(tenant, { ...config, ...fix.patch }))
        expect(after.map((item) => item.id)).not.toContain(issue.id)
        const newWarns = after.filter((item) => item.level === 'warn' && !before.some((old) => old.id === item.id && old.level === 'warn'))
        expect(newWarns).toEqual([])
      }
    }
  })
})
