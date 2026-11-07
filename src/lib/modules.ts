// Modulos (összekapcsolt) pergola: több mező egymás mellett, közös oszlopokkal és gerendával,
// hosszú teraszra és vendéglátó terekre. A `width` a teljes szélesség, a `modules` a mezők száma;
// egy mező szélessége a gyártó szélességkorlátján belül marad. Böngészőben és szerveren is fut.
import type { PergolaConfig } from '../types/pergola'

export const MAX_MODULES = 4

type Sized = Pick<PergolaConfig, 'width' | 'modules'>

export const moduleCount = (config: Pick<PergolaConfig, 'modules'>) => Math.max(1, Math.min(MAX_MODULES, Math.round(config.modules ?? 1)))

/** Egy mező (modul) szélessége méterben. */
export const bayWidth = (config: Sized) => config.width / moduleCount(config)

/** A mezők közti közös oszlopsorok x-koordinátái (a pergola közepéhez képest). */
export function bayBoundaries(config: Sized): number[] {
  const n = moduleCount(config)
  const bay = bayWidth(config)
  return Array.from({ length: n - 1 }, (_, index) => -config.width / 2 + (index + 1) * bay)
}

/** Egy mező középvonala az adott indexnél. */
export const bayCenter = (config: Sized, index: number) => -config.width / 2 + (index + 0.5) * bayWidth(config)

/** 6 m feletti fesztávú mezők: középoszlop kell az elülső gerenda alá (mezőnként). */
export const middlePostCount = (config: Sized) => (bayWidth(config) > 6 ? moduleCount(config) : 0)

/**
 * Van-e oszlop a pergola közepén (x = 0) az elülső gerenda alatt: páros modulszámnál a mezőhatár,
 * páratlannál a középső mező középoszlopa áll ott. A félbe osztott elülső oldal ehhez igazodik.
 */
export const hasCenterPost = (config: Sized) => (moduleCount(config) % 2 === 0 ? true : bayWidth(config) > 6)

/** „2 × 5,00 m” jellegű felirat; egy modulnál üres. */
export function modulesLabel(config: Sized, format: (value: number) => string) {
  const n = moduleCount(config)
  return n > 1 ? `${n} × ${format(bayWidth(config))} m` : ''
}
