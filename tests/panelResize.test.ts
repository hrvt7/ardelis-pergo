import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { clampPanelWidth, defaultPanelWidth, panelWidthRange, readStoredWidths, writeStoredWidths } from '../src/lib/panelResize'
import { glassViewShiftX } from '../src/lib/uiStyle'

describe('húzható panelszélesség', () => {
  it('fekvő telefonon az alap a szélesség 42%-a, 300–380 px között', () => {
    expect(defaultPanelWidth('landscape-phone', 852)).toBe(358)
    expect(defaultPanelWidth('landscape-phone', 640)).toBe(300)
    expect(defaultPanelWidth('landscape-phone', 1000)).toBe(380)
  })
  it('asztalon az alap ugyanaz, mint a CSS töréspontjai', () => {
    expect([900, 1200, 1600].map((width) => defaultPanelWidth('desktop', width))).toEqual([344, 380, 420])
  })
  it('a 3D nézetnek mindig marad hely (telefonon legalább 40%, asztalon 50%)', () => {
    expect(panelWidthRange('landscape-phone', 852)).toEqual({ min: 260, max: 511 })
    expect(clampPanelWidth(900, 'landscape-phone', 852)).toBe(511)
    expect(clampPanelWidth(100, 'landscape-phone', 852)).toBe(260)
    expect(clampPanelWidth(2000, 'desktop', 1440)).toBe(640)
    expect(clampPanelWidth(Number.NaN, 'desktop', 1440)).toBe(320)
  })
  it('a választás elrendezésenként külön marad meg', () => {
    const raw = writeStoredWidths({ desktop: 455.4, 'landscape-phone': 330 })
    expect(raw).toBe('desktop:455;landscape-phone:330')
    expect(readStoredWidths(raw)).toEqual({ desktop: 455, 'landscape-phone': 330 })
    expect(readStoredWidths('szemét;desktop:-3')).toEqual({})
  })
  it('üveges stílusnál a nézeteltolás a beállított szélességgel számol', () => {
    expect(glassViewShiftX(1440, 1440, 12, 520)).toBeCloseTo((520 + 24) / 2 / 1440)
    expect(glassViewShiftX(1440, 1440)).toBeCloseTo((420 + 24) / 2 / 1440)
  })
  it('fekvő telefonon a jelenet gyors kapcsolói az Eszközök menüben vannak, a lépéssáv görgethető, a felirat nem lóg a gombokra', () => {
    const css = readFileSync('src/index.css', 'utf8')
    const landscape = css.slice(css.lastIndexOf('/* Fekvő telefon: oldalpanel húzható'))
    expect(landscape).toMatch(/\.layout-a \.weather-toolbar > \.quick-toggle \{ display: none; \}/)
    expect(landscape).toMatch(/\.layout-a \.control-tabs \{ justify-content: flex-start; overflow-x: auto;/)
    expect(landscape).toMatch(/\.layout-a \.viewer-heading h1 \{[^}]*text-overflow: ellipsis/)
    expect(landscape).toMatch(/var\(--side-w\)/)
  })
})
