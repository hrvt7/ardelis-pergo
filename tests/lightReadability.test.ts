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
  it('az admin 4.73 óta a sötét munkaterület-témát használja (Ádám kérése): a sötét lapokon a logó világos változata látszik', () => {
    const page = readFileSync('src/pages/AdminPage.tsx', 'utf8')
    expect(page.match(/<LamelixLogo[^>]*tone="onDark"/g)?.length).toBe(2)
    expect(page).not.toMatch(/admin-light/)
  })
})

describe('mindenhol ugyanaz a világos design (4.60)', () => {
  it('a főoldal tokenjei világosak, Urbanist betűvel, fekete kiemeléssel', () => {
    const pf = readFileSync('src/platform.css', 'utf8')
    expect(pf).toMatch(/--pf-bg: #ECECEF;/)
    expect(pf).toMatch(/--pf-text: #212121;/)
    expect(pf).toMatch(/--pf-accent: #212121;/)
    expect(pf).toMatch(/font-family: 'Urbanist Variable'/)
    expect(pf).not.toMatch(/#d8ff72/i)
    expect(pf).not.toMatch(/rgba\(216,\s*255,\s*114/)
    expect(contrast('#5C5E64', '#ECECEF')).toBeGreaterThanOrEqual(4.5)
  })
  it('a performative-ui elemek (ragadós sáv, lábléc) a világos tokeneket kapják', () => {
    const pui = readFileSync('src/pui-theme.css', 'utf8')
    expect(pui).toMatch(/--pui-fg: var\(--pf-text, #212121\);/)
    expect(pui).toMatch(/\.lx-sticky a \{[^}]*color: #fff;/)
  })
  it('adatkezelés, 404 és belépés világos alapon, a logó sötét változatával', () => {
    const legal = readFileSync('src/legal.css', 'utf8')
    expect(legal).toMatch(/\.legal-page\{min-height:100vh;background:#ECECEF;color:#212121;/)
    for (const page of ['src/pages/NotFound.tsx', 'src/pages/Privacy.tsx', 'src/pages/Login.tsx']) expect(readFileSync(page, 'utf8')).toMatch(/tone="onLight"/)
    expect(readFileSync('src/pages/Platform.tsx', 'utf8').match(/tone="onLight"/g)?.length).toBe(3)
  })
  it('a mintaoldal is Urbanist betűt és Vanilla kiemelést használ', () => {
    const film = readFileSync('src/home-film.css', 'utf8')
    expect(film).toMatch(/--display: 'Urbanist Variable'/)
    expect(film).toMatch(/--primitive-bronze: #EFF0A3;/)
  })
})
