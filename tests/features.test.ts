import { describe, expect, it } from 'vitest'
import { adviseConfig, ADVISOR_QUESTIONS, type AdvisorAnswers } from '../src/lib/advisor'
import { DEFAULT_USAGE, estimateEnergy, marginalCost, TARIFF } from '../src/lib/energy'
import { compactToJson, configToCompact } from '../src/lib/shareCode'
import { estimateSolar, panelLayout, PANEL } from '../src/lib/solar'
import { getBom, getSpecCode } from '../src/lib/specification'
import { normalizeConfig, parseConfig, tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig } from '../src/types/pergola'

const base: PergolaConfig = { ...demoTenant.defaultConfig, width: 5, depth: 4, height: 2.6 }

describe('üzemeltetési költség', () => {
  it('sávos határköltség: alatta, felette és átlépve', () => {
    expect(marginalCost(100, 1000).cost).toBeCloseTo(100 * TARIFF.below)
    expect(marginalCost(100, 3000).cost).toBeCloseTo(100 * TARIFF.above)
    expect(marginalCost(100, null).cost).toBeCloseTo(100 * TARIFF.above)
    const split = marginalCost(100, TARIFF.limit - 40)
    expect(split.band).toBe('split')
    expect(split.cost).toBeCloseTo(40 * TARIFF.below + 60 * TARIFF.above)
  })

  it('a kutatási példát adja: 2 kW-os fűtés + LED + lamellás tető ≈ 550 kWh, a fűtés dominál', () => {
    const config = { ...base, roof: 'louvered' as const, heaters: 2, led: true, sensors: true, speakers: false, sides: { front: 'none' as const, back: 'none' as const, left: 'zip' as const, right: 'none' as const } }
    const result = estimateEnergy(config, DEFAULT_USAGE, 2000)
    const heater = result.lines.find((line) => line.id === 'heaters')!
    expect(heater.kwh).toBeCloseTo(2 * 2 * 120)
    expect(result.kwh).toBeGreaterThan(500)
    expect(result.kwh).toBeLessThan(800)
    const motors = result.lines.find((line) => line.id === 'motors')!
    expect(motors.kwh).toBeLessThan(3)
    expect(result.cost).toBeCloseTo(result.kwh * TARIFF.above)
  })

  it('fogyasztó nélkül nincs költség, a falon lévő ZIP nem számít', () => {
    const none = estimateEnergy({ ...base, roof: 'fixed', led: false, heaters: 0, speakers: false, sensors: false, sides: { front: 'none', back: 'zip', left: 'none', right: 'none' }, mount: 'wall' })
    expect(none.hasElectrics).toBe(false)
    expect(none.cost).toBe(0)
  })
})

