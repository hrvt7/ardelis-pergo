import { describe, expect, it } from 'vitest'
import { demoTenant } from '../src/tenants/demo'
import { getEngine } from '../src/products/engines'
import { buildPdfDefinition } from '../src/lib/pdfDocument'
import { leadPdfFileName, leadPdfInput } from '../src/lib/leadPdf'
import type { PergolaConfig } from '../src/types/pergola'

const engine = getEngine('pergola')!
const config = engine.parse(demoTenant, demoTenant.defaultConfig) as PergolaConfig
const gross = engine.price(demoTenant, config).totalGross
const lead = { config, product: 'pergola', notes: 'Hétvégén hívható\nHáz (3D): modern ház, antracit ablakok', estimate_gross: gross }

describe('PDF az adminból, egy lead tervéből', () => {
  it('ugyanazzal az érvényesítéssel és árral, mint a lead-végpont', () => {
    const input = leadPdfInput(demoTenant, lead)!
    expect(input.config).toEqual(config)
    expect(input.price.totalGross).toBe(gross)
    expect(input.priceChanged).toBe(false)
    expect(input.house).toBe('modern ház, antracit ablakok')
  })

  it('jelzi, ha az ár azóta változott', () => {
    expect(leadPdfInput(demoTenant, { ...lead, estimate_gross: gross - 50000 })!.priceChanged).toBe(true)
  })

  it('régi lead (termékjelölés nélkül) pergolának számít; más család és hibás terv: nincs PDF', () => {
    expect(leadPdfInput(demoTenant, { ...lead, product: null })).not.toBeNull()
    expect(leadPdfInput(demoTenant, { ...lead, product: 'fence' })).toBeNull()
    expect(leadPdfInput(demoTenant, { ...lead, config: null })).toBeNull()
    expect(leadPdfInput(demoTenant, { ...lead, config: { width: 'x' } as never })).toBeNull()
  })

  it('a dokumentum kép nélkül is felépül, a QR a vevő tervére mutat', () => {
    const input = leadPdfInput(demoTenant, lead)!
    const definition = buildPdfDefinition({ config: input.config, price: input.price, tenant: demoTenant, shareUrl: 'https://lamelix.vercel.app/k/demo#c=abc', projectName: 'Kovács Péter', house: input.house, date: new Date('2026-11-15') })
    const text = JSON.stringify(definition)
    expect(text).toContain('https://lamelix.vercel.app/k/demo#c=abc')
    expect(text.toUpperCase()).toContain('KOVÁCS PÉTER')
    expect(text).toContain('Árkalkuláció')
    expect(text).toContain('3D-látványterv az alábbi QR-kódról')
  })

  it('fájlnév: márka, azonosító, méret, ékezet és különleges jel nélkül', () => {
    expect(leadPdfFileName({ ...demoTenant, brand: { ...demoTenant.brand, name: 'Árnyék Kft.' } }, { ref: 'LX-2026/0042' }, config)).toMatch(/^Arnyek-Kft-LX-20260042-\d+\.\d\dx\d+\.\d\d\.pdf$/)
  })
})
