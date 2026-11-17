import { COLOR_CATALOG } from './colors'

/**
 * A porszórt alumínium megjelenése a 3D-ben. A finomstruktúrás (matt) porfesték nem fém, hanem festékréteg:
 * a színt a szórt fény adja, a csillanás széles és tompa. Korábban a bevonat félig fémes volt (0,5–0,62),
 * ezért a sötét RAL-színek (7016, 7021) közel feketének látszottak, és az égbolt tükröződött rajtuk.
 * A metál hatású színek (DB 70x, RAL 9006/9007) megtartják a fémes, lakkozott megjelenést.
 */
export type CoatDetail = 'basic' | 'enhanced' | 'ultra'

export interface CoatSpec {
  metalness: number
  roughness: number
  /** a szemcse normáltérképének erőssége (basic: nincs normáltérkép) */
  grain: number
  clearcoat: number
  clearcoatRoughness: number
  envMapIntensity: number
}

/** a katalógus metál hatású színei (a corten „effekt”, az nem fémes fényű) */
export const METALLIC_HEXES = new Set(COLOR_CATALOG.filter((color) => color.group === 'metallic' && color.kind !== 'effect').map((color) => color.hex))

export function powderCoatSpec(detail: CoatDetail, roughness: number, metallic = false): CoatSpec {
  if (detail === 'basic') return { metalness: metallic ? 0.3 : 0.12, roughness, grain: 0, clearcoat: 0, clearcoatRoughness: 0, envMapIntensity: 0.9 }
  const ultra = detail === 'ultra'
  if (metallic) return { metalness: ultra ? 0.62 : 0.5, roughness: Math.max(0.26, roughness * (ultra ? 0.82 : 0.9)), grain: ultra ? 0.22 : 0.14, clearcoat: ultra ? 0.3 : 0.22, clearcoatRoughness: 0.24, envMapIntensity: ultra ? 1.1 : 1 }
  return { metalness: ultra ? 0.24 : 0.2, roughness: Math.max(0.38, roughness * (ultra ? 0.98 : 1.02)), grain: ultra ? 0.26 : 0.18, clearcoat: ultra ? 0.12 : 0.1, clearcoatRoughness: 0.4, envMapIntensity: 1 }
}
