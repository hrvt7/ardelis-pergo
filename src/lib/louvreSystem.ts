// Forgólamellás tető valós műszaki adatokból. Referencia: Aluprof SB 400 nyilvános műszaki melléklete
// („Technical supplement – Pergolas”, érvényes 2026.05.12-től). Minden méret mm-ben a rajzokról:
//   lamella („tongue”) 215,8 × 39,8, R430-as felső ív, R18-as vízcsatorna; tengely a lamella aljától 20 mm-re,
//   a hosszirányú él (u = 0, a „nyelv”) felől 112 mm-re; osztás 200 mm; a tengely 43 mm-rel a gerenda teteje alatt;
//   modulszélesség max. 4000, kinyúlás max. 7000; lamellahossz = modulszélesség − 210;
//   hajtás: lineáris motor (ELERO Picolo XL, 1200 N) tolja a 20×20×2-es hajtórudat, ami minden lamellavég
//   hajtókarját egyszerre forgatja (paralelogramma). Motorhossz csapszegtől csapszegig ~732 (zárva) → ~913 (nyitva),
//   a lamellák 0…110°±5°-ig nyílnak. A hajtókar sugara (115 mm) és szöge rajzról mérve, ±5 mm.
// A modul tiszta függvényekből áll (nincs three.js), hogy a 3D jelenet és az áttekintő panel ugyanazt számolja.

export const LOUVRE = {
  /** a lamella szélessége és vastagsága (m) */
  width: 0.2158,
  thick: 0.0398,
  /** lamellaosztás (m) */
  pitch: 0.2,
  /** a forgástengely a gerenda teteje alatt (m) */
  axleDown: 0.043,
  /** a lamella vége és a gerenda belső síkja közti hézag (m); (B − 210) / 2 a 85 mm-es gerendánál */
  endGap: 0.01,
  /** a gyári forgástartomány (fok) */
  maxAngle: 110,
  /** a vízzárás határa: ennél kisebb szögnél a szomszédos lamellák még átfednek (fok) */
  sealAngle: Math.round((Math.acos(0.2 / 0.2158) * 180) / Math.PI),
  /** egy modul legnagyobb szélessége / kinyúlása (m) */
  maxModuleWidth: 4,
  maxProjection: 7,
} as const

export const DRIVE = {
  /** hajtókar sugara (m) és a csap szöge zárt állásban (fok, a lamella keresztmetszetének síkjában, a nyelv felől mérve) */
  crankR: 0.115,
  crank0: 44,
  /** a motor csapszeg-távolsága zárt állásban (m) */
  motorClosed: 0.732,
  /** a motor tartóbakjának csapja a gerenda teteje felett (m) */
  pivotUp: 0.031,
  /** a motor vezetőbakja a hajtórúd csapja felett (m) */
  lug: 0.03,
  /** a motorhenger hossza (m) */
  body: 0.5,
  force: 1200,
} as const

/**
 * A lamella keresztmetszete (m), a forgástengelyhez képest. x a pergola mélysége mentén (+ = elöl, a „nyelv”
 * oldala), y felfelé. Az óramutató járásával ellentétes körüljárás (a three.js Shape ezt várja).
 */
