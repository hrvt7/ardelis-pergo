// Az MB-OpenSky 140 oldalzárásai gyári szabályokkal: Aluprof SkyRoll ZIP (SRS90E) és MB-OpenSlide toló üvegfal.
// Források (claude/12-aluprof-oldalzarasok-zip-openslide.md): SkyRoll gyártási dokumentáció 1.3–1.8 táblázatai
// (tokméret, max. magasság, max. méret, min. szélesség) és az IM_OpenSlide_EN szerelési útmutató szárnytáblázata.
// Tiszta függvények, méterben. Feltételezés (nem gyári adat): Szövet 1 + Ø63 csőtengely + Aluprof motor a tokválasztáshoz;
// az OpenSlide sínosztása és szárnyprofil-méretei (claude/17-os140-blender-modell.md).
import { OS140, OS140_WALL_GAP } from './os140'

/** a vezetősín helye az oszlop oldallapján: a nyílás mindkét végén ennyivel szűkebb a screen (oszlop fele) */
export const SIDE_POST_INSET = OS140.post / 2
/** Falnál nincs oszlop: a vezetősín a homlokzatra kerül, a nyílás a gerendatengelyen túl a fal síkjáig tart. */
export const SIDE_WALL_INSET = -(OS140.beamW / 2 + OS140_WALL_GAP)

/**
 * Egy oldalszakasz két végének behúzása (helyi −x és +x vég): oszlopnál az oszlop fele, falnál negatív (a nyílás a
 * falig ér, így a ZIP vagy az üvegfal oldalt teljesen zár — nincs rés a fal és a screen között).
 */
export function sideEndInsets(wallEnds: readonly [boolean, boolean] = [false, false]): [number, number] {
  return [wallEnds[0] ? SIDE_WALL_INSET : SIDE_POST_INSET, wallEnds[1] ? SIDE_WALL_INSET : SIDE_POST_INSET]
}

type SideName = 'front' | 'back' | 'left' | 'right'
/**
 * Melyik vége ér falhoz egy oldal szakaszának. A helyi x a jelenetben: elöl/hátul a világ x-e (−x = bal),
 * bal/jobb oldalon a világ −z-je (−x = elöl, +x = hátul). Csak az oldal szélére futó szakaszvég lehet falnál.
 */
export function segmentWallEnds(side: SideName, walls: readonly SideName[], atStart: boolean, atEnd: boolean): [boolean, boolean] {
  const horizontal = side === 'front' || side === 'back'
  const startWall = horizontal ? walls.includes('left') : walls.includes('front')
  const endWall = horizontal ? walls.includes('right') : walls.includes('back')
  return [atStart && startWall, atEnd && endWall]
}

export const ZIP = {
  /** SRS90E/100 tok (102 × 102) */
  box: 0.1016,
  /** a szövet síkja a gerenda belső síkjától kifelé (a tok résének közepe) */
  fabric: 0.0196,
  /** vezetősín PP SRS/35/T: 45 × 35 */
  guideW: 0.045,
  guideD: 0.035,
  /** SRS90E ZIP legnagyobb mérete: 5000 × 5000 mm, 16 m² */
  maxWidth: 5,
  maxHeight: 5,
  maxArea: 16,
  /** legkisebb szélesség Aluprof motorral */
  minWidth: 0.663,
} as const

/** Tokméret: a legkisebb tok, amelynek max. magassága (Szövet 1, Ø63) elég. 85: 2200, 100: 4500, 120: 5000 mm. */
export function zipBoxSize(height: number): 85 | 100 | 120 {
  if (height <= 2.2 + 1e-9) return 85
  if (height <= 4.5 + 1e-9) return 100
  return 120
}

export interface ZipPlan {
  /** hány screen kell egymás mellett (közöttük dupla sín PPD SRS/56/T) */
  screens: number
  /** egy screen szélessége (a vezetősínek között) */
  screenWidth: number
  /** screenmagasság: a tok aljától a padlóig */
  height: number
  box: 85 | 100 | 120
  issues: string[]
}

