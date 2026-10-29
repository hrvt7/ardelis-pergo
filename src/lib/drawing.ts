// Méretarányos műszaki rajz (homlokzat, A–A metszet, alaprajz + rajzi fejléc) SVG-ben.
// Ugyanabból az adatból készül, mint a 3D-modell és az ár, ezért a méretek nem térhetnek el.
// Tiszta TypeScript (DOM nélkül): a PDF-be ágyazva vektoros, tesztből is ellenőrizhető.
// Koordináták: a rajz egysége a milliméter (lapon), a modellé a méter.
// Vetítés: európai (E) rendszer — homlokzat fent, alatta az alaprajz, mellette a metszet.
import { glassPanels } from './glass'
import { hasBackWall, postPositions, wallSides } from './mount'
import { isGlazedRoof } from './roofs'
import { PANEL, panelLayout } from './solar'
import { sideSegments, type SideSegment } from './sides'
import { FAN_DIAMETER, fanLayout } from './fans'
import type { PergolaConfig, SideKey, SideType } from '../types/pergola'

/** Keretgerenda szélessége és magassága, oszlop-keresztmetszet (m) — a 3D-modellel egyezik. */
export const BEAM_W = 0.19
export const BEAM_H = 0.23
export const POST = 0.16
const WALL_T = 0.3
/** Az A–A metszősík helye (m): a jobb fél közepén, oszlop és felirat nélküli sávban. */
const CUT = (width: number) => width * 0.3
export const SCALES = [20, 25, 50, 75, 100] as const

export interface DrawingMeta {
  brand: string
  contact: string
  title: string
  code: string
  date: string
  notes: string[]
  sheet?: string
}

export interface DrawingResult { svg: string; scale: number; width: number; height: number }

/** Szintek (m): gerenda alsó éle = szabad belmagasság, szerkezet teteje (tetőhéjjal). */
export function drawingLevels(config: Pick<PergolaConfig, 'height' | 'roof' | 'solar'>) {
  const beamBottom = config.height - BEAM_H / 2
  const beamTop = config.height + BEAM_H / 2
  const solar = config.roof === 'fixed' && config.solar
  const roofTop = config.height + (solar ? 0.29 : isGlazedRoof(config.roof) ? 0.236 : config.roof === 'fabric' ? 0.23 : config.roof === 'fixed' ? 0.2 : 0.205)
  return { beamBottom, beamTop, roofTop }
}

/** Tetőelemek darabszáma — a 3D-modell és az anyaglista képletei. */
export function roofDivisions(config: Pick<PergolaConfig, 'width' | 'depth' | 'roof'>) {
  const { width, depth, roof } = config
  if (roof === 'louvered' || roof === 'retractable') return Math.max(10, Math.floor(depth / 0.22))
  if (isGlazedRoof(roof)) return Math.max(2, Math.ceil(width / 0.95))
  if (roof === 'fabric') return Math.max(4, Math.ceil(depth / 0.5))
  return Math.max(2, Math.floor(depth / 0.65))
}

const r2 = (n: number) => Math.round(n * 100) / 100
const cm = (m: number) => String(Math.round(m * 100 + 1e-6))
const level = (m: number) => `${m >= 0.005 ? '+' : m <= -0.005 ? '−' : '±'}${(Math.round(Math.abs(m) * 100 + 1e-6) / 100).toFixed(2).replace('.', ',')}`
const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const INK = '#141a19'
const MID = '#4b5452'
const SOFT = '#8b9491'
const FAINT = '#c9cfcc'
const ACCENT = '#18322b'

type Weight = 'regular' | 'semi' | 'bold' | 'heavy'
const FONT: Record<Weight, string> = { regular: 'font-family="Manrope"', semi: 'font-family="ManropeSemi"', bold: 'font-family="Manrope" font-weight="bold"', heavy: 'font-family="ManropeHeavy"' }

class Svg {
  parts: string[] = []
  add(part: string) { this.parts.push(part) }
  line(x1: number, y1: number, x2: number, y2: number, width: number, color = INK, dash?: string) {
    this.add(`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="butt"/>`)
  }
  rect(x: number, y: number, w: number, h: number, opts: { stroke?: string; width?: number; fill?: string; dash?: string; opacity?: number } = {}) {
    const { stroke = INK, width = 0.25, fill = 'none', dash, opacity } = opts
    this.add(`<rect x="${r2(x)}" y="${r2(y)}" width="${r2(Math.max(0, w))}" height="${r2(Math.max(0, h))}" fill="${fill}"${opacity !== undefined ? ` fill-opacity="${opacity}"` : ''} stroke="${stroke === 'none' ? 'none' : stroke}" stroke-width="${stroke === 'none' ? 0 : width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`)
  }
  circle(cx: number, cy: number, r: number, opts: { stroke?: string; width?: number; fill?: string; dash?: string } = {}) {
    const { stroke = INK, width = 0.25, fill = 'none', dash } = opts
    this.add(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`)
  }
  path(d: string, opts: { stroke?: string; width?: number; fill?: string } = {}) {
    const { stroke = INK, width = 0.25, fill = 'none' } = opts
    this.add(`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${stroke === 'none' ? 0 : width}" stroke-linejoin="round"/>`)
  }
  text(x: number, y: number, content: string, size: number, opts: { weight?: Weight; anchor?: 'start' | 'middle' | 'end'; color?: string; rotate?: number; spacing?: number } = {}) {
    const { weight = 'regular', anchor = 'start', color = INK, rotate, spacing } = opts
    const transform = rotate ? ` transform="rotate(${rotate} ${r2(x)} ${r2(y)})"` : ''
    this.add(`<text x="${r2(x)}" y="${r2(y)}" ${FONT[weight]} font-size="${size}" fill="${color}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${spacing}"` : ''}${transform}>${esc(content)}</text>`)
  }
  /** 45°-os vonalkázás téglalapon belül (falmetszet, terep). */
  hatch(x: number, y: number, w: number, h: number, step = 1.1, width = 0.13, color = MID) {
    for (let t = -h + step / 2; t < w; t += step) {
      const x1 = Math.max(0, t)
      const y1 = x1 - t
      const x2 = Math.min(w, t + h)
      const y2 = x2 - t
      if (x2 - x1 > 0.05) this.line(x + x1, y + h - y1, x + x2, y + h - y2, width, color)
    }
  }
  toString(width: number, height: number) {
    const pt = 72 / 25.4
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(width * pt)}" height="${r2(height * pt)}" viewBox="0 0 ${r2(width)} ${r2(height)}">${this.parts.join('')}</svg>`
  }
}

/** Méretvonal-láncolat (építészeti ferde vonalkával). Vízszintes: a `pos` az y; függőleges: az x. */
function dimChain(svg: Svg, stops: number[], pos: number, from: number, vertical: boolean, labels?: string[]) {
  const sorted = [...stops]
  const tick = 1.1
  const ext = (value: number) => {
    const gap = 1.2
    if (vertical) svg.line(from + Math.sign(pos - from) * gap, value, pos + Math.sign(pos - from) * 1.6, value, 0.13, MID)
    else svg.line(value, from + Math.sign(pos - from) * gap, value, pos + Math.sign(pos - from) * 1.6, 0.13, MID)
  }
  sorted.forEach(ext)
  if (vertical) svg.line(pos, Math.min(...sorted) - 1.6, pos, Math.max(...sorted) + 1.6, 0.18, INK)
  else svg.line(Math.min(...sorted) - 1.6, pos, Math.max(...sorted) + 1.6, pos, 0.18, INK)
  sorted.forEach((value) => {
    if (vertical) svg.line(pos - tick / 1.4, value + tick / 1.4, pos + tick / 1.4, value - tick / 1.4, 0.35, INK)
    else svg.line(value - tick / 1.4, pos + tick / 1.4, value + tick / 1.4, pos - tick / 1.4, 0.35, INK)
  })
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const a = sorted[index]
    const b = sorted[index + 1]
    const label = labels?.[index]
    if (!label) continue
    const middle = (a + b) / 2
    const room = Math.abs(b - a)
    const textWidth = label.length * 1.25
    // Ha a szöveg nem fér a két vonalka közé, a vonal másik oldalára kerül.
    // Egymás melletti szűk mezőknél váltakozó oldalra, hogy a feliratok ne fedjék egymást.
    const narrow = room < textWidth + 1.2
    const prevNarrow = index > 0 && Math.abs(sorted[index] - sorted[index - 1]) < (labels?.[index - 1]?.length ?? 0) * 1.25 + 1.2
    const offset = narrow ? (prevNarrow ? 0.9 : -2.6) : 0.9
    if (vertical) svg.text(pos - offset, middle, label, 2.15, { anchor: 'middle', rotate: -90, weight: 'semi' })
    else svg.text(middle, pos - offset, label, 2.15, { anchor: 'middle', weight: 'semi' })
  }
}

