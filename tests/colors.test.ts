import { describe, expect, it } from 'vitest'
import { planBudget } from '../src/lib/budget'
import { COLOR_CATALOG, colorSummary, findColor, nearestColors, normalizeColorCode, searchColors } from '../src/lib/colors'
import { calculatePrice } from '../src/lib/pricing'
import { compactToJson, configToCompact } from '../src/lib/shareCode'
import { createTextSummary, getSpecCode } from '../src/lib/specification'
import { normalizeConfig, parseConfig, tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig } from '../src/types/pergola'

const base: PergolaConfig = { ...demoTenant.defaultConfig, width: 5, depth: 4, height: 2.6, roof: 'louvered' }
const prices = demoTenant.prices
const norm = (patch: Partial<PergolaConfig>) => normalizeConfig(demoTenant, { ...base, ...patch })

describe('színkatalógus', () => {
  it('egyedi kódok, érvényes hex, magyar név', () => {
    expect(new Set(COLOR_CATALOG.map((color) => color.code)).size).toBe(COLOR_CATALOG.length)
    for (const color of COLOR_CATALOG) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/)
      expect(color.name.length).toBeGreaterThan(2)
    }
    expect(COLOR_CATALOG.length).toBeGreaterThan(80)
  })

  it('kód egységesítés és keresés (ékezet nélkül is)', () => {
    expect(normalizeColorCode('ral7021')).toBe('RAL 7021')
    expect(normalizeColorCode(' 7016 ')).toBe('RAL 7016')
    expect(normalizeColorCode('db703')).toBe('DB 703')
    expect(normalizeColorCode('fa dio')).toBe('FA DIÓ')
    expect(normalizeColorCode('antracitszürke')).toBe('RAL 7016')
    expect(findColor('RAL 7035')?.name).toBe('Világosszürke')
    expect(searchColors('homok').map((color) => color.code)).toContain('RAL 1015')
    expect(searchColors('feher').map((color) => color.code)).toContain('RAL 9016')
    expect(searchColors('70', 'grey').every((color) => color.group === 'grey')).toBe(true)
    expect(searchColors('tolgy').every((color) => color.kind === 'wood')).toBe(true)
  })

  it('legközelebbi szín (pipetta)', () => {
    expect(nearestColors('#3a4044')[0].color.code).toBe('RAL 7016')
    expect(nearestColors('#2f4b3c')[0].color.code).toBe('RAL 6005')
    expect(nearestColors('#f2f1eb')[0].color.code).toMatch(/RAL 9016|RAL 9003/)
    expect(nearestColors('#5e3d26').every((match) => match.color.kind !== 'wood')).toBe(true)
  })
})

describe('szín a konfigurációban', () => {
  it('katalógusból választott alapszín felár nélküli alapszín lesz', () => {
    const config = norm({ frameColor: 'custom', customRal: 'ral 9016' })
    expect(config.frameColor).toBe('white')
    expect(config.customRal).toBeUndefined()
    expect(tenantPrice(demoTenant, config).totalGross).toBe(tenantPrice(demoTenant, { ...base, frameColor: 'white' }).totalGross)
  })

  it('egyedi és fa hatású felár; kéttónusú fele-fele', () => {
    const structure = 5 * 4 * prices.louveredPerM2Net
    const custom = calculatePrice(norm({ frameColor: 'custom', customRal: 'RAL 7021' }), prices).lines.find((line) => line.id === 'color')!
    expect(custom.amountNet).toBeCloseTo(structure * prices.customColorRate, -4)
    expect(custom.label).toContain('Feketésszürke (RAL 7021)')
    const wood = calculatePrice(norm({ frameColor: 'custom', customRal: 'FA DIÓ' }), prices).lines.find((line) => line.id === 'color')!
    expect(wood.amountNet).toBeCloseTo(structure * prices.woodColorRate, -4)
    expect(wood.label).toContain('Fa hatású bevonat')
    const twoTone = calculatePrice(norm({ frameColor: 'anthracite', roofColor: 'custom', roofRal: 'RAL 7035' }), prices)
    expect(twoTone.lines.find((line) => line.id === 'color')).toBeUndefined()
    expect(twoTone.lines.find((line) => line.id === 'color-roof')!.amountNet).toBeCloseTo(structure * 0.5 * prices.customColorRate, -4)
    // Két alapszín kombinációja felár nélküli.
    const standardPair = norm({ frameColor: 'anthracite', roofColor: 'white' })
    expect(standardPair.roofColor).toBe('white')
    expect(tenantPrice(demoTenant, standardPair).totalGross).toBe(tenantPrice(demoTenant, base).totalGross)
  })

  it('kéttónusú csak alumínium tetőnél, és a vázzal azonos szín nem kéttónusú', () => {
    expect(norm({ roof: 'glass', roofColor: 'white' }).roofColor).toBeUndefined()
    expect(norm({ roof: 'fixed', roofColor: 'white' }).roofColor).toBe('white')
    expect(norm({ frameColor: 'anthracite', roofColor: 'anthracite' }).roofColor).toBeUndefined()
    expect(norm({ frameColor: 'custom', customRal: 'RAL 7021', roofColor: 'custom', roofRal: '7021' }).roofColor).toBeUndefined()
    expect(normalizeConfig({ ...demoTenant, twoTone: false }, { ...base, roofColor: 'white' }).roofColor).toBeUndefined()
  })

  it('link, kód, összefoglaló', () => {
    for (const patch of [
      { frameColor: 'custom', customRal: 'FA DIÓ', roofColor: 'custom', roofRal: 'DB 703' },
      { frameColor: 'black', roofColor: 'custom', roofRal: 'RAL 7035' },
      { frameColor: 'custom', customRal: 'RAL 1234-X_Y.Z' },
    ] as Partial<PergolaConfig>[]) {
      const config = norm(patch)
      expect(parseConfig(demoTenant, compactToJson(configToCompact(config)))).toEqual(config)
    }
    const config = norm({ frameColor: 'custom', customRal: 'FA DIÓ', roofColor: 'white' })
    expect(getSpecCode(config)).toContain('-FADIO/9016-')
    expect(colorSummary(demoTenant, config)).toBe('váz: Dió (fa hatású) · lamellák: Fehér · RAL 9016')
    expect(createTextSummary(config, calculatePrice(config, prices), undefined, 'X', demoTenant)).toContain('Szín: váz: Dió (fa hatású)')
  })

  it('költségkeret: az egyedi tetőszínt is le tudja adni, és megnevezi', () => {
    const wish = norm({ frameColor: 'custom', customRal: 'FA DIÓ', roofColor: 'custom', roofRal: 'RAL 7035', led: true, heaters: 2 })
    const total = tenantPrice(demoTenant, wish).totalGross
    const result = planBudget(demoTenant, wish, prices, Math.round(total * 0.88))
    expect(result.status).toBe('plans')
    if (result.status !== 'plans') return
    expect(result.plans.some((plan) => plan.changes.some((change) => change.startsWith('Szín:')))).toBe(true)
  })
})
