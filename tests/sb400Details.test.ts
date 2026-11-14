import { describe, expect, it } from 'vitest'
import { sb400Details, sb400LouvreCount, SB400_SOURCE } from '../src/lib/sb400Details'
import { SB400 } from '../src/lib/sb400'

const base = { width: 4 - SB400.strutW, depth: 7 - SB400.strutW, height: 2.906, modules: 1, led: false }

describe('SB 400 műszaki jelölések', () => {
  it('a terv lamellaszáma és hossza az adatlap szerint (4000 × 7000: 34 db, 3790 mm)', () => {
    const count = sb400LouvreCount(base)
    expect(count.perBay).toBe(34)
    expect(count.total).toBe(34)
    expect(Math.round(count.length * 1000)).toBe(3790)
    const louvre = sb400Details(base).find((detail) => detail.id === 'louvre')!
    expect(louvre.rows.find(([label]) => label === 'Ebben a tervben')![1]).toBe('34 db, 3790 mm hosszú')
  })

  it('több modulnál mezőnként számol', () => {
    const count = sb400LouvreCount({ ...base, width: 8, modules: 2 })
    expect(count.bays).toBe(2)
    expect(count.total).toBe(count.perBay * 2)
    expect(sb400Details({ ...base, width: 8, modules: 2 })[0].rows.some(([, value]) => value.startsWith('2 × '))).toBe(true)
  })

  it('a kártyák a gyári adatlap kulcsadatait tartalmazzák', () => {
    const text = JSON.stringify(sb400Details(base))
    for (const fact of ['215,8 × 39,8', '3,66 kg/m', '1200 N', '600 N', '85 × 212', '6,48 kg/m', '85 × 150', '4,83 kg/m', 'ø14,2', 'C20/25', '91,6 × 75', '0,04 l/s/m²', '50 kg/m²', '400 Pa', '45 km/h']) expect(text, fact).toContain(fact)
    expect(SB400_SOURCE).toContain('SB 400')
  })

  it('LED-kártya csak akkor van, ha a tervben van LED; minden kártyának egyedi azonosítója és legalább 3 sora van', () => {
    expect(sb400Details(base).some((detail) => detail.id === 'led')).toBe(false)
    const withLed = sb400Details({ ...base, led: true })
    expect(withLed.some((detail) => detail.id === 'led')).toBe(true)
    expect(new Set(withLed.map((detail) => detail.id)).size).toBe(withLed.length)
    withLed.forEach((detail) => expect(detail.rows.length).toBeGreaterThanOrEqual(3))
  })
})
