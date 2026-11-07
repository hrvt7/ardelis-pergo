import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Az Edge-függvények (api/*, server/*) a src/lib fájljait is behúzzák; az Edge-csomagoló a „@/” aliast nem ismeri.
// Ezért ezekben a fájlokban értéket (nem típust) csak relatív úton szabad importálni. A hiba a böngészős buildben nem látszik, csak a Vercelen.
const SHARED = ['src/lib/furniture.ts', 'src/lib/usePacks.ts']

describe('Edge-kompatibilis importok', () => {
  for (const file of SHARED) {
    it(`${file}: a „@/” alias csak típusimportban szerepel`, () => {
      const offenders = readFileSync(file, 'utf8').split('\n').filter((line) => /^\s*(import|export)\b.*from\s+'@\//.test(line) && !/^\s*(import|export)\s+type\b/.test(line))
      expect(offenders).toEqual([])
    })
  }
})
