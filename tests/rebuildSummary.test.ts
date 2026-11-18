import { describe, expect, it } from 'vitest'
import { summaryRows } from '../src/lib/rebuildSummary'
import { demoTenant } from '../src/tenants/demo'
import { productDefaultConfig } from '../src/lib/config'

describe('összegzés sorai', () => {
  it('a hat beállító lépés mindegyike szerepel, a lépés azonosítójával', () => {
    const config = productDefaultConfig(demoTenant, 'pergola')
    const rows = summaryRows(config, demoTenant)
    expect(rows.map((row) => row.step)).toEqual(['size', 'mount', 'roof', 'sides', 'color', 'extras'])
    expect(rows.every((row) => row.value.length > 0)).toBe(true)
  })

  it('a választásokat tükrözi: méret, kéttónusú szín, kiegészítők', () => {
    const config = { ...productDefaultConfig(demoTenant, 'pergola'), width: 5.2, depth: 4, heaters: 2, speakers: true, roofColor: 'white' as const }
    const rows = Object.fromEntries(summaryRows(config, demoTenant).map((row) => [row.step, row.value]))
    expect(rows.mount).toContain('5,2')
    expect(rows.color).toContain('fehér')
    expect(rows.extras).toContain('2 fűtőpanel')
    expect(rows.extras).toContain('hangrendszer')
  })
})
