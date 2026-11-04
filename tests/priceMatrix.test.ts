import { describe, expect, it } from 'vitest'
import { calculatePrice, DEFAULT_PRICES } from '../src/lib/pricing'
import { getMatrixPrice } from '../src/lib/priceMatrix'
import { priceSettingsSchema } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'

const grid = [
  { width: 3, depth: 3, netPrice: 900000 }, { width: 3, depth: 4, netPrice: 1200000 },
  { width: 4, depth: 3, netPrice: 1200000 }, { width: 4, depth: 4, netPrice: 1600000 },
]

describe('ármátrix', () => {
  it('pontos egyezésnél a gyártó ára', () => {
    expect(getMatrixPrice(3, 4, grid)).toEqual({ netPrice: 1200000, exact: true })
  })
  it('köztes méretnél interpolál', () => {
    const mid = getMatrixPrice(3.5, 3.5, grid)!
    expect(mid.exact).toBe(false)
    expect(mid.netPrice).toBeGreaterThan(900000)
    expect(mid.netPrice).toBeLessThan(1600000)
    expect(mid.netPrice).toBeCloseTo(1225000, 0)
  })
  it('hiányos mátrixnál is ad értéket, és a mérettel nő', () => {
    const sparse = [grid[0], grid[3]]
    const a = getMatrixPrice(3.5, 3.5, sparse)!.netPrice
    const b = getMatrixPrice(4, 3.5, sparse)!.netPrice
    expect(Number.isFinite(a)).toBe(true)
    expect(b).toBeGreaterThan(a)
  })
  it('tartományon kívül területarányosan skáláz', () => {
    const big = getMatrixPrice(5, 4, grid)!.netPrice
    expect(big).toBeCloseTo(1600000 * (5 / 4), 0)
  })
  it('üres vagy hibás mátrixra null (m²-ár marad)', () => {
    expect(getMatrixPrice(3, 3, undefined)).toBeNull()
    expect(getMatrixPrice(3, 3, [])).toBeNull()
    expect(getMatrixPrice(3, 3, [{ width: 0, depth: 3, netPrice: 5 }, { width: 3, depth: 3, netPrice: Number.NaN }])).toBeNull()
  })
  it('a calculatePrice a mátrixot használja, mátrix nélkül a m²-árat', () => {
    const config = { ...demoTenant.defaultConfig, roof: 'louvered' as const, width: 4, depth: 3 }
    const plain = calculatePrice(config, DEFAULT_PRICES)
    const matrix = calculatePrice(config, { ...DEFAULT_PRICES, priceMatrix: { louvered: grid } })
    const line = (price: typeof plain) => price.lines.find((item) => item.id === 'structure')!.amountNet
    expect(line(plain)).toBe(Math.round((4 * 3 * DEFAULT_PRICES.louveredPerM2Net) / 1000) * 1000)
    expect(line(matrix)).toBe(1200000)
    // más tetőtípust nem érint
    const other = calculatePrice({ ...config, roof: 'fixed' }, { ...DEFAULT_PRICES, priceMatrix: { louvered: grid } })
    expect(line(other)).toBe(Math.round((4 * 3 * DEFAULT_PRICES.fixedPerM2Net) / 1000) * 1000)
  })
  it('a séma átengedi a mátrixot, és a demo mátrixa érvényes', () => {
    expect(priceSettingsSchema.safeParse({ ...DEFAULT_PRICES, priceMatrix: { louvered: grid } }).success).toBe(true)
    expect(priceSettingsSchema.safeParse(demoTenant.prices).success).toBe(true)
  })
})
