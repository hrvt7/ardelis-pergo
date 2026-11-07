import { describe, expect, it } from 'vitest'
import { bayBoundaries, bayWidth, hasCenterPost, middlePostCount, moduleCount } from '../src/lib/modules'
import { postPositions } from '../src/lib/mount'
import { calculatePrice, DEFAULT_PRICES } from '../src/lib/pricing'
import { compactToJson, configToCompact } from '../src/lib/shareCode'
import { getBom, getSpecCode } from '../src/lib/specification'
import { normalizeConfig } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig } from '../src/types/pergola'

const base: PergolaConfig = { ...normalizeConfig(demoTenant, demoTenant.defaultConfig as PergolaConfig), width: 10, depth: 4, height: 2.6, mount: 'freestanding', roof: 'louvered', modules: 2 }

describe('modulos pergola', () => {
  it('a mezőhatárok és a mezőszélesség a teljes szélességből adódik', () => {
    expect(moduleCount(base)).toBe(2)
    expect(bayWidth(base)).toBe(5)
    expect(bayBoundaries(base)).toEqual([0])
    expect(bayBoundaries({ width: 15, modules: 3 })).toEqual([-2.5, 2.5])
    expect(moduleCount({ modules: undefined })).toBe(1)
    expect(moduleCount({ modules: 9 })).toBe(4)
  })

  it('a mezőhatáron közös oszlop áll: szabadon állónál elöl-hátul, falhoz rögzítve csak elöl', () => {
    expect(postPositions(base)).toHaveLength(6)
    expect(postPositions({ ...base, mount: 'wall' })).toHaveLength(3)
    expect(postPositions({ ...base, mount: 'wall', width: 15, modules: 3 })).toHaveLength(4)
    // Egy mező: a régi viselkedés (7 m-nél középoszlop) változatlan.
    expect(postPositions({ ...base, width: 7, modules: undefined })).toHaveLength(5)
  })

  it('középső oszlop: páros modulszámnál a mezőhatár, különben csak 6 m feletti mezőnél', () => {
    expect(hasCenterPost(base)).toBe(true)
    expect(hasCenterPost({ width: 15, modules: 3 })).toBe(false)
    expect(hasCenterPost({ width: 7, modules: undefined })).toBe(true)
    expect(middlePostCount({ width: 21, modules: 3 })).toBe(3)
  })

  it('a gyártói szabály a mezőnkénti szélességet korlátozza, a modulszámot a gyártó maximuma', () => {
    const wide = normalizeConfig(demoTenant, { ...base, width: 20 })
    expect(wide.modules).toBe(2)
    expect(wide.width).toBe(14) // 2 × 7 m
    expect(normalizeConfig(demoTenant, { ...base, modules: 7 }).modules).toBe(4)
    expect(normalizeConfig(demoTenant, { ...base, modules: 1, width: 10 })).toMatchObject({ modules: undefined, width: 7 })
    const strict = { ...demoTenant, limits: { ...demoTenant.limits, maxModules: undefined } }
    expect(normalizeConfig(strict, base)).toMatchObject({ modules: undefined, width: 7 })
  })

  it('a megosztó kód megőrzi a modulszámot', () => {
    const code = configToCompact({ ...base, modules: 3, width: 15 })
    expect(code).toContain('n3')
    expect(compactToJson(code)).toMatchObject({ modules: 3, width: 15 })
    expect(compactToJson(configToCompact({ ...base, modules: undefined }))).not.toHaveProperty('modules')
  })

  it('ármátrixnál a mezőnkénti ár modulonként összeadódik, és a közös oszlopok külön tétel', () => {
    const prices = { ...DEFAULT_PRICES, priceMatrix: { louvered: [{ width: 5, depth: 4, netPrice: 1_000_000 }] } }
    const price = calculatePrice(base, prices)
    expect(price.lines.find((line) => line.id === 'structure')?.amountNet).toBe(2_000_000)
    expect(price.lines.find((line) => line.id === 'modules')?.amountNet).toBe(2 * DEFAULT_PRICES.postNet)
    expect(calculatePrice({ ...base, mount: 'wall' }, prices).lines.find((line) => line.id === 'modules')?.amountNet).toBe(DEFAULT_PRICES.postNet)
    expect(calculatePrice({ ...base, modules: undefined, width: 5 }, prices).lines.find((line) => line.id === 'modules')).toBeUndefined()
  })

  it('a specifikációs kód és az anyaglista jelzi a modulokat', () => {
    expect(getSpecCode(base)).toContain('-M2')
    const bom = getBom(base)
    expect(bom.find((line) => line.label === 'Összekapcsolt modulok')?.value).toContain('2 × 5,00 m')
    expect(bom.find((line) => line.label === 'Hordozó oszlop')?.value).toContain('2 db közös modul-oszlop')
    expect(bom.find((line) => line.label === 'Keretgerenda')?.value).toContain('modulgerenda')
  })
})