/** Szintjel: üres háromszög a szintvonalon, mellette a szint méterben. */
function levelMark(svg: Svg, x: number, y: number, value: number, caption?: string) {
  const s = 1.5
  svg.line(x - 1, y, x + 13, y, 0.13, MID)
  svg.path(`M${r2(x + 2)} ${r2(y)} L${r2(x + 2 - s / 1.2)} ${r2(y - s)} L${r2(x + 2 + s / 1.2)} ${r2(y - s)} Z`, { stroke: INK, width: 0.2, fill: '#ffffff' })
  svg.path(`M${r2(x + 2)} ${r2(y)} L${r2(x + 2)} ${r2(y - s)} L${r2(x + 2 + s / 1.2)} ${r2(y - s)} Z`, { stroke: 'none', fill: INK })
  svg.text(x + 4.2, y - 0.75, level(value), 2.1, { weight: 'semi' })
  if (caption) svg.text(x + 4.2, y + 2.4, caption, 1.75, { color: SOFT })
}

function viewTitle(svg: Svg, x: number, y: number, title: string, scale: number) {
  svg.text(x, y, title.toUpperCase(), 2.6, { weight: 'heavy', spacing: 0.25 })
  const width = title.length * 2.05 + 2
  svg.line(x, y + 1.2, x + width, y + 1.2, 0.35, INK)
  svg.text(x + width + 2.5, y, `M 1:${scale}`, 2.2, { weight: 'semi', color: MID })
}

const SIDE_SHORT: Record<SideType, string> = { none: '', zip: 'ZIP screen', glass: 'tolóüveg', glassFramed: 'keretes tolóüveg', glassFixed: 'fix üveg', louver: 'lamellafal', slatAlu: 'alu lécfal', slatWood: 'fa lécfal' }
/** Osztóprofil szélessége (m), félbe osztott oldal közepén, ha ott nincs oszlop. */
const MULLION = 0.06
const WOOD = '#e6d8c0'

/**
 * Elrendezés: a lehető legnagyobb szabványos méretarány, amelynél mindhárom nézet és a fejléc elfér.
 * A lap mérete mm-ben (alapból A4 fekvő, a PDF margóin belül).
 */
