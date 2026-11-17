import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (f: string) => fs.readFileSync(path.resolve(import.meta.dirname, '..', f), 'utf8')

describe('„Új verzió elérhető” kártya', () => {
  const css = read('src/base.css')
  const rule = /\.update-pop \{[^}]*\}/.exec(css)?.[0] ?? ''
  it('felül, a fejléc alatt jelenik meg (a lenti kalkulációs sávot nem takarja)', () => {
    expect(rule).toMatch(/top: var\(--pop-top\)/)
    expect(rule).not.toMatch(/bottom:/)
    expect(css).toMatch(/--pop-top: calc\(env\(safe-area-inset-top, 0px\) \+ var\(--header-height, 64px\) \+ 12px\)/)
  })
  it('beugró animációval érkezik és távozik; csökkentett mozgásnál csak elhalványul', () => {
    expect(rule).toMatch(/animation: update-pop-in/)
    expect(css).toMatch(/@keyframes update-pop-in/)
    expect(css).toMatch(/\.update-pop\.is-leaving \{ animation: update-pop-out/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\n {2}\.update-pop \{ animation: update-pop-fade/)
  })
  it('csak a nyitó animáció után jelenik meg, és csak gombnyomásra frissít', () => {
    const source = read('src/components/SwUpdateBanner.tsx')
    expect(source).toMatch(/if \(!waiting \|\| !introDone \|\| dismissed\) return/)
    expect(source).toMatch(/onClick=\{update\}/)
    expect(source).not.toMatch(/applySwUpdate\(\)\s*\}\s*,\s*\[/)
  })
  it('a régi, alul ugró jelzés stílusa már nincs', () => {
    expect(css).not.toMatch(/^\.sw-update \{/m)
    expect(read('src/index.css')).not.toMatch(/^\.sw-update \{/m)
  })
})
