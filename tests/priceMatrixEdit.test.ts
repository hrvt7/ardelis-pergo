import { describe, expect, it } from 'vitest'
import { parseNumber, parsePastedRows, pointsToRows, pricePerSquareMeter, validateMatrixRows, type MatrixRow } from '../src/lib/priceMatrixEdit'
import { getMatrixPrice } from '../src/lib/priceMatrix'

const row = (width: string, depth: string, price: string, id = Math.random().toString(36)): MatrixRow => ({ id, width, depth, price })

describe('ármátrix-szerkesztő', () => {
  it('magyar számformátumot olvas', () => {
    expect(parseNumber('4,5')).toBe(4.5)
    expect(parseNumber(' 1 830 000 ')).toBe(1830000)
    expect(parseNumber('1 830 000 Ft')).toBe(1830000)
    expect(parseNumber('')).toBeNaN()
    expect(parseNumber('abc')).toBeNaN()
    expect(parseNumber('4x')).toBeNaN()
  })

  it('érvényes sorokból rendezett pontokat ad, az üres sort kihagyja', () => {
    const { points, errors } = validateMatrixRows([row('5', '4', '2 650 000'), row('', '', ''), row('4', '3', '1830000'), row('4', '4', '2100000')])
    expect(errors).toEqual([])
    expect(points).toEqual([{ width: 4, depth: 3, netPrice: 1830000 }, { width: 4, depth: 4, netPrice: 2100000 }, { width: 5, depth: 4, netPrice: 2650000 }])
  })

  it('nem pozitív, hiányzó és túl nagy értéket jelez a mezővel együtt', () => {
    const { errors } = validateMatrixRows([row('0', '3', '100'), row('4', '', '100'), row('4', '3', '-5'), row('31', '3', '100')])
    expect(errors.map((error) => [error.row, error.field])).toEqual([[1, 'width'], [2, 'depth'], [3, 'price'], [4, 'width']])
  })

  it('a duplikált méretpárt (4 = 4,0) jelzi', () => {
    const { errors, points } = validateMatrixRows([row('4', '3', '100'), row('4,0', '3', '200')])
    expect(points).toHaveLength(1)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({ row: 2, field: null })
    expect(errors[0].message).toContain('1. sor')
  })

  it('a mentett pontok visszatöltve ugyanazt adják, és a számolás nem változik', () => {
    const original = [{ width: 3.5, depth: 3, netPrice: 1500000 }, { width: 6, depth: 4.5, netPrice: 3400000 }]
    const { points, errors } = validateMatrixRows(pointsToRows(original))
    expect(errors).toEqual([])
    expect(points).toEqual(original)
    expect(getMatrixPrice(3.5, 3, points)).toEqual(getMatrixPrice(3.5, 3, original))
    expect(getMatrixPrice(5, 4, points)).toEqual(getMatrixPrice(5, 4, original))
  })

  it('Excelből másolt sorokat olvas, a fejlécet kihagyja', () => {
    const rows = parsePastedRows('Szélesség\tMélység\tÁr\n4\t3\t1 830 000\n5;4;2650000\n\nhibás sor')
    expect(rows.map(({ width, depth, price }) => [width, depth, price])).toEqual([['4', '3', '1 830 000'], ['5', '4', '2650000']])
  })

  it('m²-árat számol elírás-figyelőnek', () => {
    expect(pricePerSquareMeter(row('4', '3', '1200000'))).toBe(100000)
    expect(pricePerSquareMeter(row('4', '', '1200000'))).toBeNull()
  })
})
