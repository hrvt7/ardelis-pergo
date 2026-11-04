import type { PergolaConfig, SideKey } from '@/types/pergola'

export interface Advice { id: string; level: 'info' | 'warn'; text: string }

const SIDES: SideKey[] = ['front', 'back', 'left', 'right']
const GLASS = new Set(['glass', 'glassFramed', 'glassFixed'])

/** Beállításfüggő, magyarázó figyelmeztetések és javaslatok (tiszta függvény, nincs mellékhatás). */
export function getAdvice(config: PergolaConfig): Advice[] {
  const out: Advice[] = []
  const span = Math.max(config.width, config.depth)
  const glassSides = SIDES.filter((side) => GLASS.has(config.sides[side]))
  const slidingGlass = glassSides.filter((side) => config.sides[side] === 'glass')
  const freestanding = config.mount === 'freestanding'

  if (slidingGlass.some((side) => (side === 'front' || side === 'back' ? config.width : config.depth) > 4.5)) {
    out.push({ id: 'wide-glass', level: 'warn', text: 'Ezzel a mérettel a tolóüveg fala jelentősen megdrágul (több sín, nagyobb tokozás). Fix vagy kerettel osztott üveg olcsóbb lehet.' })
  }
  if (config.height > 2.9 && !GLASS.has(config.sides.front) && config.sides.front !== 'none') {
    out.push({ id: 'tall-infill', level: 'info', text: 'Ehhez a magassághoz a nagy zárt felületeknél ajánlott a merevítés — a felmérésnél egyeztetjük.' })
  }
  if (freestanding && span > 5 && config.roof === 'louvered') {
    out.push({ id: 'span-posts', level: 'warn', text: 'Önálló szerkezetnél 5 m felett köztes oszlop vagy erősebb gerenda kellhet a szélteher miatt.' })
  }
  if (freestanding && config.height > 3 && glassSides.length >= 2) {
    out.push({ id: 'wind-load', level: 'warn', text: 'Magas, több oldalon üvegezett szabadon álló pergolánál a szélteher miatt a statikai ellenőrzés kötelező.' })
  }
  if (config.roof === 'glass' && !config.roofShade) {
    out.push({ id: 'glass-heat', level: 'info', text: 'Üvegtetőnél nyáron erős a felmelegedés — árnyékoló (tető alatti vagy feletti) erősen ajánlott.' })
  }
  if (config.heaters > 0 && SIDES.every((side) => config.sides[side] === 'none')) {
    out.push({ id: 'heater-open', level: 'info', text: 'Nyitott oldalaknál a hősugárzó hatékonysága csökken; legalább egy zárt oldal sokat segít.' })
  }
  if (config.sensors === false && config.roof === 'louvered' && config.width * config.depth > 20) {
    out.push({ id: 'rain-sensor', level: 'info', text: 'Nagy lamellás tetőnél az eső-/szélérzékelő megóvja a szerkezetet, ha elfelejted bezárni.' })
  }
  return out
}
