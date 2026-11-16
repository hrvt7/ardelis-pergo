// 4.76: lebegő konfigurátor-elrendezés – a panel balra lebeg, a jelenet-eszközök a jobb szélből kinövő fekete fülben.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { floatPhoneShiftX, floatViewShiftX, resolveUiStyle, TOOL_RAIL_WIDTH, UI_STYLE_KEY, usesFloatLayout } from '../src/lib/uiStyle'

describe('lebegő konfigurátor-elrendezés', () => {
  it('csak a világos (alapértelmezett) stílusban kapcsol be', () => {
    expect(usesFloatLayout('light')).toBe(true)
    expect(usesFloatLayout('glass')).toBe(false)
    expect(usesFloatLayout('soft')).toBe(false)
  })

  it('a régi kulcson megjegyzett stílus nem írja felül az új alapértelmezést; a ?style= paraméter továbbra is választ', () => {
    expect(UI_STYLE_KEY).not.toBe('lamelix-ui-style')
    expect(resolveUiStyle('', null)).toBe('light')
    expect(resolveUiStyle('?style=soft', null)).toBe('soft')
  })

  it('asztalon a pergola a panel és a fül közötti szabad rész közepére kerül (jobbra tolt nézet)', () => {
    // 1440 px, 420 px panel: a szabad rész közepe (420 + 24 − 68) / 2 px-lel van jobbra a vászon közepétől.
    expect(floatViewShiftX(1440, 420)).toBeCloseTo(-(420 + 24 - TOOL_RAIL_WIDTH) / 2 / 1416, 6)
    expect(floatViewShiftX(1440, 420)).toBeLessThan(0)
    expect(floatViewShiftX(800, 420)).toBe(0)
    expect(floatPhoneShiftX(390)).toBeCloseTo(28 / 390, 6)
  })

  it('a fül minden jelenet-eszközt ikonként mutat felirattal, az „Eszközök” menü nélkül; homorú lekerekítés a két végén', () => {
    const chrome = readFileSync('src/components/studio/StudioChrome.tsx', 'utf8')
    const studio = readFileSync('src/pages/PergoStudio.tsx', 'utf8')
    const css = readFileSync('src/studio-float.css', 'utf8')
    expect(chrome).toMatch(/className="tool-rail"/)
    expect(chrome).toMatch(/className="rail-tip"/)
    expect(studio).toMatch(/variant=\{floatLayout \? 'rail' : 'bar'\}/)
    expect(css).toMatch(/\.tool-rail::before \{ bottom: 100%; background: radial-gradient\(circle at 0 0/)
    expect(css).toMatch(/\.tool-rail::after \{ top: 100%; background: radial-gradient\(circle at 0 100%/)
    // Vanilla a bekapcsolt eszköz jele, nem új kiemelőszín
    expect(css).toMatch(/is-active[^}]*var\(--l-vanilla/)
    // asztalon a panel balra lebeg
    expect(css).toMatch(/\.layout-float \.controls-panel \{ left: 28px; right: auto;/)
  })
})
