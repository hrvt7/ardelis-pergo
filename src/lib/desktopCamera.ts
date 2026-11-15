// A 3D jelenet kamerakezelésének tiszta (three.js és DOM nélküli) számításai, hogy tesztelhetők legyenek.
// - Érintőpad: két ujjas görgetés = a kép eltolása (mint egy térképen), csípés = nagyítás, egérgörgő = nagyítás.
// - Földgömb-szerű forgatás: a kamera a célpont körül fordul; lefelé addig, amíg a talaj fölött marad
//   (így alulnézet is elérhető a tető alá, de a kamera nem süllyed a föld alá).
// - Nagyításnál a forgáspont a kurzor alatti felületre ugrik (a nézet nem mozdul), így a kamera
//   nem hatol át az oszlopon, gerendán, falon: a felület előtt a legkisebb távolságnál megáll.

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

type Size = { width: number; depth: number; height: number }

/** Mennyivel mehet túl a forgáspont a szerkezet körvonalán (méter): a környezet (bútor, kert széle) is megnézhető. */
export const targetMargin = (size: Pick<Size, 'width' | 'depth'>) => Math.max(4, 0.6 * Math.max(size.width, size.depth))

/** Melyik oldalon áll fal (ház vagy házszárny): arra a forgáspont nem mehet a fal síkja mögé. */
export type Walls = { back?: boolean; left?: boolean; right?: boolean }

/**
 * A kamera célpontja ne vándoroljon el a pergolától: a szerkezet köré húzott dobozba szorítjuk (méterben).
 * Fal felé a doboz a fal síkjáig tart (a fal mögé tolt forgáspont körül a kamera a házba nézne).
 */
export function clampTarget(target: [number, number, number], size: Size, walls: Walls = {}, margin = targetMargin(size)): [number, number, number] {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const wallGap = 0.1
  return [
    clamp(target[0], walls.left ? -size.width / 2 - wallGap : -size.width / 2 - margin, walls.right ? size.width / 2 + wallGap : size.width / 2 + margin),
    clamp(target[1], 0, size.height + 3),
    clamp(target[2], walls.back ? -size.depth / 2 - wallGap : -size.depth / 2 - margin, size.depth / 2 + margin),
  ]
}

/** A kamera legalacsonyabb szemmagassága (m): a talaj (és a fű) fölött marad. */
export const MIN_EYE = 0.25
/** A legmeredekebb alulnézet: kb. 170° (közvetlenül alulról sem fordul át a kép). */
export const MAX_POLAR = Math.PI * 0.94

/**
 * A függőleges forgatás alsó határa (OrbitControls `maxPolarAngle`, a függőlegestől mért szög): akkora, hogy a kamera
 * a célpont körüli `distance` sugarú gömbön épp `MIN_EYE` magasan legyen. Közeli, magasan lévő célpontnál
 * (pl. a tető alatt) meredek alulnézetet enged; távolról vízszintesnél alig lejjebb.
 */
export function groundPolarLimit(targetY: number, distance: number, minEye = MIN_EYE) {
  const ratio = Math.max(-1, Math.min(1, (targetY - minEye) / Math.max(1e-6, distance)))
  return Math.min(MAX_POLAR, Math.PI / 2 + Math.asin(ratio))
}

/**
 * Új forgásponti mélység (a kamera nézési tengelye mentén), ha a kurzor/ujjak alatt a jelenlegi célpontnál közelebbi
 * felület van. `null`: maradjon a mostani (nincs közelebbi felület, vagy az túl közel/mögöttünk van).
 */
export function pivotDepth(hitDepth: number | null, currentDepth: number, minDistance: number): number | null {
  if (hitDepth === null || !Number.isFinite(hitDepth) || hitDepth <= 0.05) return null
  if (hitDepth >= currentDepth - 0.05) return null
  return Math.max(hitDepth, minDistance + 0.02)
}

/**
 * Önálló pergolánál a ház a pergola mögött áll: az automatikus kamera (követő kamera) ne álljon a házba.
 * Ha a cél a homlokzat síkja mögé esne, a homlokzat elé húzzuk és megemeljük, hogy felülről nézzen rá.
 */
export function keepClearOfHouse(destination: [number, number, number], houseFrontZ: number | null, clearance = 0.9): [number, number, number] {
  if (houseFrontZ === null) return destination
  const limit = houseFrontZ + clearance
  if (destination[2] >= limit) return destination
  const pulled = limit - destination[2]
  return [destination[0], destination[1] + pulled * 0.55, limit]
}
