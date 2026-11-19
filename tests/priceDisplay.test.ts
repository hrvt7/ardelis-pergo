import { describe, expect, it } from 'vitest'
import { fromPrice, priceDisplayOf, showsPrices } from '../src/lib/priceDisplay'
import { applyOverrides, parseOverrides, publicOverrides } from '../src/tenants/overrides'
import { demoTenant } from '../src/tenants/demo'

describe('ár megjelenítése gyártónként (M05)', () => {
  it('alapból becsült teljes ár; ismeretlen értékre is', () => {
    expect(priceDisplayOf({})).toBe('estimate')
    expect(priceDisplayOf({ priceDisplay: 'nonsense' as never })).toBe('estimate')
    expect(priceDisplayOf({ priceDisplay: 'hidden' })).toBe('hidden')
    expect(showsPrices('from')).toBe(true)
    expect(showsPrices('hidden')).toBe(false)
  })
  it('a „-tól” irányár lefelé kerekít, soha nem több a becslésnél', () => {
    expect(fromPrice(5_648_000, 'HUF')).toBe(5_600_000)
    expect(fromPrice(5_600_000, 'HUF')).toBe(5_600_000)
    expect(fromPrice(30_000, 'HUF')).toBe(50_000)
    expect(fromPrice(14_380, 'EUR')).toBe(14_300)
    expect(fromPrice(0, 'HUF')).toBe(0)
    for (const value of [123_456, 2_588_000, 9_999_999]) expect(fromPrice(value, 'HUF')).toBeLessThanOrEqual(value)
  })
  it('az admin beállítás mentődik, a böngészőbe is eljut, rossz értéket elutasít', () => {
    expect(parseOverrides({ priceDisplay: 'from' }).ok).toBe(true)
    expect(parseOverrides({ priceDisplay: 'secret' }).ok).toBe(false)
    expect(applyOverrides(demoTenant, { priceDisplay: 'hidden' }).priceDisplay).toBe('hidden')
    expect(priceDisplayOf(applyOverrides(demoTenant, {}))).toBe('estimate')
    expect(publicOverrides({ priceDisplay: 'from' }).priceDisplay).toBe('from')
  })
})

describe('PDF a gyártói ármóddal', async () => {
  const { buildPdfDefinition } = await import('../src/lib/pdfDocument')
  const { calculatePrice, formatPrice, ROOF_LABELS } = await import('../src/lib/pricing')
  const config = demoTenant.defaultConfig
  const price = calculatePrice(config, demoTenant.prices, ROOF_LABELS)
  const pdf = (priceDisplay?: 'estimate' | 'from' | 'hidden') => JSON.stringify(buildPdfDefinition({ config, price, tenant: { ...demoTenant, priceDisplay }, date: new Date('2026-11-18') }))
  it('becsült módban a teljes ár és a tételes kalkuláció benne van', () => {
    const text = pdf()
    expect(text).toContain(formatPrice(price.totalGross))
    expect(text).toContain('Árkalkuláció')
  })
  it('„-tól” módban csak a kerekített irányár, tételek nélkül', () => {
    const text = pdf('from')
    expect(text).toContain(`${formatPrice(fromPrice(price.totalGross, 'HUF'))}-tól`)
    expect(text).not.toContain('Árkalkuláció')
    expect(text).not.toContain(formatPrice(price.totalNet))
  })
  it('ár nélküli módban sehol nincs összeg', () => {
    const text = pdf('hidden')
    expect(text).not.toContain(formatPrice(price.totalGross))
    expect(text).not.toContain(formatPrice(price.totalNet))
    expect(text).not.toContain('Árkalkuláció')
    expect(text).toContain('Egyedi ajánlat')
  })
})

describe('vevői e-mailek a gyártói ármóddal', async () => {
  const { customerEmailHtml } = await import('../server/lead')
  const { customerFollowUpHtml } = await import('../server/followup')
  const record = (priceDisplay?: 'from' | 'hidden') => ({ tenant: { ...demoTenant, priceDisplay }, ref: 'LX-1', headline: 'Aero · 5,00 × 4,00 m', configUrl: 'https://lamelix.vercel.app/k/demo#c=1', price: { totalGross: 5_648_000 }, input: { customer: { name: 'Kovács Péter' } } })
  const lead = { ref: 'LX-1', tenant_id: 'demo', customer_name: 'Kovács Péter', email: 'kp@example.com', phone: '+36301234567', city: 'Sárvár', notes: null, address: null, estimate_gross: 5_648_000, config_url: 'https://lamelix.vercel.app/k/demo#c=1', status: 'new', created_at: '2026-11-10T10:00:00Z' }
  const digits = (html: string) => html.replace(/\s|&nbsp;|\u00a0|\u202f/g, '')
  it('visszaigazolás: becsült, „-tól” és ár nélküli változat', () => {
    expect(digits(customerEmailHtml(record() as never))).toContain('5648000')
    expect(digits(customerEmailHtml(record('from') as never))).toContain('5600000')
    expect(digits(customerEmailHtml(record('from') as never))).not.toContain('5648000')
    const hidden = customerEmailHtml(record('hidden') as never)
    expect(digits(hidden)).not.toContain('5648000')
    expect(hidden).toContain('helyszíni felmérés után')
  })
  it('emlékeztető: csak becsült módban említ összeget', () => {
    expect(digits(customerFollowUpHtml(demoTenant, lead as never, {}))).toContain('5648000')
    expect(digits(customerFollowUpHtml({ ...demoTenant, priceDisplay: 'hidden' }, lead as never, {}))).not.toContain('5648000')
    expect(digits(customerFollowUpHtml({ ...demoTenant, priceDisplay: 'from' }, lead as never, {}))).not.toContain('5648000')
  })
})
