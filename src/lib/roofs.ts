// Tetőrendszerek: egyetlen igazságforrás a 3D-hez, az árhoz, a linkhez, az anyaglistához
// és a választóhoz. A gyártó (tenant) dönti el, melyiket kínálja és milyen néven.
import type { PergolaConfig, PriceSettings, RoofGlazing, RoofType } from '../types/pergola'
import { localized, tr } from '../i18n/locale'

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

/** Az eső- és szélszenzornak csak mozgó tetőnél (lamella, nyitható) vagy ZIP-screennél van mit vezérelnie. */
export function sensorsApplicable(config: Pick<PergolaConfig, 'roof' | 'sides' | 'split'>) {
  if (ROOF_INFO[config.roof].motion !== 'none') return true
  return [...Object.values(config.sides), ...Object.values(config.split ?? {})].includes('zip')
}

export const ROOF_INFO: Record<RoofType, RoofInfo> = localized(() => ({
  louvered: { share: 'l', spec: 'AE', priceKey: 'louveredPerM2Net', motion: 'tilt', control: tr('Lamellaszög', 'Lamellenwinkel'), shade: tr('Állítható, 0–100%', 'Einstellbar, 0–100 %'), rain: tr('Zárva vízzáró', 'Geschlossen wasserdicht'), light: tr('Szabályozható', 'Regulierbar'), name: 'Aero', short: tr('motoros lamellás', 'motorisierte Lamellen'), description: tr('Motoros, 0–90°-ban forgatható alumínium lamellák', 'Motorisch 0–90° drehbare Aluminiumlamellen'), value: 7 },
  retractable: { share: 'r', spec: 'GL', priceKey: 'retractablePerM2Net', motion: 'slide', control: tr('Tetőnyitás', 'Dachöffnung'), shade: tr('Állítható, akár teljesen nyitott ég', 'Einstellbar, bis zum ganz offenen Himmel'), rain: tr('Zárva vízzáró', 'Geschlossen wasserdicht'), light: tr('Szabályozható', 'Regulierbar'), name: 'Glide', short: tr('eltolható lamellás', 'verschiebbare Lamellen'), description: tr('Forgatható és egy oldalra összetolható lamellacsomag', 'Dreh- und zu einer Seite zusammenschiebbares Lamellenpaket'), value: 9 },
  fabric: { share: 't', spec: 'TX', priceKey: 'fabricRoofPerM2Net', motion: 'slide', control: tr('Tetőnyitás', 'Dachöffnung'), shade: tr('Behúzva nyitott ég, kihúzva teljes árnyék', 'Eingefahren offener Himmel, ausgefahren voller Schatten'), rain: tr('Kihúzva vízzáró ponyva', 'Ausgefahren wasserdichte Membran'), light: tr('Kihúzva szórt fény', 'Ausgefahren diffuses Licht'), name: 'Velum', short: tr('behúzható textiltető', 'einfahrbares Textildach'), description: tr('Vízzáró PVC-ponyva, motorral harmonikaszerűen behúzható', 'Wasserdichte PVC-Membran, motorisch faltbar einfahrbar'), value: 6 },
  glass: { share: 'g', spec: 'GS', priceKey: 'glassRoofPerM2Net', motion: 'none', shade: tr('Nem árnyékol (napfény átjut)', 'Kein Schatten (Sonnenlicht dringt durch)'), rain: tr('Teljes esővédelem', 'Voller Regenschutz'), light: tr('Teljes, világos', 'Voll, hell'), name: 'Lumen', short: tr('üvegtető', 'Glasdach'), description: tr('Edzett, ragasztott biztonsági üveg (VSG), alumínium bordázaton', 'Verbundsicherheitsglas (VSG) auf Aluminium-Sprossen'), value: 5 },
  polycarbonate: { share: 'p', spec: 'PC', priceKey: 'polycarbonatePerM2Net', motion: 'none', shade: tr('Részleges (opál, szórt fény)', 'Teilweise (opal, diffuses Licht)'), rain: tr('Teljes esővédelem', 'Voller Regenschutz'), light: tr('Szórt, világos', 'Diffus, hell'), name: 'Opal', short: tr('polikarbonát tető', 'Polycarbonatdach'), description: tr('UV-álló, opál üreges polikarbonát lemez alumínium bordázaton', 'UV-beständige, opale Polycarbonat-Stegplatten auf Aluminium-Sprossen'), value: 3 },
  fixed: { share: 'f', spec: 'LN', priceKey: 'fixedPerM2Net', motion: 'none', shade: tr('Teljes árnyék', 'Voller Schatten'), rain: tr('Teljes esővédelem', 'Voller Regenschutz'), light: tr('Árnyékos', 'Schattig'), name: 'Line', short: tr('fix alumínium', 'festes Aluminium'), description: tr('Zárt, hőszigetelt alumínium szendvicspanel tető', 'Geschlossenes, wärmegedämmtes Aluminium-Sandwichpaneeldach'), value: 2 },
}))

