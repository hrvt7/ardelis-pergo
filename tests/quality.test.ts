import { describe, expect, it } from 'vitest'
import { QUALITY_PROFILES, isTier, lowerTier, qualitySettings, resolveQualityTier, readTierCap, TIER_CAP_TTL_MS, writeTierCap } from '../src/lib/quality'

describe('3D minőségkezelő', () => {
  it('a felhasználó választása felülírja az automatikus besorolást; a régi „mobile” a low szint', () => {
    expect(resolveQualityTier('auto', 'medium')).toBe('medium')
    expect(resolveQualityTier('ultra', 'low')).toBe('ultra')
    expect(resolveQualityTier('mobile', 'high')).toBe('low')
  })
  it('a szintek monoton nőnek: árnyéktérkép, felbontás, szegmensszám, esőcseppek', () => {
    const tiers = (['low', 'medium', 'high', 'ultra'] as const).map(qualitySettings)
    for (let i = 1; i < tiers.length; i += 1) {
      expect(tiers[i].shadowMapSize).toBeGreaterThanOrEqual(tiers[i - 1].shadowMapSize)
      expect(tiers[i].dpr[1]).toBeGreaterThanOrEqual(tiers[i - 1].dpr[1])
      expect(tiers[i].louvreSegments).toBeGreaterThanOrEqual(tiers[i - 1].louvreSegments)
      expect(tiers[i].rainDrops).toBeGreaterThanOrEqual(tiers[i - 1].rainDrops)
    }
    // Mobilon (low/medium) nincs utófeldolgozás és nagy textúra.
    expect(QUALITY_PROFILES.low.enablePostprocessing).toBe(false)
    expect(QUALITY_PROFILES.medium.textureResolution).toBe('1k')
  })
  it('védőháló: eggyel lejjebb lép, a low alatt nincs szint', () => {
    expect(lowerTier('ultra')).toBe('high')
    expect(lowerTier('low')).toBe('low')
    expect(isTier('high')).toBe(true)
    expect(isTier('mobile')).toBe(false)
  })
})

describe('minőségi korlát (védőháló) lejárata', () => {
  it('a lejegyzett korlát 6 óráig él, utána törlődik', () => {
    const store = new Map<string, string>()
    const localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) }, removeItem: (k: string) => { store.delete(k) } }
    const location = { search: '' }
    Object.assign(globalThis, { window: { localStorage, location } })
    writeTierCap('medium', 1000)
    expect(readTierCap(1000 + TIER_CAP_TTL_MS - 1)).toBe('medium')
    expect(readTierCap(1000 + TIER_CAP_TTL_MS + 1)).toBeNull()
    expect(store.has('pergola-tier-cap')).toBe(false)
    writeTierCap('low', 5000)
    location.search = '?quality=ultra'
    expect(readTierCap(5001)).toBeNull()
  })
})
