import { describe, expect, it } from 'vitest'
import { DEMO_DEVICE_KEY, demoParam, effectiveQualityLevel, governorEnabled, readDemoDevice, writeDemoDevice } from '../src/lib/demoDevice'
import { resolveQualityTier } from '../src/lib/quality'

const memory = () => {
  const store = new Map<string, string>()
  return { store, getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) }, removeItem: (k: string) => { store.delete(k) } }
}

describe('bemutató eszköz mód', () => {
  it('?bemutato=1 bekapcsol és megjegyzi, ?bemutato=0 kikapcsol', () => {
    const storage = memory()
    expect(demoParam('')).toBeNull()
    expect(readDemoDevice('?bemutato=1', storage)).toBe(true)
    expect(storage.store.get(DEMO_DEVICE_KEY)).toBe('1')
    // Paraméter nélkül a megjegyzett választás marad.
    expect(readDemoDevice('', storage)).toBe(true)
    expect(readDemoDevice('?bemutato=0', storage)).toBe(false)
    expect(readDemoDevice('', storage)).toBe(false)
    expect(storage.store.has(DEMO_DEVICE_KEY)).toBe(false)
  })
  it('privát mód (a tárhely kivételt dob): nem omlik össze, csak nem jegyzi meg', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
    expect(readDemoDevice('', broken)).toBe(false)
    expect(readDemoDevice('?bemutato=1', broken)).toBe(true)
    expect(() => writeDemoDevice(false, broken)).not.toThrow()
    expect(readDemoDevice('', null)).toBe(false)
  })
  it('bekapcsolva a 3D minőség fixen ultra, bármit választottak kézzel', () => {
    for (const level of ['auto', 'low', 'medium', 'high', 'ultra', 'mobile'] as const) {
      expect(effectiveQualityLevel(level, true)).toBe('ultra')
      expect(resolveQualityTier(effectiveQualityLevel(level, true), 'low')).toBe('ultra')
    }
  })
  it('kikapcsolva a kézi választó érvényes (a régi viselkedés)', () => {
    expect(effectiveQualityLevel('medium', false)).toBe('medium')
    expect(resolveQualityTier(effectiveQualityLevel('auto', false), 'high')).toBe('high')
  })
  it('a FrameGovernor csak automatikus szinten léptet vissza; bemutató módban és kézi szintnél soha', () => {
    expect(governorEnabled('auto', false, true)).toBe(true)
    expect(governorEnabled('auto', false, false)).toBe(false)
    expect(governorEnabled('auto', true, true)).toBe(false)
    expect(governorEnabled('high', false, true)).toBe(false)
    expect(governorEnabled('ultra', true, true)).toBe(false)
  })
})
