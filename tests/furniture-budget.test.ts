import { describe, expect, it } from 'vitest'
import { planBudget } from '../src/lib/budget'
import { furnitureFit } from '../src/lib/furniture'
import { tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig } from '../src/types/pergola'

const base: PergolaConfig = { ...demoTenant.defaultConfig }
const limits = demoTenant.limits

describe('bútor helyigény', () => {
  it('5 × 4 m alatt a pihenősarok kényelmesen elfér', () => {
    expect(furnitureFit('lounge', { width: 5, depth: 4 }, limits)?.level).toBe('comfortable')
  })
  it('3 × 2,5 m alatt a 6 fős étkező nem kényelmes, és javasol nagyobb méretet', () => {
    const fit = furnitureFit('dining6', { width: 3, depth: 2.5 }, limits)!
    expect(fit.level).not.toBe('comfortable')
    expect(fit.suggestion).toEqual({ width: 3.2, depth: 2.6 })
    expect(furnitureFit('dining6', fit.suggestion!, limits)?.level).toBe('comfortable')
  })
  it('a pihenő + étkező csak elég hosszú pergolába fér; a javaslat a gyártói határon belül marad', () => {
    const fit = furnitureFit('combo', { width: 4, depth: 3 }, limits)!
    expect(fit.level).toBe('no')
    expect(fit.suggestion!.width).toBeLessThanOrEqual(limits.width[1])
    expect(furnitureFit('combo', fit.suggestion!, limits)?.level).toBe('comfortable')
  })
  it('elforgatva is számol (mély, keskeny pergola)', () => {
    expect(furnitureFit('dining6', { width: 2.7, depth: 3.3 }, limits)?.level).toBe('comfortable')
  })
})

describe('költségkeret', () => {
  const full: PergolaConfig = { ...base, roof: 'retractable', sides: { front: 'glass', back: 'none', left: 'glass', right: 'zip' }, heaters: 2, speakers: true, led: true, sensors: true }
  const price = (config: PergolaConfig) => tenantPrice(demoTenant, config).totalGross

  it('ha belefér, a maradékot adja vissza', () => {
    const result = planBudget(demoTenant, base, demoTenant.prices, price(base) + 500000)
    expect(result).toEqual({ status: 'fits', totalGross: price(base), remaining: 500000 })
  })

  it('minden javasolt terv a kereten belül van, és a valós árlistával számol', () => {
    const budget = Math.round(price(full) * 0.7)
    const result = planBudget(demoTenant, full, demoTenant.prices, budget)
    expect(result.status).toBe('plans')
    if (result.status !== 'plans') return
    expect(result.plans.length).toBeGreaterThan(0)
    for (const plan of result.plans) {
      expect(plan.totalGross).toBeLessThanOrEqual(budget)
      expect(plan.totalGross).toBe(price(plan.config))
      expect(plan.changes.length).toBeGreaterThan(0)
    }
  })

  it('a „méret megtartva” terv nem kicsinyít, a „felszereltség megtartva” nem vesz el felszerelést', () => {
    const budget = Math.round(price(full) * 0.8)
    const result = planBudget(demoTenant, full, demoTenant.prices, budget)
    if (result.status !== 'plans') throw new Error(result.status)
    const keepSize = result.plans.find((plan) => plan.id === 'keep-size')
    if (keepSize) expect([keepSize.config.width, keepSize.config.depth]).toEqual([full.width, full.depth])
    const keepEquipment = result.plans.find((plan) => plan.id === 'keep-equipment')
    if (keepEquipment) {
      expect(keepEquipment.config.sides).toEqual(full.sides)
      expect(keepEquipment.config.heaters).toBe(full.heaters)
      expect(keepEquipment.config.roof).toBe(full.roof)
    }
  })

  it('bútorcsomagnál nem kicsinyít a helyigény alá', () => {
    const budget = Math.round(price(full) * 0.5)
    const result = planBudget(demoTenant, full, demoTenant.prices, budget, 'dining8')
    if (result.status === 'plans') for (const plan of result.plans) expect(furnitureFit('dining8', plan.config, limits)?.level).not.toBe('no')
  })

  it('irreális keretnél megmondja a legkisebb elérhető árat', () => {
    const result = planBudget(demoTenant, full, demoTenant.prices, 500000)
    expect(result.status).toBe('impossible')
    if (result.status === 'impossible') expect(result.minimumGross).toBeGreaterThan(500000)
  })
})
