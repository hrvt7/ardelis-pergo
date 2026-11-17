import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { METALLIC_HEXES, powderCoatSpec } from '@/lib/powderCoat'
import { findColor } from '@/lib/colors'

describe('porszórt bevonat megjelenése', () => {
  it('a sima RAL-szín matt festék: alacsony fémesség, tompa csillanás, vékony lakk', () => {
    for (const detail of ['basic', 'enhanced', 'ultra'] as const) {
      const spec = powderCoatSpec(detail, 0.4)
      expect(spec.metalness).toBeLessThanOrEqual(0.25)
      expect(spec.roughness).toBeGreaterThanOrEqual(0.38)
      expect(spec.clearcoat).toBeLessThanOrEqual(0.12)
    }
  })

  it('a metál hatású szín fémesebb és fényesebb marad, mint a matt', () => {
    for (const detail of ['basic', 'enhanced', 'ultra'] as const) {
      const matt = powderCoatSpec(detail, 0.4)
      const metal = powderCoatSpec(detail, 0.4, true)
      expect(metal.metalness).toBeGreaterThan(matt.metalness)
      expect(metal.roughness).toBeLessThanOrEqual(matt.roughness)
    }
  })

  it('a metál készlet a katalógus metál színeit tartalmazza, az antracitot és a cortent nem', () => {
    expect(METALLIC_HEXES.has(findColor('DB 703')!.hex)).toBe(true)
    expect(METALLIC_HEXES.has(findColor('9006')!.hex)).toBe(true)
    expect(METALLIC_HEXES.has(findColor('7016')!.hex)).toBe(false)
    expect(METALLIC_HEXES.has(findColor('CORTEN')!.hex)).toBe(false)
  })

  it('gyenge eszközön nincs lakk és szemcse-normáltérkép (olcsó shader)', () => {
    expect(powderCoatSpec('basic', 0.4)).toMatchObject({ clearcoat: 0, grain: 0 })
  })

  it('a jelenet a közös bevonat-leírást használja', () => {
    const scene = readFileSync('src/components/PergolaScene.tsx', 'utf8')
    expect(scene).toContain('powderCoatSpec(detail, roughness, METALLIC_HEXES.has(color))')
    expect(scene).not.toMatch(/metalness: ultra \? 0\.62/)
  })
})
