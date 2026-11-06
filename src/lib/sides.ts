// Oldalzárások: egyetlen igazságforrás (címke, kód, ár, budget-érték) és a félbe osztott
// oldalak szegmensei. Tiszta TypeScript — böngészőben és szerveren is fut.
//
// Félbe osztás: a `sides[side]` az első fél, a `split[side]` a második fél típusa.
// Első fél: elöl/hátul a bal (−x), oldalt az elülső (kert felőli, +z) fél.
import { isWallSide } from './mount'
import type { PergolaConfig, PriceSettings, SideKey, SideType } from '../types/pergola'

export interface SideInfo {
  label: string
  /** Rövid leírás a választóhoz. */
  description: string
  /** Egybetűs kód a konfigurációs azonosítóban (nagybetű). */
  spec: string
  /** Egykarakteres kód a megosztó linkben (nem változhat). */
  share: string
  priceKey: keyof PriceSettings | null
  /** Költségkeret-tervezőhöz: mennyit ér (nagyobb = értékesebb). */
  value: number
  /** Motoros-e (energia, vezérlés). */
  motorized: boolean
  /** Elmozdítható-e a 3D-ben (tolás, döntés). */
  movable: 'slide' | 'tilt' | 'roll' | 'swing' | null
}

export const SIDE_TYPES: SideType[] = ['none', 'zip', 'glass', 'glassFramed', 'glassFixed', 'door', 'doorSliding', 'louver', 'slatAlu', 'slatWood']

export const SIDE_INFO: Record<SideType, SideInfo> = {
  none: { label: 'Nyitott', description: 'Szabad kilátás, szellős terasz', spec: '0', share: '0', priceKey: null, value: 0, motorized: false, movable: null },
  zip: { label: 'ZIP screen', description: 'Motoros, szélálló árnyékoló, a kazettába tűnik', spec: 'Z', share: 'z', priceKey: 'zipPerM2Net', value: 1.4, motorized: true, movable: 'roll' },
  glass: { label: 'Tolóüveg', description: 'Keret nélküli, 10 mm edzett üveg, félre tolható', spec: 'G', share: 'g', priceKey: 'glassPerM2Net', value: 2.4, motorized: false, movable: 'slide' },
  glassFramed: { label: 'Keretes tolóüveg', description: 'Alumínium keretes, tömített tolóelemek', spec: 'K', share: 'k', priceKey: 'glassFramedPerM2Net', value: 2.2, motorized: false, movable: 'slide' },
  glassFixed: { label: 'Fix üveg', description: 'Szélfogó üvegfal, nem nyitható', spec: 'F', share: 'f', priceKey: 'glassFixedPerM2Net', value: 1.9, motorized: false, movable: null },
  door: { label: 'Nyíló ajtós üvegfal', description: 'Fix üvegfal középen nyíló, keretes üvegajtóval', spec: 'D', share: 'd', priceKey: 'glassFixedPerM2Net', value: 2.3, motorized: false, movable: 'swing' },
  doorSliding: { label: 'Tolóajtós üvegfal', description: 'Fix üvegfal tolóajtóval, szűk bejárathoz is', spec: 'T', share: 't', priceKey: 'glassFixedPerM2Net', value: 2.5, motorized: false, movable: 'slide' },
  louver: { label: 'Lamellafal', description: 'Állítható alumínium lamellák, belátásvédelem', spec: 'L', share: 'l', priceKey: 'louverWallPerM2Net', value: 1.8, motorized: false, movable: 'tilt' },
  slatAlu: { label: 'Alu lécfal', description: 'Fix alumínium lécek, a szerkezet színében', spec: 'A', share: 'a', priceKey: 'slatAluPerM2Net', value: 1.3, motorized: false, movable: null },
  slatWood: { label: 'Fa lécfal', description: 'Hőkezelt fa lécek, meleg hatás', spec: 'W', share: 'w', priceKey: 'slatWoodPerM2Net', value: 1.2, motorized: false, movable: null },
}

