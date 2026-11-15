// Képernyőosztályok a konfigurátorhoz: melyik elrendezés (oldalpanel vagy alsó lap) és milyen kamera illik
// a kijelző oldalarányához. Eddig egyetlen szélességi töréspont (820 px) döntött, ezért az álló tabletek
// (3:4, 10:16, 7:10) egy része keskeny oldalpaneles nézetet kapott, a másik része telefonos kamerát.
// A CSS ugyanezt a lekérdezést használja (src/index.css), a kettőt a viewport.test.ts tartja szinkronban.

/** Álló tablet felső határa: efölött az álló ablak is elfér oldalpanellel (pl. 1200 × 1600-as monitor). */
export const PORTRAIT_TABLET_MAX = 1100
export const LANDSCAPE_PHONE_QUERY = '(orientation: landscape) and (max-height: 520px) and (pointer: coarse)'
export const PORTRAIT_TABLET_QUERY = `(orientation: portrait) and (max-width: ${PORTRAIT_TABLET_MAX}px)`
/** Alsó lapos (telefon/álló tablet) elrendezés. Ugyanez a lekérdezés van a CSS-ben. */
export const SHEET_LAYOUT_QUERY = `(max-width: 820px), ${LANDSCAPE_PHONE_QUERY}, ${PORTRAIT_TABLET_QUERY}`

export type ViewportKind = 'phone' | 'landscape-phone' | 'tablet-portrait' | 'desktop'

/** A kijelző besorolása szélesség, magasság és durva (érintős) mutató alapján – ugyanaz a logika, mint a CSS-ben. */
export function viewportKind(width: number, height: number, coarse: boolean): ViewportKind {
  const portrait = height >= width
  if (!portrait && height <= 520 && coarse) return 'landscape-phone'
  if (width <= 820) return portrait && width >= 600 ? 'tablet-portrait' : 'phone'
  if (portrait && width <= PORTRAIT_TABLET_MAX) return 'tablet-portrait'
  return 'desktop'
}

export const usesSheetLayout = (kind: ViewportKind) => kind !== 'desktop'

/** Az áttekintő nézetek látószöge: álló kijelzőn tágabb, hogy a szélesség beférjen. */
export const overviewFov = (aspect: number) => (aspect < 1 ? 48 : 38)
/** A kanapé-panoráma látószöge. */
export const sofaFov = (aspect: number) => (aspect < 1 ? 70 : 64)

/**
 * A kamera hátrébb állítása az alsó lap miatt. Telefonon a lap és a fejléc a kép nagy részét takarja (×1,45);
 * álló tableten a csukott lap a magasság kis része, ott a keretezést a fitDistance adja, csak kis ráhagyással.
 */
export function sheetDistanceScale(kind: ViewportKind) {
  if (kind === 'phone') return 1.45
  if (kind === 'tablet-portrait') return 1.08
  return 1
}

/** A böngésző aktuális állapota (SSR/teszt környezetben asztali). */
export function currentViewportKind(): ViewportKind {
  if (typeof window === 'undefined') return 'desktop'
  let coarse = false
  try { coarse = window.matchMedia('(pointer: coarse)').matches } catch { /* régi böngésző */ }
  return viewportKind(window.innerWidth, window.innerHeight, coarse)
}

export const isSheetLayout = () => usesSheetLayout(currentViewportKind())
