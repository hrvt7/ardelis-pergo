import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')

describe('esti hibajavítások (2026-11-18)', () => {
  it('környezetváltáskor az árnyéktérkép újrarajzolódik (a kikapcsolt ház árnyéka nem marad a padlón)', () => {
    const scene = read('src/components/PergolaScene.tsx')
    expect(scene).toMatch(/\}, \[sceneGl, sceneInvalidate, scene\.ground, scene\.houseStyle, scene\.wallFinish, scene\.furniture, config\.mount, config\.width, config\.depth\]\)/)
    expect(scene).toContain('const timers = [120, 600, 1500].map((ms) => window.setTimeout(redraw, ms))')
  })
  it('az űrlaphoz görgetés csak a lépés tartalmát görgeti, a kártya fejléce a helyén marad', () => {
    expect(read('src/pages/PergoStudio.tsx')).not.toContain("section?.scrollIntoView({ block: 'start'")
    expect(read('src/components/rebuild/rebuild.css')).toContain('.rb-stepcard { overflow: clip; }')
  })
  it('a hozzájárulás és a hibaszöveg világos panelen olvasható (14 px, sötétpiros hiba)', () => {
    const css = read('src/components/rebuild/rebuild.css')
    expect(css).toContain('.rb-summary-legacy .consent-row > span { font-size: 14px;')
    expect(css).toContain('.rb-summary-legacy .real-lead-form .field-error { color: #b42318;')
  })
})

describe('kapcsolósorok egy oszlopban', () => {
  it('ikon nélküli kapcsolósorban a kapcsoló mindig a jobb szélen áll', () => {
    const css = read('src/components/rebuild/rebuild.css')
    expect(css).toContain('.rb-option.rb-switch-row:not(:has(.rb-switch-icon)), .rb-option.rb-stepper-row:not(:has(.rb-switch-icon)) { grid-template-columns: minmax(0, 1fr) auto; }')
    expect(css).toContain('.rb-option.rb-switch-row .rb-metal { justify-self: end; }')
  })
})
