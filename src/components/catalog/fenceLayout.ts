// A kerítés-rendszer elrendezésének közös méretei (3D modell, méretvonalak, kamera).
import type { OutdoorConfig } from '@/types/catalog'

/** A kiskapu teljes szélessége oszloptól oszlopig (m). */
export const PED_WIDTH = 1

/** A rendszer teljes hossza: kerítés + kapunyílás + kiskapu. */
export function fenceSystemLength(config: OutdoorConfig) {
  return config.length + (config.gateType === 'none' ? 0 : config.gateWidth) + (config.pedestrianGate ? PED_WIDTH : 0)
}
