// Okos lamella: a lamellák a napot követik — a legnagyobb nyitásszög, amelynél a közvetlen napfény
// még teljesen kint marad (árnyék van, de a lehető legtöbb szórt fény és levegő bejut).
// Tiszta függvények (nincs three.js), a 3D jelenet és a vezérlőpanel ugyanazt számolja.
import { LOUVRE } from './louvreSystem'

export type SmartLouverReason = 'night' | 'front-sun' | 'tracking'
export interface SmartLouver { angle: number; reason: SmartLouverReason }

const DEG = 180 / Math.PI
/** Biztonsági ráhagyás (fok): a számított határszögnél ennyivel zártabb, hogy a lamellaél ne eressze át a napot. */
const MARGIN = 2

/**
 * A lamella a hossztengelye (x) körül forog, 0° = vízszintes, zárt; nyitáskor a lamella síkja a ház (−z) felé billen.
 * A napsugár az x tengelyre merőleges síkba vetítve ψ szöget zár be a függőlegessel (+ = a pergola eleje felől süt).
 * A teljes árnyék feltétele: a lamella vetülete a sugár irányában legalább akkora, mint az osztás →
 *   w·cos(a + ψ) ≥ p·cos ψ  →  a_max = acos((p/w)·cos ψ) − ψ.
 * Szemből (elölről) sütő nap: a_max ≈ 0, zárva kell tartani. A ház felől/fölülről jövő nap: akár 90°-ig nyitható.
 */
export function smartLouver(sun: [number, number, number]): SmartLouver {
  const [, y, z] = sun
  const radius = Math.hypot(y, z)
  // Nincs napsütés (horizont alatt): nyitva, hogy a szórt fény és a levegő bejusson.
  if (y <= 0.02 || radius < 1e-6) return { angle: 90, reason: 'night' }
  const psi = Math.atan2(z, y)
  const ratio = (LOUVRE.pitch / LOUVRE.width) * Math.cos(psi)
  const limit = Math.acos(Math.min(1, Math.max(-1, ratio))) - psi
  const angle = Math.round(Math.min(90, Math.max(0, limit * DEG - MARGIN)))
  return { angle, reason: angle === 0 ? 'front-sun' : 'tracking' }
}

export const SMART_LOUVER_TEXT: Record<SmartLouverReason, string> = {
  night: 'Nincs napsütés: a lamellák nyitva, bejön a szórt fény és a levegő.',
  'front-sun': 'A nap szemből süt: zárva a teljes árnyékhoz.',
  tracking: 'A legnagyobb nyitás, ami még teljes árnyékot ad: a lamellák a napot követik.',
}
