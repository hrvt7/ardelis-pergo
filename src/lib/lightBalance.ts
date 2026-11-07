// Napfény és égboltfény aránya nappal. Valódi napsütésben a direkt nap 4–8-szor
// erősebb, mint az égbolt szórt fénye; ettől lesz éles a pergola és a lamellák
// árnyéka. Korábban az égbolt (HDR) fénye majdnem akkora volt, mint a napé
// (≈1,4×), ezért a kép borúsnak hatott, és a lamellacsíkok nem látszottak.

export interface LightBalance {
  /** A direkt napfény erőssége. */
  sun: number
  ambient: number
  hemisphere: number
  /** Az égbolt-kép (HDR) fényének szorzója — a tükröződéseké is. */
  environment: number
}

/**
 * Nappali fényarány. `strength` 0–1: a nap magassága szerinti erősség
 * (0 = horizont közelében, 1 = délben). Aranyórában a nap gyengébb és melegebb,
 * az égbolt aránya nagyobb.
 */
export function daylightBalance(strength: number, golden: boolean): LightBalance {
  const s = Math.min(1, Math.max(0, strength))
  if (golden) return { sun: 3.4 + s * 1.6, ambient: 0.03, hemisphere: 0.14, environment: 0.42 }
  // Alacsony napnál (reggel) több marad az égbolt fényéből, hogy a jelenet ne sötétüljön be.
  return { sun: 2.6 + s * 4.2, ambient: 0.02, hemisphere: 0.12, environment: 0.34 + (1 - s) * 0.16 }
}

/**
 * A nap helye a jelenetben a napszakból (6–23 h): reggel keleten alacsonyan, délben magasan,
 * este nyugaton. A `sunDirection` (fok) az egész ívet elforgatja a pergola körül, így a vevő
 * a saját teraszának tájolásához igazíthatja az árnyékokat anélkül, hogy a napszak változna.
 */
export function sunPosition(dayTime: number, sunDirection = 0): [number, number, number] {
  const angle = ((dayTime - 6) / 14) * Math.PI
  const x = Math.cos(angle) * 9
  const y = Math.max(0.8, Math.sin(angle) * 10)
  const z = 4
  const turn = (sunDirection * Math.PI) / 180
  return [x * Math.cos(turn) + z * Math.sin(turn), y, -x * Math.sin(turn) + z * Math.cos(turn)]
}

/** Napfény / szórt fény arány (a jelenet kontrasztjának mércéje). */
export const sunToSkyRatio = (balance: LightBalance) => balance.sun / (balance.environment + balance.hemisphere + balance.ambient)
