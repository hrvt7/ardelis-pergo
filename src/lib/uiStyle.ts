// A konfigurátor felületének stílusváltozata. „soft” = a jelenlegi (4.23), „glass” = üveges, elmosott panelek
// a 3D kép fölött (4.26, kipróbálásra), „studio” = letisztult, modernebb változat semleges stúdió-jelenettel (4.53, kipróbálásra). A ?style= paraméter választ, és a böngésző megjegyzi.

export type UiStyle = 'soft' | 'glass' | 'studio'
export const UI_STYLE_KEY = 'lamelix-ui-style'

const isStyle = (value: string | null): value is UiStyle => value === 'soft' || value === 'glass' || value === 'studio'

/** A címsor paramétere elsőbbséget kap; különben a megjegyzett érték; végül az alapértelmezett „soft”. */
export function resolveUiStyle(search: string, stored: string | null): UiStyle {
  const requested = new URLSearchParams(search).get('style')
  if (isStyle(requested)) return requested
  return isStyle(stored) ? stored : 'soft'
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
export const studioInitialTime = (style: UiStyle) => (style === 'studio' ? ({ time: 'day', dayTime: 13 } as const) : null)
