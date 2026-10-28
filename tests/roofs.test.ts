import { describe, expect, it } from 'vitest'
import { ROOF_INFO, ROOF_TYPES } from '../src/lib/roofs'
import { decodeShareHash, shareHash } from '../src/lib/shareCode'
import { getBom, getSpecCode } from '../src/lib/specification'
import { enabledRoofs, parseConfig, tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'

describe('tetőrendszerek', () => {
  it('mind a 6 típus elérhető a demóban, egyedi link- és termékkóddal', () => {
    expect(enabledRoofs(demoTenant)).toEqual(ROOF_TYPES)
    expect(new Set(ROOF_TYPES.map((roof) => ROOF_INFO[roof].share)).size).toBe(ROOF_TYPES.length)
    expect(new Set(ROOF_TYPES.map((roof) => ROOF_INFO[roof].spec)).size).toBe(ROOF_TYPES.length)
  })
  it('minden típus saját m²-árral számol, és a link oda-vissza megőrzi', () => {
    const prices = new Set<number>()
    for (const roof of ROOF_TYPES) {
      const config = { ...demoTenant.defaultConfig, roof }
      const price = tenantPrice(demoTenant, config)
      expect(price.lines[0].amountNet).toBe(Math.round((20 * demoTenant.prices[ROOF_INFO[roof].priceKey]) / 1000) * 1000)
      prices.add(price.totalGross)
      expect(parseConfig(demoTenant, decodeShareHash(`#${shareHash(config)}`))?.roof).toBe(roof)
      expect(getSpecCode(config).startsWith(`PG-${ROOF_INFO[roof].spec}-`)).toBe(true)
      expect(getBom(config).length).toBeGreaterThan(5)
    }
    expect(prices.size).toBe(ROOF_TYPES.length)
  })
  it('régi árlista (új mezők nélkül) is betölthető alapértékekkel', async () => {
    const { priceSettingsSchema } = await import('../src/tenants/rules')
    const { fabricRoofPerM2Net, glassRoofPerM2Net, polycarbonatePerM2Net, ...old } = demoTenant.prices
    void fabricRoofPerM2Net; void glassRoofPerM2Net; void polycarbonatePerM2Net
    const parsed = priceSettingsSchema.parse(old)
    expect(parsed.glassRoofPerM2Net).toBeGreaterThan(0)
  })
})
