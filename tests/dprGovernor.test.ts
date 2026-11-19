import { describe, expect, it } from 'vitest'
import { applyDprCap, DPR_GOVERNOR, nextDprCap } from '../src/lib/quality'

describe('finom felbontás-szabályozás (kézi szint, bemutató mód)', () => {
  it('lassú ablakban lépésenként csökken, de nem a padló alá', () => {
    expect(nextDprCap(null, 0.05, 2)).toBe(1.85)
    expect(nextDprCap(1.85, 0.05, 2)).toBe(1.7)
    expect(nextDprCap(0.9, 0.05, 1)).toBe(DPR_GOVERNOR.floor)
    expect(nextDprCap(DPR_GOVERNOR.floor, 0.08, 1)).toBe(DPR_GOVERNOR.floor)
  })
  it('gyors ablakban visszanő, a szint saját értékénél megszűnik a korlát', () => {
    expect(nextDprCap(1.7, 0.01, 2)).toBe(1.8)
    expect(nextDprCap(1.95, 0.01, 2)).toBeNull()
    expect(nextDprCap(null, 0.01, 2)).toBeNull()
  })
  it('köztes képkocka-időnél nem változik (nincs ide-oda ugrálás)', () => {
    expect(nextDprCap(1.5, 0.025, 2)).toBe(1.5)
    expect(nextDprCap(null, 0.025, 2)).toBeNull()
  })
  it('a korlát a tartományra: a felső határ és szükség esetén az alsó is lejjebb megy', () => {
    expect(applyDprCap([1, 2], null)).toEqual([1, 2])
    expect(applyDprCap([1, 2], 1.4)).toEqual([1, 1.4])
    expect(applyDprCap([1, 2], 0.85)).toEqual([0.85, 0.85])
    expect(applyDprCap([1, 1.2], 1.5)).toEqual([1, 1.2])
  })
})
