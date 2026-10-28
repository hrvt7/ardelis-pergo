import { describe, expect, it } from 'vitest'
import { glassPanels } from '../src/lib/glass'

describe('tolóüveg-fal', () => {
  it('nyitva és zárva is minden panel a kereten belül marad, 2,5–7 m között 5 cm-enként', () => {
    for (let cm = 250; cm <= 700; cm += 5) {
      const length = cm / 100
      const { count, width, position } = glassPanels(length)
      expect(count % 2).toBe(0)
      for (let index = 0; index < count; index++) for (const opened of [false, true]) {
        expect(position(index, opened) - width / 2).toBeGreaterThanOrEqual(-length / 2 + 0.06 - 1e-9)
        expect(position(index, opened) + width / 2).toBeLessThanOrEqual(length / 2 - 0.06 + 1e-9)
      }
    }
  })
  it('a panelek szélessége életszerű (0,8–1,65 m)', () => {
    for (let cm = 250; cm <= 700; cm += 5) {
      const { width } = glassPanels(cm / 100)
      expect(width).toBeGreaterThan(0.8)
      expect(width).toBeLessThan(1.65)
    }
  })
})
