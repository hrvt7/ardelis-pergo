import { describe, expect, it } from 'vitest'
import { omittedPosts, openSides, postPositions, wallSides } from '../src/lib/mount'
import { getBom, getSpecCode } from '../src/lib/specification'
import { demoTenant } from '../src/tenants/demo'
import { normalizeConfig, tenantPrice } from '../src/tenants/rules'
import type { MountType, PergolaConfig } from '../src/types/pergola'

const config = (mount: MountType, patch: Partial<PergolaConfig> = {}): PergolaConfig => ({ ...demoTenant.defaultConfig, mount, ...patch })

describe('rögzítési módok', () => {
  it('oszlopszám módonként (5 m széles)', () => {
    expect(postPositions(config('freestanding'))).toHaveLength(4)
    expect(postPositions(config('wall'))).toHaveLength(2)
    expect(postPositions(config('corner-left'))).toHaveLength(1)
    expect(postPositions(config('corner-right'))).toHaveLength(1)
    expect(postPositions(config('niche'))).toHaveLength(0)
  })

  it('a sarokoszlop a nyitott oldalon áll', () => {
    const [[xLeftCorner]] = postPositions(config('corner-left'))
    const [[xRightCorner]] = postPositions(config('corner-right'))
    expect(xLeftCorner).toBeGreaterThan(0)
    expect(xRightCorner).toBeLessThan(0)
  })

  it('6 m feletti fesztávnál fülkében is van középoszlop', () => {
    expect(postPositions(config('niche', { width: 6.5 }))).toEqual([[0, 4 / 2 - 0.09]])
  })

  it('a falas oldalakra nem kerül oldalzárás az árba', () => {
    const withZipLeft = config('corner-left', { sides: { front: 'none', back: 'none', left: 'zip', right: 'none' } })
    const ids = tenantPrice(demoTenant, withZipLeft).lines.map((line) => line.id)
    expect(ids).not.toContain('side-left')
    expect(ids).toContain('wall-left')
    expect(openSides('corner-left')).toEqual(['front', 'right'])
  })

  it('sarokban a fali profil felár és az elmaradó oszlop jóváírás is megjelenik', () => {
    const lines = tenantPrice(demoTenant, config('corner-right', { sides: { front: 'none', back: 'none', left: 'none', right: 'none' } })).lines
    expect(lines.find((line) => line.id === 'wall-right')?.amountNet).toBe(96000)
    expect(lines.find((line) => line.id === 'posts-saved')?.amountNet).toBe(-65000)
    const niche = tenantPrice(demoTenant, config('niche')).lines
    expect(niche.filter((line) => line.id.startsWith('wall-'))).toHaveLength(2)
    expect(niche.find((line) => line.id === 'posts-saved')?.amountNet).toBe(-130000)
  })

  it('a falhoz csatlakozó és az önálló ár nem változott', () => {
    expect(tenantPrice(demoTenant, config('wall')).totalGross).toBe(5648000)
    expect(omittedPosts('wall')).toBe(0)
    expect(wallSides('freestanding')).toEqual([])
  })

  it('anyaglista és spec-kód tükrözi a rögzítést', () => {
    const bom = getBom(config('niche'))
    expect(bom.find((line) => line.label === 'Hordozó oszlop')?.value).toContain('nincs')
    expect(bom.find((line) => line.label === 'Oldalfali csatlakozó profil')?.value).toContain('bal')
    expect(getSpecCode(config('corner-left'))).toMatch(/-L-7016-0WWZ0$|-L-7016-/)
    expect(getSpecCode(config('corner-left', { sides: { front: 'zip', back: 'none', left: 'none', right: 'glass' } }))).toMatch(/-L-7016-ZWWG$/)
  })

  it('a gyártó által nem kínált rögzítést kiigazítja', () => {
    const limited = { ...demoTenant, mounts: ['wall', 'freestanding'] as MountType[] }
    expect(normalizeConfig(limited, config('niche')).mount).toBe('wall')
  })
})
