import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PLATFORM_COPY } from '../src/i18n/platformCopy'

describe('nyitóoldal — Digitális termékkönyv szakasz', () => {
  it('magyarul és angolul ugyanaz a szerkezet: 4 lépés, telefonképernyők, őszinteségi megjegyzés', () => {
    for (const lang of ['hu', 'en'] as const) {
      const p = PLATFORM_COPY[lang].v2.passport
      expect(p.steps).toHaveLength(4)
      expect(p.phone.warranty).toHaveLength(3)
      expect(p.honest.length).toBeGreaterThan(40)
      expect(p.demoNote.length).toBeGreaterThan(10)
    }
  })
  it('nem ígér alkatrész-azonosítást vagy automatikus rendelést (csak tagadva szerepel)', () => {
    const hu = JSON.stringify({ ...PLATFORM_COPY.hu.v2.passport, honest: '' })
    const en = JSON.stringify({ ...PLATFORM_COPY.en.v2.passport, honest: '' })
    expect(hu).not.toMatch(/cikkszám|automatikus(an)? rendel|azonosítja az alkatrész/i)
    expect(en).not.toMatch(/part number|orders? automatically|identif(y|ies) the part/i)
    expect(PLATFORM_COPY.hu.v2.passport.honest).toMatch(/nem azonosít alkatrészt és nem rendel/)
  })
  it('a 4 MB/4 fotó és a zárolt bővítés a kód valós korlátait mondja', () => {
    expect(PLATFORM_COPY.hu.v2.passport.steps[2].text).toContain('legfeljebb 4 fotót')
    expect(readFileSync('server/serviceRequests.ts', 'utf8')).toContain('export const MAX_PHOTOS = 4')
    expect(PLATFORM_COPY.hu.v2.passport.steps[3].text).toContain('zárolt')
  })
  it('a szakasz a nyitóoldalon, az admin-tábla után szerepel', () => {
    const page = readFileSync('src/pages/Platform.tsx', 'utf8')
    expect(page.indexOf('<ProductPassport />')).toBeGreaterThan(page.indexOf('<AdminBoard />'))
  })
})
