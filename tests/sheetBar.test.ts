import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(path, 'utf8')

describe('ár + „Tovább” sor a panelen belül (nincs külön, mindig látható alsó sáv)', () => {
  it('a konfigurátor a sort a beállítópanelnek adja át; csak a modulház-nézet használja még a régi sávot', () => {
    const studio = read('src/pages/PergoStudio.tsx')
    expect(studio).toMatch(/<ConfiguratorControls mobileBar=\{mobileBar\}/)
    expect(studio).toMatch(/\{modularMode && mobileBar\}/)
    expect(studio).toMatch(/modularMode \? '' : 'bar-in-panel'/)
    expect(read('src/components/ConfiguratorControls.tsx')).toMatch(/\{mobileBar\}\n {4}<\/aside>/)
  })
  it('a 3D nézet a képernyő aljáig ér, a sor a panel része', () => {
    const css = read('src/index.css')
    expect(css).toMatch(/\.layout-a\.bar-in-panel \.studio-shell \{ height: calc\(100dvh - var\(--header-height\)\); \}/)
    expect(css).toMatch(/\.layout-a \.controls-panel > \.mobile-price-bar \{ position: static;/)
  })
})

describe('német nyelvű konfigurátor: nem maradt magyar felirat (audit 2026-11-16)', () => {
  it('épülettípus-címke, alapszín-jelölés, tanácsadó és rajzfejléc fordítva', () => {
    expect(read('src/lib/buildings.ts')).toMatch(/tr\('Nyitott oldalak', 'Offene Seiten'\)/)
    expect(read('src/components/ColorPicker.tsx')).toMatch(/tr\(' · alap', ' · Standard'\)/)
    expect(read('src/components/AdvisorDialog.tsx')).not.toMatch(/return 'Nyitott oldalak'/)
    expect(read('src/lib/drawing.ts')).toMatch(/tr\('Tartalom', 'Inhalt'\)/)
  })
  it('a színminták neve két sorban kiírva, nem levágva', () => {
    expect(read('src/index.css')).toMatch(/\.color-chip small \{ white-space: normal; display: -webkit-box; -webkit-line-clamp: 2;/)
  })
})
