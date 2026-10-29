import { describe, expect, it } from 'vitest'
import { planBudget } from '../src/lib/budget'
import { DEFAULT_USAGE, estimateEnergy } from '../src/lib/energy'
import { fanLayout } from '../src/lib/fans'
import { technicalDrawing } from '../src/lib/drawing'
import { calculatePrice } from '../src/lib/pricing'
import { compactToJson, configToCompact } from '../src/lib/shareCode'
import { closedSegments, SIDE_INFO, SIDE_TYPES, sideSegments, sideSummary, splitProfiles } from '../src/lib/sides'
import { createTextSummary, getBom, getSpecCode } from '../src/lib/specification'
import { normalizeConfig, parseConfig, tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig } from '../src/types/pergola'

const open = { front: 'none', back: 'none', left: 'none', right: 'none' } as const
const base: PergolaConfig = { ...demoTenant.defaultConfig, width: 5, depth: 4, height: 2.6, mount: 'wall', sides: { ...open }, led: false, heaters: 0, speakers: false, sensors: false }
const prices = demoTenant.prices
const meta = { brand: 'TESZT', contact: 'Teszt Kft.', title: 'Pergola', code: 'PG-TEST', date: '2026. 10. 29.', notes: [] }

describe('oldalfal-típusok', () => {
  it('minden típusnak egyedi kódja és (a nyitott kivételével) ára van', () => {
    expect(new Set(SIDE_TYPES.map((type) => SIDE_INFO[type].share)).size).toBe(SIDE_TYPES.length)
    expect(new Set(SIDE_TYPES.map((type) => SIDE_INFO[type].spec)).size).toBe(SIDE_TYPES.length)
    for (const type of SIDE_TYPES.filter((item) => item !== 'none')) {
      const price = calculatePrice({ ...base, sides: { ...open, front: type } }, prices)
      const line = price.lines.find((item) => item.id === 'side-front')!
      expect(line.amountNet).toBeCloseTo(5 * 2.6 * (prices[SIDE_INFO[type].priceKey!] as number), -4)
    }
  })

  it('árrend: keret nélküli üveg > keretes > fix üveg > lamella > alu léc > fa léc', () => {
    const net = (type: (typeof SIDE_TYPES)[number]) => calculatePrice({ ...base, sides: { ...open, front: type } }, prices).totalGross
    expect(net('glass')).toBeGreaterThan(net('glassFramed'))
    expect(net('glassFramed')).toBeGreaterThan(net('glassFixed'))
    expect(net('glassFixed')).toBeGreaterThan(net('louver'))
    expect(net('louver')).toBeGreaterThan(net('slatAlu'))
    expect(net('slatAlu')).toBeGreaterThan(net('slatWood'))
  })
})

describe('félbe osztott oldal', () => {
  const split: PergolaConfig = { ...base, sides: { ...open, front: 'glass', left: 'slatWood' }, split: { front: 'zip', left: 'none' } }

  it('szegmensek, összefoglaló, osztóprofil', () => {
    expect(sideSegments(split, 'front').map((segment) => segment.type)).toEqual(['glass', 'zip'])
    expect(sideSummary(split, 'front')).toBe('bal fél: Tolóüveg · jobb fél: ZIP screen')
    expect(sideSummary(split, 'left')).toBe('elülső fél: Fa lécfal · hátsó fél: Nyitott')
    expect(closedSegments(split).map((segment) => segment.length)).toEqual([2.5, 2.5, 2])
    expect(splitProfiles(split)).toBe(2)
    // 6 m felett elöl középoszlop áll: ott nem kell osztóprofil.
    expect(splitProfiles({ ...split, width: 6.5 })).toBe(1)
  })

  it('ár felenként, osztóprofillal', () => {
    const price = calculatePrice(split, prices)
    expect(price.lines.find((line) => line.id === 'side-front-0')!.amountNet).toBeCloseTo(2.5 * 2.6 * prices.glassPerM2Net, -4)
    expect(price.lines.find((line) => line.id === 'side-front-1')!.amountNet).toBeCloseTo(2.5 * 2.6 * prices.zipPerM2Net, -4)
    expect(price.lines.find((line) => line.id === 'side-left-0')!.label).toBe('Bal oldal, elülső fél · Fa lécfal')
    expect(price.lines.find((line) => line.id === 'split-profiles')!.amountNet).toBe(2 * prices.splitProfileNet)
  })

  it('fali oldalon nem osztható, a gyártó által nem kínált típus kiesik', () => {
    const normalized = normalizeConfig(demoTenant, { ...base, split: { back: 'glass', front: 'zip' } })
    expect(normalized.split).toEqual({ front: 'zip' })
    const limited = normalizeConfig({ ...demoTenant, sides: ['zip'] }, { ...base, split: { front: 'slatWood' } })
    expect(limited.split).toEqual({ front: 'none' })
  })

  it('link oda-vissza, a régi linkek változatlanok', () => {
    const config = normalizeConfig(demoTenant, { ...split, solar: undefined, ledRgb: true, led: true, fans: 2, smartHome: true })
    const code = configToCompact(config)
    expect(code).toMatch(/_r-v2-h-sz\.0\.$/)
    expect(parseConfig(demoTenant, compactToJson(code))).toEqual(config)
    expect(configToCompact(base)).not.toContain('-')
  })

  it('kód, anyaglista, szöveges összefoglaló, rajz', () => {
    expect(getSpecCode(split)).toContain('-(G/Z)W(W/0)0')
    const bom = getBom(split)
    expect(bom.find((line) => line.label === 'Fa lécfal (hőkezelt)')!.value).toContain('2,00 m')
    expect(bom.find((line) => line.label === 'ZIP screen kazetta')!.value).toBe('1 db')
    expect(bom.find((line) => line.label.startsWith('Osztóprofil'))!.value).toContain('2 db')
    expect(createTextSummary(split, calculatePrice(split, prices))).toContain('bal fél: Tolóüveg · jobb fél: ZIP screen')
    const { svg } = technicalDrawing(split, meta)
    expect(svg).toContain('fa lécfal')
    expect(svg).toContain('ZIP screen')
    expect(svg).toContain('tolóüveg')
  })
})

