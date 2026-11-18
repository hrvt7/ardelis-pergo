import { describe, expect, it } from 'vitest'
import { STEPS } from '../src/lib/configSteps'
import { dockPath, neighbourStep, REBUILD_STEPS, rebuildStepIndex } from '../src/lib/rebuildSteps'

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
  it('a felső dokk zárt alakzat, a két homorú átmenettel a kártya széléhez', () => {
    const path = dockPath(340, 84, 18, 24)
    expect(path).toMatch(/^M -18 0 L 358 0 A 18 18 0 0 0 340 18/)
    expect(path).toContain('A 18 18 0 0 0 -18 0')
    expect(path.endsWith('Z')).toBe(true)
    expect(REBUILD_STEPS.every((step) => step.short.length <= 9)).toBe(true)
  })
})
