import { describe, expect, it } from 'vitest'
import { demoTenant } from '../src/tenants/demo'
import { getEngine } from '../src/products/engines'
import { BOM_DISCLAIMER, bomCsv } from '../src/lib/bomCsv'
import { getBom } from '../src/lib/specification'
import type { PergolaConfig } from '../src/types/pergola'

const engine = getEngine('pergola')!
const config = engine.parse(demoTenant, demoTenant.defaultConfig) as PergolaConfig
const price = engine.price(demoTenant, config)
const csv = bomCsv(demoTenant, { ref: 'LX-0042', customer_name: 'Kovács "Péter"' }, config, price)
const rows = csv.replace(/^\uFEFF/, '').trim().split('\r\n')

describe('anyaglista CSV az adminból', () => {
  it('Excel-barát: UTF-8 BOM, pontosvessző, idézőjelek kettőzve', () => {
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(rows).toContain('"Vevő";"Kovács ""Péter"""')
  })

  it('az első sor kimondja: tájékoztató, nem gyártási anyagszükséglet', () => {
    expect(rows[0]).toBe(`"${BOM_DISCLAIMER}"`)
    expect(rows).toContain('"ANYAGLISTA (tájékoztató)";"Mennyiség / méret"')
  })

  it('a PDF-fel azonos tételek (a 0 db-osak nélkül), és egyező árak', () => {
    for (const line of getBom(config).filter((item) => !/^0 db\b/.test(item.value))) expect(csv).toContain(`"${line.label}";"${line.value}"`)
    expect(csv).not.toMatch(/;"0 db"/)
    expect(rows).toContain(`"Bruttó irányár";"";"${price.totalGross}"`)
    const sum = price.lines.reduce((total, line) => total + Math.round(line.amountNet), 0) + Math.round(price.installationNet)
    expect(Math.abs(sum - price.totalNet)).toBeLessThanOrEqual(price.lines.length + 1)
  })
})
