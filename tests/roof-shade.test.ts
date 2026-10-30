import { describe, expect, it } from 'vitest'
import { planBudget } from '../src/lib/budget'
import { buildPdfDefinition } from '../src/lib/pdfDocument'
import { compactToJson, configToCompact } from '../src/lib/shareCode'
import { createTextSummary, getBom, getSpecCode } from '../src/lib/specification'
import { roofShadeArea, roofShadeSummary, supportsRoofShade } from '../src/lib/roofShade'
import { normalizeConfig, parseConfig, tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig } from '../src/types/pergola'

const open = { front: 'none', back: 'none', left: 'none', right: 'none' } as const
const glass: PergolaConfig = normalizeConfig(demoTenant, { ...demoTenant.defaultConfig, width: 5, depth: 4, height: 2.6, mount: 'wall', roof: 'glass', sides: { ...open }, led: false, heaters: 0, speakers: false, sensors: false })
const prices = demoTenant.prices

describe('motoros tetőárnyékoló', () => {
  it('csak üveg- és polikarbonát tetőhöz kérhető; tetőcserénél elmarad', () => {
    expect(supportsRoofShade('glass')).toBe(true)
    expect(supportsRoofShade('polycarbonate')).toBe(true)
    expect(supportsRoofShade('louvered')).toBe(false)
    const shaded = normalizeConfig(demoTenant, { ...glass, roofShade: 'above' })
    expect(shaded.roofShade).toBe('above')
    expect(shaded.shadeFabric).toBe('white')
    const louvered = normalizeConfig(demoTenant, { ...shaded, roof: 'louvered' })
    expect(louvered.roofShade).toBeUndefined()
    expect(louvered.shadeFabric).toBeUndefined()
    // Ha a gyártó nem kínálja, nem jelenik meg.
    const noShade = { ...demoTenant, extras: { ...demoTenant.extras, roofShade: false } }
    expect(normalizeConfig(noShade, shaded).roofShade).toBeUndefined()
  })

  it('ár: m²-enként, a tető feletti drágább; a teljes ár a telepítéssel és ÁFA-val együtt nő', () => {
    const base = tenantPrice(demoTenant, glass, prices)
    const above = tenantPrice(demoTenant, { ...glass, roofShade: 'above', shadeFabric: 'sand' }, prices)
    const below = tenantPrice(demoTenant, { ...glass, roofShade: 'below', shadeFabric: 'sand' }, prices)
    const line = above.lines.find((item) => item.id === 'roof-shade')!
    expect(line.amountNet).toBe(Math.round(roofShadeArea(glass) * prices.roofShadeAbovePerM2Net / 1000) * 1000)
    expect(line.label).toContain('Tető feletti')
    expect(line.detail).toContain('Homok ponyva')
    expect(above.totalGross).toBeGreaterThan(below.totalGross)
    expect(below.totalGross).toBeGreaterThan(base.totalGross)
  })

  it('a megosztó link oda-vissza megőrzi a típust és a ponyva színét', () => {
    for (const roofShade of ['above', 'below'] as const) for (const shadeFabric of ['white', 'sand', 'grey', 'anthracite'] as const) {
      const config = normalizeConfig(demoTenant, { ...glass, roofShade, shadeFabric })
      const back = parseConfig(demoTenant, compactToJson(configToCompact(config)))
      expect(back?.roofShade).toBe(roofShade)
      expect(back?.shadeFabric).toBe(shadeFabric)
    }
    // Ismeretlen ponyvaszín-kód: alapszín, nem érvénytelen link.
    const code = configToCompact(normalizeConfig(demoTenant, { ...glass, roofShade: 'below' })).replace(/bw/, 'bz')
    expect(parseConfig(demoTenant, compactToJson(code))?.shadeFabric).toBe('white')
  })

  it('specifikáció, anyaglista, szöveges összegzés és PDF', () => {
    const config = normalizeConfig(demoTenant, { ...glass, roofShade: 'above', shadeFabric: 'grey' })
    expect(getSpecCode(config)).toMatch(/-SA$/)
    expect(getBom(config).find((line) => line.label === 'Motoros tetőárnyékoló')?.value).toContain('szürke ponyva')
    expect(roofShadeSummary(config)).toBe('tető feletti motoros árnyékoló, szürke ponyva')
    expect(createTextSummary(config, tenantPrice(demoTenant, config, prices))).toContain('tető feletti motoros árnyékoló')
    const json = JSON.stringify(buildPdfDefinition({ config, price: tenantPrice(demoTenant, config, prices), tenant: demoTenant, date: new Date('2026-10-30') }).content)
    expect(json).toContain('Tetőárnyékoló')
  })

  it('a költségkeret-tervező előbb tető alattira vált, aztán elhagyja', () => {
    const config = normalizeConfig(demoTenant, { ...glass, roofShade: 'above' })
    const priceOf = (value: PergolaConfig) => tenantPrice(demoTenant, value, prices).totalGross
    const below = normalizeConfig(demoTenant, { ...config, roofShade: 'below' })
    const result = planBudget(demoTenant, config, prices, priceOf(below) + 1000)
    expect(result.status).not.toBe('fits')
    const plans = 'plans' in result ? result.plans : []
    expect(plans.some((plan) => plan.config.roofShade === 'below' || plan.config.roofShade === undefined)).toBe(true)
  })
})
