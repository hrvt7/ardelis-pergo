// Gyártói ármátrix (szélesség × mélység → nettó szerkezeti ár) és a belőle számolt ár.
// Tiszta függvények, böngészőben és szerveren is ugyanazt számolják.
import type { PriceMatrixPoint } from '../types/pergola'

export interface MatrixPrice {
  netPrice: number
  /** Pontos mátrixsor volt (különben interpolált / becsült). */
  exact: boolean
}

const EPS = 1e-6
const valid = (point: PriceMatrixPoint) => [point.width, point.depth, point.netPrice].every(Number.isFinite) && point.width > 0 && point.depth > 0 && point.netPrice > 0

/** Az érvénytelen sorok (0, negatív, NaN) kiszűrése — a hibás gyártói adat ne tegyen tönkre egy árat. */
export function cleanMatrix(matrix: readonly PriceMatrixPoint[] | undefined): PriceMatrixPoint[] {
  return (matrix ?? []).filter(valid)
}

const distinctSorted = (values: number[]) => [...new Set(values.map((value) => Math.round(value * 1000) / 1000))].sort((a, b) => a - b)

/**
 * A mátrixból a megadott méret nettó szerkezeti ára, vagy null, ha nincs (használható) mátrix.
 *  1. Pontos egyezés → a gyártó ára.
 *  2. Egyébként bilineáris interpoláció a környező rácspontok között. A hiányzó rácspontot a
 *     legközelebbi megadott sor m²-ára pótolja, így hiányos mátrix is működik.
 *  3. A tartományon kívül a legközelebbi szélső ár, a tényleges és a szélső terület arányában skálázva.
 */
export function getMatrixPrice(width: number, depth: number, matrix: readonly PriceMatrixPoint[] | undefined): MatrixPrice | null {
  const points = cleanMatrix(matrix)
  if (points.length === 0 || !(width > 0) || !(depth > 0)) return null

  const exact = points.find((point) => Math.abs(point.width - width) < EPS && Math.abs(point.depth - depth) < EPS)
  if (exact) return { netPrice: exact.netPrice, exact: true }

  const widths = distinctSorted(points.map((point) => point.width))
  const depths = distinctSorted(points.map((point) => point.depth))
  const node = (w: number, d: number) => {
    const hit = points.find((point) => Math.abs(point.width - w) < EPS && Math.abs(point.depth - d) < EPS)
    if (hit) return hit.netPrice
    let best = points[0]
    let bestDistance = Infinity
    for (const point of points) {
      const distance = (point.width - w) ** 2 + (point.depth - d) ** 2
      if (distance < bestDistance) { best = point; bestDistance = distance }
    }
    return (best.netPrice / (best.width * best.depth)) * w * d
  }
  const bracket = (values: number[], value: number): [number, number, number] => {
    if (value <= values[0]) return [values[0], values[0], 0]
    const last = values[values.length - 1]
    if (value >= last) return [last, last, 0]
    let index = 0
    while (values[index + 1] < value) index += 1
    return [values[index], values[index + 1], (value - values[index]) / (values[index + 1] - values[index])]
  }
  const [w0, w1, tw] = bracket(widths, width)
  const [d0, d1, td] = bracket(depths, depth)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  let price = lerp(lerp(node(w0, d0), node(w1, d0), tw), lerp(node(w0, d1), node(w1, d1), tw), td)

  // Tartományon kívül: az ár a szélső értéken marad, a terület arányában nő/csökken.
  const clampedW = Math.min(Math.max(width, widths[0]), widths[widths.length - 1])
  const clampedD = Math.min(Math.max(depth, depths[0]), depths[depths.length - 1])
  if (clampedW !== width || clampedD !== depth) price *= (width * depth) / (clampedW * clampedD)
  return { netPrice: price, exact: false }
}
