// DXF-export a műszaki rajzlapból (drawing.ts SVG-je). A rajz egyetlen méretaránnyal készül, ezért a lap
// mm-koordinátáit a méretaránnyal felszorozva a nézetek geometriája valós mm-ben (1:1) kerül a DXF-be:
// egy CAD-programban lemérve a pergola valódi méreteit kapjuk. A lap többi eleme (szöveg, keret, szövegmező)
// ugyanígy felnagyítva szerepel, rétegekre bontva. Formátum: AutoCAD R12 ASCII DXF (minden CAD-program olvassa).
//
// Csak a drawing.ts által használt SVG-részhalmazt értelmezi: line, rect, circle, path (M/L/C/Z), text,
// <g transform="rotate(...)">. Fehér körvonal (takarás) és puszta kitöltés nem kerül a DXF-be.

export const DXF_LAYERS = {
  KONTUR: { color: 7, stroke: '#141a19' },
  RESZLET: { color: 8, stroke: '#4b5452' },
  SEGEDVONAL: { color: 9, stroke: '#8b9491' },
  HALVANY: { color: 254, stroke: '#c9cfcc' },
  KIEMELES: { color: 3, stroke: '#18322b' },
  SZOVEG: { color: 7, stroke: '' },
  EGYEB: { color: 7, stroke: '' },
} as const
export type DxfLayer = keyof typeof DXF_LAYERS

type Point = [number, number]
interface Segment { kind: 'line'; a: Point; b: Point; layer: DxfLayer; dashed: boolean }
interface Circle { kind: 'circle'; c: Point; r: number; layer: DxfLayer; dashed: boolean }
interface Text { kind: 'text'; p: Point; height: number; value: string; rotation: number; align: 'start' | 'middle' | 'end' }
export type DxfEntity = Segment | Circle | Text

type Rotation = { angle: number; cx: number; cy: number }

const attr = (tag: string, name: string) => {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag)
  return match ? match[1] : undefined
}
const num = (tag: string, name: string) => Number(attr(tag, name) ?? 0)
const unescapeXml = (text: string) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')

function layerFor(stroke: string | undefined): DxfLayer | null {
  if (!stroke || stroke === 'none') return null
  const value = stroke.toLowerCase()
  if (value === '#ffffff' || value === '#fff' || value === 'white') return null
  for (const [name, layer] of Object.entries(DXF_LAYERS)) if (layer.stroke && layer.stroke === value) return name as DxfLayer
  return 'EGYEB'
}

function rotatePoint([x, y]: Point, stack: Rotation[]): Point {
  let px = x
  let py = y
  for (let i = stack.length - 1; i >= 0; i--) {
    const { angle, cx, cy } = stack[i]
    const a = (angle * Math.PI) / 180
    const dx = px - cx
    const dy = py - cy
    px = cx + dx * Math.cos(a) - dy * Math.sin(a)
    py = cy + dx * Math.sin(a) + dy * Math.cos(a)
  }
  return [px, py]
}

function parseRotate(value: string | undefined): Rotation | null {
  const match = value && /rotate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+))?\s*\)/.exec(value)
  return match ? { angle: Number(match[1]), cx: Number(match[2] ?? 0), cy: Number(match[3] ?? 0) } : null
}

/** Az SVG útvonal (M, L, C, Z – abszolút) törött vonalakra bontva; a görbék 12 szakaszra osztva. */
export function pathPolylines(d: string): Point[][] {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []
  const lines: Point[][] = []
  let current: Point[] = []
  let start: Point | null = null
  let command = ''
  let i = 0
  const take = () => Number(tokens[i++])
  while (i < tokens.length) {
    if (/^[MLCZ]$/i.test(tokens[i])) command = tokens[i++].toUpperCase()
    if (command === 'M') {
      if (current.length > 1) lines.push(current)
      const p: Point = [take(), take()]
      current = [p]
      start = p
      command = 'L'
    } else if (command === 'L') {
      current.push([take(), take()])
    } else if (command === 'C') {
      const p0 = current[current.length - 1] ?? [0, 0]
      const p1: Point = [take(), take()]
      const p2: Point = [take(), take()]
      const p3: Point = [take(), take()]
      for (let s = 1; s <= 12; s++) {
        const t = s / 12
        const u = 1 - t
        current.push([
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ])
      }
    } else if (command === 'Z') {
      if (start && current.length) current.push(start)
      if (current.length > 1) lines.push(current)
      current = []
      command = ''
    } else {
      i++
    }
  }
  if (current.length > 1) lines.push(current)
  return lines
}

