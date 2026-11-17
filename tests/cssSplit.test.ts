import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
const APP_PAGES = ['TenantStudio', 'Login', 'AdminPage', 'QuotePage', 'InstallationPage', 'Home', 'Privacy', 'NotFound']

describe('kisebb első stíluslap a nyitóoldalon (4.98)', () => {
  it('a belépési pont csak a közös alapot tölti, az alkalmazás-stílus a saját oldalain', () => {
    const main = read('src/main.tsx')
    expect(main).toContain("import './base.css'")
    expect(main).not.toMatch(/import ['"]\.\/index\.css['"]/)
    const app = read('src/App.tsx')
    const styles = read('src/appStyles.ts')
    expect(styles).toContain("import '@/index.css'")
    expect(styles).toContain("import '@/appFonts'")
    // Az alkalmazás-stílus mindig az oldal előtt töltődik (kaszkád-sorrend), minden alkalmazás-oldalnál.
    expect(app).toContain("const withAppStyles = <T,>(load: () => Promise<T>) => () => import('@/appStyles').then(load)")
    for (const page of APP_PAGES) expect(app, page).toContain(`lazy(withAppStyles(() => import('@/pages/${page}')))`)
  })

  it('a Tailwind és az alapstílus egyszer, a base.css-ben van; az index.css-ből kikerült', () => {
    const base = read('src/base.css')
    expect(base).toMatch(/@tailwind base;/)
    expect(base).toMatch(/:root \{/)
    expect(base).toMatch(/\.sw-update/)
    expect(read('src/index.css')).not.toMatch(/@tailwind/)
  })

  it('a nyitóoldal nem tölti a csak alkalmazásban használt betűket, és betűt nem ágyazunk a CSS-be', () => {
    const main = read('src/main.tsx')
    for (const font of ['inter', 'manrope', 'outfit', 'poppins', 'cormorant-garamond', 'geist/400']) expect(main, font).not.toContain(font)
    expect(main).toContain('@fontsource-variable/urbanist')
    expect(read('src/appFonts.ts')).toContain('@fontsource-variable/inter')
    expect(read('vite.config.ts')).toMatch(/assetsInlineLimit: \(file: string\) => \(\/\\\.\(woff2\?\|ttf\|otf\)\$\/\.test\(file\) \? false : undefined\)/)
  })

  it('a belépő animáció CSS-átmenettel és egy figyelővel fut, nem elemenkénti GSAP-tweennel', () => {
    const platform = read('src/pages/Platform.tsx')
    expect(platform).not.toMatch(/gsap\.fromTo\(section\.querySelectorAll\('\[data-pf-item\]'\)/)
    expect(platform).toContain("section.classList.add('pf-reveal-armed')")
    expect(read('src/landing.css')).toMatch(/\.pf-reveal-armed \[data-pf-item\] \{ opacity: 0; translate: 0 46px;/)
  })
})
