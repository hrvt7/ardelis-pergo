import { describe, expect, it } from 'vitest'
import { FURNITURE_SETS, PACK_ORDER, furnitureFit, furnitureLayout, furnitureMinimum } from '../src/lib/furniture'
import { PACK_IDS, kitchenLength, kitchenModules, packPlan } from '../src/lib/usePacks'

const sizes = [{ width: 3, depth: 2.5 }, { width: 5, depth: 4 }, { width: 7, depth: 5 }, { width: 12, depth: 5 }, { width: 12, depth: 8 }]

describe('használati csomagok', () => {
  it('mindegyik csomag a kiválasztóban szerepel, leírással és felhasználói körrel', () => {
    expect([...PACK_ORDER].sort()).toEqual([...PACK_IDS].sort())
    for (const id of PACK_IDS) { expect(FURNITURE_SETS[id].pack?.audience.length).toBeGreaterThan(0); expect(furnitureMinimum(id)).toHaveLength(1) }
  })

  it('minden elem a belső területen belül marad, és a méret növekedésével a kapacitás nem csökken', () => {
    for (const id of PACK_IDS) {
      let previous = -1
      for (const size of [{ width: 5, depth: 4 }, { width: 7, depth: 5 }, { width: 10, depth: 6 }]) {
        const plan = packPlan(id, size)
        expect(plan.items.length).toBeGreaterThan(0)
        for (const item of plan.items) {
          const half = (item.length ?? 3) / 2
          expect(Math.abs(item.x) - half).toBeLessThan((size.width - 0.2) / 2 + 1e-6)
          expect(Math.abs(item.z)).toBeLessThan((size.depth - 0.2) / 2 + 1e-6)
        }
        expect(plan.seats).toBeGreaterThanOrEqual(previous)
        previous = plan.seats
      }
    }
  })

  it('az éttermi terasz tartja a vendéglátós irányértéket (kb. 1,1–1,4 m²/fő) kényelmes méreten', () => {
    const plan = packPlan('restaurant', { width: 12, depth: 5 })
    expect(plan.seats).toBeGreaterThanOrEqual(20)
    expect(plan.areaPerSeat!).toBeGreaterThanOrEqual(1.05)
    expect(plan.areaPerSeat!).toBeLessThanOrEqual(1.7)
  })

  it('a bankett sorai közt marad közlekedősáv (legalább 0,8 m a székek után)', () => {
    const plan = packPlan('banquet', { width: 8, depth: 5.4 })
    const rows = plan.items.map((item) => item.z).filter((z, i, all) => all.indexOf(z) === i).sort((a, b) => a - b)
    expect(rows.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < rows.length; i++) expect(rows[i] - rows[i - 1] - 1.8).toBeGreaterThanOrEqual(0.8 - 1e-6)
  })

  it('a konyhasor a hátsó fal mellett áll, hossza lépcsőzetes, a modulok kitöltik a hosszt', () => {
    for (const width of [3, 4.5, 7, 12]) {
      const length = kitchenLength(width - 0.2)
      expect(length).toBeGreaterThanOrEqual(2.4)
      expect(length).toBeLessThanOrEqual(4.8)
      const modules = kitchenModules(length)
      expect(modules.reduce((sum, module) => sum + module.width, 0)).toBeCloseTo(length, 1)
      expect(modules.some((module) => module.kind === 'grill')).toBe(true)
      expect(modules.some((module) => module.kind === 'sink')).toBe(true)
    }
    const plan = packPlan('summerKitchen', { width: 5, depth: 3 })
    const kitchen = plan.items.find((item) => item.kind === 'kitchen')!
    expect(kitchen.z).toBeLessThan(0)
  })

  it('szigetpult csak elég mély pergolán kerül be, kisebben megjegyzést kapunk', () => {
    expect(packPlan('summerKitchen', { width: 5, depth: 3 }).items.some((item) => item.kind === 'island')).toBe(false)
    expect(packPlan('summerKitchen', { width: 5, depth: 4.5 }).items.some((item) => item.kind === 'island')).toBe(true)
    expect(packPlan('summerKitchen', { width: 5, depth: 3 }).notes.join(' ')).toMatch(/szigetpult/i)
  })

  it('nyári konyha + étkező: az asztal nem lóg a konyhasorba', () => {
    const plan = packPlan('kitchenDining', { width: 6, depth: 5 })
    const kitchen = plan.items.find((item) => item.kind === 'kitchen')!
    for (const table of plan.items.filter((item) => item.kind !== 'kitchen')) expect(table.z - 1.2).toBeGreaterThanOrEqual(kitchen.z + 0.325 + 1.0 - 0.15)
    expect(plan.seats).toBeGreaterThanOrEqual(6)
  })

  it('a méretillesztés fix tájolású, és kis méreten nem „kényelmes”', () => {
    for (const id of PACK_IDS) {
      const small = furnitureFit(id, { width: 2.6, depth: 2 })!
      expect(small.level).not.toBe('comfortable')
      expect(small.alongWidth).toBe(true)
    }
    expect(furnitureFit('restaurant', { width: 7, depth: 5 })!.level).toBe('comfortable')
    for (const size of sizes) for (const id of PACK_IDS) expect(furnitureLayout(id, size)!.pack).toBeDefined()
  })
})
