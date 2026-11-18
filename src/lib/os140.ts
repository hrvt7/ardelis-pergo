// Aluprof MB-OpenSky 140 – a forgólamellás pergola váza és lamellakiosztása a gyári adatokból.
// Források: aluprof_mb_open_sky_140_pergola_CAD.zip (DWG 1:1 profilmetszetek, os140Profiles.ts) és az Aluprof
// mintaprojekt (2023-03-14) mérethatárai. Tiszta függvények (nincs three.js), minden méret méterben.
// Amit a gyári anyag nem ad meg, és ezért feltételezés (lásd claude/17-os140-blender-modell.md):
//   a lamella vége és az eresz közti 8 mm hézag, a lamellasor középre igazítása, a gerenda minden oldalon azonos.

export const OS140 = {
  /** gerenda (K440141X + K440142X takaró) befoglaló szélessége és magassága */
  beamW: 0.1395,
  beamH: 0.255,
  /** oszlop K440137X, 140 × 140 */
  post: 0.14,
  /** lamellaosztás (metszetből mérve) */
  pitch: 0.2,
  /** a lamella K440565X szélessége (223 × 43,6) */
  slatW: 0.223,
  /** a forgástengely a gerenda teteje alatt (metszetből: 58 mm) */
  axleDown: 0.05795,
  /** az első tengely legalább ennyire van a gerenda belső síkjától (metszetből: 150 mm) */
  axleFromBeam: 0.15,
  /** feltételezés: a lamella vége és a gerenda belső síkja közti hézag */
  endGap: 0.008,
  /** fokozatmentes forgás (mintaprojekt): 0–135° */
  maxAngle: 135,
  /** egyhajós mérethatárok (mintaprojekt): lamellafesztáv ≤ 5,0 m, hosszúság ≤ 6,98 m, magasság ≤ 3,0 m */
  maxSpan: 5.0,
  maxLength: 6.98,
  maxHeight: 3.0,
} as const

export interface Os140Span {
  /** a fesztáv középvonala (x) és a két gerenda belső síkja közti tiszta szélesség */
  x: number
  inner: number
  /** a lamella hossza */
  length: number
}

export interface Os140Layout {
  /** a gerenda teteje (y) */
  beamTop: number
  /** a forgástengelyek magassága */
  axleY: number
  /** lamellamezők: a mező szélessége 5 m felett egyenlő részekre oszlik, közös (dupla) gerendával */
  spans: Os140Span[]
  /** a lamellatengelyek z-helyei, hátulról előre növekvő sorrendben */
  z: number[]
  /** a hosszanti gerendák belső síkjai közti tiszta mélység */
  clearDepth: number
}

/**
 * A lamellák és a váz elrendezése. `width` egy mező gerendatengelyei közti szélesség, `depth` a kinyúlás
 * gerendatengelytől gerendatengelyig, `height` a gerendák középmagassága (a jelenet `height` értéke).
 * A lamellák a szélesség irányában feszülnek, a mélység mentén 200 mm-es osztással sorakoznak.
 */
export function os140Layout(width: number, depth: number, height: number): Os140Layout {
  const beamTop = height + OS140.beamH / 2
  const count = Math.max(1, Math.ceil(width / OS140.maxSpan - 1e-6))
  const spanW = width / count
  const spans = Array.from({ length: count }, (_, i) => {
    const inner = Math.max(0.2, spanW - OS140.beamW)
    return { x: -width / 2 + spanW * (i + 0.5), inner, length: Math.max(0.1, inner - 2 * OS140.endGap) }
  })
  const clearDepth = Math.max(0, depth - OS140.beamW)
  const n = Math.max(1, Math.floor((clearDepth - 2 * OS140.axleFromBeam) / OS140.pitch + 1e-6) + 1)
  const run = (n - 1) * OS140.pitch
  const z = Array.from({ length: n }, (_, i) => -run / 2 + i * OS140.pitch)
  return { beamTop, axleY: beamTop - OS140.axleDown, spans, z, clearDepth }
}

/** a terv lamelláinak száma és hossza (minden mezőben ugyanannyi) */
export function os140Count(width: number, depth: number, bays = 1) {
  const layout = os140Layout(width, depth, 2.5)
  const perSpan = layout.z.length
  const spans = layout.spans.length * bays
  return { perSpan, spans, total: perSpan * spans, length: layout.spans[0].length }
}

export interface Os140Metrics {
  angle: number
  /** a felülről nézett nyitott felület aránya (%) */
  open: number
  /** a lamellák közti függőleges rés (mm) */
  gap: number
  /** zárt-e (átfednek a lamellák) */
  sealed: boolean
}

export function os140Metrics(angleDeg: number): Os140Metrics {
  const a = Math.abs(Math.cos((angleDeg * Math.PI) / 180))
  const gap = Math.max(0, OS140.pitch - OS140.slatW * a)
  return { angle: angleDeg, open: (gap / OS140.pitch) * 100, gap: gap * 1000, sealed: gap < 0.0005 }
}

/** Mérethatár-ellenőrzés a mintaprojekt egyhajós adataiból (mezőnként). Üres lista: a terv belefér. */
export function os140Limits(bayWidthM: number, depth: number, height: number): string[] {
  const issues: string[] = []
  if (depth > OS140.maxLength + 1e-6) issues.push(`A kinyúlás ${depth.toFixed(2)} m; az MB-OpenSky 140 egy mezőben legfeljebb ${OS140.maxLength} m.`)
  if (height > OS140.maxHeight + 1e-6) issues.push(`A magasság ${height.toFixed(2)} m; legfeljebb ${OS140.maxHeight} m.`)
  if (bayWidthM > OS140.maxSpan + 1e-6) issues.push(`A mező ${bayWidthM.toFixed(2)} m széles; 5,0 m felett a lamellák közbenső gerendán toldódnak.`)
  return issues
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.12

/** Az oszlop helye a gyári vázon: a szélső oszlop a gerendatengelyek metszésében áll (a gerenda külső síkjával egy vonalban). */
export function os140PostSpot(at: [number, number], width: number, depth: number) {
  const sx = near(Math.abs(at[0]), width / 2) ? Math.sign(at[0]) : 0
  const sz = near(Math.abs(at[1]), depth / 2) ? Math.sign(at[1]) : 0
  return { x: sx ? (sx * width) / 2 : at[0], z: sz ? (sz * depth) / 2 : at[1], corner: !!sx && !!sz }
}
