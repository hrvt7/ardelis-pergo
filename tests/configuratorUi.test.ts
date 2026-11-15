import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(path, 'utf8')

describe('konfigurátor felület (audit H6, H11–H13, H20)', () => {
  it('mobilon a lépéssáv görgethető, és az aktív lépés a látható részre ugrik', () => {
    const controls = read('src/components/ConfiguratorControls.tsx')
    expect(controls).toMatch(/ref=\{tabsRef\}/)
    expect(controls).toMatch(/button\.active/)
    expect(read('src/index.css')).toMatch(/\.layout-a \.control-tabs \{ justify-content: flex-start; overflow-x: auto;/)
  })
  it('a félig nyitott panel címe az aktív lépés, nem utasítás', () => {
    expect(read('src/components/ConfiguratorControls.tsx')).not.toMatch(/Húzd fel a teljes nézethez/)
  })
  it('az újrakezdés megerősítést kér, a bemutató gomb neve beszédes', () => {
    const chrome = read('src/components/studio/StudioChrome.tsx')
    expect(chrome).toMatch(/Biztosan\? Kattints újra/)
    expect(chrome).toMatch(/Bemutató nézet/)
    expect(chrome).not.toMatch(/<span>Alaphelyzet<\/span>/)
  })
  it('telefonon a gyors kapcsolók feliratos menüpontként az Eszközök menüben vannak', () => {
    const chrome = read('src/components/studio/StudioChrome.tsx')
    expect(chrome).toMatch(/mobileOnly: true/)
    expect(read('src/index.css')).toMatch(/\.weather-toolbar > \.quick-toggle \{ display: none; \}/)
  })
  it('a „Kezdőlap” link navigációs landmarkban van', () => {
    for (const page of ['PergoStudio', 'CatalogStudio', 'GarageStudio']) expect(read(`src/pages/${page}.tsx`)).toMatch(/<nav aria-label="Vissza a kezdőlapra">/)
  })
})
