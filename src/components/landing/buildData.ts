// A nyitóoldal „Hét lépés” képsorozatának adatai. Az árak a valódi árazó motorból (calculatePrice) jönnek a demó
// gyártó alapkonfigurációjára (Aero 5,0 × 4,0 m, falhoz, bal oldalon ZIP screen, LED, érzékelők), lépésenként
// felépítve; a tests/landingV2.test.ts újraszámolja őket, így nem térhetnek el a konfigurátortól.

/** Bruttó irányár lépésenként (Ft); null = a tető kiválasztása előtt még nincs ár. */
export const BUILD_PRICES: readonly (number | null)[] = [null, null, 4_610_000, 5_264_000, 5_264_000, 5_648_000, 5_648_000]

/** A képsorozat képkockáinak száma (public/assets/landing/build/f000…f039.webp). */
export const BUILD_FRAMES = 40

/** A lépés a görgetési haladásból (0–1), 7 lépésre osztva. */
export const stepAt = (progress: number, steps = 7) => Math.min(steps - 1, Math.max(0, Math.floor(progress * steps)))

/** A képkocka sorszáma a haladásból. */
export const frameAt = (progress: number, frames = BUILD_FRAMES) => Math.min(frames - 1, Math.max(0, Math.round(progress * (frames - 1))))
