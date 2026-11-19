// Mélységélesség (DOF) csak mozgás közben: a postprocessing DepthOfFieldEffect minden képkockán 7 lépést futtat
// (CoC, elmosás, maszk, 4 bokeh-lépés; ebből 3 teljes felbontású), akkor is, ha a hatás nulla (bokehScale = 0).
// Nyugalomban egyszer kinullázzuk a köztes képeit – így a végső összemosás pontosan a bemeneti képet adja –,
// utána a frissítést kihagyjuk, amíg a kamera újra nem mozdul (teljesítmény-audit, 2026-11-19).
import { Color } from 'three'

type Target = object
export interface ClearingRenderer {
  getRenderTarget(): Target | null
  setRenderTarget(target: Target | null): void
  getClearColor(target: Color): Color
  getClearAlpha(): number
  setClearColor(color: Color, alpha: number): void
  clear(color?: boolean, depth?: boolean, stencil?: boolean): void
}
export interface IdleDepthOfField {
  bokehScale: number
  update: (renderer: ClearingRenderer, inputBuffer: unknown, deltaTime?: number) => void
  renderTarget: Target; renderTargetNear: Target; renderTargetFar: Target; renderTargetMasked: Target; renderTargetCoC: Target; renderTargetCoCBlurred: Target
}

const black = new Color(0, 0, 0)
const saved = new Color()

/** A DOF köztes képeinek kinullázása (átlátszó fekete): üres CoC és távoli/közeli kép → a kimenet = a bemenet. */
export function clearDepthOfField(effect: IdleDepthOfField, renderer: ClearingRenderer) {
  const previous = renderer.getRenderTarget()
  renderer.getClearColor(saved)
  const alpha = renderer.getClearAlpha()
  renderer.setClearColor(black, 0)
  for (const target of [effect.renderTarget, effect.renderTargetNear, effect.renderTargetFar, effect.renderTargetMasked, effect.renderTargetCoC, effect.renderTargetCoCBlurred]) {
    renderer.setRenderTarget(target)
    renderer.clear(true, false, false)
  }
  renderer.setRenderTarget(previous)
  renderer.setClearColor(saved, alpha)
}

/** Bekapcsolja a nyugalmi kihagyást az effekten; a visszaadott függvény visszaállítja az eredeti működést. */
export function skipIdleDepthOfField(effect: IdleDepthOfField): () => void {
  const original = effect.update
  let cleared = false
  effect.update = function (renderer, inputBuffer, deltaTime) {
    if (effect.bokehScale > 0) { cleared = false; original.call(effect, renderer, inputBuffer, deltaTime); return }
    if (cleared) return
    clearDepthOfField(effect, renderer)
    cleared = true
  }
  return () => { effect.update = original }
}