/** A rajz SVG-jének elemei DXF-entitásokként, valós mm-ben (y felfelé). */
export function svgToEntities(svg: string, sheetHeight: number, scale: number): DxfEntity[] {
  const entities: DxfEntity[] = []
  const stack: Rotation[] = []
  const toWorld = (p: Point): Point => {
    const [x, y] = rotatePoint(p, stack)
    return [x * scale, (sheetHeight - y) * scale]
  }
  const polyline = (points: Point[], layer: DxfLayer, dashed: boolean) => {
    for (let k = 1; k < points.length; k++) {
      const a = toWorld(points[k - 1])
      const b = toWorld(points[k])
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-6) entities.push({ kind: 'line', a, b, layer, dashed })
    }
  }
  const pattern = /<(\/?)(line|rect|circle|path|text|g)\b([^>]*)>(?:([^<]*)<\/text>)?/g
  for (let match = pattern.exec(svg); match; match = pattern.exec(svg)) {
    const [, closing, name, rest, content] = match
    const tag = ` ${rest}`
    if (name === 'g') {
      if (closing) stack.pop()
      else stack.push(parseRotate(attr(tag, 'transform')) ?? { angle: 0, cx: 0, cy: 0 })
      continue
    }
    if (closing) continue
    const dashed = Boolean(attr(tag, 'stroke-dasharray'))
    if (name === 'text') {
      const x = num(tag, 'x')
      const y = num(tag, 'y')
      const ownRotation = parseRotate(attr(tag, 'transform'))?.angle ?? 0
      const groupRotation = stack.reduce((sum, item) => sum + item.angle, 0)
      const value = unescapeXml(content ?? '').trim()
      if (!value) continue
      const anchor = attr(tag, 'text-anchor')
      entities.push({ kind: 'text', p: toWorld([x, y]), height: num(tag, 'font-size') * 0.72 * scale, value, rotation: -(ownRotation + groupRotation), align: anchor === 'middle' ? 'middle' : anchor === 'end' ? 'end' : 'start' })
      continue
    }
    const layer = layerFor(attr(tag, 'stroke'))
    if (!layer) continue
    if (name === 'line') polyline([[num(tag, 'x1'), num(tag, 'y1')], [num(tag, 'x2'), num(tag, 'y2')]], layer, dashed)
    else if (name === 'rect') {
      const x = num(tag, 'x'); const y = num(tag, 'y'); const w = num(tag, 'width'); const h = num(tag, 'height')
      if (w > 0 || h > 0) polyline([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], layer, dashed)
    } else if (name === 'circle') {
      entities.push({ kind: 'circle', c: toWorld([num(tag, 'cx'), num(tag, 'cy')]), r: num(tag, 'r') * scale, layer, dashed })
    } else if (name === 'path') {
      for (const points of pathPolylines(attr(tag, 'd') ?? '')) polyline(points, layer, dashed)
    }
  }
  return entities
}

/** Egysoros DXF-szöveg (sortörés nélkül). A kódolást a `encodeCp1250` végzi. */
export const dxfText = (text: string) => text.replace(/[\r\n]+/g, ' ')

// R12 DXF: a szöveg a fejlécben megadott kódlapon ($DWGCODEPAGE = ANSI_1250, közép-európai). Így az ő/ű és a többi
// magyar betű minden CAD-programban (AutoCAD, LibreCAD, BricsCAD, DWG TrueView) helyesen jelenik meg.
const CP1250: Record<string, number> = {
  '€': 0x80, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97,
  '§': 0xa7, '°': 0xb0, '±': 0xb1, 'µ': 0xb5, '·': 0xb7, '×': 0xd7, '÷': 0xf7, 'ß': 0xdf,
  'Á': 0xc1, 'Ä': 0xc4, 'É': 0xc9, 'Í': 0xcd, 'Ó': 0xd3, 'Ő': 0xd5, 'Ö': 0xd6, 'Ú': 0xda, 'Ű': 0xdb, 'Ü': 0xdc,
  'á': 0xe1, 'ä': 0xe4, 'é': 0xe9, 'í': 0xed, 'ó': 0xf3, 'ő': 0xf5, 'ö': 0xf6, 'ú': 0xfa, 'ű': 0xfb, 'ü': 0xfc,
}
const FALLBACK: Record<string, string> = { '²': '2', '³': '3', '−': '-', '→': '->', '≈': '~', '\u00a0': ' ', '\u202f': ' ' }

/** A DXF-szöveg CP1250 bájtokká; amit a kódlap nem ismer, ASCII-megfelelőt vagy „?”-et kap. */
export function encodeCp1250(text: string): Uint8Array {
  const bytes: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code < 128) bytes.push(code)
    else if (CP1250[ch] !== undefined) bytes.push(CP1250[ch])
    else for (const c of FALLBACK[ch] ?? '?') bytes.push(c.charCodeAt(0))
  }
  return Uint8Array.from(bytes)
}

const f = (n: number) => (Math.round(n * 1000) / 1000).toString()

