import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// WCAG relatív fénysűrűség és kontrasztarány (#rrggbb).
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const css = readFileSync('src/index.css', 'utf8')
const admin = readFileSync('src/admin-premium.css', 'utf8')
const P = ':is(.layout-a.style-light, body.ui-light)'

describe('világos felület – olvashatóság', () => {
  it('a másodlagos szöveg minden világos alapon eléri a 4,5:1 arányt', () => {
    const muted = css.match(/--l-muted: (#[0-9A-Fa-f]{6})/)?.[1] ?? ''
    for (const bg of ['#FFFFFF', '#F6F5FA', '#ECECEF', '#EFF0A3', '#CFDECA']) expect(contrast(muted, bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#212121', '#EFF0A3')).toBeGreaterThanOrEqual(7)
  })
  it('a lebegő felületek (Eszközök, Nézet, párbeszédablakok, értesítés) fehérek sötét szöveggel', () => {
    for (const cls of ['.view-popover', '.modal-dialog', '.toast', '.camera-menu-list', '.sun-panel', '.automation-status']) expect(css).toContain(`${P} ${cls}`)
    expect(css).toMatch(/:is\(\.layout-a\.style-light, body\.ui-light\) \.view-popover-head \{ background: rgba\(255,255,255,\.96\)/)
    expect(css).toMatch(/\.layout-a\.style-light, body\.ui-light \{\n {2}--l-bg/)
  })
  it('a body-ba portált ablakok is megkapják a világos felületet', () => {
    const page = readFileSync('src/pages/PergoStudio.tsx', 'utf8')
    expect(page).toMatch(/document\.body\.classList\.toggle\('ui-light', uiStyle === 'light'\)/)
    expect(page.indexOf("classList.toggle('ui-light'")).toBeGreaterThan(page.indexOf('const [uiStyle]'))
  })
  it('a kijelölt elemek Vanilla háttért kapnak, nem neon-lime keretet; a PDF gomb fehér szöveggel', () => {
    expect(css).toContain(`${P} .budget-chips button.selected`)
    expect(css).toMatch(/\.showroom-share \{ background: var\(--l-ink\); color: #fff;/)
  })
})

describe('admin – ugyanaz a világos, pasztell rendszer', () => {
  it('Urbanist betű, világos oldalsáv, fekete elsődleges gomb', () => {
    const block = admin.slice(admin.indexOf('4.59 – Az admin'))
    expect(block).toMatch(/--font-ui:'Urbanist Variable'/)
    expect(block).toMatch(/\.admin-light \.admin-side\{[^}]*background:#FFFFFF/)
    expect(block).toMatch(/\.admin-light \.btn\.primary,\.admin-light \.admin-save\{background:#212121;color:#FFFFFF\}/)
    expect(contrast('#5C5E64', '#ECECEF')).toBeGreaterThanOrEqual(4.5)
  })
  it('a világos oldalsávon a Lamelix logó sötét változata látszik', () => {
    const page = readFileSync('src/pages/AdminPage.tsx', 'utf8')
    expect(page.match(/<LamelixLogo[^>]*tone="onLight"/g)?.length).toBe(2)
  })
})
