/** A csúszka értéke a sáv mentén (0–1), a végeken levágva. */
export function sliderFraction(value: number, min: number, max: number): number {
  if (!(max > min)) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/** A beírt centiméter → méter, a lépésre kerekítve és a határok közé szorítva; érvénytelen bemenetnél `null`. */
export function parseCentimetres(raw: string, min: number, max: number, step: number): number | null {
  const text = raw.trim().replace(',', '.')
  if (!text) return null
  const cm = Number(text)
  if (!Number.isFinite(cm)) return null
  const metres = Math.min(max, Math.max(min, cm / 100))
  const snapped = Math.round(metres / step) * step
  return Math.round(Math.min(max, Math.max(min, snapped)) * 100) / 100
}
