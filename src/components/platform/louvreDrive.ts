// A hero élő 3D-jének vezérlése (görgetés, kurzor, csúszka, szín) – külön fájlban, hogy az oldal is olvashassa.

export interface LouvreDrive {
  /** görgetési haladás a hero-ban, 0–1 */
  progress: number
  /** kurzor, −1…1 */
  px: number
  py: number
  /** a csúszkával beállított szög (fok); null = a görgetés vezérel */
  manual: number | null
  /** a szerkezet színe (hex) */
  frame: string
}

/** a hero által mutatott aktuális szög (a felirat is ebből olvas) */
export function louvreAngle(d: LouvreDrive, intro = 0) {
  if (d.manual != null) return d.manual
  return Math.min(90, Math.max(0, 8 + d.progress * 80 + d.px * 10 + intro))
}

