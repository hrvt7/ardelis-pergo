import { describe, expect, it } from 'vitest'
import { calculatePrice } from '../src/lib/pricing'
import { configToHash, hashToJson } from '../src/lib/shareCode'
import { demoTenant } from '../src/tenants/demo'
import { normalizeConfig, parseConfig, presetConfig, roofLabels, tenantPrice } from '../src/tenants/rules'
import type { Tenant } from '../src/tenants/types'

const narrowTenant: Tenant = {
  ...demoTenant,
  id: 'teszt',
  demo: false,
  roofs: { louvered: demoTenant.roofs.louvered },
  sides: ['zip'],
  mounts: ['freestanding'],
  customRal: false,
  extras: { led: true, speakers: false, sensors: false },
  limits: { width: [3, 6], depth: [3, 4], height: [2.4, 2.8], maxHeaters: 2 },
}

describe('gyártói szabályok', () => {
  it('a demó árazása megegyezik az eredeti kalkulációval', () => {
    const config = demoTenant.defaultConfig
    expect(tenantPrice(demoTenant, config)).toEqual(calculatePrice(config, demoTenant.prices))
    expect(tenantPrice(demoTenant, config).totalGross).toBe(8080000)
  })

  it('a nem kínált opciókat és a határon kívüli méreteket kiigazítja', () => {
    const normalized = normalizeConfig(narrowTenant, {
      ...demoTenant.defaultConfig,
      width: 9, depth: 1, height: 3.2, mount: 'wall', roof: 'retractable', frameColor: 'custom', customRal: 'RAL 3004',
      sides: { front: 'glass', back: 'zip', left: 'louver', right: 'none' }, speakers: true, sensors: true, heaters: 4,
    })
    expect(normalized).toMatchObject({ width: 6, depth: 3, height: 2.8, mount: 'freestanding', roof: 'louvered', frameColor: 'anthracite', speakers: false, sensors: false, heaters: 2 })
    expect(normalized.customRal).toBeUndefined()
    expect(normalized.sides).toEqual({ front: 'none', back: 'zip', left: 'none', right: 'none' })
  })

  it('hibás bemenetre nullt ad, nem dob kivételt', () => {
    expect(parseConfig(demoTenant, null)).toBeNull()
    expect(parseConfig(demoTenant, { width: 'sok' })).toBeNull()
  })

  it('a csomagok a gyártó alapkonfigurációjára épülnek', () => {
    const preset = presetConfig(narrowTenant, { width: 5.5 })
    expect(preset.width).toBe(5.5)
    expect(preset.mount).toBe('freestanding')
  })

  it('a gyártó termékneve kerül a tételsorba', () => {
    const renamed: Tenant = { ...demoTenant, roofs: { ...demoTenant.roofs, louvered: { name: 'Bioclima', short: 'motoros lamellás', description: '' } } }
    expect(roofLabels(renamed).louvered).toBe('Bioclima · motoros lamellás')
    expect(tenantPrice(renamed, demoTenant.defaultConfig).lines[0].label).toBe('Bioclima · motoros lamellás')
  })

  it('a megosztó link ékezetes adattal is visszaolvasható', () => {
    const config = { ...demoTenant.defaultConfig, frameColor: 'custom' as const, customRal: 'Zöld 6005' }
    expect(hashToJson(configToHash(config))).toEqual(config)
  })
})
