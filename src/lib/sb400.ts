// SELT / Aluprof Pergola SB 400 – a váz gyári méretei a nyilvános műszaki adatlapból
// („PERGOLA – Technische Informationen”, SB 400 fejezet: Profilquerschnitt, Füße, Querschnitt der Rinnen,
// Frontansicht/Seitenansicht). A forgólamellás tető 3D-váza ezekből épül; a lamella és a hajtás adatai a
// louvreSystem.ts-ben vannak. Tiszta függvények (nincs three.js), minden méret méterben.
// Amit az adatlap nem méretez (és ezért itt sincs): a profilok belső kamrái, a sarokösszekötők, a csavarozás.

export const SB400 = {
  /** gerenda („Strebe”) 85 × 212 */
  strutW: 0.085,
  strutH: 0.212,
  /** oszlop („Pfosten”) 85 × 150; a 85-ös oldal a szélesség, a 150-es a kinyúlás irányába néz */
  postW: 0.085,
  postD: 0.15,
  /** talplemez: sarokoszlopnál 142,5 × 200, közbenső oszlopnál 200 × 200, 8 mm vastag, ø14,2 furatok */
  footCorner: 0.1425,
  footFull: 0.2,
  footT: 0.008,
  /** hosszanti eresz 91,6 × 75 (hátfal 75, elöl 58 magas) */
  gutterW: 0.0916,
  gutterBack: 0.075,
  gutterFront: 0.058,
  /** a lamella vége és a gerenda belső síkja között 17 + 3 mm */
  endGap: 0.02,
  /** a lamella a hajtásoldalon 20 mm-rel magasabban ül (a víz a csapágyoldali ereszbe folyik) */
  fall: 0.02,
} as const

export interface Sb400Post {
  /** az oszlop középpontja */
  x: number
  z: number
  /** a talplemez mérete és középpontja */
  footW: number
  footD: number
  footX: number
  footZ: number
  /** a horgonycsavarok helyei */
  anchors: [number, number][]
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.12

/**
 * Egy oszlop gyári helye és talpa. `at` az általános váz oszlopközepe (a gerendatengelytől 9 cm-rel beljebb);
 * az SB 400 oszlopa a gerenda külső síkjával egy vonalban áll, a talplemez pedig befelé nyúlik túl rajta
 * (szélességben 57,5, kinyúlásban 50 mm-rel), így a szerkezet körvonalán nem lóg ki.
 */
export function sb400Post(at: [number, number], width: number, depth: number): Sb400Post {
  const sx = near(Math.abs(at[0]), width / 2) ? Math.sign(at[0]) : 0
  const sz = near(Math.abs(at[1]), depth / 2) ? Math.sign(at[1]) : 0
  const x = sx ? (sx * width) / 2 : at[0]
  const outerZ = sz * (depth / 2 + SB400.strutW / 2)
  const z = sz ? outerZ - sz * (SB400.postD / 2) : at[1]
  const footW = sx ? SB400.footCorner : SB400.footFull
  const footD = SB400.footFull
  const outerX = x + sx * (SB400.postW / 2)
  const footX = sx ? outerX - sx * (footW / 2) : x
  const footZ = sz ? outerZ - sz * (footD / 2) : z
  // furatok a talp sarkaiban, a széltől 15 mm-re; ahol az oszlop áll (külső sarok), ott nincs furat
  const ax = footW / 2 - 0.015
  const az = footD / 2 - 0.015
  const all: [number, number][] = [[-ax, -az], [ax, -az], [-ax, az], [ax, az]]
  const anchors = all
    .filter(([dx, dz]) => !(sx && sz && Math.sign(dx) === sx && Math.sign(dz) === sz))
    .map(([dx, dz]) => [footX + dx, footZ + dz] as [number, number])
  return { x, z, footW, footD, footX, footZ, anchors }
}

/** a váz befoglaló mérete a gerendatengelyek távolságából (a konfigurátor `width`/`depth` értéke) */
export const sb400Outer = (axis: number) => axis + SB400.strutW
/** lamellahossz: befoglaló szélesség − 210 mm (adatlap: „B − 210”) */
export const sb400LouvreLength = (width: number) => sb400Outer(width) - 0.21
