import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { PHONE_TILT, SCREEN_ORIGIN } from '../src/components/landing/handGeometry'
import { PLATFORM_COPY } from '../src/i18n/platformCopy'

const read = (path: string) => readFileSync(path, 'utf8')
const hero = read('src/components/landing/Hero.tsx')
const css = read('src/landing.css')

describe('héró „Felhők felett”', () => {
  it('a felhőrétegek és a telefon képernyője valódi, átlátszó webp képek', () => {
    for (const name of ['clouds-back', 'clouds-mid', 'clouds-front', 'phone-screen']) {
      const file = `public/assets/landing/${name}.webp`
      expect(existsSync(file), file).toBe(true)
      expect(statSync(file).size).toBeLessThan(400_000)
      if (name !== 'phone-screen') expect(hero).toContain(`/assets/landing/${name}.webp`)
    }
    expect(read('src/components/landing/HandPhone.tsx')).toContain('/assets/landing/phone-screen.webp')
  })

  it('a héró már nem tölti a 3D-s HeroLouvre-t (könnyebb első betöltés)', () => {
    expect(hero).not.toMatch(/HeroLouvre/)
  })

  it('a cím betűnként bomlik, a szóközök a szavak között maradnak, a teljes cím képernyőolvasónak egyben megy', () => {
    expect(hero).toMatch(/className="lx-ch"/)
    expect(hero).toMatch(/<\/span>\{w < all\.length - 1 \? ' ' : null\}<\/Fragment>/)
    expect(hero).toMatch(/aria-label=\{lines\.join\(' '\)\}/)
    for (const lang of ['hu', 'en'] as const) {
      const h = PLATFORM_COPY[lang].hero
      expect([h.line1, h.line2, h.line3].every((line) => line.length > 3)).toBe(true)
      expect(PLATFORM_COPY[lang].v2.hero.sub.length).toBeGreaterThan(40)
    }
  })

  it('a ráközelítés a képernyő közepére céloz, és a telefon kiegyenesedik', () => {
    expect(SCREEN_ORIGIN.x).toBeCloseTo((300 / 620) * 100, 5)
    expect(SCREEN_ORIGIN.y).toBeCloseTo((290 / 760) * 100, 5)
    expect(hero).toMatch(/'--tilt': `\$\{-PHONE_TILT\}deg`/)
    expect(PHONE_TILT).toBeLessThan(0)
    expect(css).toMatch(/transform-origin: var\(--ox\) var\(--oy\)/)
    expect(css).toMatch(/rotate\(calc\(var\(--tilt\) \* var\(--z\)\)\)/)
  })

  it('mozgáscsökkentésnél nincs görgetéses zoom és nincs betű-animáció', () => {
    expect(hero).toMatch(/const p = reduced \? 0 :/)
    expect(css).toMatch(/\.pf-reduced \.lx-ch, \.pf-reduced \.lx-device/)
  })

  it('a zoom után közvetlenül a „Hét lépés” szakasz jön', () => {
    const page = read('src/pages/Platform.tsx')
    expect(page).toMatch(/<Hero demoPath=\{DEMO_PATH\} \/>\s*<BuildSequence \/>/)
  })

  it('telefonon külön elrendezés van, nem marad el a hatás', () => {
    expect(css).toMatch(/@media \(max-width: 760px\) \{\n {2}\.lx-sky \{ --dw: 74vw; height: 210vh; \}/)
  })

  it('a képsorozat kockáit a .gitignore nem zárja ki (különben élesen 404)', () => {
    const result = spawnSync('git', ['check-ignore', '-q', 'public/assets/landing/build/f000.webp'])
    // 1 = nincs kizárva; 128 = nem git-munkakönyvtár (pl. tarball), ilyenkor a szabályt a fájlból ellenőrizzük
    if (result.status === 128) expect(read('.gitignore')).toContain('!public/assets/landing/build/')
    else expect(result.status).toBe(1)
  })
})
