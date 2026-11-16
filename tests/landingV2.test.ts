import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { getTenant } from '../src/tenants'
import { calculatePrice } from '../src/lib/pricing'
import { BUILD_FRAMES, BUILD_PRICES, frameAt, stepAt } from '../src/components/landing/buildData'
import { PLATFORM_COPY } from '../src/i18n/platformCopy'

const read = (path: string) => readFileSync(path, 'utf8')

describe('nyitóoldal v2 – „az asztalon a termék”', () => {
  it('a „Hét lépés” árai a valódi árazó motorból jönnek (demó gyártó, lépésenként felépítve)', () => {
    const tenant = getTenant('demo')!
    const c = tenant.defaultConfig
    const roofOnly = calculatePrice({ ...c, sides: { front: 'none', back: 'none', left: 'none', right: 'none' }, led: false, sensors: false }, tenant.prices).totalGross
    const withSides = calculatePrice({ ...c, led: false, sensors: false }, tenant.prices).totalGross
    const full = calculatePrice(c, tenant.prices).totalGross
    expect(BUILD_PRICES).toEqual([null, null, roofOnly, withSides, withSides, full, full])
  })
  it('a görgetési haladás 7 lépésre és 40 képkockára képez le, a széleken is érvényes értékkel', () => {
    expect([stepAt(0), stepAt(0.5), stepAt(1)]).toEqual([0, 3, 6])
    expect([frameAt(0), frameAt(1), frameAt(2)]).toEqual([0, BUILD_FRAMES - 1, BUILD_FRAMES - 1])
  })
  it('a képsorozat minden képkockája megvan asztali és mobil méretben', () => {
    for (let i = 0; i < BUILD_FRAMES; i++) for (const prefix of ['f', 'm']) {
      const file = `public/assets/landing/build/${prefix}${String(i).padStart(3, '0')}.webp`
      expect(existsSync(file), file).toBe(true)
      expect(statSync(file).size).toBeGreaterThan(3000)
    }
  })
  it('a lépésnevek és a kiválasztások minden nyelven 7 elemesek, a kollázs 6 cetlit tartalmaz', () => {
    for (const lang of ['hu', 'en'] as const) {
      const v2 = PLATFORM_COPY[lang].v2
      expect(v2.steps).toHaveLength(7)
      expect(v2.build.picks).toHaveLength(7)
      expect(v2.problem.scraps).toHaveLength(6)
      expect(v2.admin.columns).toHaveLength(4)
    }
  })
  it('a vonalrajzok kézi tinta-szűrőt kapnak, a forrás (MIT) megjelölve', () => {
    expect(read('src/components/landing/InkDefs.tsx')).toMatch(/line-art-animation.*MIT/)
    expect(read('src/landing.css')).toMatch(/filter: url\(#lx-ink\)/)
    expect(read('src/pages/Platform.tsx')).toMatch(/<InkDefs \/>/)
  })
  it('a fejlesztői képkocka-rögzítő horog élesben nem fut', () => {
    expect(read('src/pages/PergoStudio.tsx')).toMatch(/if \(!import\.meta\.env\.DEV\) return\n\s+const w = window/)
    expect(read('src/components/PergolaScene.tsx')).toMatch(/const override = import\.meta\.env\.DEV \?/)
  })
  it('mozgáscsökkentésnél a lépéssáv, a tábla és a jelenetek végállapotban állnak', () => {
    expect(read('src/components/landing/Hero.tsx')).toMatch(/prefers-reduced-motion: reduce\)'\)\.matches \? 6 : 5/)
    expect(read('src/components/landing/AdminBoard.tsx')).toMatch(/prefers-reduced-motion: reduce\)'\)\.matches \? 3 : 0/)
    expect(read('src/landing.css')).toMatch(/\.pf-reduced \.lx-feature \*/)
  })
})
