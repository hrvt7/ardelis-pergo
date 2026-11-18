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

/** Egységes (nem méteres) érték beírása: a lépésre kerekítve, a határok közé szorítva; érvénytelennél `null`. */
export function parsePlain(raw: string, min: number, max: number, step: number): number | null {
  const text = raw.trim().replace(',', '.')
  if (!text) return null
  const number = Number(text)
  if (!Number.isFinite(number)) return null
  const snapped = Math.round(Math.min(max, Math.max(min, number)) / step) * step
  return Math.round(Math.min(max, Math.max(min, snapped)) * 1000) / 1000
}

/**
 * Íves (negyedkör) csúszka: a forgáspontból a mutató felé mutató vektor szöge fokban, 0 = vízszintes (jobbra),
 * 90 = függőleges (fel); képernyő-koordinátákban (y lefelé nő). A tartományon kívül a közelebbi végre áll.
 */
export function arcAngle(dx: number, dy: number, max = 90): number {
  const degrees = (Math.atan2(-dy, dx) * 180) / Math.PI
  if (degrees < 0) return degrees < -90 ? max : 0
  return Math.min(max, Math.max(0, degrees))
}
