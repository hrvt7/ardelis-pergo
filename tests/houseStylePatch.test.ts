import { describe, expect, it } from 'vitest'
import { defaultWallColor, houseStylePatch } from '../src/lib/house'

const base = { houseStyle: 'classic' as const, wallFinish: 'cedar' as const, wallColor: defaultWallColor('cedar'), ground: 'studio' as const }

describe('háztípus választása', () => {
  it('stúdió háttérből a „Családi ház” környezetre vált, különben a vevő nem látná a házat', () => {
    expect(houseStylePatch(base, 'modern').ground).toBe('terrace')
    expect(houseStylePatch(base, 'classic')).toEqual({ ground: 'terrace' })
  })
  it('családi ház környezetben nem nyúl a környezethez', () => {
    expect(houseStylePatch({ ...base, ground: 'terrace' }, 'gable').ground).toBeUndefined()
    expect(houseStylePatch({ ...base, ground: 'terrace' }, 'classic')).toEqual({})
  })
  it('modellezett házra váltva az eredeti fa burkolatból fehér vakolat lesz; visszaváltva újra fa', () => {
    const toModern = houseStylePatch({ ...base, ground: 'terrace' }, 'modern')
    expect(toModern).toMatchObject({ houseStyle: 'modern', wallFinish: 'plaster', wallColor: defaultWallColor('plaster') })
    const back = houseStylePatch({ houseStyle: 'modern', wallFinish: 'plaster', wallColor: defaultWallColor('plaster'), ground: 'terrace' }, 'classic')
    expect(back).toMatchObject({ houseStyle: 'classic', wallFinish: 'cedar' })
  })
  it('a vevő saját homlokzatszínét nem írja felül', () => {
    const patch = houseStylePatch({ houseStyle: 'classic', wallFinish: 'cedar', wallColor: '#123456', ground: 'terrace' }, 'gable')
    expect(patch).toEqual({ houseStyle: 'gable' })
  })
})
