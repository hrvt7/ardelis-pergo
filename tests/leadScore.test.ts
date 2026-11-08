import { describe, expect, it } from 'vitest'
import { byScore, scoreLead } from '../src/lib/leadScore'

describe('scoreLead', () => {
  it('viselkedési adat nélkül csak az űrlapból pontoz, és jelzi, hogy vak', () => {
    const result = scoreLead({ estimate_gross: 1_000_000 })
    expect(result).toMatchObject({ score: 0, tier: 'cold', blind: true, reasons: [] })
  })

  it('PDF + visszatérés + AR forró érdeklődő', () => {
    const result = scoreLead({ estimate_gross: 1_000_000, engagement: { pdf: true, visits: 2, ar: true, steps: 6 } })
    expect(result.score).toBe(60)
    expect(result.tier).toBe('hot')
    expect(result.blind).toBe(false)
    expect(result.reasons).toContain('Letöltötte a PDF-összefoglalót')
  })

  it('egy látogatás, néhány lépés, megjegyzés nélkül: hideg', () => {
    const result = scoreLead({ estimate_gross: 1_500_000, engagement: { visits: 1, steps: 3, minutes: 2 } })
    expect(result.score).toBe(0)
    expect(result.tier).toBe('cold')
  })

  it('részletes megjegyzés és cím a nagy értékű tervhez: meleg', () => {
    const result = scoreLead({ estimate_gross: 4_500_000, notes: 'Tavasszal szeretnénk kezdeni, a terasz már megvan.', address: 'Fő utca 1.', engagement: { steps: 4 } })
    expect(result.score).toBe(30)
    expect(result.tier).toBe('warm')
  })

  it('100-nál nem megy feljebb', () => {
    const result = scoreLead({ estimate_gross: 9_000_000, notes: 'x'.repeat(40), address: 'a', engagement: { pdf: true, visits: 3, ar: true, share: true, steps: 6, saved: true, minutes: 12 } })
    expect(result.score).toBe(100)
  })

  it('byScore: a magasabb pontszám kerül előre', () => {
    const cold = { estimate_gross: 1, engagement: {} }
    const hot = { estimate_gross: 1, engagement: { pdf: true, ar: true, visits: 2 } }
    expect([cold, hot].sort(byScore)[0]).toBe(hot)
  })
})
