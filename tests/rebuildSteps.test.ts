import { describe, expect, it } from 'vitest'
import { STEPS } from '../src/lib/configSteps'
import { clampNotch, notchPad, NOTCH_COMPACT, NOTCH_DESKTOP, neighbourStep, notchPath, REBUILD_STEPS, rebuildStepIndex, slotCenter } from '../src/lib/rebuildSteps'

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

describe('bemélyedéses lépéssáv', () => {
  const width = 480
  const pad = 30

  it('minden lépés a sávon belül és sorrendben van', () => {
    const centers = REBUILD_STEPS.map((_, index) => slotCenter(index, REBUILD_STEPS.length, width, pad))
    expect(centers[0]).toBeGreaterThan(pad)
    expect(centers[6]).toBeLessThan(width - pad)
    for (let i = 1; i < centers.length; i++) expect(centers[i]).toBeGreaterThan(centers[i - 1])
  })

  it('a bemélyedés a széleken sem lóg a sarokba', () => {
    for (const g of [NOTCH_DESKTOP, NOTCH_COMPACT]) {
      expect(clampNotch(0, width, g)).toBe(g.corner + g.notch + g.shoulder)
      expect(clampNotch(width, width, g)).toBe(width - g.corner - g.notch - g.shoulder)
      expect(clampNotch(240, width, g)).toBe(240)
    }
  })

  it('a számolt margóval a szélső lépések is pontosan a bemélyedésben ülnek (asztal és telefon)', () => {
    for (const [w, g] of [[480, NOTCH_DESKTOP], [366, NOTCH_COMPACT], [320, NOTCH_COMPACT]] as const) {
      const p = notchPad(w, 7, g)
      for (const index of [0, 6]) {
        const x = slotCenter(index, 7, w, p)
        expect(Math.abs(clampNotch(x, w, g) - x)).toBeLessThan(1e-9)
      }
    }
  })

  it('érvényes, zárt SVG-útvonal, a bemélyedés az adott helyen', () => {
    const path = notchPath(width, 240, NOTCH_DESKTOP)
    expect(path.startsWith('M ')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
    expect(path).not.toMatch(/NaN|undefined/)
    expect(path).toContain(`A ${NOTCH_DESKTOP.notch} ${NOTCH_DESKTOP.notch} 0 0 0 ${240 + NOTCH_DESKTOP.notch} ${NOTCH_DESKTOP.dip}`)
  })

  it('függőleges változat: a bemélyedés a bal oldalon, az adott magasságban', () => {
    const path = notchPath(400, 200, NOTCH_COMPACT, true)
    expect(path).not.toMatch(/NaN|undefined/)
    // A bemélyedés íve a bal széltől `dip` távolságra, a 200 ± notch magasságok között fut.
    expect(path).toContain(`A ${NOTCH_COMPACT.notch} ${NOTCH_COMPACT.notch} 0 0 1 ${NOTCH_COMPACT.dip} ${200 + NOTCH_COMPACT.notch}`)
    expect(path).toContain(`M 0 ${NOTCH_COMPACT.corner}`)
  })
})