export function louvreProfile(arcSteps = 12): [number, number][] {
  const mm: [number, number][] = []
  const yTop = (u: number) => -390.2 + Math.sqrt(430 * 430 - (u - 100) ** 2) // R430, csúcs 39,8 mm-nél
  const arc = (cx: number, cy: number, r: number, from: number, to: number, steps: number) => {
    for (let i = 0; i <= steps; i++) {
      const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180
      mm.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
  }
  const s = Math.max(3, Math.round(arcSteps / 3))
  // a rajz szerinti körüljárás (u: a nyelvtől a csatorna felé, v: felfelé)
  mm.push([41, 0])
  arc(196, 18, 18, -90, 0, s) // a csatorna külső íve
  mm.push([215.8, 25.1], [212.6, 25.1])
  arc(196, 18, 16, 0, -180, s * 2) // a csatorna belseje
  mm.push([180, 28.4], [187, 28.4])
  for (let i = 0; i <= arcSteps; i++) {
    const u = 187 - (187 * i) / arcSteps
    mm.push([u, yTop(u)])
  }
  mm.push([0, 18.6], [2.5, 18.6], [2.5, 26], [23, 26])
  arc(41, 18, 18, 180, 270, s)
  // tükrözés: a nyelv (u = 0) kerül elöl (+x); a tükrözés megfordítja a körüljárást, ezért a pontsor is fordul
  return mm.map(([u, v]) => [-(u - 112) / 1000, (v - 20) / 1000] as [number, number]).reverse()
}

export interface ModuleLayout {
  /** a modul középvonala (x) és tiszta szélessége a gerendák belső síkjai között */
  x: number
  inner: number
  /** a lamella hossza */
  length: number
}

export interface LouvreLayout {
  modules: ModuleLayout[]
  /** a lamellák tengelyei (z), elölről hátra csökkenő sorrendben nem; hátulról előre növekvő */
  z: number[]
  /** a tengely magassága */
  axleY: number
  /** a záró profilok (első tömítőlamella, hátsó tömítőszalag) szélessége, ami a lamellasor és a gerenda közti rést fedi */
  frontSeal: number
  backSeal: number
}

/**
 * A lamellák elrendezése a szerkezet méretéből. `beam` a gerenda szélessége (a jelenetben 0,19 m),
 * `beamTop` a gerenda teteje, `endGap` a lamella vége és a gerenda közti hézag (SB 400 gyári váznál 20 mm). Szélesebb szerkezet több, egyforma modulra oszlik (max. 4 m / modul).
 */
export function louvreLayout(width: number, depth: number, beam: number, beamTop: number, endGap: number = LOUVRE.endGap): LouvreLayout {
  const count = Math.max(1, Math.ceil(width / LOUVRE.maxModuleWidth - 1e-6))
  const modW = width / count
  const modules: ModuleLayout[] = Array.from({ length: count }, (_, i) => {
    const x = -width / 2 + modW * (i + 0.5)
    const inner = modW - beam
    return { x, inner, length: Math.max(0.2, inner - 2 * endGap) }
  })
  // a lamellasor zárt állásban n × 200 + 15,8 mm-t fed; a maradékot elöl-hátul a záró profil tölti ki
  const clear = Math.max(LOUVRE.width, depth - beam)
  const n = Math.max(1, Math.floor((clear - (LOUVRE.width - LOUVRE.pitch)) / LOUVRE.pitch))
  const span = (n - 1) * LOUVRE.pitch
  const z = Array.from({ length: n }, (_, i) => -span / 2 + i * LOUVRE.pitch)
  const rest = Math.max(0, clear - (span + LOUVRE.width))
  return { modules, z, axleY: beamTop - LOUVRE.axleDown, frontSeal: rest / 2, backSeal: rest / 2 }
}

/** a hajtókar csapjának helye a tengelyhez képest (z, y), adott lamellaszögnél */
export function crankPin(angleDeg: number): [number, number] {
  const a = ((DRIVE.crank0 + angleDeg) * Math.PI) / 180
  return [DRIVE.crankR * Math.cos(a), DRIVE.crankR * Math.sin(a)]
}

export interface DrivePlan {
  /** a motor vezetőbakja melyik lamella csapjára ül */
  lugIndex: number
  /** a motor csapja (z, y) */
  pivot: [number, number]
}

/**
 * A motor helye: a hajtórúdon egy olyan lamella csapjára ül, amelytől a motor a gerendán belül elfér
 * (a gyári rajz szerint a szerkezet eleje felé, kb. 0,73 m-re).
 */
export function drivePlan(z: number[], axleY: number, beamTop: number, frontLimit: number): DrivePlan {
  const pivotY = beamTop + DRIVE.pivotUp
  const [pz0, py0] = crankPin(0)
  const lugY = axleY + py0 + DRIVE.lug
  const run = Math.sqrt(Math.max(0, DRIVE.motorClosed ** 2 - (lugY - pivotY) ** 2))
  let lugIndex = 0
  for (let i = 0; i < z.length; i++) if (z[i] + pz0 + run <= frontLimit) lugIndex = i
  return { lugIndex, pivot: [z[lugIndex] + pz0 + run, pivotY] }
}

/** a motor aktuális hossza (m) a lamellaszögből */
export function motorLength(plan: DrivePlan, z: number[], axleY: number, angleDeg: number) {
  const [pz, py] = crankPin(angleDeg)
  const lz = z[plan.lugIndex] + pz
  const ly = axleY + py + DRIVE.lug
  return Math.hypot(lz - plan.pivot[0], ly - plan.pivot[1])
}

export interface LouvreMetrics {
  angle: number
  /** a felülről nézett nyitott felület aránya (%) */
  open: number
  /** a lamellák közti függőleges rés (mm) */
  gap: number
  /** zárt-e a tető (átfednek a lamellák) */
  sealed: boolean
}

export function louvreMetrics(angleDeg: number): LouvreMetrics {
  const a = Math.abs(Math.cos((angleDeg * Math.PI) / 180))
  const gap = Math.max(0, LOUVRE.pitch - LOUVRE.width * a)
  return { angle: angleDeg, open: (gap / LOUVRE.pitch) * 100, gap: gap * 1000, sealed: gap < 0.0005 }
}

/** A „Működés” bemutató ciklusa: zár → nyit 110°-ig → tart → zár. Másodpercben, végtelenítve. */
export const DEMO_CYCLE = { closedHold: 1.4, open: 5.5, openHold: 1.8, close: 5.5 } as const
const DEMO_LENGTH = DEMO_CYCLE.closedHold + DEMO_CYCLE.open + DEMO_CYCLE.openHold + DEMO_CYCLE.close
const smooth = (x: number) => {
  const u = Math.min(1, Math.max(0, x))
  return u * u * u * (u * (u * 6 - 15) + 10)
}
export function demoAngle(seconds: number): { angle: number; phase: 'closed' | 'opening' | 'open' | 'closing' } {
  const t = ((seconds % DEMO_LENGTH) + DEMO_LENGTH) % DEMO_LENGTH
  const { closedHold, open, openHold } = DEMO_CYCLE
  if (t < closedHold) return { angle: 0, phase: 'closed' }
  if (t < closedHold + open) return { angle: LOUVRE.maxAngle * smooth((t - closedHold) / open), phase: 'opening' }
  if (t < closedHold + open + openHold) return { angle: LOUVRE.maxAngle, phase: 'open' }
  return { angle: LOUVRE.maxAngle * (1 - smooth((t - closedHold - open - openHold) / DEMO_CYCLE.close)), phase: 'closing' }
}

/** a bemutató órája: a jelenet és a panel ugyanabból az indulási időpontból számol */
let demoStart = 0
let frozenAt: number | null = null
export const startDemoClock = () => { demoStart = performance.now(); frozenAt = null }
export const demoSeconds = () => frozenAt ?? (performance.now() - demoStart) / 1000
/** szünet: a jelenet és a panel ugyanazon az állásnál áll meg, folytatáskor onnan megy tovább */
export const pauseDemo = (paused: boolean) => {
  if (paused && frozenAt === null) frozenAt = (performance.now() - demoStart) / 1000
  else if (!paused && frozenAt !== null) { demoStart = performance.now() - frozenAt * 1000; frozenAt = null }
}
