import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatMoney, formatPrice, roundMoney, setDisplayCurrency, signedPrice, unitLabel } from '../src/lib/money'
import { calculatePrice, DEFAULT_PRICES } from '../src/lib/pricing'
import { energyCostSupported } from '../src/lib/energy'
import { tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import { AT_REGIONS, demoAtTenant } from '../src/tenants/demo-at'
import { getTenant, listTenantIds } from '../src/tenants'
import { customerEmailHtml, handleLeadRequest, resetLeadRateLimit, type LeadRecord } from '../server/lead'
import { bomCsv } from '../src/lib/bomCsv'

// Az Intl a pénznemjel mellé (keskeny) nem törő szóközt tesz: a tesztben sima szóközre cseréljük.
const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, ' ')

afterEach(() => setDisplayCurrency('HUF'))

describe('pénznem: formázás és kerekítés', () => {
  it('HUF magyar, EUR osztrák formátumban, egészre kerekítve, -0 nélkül', () => {
    expect(plain(formatMoney(1234567, 'HUF'))).toBe('1 234 567 Ft')
    expect(plain(formatMoney(12345.4, 'EUR'))).toBe('€ 12.345')
    expect(plain(formatMoney(-0.2, 'EUR'))).toBe('€ 0')
  })

  it('kerekítési lépcső: HUF 1000 Ft, EUR 1 € (nem 1000 €)', () => {
    expect(roundMoney(12_499, 'HUF')).toBe(12_000)
    expect(roundMoney(12_500, 'HUF')).toBe(13_000)
    expect(roundMoney(1234.49, 'EUR')).toBe(1234)
    expect(roundMoney(1234.5, 'EUR')).toBe(1235)
  })

  it('a felületi formázó a beállított megjelenítési pénznemet követi', () => {
    expect(plain(formatPrice(15000))).toBe('15 000 Ft')
    setDisplayCurrency('EUR')
    expect(plain(formatPrice(15000))).toBe('€ 15.000')
    expect(unitLabel('Ft/m²')).toBe('€/m²')
    expect(unitLabel('Ft/°/fm')).toBe('€/°/fm')
  })

  it('előjeles különbözet: EUR-nál a 300 €-s felár nem tűnik el nullaként (régi küszöb: 500)', () => {
    expect(plain(signedPrice(300, 'EUR'))).toBe('+€ 300')
    expect(plain(signedPrice(-40, 'EUR'))).toBe('−€ 40')
    expect(plain(signedPrice(0.3, 'EUR'))).toBe('±€ 0')
    expect(plain(signedPrice(400, 'HUF'))).toBe('±0 Ft')
    expect(plain(signedPrice(120_000, 'HUF'))).toBe('+120 000 Ft')
  })
})

describe('árszámítás pénznemenként', () => {
  it('a HUF-os ár változatlan (alapértelmezett pénznem)', () => {
    const before = calculatePrice(demoTenant.defaultConfig, DEFAULT_PRICES)
    const explicit = calculatePrice(demoTenant.defaultConfig, DEFAULT_PRICES, undefined, 'HUF')
    expect(explicit).toEqual(before)
    expect(before.lines.every((line) => line.amountNet % 1000 === 0)).toBe(true)
  })

  it('EUR gyártó: egész euró tételek, 20% osztrák ÁFA, euróban írt tételleírás', () => {
    const price = tenantPrice(demoAtTenant, demoAtTenant.defaultConfig)
    expect(price.lines.every((line) => Number.isInteger(line.amountNet))).toBe(true)
    // Ha 1000-es lépcsővel kerekítene, a kis felárak (pl. 60 €/fm) nullára vagy 1000 €-ra ugranának.
    expect(price.lines.some((line) => line.amountNet % 1000 !== 0)).toBe(true)
    expect(price.vatNet).toBe(Math.round(price.totalNet * 0.2))
    expect(price.totalGross).toBe(price.totalNet + price.vatNet)
    const structure = price.lines.find((line) => line.id === 'structure')!
    expect(plain(structure.detail)).toContain('€ 420 / m²')
    expect(structure.detail).not.toContain('Ft')
    // Bemutató nagyságrend: 5 × 4 m lamellás, ZIP, LED, szenzor — tízezer eurós tartomány.
    expect(price.totalGross).toBeGreaterThan(8_000)
    expect(price.totalGross).toBeLessThan(30_000)
  })
})

describe('gyártói szabályok a pénznemhez', () => {
  it('az osztrák demó elérhető, EUR, 20% ÁFA, osztrák tartományokkal, havi részletpélda nélkül', () => {
    expect(getTenant('demo-at')).toBe(demoAtTenant)
    expect(demoAtTenant.currency).toBe('EUR')
    expect(demoAtTenant.prices.vatRate).toBe(0.2)
    expect(demoAtTenant.regions).toEqual(AT_REGIONS)
    expect(demoAtTenant.installmentMonths).toBe(0)
  })

  it('EUR gyártó csak teraszfedést kínálhat (a többi termékcsalád árazója forintos)', () => {
    for (const id of listTenantIds()) {
      const tenant = getTenant(id)!
      if (tenant.currency !== 'HUF') expect(tenant.products ?? ['pergola'], id).toEqual(['pergola'])
    }
  })

  it('az áramköltség-becslés (magyar tarifa) csak forintos gyártónál', () => {
    expect(energyCostSupported('HUF')).toBe(true)
    expect(energyCostSupported('EUR')).toBe(false)
  })

  it('a szerver soha nem a böngészős megjelenítési pénznemmel formáz', () => {
    const dir = join(__dirname, '..', 'server')
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.ts'))) {
      const source = readFileSync(join(dir, file), 'utf8')
      expect(source, file).not.toMatch(/\bformatPrice\b|\bgetDisplayCurrency\b|\bsetDisplayCurrency\b|\bformatHuf\b/)
    }
  })
})

describe('osztrák lead végponttól végpontig', () => {
  beforeEach(() => resetLeadRateLimit())
  afterEach(() => { vi.restoreAllMocks() })

  it('elfogad osztrák tartományt, és a vevői e-mail euróban mutatja az irányárat', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const payload = {
      tenantId: 'demo-at', config: demoAtTenant.defaultConfig,
      customer: { name: 'Max Muster', email: 'max@example.com', phone: '+43 664 1234567', postalCode: '8010', city: 'Graz', region: 'Steiermark', address: '', notes: '' },
      consent: true, website: '', elapsedMs: 60_000, source: 'demo',
    }
    const response = await handleLeadRequest(new Request('https://example.test/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }), { NODE_ENV: 'development' })
    expect(response.status).toBe(200)

    const price = tenantPrice(demoAtTenant, demoAtTenant.defaultConfig)
    const record = { ref: 'T-1', tenant: demoAtTenant, input: payload, config: demoAtTenant.defaultConfig, price, configUrl: 'https://example.test/k/demo-at', createdAt: new Date(), headline: 'Aero', spec: [], bom: [] } as unknown as LeadRecord
    const html = plain(customerEmailHtml(record))
    expect(html).toContain(plain(formatMoney(price.totalGross, 'EUR')))
    expect(html).not.toMatch(/\d Ft\b/)
  })

  it('anyaglista CSV: a pénznem a gyártóé', () => {
    const price = tenantPrice(demoAtTenant, demoAtTenant.defaultConfig)
    const csv = bomCsv(demoAtTenant, { ref: 'T-1', customer_name: 'Max Muster' }, demoAtTenant.defaultConfig, price)
    expect(csv).toContain('Nettó EUR')
    expect(csv).not.toContain('Nettó Ft')
  })
})
