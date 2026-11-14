// Asztali (egér / érintőpad) kameravezérlés: a laptop érintőpadja úgy viselkedjen, mint a telefon.
// Két ujjas görgetés = a kép eltolása (mint egy térképen), csípés = nagyítás, egérgörgő = nagyítás a kurzor felé.
// Tiszta függvények (nincs three.js / DOM), hogy tesztelhetők legyenek.

export interface WheelLike {
  deltaX: number
  deltaY: number
  deltaMode: number
  ctrlKey: boolean
  /** Chrome/Safari: régi tulajdonság, egérgörgőnél 120 többszöröse, érintőpadnál a deltaY −3-szorosa */
  wheelDeltaY?: number
}

/** Ennyi ideig (ms) a következő görgetés is érintőpadosnak számít: egy mozdulat ne váltson félúton nagyításra. */
export const TRACKPAD_LATCH_MS = 450

/**
 * `pan`: két ujjas érintőpad-görgetés (eltolás); `zoom`: csípés (a böngésző ctrlKey-jel jelzi) vagy egérgörgő.
 * `lastPanAt`: az utolsó eltolásnak ítélt esemény ideje, `now`: a mostani.
 */
export function classifyWheel(event: WheelLike, lastPanAt: number, now: number): 'pan' | 'zoom' {
  if (event.ctrlKey) return 'zoom'
  if (event.deltaMode !== 0) return 'zoom'
  if (now - lastPanAt < TRACKPAD_LATCH_MS) return 'pan'
  if (event.deltaX !== 0) return 'pan'
  if (typeof event.wheelDeltaY === 'number' && event.wheelDeltaY !== 0) {
    if (Math.abs(event.wheelDeltaY) === Math.abs(event.deltaY) * 3) return 'pan'
    if (event.wheelDeltaY % 120 === 0) return 'zoom'
  }
  return Number.isInteger(event.deltaY) ? 'zoom' : 'pan'
}

/** A kamera célpontja ne vándoroljon el a pergolától: a szerkezet köré húzott dobozba szorítjuk (méterben). */
export function clampTarget(target: [number, number, number], size: { width: number; depth: number; height: number }, margin = 2.5): [number, number, number] {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  return [
    clamp(target[0], -size.width / 2 - margin, size.width / 2 + margin),
    clamp(target[1], 0, size.height + 1.5),
    clamp(target[2], -size.depth / 2 - margin, size.depth / 2 + margin),
  ]
}
