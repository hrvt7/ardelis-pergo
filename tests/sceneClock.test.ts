import { describe, expect, it } from 'vitest'
import { readFrozenSeconds, sceneTime, SCENE_FROZEN, stillMotion } from '../src/lib/sceneClock'
import { demoAngle } from '../src/lib/louvreSystem'

describe('jelenet órája: ?freeze= kimerevítés', () => {
  it('a freeze paramétert másodpercként olvassa, a hibás értéket elveti', () => {
    expect(readFrozenSeconds('?freeze=3.2')).toBe(3.2)
    expect(readFrozenSeconds('?quality=ultra&freeze=0')).toBe(0)
    expect(readFrozenSeconds('?freeze=4,5')).toBe(4.5)
    expect(readFrozenSeconds('')).toBeNull()
    expect(readFrozenSeconds('?freeze=')).toBeNull()
    expect(readFrozenSeconds('?freeze=abc')).toBeNull()
    expect(readFrozenSeconds('?freeze=-1')).toBeNull()
  })
  it('kimerevítés nélkül az élő idő megy tovább (Node alatt nincs URL)', () => {
    expect(SCENE_FROZEN).toBe(false)
    expect(sceneTime(12.5)).toBe(12.5)
    expect(stillMotion(false)).toBe(false)
    expect(stillMotion(true)).toBe(true)
  })
  it('a Működés-bemutató állása csak az időtől függ: ugyanaz az idő, ugyanaz a kép', () => {
    for (const t of [0, 1.4, 3.2, 7.7, 9.1, 14.2, 100.3]) expect(demoAngle(t)).toEqual(demoAngle(t))
    expect(demoAngle(0).angle).toBe(0)
    expect(demoAngle(1.4 + 5.5 + 0.9).angle).toBe(110)
  })
})
