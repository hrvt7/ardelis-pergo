import { describe, expect, it } from 'vitest'
import { getSeoPage } from '../contracts/seo'
import { PLATFORM_COPY } from '../src/i18n/platformCopy'

describe('gyártói belépés és hitelesség a nyitóoldalon', () => {
  it('a /belepes oldal létezik, de nem indexelhető', () => {
    const page = getSeoPage('/belepes')
    expect(page.key).toBe('login')
    expect(page.indexable).toBe(false)
  })
  it('mindkét nyelven van belépés-felirat és béta-jelzés', () => {
    for (const lang of ['hu', 'en'] as const) {
      expect(PLATFORM_COPY[lang].nav.login.length).toBeGreaterThan(3)
      expect(PLATFORM_COPY[lang].demo.beta.toLowerCase()).toContain('b')
    }
  })
  it('a demókérő űrlap nem kínál meg nem épített terméket (carport)', () => {
    expect(Object.keys(PLATFORM_COPY.hu.form.products)).not.toContain('carport')
  })
})
