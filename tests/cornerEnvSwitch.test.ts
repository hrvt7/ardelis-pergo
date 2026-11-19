import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CORNER_TRACK, CORNER_TRACK_COMPACT, SLIDE_MS } from '@/lib/cornerTrack'

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
const css = read('src/components/rebuild/rebuild.css')

describe('környezet-kapcsoló a kártya sarkában', () => {
  it('a sín a kártya 28 px-es sarkával koncentrikus, belül fut (14 px-es beljebbhúzás, 14 px-es ív)', () => {
    expect(CORNER_TRACK).toBe('M16 14 H52 A14 14 0 0 1 66 28 V64')
    // 80 px-es doboz jobb felső sarka = kártya sarka; az ív középpontja (52, 28) = 80 - 28, 28
    expect(css).toContain(".rb-corner-switch { position: absolute; z-index: 3; top: 0; right: 0; width: 80px; height: 80px;")
    expect(css).toContain(`offset-path: path('${CORNER_TRACK}')`)
  })
  it('kapcsoló szerepű, a háttér és a családi ház között vált, a korábbi környezetet visszaadja', () => {
    const src = read('src/components/rebuild/CornerEnvSwitch.tsx')
    expect(src).toContain('role="switch" aria-checked={on}')
    expect(src).toContain("onChange(next ? last : 'studio')")
  })
  it('a környezet akkor vált, amikor a gomb megérkezik (a csúszás és a CSS-átmenet ideje azonos)', () => {
    const src = read('src/components/rebuild/CornerEnvSwitch.tsx')
    expect(src).toContain('reduce ? 0 : SLIDE_MS')
    expect(SLIDE_MS).toBe(520)
    expect(css).toContain('transition: offset-distance .52s var(--rb-ease)')
  })
  it('asztalon és telefonon is a lépéskártya sarkában ül; telefonon a 26 px-es laphoz igazított sínen', () => {
    expect(read('src/components/rebuild/StepCard.tsx')).toContain('{corner}')
    expect(read('src/pages/PergoStudio.tsx')).toContain('corner={<CornerEnvSwitch ground={scene.ground} compact={isNarrow} onChange={(ground) => updateScene({ ground })} />}')
    expect(CORNER_TRACK_COMPACT).toBe('M18 12 H54 A14 14 0 0 1 68 26 V40')
    expect(css).toContain(`.rb-corner-switch.is-compact .rb-corner-knob { offset-path: path('${CORNER_TRACK_COMPACT}'); }`)
  })
})

describe('telefonos sarokkapcsoló saját sarokban', () => {
  const css = readFileSync(new URL('../src/components/rebuild/rebuild.css', import.meta.url), 'utf8')
  it('a haladássáv, a cím és az összecsukó gomb a kapcsoló sarkán kívül marad', () => {
    expect(css).toContain('.rb-stepcard.is-sheet .rb-strip-toggle { padding-right: 76px; }')
    expect(css).toContain('.rb-stepcard.is-sheet .rb-sheet-toggle { right: 30px; }')
    expect(css).toContain('.rb-stepcard.is-sheet .rb-stepcard-head { padding-right: 82px; }')
    expect(css).toContain('.rb-corner-switch.is-compact .rb-corner-fill { filter: none; }')
  })
})
