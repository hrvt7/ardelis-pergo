export type MountType = 'freestanding' | 'wall' | 'corner-left' | 'corner-right' | 'niche'
export type WallFinish = 'plaster' | 'brick' | 'cedar'
export type RoofType = 'louvered' | 'retractable' | 'fabric' | 'glass' | 'polycarbonate' | 'fixed'
export type SideType = 'none' | 'zip' | 'glass' | 'glassFramed' | 'glassFixed' | 'louver' | 'slatAlu' | 'slatWood'
export type SideKey = 'front' | 'back' | 'left' | 'right'
export type FrameColor = 'anthracite' | 'black' | 'white' | 'bronze' | 'custom'
export type TimeOfDay = 'day' | 'sunset' | 'night'
export type GroundType = 'terrace' | 'garden'
export type QualityLevel = 'auto' | 'ultra' | 'high' | 'mobile'

export interface PergolaConfig {
  width: number
  depth: number
  height: number
  mount: MountType
  roof: RoofType
  frameColor: FrameColor
  customRal?: string
  /** Kéttónusú kivitel: a tető/lamellák színe (alapszín vagy 'custom' + roofRal). Nincs megadva = a vázzal azonos. */
  roofColor?: FrameColor
  roofRal?: string
  sides: Record<SideKey, SideType>
  /** Félbe osztott oldalak második felének típusa (az első fél a `sides`-ban). */
  split?: Partial<Record<SideKey, SideType>>
  louverAngle: number
  screenOpen: number
  led: boolean
  heaters: number
  speakers: boolean
  sensors: boolean
  /** Napelemes tető (csak fix tetőre, ha a gyártó kínálja). */
  solar?: boolean
  /** Színváltós (RGB) LED a periméter LED helyett (csak LED-del). */
  ledRgb?: boolean
  /** Mennyezeti ventilátorok száma (0–2). */
  fans?: number
  /** Okosotthon-vezérlés (átjáró: telefon, hangvezérlés, időzítés). */
  smartHome?: boolean
}

export interface SceneSettings {
  time: TimeOfDay
  dayTime: number
  ground: GroundType
  showDimensions: boolean
  autoRotate: boolean
  /** A kamera kövesse a beállítást (oldal kiválasztása, szín, ventilátor). */
  autoCamera: boolean
  rain: boolean
  wind: boolean
  showPerson: boolean
  showHotspots: boolean
  glassOpen: boolean
  wallLouverOpen: boolean
  quality: QualityLevel
  /** A ház homlokzatának anyaga (főépület és L/U-szárny; csak látvány). */
  wallFinish: WallFinish
  /** A homlokzat színe (hex). */
  wallColor: string
  /** A nyílászárók színe (a `WINDOW_COLORS` azonosítója). */
  windowColor: string
  photoMode: boolean
  photoUrl?: string
  photoX: number
  photoY: number
  photoScale: number
  /** Árnyékelemzés: valós napállás a megadott helyen, napon és időpontban. */
  sunStudy: boolean
  /** A vizsgált nap (ÉÉÉÉ-HH-NN); üresen a mai nap. */
  sunDate: string
  /** Helyi idő, tizedes órában (15.5 = 15:30). */
  sunHour: number
  /** A helyszín (irányítószám alapján); üresen a gyártó alapértelmezett helyszíne. */
  site: SunSite | null
  /** Merre néz a pergola nyitott (kert felőli) eleje: fok, É = 0, K = 90, D = 180, Ny = 270. */
  facing: number
  /** Bútorcsomag a pergola alatt (a méretválasztást segíti). */
  furniture: FurnitureSet
  /** A bútor helyigényének kijelölése a teraszon. */
  showFurnitureZone: boolean
  /** Esti hangulat: LED fényerő (0–100) és színhőmérséklet (K), fűtés be/ki. */
  ledLevel: number
  ledKelvin: number
  heatersOn: boolean
  /** RGB LED színe (hex); null = fehér, a színhőmérséklet szerint. */
  ledColor: string | null
  /** A ventilátor forog-e a 3D-ben. */
  fanOn: boolean
  /** Téli nézet: hó a kertben és a tetőn, havazás. */
  winter: boolean
}

export type FurnitureSet = 'none' | 'lounge' | 'dining6' | 'dining8' | 'combo'

export interface SunSite {
  postalCode: string
  name: string
  region: string
  lat: number
  lon: number
  timeZone: string
}

export interface PriceSettings {
  louveredPerM2Net: number
  retractablePerM2Net: number
  fixedPerM2Net: number
  /** Behúzható textiltető (PVC-ponyva, motoros). */
  fabricRoofPerM2Net: number
  /** Üvegtető (VSG) bordázattal. */
  glassRoofPerM2Net: number
  /** Polikarbonát tető bordázattal. */
  polycarbonatePerM2Net: number
  freestandingSurchargeNet: number
  /** Oldalfali csatlakozó profil és rögzítés, folyóméterenként (sarok, fülke). */
  sideWallAttachPerMeterNet: number
  /** Egy oszlop ára — ennyivel olcsóbb, ha a fal kiváltja (sarok, fülke). */
  postNet: number
  zipPerM2Net: number
  glassPerM2Net: number
  louverWallPerM2Net: number
  ledPerMeterNet: number
  heaterUnitNet: number
  speakerPairNet: number
  sensorsNet: number
  /** Napelemes tető, nettó Ft / kWp (modulok, tartószerkezet, inverter-csatlakozás). */
  solarPerKwpNet: number
  /** Keretes tolóüveg-fal. */
  glassFramedPerM2Net: number
  /** Fix (szélfogó) üvegfal. */
  glassFixedPerM2Net: number
  /** Alumínium lécfal. */
  slatAluPerM2Net: number
  /** Fa lécfal. */
  slatWoodPerM2Net: number
  /** Osztóprofil félbe osztott oldalhoz (darab). */
  splitProfileNet: number
  /** RGB LED felár folyóméterenként (a fehér LED árán felül). */
  ledRgbPerMeterNet: number
  /** Mennyezeti ventilátor (darab, bekötéssel). */
  fanUnitNet: number
  /** Okosotthon-vezérlés (átjáró, beállítás). */
  smartHomeNet: number
  customColorRate: number
  /** Fa hatású (szublimációs) bevonat felára a szerkezeti árhoz képest. */
  woodColorRate: number
  installationRate: number
  vatRate: number
}

export interface PriceLine {
  id: string
  label: string
  detail: string
  amountNet: number
}

export interface PriceBreakdown {
  area: number
  perimeter: number
  lines: PriceLine[]
  subtotalNet: number
  installationNet: number
  totalNet: number
  vatNet: number
  totalGross: number
}

export type CameraView = 'perspective' | 'front' | 'top' | 'interior' | 'detail' | 'sofa'

/** Egyszeri kamerafókusz (pl. a kiválasztott oldalra fordulás vagy a bemutató körbeforgás); az `id` új értéke indítja. */
export type CameraFocus = { id: number; kind: 'side'; side: SideKey } | { id: number; kind: 'showcase' } | { id: number; kind: 'overview' }
export type ConfigStep = 'size' | 'mount' | 'color' | 'sides' | 'extras' | 'summary'

export interface SavedConfiguration {
  id: string
  name: string
  config: PergolaConfig
  savedAt: number
  /** Kis előnézeti kép (JPEG data URL) az összehasonlító csúszkához. */
  image?: string
}
