// Védőháló a „takarékos” árnyékoláshoz (renderer.shadowMap.autoUpdate = false): ha egy árnyékot vető fény
// újra létrejön (minőségváltás, napszak, nézetváltás), az árnyéktérképe csak a következő árnyékfrissítéskor
// készül el. Addig a fényt fogadó anyagok egy nem létező árnyéktérképből olvasnának, a WebGL ezeket a
// rajzolásokat eldobja („Mismatch between texture format and sampler type”), és a pergola eltűnik.
// Ez a függvény jelzi, ha van ilyen fény: ilyenkor egy árnyékfrissítést kell kérni.

export interface ShadowLightLike {
  isLight?: boolean
  castShadow?: boolean
  visible?: boolean
  shadow?: { map: unknown | null } | null
}

/** Van-e látható, árnyékot vető fény, amelynek még nincs árnyéktérképe? */
export function missingShadowMap(lights: Iterable<ShadowLightLike>): boolean {
  for (const light of lights) {
    if (!light.isLight || !light.castShadow || light.visible === false || !light.shadow) continue
    if (!light.shadow.map) return true
  }
  return false
}