describe('napelemes tető', () => {
  it('a kiosztás elfér a tetőn, a teljesítmény a panelszámból jön', () => {
    for (const [width, depth] of [[2.5, 2.5], [4, 3], [5, 4], [7, 5]]) {
      const layout = panelLayout({ width, depth })
      expect(layout.kwp).toBeCloseTo((layout.count * PANEL.wp) / 1000)
      for (const [x, z] of layout.positions) {
        expect(Math.abs(x) + layout.size[0] / 2).toBeLessThanOrEqual(width / 2)
        expect(Math.abs(z) + layout.size[1] / 2).toBeLessThanOrEqual(depth / 2)
      }
    }
    expect(panelLayout({ width: 5, depth: 4 }).count).toBeGreaterThanOrEqual(6)
  })

  it('óvatos érték: ismeretlen háztartásnál a kedvezményes áron, a betáplálás ~5 Ft', () => {
    const result = estimateSolar({ width: 5, depth: 4 }, null, 0.3)
    expect(result.production).toBeCloseTo(result.layout.kwp * 900)
    expect(result.value).toBeCloseTo(result.selfUse * TARIFF.below + result.exported * TARIFF.feedIn)
    const above = estimateSolar({ width: 5, depth: 4 }, 5000, 0.3)
    expect(above.value).toBeGreaterThan(result.value)
  })

  it('csak fix tetőn és csak ott marad meg, ahol a gyártó kínálja', () => {
    expect(normalizeConfig(demoTenant, { ...base, roof: 'fixed', solar: true }).solar).toBe(true)
    expect(normalizeConfig(demoTenant, { ...base, roof: 'louvered', solar: true }).solar).toBeUndefined()
    const noSolar = { ...demoTenant, extras: { ...demoTenant.extras, solar: false } }
    expect(normalizeConfig(noSolar, { ...base, roof: 'fixed', solar: true }).solar).toBeUndefined()
  })

  it('ár, link, kód, anyaglista', () => {
    const config = normalizeConfig(demoTenant, { ...base, roof: 'fixed', solar: true })
    const price = tenantPrice(demoTenant, config)
    const line = price.lines.find((item) => item.id === 'solar')!
    expect(line.amountNet).toBe(Math.round((panelLayout(config).kwp * demoTenant.prices.solarPerKwpNet) / 1000) * 1000)
    expect(parseConfig(demoTenant, compactToJson(configToCompact(config)))).toEqual(config)
    const ral = normalizeConfig(demoTenant, { ...config, frameColor: 'custom', customRal: 'RAL 6005' })
    expect(parseConfig(demoTenant, compactToJson(configToCompact(ral)))).toEqual(ral)
    expect(compactToJson(configToCompact({ ...config, solar: undefined }))).not.toHaveProperty('solar')
    expect(getSpecCode(config)).toMatch(/-PV$/)
    expect(getBom(config).some((item) => item.label === 'Napelem modul')).toBe(true)
  })
})

describe('tanácsadó', () => {
  const all: AdvisorAnswers[] = []
  for (const use of ADVISOR_QUESTIONS.use.options) for (const weather of ADVISOR_QUESTIONS.weather.options) for (const light of ADVISOR_QUESTIONS.light.options) for (const place of ADVISOR_QUESTIONS.place.options) all.push({ use: use.id, weather: weather.id, light: light.id, place: place.id })

  it('minden válaszkombinációra érvényes, a gyártó kínálatán belüli konfiguráció', () => {
    expect(all.length).toBe(108)
    for (const answers of all) {
      const result = adviseConfig(demoTenant, answers)
      expect(normalizeConfig(demoTenant, result.config)).toEqual(result.config)
      expect(result.totalGross).toBe(tenantPrice(demoTenant, result.config).totalGross)
      expect(result.reasons.length).toBeGreaterThanOrEqual(3)
      if (result.alternative) expect(result.alternative.totalGross).toBeLessThan(result.totalGross)
    }
  })

  it('a válaszok értelmes irányba visznek', () => {
    expect(adviseConfig(demoTenant, { use: 'lounge', weather: 'sun', light: 'bright', place: 'wall' }).config.roof).toBe('glass')
    expect(adviseConfig(demoTenant, { use: 'lounge', weather: 'sun', light: 'shade', place: 'wall' }).config.roof).toBe('fixed')
    const season = adviseConfig(demoTenant, { use: 'party', weather: 'season', light: 'adjustable', place: 'garden' })
    expect(season.config.mount).toBe('freestanding')
    expect(season.config.heaters).toBeGreaterThan(0)
    expect(season.config.sides.front).toBe('glass')
    expect(season.config.width).toBeGreaterThanOrEqual(6)
    const corner = adviseConfig(demoTenant, { use: 'dining', weather: 'rain', light: 'adjustable', place: 'corner' })
    expect(corner.config.sides.left).toBe('none')
  })

  it('csak a gyártó tetőiből választ', () => {
    const limited = { ...demoTenant, roofs: { fixed: demoTenant.roofs.fixed } }
    expect(adviseConfig(limited, { use: 'lounge', weather: 'rain', light: 'adjustable', place: 'wall' }).config.roof).toBe('fixed')
  })
})
