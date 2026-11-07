import { describe, expect, it } from 'vitest'
import { demoTenant } from '../src/tenants/demo'
import { enabledRoofs, normalizeConfig } from '../src/tenants/rules'
import { configToCompact, compactToJson } from '../src/lib/shareCode'

describe('tetőtípus-váltás oda-vissza', () => {
  const roofs = enabledRoofs(demoTenant)
  const base = normalizeConfig(demoTenant, demoTenant.defaultConfig)

  it('minden tetőpár: A → B → A után a tető újra A, és a konfiguráció érvényes marad', () => {
    for (const a of roofs) for (const b of roofs) {
      const start = normalizeConfig(demoTenant, { ...base, roof: a })
      const mid = normalizeConfig(demoTenant, { ...start, roof: b })
      const back = normalizeConfig(demoTenant, { ...mid, roof: a })
      expect(mid.roof).toBe(b)
      expect(back.roof).toBe(a)
      // idempotens: még egyszer normalizálva nem változik
      expect(normalizeConfig(demoTenant, back)).toEqual(back)
    }
  })

  it('a megosztó link minden tetőtípusnál visszaadja ugyanazt a tetőt', () => {
    for (const roof of roofs) {
      const config = normalizeConfig(demoTenant, { ...base, roof })
      const decoded = compactToJson(configToCompact(config)) as { roof?: string }
      expect(decoded.roof).toBe(roof)
    }
  })
})
