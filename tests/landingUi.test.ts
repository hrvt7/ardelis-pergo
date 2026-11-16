import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'

const read = (path: string) => readFileSync(path, 'utf8')

describe('landing (audit H4, H5, H15, H16, H21)', () => {
  it('nincs a tartalmat takaró ragadós sáv: a fő cél a fejlécben és szakaszonként (kollázs, hét lépés, érvek) érhető el', () => {
    const page = read('src/pages/Platform.tsx')
    expect(page).not.toMatch(/<StickyCta/)
    expect(page).toMatch(/<WhyStrip \/>/)
    expect(read('src/components/landing/BuildSequence.tsx')).toMatch(/className="lx-build-cta" href="#demo"/)
    expect(read('src/components/landing/ProblemCollage.tsx')).toMatch(/lx-problem-cta" href="#demo"/)
  })
  it('a GYIK nem harmonika, az árak nem három egyforma kártya (design-loop 1. kör)', () => {
    const page = read('src/pages/Platform.tsx')
    expect(page).toMatch(/<FaqChat /)
    expect(page).toMatch(/<PlanSwitch /)
    expect(page).not.toMatch(/className="pf-plans"/)
  })
  it('a számlálók nem 0-ról indulnak', () => {
    expect(read('src/components/Showpieces.tsx')).toMatch(/from=\{Math\.floor\(item\.value \* 0\.5\)\}/)
  })
  it('mobilon a hero szövege van elöl, nem a kép', () => {
    expect(read('src/platform.css')).not.toMatch(/\.pf-scene \{ order: -1; \}/)
  })
  it('a régi rögzített képernyőkép-bemutató helyett a valódi konfigurátor képsorozata fut (sticky, rögzítés nélkül)', () => {
    const page = read('src/pages/Platform.tsx')
    expect(page).toMatch(/<BuildSequence \/>/)
    expect(page).not.toMatch(/window\.innerHeight \* 2\.2/)
    expect(read('src/landing.css')).toMatch(/\.lx-build-sticky \{ position: sticky;/)
  })
  it('a termékképek (konfigurátor, admin, mobil) mindkét méretben megvannak', () => {
    for (const name of ['studio', 'admin-leads', 'admin-overview']) {
      for (const file of [`public/assets/platform/${name}.webp`, `public/assets/platform/${name}-900.webp`]) expect(existsSync(file), file).toBe(true)
    }
    expect(statSync('public/assets/platform/admin-mobile.webp').size).toBeGreaterThan(5000)
  })
})
