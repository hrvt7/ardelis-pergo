import { describe, expect, it } from 'vitest'
import { classifyWheel, clampTarget, groundPolarLimit, keepClearOfHouse, MAX_POLAR, MIN_EYE, pivotDepth, targetMargin, TRACKPAD_LATCH_MS } from '../src/lib/desktopCamera'

const wheel = (patch: Partial<Parameters<typeof classifyWheel>[0]>) => ({ deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, ...patch })

describe('görgetés: eltolás vagy nagyítás', () => {
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
})

describe('forgáspont és eltolás határa', () => {
  const size = { width: 5, depth: 4, height: 2.6 }
  it('a forgáspont a pergola körüli dobozban marad (legalább 4 m ráhagyással)', () => {
    expect(targetMargin(size)).toBe(4)
    expect(targetMargin({ width: 12, depth: 4 })).toBeCloseTo(7.2, 9)
    expect(clampTarget([20, -3, -20], size)).toEqual([6.5, 0, -6])
    expect(clampTarget([1, 1.5, 1], size)).toEqual([1, 1.5, 1])
    expect(clampTarget([0, 9, 0], size)[1]).toBeCloseTo(5.6, 9)
  })
  it('fali rögzítésnél a forgáspont nem kerül a fal (ház, szárny) mögé, a nyitott oldalakon szabad', () => {
    expect(clampTarget([0, 1, -9], size, { back: true })[2]).toBeCloseTo(-2.1, 9)
    expect(clampTarget([-9, 1, 0], size, { left: true })[0]).toBeCloseTo(-2.6, 9)
    expect(clampTarget([9, 1, 0], size, { left: true })[0]).toBe(6.5)
    expect(clampTarget([0, 1, 9], size, { back: true })[2]).toBe(6)
  })
})

describe('függőleges forgatás: felülnézet és alulnézet, föld alá nem', () => {
  it('a kamera a megengedett legmeredekebb szögben is a talaj fölött marad', () => {
    for (const [targetY, distance] of [[1.1, 12], [1.1, 3], [2.6, 1.5], [0, 20], [0.3, 0.8]]) {
      const polar = groundPolarLimit(targetY, distance)
      const eye = targetY + distance * Math.cos(polar)
      expect(eye).toBeGreaterThanOrEqual(MIN_EYE - 1e-9)
      expect(polar).toBeLessThanOrEqual(MAX_POLAR)
    }
  })
  it('a tető alatti közeli célpontnál meredek alulnézet érhető el; távolról alig vízszintes alá', () => {
    expect(groundPolarLimit(2.6, 1.5)).toBeCloseTo(MAX_POLAR, 9)
    expect(groundPolarLimit(1.1, 3)).toBeGreaterThan(Math.PI * 0.58)
    expect(groundPolarLimit(1.1, 20)).toBeLessThan(Math.PI * 0.52)
    expect(groundPolarLimit(1.1, 20)).toBeGreaterThan(Math.PI / 2)
  })
})

describe('nagyítás a felület elé (nem hatol át a modellen)', () => {
  it('a forgáspont a közelebbi felületre ugrik, de a legkisebb távolságnál nem közelebb', () => {
    expect(pivotDepth(4, 10, 0.8)).toBe(4)
    expect(pivotDepth(0.5, 10, 0.8)).toBeCloseTo(0.82, 9)
  })
  it('nincs találat, mögöttünk vagy a célpont mögött lévő felület: marad a mostani', () => {
    expect(pivotDepth(null, 10, 0.8)).toBeNull()
    expect(pivotDepth(-1, 10, 0.8)).toBeNull()
    expect(pivotDepth(12, 10, 0.8)).toBeNull()
    expect(pivotDepth(9.98, 10, 0.8)).toBeNull()
  })
})

describe('követő kamera: önálló pergolánál nem áll a házba', () => {
  it('a homlokzat mögé eső célállást elé húzza és megemeli', () => {
    const [x, y, z] = keepClearOfHouse([1, 4, -12], -6.5)
    expect(x).toBe(1)
    expect(z).toBeCloseTo(-5.6, 9)
    expect(y).toBeCloseTo(4 + 6.4 * 0.55, 9)
  })
  it('ház nélkül vagy a homlokzat előtt változatlan', () => {
    expect(keepClearOfHouse([1, 4, -12], null)).toEqual([1, 4, -12])
    expect(keepClearOfHouse([1, 4, 3], -6.5)).toEqual([1, 4, 3])
  })
})
