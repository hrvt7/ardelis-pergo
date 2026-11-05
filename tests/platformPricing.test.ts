import { describe, expect, it } from 'vitest'
import { estimateRoi, monthlyPrice, PLANS, SETUP_FEE } from '@/lib/platformPricing'

const pro = PLANS.find((plan) => plan.id === 'pro')!

describe('platformPricing', () => {
  it('éves fizetésnél 10 hónap díja oszlik el 12 hónapra', () => {
    expect(monthlyPrice(pro, false)).toBe(119_000)
    expect(monthlyPrice(pro, true)).toBe(99_000)
    expect(monthlyPrice(PLANS.find((plan) => plan.id === 'partner')!, true)).toBeNull()
  })

  it('a megtérülés az első év teljes költségével számol', () => {
    const roi = estimateRoi({ projectValue: 4_500_000, marginPct: 25, extraOrders: 6 }, pro, false)
    expect(roi.firstYearCost).toBe(SETUP_FEE + 119_000 * 12)
    expect(roi.marginPerOrder).toBeCloseTo((4_500_000 / 1.27) * 0.25, 0)
    expect(Math.ceil(roi.breakEvenOrders)).toBe(3)
    expect(roi.net).toBeGreaterThan(0)
  })

  it('a vevői funkciók nem csomagfüggők: az ármátrix már a Startban benne van', () => {
    expect(PLANS[0].features.some((feature) => feature.includes('ármátrix'))).toBe(true)
  })
})
