import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolveUiStyle, studioInitialTime } from '../src/lib/uiStyle'

describe('stúdió stílus (?style=studio, kipróbálásra)', () => {
  it('a paraméter és a megjegyzett érték is választhatja; az alap a világos felület', () => {
    expect(resolveUiStyle('?style=studio', null)).toBe('studio')
    expect(resolveUiStyle('', 'studio')).toBe('studio')
    expect(resolveUiStyle('', null)).toBe('light')
  })
  it('stúdióban semleges nappali fénnyel indul, más stílusban nem nyúl a jelenethez', () => {
    expect(studioInitialTime('studio')).toEqual({ time: 'day', dayTime: 13 })
    expect(studioInitialTime('soft')).toBeNull()
  })
  it('a jelenetben színátmenetes stúdióháttér és semleges padló, tónusleképezéssel (nincs látható horizontvonal)', () => {
    const scene = readFileSync('src/components/PergolaScene.tsx', 'utf8')
    expect(scene).toMatch(/function Cyclorama/)
    expect(scene).toMatch(/#include <tonemapping_fragment>/)
    expect(scene).toMatch(/neutral=\{cyclorama\}/)
  })
  it('a felület kicker-címkék nélkül, a lime csak a fő gombon; egy áttetsző eszközsor', () => {
    const css = readFileSync('src/index.css', 'utf8')
    const block = css.slice(css.indexOf('/* ============ Stúdió stílus'))
    expect(block).toMatch(/\.layout-a\.style-studio \.step-heading > span \{ display: none; \}/)
    expect(block).toMatch(/\.layout-a\.style-studio \.roof-card\.selected, \.layout-a\.style-studio \.building-card\.selected \{ border-color: transparent;/)
    expect(block).toMatch(/\.layout-a\.style-studio \.weather-toolbar \{ gap: 2px;/)
  })
})

describe('világos, pasztell felület (alapértelmezett)', () => {
  it('Urbanist betű, pasztell paletta, fekete pill gombok; a sötét változat ?style=soft-tal elérhető', () => {
    const css = readFileSync('src/index.css', 'utf8')
    const block = css.slice(css.indexOf('/* ============ Világos, pasztell felület'))
    expect(block).toMatch(/--l-blue: #D8DFE9; --l-green: #CFDECA; --l-vanilla: #EFF0A3; --l-ink: #212121;/)
    expect(block).toMatch(/--font-ui: 'Urbanist Variable'/)
    expect(block).toMatch(/\.layout-a\.style-light \.next-step, [^{]*\{ background: var\(--l-ink\); color: #fff;/)
    expect(readFileSync('src/main.tsx', 'utf8')).toMatch(/@fontsource-variable\/urbanist/)
    expect(resolveUiStyle('?style=soft', null)).toBe('soft')
  })
  it('a 3D stúdióháttér világos tónusú, és világos stílusban is semleges nappali fényben indul', () => {
    expect(studioInitialTime('light')).toEqual({ time: 'day', dayTime: 13 })
    expect(readFileSync('src/components/PergolaScene.tsx', 'utf8')).toMatch(/tone === 'light' \? '#f4f6fa'/)
  })
})
