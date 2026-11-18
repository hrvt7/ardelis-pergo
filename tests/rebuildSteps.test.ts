import { describe, expect, it } from 'vitest'
import { STEPS } from '../src/lib/configSteps'
import { sunPosition } from '../src/lib/lightBalance'
import { sunVectorInScene } from '../src/lib/sun'
import { FACINGS, neighbourStep, sunDirectionForFacing, REBUILD_STEPS, rebuildStepIndex } from '../src/lib/rebuildSteps'

describe('újraépített lépések', () => {
  it('ugyanaz a 7 lépés, ugyanabban a sorrendben, mint a meglévő logikában', () => {
    expect(REBUILD_STEPS.map((step) => step.id)).toEqual(STEPS.map((step) => step.id))
    expect(REBUILD_STEPS.every((step) => step.label && step.question)).toBe(true)
  })

  it('a szomszédos lépés nem lép túl a végeken', () => {
    expect(neighbourStep('size', -1)).toBeNull()
    expect(neighbourStep('size', 1)).toBe('mount')
    expect(neighbourStep('summary', 1)).toBeNull()
    expect(neighbourStep('summary', -1)).toBe('extras')
    expect(rebuildStepIndex('roof')).toBe(2)
  })
})

describe('lépéssáv a kártya tetején', () => {
  it('a rövid nevek elférnek', () => {
    expect(REBUILD_STEPS.every((step) => step.short.length <= 9)).toBe(true)
  })
})

describe('tájolás', () => {
  it('a délre néző terasz az alaphelyzet; a többi égtáj elforgatja a napívet', () => {
    expect(sunDirectionForFacing(180)).toBe(0)
    expect(sunDirectionForFacing(0)).toBe(180)
    expect(sunDirectionForFacing(90)).toBe(270)
    expect(sunDirectionForFacing(270)).toBe(90)
    expect(FACINGS.map((item) => item.degrees)).toEqual([0, 90, 180, 270])
  })

  it('a jelenet napja minden tájolásnál ugyanarról az oldalról süt, mint a valós nap (dél, 12 óra)', () => {
    for (const facing of [0, 90, 180, 270]) {
      const [x, , z] = sunPosition(13, sunDirectionForFacing(facing))
      const [rx, , rz] = sunVectorInScene({ azimuth: 180, elevation: 40 } as never, facing)
      // Egy irányba mutatnak (pozitív skalárszorzat a vízszintes síkon).
      expect(x * rx + z * rz).toBeGreaterThan(0)
    }
  })
})
