// Komfort-opciók közös adatai (RGB-előnézet színei, okosotthon-vezérlés hatóköre).
import { isMovableRoof } from './roofs'
import { closedSegments } from './sides'
import type { PergolaConfig } from '../types/pergola'

/** RGB-előnézet színei (a valódi vezérlő 16 millió színt tud; ezek a jellemző jelenetek). */
export const RGB_SWATCHES = [
  { hex: '#ff5a3c', name: 'Naplemente' },
  { hex: '#ffb23f', name: 'Borostyán' },
  { hex: '#ff4fa3', name: 'Pink' },
  { hex: '#a45bff', name: 'Lila' },
  { hex: '#3f7bff', name: 'Kék' },
  { hex: '#2fd6c4', name: 'Türkiz' },
  { hex: '#6bf26b', name: 'Zöld' },
] as const

/** Mit vezérel az okosotthon-központ ebben a tervben. */
export function smartHomeTargets(config: PergolaConfig) {
  const zips = closedSegments(config).filter((segment) => segment.type === 'zip').length
  return [
    isMovableRoof(config.roof) ? 'tető' : null,
    zips ? `${zips} ZIP` : null,
    config.led ? (config.ledRgb ? 'RGB LED' : 'LED') : null,
    config.heaters ? 'fűtés' : null,
    config.fans ? 'ventilátor' : null,
  ].filter((item): item is string => Boolean(item))
}