export const isMovableRoof = (roof: RoofType) => ROOF_INFO[roof].motion !== 'none'
/** Bordázott (üveg / polikarbonát) tető. */
export const isGlazedRoof = (roof: RoofType) => roof === 'glass' || roof === 'polycarbonate'

/** Tetődőlés tartománya fokban (az emelkedés a mélységgel nő; 12° felett már műszaki egyeztetés kell). */
export const PITCH_RANGE: [number, number] = [0, 12]

/** A burkolatok adatai: név, rövid leírás, tájékoztató fény- és hőáteresztés, valamint a 3D anyaga. */
export type GlazingInfo = { label: string; short: string; share: string; light: string; solar: string }
export const GLAZING_INFO: Record<RoofGlazing, GlazingInfo> = localized(() => ({
  clear: { label: tr('Tiszta', 'Klar'), short: tr('Átlátszó, maximális fény', 'Durchsichtig, maximales Licht'), share: 'c', light: '~88%', solar: '~78%' },
  satin: { label: tr('Matt', 'Matt'), short: tr('Szatinált, szórt fény, takarás', 'Satiniert, diffuses Licht, Sichtschutz'), share: 's', light: '~72%', solar: '~70%' },
  opal: { label: tr('Opál', 'Opal'), short: tr('Tejszerű, szórt, világos', 'Milchig, diffus, hell'), share: 'o', light: '~55%', solar: '~58%' },
  heat: { label: tr('Hővisszaverő', 'Wärmereflektierend'), short: tr('Napvédő bevonat, kevesebb hőterhelés', 'Sonnenschutzbeschichtung, weniger Wärmelast'), share: 'h', light: '~62%', solar: '~35%' },
  tinted: { label: tr('Füstös', 'Getönt'), short: tr('Színezett, tompított fény és tűző nap', 'Getönt, gedämpftes Licht und weniger pralle Sonne'), share: 'f', light: '~40%', solar: '~48%' },
}))

/** A burkolat felárának kulcsa az adott tetőtípuson (polikarbonátnál az opál az alapkivitel, ott nincs felár). */
export function glazingPriceKey(roof: RoofType, glazing: RoofGlazing): keyof Pick<PriceSettings, 'glazingSatinPerM2Net' | 'glazingHeatPerM2Net' | 'glazingOpalPerM2Net' | 'glazingTintedPerM2Net'> | null {
  if (glazing === 'satin') return 'glazingSatinPerM2Net'
  if (glazing === 'heat') return 'glazingHeatPerM2Net'
  if (glazing === 'tinted') return 'glazingTintedPerM2Net'
  if (glazing === 'opal') return roof === 'glass' ? 'glazingOpalPerM2Net' : null
  return null
}

/** Egy tetőtípushoz választható burkolatok; az első az alapkivitel. Üres, ha nincs választás. */
export const glazingOptions = (roof: RoofType): RoofGlazing[] => roof === 'glass' ? ['clear', 'satin', 'opal', 'heat', 'tinted'] : roof === 'polycarbonate' ? ['opal', 'clear', 'heat', 'tinted'] : []
export const defaultGlazing = (roof: RoofType): RoofGlazing | undefined => glazingOptions(roof)[0]
export const effectiveGlazing = (config: Pick<PergolaConfig, 'roof' | 'glazing'>): RoofGlazing | undefined => (config.glazing && glazingOptions(config.roof).includes(config.glazing)) ? config.glazing : defaultGlazing(config.roof)

/** A tető hátsó élének emelkedése méterben (a dőlésből és a mélységből). */
export const roofRise = (config: Pick<PergolaConfig, 'pitch' | 'depth'>) => Math.round(Math.tan((config.pitch ?? 0) * Math.PI / 180) * config.depth * 100) / 100