/** Teljes R12 DXF-fájl (mm), Unicode-szövegként; letöltéshez `encodeCp1250`. */
export function entitiesToDxf(entities: DxfEntity[]): string {
  const out: (string | number)[] = []
  const pair = (code: number, value: string | number) => { out.push(code, value) }
  const xs = entities.flatMap((e) => (e.kind === 'line' ? [e.a[0], e.b[0]] : e.kind === 'circle' ? [e.c[0] - e.r, e.c[0] + e.r] : [e.p[0]]))
  const ys = entities.flatMap((e) => (e.kind === 'line' ? [e.a[1], e.b[1]] : e.kind === 'circle' ? [e.c[1] - e.r, e.c[1] + e.r] : [e.p[1]]))
  const min = [Math.min(0, ...xs), Math.min(0, ...ys)]
  const max = [Math.max(0, ...xs), Math.max(0, ...ys)]

  pair(0, 'SECTION'); pair(2, 'HEADER')
  pair(9, '$ACADVER'); pair(1, 'AC1009')
  pair(9, '$DWGCODEPAGE'); pair(3, 'ANSI_1250')
  pair(9, '$INSUNITS'); pair(70, 4)
  pair(9, '$MEASUREMENT'); pair(70, 1)
  pair(9, '$EXTMIN'); pair(10, f(min[0])); pair(20, f(min[1])); pair(30, 0)
  pair(9, '$EXTMAX'); pair(10, f(max[0])); pair(20, f(max[1])); pair(30, 0)
  pair(0, 'ENDSEC')

  pair(0, 'SECTION'); pair(2, 'TABLES')
  pair(0, 'TABLE'); pair(2, 'LTYPE'); pair(70, 2)
  pair(0, 'LTYPE'); pair(2, 'CONTINUOUS'); pair(70, 0); pair(3, 'Solid line'); pair(72, 65); pair(73, 0); pair(40, 0)
  pair(0, 'LTYPE'); pair(2, 'DASHED'); pair(70, 0); pair(3, '__ __ __'); pair(72, 65); pair(73, 2); pair(40, 300); pair(49, 200); pair(49, -100)
  pair(0, 'ENDTAB')
  const layers = Object.entries(DXF_LAYERS)
  pair(0, 'TABLE'); pair(2, 'LAYER'); pair(70, layers.length + 1)
  pair(0, 'LAYER'); pair(2, '0'); pair(70, 0); pair(62, 7); pair(6, 'CONTINUOUS')
  for (const [name, layer] of layers) { pair(0, 'LAYER'); pair(2, name); pair(70, 0); pair(62, layer.color); pair(6, 'CONTINUOUS') }
  pair(0, 'ENDTAB')
  pair(0, 'TABLE'); pair(2, 'STYLE'); pair(70, 1)
  pair(0, 'STYLE'); pair(2, 'STANDARD'); pair(70, 0); pair(40, 0); pair(41, 1); pair(50, 0); pair(71, 0); pair(42, 2.5); pair(3, 'txt'); pair(4, '')
  pair(0, 'ENDTAB')
  pair(0, 'ENDSEC')

  pair(0, 'SECTION'); pair(2, 'ENTITIES')
  for (const entity of entities) {
    if (entity.kind === 'line') {
      pair(0, 'LINE'); pair(8, entity.layer); if (entity.dashed) pair(6, 'DASHED')
      pair(10, f(entity.a[0])); pair(20, f(entity.a[1])); pair(30, 0); pair(11, f(entity.b[0])); pair(21, f(entity.b[1])); pair(31, 0)
    } else if (entity.kind === 'circle') {
      pair(0, 'CIRCLE'); pair(8, entity.layer); if (entity.dashed) pair(6, 'DASHED')
      pair(10, f(entity.c[0])); pair(20, f(entity.c[1])); pair(30, 0); pair(40, f(entity.r))
    } else {
      pair(0, 'TEXT'); pair(8, 'SZOVEG')
      pair(10, f(entity.p[0])); pair(20, f(entity.p[1])); pair(30, 0); pair(40, f(entity.height)); pair(1, dxfText(entity.value))
      if (Math.abs(entity.rotation) > 1e-6) pair(50, f(entity.rotation))
      if (entity.align !== 'start') { pair(72, entity.align === 'middle' ? 1 : 2); pair(11, f(entity.p[0])); pair(21, f(entity.p[1])); pair(31, 0) }
    }
  }
  pair(0, 'ENDSEC'); pair(0, 'EOF')
  return `${out.join('\r\n')}\r\n`
}

/** A műszaki rajzlap DXF-ként (valós mm-ben): szöveg, illetve a letölthető bájtok (CP1250). */
export function drawingToDxf(drawing: { svg: string; height: number; scale: number }): string {
  return entitiesToDxf(svgToEntities(drawing.svg, drawing.height, drawing.scale))
}
export const drawingToDxfBytes = (drawing: { svg: string; height: number; scale: number }) => encodeCp1250(drawingToDxf(drawing))