export const SIDE_LABELS = Object.fromEntries(SIDE_TYPES.map((type) => [type, SIDE_INFO[type].label])) as Record<SideType, string>

/** A félbe osztott oldal két felének neve. */
export const HALF_NAMES: Record<SideKey, [string, string]> = {
  front: ['bal fél', 'jobb fél'],
  back: ['bal fél', 'jobb fél'],
  left: ['elülső fél', 'hátsó fél'],
  right: ['elülső fél', 'hátsó fél'],
}

export interface SideSegment {
  type: SideType
  /** A szegmens két vége az oldal mentén, −0,5…0,5 (az oldal hosszának arányában, helyi x). */
  from: number
  to: number
  half: 0 | 1 | null
}

export const sideLength = (config: Pick<PergolaConfig, 'width' | 'depth'>, side: SideKey) => (side === 'front' || side === 'back' ? config.width : config.depth)

export const isSplit = (config: Pick<PergolaConfig, 'split' | 'mount'>, side: SideKey) => Boolean(config.split?.[side]) && !isWallSide(config.mount, side)

/**
 * Az oldal szegmensei helyi koordinátában: a 3D-ben az oldal csoportja úgy van elforgatva,
 * hogy a negatív helyi x elöl/hátul a bal, oldalt az elülső vég — ezért mindig az első fél a −0,5…0.
 */
export function sideSegments(config: Pick<PergolaConfig, 'sides' | 'split' | 'mount'>, side: SideKey): SideSegment[] {
  if (isWallSide(config.mount, side)) return []
  const second = config.split?.[side]
  if (!second) return [{ type: config.sides[side], from: -0.5, to: 0.5, half: null }]
  return [{ type: config.sides[side], from: -0.5, to: 0, half: 0 }, { type: second, from: 0, to: 0.5, half: 1 }]
}

/** Olvasható leírás: „Tolóüveg” vagy „bal fél: Tolóüveg · jobb fél: ZIP screen”. */
export function sideSummary(config: Pick<PergolaConfig, 'sides' | 'split' | 'mount'>, side: SideKey) {
  const segments = sideSegments(config, side)
  if (segments.length < 2) return SIDE_LABELS[config.sides[side]]
  return segments.map((segment, index) => `${HALF_NAMES[side][index]}: ${SIDE_LABELS[segment.type]}`).join(' · ')
}

/** A konfiguráció összes zárt szegmense (falak nélkül), a hosszával. */
/** Az ajtószárny szélessége egy falszakaszon (m): közös a 3D-nek és a műszaki rajznak. Nyíló ~0,95 m; toló legfeljebb a szakasz fele (max. 1,3 m), hogy végig elférjen a fix tábla mögött. */
export function doorLeafWidth(type: 'door' | 'doorSliding', length: number) {
  return type === 'door' ? Math.max(0.3, Math.min(0.95, length - 0.2)) : Math.max(0.3, Math.min(length - 0.1, Math.max(0.6, Math.min(1.3, length / 2))))
}

export function closedSegments(config: Pick<PergolaConfig, 'sides' | 'split' | 'mount' | 'width' | 'depth'>) {
  return (['front', 'back', 'left', 'right'] as SideKey[]).flatMap((side) => sideSegments(config, side)
    .filter((segment) => segment.type !== 'none')
    .map((segment) => ({ side, type: segment.type, half: segment.half, length: sideLength(config, side) * (segment.to - segment.from) })))
}

/** Hány osztóprofil kell (félbe osztott oldal, ahol nincs ott oszlop). */
export function splitProfiles(config: Pick<PergolaConfig, 'sides' | 'split' | 'mount' | 'width'>) {
  return (['front', 'back', 'left', 'right'] as SideKey[]).filter((side) => isSplit(config, side) && !(side === 'front' && config.width > 6)).length
}
