import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { PLATFORM_COPY } from '../src/i18n/platformCopy'

const read = (path: string) => readFileSync(path, 'utf8')
const hero = read('src/components/landing/Hero.tsx')
const css = read('src/landing.css')

describe('héró „Felhők felett”', () => {
  it('a felhőrétegek és a telefon képernyője valódi, átlátszó webp képek', () => {
    for (const name of ['clouds-back', 'clouds-mid', 'clouds-front', 'laptop-screen', 'laptop-screen-960']) {
      const file = `public/assets/landing/${name}.webp`
      expect(existsSync(file), file).toBe(true)
      expect(statSync(file).size).toBeLessThan(400_000)
      if (name.startsWith('clouds')) expect(hero).toContain(`/assets/landing/${name}.webp`)
    }
    expect(read('src/components/landing/Laptop.tsx')).toContain('/assets/landing/laptop-screen.webp')
  })

  it('a kézben tartott telefon helyett lebegő laptop, a kijelzőn a valódi asztali konfigurátor', () => {
    expect(existsSync('src/components/landing/HandPhone.tsx')).toBe(false)
    expect(existsSync('public/assets/landing/phone-screen.webp')).toBe(false)
    expect(hero).toMatch(/<Laptop label=\{v\.laptopLabel\} ref=\{laptop\} \/>/)
    expect(hero).toMatch(/screen\.style\.transform = `perspective\(1800px\)/)
    for (const lang of ['hu', 'en'] as const) expect(PLATFORM_COPY[lang].v2.hero.laptopLabel).toMatch(/5[ ,]648[ ,]000/)
    expect(css).toMatch(/\.pf-reduced \.lx-laptop/)
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

  it('átvezetés „Lamella-redőny”: 12 lamella felülről sorban zár, a zárt tetőn mondat, a következő szakaszon nyílik', () => {
    expect(hero).toMatch(/const SLATS = 12/)
    expect(hero).toMatch(/rotateX\(\$\{\(o > 0 \? -90 \* o : 90 \* \(1 - c\)\)\.toFixed\(2\)\}deg\)/)
    expect(hero).toMatch(/const delay = \(index \/ n\) \* 0\.45/)
    expect(hero).toMatch(/element\.nextElementSibling/)
    expect(hero).not.toMatch(/scale\(\$\{\(1 \+ \(geo\.zoom/)
    expect(css).toMatch(/\.lx-sky \+ \.lx-build \{ margin-top: -100svh; \}/)
    expect(css).toMatch(/\.lx-louvers \{ position: fixed; inset: 0; z-index: 40;/)
    for (const lang of ['hu', 'en'] as const) {
      const v = PLATFORM_COPY[lang].v2.hero
      expect(v.louver).toHaveLength(3)
      expect(v.louverLabel.length).toBeGreaterThan(5)
    }
  })

  it('mozgáscsökkentésnél nincs redőny és nincs betű-animáció', () => {
    expect(hero).toMatch(/p = reduced \? 0 :/)
    expect(css).toMatch(/\.pf-reduced \.lx-ch, \.pf-reduced \.lx-device/)
    expect(css).toMatch(/\.pf-reduced \.lx-louvers \{ display: none; \}/)
  })

  it('a lamellák mögött közvetlenül a „Hét lépés” szakasz jön', () => {
    const page = read('src/pages/Platform.tsx')
    expect(page).toMatch(/<Hero demoPath=\{DEMO_PATH\} \/>\s*<BuildSequence \/>/)
  })

  it('telefonon külön elrendezés van, nem marad el a hatás', () => {
    expect(css).toMatch(/@media \(max-width: 760px\) \{\n {2}\.lx-sky \{ --dw: 94vw; height: 190vh; \}/)
  })

  it('a képsorozat kockáit a .gitignore nem zárja ki (különben élesen 404)', () => {
    const result = spawnSync('git', ['check-ignore', '-q', 'public/assets/landing/build/f000.webp'])
    // 1 = nincs kizárva; 128 = nem git-munkakönyvtár (pl. tarball), ilyenkor a szabályt a fájlból ellenőrizzük
    if (result.status === 128) expect(read('.gitignore')).toContain('!public/assets/landing/build/')
    else expect(result.status).toBe(1)
  })

})

describe('animációs teljesítmény (4.66)', () => {
  it('a héró görgetéskor nem ír CSS-változót a gyökerére (az az egész részfát újraszámoltatná), csak a mozgó elemekre', () => {
    expect(hero).not.toMatch(/element\.style\.setProperty\('--(p|z|px|py|zoom|dx|dy)'/)
    expect(hero).toMatch(/phone\.style\.transform = /)
    expect(css).not.toMatch(/\.lx-device \{[^}]*var\(--z\)/)
  })
  it('a „Hét lépés” nem renderel újra minden görgetési képkockán, és képernyőn kívül nem számol', () => {
    const build = read('src/components/landing/BuildSequence.tsx')
    expect(build).not.toMatch(/setProgress/)
    expect(build).toMatch(/if \(!visible\) return/)
  })
  it('a folyamatosan animált jeleneteken nincs tinta-szűrő, a képernyőn kívüli animációk szünetelnek', () => {
    expect(css).not.toMatch(/\.lx-tour-art svg, \.lx-tour-mini svg \{[^}]*filter/)
    expect(css).not.toMatch(/\.lx-tile svg[^{]*\{ filter/)
    expect(css).toMatch(/\.lx-offscreen, \.lx-offscreen \* \{ animation-play-state: paused !important; \}/)
    expect(read('src/pages/Platform.tsx')).toMatch(/classList\.toggle\('lx-offscreen', !entry\.isIntersecting\)/)
  })
  it('az élő SB 400 demó csak kattintásra töltődik, addig álló kép látszik', () => {
    const sim = read('src/components/SimFrame.tsx')
    expect(sim).toMatch(/useState\(false\)\n\s+const \[active/)
    expect(sim).toMatch(/\{loaded \? <iframe/)
    expect(existsSync('public/assets/landing/sim-poster.webp')).toBe(true)
    expect(existsSync('public/assets/landing/sim-poster-800.webp')).toBe(true)
  })

  it('telefonon és álló tableten a laptop normál elrendezésben, a szöveg alatt áll (nem csúszhat rá), és ha nem fér ki, görgetésre felcsúszik', () => {
    expect(css).toMatch(/@media \(max-width: 760px\) \{[\s\S]*?\.lx-device \{ position: relative; left: auto; right: auto; bottom: auto; width: 100%;/)
    expect(css).toMatch(/orientation: portrait\) \{[\s\S]*?\.lx-device \{ position: relative;/)
    expect(hero).toMatch(/overflow = Math\.max\(0, phone\.offsetTop \+ phone\.offsetHeight \+ 24 - panel\.clientHeight\)/)
    expect(hero).toMatch(/const lift = -overflow \* ease\(clamp\(p \/ 0\.34\)\)/)
    expect(hero).toMatch(/close = clamp\(\(p - 0\.38\) \/ 0\.56\)/)
  })
})
