import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { drawingLevels, SCALES, technicalDrawing } from '../src/lib/drawing'
import { MOUNT_TYPES } from '../src/lib/mount'
import { buildPdfDefinition, PDF_FONTS, PDF_SHEET } from '../src/lib/pdfDocument'
import { calculatePrice, ROOF_LABELS } from '../src/lib/pricing'
import { ROOF_TYPES } from '../src/lib/roofs'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig } from '../src/types/pergola'

const meta = { brand: 'TESZT', contact: 'Teszt Kft.', title: 'Pergola', code: 'PG-TEST', date: '2026. 10. 28.', notes: ['Méretek cm-ben.'] }
const base: PergolaConfig = { ...demoTenant.defaultConfig, width: 5, depth: 4, height: 2.6, mount: 'wall' }

describe('műszaki rajz', () => {
  it('a méretek a konfigurációból jönnek (cm), a szintek a gerendából', () => {
    const { svg } = technicalDrawing(base, meta)
    expect(svg).toContain('>500<')
    expect(svg).toContain('>400<')
    const levels = drawingLevels(base)
    expect(levels.beamBottom).toBeCloseTo(2.485)
    expect(svg).toContain('+2,49')
    expect(svg).toContain('±0,00')
  })

  it('minden rögzítésnél, tetőnél és szélső méretnél szabványos arányban elfér a lapon', () => {
    const { width: [wMin, wMax], depth: [dMin, dMax], height: [hMin, hMax] } = demoTenant.limits
    for (const mount of MOUNT_TYPES) for (const roof of ROOF_TYPES) for (const [width, depth, height] of [[wMin, dMin, hMin], [wMax, dMax, hMax], [6.2, 2.5, 3.2]]) {
      const result = technicalDrawing({ ...base, mount, roof, width, depth, height, sides: { front: 'glass', back: 'zip', left: 'louver', right: 'zip' } }, meta, PDF_SHEET.width, PDF_SHEET.height)
      expect(SCALES).toContain(result.scale)
      expect(result.scale).toBeLessThanOrEqual(75)
      expect(result.svg).not.toMatch(/NaN|undefined|Infinity/)
    }
  })

  it('a PDF felépül (4 oldal, a rajz fekvő lapon), a betűk beágyazva', async () => {
    const require = createRequire(import.meta.url)
    const pdfmake = require('pdfmake/js/index.js')
    const dir = new URL('../src/assets/pdf-fonts/', import.meta.url).pathname
    pdfmake.setFonts(Object.fromEntries(Object.entries(PDF_FONTS).map(([family, files]) => [family, Object.fromEntries(Object.entries(files).map(([style, file]) => [style, dir + file]))])))
    pdfmake.setUrlAccessPolicy(() => false)
    pdfmake.setLocalAccessPolicy(() => true)
    const price = calculatePrice(base, demoTenant.prices, ROOF_LABELS)
    const definition = buildPdfDefinition({ config: base, price, tenant: demoTenant, shareUrl: 'https://example.com/#c=1', date: new Date('2026-10-28') })
    const buffer: Buffer = await pdfmake.createPdf(definition).getBuffer()
    const text = buffer.toString('latin1')
    expect((text.match(/\/Type \/Page\b/g) ?? []).length).toBe(4)
    expect(text).toMatch(/\/MediaBox \[0 0 841\.89 595\.28\]/)
    expect(text).toContain('Manrope')
  }, 30000)
})
