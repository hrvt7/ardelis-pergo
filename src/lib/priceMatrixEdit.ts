// Az admin ármátrix-szerkesztő tiszta logikája: szerkesztési sorok ↔ PriceMatrixPoint[],
// beillesztés táblázatból és mentés előtti ellenőrzés. A számolás (priceMatrix.ts) érintetlen.
import type { PriceMatrixPoint } from '../types/pergola'

export interface MatrixRow {
  id: string
  width: string
  depth: string
  price: string
}

export type MatrixField = 'width' | 'depth' | 'price'

export interface MatrixRowError {
  row: number
  field: MatrixField | null
  message: string
}

/** A szerver sémájával (tenants/rules.ts) egyező korlátok. */
export const MATRIX_LIMITS = { maxSize: 30, maxPrice: 200_000_000, maxRows: 400 } as const

let counter = 0
const nextId = () => `r${Date.now().toString(36)}${(counter++).toString(36)}`

export const emptyRow = (): MatrixRow => ({ id: nextId(), width: '', depth: '', price: '' })

const formatPlain = (value: number) => String(Math.round(value * 1000) / 1000)

export function pointsToRows(points: readonly PriceMatrixPoint[] | undefined): MatrixRow[] {
  return (points ?? []).map((point) => ({ id: nextId(), width: formatPlain(point.width), depth: formatPlain(point.depth), price: String(Math.round(point.netPrice)) }))
}

/** „4,5” → 4.5; „1 830 000” → 1830000; üres vagy nem szám → NaN. */
export function parseNumber(value: string): number {
  const cleaned = value.trim().replace(/[\s\u00a0]/g, '').replace(/(Ft|HUF|m)$/i, '').replace(',', '.')
  if (!cleaned || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return Number.NaN
  return Number(cleaned)
}

const isBlank = (row: MatrixRow) => !row.width.trim() && !row.depth.trim() && !row.price.trim()
export const sizeKey = (width: number, depth: number) => `${Math.round(width * 1000)}x${Math.round(depth * 1000)}`

/**
 * Mentés előtti ellenőrzés. Az üres sorokat kihagyja; hibánál a sor (1-től számozva)
 * és a hibás mező is visszajön. Siker esetén a pontok szélesség, majd mélység szerint rendezve.
 */
export function validateMatrixRows(rows: readonly MatrixRow[]): { points: PriceMatrixPoint[]; errors: MatrixRowError[] } {
  const errors: MatrixRowError[] = []
  const points: PriceMatrixPoint[] = []
  const seen = new Map<string, number>()
  rows.forEach((row, index) => {
    if (isBlank(row)) return
    const number = index + 1
    const width = parseNumber(row.width)
    const depth = parseNumber(row.depth)
    const price = parseNumber(row.price)
    const checks: [MatrixField, number, number, string][] = [
      ['width', width, MATRIX_LIMITS.maxSize, 'A szélesség'],
      ['depth', depth, MATRIX_LIMITS.maxSize, 'A mélység'],
      ['price', price, MATRIX_LIMITS.maxPrice, 'A nettó ár'],
    ]
    let ok = true
    for (const [field, value, max, label] of checks) {
      if (!Number.isFinite(value)) { errors.push({ row: number, field, message: `${number}. sor: ${label} hiányzik vagy nem szám.` }); ok = false }
      else if (value <= 0) { errors.push({ row: number, field, message: `${number}. sor: ${label} legyen pozitív szám.` }); ok = false }
      else if (value > max) { errors.push({ row: number, field, message: `${number}. sor: ${label} túl nagy (legfeljebb ${max.toLocaleString('hu-HU')}).` }); ok = false }
    }
    if (!ok) return
    const key = sizeKey(width, depth)
    const first = seen.get(key)
    if (first !== undefined) { errors.push({ row: number, field: null, message: `${number}. sor: a ${formatPlain(width)} × ${formatPlain(depth)} m méret már szerepel a(z) ${first}. sorban.` }); return }
    seen.set(key, number)
    points.push({ width, depth, netPrice: Math.round(price) })
  })
  if (points.length > MATRIX_LIMITS.maxRows) errors.push({ row: 0, field: null, message: `Legfeljebb ${MATRIX_LIMITS.maxRows} sor adható meg tetőtípusonként.` })
  points.sort((a, b) => a.width - b.width || a.depth - b.depth)
  return { points, errors }
}

/** Táblázatból (Excel, Google Táblázatok) másolt szöveg → sorok. Tabulátor, pontosvessző vagy több szóköz választhat el. */
export function parsePastedRows(text: string): MatrixRow[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const parts = (line.includes('\t') ? line.split('\t') : line.includes(';') ? line.split(';') : line.split(/\s{2,}/)).map((part) => part.trim())
    if (parts.length < 3) return []
    // Fejlécsor (pl. „Szélesség  Mélység  Ár”) kihagyása.
    if (!Number.isFinite(parseNumber(parts[0])) && !Number.isFinite(parseNumber(parts[1]))) return []
    return [{ id: nextId(), width: parts[0], depth: parts[1], price: parts.slice(2).join('') }]
  })
}

/** Nettó ár / m² — a szerkesztőben elírás-figyelőnek. */
export function pricePerSquareMeter(row: MatrixRow): number | null {
  const width = parseNumber(row.width)
  const depth = parseNumber(row.depth)
  const price = parseNumber(row.price)
  return width > 0 && depth > 0 && price > 0 ? Math.round(price / (width * depth)) : null
}