describe('komfort-opciók', () => {
  it('RGB csak LED-del, ventilátor 0–2, okosotthon — a gyártó kínálata szerint', () => {
    expect(normalizeConfig(demoTenant, { ...base, ledRgb: true }).ledRgb).toBeUndefined()
    expect(normalizeConfig(demoTenant, { ...base, led: true, ledRgb: true }).ledRgb).toBe(true)
    expect(normalizeConfig(demoTenant, { ...base, fans: 4 }).fans).toBe(2)
    expect(normalizeConfig({ ...demoTenant, extras: { ...demoTenant.extras, fans: false, smartHome: false } }, { ...base, fans: 1, smartHome: true })).toMatchObject({ fans: undefined, smartHome: undefined })
  })

  it('ártételek', () => {
    const price = calculatePrice({ ...base, led: true, ledRgb: true, fans: 2, smartHome: true }, prices)
    expect(price.lines.find((line) => line.id === 'led-rgb')!.amountNet).toBeCloseTo(18 * prices.ledRgbPerMeterNet, -4)
    expect(price.lines.find((line) => line.id === 'fans')!.amountNet).toBe(2 * prices.fanUnitNet)
    expect(price.lines.find((line) => line.id === 'smart-home')!.amountNet).toBe(prices.smartHomeNet)
    // Az alap konfiguráció ára nem változik.
    expect(tenantPrice(demoTenant, demoTenant.defaultConfig, prices).totalGross).toBe(5648000)
  })

  it('energia: ventilátor nyári estéken, okosotthon készenléte, RGB több áramot kér', () => {
    const fan = estimateEnergy({ ...base, fans: 1 }, DEFAULT_USAGE)
    expect(fan.lines.find((line) => line.id === 'fans')!.kwh).toBeCloseTo((35 * 3 * 92) / 1000)
    const standby = (config: PergolaConfig) => estimateEnergy(config, DEFAULT_USAGE).lines.find((line) => line.id === 'standby')?.kwh ?? 0
    expect(standby({ ...base, smartHome: true }) - standby(base)).toBeCloseTo((0.9 * 8760) / 1000)
    const white = estimateEnergy({ ...base, led: true }, DEFAULT_USAGE).kwh
    const rgb = estimateEnergy({ ...base, led: true, ledRgb: true }, DEFAULT_USAGE).kwh
    expect(rgb).toBeGreaterThan(white)
    // A félbe osztott oldal ZIP-je is motor.
    const zip = estimateEnergy({ ...base, sides: { ...open, front: 'glass' }, split: { front: 'zip' } }, DEFAULT_USAGE)
    expect(zip.lines.find((line) => line.id === 'motors')!.detail).toContain('1 ZIP')
  })

  it('ventilátorok elhelyezése és a rajz', () => {
    expect(fanLayout({ width: 5, depth: 4, fans: 2 }).positions).toEqual([[-1.25, 0], [1.25, 0]])
    expect(fanLayout({ width: 3.5, depth: 4.5, fans: 2 }).positions).toEqual([[0, -1.125], [0, 1.125]])
    expect(technicalDrawing({ ...base, fans: 1 }, meta).svg).toContain('ventilátor Ø132')
    expect(getSpecCode({ ...base, fans: 2, smartHome: true, led: true, ledRgb: true })).toMatch(/-SH-F2-RGB$/)
  })

  it('költségkeret: a komfort-opciókat és a fél oldalakat is le tudja adni', () => {
    const wish: PergolaConfig = normalizeConfig(demoTenant, { ...base, sides: { ...open, front: 'glass', left: 'slatAlu' }, split: { front: 'glassFixed' }, led: true, ledRgb: true, fans: 2, smartHome: true })
    const total = tenantPrice(demoTenant, wish, prices).totalGross
    const result = planBudget(demoTenant, wish, prices, Math.round(total * 0.85))
    expect(result.status).toBe('plans')
    if (result.status !== 'plans') return
    for (const plan of result.plans) {
      expect(plan.totalGross).toBeLessThanOrEqual(Math.round(total * 0.85))
      expect(plan.changes.length).toBeGreaterThan(0)
    }
  })
})
