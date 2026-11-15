import { describe, expect, it } from 'vitest'
import { walkIntent } from '../src/lib/walkInput'

const input = (keys: string[] = [], stickX = 0, stickY = 0) => ({ keys: new Set(keys), stickX, stickY })

describe('bejárás: bemenet', () => {
  it('W / felfelé nyíl előre, S hátra, A/D oldalt lép', () => {
    expect(walkIntent(input(['w']))).toEqual([0, 1, 0])
    expect(walkIntent(input(['arrowup']))).toEqual([0, 1, 0])
    expect(walkIntent(input(['s']))).toEqual([0, -1, 0])
    expect(walkIntent(input(['a']))).toEqual([-1, 0, 0])
    expect(walkIntent(input(['d']))).toEqual([1, 0, 0])
  })
  it('a bal/jobb nyíl fordul, nem lép', () => {
    expect(walkIntent(input(['arrowleft']))).toEqual([0, 0, 1])
    expect(walkIntent(input(['arrowright']))).toEqual([0, 0, -1])
  })
  it('a joystick arányos, és a billentyűvel együtt sem lépi túl a teljes sebességet', () => {
    expect(walkIntent(input([], 0.5, 0.25))).toEqual([0.5, 0.25, 0])
    expect(walkIntent(input(['w'], 0, 1))).toEqual([0, 1, 0])
  })
})