/** `opening`: a két oszlop közti tiszta szélesség; `beamBottom`: a gerenda alja (a tok ez alá kerül). */
export function zipPlan(opening: number, beamBottom: number): ZipPlan {
  const height = Math.max(0, beamBottom - ZIP.box)
  const screens = Math.max(1, Math.ceil(opening / ZIP.maxWidth - 1e-9), Math.ceil((opening * height) / ZIP.maxArea - 1e-9))
  const screenWidth = opening / screens
  const issues: string[] = []
  if (screenWidth < ZIP.minWidth) issues.push(`A screen ${Math.round(screenWidth * 1000)} mm széles; motorral legalább ${Math.round(ZIP.minWidth * 1000)} mm kell.`)
  if (height > ZIP.maxHeight) issues.push(`A screen ${height.toFixed(2)} m magas; legfeljebb ${ZIP.maxHeight} m.`)
  return { screens, screenWidth, height, box: zipBoxSize(height), issues }
}

/** MB-OpenSlide szárnytáblázat: szárnyszám → szélességtartomány (m). Magasság 2,00–2,81 m. */
export const OPENSLIDE_TABLE: [number, number, number][] = [
  [3, 2.38, 3.58],
  [4, 3.15, 4.75],
  [5, 3.92, 5.92],
  [6, 4.79, 7.19],
  [8, 6.36, 9.56],
  [10, 7.93, 11.13],
]

export const OPENSLIDE = {
  minHeight: 2.0,
  maxHeight: 2.81,
  /** egy szekció legfeljebb ennyi hosszú */
  maxSection: 6.78,
  /** szárnyszélesség-tartomány */
  sashMin: 0.8,
  sashMax: 1.2,
  /** feltételezés: sínosztás és sínszám (3–5 sínes küszöb) */
  trackPitch: 0.022,
  maxTracks: 5,
} as const

export interface SlidePlan {
  sashes: number
  sashWidth: number
  tracks: number
  height: number
  issues: string[]
}

/** `opening`: a két oszlop közti tiszta szélesség; `height`: a küszöbtől a gerenda aljáig. */
export function openSlidePlan(opening: number, height: number): SlidePlan {
  const issues: string[] = []
  const row = OPENSLIDE_TABLE.find(([, min, max]) => opening >= min - 1e-9 && opening <= max + 1e-9)
  let sashes: number
  if (row) sashes = row[0]
  else if (opening < OPENSLIDE_TABLE[0][1]) {
    sashes = OPENSLIDE_TABLE[0][0]
    issues.push(`A nyílás ${opening.toFixed(2)} m; az MB-OpenSlide legalább ${OPENSLIDE_TABLE[0][1].toFixed(2)} m-től kapható.`)
  } else {
    const last = OPENSLIDE_TABLE[OPENSLIDE_TABLE.length - 1]
    sashes = last[0]
    issues.push(`A nyílás ${opening.toFixed(2)} m; egy MB-OpenSlide legfeljebb ${last[2].toFixed(2)} m.`)
  }
  if (height < OPENSLIDE.minHeight - 1e-9 || height > OPENSLIDE.maxHeight + 1e-9) issues.push(`Az üvegfal ${height.toFixed(2)} m magas; az MB-OpenSlide ${OPENSLIDE.minHeight.toFixed(2)}–${OPENSLIDE.maxHeight.toFixed(2)} m között készül.`)
  if (opening > OPENSLIDE.maxSection) issues.push(`${opening.toFixed(2)} m felett két szekcióra osztva (szekció legfeljebb ${OPENSLIDE.maxSection} m).`)
  const tracks = Math.min(OPENSLIDE.maxTracks, Math.max(3, Math.ceil(sashes / 2) + 1, sashes <= 5 ? sashes : 0))
  return { sashes, sashWidth: opening / sashes, tracks, height, issues }
}

/** Egy oldalszakasz tiszta nyílása (a két vég behúzásával): ugyanazt adja, amit a 3D-modell épít. */
export function segmentOpening(side: SideName, walls: readonly SideName[], segment: { from: number; to: number; length: number }): number {
  const [start, end] = sideEndInsets(segmentWallEnds(side, walls, segment.from <= 1e-6, segment.to >= 1 - 1e-6))
  return segment.length - start - end
}
