import { describe, expect, it } from 'vitest'
import { demoTenant } from '../src/tenants/demo'
import { sheetDrawing } from '../src/lib/pdfDocument'
import { drawingToDxf, drawingToDxfBytes, encodeCp1250, entitiesToDxf, pathPolylines, svgToEntities, type DxfEntity } from '../src/lib/dxf'

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">${body}</svg>`
const lines = (entities: DxfEntity[]) => entities.filter((e): e is Extract<DxfEntity, { kind: 'line' }> => e.kind === 'line')

describe('DXF-export a műszaki rajzból', () => {
  it('lap-mm × méretarány = valós mm, az y tengely felfelé mutat', () => {
    const [line] = lines(svgToEntities(svg('<line x1="10" y1="40" x2="20" y2="40" stroke="#141a19" stroke-width="0.5"/>'), 50, 50))
    expect(line.a).toEqual([500, 500])
    expect(line.b).toEqual([1000, 500])
    expect(line.layer).toBe('KONTUR')
  })

  it('téglalap 4 vonal, a fehér takarás és a puszta kitöltés kimarad, a szaggatott jelölve', () => {
    const entities = svgToEntities(svg('<rect x="0" y="0" width="10" height="5" fill="none" stroke="#4b5452" stroke-width="0.25" stroke-dasharray="1 1"/><line x1="0" y1="0" x2="5" y2="0" stroke="#ffffff" stroke-width="1"/><path d="M0 0 L5 5 Z" fill="#141a19" stroke="none" stroke-width="0"/>'), 50, 10)
    expect(lines(entities)).toHaveLength(4)
    expect(lines(entities).every((line) => line.dashed && line.layer === 'RESZLET')).toBe(true)
  })

  it('elforgatott csoport (lejtős tető a metszetben) a forgatással együtt kerül át', () => {
    const [line] = lines(svgToEntities(svg('<g transform="rotate(90 0 0)"><line x1="0" y1="0" x2="10" y2="0" stroke="#141a19" stroke-width="0.5"/></g>'), 0, 1))
    expect(line.b[0]).toBeCloseTo(0, 6)
    expect(line.b[1]).toBeCloseTo(-10, 6)
  })

  it('útvonal: egyenesek, zárás és görbe (12 szakasz)', () => {
    expect(pathPolylines('M0 0 L10 0 L10 10 Z')[0]).toEqual([[0, 0], [10, 0], [10, 10], [0, 0]])
    const [curve] = pathPolylines('M0 0 C0 10 10 10 10 0')
    expect(curve).toHaveLength(13)
    expect(curve[12]).toEqual([10, 0])
  })

  it('szöveg: igazítás, elforgatás és magyar betűk CP1250-ben', () => {
    const entities = svgToEntities(svg('<text x="10" y="10" font-family="Manrope" font-size="2" fill="#141a19" text-anchor="end" transform="rotate(-90 10 10)">tető hátsó éle &amp; ±0,00</text>'), 50, 10)
    const text = entities.find((e) => e.kind === 'text')!
    expect(text).toMatchObject({ value: 'tető hátsó éle & ±0,00', rotation: 90, align: 'end' })
    const dxf = entitiesToDxf(entities)
    expect(dxf).toContain('ANSI_1250')
    expect(dxf).toContain('AC1009')
    expect(Array.from(encodeCp1250('őű–·²'))).toEqual([0xf5, 0xfb, 0x96, 0xb7, 0x32])
  })

  it('valódi rajz: 5,00 m széles pergolán van 5000 mm hosszú vízszintes vonal; minden szakasz lezárt', () => {
    const config = { ...demoTenant.defaultConfig, width: 5, depth: 4 }
    const drawing = sheetDrawing(config, demoTenant, new Date('2026-11-15'))
    const entities = svgToEntities(drawing.svg, drawing.height, drawing.scale)
    expect(lines(entities).some((line) => Math.abs(Math.abs(line.b[0] - line.a[0]) - 5000) < 1 && Math.abs(line.b[1] - line.a[1]) < 0.01)).toBe(true)
    expect(entities.some((e) => e.kind === 'text' && e.value === 'ALAPRAJZ')).toBe(true)
    const dxf = drawingToDxf(drawing)
    expect(dxf.match(/\r\nSECTION\r\n/g)).toHaveLength(3)
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true)
    expect(drawingToDxfBytes(drawing).every((byte) => byte < 256)).toBe(true)
  })
})
