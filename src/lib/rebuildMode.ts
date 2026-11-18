/**
 * Újraépítési mód (`?mod=ujraepites`): a konfigurátor felülete modulonként épül újra
 * (docs/rebuild/REBUILD_ROADMAP.md). Paraméter nélkül semmi nem változik: az éles felület a mai.
 *
 * A regiszter mondja meg, melyik visszaépített modul látszik már az újraépítési módban.
 * M00: csak a 3D. M01: lépéssáv és lebegő lépéskártya.
 */

export const REBUILD_PARAM = 'mod'
export const REBUILD_VALUE = 'ujraepites'

export const REBUILD_MODULES = ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17', 'M18'] as const
export type RebuildModule = (typeof REBUILD_MODULES)[number]

/** A már visszaépített (az újraépítési módban látható) modulok. Minden jóváhagyott modul ide kerül. */
export const REBUILT_MODULES: ReadonlySet<RebuildModule> = new Set<RebuildModule>(['M01'])

export function isRebuildMode(search: string): boolean {
  try { return new URLSearchParams(search).get(REBUILD_PARAM) === REBUILD_VALUE } catch { return false }
}

/** Látszik-e egy modul: élesben mindig, újraépítési módban csak ha már visszaépült. */
export function moduleVisible(module: RebuildModule, rebuild: boolean, rebuilt: ReadonlySet<RebuildModule> = REBUILT_MODULES): boolean {
  return !rebuild || rebuilt.has(module)
}

/** Az aktuális oldal újraépítési módban nyílt-e (böngészőn kívül: nem). */
export function currentRebuildMode(): boolean {
  return typeof window !== 'undefined' && isRebuildMode(window.location.search)
}
