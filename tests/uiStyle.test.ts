import { describe, expect, it } from 'vitest'
import { glassViewShiftX, panelWidthFor, resolveUiStyle } from '../src/lib/uiStyle'

describe('felületi stílus', () => {
  it('a ?style= paraméter választ, különben a megjegyzett, végül a jelenlegi (soft)', () => {
    expect(resolveUiStyle('?style=glass', null)).toBe('glass')
    expect(resolveUiStyle('?style=soft', 'glass')).toBe('soft')
    expect(resolveUiStyle('', 'glass')).toBe('glass')
    expect(resolveUiStyle('?style=valami', null)).toBe('soft')
    expect(resolveUiStyle('', 'hibás')).toBe('soft')
  })
  it('a panelszélesség a CSS töréspontjait követi', () => {
    expect(panelWidthFor(1440)).toBe(420)
    expect(panelWidthFor(1280)).toBe(380)
    expect(panelWidthFor(1024)).toBe(380)
    expect(panelWidthFor(1000)).toBe(344)
    expect(panelWidthFor(390)).toBe(0)
  })
  it('üveges nézetben a kép a panel felével balra tolódik, mobilon nem', () => {
    expect(glassViewShiftX(1440, 1416)).toBeCloseTo((420 + 24) / 2 / 1416, 6)
    expect(glassViewShiftX(390, 390)).toBe(0)
  })
})
