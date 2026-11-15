import type { PergolaConfig, SideKey } from '@/types/pergola'
import { tr } from '../i18n/locale'

export interface Advice { id: string; level: 'info' | 'warn'; text: string }

const SIDES: SideKey[] = ['front', 'back', 'left', 'right']
const GLASS = new Set(['glass', 'glassFramed', 'glassFixed', 'door', 'doorSliding'])

/** Beállításfüggő, magyarázó figyelmeztetések és javaslatok (tiszta függvény, nincs mellékhatás). */
export function getAdvice(config: PergolaConfig): Advice[] {
  const out: Advice[] = []
  const span = Math.max(config.width, config.depth)
  const glassSides = SIDES.filter((side) => GLASS.has(config.sides[side]))
  const slidingGlass = glassSides.filter((side) => config.sides[side] === 'glass')
  const freestanding = config.mount === 'freestanding'

  if (slidingGlass.some((side) => (side === 'front' || side === 'back' ? config.width : config.depth) > 4.5)) {
    out.push({ id: 'wide-glass', level: 'warn', text: tr('Ezzel a mérettel a tolóüveg fala jelentősen megdrágul (több sín, nagyobb tokozás). Fix vagy kerettel osztott üveg olcsóbb lehet.', 'Bei dieser Größe wird die Glasschiebewand deutlich teurer (mehr Schienen, größere Rahmen). Fest- oder gerahmtes Glas kann günstiger sein.') })
  }
  if (config.height > 2.9 && !GLASS.has(config.sides.front) && config.sides.front !== 'none') {
    out.push({ id: 'tall-infill', level: 'info', text: tr('Ehhez a magassághoz a nagy zárt felületeknél ajánlott a merevítés — a felmérésnél egyeztetjük.', 'Bei dieser Höhe wird für große geschlossene Flächen eine Aussteifung empfohlen — wir stimmen das beim Aufmaß ab.') })
  }
  if (freestanding && span > 5 && config.roof === 'louvered') {
    out.push({ id: 'span-posts', level: 'warn', text: tr('Önálló szerkezetnél 5 m felett köztes oszlop vagy erősebb gerenda kellhet a szélteher miatt.', 'Bei freistehender Ausführung über 5 m kann wegen der Windlast ein Zwischensteher oder stärkerer Träger nötig sein.') })
  }
  if (freestanding && config.height > 3 && glassSides.length >= 2) {
    out.push({ id: 'wind-load', level: 'warn', text: tr('Magas, több oldalon üvegezett szabadon álló pergolánál a szélteher miatt a statikai ellenőrzés kötelező.', 'Bei hohen, mehrseitig verglasten freistehenden Pergolen ist wegen der Windlast eine statische Prüfung Pflicht.') })
  }
  if (config.roof === 'glass' && !config.roofShade) {
    out.push({ id: 'glass-heat', level: 'info', text: tr('Üvegtetőnél nyáron erős a felmelegedés — árnyékoló (tető alatti vagy feletti) erősen ajánlott.', 'Unter Glasdächern wird es im Sommer stark warm — eine Beschattung (unter oder über dem Dach) wird dringend empfohlen.') })
  }
  if (config.heaters > 0 && SIDES.every((side) => config.sides[side] === 'none')) {
    out.push({ id: 'heater-open', level: 'info', text: tr('Nyitott oldalaknál a hősugárzó hatékonysága csökken; legalább egy zárt oldal sokat segít.', 'Bei offenen Seiten sinkt die Wirkung des Heizstrahlers; mindestens eine geschlossene Seite hilft viel.') })
  }
  if (config.sensors === false && config.roof === 'louvered' && config.width * config.depth > 20) {
    out.push({ id: 'rain-sensor', level: 'info', text: tr('Nagy lamellás tetőnél az eső-/szélérzékelő megóvja a szerkezetet, ha elfelejted bezárni.', 'Bei großen Lamellendächern schützt der Regen-/Windsensor die Konstruktion, falls Sie das Schließen vergessen.') })
  }
  return out
}
