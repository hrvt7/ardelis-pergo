/**
 * Újraépítési mód (`?mod=ujraepites`): a konfigurátor felülete modulonként épül újra
 * (docs/rebuild/REBUILD_ROADMAP.md).
 *
 * M19 (2026-11-18, Ádám döntése): az új felület az éles alapértelmezés. A régi felület a kódban marad, és a
 * `?mod=regi` paraméterrel még elérhető (tartalék). A `?mod=ujraepites` előnézet: ugyanaz az új felület, de nem ír
 * a böngészőbe és nem mér.
 *
 * A regiszter mondja meg, melyik visszaépített modul látszik már az újraépítési módban.
 * M00: csak a 3D. M01: lépéssáv és lebegő lépéskártya. M02–M03: a „Hely és méret” lépés (rögzítés, méretek, modulok, berendezés). M05: ársáv. M06–M07: a „Tető” lépés. M08: az „Oldalak” lépés és a 3D-n belüli kattintások. M09: a „Szín” lépés. M11: a „Komfort” lépés. M12: a „Termék” lépés (építménytípus, kiinduló csomagok). M13: Nézet és Környezet eszköztár. M14–M15: az „Összegzés” lépés és az ajánlatkérés.
 */

export const REBUILD_PARAM = 'mod'
export const REBUILD_VALUE = 'ujraepites'
export const LEGACY_VALUE = 'regi'

export const REBUILD_MODULES = ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17', 'M18'] as const
export type RebuildModule = (typeof REBUILD_MODULES)[number]

/** A már visszaépített (az újraépítési módban látható) modulok. Minden jóváhagyott modul ide kerül. */
export const REBUILT_MODULES: ReadonlySet<RebuildModule> = new Set<RebuildModule>(['M01', 'M02', 'M03', 'M05', 'M06', 'M07', 'M08', 'M09', 'M11', 'M12', 'M13', 'M14', 'M15'])

export function isRebuildMode(search: string): boolean {
  try { return new URLSearchParams(search).get(REBUILD_PARAM) === REBUILD_VALUE } catch { return false }
}

/** A régi felület kérése (`?mod=regi`, tartalék). */
export function isLegacyUi(search: string): boolean {
  try { return new URLSearchParams(search).get(REBUILD_PARAM) === LEGACY_VALUE } catch { return false }
}

/** Az új felület fut-e: élesben alapértelmezés, csak `?mod=regi` kapcsolja ki. */
export function isNewUi(search: string): boolean {
  return !isLegacyUi(search)
}

/** Látszik-e egy modul: élesben mindig, újraépítési módban csak ha már visszaépült. */
export function moduleVisible(module: RebuildModule, rebuild: boolean, rebuilt: ReadonlySet<RebuildModule> = REBUILT_MODULES): boolean {
  return !rebuild || rebuilt.has(module)
}

/** Az aktuális oldal újraépítési módban nyílt-e (böngészőn kívül: nem). */
export function currentRebuildMode(): boolean {
  return typeof window !== 'undefined' && isRebuildMode(window.location.search)
}

/** Az aktuális oldal az új felületet mutatja-e (böngészőn kívül: igen). */
export function currentNewUi(): boolean {
  return typeof window === 'undefined' || isNewUi(window.location.search)
}
