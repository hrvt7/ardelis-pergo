import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

describe('reszponzív átnézés (4.95)', () => {
  it('fekvő telefonon a „Hét lépés” szakasz külön alacsony elrendezést kap', () => {
    const landing = css('landing.css')
    expect(landing).toMatch(/@media \(max-height: 560px\) and \(min-width: 700px\)[\s\S]*\.lx-build-steps li:not\(\.is-on\) \{ display: none; \}/)
  })

  it('érintős eszközön a nyitóoldal, az admin és az ajánlat kattintható elemei legalább 44 px-esek', () => {
    for (const file of ['landing.css', 'admin-workspace.css']) {
      expect(css(file), file).toMatch(/@media \(pointer: coarse\)[^{]*\{[\s\S]*min-height: 44px/)
    }
    expect(css('index.css')).toMatch(/\.quote-check \{[^}]*min-height: 44px/)
  })

  it('a konfigurátor eszközfüle érintésre 44 px-es gombokat kap, a 7 lépés 360 px-en is kifér', () => {
    const studio = css('studio-float.css')
    expect(studio).toMatch(/@media \(pointer: coarse\) \{\s*\.layout-float \{ --rail-w: 56px; --rb: 44px; \}/)
    expect(studio).toMatch(/@media \(max-width: 380px\)[\s\S]*\.layout-a \.control-tabs button \{ padding: 0 4px/)
    expect(studio).toMatch(/\.layout-float \.scene-poster \{ right: var\(--rail-w/)
  })

  it('a tulajdonosi oldal adatkezelési linkje elég nagy célpont', () => {
    expect(css('owner.css')).toMatch(/\.owner-foot a \{[^}]*min-height: 44px/)
  })
})
