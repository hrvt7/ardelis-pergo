import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CORNER_TRACK } from '@/lib/cornerTrack'

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
    expect(src).toContain("if (on) { setLast(ground); onChange('studio') } else onChange(last)")
  })
  it('asztalon a lépéskártyán ül, telefonon nem (ott az eszköztár Környezet panelje marad)', () => {
    expect(read('src/components/rebuild/StepCard.tsx')).toContain('{!compact && corner}')
    expect(read('src/pages/PergoStudio.tsx')).toContain('corner={<CornerEnvSwitch ground={scene.ground} onChange={(ground) => updateScene({ ground })} />}')
  })
})