export function technicalDrawing(config: PergolaConfig, meta: DrawingMeta, sheetWidth = 277, sheetHeight = 187): DrawingResult {
  const { width: w, depth: d, height: h, mount, sides } = config
  const walls = wallSides(mount)
  const back = hasBackWall(mount)
  const leftWing = walls.includes('left')
  const rightWing = walls.includes('right')
  const levels = drawingLevels(config)
  const posts = postPositions(config)
  const sideOf = (side: SideKey): SideType => (walls.includes(side) ? 'none' : sides[side])
  /** Az oldal szegmensei modell-koordinátában (elöl/hátul x, oldalt z), a sarkoknál és az osztásnál levágva. */
  const segmentsOf = (side: SideKey) => {
    if (walls.includes(side)) return [] as { segment: SideSegment; a: number; b: number }[]
    const horizontal = side === 'front' || side === 'back'
    const L = horizontal ? w : d
    const hasMidPost = side === 'front' && w > 6
    const midGap = hasMidPost ? POST / 2 : MULLION / 2
    return sideSegments(config, side).filter((segment) => segment.type !== 'none').map((segment) => {
      // Oldalt az első fél az elülső (+z) vég, ezért ott a helyi koordináta előjelet vált.
      let [a, b] = horizontal ? [segment.from * L, segment.to * L] : [-segment.to * L, -segment.from * L]
      const outer = 0.09 + POST / 2
      a = Math.abs(a + L / 2) < 1e-6 ? a + outer : a + (segment.half === null ? 0 : midGap)
      b = Math.abs(b - L / 2) < 1e-6 ? b - outer : b - (segment.half === null ? 0 : midGap)
      return { segment, a, b }
    })
  }
  const needsMullion = (side: SideKey) => !walls.includes(side) && Boolean(config.split?.[side]) && !(side === 'front' && w > 6)

  // Modell-kiterjedések (m).
  const xMin = -w / 2 - (leftWing ? WALL_T : back ? 0.35 : 0)
  const xMax = w / 2 + (rightWing ? WALL_T : back ? 0.35 : 0)
  const zMin = -d / 2 - (back ? WALL_T : 0)
  const zMax = d / 2 + (leftWing || rightWing ? 0.15 : 0)
  const yTop = back || leftWing || rightWing ? levels.roofTop + 0.3 : levels.roofTop
  const spanX = xMax - xMin
  const spanZ = zMax - zMin

  const pad = 4
  const gap = 5
  const availW = sheetWidth - pad * 2
  const availH = sheetHeight - pad * 2
  const TB_W = 112
  const TB_H = 62
  const dimSpace = 15
  const titleSpace = 8
  let scale: number = SCALES[SCALES.length - 1]
  let k = 1000 / scale
  for (const candidate of SCALES) {
    const kk = 1000 / candidate
    const leftCol = dimSpace + spanX * kk + 19
    const rightCol = Math.max(4 + spanZ * kk + dimSpace, TB_W)
    const elevH = 3 + yTop * kk + 3 + titleSpace
    const sectionH = 3 + yTop * kk + 3 + dimSpace + titleSpace
    const planH = 4 + spanZ * kk + dimSpace + 3 + titleSpace
    if (leftCol + gap + rightCol <= availW && elevH + gap + planH <= availH && sectionH + gap + TB_H <= availH) { scale = candidate; k = kk; break }
  }

  const svg = new Svg()
  // Lapkeret.
  svg.rect(0.3, 0.3, sheetWidth - 0.6, sheetHeight - 0.6, { width: 0.5 })

  const leftColW = dimSpace + spanX * k + 19
  const rightColW = Math.max(4 + spanZ * k + dimSpace, TB_W)
  const usedW = leftColW + gap + rightColW
  const x0 = pad + Math.max(0, (availW - usedW) / 2) * 0.35
  const X = (x: number) => x0 + dimSpace + (x - xMin) * k

  // ---------- HOMLOKZAT (elölnézet) ----------
  const elevTop = pad + 3
  const groundY = elevTop + yTop * k
  const Y = (y: number) => groundY - y * k
  drawElevation()
  viewTitle(svg, X(xMin), groundY + 3 + 6.5, 'Homlokzat', scale)

  // ---------- ALAPRAJZ (vízszintes metszet +1,00 m-en) ----------
  const planTop = groundY + 3 + titleSpace + gap + 4
  const Zp = (z: number) => planTop + (z - zMin) * k
  drawPlan()
  viewTitle(svg, X(xMin), Zp(zMax) + dimSpace + 9.5, 'Alaprajz', scale)

  // ---------- A–A METSZET ----------
  const sx0 = x0 + leftColW + gap
  const Zs = (z: number) => sx0 + 4 + (z - zMin) * k
  drawSection()
  viewTitle(svg, Zs(zMin), groundY + 3 + dimSpace + 6.5, 'A–A metszet', scale)

  // ---------- Megjegyzések + fejléc ----------
  const tbX = sheetWidth - pad - TB_W
  const tbY = sheetHeight - pad - TB_H
  drawNotes(sx0, groundY + 3 + dimSpace + titleSpace + 2, tbY - 3)
  drawTitleBlock(tbX, tbY)

  return { svg: svg.toString(sheetWidth, sheetHeight), scale, width: sheetWidth, height: sheetHeight }

  // =============================================================
  function drawGround(x1: number, x2: number) {
    svg.line(x1, groundY, x2, groundY, 0.5, INK)
    svg.hatch(x1, groundY, x2 - x1, 2.2, 1.3, 0.13, SOFT)
  }

  function drawWallSection(x: number, y: number, width: number, height: number) {
    svg.rect(x, y, width, height, { width: 0.5, fill: '#ffffff' })
    svg.hatch(x, y, width, height, 1.0, 0.13, MID)
  }

  function drawElevation() {
    drawGround(X(xMin) - 2, X(xMax) + 2)
    // Ház homlokzata a háttérben (vékony, nézetben).
    if (back) {
      const fx1 = leftWing ? X(-w / 2) : X(xMin)
      const fx2 = rightWing ? X(w / 2) : X(xMax)
      svg.rect(fx1, Y(yTop), fx2 - fx1, Y(0) - Y(yTop), { stroke: SOFT, width: 0.18, fill: '#f4f5f3' })
      // Szakadásvonal felül.
      svg.line(fx1, Y(yTop), fx2, Y(yTop), 0.18, '#ffffff')
      breakLine(fx1, fx2, Y(yTop))
      svg.text((fx1 + fx2) / 2, Y(yTop) + 3.4, 'HÁZFAL (NÉZET)', 1.7, { anchor: 'middle', color: SOFT, spacing: 0.2, weight: 'semi' })
      // Fali csatlakozó profil.
      svg.rect(X(-w / 2 - 0.03), Y(h + 0.19), (w + 0.06) * k, 0.3 * k, { stroke: MID, width: 0.18, fill: '#e3e6e4' })
    }
    // Házszárnyak (metszetben, mert a homlokzati síkban állnak).
    if (leftWing) drawWallSection(X(-w / 2 - WALL_T), Y(yTop), WALL_T * k, yTop * k)
    if (rightWing) drawWallSection(X(w / 2), Y(yTop), WALL_T * k, yTop * k)
    // Elülső oldalzárás (oszlopok között).
    const frontPosts = posts.filter(([, z]) => z > 0).map(([x]) => x).sort((a, b) => a - b)
    segmentsOf('front').forEach(({ segment, a, b }) => drawSideInElevation(segment.type, X(a), X(b), frontPosts))
    if (needsMullion('front')) svg.rect(X(-MULLION / 2), Y(levels.beamBottom), MULLION * k, (levels.beamBottom - 0.02) * k, { width: 0.3, fill: '#ffffff' })
    // Oszlopok.
    const columnXs = Array.from(new Set(posts.map(([x]) => r2(x))))
    columnXs.forEach((x) => {
      svg.rect(X(x - POST / 2), Y(levels.beamBottom), POST * k, levels.beamBottom * k, { width: 0.5, fill: '#ffffff' })
      svg.rect(X(x - 0.15), Y(0.035), 0.3 * k, 0.035 * k, { width: 0.25, fill: INK })
    })
    // Tető széle (lamella/üveg) a gerenda fölött, majd a gerenda.
    svg.rect(X(-w / 2 + 0.06), Y(levels.roofTop), (w - 0.12) * k, (levels.roofTop - levels.beamTop) * k, { width: 0.18, fill: '#eef0ee' })
    svg.rect(X(-w / 2), Y(levels.beamTop), w * k, BEAM_H * k, { width: 0.5, fill: '#ffffff' })
    // Magasság: lánc balra, szintek jobbra.
    const left = X(xMin) - 5
    dimChain(svg, [Y(0), Y(levels.beamBottom), Y(levels.beamTop)], left, X(-w / 2), true, [cm(levels.beamBottom), cm(BEAM_H)])
    dimChain(svg, [Y(0), Y(levels.roofTop)], left - 6.5, X(-w / 2), true, [cm(levels.roofTop)])
    const lx = X(xMax) + 2
    levelMark(svg, lx, Y(levels.roofTop), levels.roofTop)
    levelMark(svg, lx, Y(levels.beamBottom), levels.beamBottom, 'szabad belmagasság')
    levelMark(svg, lx, Y(0), 0, 'járófelület')
  }

  function breakLine(x1: number, x2: number, y: number) {
    const m = (x1 + x2) / 2
    svg.path(`M${r2(x1)} ${r2(y)} L${r2(m - 1.4)} ${r2(y)} L${r2(m - 0.6)} ${r2(y - 1.6)} L${r2(m + 0.6)} ${r2(y + 1.6)} L${r2(m + 1.4)} ${r2(y)} L${r2(x2)} ${r2(y)}`, { stroke: SOFT, width: 0.18 })
  }

  function drawSideInElevation(type: SideType, x1: number, x2: number, inner: number[]) {
    const top = Y(levels.beamBottom)
    const bottom = Y(0.04)
    // Az oldal mezőkre bomlik a köztes (közép)oszlopoknál.
    const cuts = [x1, ...inner.filter((x) => X(x) > x1 + 2 && X(x) < x2 - 2).map((x) => X(x)), x2]
    for (let i = 0; i < cuts.length - 1; i += 1) {
      const a = cuts[i] + (i > 0 ? (POST / 2) * k : 0)
      const b = cuts[i + 1] - (i < cuts.length - 2 ? (POST / 2) * k : 0)
      if (type === 'zip') {
        svg.rect(a, top, b - a, 0.13 * k, { width: 0.25, fill: '#dfe2e0' })
        svg.rect(a + 0.2, top + 0.13 * k, b - a - 0.4, bottom - top - 0.13 * k, { stroke: SOFT, width: 0.13, fill: '#f3f4f2' })
        for (let y = top + 0.13 * k + 1.6; y < bottom; y += 1.6) svg.line(a + 0.2, y, b - 0.2, y, 0.08, FAINT)
      } else if (type === 'glass') {
        const length = (b - a) / k
        const { count } = glassPanels(length)
        const pw = (b - a) / count
        svg.rect(a, bottom - 0.6, b - a, 0.6, { width: 0.18, fill: INK })
        for (let p = 0; p < count; p += 1) {
          const px = a + p * pw
          svg.rect(px + 0.15, top + 0.3, pw - 0.3, bottom - top - 0.9, { stroke: MID, width: 0.18, fill: '#eef3f3' })
          svg.line(px + pw * 0.3, top + (bottom - top) * 0.3, px + pw * 0.45, top + (bottom - top) * 0.2, 0.13, SOFT)
          svg.line(px + pw * 0.3, top + (bottom - top) * 0.38, px + pw * 0.55, top + (bottom - top) * 0.22, 0.13, SOFT)
        }
      } else if (type === 'glassFramed') {
        const { count } = glassPanels((b - a) / k)
        const pw = (b - a) / count
        svg.rect(a, bottom - 0.6, b - a, 0.6, { width: 0.18, fill: INK })
        for (let p = 0; p < count; p += 1) {
          const px = a + p * pw
          svg.rect(px + 0.15, top + 0.3, pw - 0.3, bottom - top - 0.9, { stroke: INK, width: 0.18, fill: '#ffffff' })
          svg.rect(px + 0.15 + 0.05 * k, top + 0.3 + 0.05 * k, pw - 0.3 - 0.1 * k, bottom - top - 0.9 - 0.1 * k, { stroke: MID, width: 0.13, fill: '#eef3f3' })
          svg.line(px + pw * 0.3, top + (bottom - top) * 0.3, px + pw * 0.45, top + (bottom - top) * 0.2, 0.13, SOFT)
        }
      } else if (type === 'glassFixed') {
        const count = Math.max(1, Math.round((b - a) / k / 1.5))
        const pw = (b - a) / count
        for (let p = 0; p < count; p += 1) {
          const px = a + p * pw
          svg.rect(px + 0.1, top + 0.2, pw - 0.2, bottom - top - 0.4, { stroke: MID, width: 0.18, fill: '#eef3f3' })
          svg.line(px + pw * 0.25, top + (bottom - top) * 0.35, px + pw * 0.5, top + (bottom - top) * 0.15, 0.13, SOFT)
        }
        svg.rect(a, bottom - 0.4, b - a, 0.4, { width: 0.13, fill: MID })
      } else if (type === 'louver') {
        for (let y = top + 1.2; y < bottom - 0.4; y += 0.11 * k) svg.rect(a, y, b - a, 0.05 * k, { stroke: MID, width: 0.13, fill: '#e9ecea' })
      } else if (type === 'slatAlu' || type === 'slatWood') {
        const pitch = (type === 'slatWood' ? 0.115 : 0.105) * k
        const slat = (type === 'slatWood' ? 0.095 : 0.08) * k
        for (let y = top + 0.6; y + slat < bottom - 0.2; y += pitch) svg.rect(a, y, b - a, slat, { stroke: MID, width: 0.12, fill: type === 'slatWood' ? WOOD : '#dfe2e0' })
      }
    }
  }

  function drawPlan() {
    // Házfal és szárnyak metszetben.
    if (back) drawWallSection(leftWing ? X(-w / 2 - WALL_T) : X(xMin), Zp(-d / 2 - WALL_T), ((rightWing ? w / 2 + WALL_T : xMax) - (leftWing ? -w / 2 - WALL_T : xMin)) * k, WALL_T * k)
    if (leftWing) drawWallSection(X(-w / 2 - WALL_T), Zp(-d / 2), WALL_T * k, (zMax - -d / 2) * k)
    if (rightWing) drawWallSection(X(w / 2), Zp(-d / 2), WALL_T * k, (zMax - -d / 2) * k)
    if (back) svg.text(X(-w / 4), Zp(-d / 2 - WALL_T) - 1.2, 'HÁZFAL', 1.8, { anchor: 'middle', color: MID, weight: 'semi', spacing: 0.3 })
    // A metsző sík fölötti szerkezet szaggatottan: keret és tetőelemek.
    svg.rect(X(-w / 2), Zp(-d / 2), w * k, d * k, { width: 0.35, dash: '2.2 1.1' })
    svg.rect(X(-w / 2 + BEAM_W), Zp(-d / 2 + BEAM_W), (w - 2 * BEAM_W) * k, (d - 2 * BEAM_W) * k, { width: 0.18, stroke: MID, dash: '1.6 1' })
    drawRoofPlan()
    // Mennyezeti ventilátor(ok): a metszősík fölött, ezért szaggatva; tartógerenda és lapátkör.
    const fans = fanLayout(config)
    fans.bars.forEach((bar) => svg.rect(X(-w / 2 + BEAM_W), Zp(bar.at - 0.035), (w - 2 * BEAM_W) * k, 0.07 * k, { stroke: MID, width: 0.18, dash: '1.2 0.8' }))
    fans.positions.forEach(([fx, fz]) => {
      svg.circle(X(fx), Zp(fz), (FAN_DIAMETER / 2) * k, { stroke: MID, width: 0.2, dash: '1.4 0.9' })
      svg.circle(X(fx), Zp(fz), 0.1 * k, { stroke: INK, width: 0.25, fill: '#ffffff' })
      svg.text(X(fx), Zp(fz) + (FAN_DIAMETER / 2) * k + 2.6, `ventilátor Ø${Math.round(FAN_DIAMETER * 100)}`, 1.6, { anchor: 'middle', color: MID, weight: 'semi' })
    })
    // Oldalzárások (a metszősíkban, vastagon).
    ;(['front', 'back', 'left', 'right'] as SideKey[]).forEach((side) => {
      const parts = segmentsOf(side)
      parts.forEach(({ segment, a, b }) => drawSideInPlan(side, segment.type, a, b, segment.half !== null))
      if (needsMullion(side)) {
        const horizontal = side === 'front' || side === 'back'
        const fixed = horizontal ? (side === 'front' ? d / 2 - 0.09 : -d / 2 + 0.09) : (side === 'left' ? -w / 2 + 0.09 : w / 2 - 0.09)
        const [cx, cy] = horizontal ? [X(0), Zp(fixed)] : [X(fixed), Zp(0)]
        svg.rect(cx - (MULLION / 2) * k, cy - (MULLION / 2) * k, MULLION * k, MULLION * k, { width: 0.2, fill: INK })
      }
    })
    // Oszlopok (metszve: telt).
    posts.forEach(([x, z]) => svg.rect(X(x - POST / 2), Zp(z - POST / 2), POST * k, POST * k, { width: 0.35, fill: INK }))
    // Tengelyek: vékony pontvonal az oszlopokon át.
    const axisXs = Array.from(new Set(posts.map(([x]) => r2(x)))).sort((a, b) => a - b)
    const axisZs = Array.from(new Set(posts.map(([, z]) => r2(z)))).sort((a, b) => a - b)
    // Méretláncok: alul az oszlopkiosztás és a teljes szélesség, jobbra a mélység.
    // Ha elöl/jobbra oldalzárás-felirat van, a méretlánc kijjebb kerül.
    const bottom = Zp(zMax) + (sideOf('front') !== 'none' && !leftWing && !rightWing ? 9 : 6)
    const xs = [-w / 2, ...axisXs, w / 2]
    if (axisXs.length) dimChain(svg, xs.map(X), bottom, Zp(d / 2), false, xs.slice(1).map((x, i) => cm(x - xs[i])))
    dimChain(svg, [X(-w / 2), X(w / 2)], bottom + (axisXs.length ? 6.5 : 0), Zp(d / 2), false, [cm(w)])
    const right = X(xMax) + (sideOf('right') !== 'none' && !rightWing ? 9 : 6)
    const zs = [-d / 2, ...axisZs, d / 2]
    if (axisZs.length) dimChain(svg, zs.map(Zp), right, X(w / 2), true, zs.slice(1).map((z, i) => cm(z - zs[i])))
    dimChain(svg, [Zp(-d / 2), Zp(d / 2)], right + (axisZs.length ? 6.5 : 0), X(w / 2), true, [cm(d)])
    // A–A metszősík jele.
    const cutX = X(CUT(w))
    const ya = Zp(zMin) - 3.2
    const yb = Zp(zMax) + 2.4
    svg.line(cutX, ya, cutX, yb, 0.25, INK, '4 1 0.6 1')
    ;[ya, yb].forEach((y) => {
      svg.line(cutX - 0.01, y, cutX, y, 0.6)
      svg.path(`M${r2(cutX)} ${r2(y)} L${r2(cutX + 3.2)} ${r2(y)} M${r2(cutX + 3.2)} ${r2(y)} L${r2(cutX + 2)} ${r2(y - 0.8)} L${r2(cutX + 2)} ${r2(y + 0.8)} Z`, { stroke: INK, width: 0.35, fill: INK })
      svg.text(cutX - 1.2, y + 0.8, 'A', 2.6, { weight: 'heavy', anchor: 'end' })
    })
  }

  function drawRoofPlan() {
    const n = roofDivisions(config)
    const ix1 = X(-w / 2 + BEAM_W)
    const ix2 = X(w / 2 - BEAM_W)
    const roof = config.roof
    if (roof === 'louvered' || roof === 'retractable' || roof === 'fabric') {
      const pitch = roof === 'fabric' ? (d - 0.24) / n : (d - 0.3) / n
      const first = roof === 'fabric' ? -d / 2 + 0.12 : -d / 2 + 0.2
      for (let i = 0; i < n; i += 1) {
        const z = first + i * pitch
        if (z > d / 2 - BEAM_W + 0.02 || z < -d / 2 + BEAM_W - 0.02) continue
        svg.line(ix1, Zp(z), ix2, Zp(z), 0.13, SOFT, '1.4 0.9')
      }
    } else if (isGlazedRoof(roof)) {
      const span = w - 0.14
      const bay = span / n
      for (let i = 0; i <= n; i += 1) {
        const x = -span / 2 + i * bay
        svg.line(X(x), Zp(-d / 2 + BEAM_W), X(x), Zp(d / 2 - BEAM_W), 0.18, MID, '1.6 1')
      }
    } else {
      for (let i = 1; i <= n; i += 1) {
        const z = -d / 2 + (i * d) / (n + 1)
        svg.line(ix1, Zp(z), ix2, Zp(z), 0.13, SOFT, '1.4 0.9')
      }
    }
    // Napelemek a fix tetőn: modulok körvonala (a metszősík fölött, szaggatottan).
    const solar = roof === 'fixed' && config.solar ? panelLayout(config) : null
    if (solar) solar.positions.forEach(([px, pz]) => {
      svg.rect(X(px - solar.size[0] / 2), Zp(pz - solar.size[1] / 2), solar.size[0] * k, solar.size[1] * k, { stroke: MID, width: 0.25, dash: '1.8 0.9', fill: '#f2f5f8' })
      svg.line(X(px - solar.size[0] / 2), Zp(pz - solar.size[1] / 2), X(px + solar.size[0] / 2), Zp(pz + solar.size[1] / 2), 0.1, FAINT)
    })
    const label = solar ? `napelem ${solar.count} × ${PANEL.wp} Wp` : { louvered: 'forgatható lamellák', retractable: 'eltolható lamellacsomag', fabric: 'behúzható ponyva', glass: 'VSG üvegtető', polycarbonate: 'polikarbonát tető', fixed: 'fix tetőpanel' }[roof]
    // A tetőfelirat ne essen a ventilátor lapátkörébe.
    const fanAlongX = (config.fans ?? 0) > 0 && fanLayout(config).positions.every(([, z]) => z === 0)
    const cx = X(-w / 6)
    const cy = Zp(fanAlongX ? -d * 0.3 : 0)
    svg.rect(cx - label.length * 0.62 - 1.2, cy - 2.2, label.length * 1.24 + 2.4, 3.2, { stroke: 'none', fill: '#ffffff' })
    svg.text(cx, cy, label, 1.9, { anchor: 'middle', color: MID, weight: 'semi' })
  }

  function drawSideInPlan(side: SideKey, type: SideType, from: number, to: number, half: boolean) {
    if (type === 'none') return
    const horizontal = side === 'front' || side === 'back'
    const fixed = horizontal ? (side === 'front' ? d / 2 - 0.09 : -d / 2 + 0.09) : (side === 'left' ? -w / 2 + 0.09 : w / 2 - 0.09)
    const length = to - from
    const start = from
    const P = (along: number, across = 0): [number, number] => (horizontal ? [X(along), Zp(fixed + across)] : [X(fixed + across), Zp(along)])
    const seg = (a: number, b: number, across: number, width: number, color = INK) => { const [x1, y1] = P(a, across); const [x2, y2] = P(b, across); svg.line(x1, y1, x2, y2, width, color) }
    if (type === 'glass' || type === 'glassFramed') {
      const { count, width: pw } = glassPanels(length)
      if (type === 'glassFramed') { seg(start, start + length, -0.045, 0.13, INK); seg(start, start + length, 0.045, 0.13, INK) }
      seg(start, start + length, -0.03, 0.13, MID)
      seg(start, start + length, 0.03, 0.13, MID)
      for (let p = 0; p < count; p += 1) {
        const offset = p % 2 === 0 ? -0.015 : 0.015
        seg(start + 0.06 + p * pw + 0.01, start + 0.06 + (p + 1) * pw - 0.01, offset, 0.45, INK)
      }
    } else if (type === 'zip') {
      seg(start, start + length, 0, 0.45, INK)
      seg(start, start + length, 0.05, 0.13, SOFT)
    } else if (type === 'glassFixed') {
      seg(start, start + length, 0, 0.35, INK)
      const count = Math.max(1, Math.round(length / 1.5))
      for (let p = 1; p < count; p += 1) seg(start + (p * length) / count - 0.02, start + (p * length) / count + 0.02, 0, 0.9, INK)
    } else if (type === 'slatAlu' || type === 'slatWood') {
      seg(start, start + length, -0.025, 0.18, INK)
      seg(start, start + length, 0.025, 0.18, INK)
      if (type === 'slatWood') for (let a = start + 0.04; a < start + length - 0.03; a += 0.08) { const [x1, y1] = P(a, -0.025); const [x2, y2] = P(a + 0.04, 0.025); svg.line(x1, y1, x2, y2, 0.1, MID) }
    } else {
      const step = 0.11
      for (let a = start + 0.05; a < start + length - 0.04; a += step) {
        const [x1, y1] = P(a, -0.045)
        const [x2, y2] = P(a + 0.07, 0.045)
        svg.line(x1, y1, x2, y2, 0.3, INK)
      }
    }
    // Felirat a mező közepén, kívül.
    // Felirat helye: ne essen az A–A metszősík jelére (elöl/hátul az x = CUT(w) vonalán).
    const candidates = horizontal && !half ? [0.25] : [0.5, 0.25, 0.75, 0.15, 0.85]
    const along = (candidates.map((f) => start + length * f).find((x) => !horizontal || Math.abs(x - CUT(w)) > 0.85) ?? start + length * candidates[0])
    const [tx, ty] = P(along, side === 'front' ? 0.32 : side === 'back' ? -0.32 : side === 'left' ? -0.32 : 0.32)
    const text = SIDE_SHORT[type]
    if (horizontal) svg.text(tx, ty + (side === 'front' ? 0.6 : 0.6), text, 1.75, { anchor: 'middle', color: MID, weight: 'semi' })
    else svg.text(tx + (side === 'left' ? -0.4 : 0.6), ty, text, 1.75, { anchor: 'middle', color: MID, weight: 'semi', rotate: -90 })
  }

  function drawSection() {
    const Ys = Y
    // A metszősíkon túli házszárny fala nézetben (L/U kialakításnál).
    if (rightWing) svg.rect(Zs(-d / 2), Ys(yTop), (zMax + d / 2) * k, yTop * k, { stroke: SOFT, width: 0.18, fill: '#f4f5f3' })
    drawGround(Zs(zMin) - 2, Zs(zMax) + 2)
    // Házfal metszetben (bal oldalon), szakadásvonallal felül.
    if (back) {
      drawWallSection(Zs(-d / 2 - WALL_T), Ys(yTop), WALL_T * k, yTop * k)
      // Fali profil és vízvető.
      svg.rect(Zs(-d / 2), Ys(h + 0.19), 0.035 * k, 0.3 * k, { width: 0.25, fill: INK })
      svg.path(`M${r2(Zs(-d / 2))} ${r2(Ys(h + 0.245))} L${r2(Zs(-d / 2 + 0.3))} ${r2(Ys(h + 0.205))}`, { width: 0.45 })
    }
    // A metszősíkon túli oldal (jobb oldal) nézetben.
    const rightPosts = posts.filter(([x]) => x > CUT(w)).map(([, z]) => z).sort((a, b) => a - b)
    segmentsOf('right').forEach(({ segment, a: za, b: zb }) => {
      const type = segment.type
      const a = Zs(za)
      const b = Zs(zb)
      const top = Ys(levels.beamBottom)
      const bottom = Ys(0.04)
      if (type === 'zip') { svg.rect(a, top, b - a, 0.13 * k, { width: 0.18, fill: '#e6e8e6' }); svg.rect(a, top + 0.13 * k, b - a, bottom - top - 0.13 * k, { stroke: SOFT, width: 0.13, fill: '#f5f6f4' }) }
      else if (type === 'glass' || type === 'glassFramed' || type === 'glassFixed') { const count = type === 'glassFixed' ? Math.max(1, Math.round((b - a) / k / 1.5)) : glassPanels((b - a) / k).count; const pw = (b - a) / count; for (let p = 0; p < count; p += 1) svg.rect(a + p * pw + 0.15, top + 0.3, pw - 0.3, bottom - top - 0.9, { stroke: type === 'glassFramed' ? MID : SOFT, width: type === 'glassFramed' ? 0.3 : 0.13, fill: '#f1f5f5' }) }
      else if (type === 'slatAlu' || type === 'slatWood') { for (let y = top + 0.6; y < bottom - 0.4; y += 0.11 * k) svg.rect(a, y, b - a, 0.085 * k, { stroke: SOFT, width: 0.1, fill: type === 'slatWood' ? '#efe6d6' : '#eceeec' }) }
      else for (let y = top + 1.2; y < bottom - 0.4; y += 0.11 * k) svg.rect(a, y, b - a, 0.05 * k, { stroke: SOFT, width: 0.1, fill: '#eef0ee' })
    })
    if (needsMullion('right')) svg.rect(Zs(-MULLION / 2), Ys(levels.beamBottom), MULLION * k, (levels.beamBottom - 0.02) * k, { width: 0.25, fill: '#ffffff' })
    // A metszősíkon túli oszlopok nézetben.
    rightPosts.forEach((z) => svg.rect(Zs(z - POST / 2), Ys(levels.beamBottom), POST * k, levels.beamBottom * k, { width: 0.35, fill: '#ffffff' }))
    // Oldalgerenda nézetben, a hossz- (elülső/hátsó) gerendák metszve.
    svg.rect(Zs(-d / 2), Ys(levels.beamTop), d * k, BEAM_H * k, { width: 0.25, fill: '#ffffff' })
    ;[-d / 2, d / 2 - BEAM_W].forEach((z) => svg.rect(Zs(z), Ys(levels.beamTop), BEAM_W * k, BEAM_H * k, { width: 0.5, fill: INK }))
    drawRoofSection()
    // Méretek: alul a mélység (oszloptengelyekkel), jobbra a magasság.
    const axisZs = Array.from(new Set(posts.map(([, z]) => r2(z)))).sort((a, b) => a - b)
    const below = groundY + 3 + 5
    const zs = [-d / 2, ...axisZs, d / 2]
    if (axisZs.length) dimChain(svg, zs.map(Zs), below, groundY, false, zs.slice(1).map((z, i) => cm(z - zs[i])))
    dimChain(svg, [Zs(-d / 2), Zs(d / 2)], below + (axisZs.length ? 6.5 : 0), groundY, false, [cm(d)])
    const right = Zs(zMax) + 5
    dimChain(svg, [Ys(0), Ys(levels.beamBottom), Ys(levels.beamTop), Ys(levels.roofTop)], right, Zs(d / 2), true, [cm(levels.beamBottom), cm(BEAM_H), cm(levels.roofTop - levels.beamTop)])
  }

  function drawRoofSection() {
    const roof = config.roof
    const n = roofDivisions(config)
    if (roof === 'louvered' || roof === 'retractable') {
      const pitch = (d - 0.3) / n
      for (let i = 0; i < n; i += 1) {
        const z = -d / 2 + 0.2 + i * pitch
        // Aerofoil lamella metszete zárt állásban (húr 19 cm).
        const cx = Zs(z)
        const cy = Y(h + 0.15)
        const s = k
        svg.path(`M${r2(cx - 0.095 * s)} ${r2(cy)} C${r2(cx - 0.085 * s)} ${r2(cy - 0.042 * s)} ${r2(cx - 0.025 * s)} ${r2(cy - 0.055 * s)} ${r2(cx + 0.055 * s)} ${r2(cy - 0.028 * s)} C${r2(cx + 0.095 * s)} ${r2(cy - 0.012 * s)} ${r2(cx + 0.1 * s)} ${r2(cy + 0.008 * s)} ${r2(cx + 0.065 * s)} ${r2(cy + 0.024 * s)} C${r2(cx + 0.005 * s)} ${r2(cy + 0.052 * s)} ${r2(cx - 0.065 * s)} ${r2(cy + 0.035 * s)} ${r2(cx - 0.095 * s)} ${r2(cy)} Z`, { width: 0.2, fill: INK })
      }
    } else if (isGlazedRoof(roof)) {
      // Borda nézetben + a tábla metszetben.
      svg.rect(Zs(-d / 2 + 0.06), Y(h + 0.2025), (d - 0.12) * k, 0.075 * k, { width: 0.18, fill: '#ffffff' })
      svg.rect(Zs(-d / 2 + 0.06), Y(h + 0.217 + (roof === 'glass' ? 0.006 : 0.008)), (d - 0.12) * k, Math.max(0.35, (roof === 'glass' ? 0.012 : 0.016) * k), { stroke: 'none', fill: roof === 'glass' ? '#7aa4a8' : '#b8bdb9' })
      svg.rect(Zs(-d / 2 + 0.06), Y(h + 0.236), (d - 0.12) * k, 0.018 * k, { width: 0.18, fill: INK })
    } else if (roof === 'fabric') {
      const pitch = (d - 0.24) / n
      let dPath = ''
      for (let i = 0; i <= n; i += 1) {
        const z = -d / 2 + 0.12 + i * pitch
        svg.rect(Zs(z) - 0.017 * k, Y(h + 0.214), 0.034 * k, 0.028 * k, { width: 0.13, fill: INK })
        if (i < n) {
          const z2 = z + pitch
          const sag = Math.min(0.06, pitch * 0.08)
          dPath += `${i === 0 ? 'M' : 'L'}${r2(Zs(z))} ${r2(Y(h + 0.214))} Q${r2(Zs((z + z2) / 2))} ${r2(Y(h + 0.214 - sag * 2))} ${r2(Zs(z2))} ${r2(Y(h + 0.214))} `
        }
      }
      svg.path(dPath, { width: 0.3, stroke: MID })
    } else {
      svg.rect(Zs(-d / 2 + 0.06), Y(h + 0.185), (d - 0.12) * k, 0.09 * k, { width: 0.4, fill: '#ffffff' })
      svg.hatch(Zs(-d / 2 + 0.06), Y(h + 0.185), (d - 0.12) * k, 0.09 * k, 0.7, 0.1, SOFT)
      if (config.solar) {
        // Modulsorok metszetben (35 mm-es keret) a tartósíneken.
        const layout = panelLayout(config)
        const rows = Array.from(new Set(layout.positions.map(([, z]) => Math.round(z * 1000) / 1000)))
        rows.forEach((z) => {
          svg.rect(Zs(z - layout.size[1] / 2), Y(h + 0.2725), layout.size[1] * k, Math.max(0.35, 0.035 * k), { width: 0.2, fill: INK })
          ;[-0.28, 0.28].forEach((offset) => svg.rect(Zs(z + offset * layout.size[1]) - 0.3, Y(h + 0.235), 0.6, 0.04 * k, { stroke: 'none', fill: MID }))
        })
      }
    }
  }

  function drawNotes(x: number, top: number, bottom: number) {
    if (bottom - top < 12) return
    const width = sheetWidth - pad - x
    svg.text(x, top + 3, 'MEGJEGYZÉSEK', 2, { weight: 'heavy', spacing: 0.3 })
    let y = top + 7
    meta.notes.forEach((note, index) => {
      if (y > bottom - 2) return
      svg.text(x, y, `${index + 1}.`, 1.85, { weight: 'bold', color: MID })
      // Egyszerű sortördelés a rendelkezésre álló szélességre.
      const maxChars = Math.floor((width - 5) / 0.98)
      const words = note.split(' ')
      let line = ''
      const lines: string[] = []
      words.forEach((word) => { if ((line + ' ' + word).trim().length > maxChars) { lines.push(line.trim()); line = word } else line += ` ${word}` })
      if (line.trim()) lines.push(line.trim())
      lines.forEach((text) => { if (y <= bottom - 1) svg.text(x + 4, y, text, 1.85, { color: MID }); y += 2.7 })
      y += 0.8
    })
    // Grafikus aránymérték.
    const barY = bottom - 1
    if (y + 5 < bottom) {
      const unit = k
      for (let m = 0; m < 4; m += 1) svg.rect(x + m * unit, barY - 1.2, unit, 1.2, { width: 0.18, fill: m % 2 === 0 ? INK : '#ffffff' })
      for (let m = 0; m <= 4; m += 1) svg.text(x + m * unit, barY - 2.2, String(m), 1.7, { anchor: 'middle', weight: 'semi' })
      svg.text(x + 4 * unit + 2, barY - 0.1, 'm', 1.8, { color: MID })
    }
  }

  function drawTitleBlock(x: number, y: number) {
    const W = TB_W
    svg.rect(x, y, W, TB_H, { width: 0.5, fill: '#ffffff' })
    const cell = (cx: number, cy: number, cw: number, ch: number, label: string, value?: string, size = 2.6, weight: Weight = 'bold') => {
      svg.rect(cx, cy, cw, ch, { width: 0.18 })
      svg.text(cx + 1.6, cy + 2.7, label.toUpperCase(), 1.45, { color: SOFT, weight: 'semi', spacing: 0.2 })
      if (value) svg.text(cx + 1.6, cy + ch - 2.1, value, size, { weight })
    }
    // 1. sor: gyártó + státusz.
    svg.rect(x, y, W, 14, { width: 0.18 })
    svg.text(x + 3, y + 7, meta.brand.toUpperCase(), 4.4, { weight: 'heavy', spacing: 0.5 })
    svg.text(x + 3, y + 11.2, meta.contact, 1.6, { color: MID })
    svg.rect(x + W - 34, y + 3, 31, 6.4, { stroke: 'none', fill: ACCENT })
    svg.text(x + W - 18.5, y + 7.25, 'TÁJÉKOZTATÓ TERV', 1.9, { weight: 'heavy', anchor: 'middle', color: '#ffffff', spacing: 0.25 })
    svg.text(x + W - 18.5, y + 12, 'felmérés után véglegesítendő', 1.45, { anchor: 'middle', color: MID })
    // 2. sor: megnevezés.
    cell(x, y + 14, W, 10, 'Megnevezés', meta.title, 2.5)
    // 3. sor: méretarány, mértékegység, dátum, lap.
    const q = W / 4
    cell(x, y + 24, q, 9, 'Méretarány', `M 1:${scale}`, 2.5)
    cell(x + q, y + 24, q, 9, 'Méretek', 'cm · szint m', 2.2)
    cell(x + 2 * q, y + 24, q, 9, 'Dátum', meta.date, 2.2)
    cell(x + 3 * q, y + 24, q, 9, 'Lap', meta.sheet ?? '1 / 1', 2.2)
    // 4. sor: rajzszám + tartalom.
    cell(x, y + 33, W * 0.55, 9, 'Rajzszám', meta.code, 2.3)
    cell(x + W * 0.55, y + 33, W * 0.45, 9, 'Tartalom', 'homlokzat · metszet · alaprajz', 1.95, 'semi')
    // 5. sor: tervezői aláírás és pecsét (üresen, a gyártó tervezője tölti ki).
    cell(x, y + 42, W * 0.62, 20, 'Tervező / ellenőrző — név, aláírás, kamarai szám')
    svg.line(x + 4, y + 42 + 15.5, x + W * 0.62 - 4, y + 42 + 15.5, 0.13, FAINT)
    cell(x + W * 0.62, y + 42, W * 0.38, 20, 'Pecsét')
  }
}
