// Véletlen konfigurációk: minden kimenet (ár, link, kód, anyaglista, rajz, PDF, költségkeret)
// legyen véges, belsőleg következetes, és ne dobjon hibát.
import { describe, expect, it } from 'vitest'
import { planBudget } from '../src/lib/budget'
import { DEFAULT_USAGE, estimateEnergy } from '../src/lib/energy'
import { technicalDrawing } from '../src/lib/drawing'
import { MOUNT_TYPES } from '../src/lib/mount'
import { buildPdfDefinition } from '../src/lib/pdfDocument'
import { ROOF_TYPES } from '../src/lib/roofs'
import { compactToJson, configToCompact } from '../src/lib/shareCode'
import { closedSegments, SIDE_TYPES } from '../src/lib/sides'
import { createTextSummary, getBom, getSpecCode } from '../src/lib/specification'
import { normalizeConfig, parseConfig, tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig, SideKey, SideType } from '../src/types/pergola'

let seed = 20261029
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)]
const SIDES: SideKey[] = ['front', 'back', 'left', 'right']
const meta = { brand: 'T', contact: 'T', title: 'P', code: 'X', date: '2026. 10. 29.', notes: [] }

function randomConfig(): PergolaConfig {
  const side = () => pick(SIDE_TYPES) as SideType
  const split: Partial<Record<SideKey, SideType>> = {}
  for (const key of SIDES) if (rand() < 0.35) split[key] = side()
  return normalizeConfig(demoTenant, {
    ...demoTenant.defaultConfig,
    width: 2 + rand() * 6, depth: 2 + rand() * 4, height: 2 + rand() * 1.4,
    mount: pick(MOUNT_TYPES), roof: pick(ROOF_TYPES),
    sides: { front: side(), back: side(), left: side(), right: side() },
    split: Object.keys(split).length ? split : undefined,
    led: rand() < 0.5, ledRgb: rand() < 0.5, heaters: Math.floor(rand() * 5), speakers: rand() < 0.3, sensors: rand() < 0.5,
    fans: Math.floor(rand() * 3), smartHome: rand() < 0.4, solar: rand() < 0.5 ? true : undefined,
    louverAngle: Math.round(rand() * 90), screenOpen: Math.round(rand() * 100),
    frameColor: rand() < 0.2 ? 'custom' : 'anthracite', customRal: 'RAL 7035',
  })
}

describe('véletlen konfigurációk (300 db)', () => {
  const configs = Array.from({ length: 300 }, randomConfig)

  it('a normalizálás idempotens, a link oda-vissza azonos', () => {
    for (const config of configs) {
      expect(normalizeConfig(demoTenant, config)).toEqual(config)
      expect(parseConfig(demoTenant, compactToJson(configToCompact(config)))).toEqual(config)
      // Fali oldalon soha nincs osztás vagy fal.
      for (const segment of closedSegments(config)) expect(['front', 'back', 'left', 'right']).toContain(segment.side)
      if (config.ledRgb) expect(config.led).toBe(true)
    }
  })

  it('sérült vagy kézzel átírt link: nem dob hibát, érvényes konfigurációt ad', () => {
    const base = configToCompact(configs[0])
    const broken = [`${base}_v9`, `${base}_s....`, `${base}_sXYZW`, `${base}_v-r-h-`, `${base}__s`, base.replace(/_[^_]+$/, '_q'), '500_400', 'x'.repeat(300), `${base}_${'s'.repeat(40)}`]
    for (const code of broken) {
      expect(() => compactToJson(code)).not.toThrow()
      const parsed = parseConfig(demoTenant, compactToJson(code))
      if (parsed) expect(normalizeConfig(demoTenant, parsed)).toEqual(parsed)
    }
    expect(parseConfig(demoTenant, compactToJson('500_400_260_W_l_a_g00z_35_65_1_1_0_1__v9'))?.fans).toBe(2)
  })

  it('ár, energia, kód, anyaglista, szöveg: véges és hibamentes', () => {
    for (const config of configs) {
      const price = tenantPrice(demoTenant, config)
      expect(Number.isFinite(price.totalGross)).toBe(true)
      expect(price.lines.every((line) => Number.isFinite(line.amountNet) && !/NaN|undefined/.test(line.label + line.detail))).toBe(true)
      expect(Number.isFinite(estimateEnergy(config, DEFAULT_USAGE).cost)).toBe(true)
      expect(getSpecCode(config)).not.toMatch(/undefined|NaN/)
      expect(getBom(config).every((line) => !/undefined|NaN/.test(line.value))).toBe(true)
      expect(createTextSummary(config, price)).not.toMatch(/undefined|NaN/)
    }
  })

  it('rajz és PDF-definíció hibamentes', () => {
    for (const config of configs.slice(0, 120)) {
      const { svg } = technicalDrawing(config, meta)
      expect(svg).not.toMatch(/NaN|undefined|Infinity/)
      const price = tenantPrice(demoTenant, config)
      const definition = buildPdfDefinition({ config, price, tenant: demoTenant, shareUrl: 'https://x', date: new Date('2026-10-29') })
      expect(JSON.stringify(definition)).not.toMatch(/NaN|undefined/)
    }
  })

  it('költségkeret: a javaslat mindig belefér, és érvényes konfiguráció', () => {
    let slowest = 0
    for (const config of configs.slice(0, 40)) {
      const total = tenantPrice(demoTenant, config).totalGross
      const started = performance.now()
      const result = planBudget(demoTenant, config, demoTenant.prices, Math.round(total * 0.8))
      slowest = Math.max(slowest, performance.now() - started)
      if (result.status !== 'plans') continue
      for (const plan of result.plans) {
        expect(plan.totalGross).toBeLessThanOrEqual(Math.round(total * 0.8))
        expect(normalizeConfig(demoTenant, plan.config)).toEqual(plan.config)
        expect(plan.changes.join(' ')).not.toMatch(/undefined/)
      }
    }
    // A felületen gépelés közben fut: egy tervezés legyen gyors.
    console.log('leglassabb költségkeret-tervezés', Math.round(slowest), 'ms')
    expect(slowest).toBeLessThan(400)
  }, 60000)
})
