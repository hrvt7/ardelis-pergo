import { describe, expect, it } from 'vitest'
import { isLegacyUi, isNewUi, isRebuildMode, moduleVisible, REBUILD_MODULES, REBUILT_MODULES, type RebuildModule } from '../src/lib/rebuildMode'

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

  it('újraépítési módban csak a visszaépített modulok látszanak (most: M01–M03, M05–M09, M11–M15)', () => {
    expect([...REBUILT_MODULES]).toEqual(['M01', 'M02', 'M03', 'M05', 'M06', 'M07', 'M08', 'M09', 'M11', 'M12', 'M13', 'M14', 'M15'])
    for (const module of REBUILD_MODULES) expect(moduleVisible(module, true)).toBe(['M01', 'M02', 'M03', 'M05', 'M06', 'M07', 'M08', 'M09', 'M11', 'M12', 'M13', 'M14', 'M15'].includes(module))
  })

  it('a visszaépített modul újraépítési módban is látszik', () => {
    const rebuilt = new Set<RebuildModule>(['M01'])
    expect(moduleVisible('M01', true, rebuilt)).toBe(true)
    expect(moduleVisible('M02', true, rebuilt)).toBe(false)
  })

  it('M19: az új felület az éles alapértelmezés, csak ?mod=regi hozza vissza a régit', () => {
    expect(isNewUi('')).toBe(true)
    expect(isNewUi('?mod=ujraepites')).toBe(true)
    expect(isNewUi('?embed=1')).toBe(true)
    expect(isNewUi('?mod=regi')).toBe(false)
    expect(isLegacyUi('?style=glass&mod=regi')).toBe(true)
    expect(isLegacyUi('?mod=ujraepites')).toBe(false)
  })
})
