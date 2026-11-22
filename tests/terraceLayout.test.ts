import { describe, expect, it } from 'vitest'
import { deckBounds } from '@/lib/deck'
import { gardenLayout, getHouseLayout, terraceLayout } from '@/lib/sceneLayout'
import type { PergolaConfig } from '@/types/pergola'

const sides = { front: 'open', back: 'open', left: 'open', right: 'open' } as unknown as PergolaConfig['sides']
const make = (mount: PergolaConfig['mount'], width = 5, depth = 4) => ({ width, depth, height: 2.6, mount, roof: 'louvered' as const, sides })

describe('kőterasz és ágyások a pergola körül', () => {
  it('a terasz a homlokzattól indul, a fa burkolatot teljesen magába foglalja, és a pergola elé nyúlik', () => {
    for (const mount of ['wall', 'freestanding'] as PergolaConfig['mount'][]) for (const style of ['classic', 'modern', 'gable'] as const) {
      const config = make(mount)
      const terrace = terraceLayout(config, style)
      const deck = deckBounds(config)
      expect(terrace.minZ).toBeCloseTo(getHouseLayout(config, style).frontZ + 0.02, 6)
      expect(terrace.minX).toBeLessThanOrEqual(deck.minX)
      expect(terrace.maxX).toBeGreaterThanOrEqual(deck.maxX)
      expect(terrace.maxZ).toBeGreaterThan(deck.maxZ)
    }
  })

  it('szabad oldalon ágyás van növényekkel, a terasz szélén kívül; a dézsák és az ültetőládák a teraszon állnak', () => {
    const config = make('wall')
    const terrace = terraceLayout(config, 'modern')
    expect(terrace.beds).toHaveLength(2)
    for (const bed of terrace.beds) {
      expect(bed.minX >= terrace.maxX || bed.maxX <= terrace.minX).toBe(true)
      expect(bed.items.length).toBeGreaterThanOrEqual(2)
      for (const item of bed.items) { expect(item.x).toBeGreaterThan(bed.minX); expect(item.x).toBeLessThan(bed.maxX); expect(item.z).toBeGreaterThan(bed.minZ - 0.11); expect(item.z).toBeLessThan(bed.maxZ + 0.11) }
    }
    const garden = gardenLayout(config, 'modern')
    for (const [x] of [...garden.pots, ...garden.planters]) { expect(x).toBeGreaterThan(terrace.minX); expect(x).toBeLessThan(terrace.maxX) }
  })

  it('falas oldalon nincs ágyás, a burkolat a fal síkjáig tart', () => {
    const mounts = ['wall', 'freestanding', 'corner-left', 'corner-right', 'niche'] as string[]
    let checked = 0
    for (const mount of mounts) {
      const config = make(mount as PergolaConfig['mount'])
      const terrace = terraceLayout(config, 'modern')
      const deck = deckBounds(config)
      if (deck.minX > -(config.width / 2 + 0.2)) { expect(terrace.minX).toBe(deck.minX); expect(terrace.beds.every((bed) => bed.minX > 0)).toBe(true); checked += 1 }
    }
    expect(checked).toBe(2)
  })

  it('a tűzrakó csak akkor kerül ki, ha a járda előtt elfér; az elrendezés determinisztikus', () => {
    expect(terraceLayout(make('wall', 5, 4), 'modern').firepit).not.toBeNull()
    expect(terraceLayout(make('wall', 5, 7), 'modern').firepit).toBeNull()
    expect(terraceLayout(make('wall'), 'modern')).toEqual(terraceLayout(make('wall'), 'modern'))
  })
})
