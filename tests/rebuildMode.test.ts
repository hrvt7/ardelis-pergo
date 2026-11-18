import { describe, expect, it } from 'vitest'
import { isRebuildMode, moduleVisible, REBUILD_MODULES, REBUILT_MODULES, type RebuildModule } from '../src/lib/rebuildMode'

describe('újraépítési mód', () => {
  it('csak a pontos paraméterre kapcsol be', () => {
    expect(isRebuildMode('?mod=ujraepites')).toBe(true)
    expect(isRebuildMode('?style=glass&mod=ujraepites&freeze=2')).toBe(true)
    expect(isRebuildMode('')).toBe(false)
    expect(isRebuildMode('?mod=other')).toBe(false)
    expect(isRebuildMode('?ujraepites')).toBe(false)
  })

  it('paraméter nélkül minden modul látszik (az éles felület változatlan)', () => {
    for (const module of REBUILD_MODULES) expect(moduleVisible(module, false)).toBe(true)
  })

  it('újraépítési módban csak a visszaépített modulok látszanak (most: M01–M03, M05–M09)', () => {
    expect([...REBUILT_MODULES]).toEqual(['M01', 'M02', 'M03', 'M05', 'M06', 'M07', 'M08', 'M09'])
    for (const module of REBUILD_MODULES) expect(moduleVisible(module, true)).toBe(['M01', 'M02', 'M03', 'M05', 'M06', 'M07', 'M08', 'M09'].includes(module))
  })

  it('a visszaépített modul újraépítési módban is látszik', () => {
    const rebuilt = new Set<RebuildModule>(['M01'])
    expect(moduleVisible('M01', true, rebuilt)).toBe(true)
    expect(moduleVisible('M02', true, rebuilt)).toBe(false)
  })
})
