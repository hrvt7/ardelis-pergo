// Gyártói (tenant) konfiguráció típusai.
// Ez a fájl böngészőben és szerveren (lead végpont) is fut, ezért csak
// relatív importot és tiszta TypeScriptet használhat — React és DOM nélkül.
import type { FrameColor, MountType, PergolaConfig, PriceSettings, RoofType, SideType } from '../types/pergola'

export interface TenantRoof {
  /** Rövid terméknév, pl. „Aero” — a 3D-felirat és az árpanel ezt mutatja. */
  name: string
  /** Rövid jelző a név után, pl. „motoros lamellás”. */
  short: string
  /** Egy mondatos leírás a választónál. */
  description: string
}

export interface TenantColor {
  id: FrameColor
  /** Megjelenített név, pl. „Antracit”. */
  name: string
  /** Kiegészítő sor, pl. „RAL 7016”. */
  detail: string
  /** Színminta a választóban. */
  hex: string
  /** A 3D-modell színe, ha eltér a színmintától (fény miatt). */
  modelHex?: string
  /** A szín RAL-kódja számokkal (pl. „7016”): a katalógusból választva ez felár nélküli alapszín. */
  ral?: string
}

export interface TenantPreset {
  id: string
  name: string
  description: string
  config: Partial<PergolaConfig>
}

export interface Tenant {
  /** URL-azonosító: /k/{id} és /embed/{id}. Csak kisbetű, szám, kötőjel. */
  id: string
  /** Bemutató (demó) gyártó-e — ilyenkor az árak „mintaárak”. */
  demo: boolean
  brand: {
    /** Fejlécben és PDF-en megjelenő név, pl. „ARDELIS”. */
    name: string
    /** Név utáni kisbetűs kiegészítő, pl. „/ PERGO”. */
    suffix?: string
    /** Opcionális logó (SVG/PNG URL). Ha nincs, a beépített jel jelenik meg. */
    logoUrl?: string
    /** Jogi név a PDF láblécén és a hozzájárulási szövegben. */
    legalName: string
    website?: string
    phone?: string
    email?: string
    address?: string
    /** Adatkezelési tájékoztató URL — éles gyártónál kötelező megadni. */
    privacyUrl?: string
  }
  currency: 'HUF'
  /** Nettó egységárak; a szerver is ebből számol. */
  prices: PriceSettings
  limits: {
    width: [number, number]
    depth: [number, number]
    height: [number, number]
    maxHeaters: number
  }
  mounts: MountType[]
  roofs: Partial<Record<RoofType, TenantRoof>>
  /** Elérhető oldalzárások; a „none” (nyitott) mindig elérhető. */
  sides: Exclude<SideType, 'none'>[]
  colors: TenantColor[]
  /** Engedélyezett-e az egyedi RAL szín. */
  customRal: boolean
  /** Kéttónusú kivitel (más színű tető/lamellák) választható-e. */
  twoTone?: boolean
  extras: {
    led: boolean
    speakers: boolean
    sensors: boolean
    /** Napelemes tető a fix tetős változathoz. */
    solar?: boolean
    /** Színváltós LED, mennyezeti ventilátor, okosotthon-vezérlés. */
    rgb?: boolean
    fans?: boolean
    smartHome?: boolean
    /** Motoros tetőárnyékoló üveg- és polikarbonát tetőhöz. */
    roofShade?: boolean
  }
  /** Az üzemeltetési költség becsléséhez: a kínált fűtőpanel névleges teljesítménye (W). */
  energy?: { heaterWatts: number }
  /** A havi részletpélda hány hónapra bontson; 0 = nem jelenik meg. */
  installmentMonths: number
  /** Régiók a felmérési űrlapon. */
  regions: readonly string[]
  defaultConfig: PergolaConfig
  presets: TenantPreset[]
  lead: {
    /** Kik kapják az érdeklődő e-mailt. Üresen a LEAD_FALLBACK_EMAIL env érvényes. */
    recipients: string[]
    /** Az e-mail tárgy előtagja. */
    subjectPrefix: string
  }
}
