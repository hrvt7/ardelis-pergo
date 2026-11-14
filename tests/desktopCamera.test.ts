import { describe, expect, it } from 'vitest'
import { classifyWheel, clampTarget, TRACKPAD_LATCH_MS } from '../src/lib/desktopCamera'

const wheel = (patch: Partial<Parameters<typeof classifyWheel>[0]>) => ({ deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, ...patch })

describe('asztali kameravezérlés', () => {
  it('csípés (ctrlKey) mindig nagyítás, akkor is, ha épp eltolás ment', () => {
    expect(classifyWheel(wheel({ deltaY: 3.5, ctrlKey: true }), 1000, 1100)).toBe('zoom')
  })
  it('egérgörgő (120-as lépés vagy soronkénti mód) nagyítás', () => {
    expect(classifyWheel(wheel({ deltaY: 100, wheelDeltaY: -120 }), 0, 10_000)).toBe('zoom')
    expect(classifyWheel(wheel({ deltaY: 3, deltaMode: 1 }), 0, 10_000)).toBe('zoom')
  })
  it('két ujjas érintőpad-görgetés eltolás (oldalirányú vagy finom függőleges)', () => {
    expect(classifyWheel(wheel({ deltaX: 6, deltaY: 1 }), 0, 10_000)).toBe('pan')
    expect(classifyWheel(wheel({ deltaY: 4, wheelDeltaY: -12 }), 0, 10_000)).toBe('pan')
    expect(classifyWheel(wheel({ deltaY: 2.75 }), 0, 10_000)).toBe('pan')
  })
  it('egy megkezdett eltolás közben a görgetés nem vált át nagyításra', () => {
    expect(classifyWheel(wheel({ deltaY: 100, wheelDeltaY: -120 }), 1000, 1000 + TRACKPAD_LATCH_MS - 1)).toBe('pan')
    expect(classifyWheel(wheel({ deltaY: 100, wheelDeltaY: -120 }), 1000, 1000 + TRACKPAD_LATCH_MS + 1)).toBe('zoom')
  })
  it('a célpont a pergola körüli dobozban marad', () => {
    expect(clampTarget([20, -3, -20], { width: 5, depth: 4, height: 2.6 })).toEqual([5, 0, -4.5])
    expect(clampTarget([1, 1.5, 1], { width: 5, depth: 4, height: 2.6 })).toEqual([1, 1.5, 1])
  })
})
