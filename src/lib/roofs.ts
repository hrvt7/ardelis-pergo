// Tetőrendszerek: egyetlen igazságforrás a 3D-hez, az árhoz, a linkhez, az anyaglistához
// és a választóhoz. A gyártó (tenant) dönti el, melyiket kínálja és milyen néven.
import type { PriceSettings, RoofType } from '../types/pergola'

export interface RoofInfo {
  /** Rövid kód a megosztó linkben (egy karakter, nem változhat). */
  share: string
  /** Kód a konfigurációs azonosítóban (pl. AE-500x400…). */
  spec: string
  priceKey: keyof Pick<PriceSettings, 'louveredPerM2Net' | 'retractablePerM2Net' | 'fabricRoofPerM2Net' | 'glassRoofPerM2Net' | 'polycarbonatePerM2Net' | 'fixedPerM2Net'>
  /** Mozgatható-e (motoros): a csúszka, az esőautomatika és a szél ehhez kötött. */
  motion: 'tilt' | 'slide' | 'none'
  /** A csúszka felirata, ha mozgatható. */
  control?: string
  /** Mennyire árnyékol (a vásárlónak, egyszerűen). */
  shade: string
  rain: string
  light: string
  /** Az alapértelmezett megnevezés, ha a gyártó nem ad sajátot. */
  name: string
  short: string
  description: string
  /** Költségkeret-tervezőhöz: mekkora „érték” lemondani róla (nagyobb = értékesebb). */
  value: number
}

export const ROOF_TYPES: RoofType[] = ['louvered', 'retractable', 'fabric', 'glass', 'polycarbonate', 'fixed']

export const ROOF_INFO: Record<RoofType, RoofInfo> = {
  louvered: { share: 'l', spec: 'AE', priceKey: 'louveredPerM2Net', motion: 'tilt', control: 'Lamellaszög', shade: 'Állítható, 0–100%', rain: 'Zárva vízzáró', light: 'Szabályozható', name: 'Aero', short: 'motoros lamellás', description: 'Motoros, 0–90°-ban forgatható alumínium lamellák', value: 7 },
  retractable: { share: 'r', spec: 'GL', priceKey: 'retractablePerM2Net', motion: 'slide', control: 'Tetőnyitás', shade: 'Állítható, akár teljesen nyitott ég', rain: 'Zárva vízzáró', light: 'Szabályozható', name: 'Glide', short: 'eltolható lamellás', description: 'Forgatható és egy oldalra összetolható lamellacsomag', value: 9 },
  fabric: { share: 't', spec: 'TX', priceKey: 'fabricRoofPerM2Net', motion: 'slide', control: 'Tetőnyitás', shade: 'Behúzva nyitott ég, kihúzva teljes árnyék', rain: 'Kihúzva vízzáró ponyva', light: 'Kihúzva szórt fény', name: 'Velum', short: 'behúzható textiltető', description: 'Vízzáró PVC-ponyva, motorral harmonikaszerűen behúzható', value: 6 },
  glass: { share: 'g', spec: 'GS', priceKey: 'glassRoofPerM2Net', motion: 'none', shade: 'Nem árnyékol (napfény átjut)', rain: 'Teljes esővédelem', light: 'Teljes, világos', name: 'Lumen', short: 'üvegtető', description: 'Edzett, ragasztott biztonsági üveg (VSG), alumínium bordázaton', value: 5 },
  polycarbonate: { share: 'p', spec: 'PC', priceKey: 'polycarbonatePerM2Net', motion: 'none', shade: 'Részleges (opál, szórt fény)', rain: 'Teljes esővédelem', light: 'Szórt, világos', name: 'Opal', short: 'polikarbonát tető', description: 'UV-álló, opál üreges polikarbonát lemez alumínium bordázaton', value: 3 },
  fixed: { share: 'f', spec: 'LN', priceKey: 'fixedPerM2Net', motion: 'none', shade: 'Teljes árnyék', rain: 'Teljes esővédelem', light: 'Árnyékos', name: 'Line', short: 'fix alumínium', description: 'Zárt, hőszigetelt alumínium szendvicspanel tető', value: 2 },
}

export const isMovableRoof = (roof: RoofType) => ROOF_INFO[roof].motion !== 'none'
/** Bordázott (üveg / polikarbonát) tető. */
export const isGlazedRoof = (roof: RoofType) => roof === 'glass' || roof === 'polycarbonate'
