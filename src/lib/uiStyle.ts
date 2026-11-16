// A konfigurátor felületének stílusváltozata. „soft” = a jelenlegi (4.23), „glass” = üveges, elmosott panelek
// a 3D kép fölött (4.26, kipróbálásra), „studio” = letisztult, modernebb változat semleges stúdió-jelenettel (4.53, kipróbálásra). A ?style= paraméter választ, és a böngésző megjegyzi.

export type UiStyle = 'soft' | 'glass' | 'studio' | 'light'
// 4.77: új kulcs – a korábban megjegyzett régi stílusválasztás (pl. ?style=soft) már nem írja felül az új, lebegő elrendezést.
export const UI_STYLE_KEY = 'lamelix-ui-style-v2'
/** Alapértelmezett felület: világos, pasztell „light” (4.55). A korábbi sötét: ?style=soft. */
export const DEFAULT_UI_STYLE: UiStyle = 'light'

const isStyle = (value: string | null): value is UiStyle => value === 'soft' || value === 'glass' || value === 'studio' || value === 'light'

/** A címsor paramétere elsőbbséget kap; különben a megjegyzett érték; végül az alapértelmezett „soft”. */
export function resolveUiStyle(search: string, stored: string | null): UiStyle {
  const requested = new URLSearchParams(search).get('style')
  if (isStyle(requested)) return requested
  return isStyle(stored) ? stored : DEFAULT_UI_STYLE
}

/** A beállítópanel szélessége asztali nézetben (px) – ugyanazok a töréspontok, mint a CSS --panel-w értékei. */
export function panelWidthFor(viewportWidth: number) {
  if (viewportWidth <= 820) return 0
  if (viewportWidth <= 1020) return 344
  if (viewportWidth <= 1280) return 380
  return 420
}

/**
 * Üveges stílusnál a 3D vászon a teljes szélességet kapja, a panel fölötte lebeg. Hogy a pergola a szabadon látható
 * rész közepén maradjon, a nézetet a panel felével (+ térközök) balra toljuk: ez a vászonszélesség aránya.
 */
export function glassViewShiftX(viewportWidth: number, canvasWidth: number, gutter = 12, panelWidth?: number) {
  const panel = panelWidth && viewportWidth > 820 ? panelWidth : panelWidthFor(viewportWidth)
  if (!panel || canvasWidth <= 0) return 0
  return (panel + gutter * 2) / 2 / canvasWidth
}

/** Stúdió stílusban a jelenet semleges nappali fényben indul (a naplemente rózsaszínes tónust ad a világos háttérnek). */
export const studioInitialTime = (style: UiStyle) => (style === 'studio' || style === 'light' ? ({ time: 'day', dayTime: 13 } as const) : null)

/** Világos és stúdió stílusban a 3D jelenet semleges, hajlított stúdióháttérrel jelenik meg. */
export const usesCyclorama = (style: UiStyle) => style === 'studio' || style === 'light'

/** A lebegő elrendezés (világos stílus, 4.76) asztali szélességben: a panel balra lebeg, jobbra az eszközfül. */
export const usesFloatLayout = (style: UiStyle) => style === 'light'
/** Az eszközfül szélessége (px) – egyezik a CSS .tool-rail szélességével. */
export const TOOL_RAIL_WIDTH = 68
/**
 * Lebegő elrendezésnél a vászon a teljes szélesség (12 px peremmel), balra a panel, jobbra az eszközfül fedi.
 * A pergola a kettő közötti szabad rész közepére kerül: a nézetet jobbra toljuk (negatív eltolás).
 */
export function floatViewShiftX(viewportWidth: number, panelWidth: number, gutter = 24) {
  const canvas = viewportWidth - 24
  if (viewportWidth <= 820 || canvas <= 0 || !panelWidth) return 0
  return -((panelWidth + gutter) - TOOL_RAIL_WIDTH) / 2 / canvas
}
/** Telefonon a jobb szélen 56 px-es fül van: a pergola a fül nélküli rész közepére kerül (balra tolva). */
export const floatPhoneShiftX = (viewportWidth: number) => (viewportWidth > 0 ? 28 / viewportWidth : 0)
