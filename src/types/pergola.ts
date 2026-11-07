export type MountType = 'freestanding' | 'wall' | 'corner-left' | 'corner-right' | 'niche'
export type WallFinish = 'plaster' | 'brick' | 'cedar'
export type RoofShade = 'above' | 'below'
/** Üveg-/polikarbonát tető burkolata: tiszta, matt (szatinált), opál (tejüveg), hővisszaverő (napvédő), füstös (színezett). */
export type RoofGlazing = 'clear' | 'satin' | 'opal' | 'heat' | 'tinted'
export type ShadeFabric = 'white' | 'sand' | 'grey' | 'anthracite'
export type RoofType = 'louvered' | 'retractable' | 'fabric' | 'glass' | 'polycarbonate' | 'fixed'
export type SideType = 'none' | 'zip' | 'glass' | 'glassFramed' | 'glassFixed' | 'door' | 'doorSliding' | 'louver' | 'slatAlu' | 'slatWood'
/** Építmény-típus: a nyitott pergola mellett zárt veranda (üvegezett terasz) és egész éves télikert. */
export type BuildingType = 'pergola' | 'veranda' | 'conservatory'
/** Oldalfal-üvegezés: edzett (egyrétegű), kétrétegű vagy háromrétegű hőszigetelt. */
export type WallGlazing = 'single' | 'double' | 'triple'
/** Télikert fűtés/hűtés: split klíma, padlófűtés vagy mindkettő. */
export type ClimateType = 'split' | 'underfloor' | 'both'
export type SideKey = 'front' | 'back' | 'left' | 'right'
export type FrameColor = 'anthracite' | 'black' | 'white' | 'bronze' | 'custom'
export type TimeOfDay = 'day' | 'sunset' | 'night'
export type GroundType = 'terrace' | 'garden'
export type QualityLevel = 'auto' | 'ultra' | 'high' | 'medium' | 'low' | 'mobile'

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
  /** Ajtós oldal tükrözve: a zsanér/tolószárny a másik sarokban (a berendezés vagy a bejárat irányához igazítva). */
  doorMirror?: Partial<Record<SideKey, boolean>>
  louverAngle: number
  /** Tetődőlés fokban (0 = vízszintes). A hátsó (fali) oldal emelkedik, az elülső magasság a `height`. */
  pitch?: number
  /** Üveg-/polikarbonát tető burkolata (nincs megadva = alapkivitel: tiszta üveg / opál polikarbonát). */
  glazing?: RoofGlazing
  /** Zárt építmény: veranda vagy télikert (nincs megadva = nyitott pergola). */
  building?: Exclude<BuildingType, 'pergola'>
  /** Oldalfal-üvegezés (csak zárt építménynél; nincs megadva = alapkivitel: veranda edzett, télikert kétrétegű). */
  wallGlazing?: WallGlazing
  /** Fűtés/hűtés (csak télikertnél). */
  climate?: ClimateType
  /** Alap és padlószerkezet (télikertnél mindig, verandánál választható). */
  foundation?: boolean
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
  /** Motoros tetőárnyékoló (csak üveg- és polikarbonát tetőhöz): tető feletti vagy tető alatti. */
  roofShade?: RoofShade
  /** Az árnyékoló ponyvájának színe. */
  shadeFabric?: ShadeFabric
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
  /** 3D-beli feliratok (kattintási tippek, Működés-címkék). Alapból be; bemutatón kikapcsolható. */
  labels?: boolean
  /** Robbantott nézet: a szerkezeti elemek szétválnak (csak látvány). */
  exploded: boolean
  /** Működés bemutató (lamellás tető): a hajtás láthatóvá válik, a lamellák a gyári 0–110° tartományban járnak. */
  mechanism?: boolean
  glassOpen: boolean
  /** Az ajtók nyitva vannak-e a 3D-ben. */
  doorOpen: boolean
  /** Klíma működése a modellen: ki / hűtés / fűtés (csak látvány). */
  climateRun: 'off' | 'cool' | 'heat'
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
  /** Fotó módban: elforgatás a függőleges tengely körül (fok). */
  photoRotation: number
  /** Fotó módban: a nézőpont magassága (fok). */
  photoTilt: number
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
  /** A tetőárnyékoló kihúzottsága a 3D-ben (0–100%). */
  shadeOut: number
  /** RGB LED színe (hex); null = fehér, a színhőmérséklet szerint. */
  ledColor: string | null
  /** A ventilátor forog-e a 3D-ben. */
  fanOn: boolean
}

export type FurnitureSet = 'none' | 'lounge' | 'dining6' | 'dining8' | 'combo' | 'spa' | 'loungeSpa' | 'diningSpa'

export interface SunSite {
  postalCode: string
  name: string
  region: string
  lat: number
  lon: number
  timeZone: string
}

/** Egy sor a gyártói ármátrixban: ekkora (m) szerkezet nettó ára Ft-ban. */
export interface PriceMatrixPoint { width: number; depth: number; netPrice: number }
/** Tetőtípusonként külön ármátrix; ahol nincs, ott a m²-alapú ár érvényes. */
export type PriceMatrix = Partial<Record<RoofType, PriceMatrixPoint[]>>

export interface PriceSettings {
  /** Opcionális: szélesség × mélység ármátrix tetőtípusonként. A felárak (fal, LED, oldalak…) a mátrix mellett is a meglévő tételekből jönnek. */
  priceMatrix?: PriceMatrix
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
  /** Motoros tetőárnyékoló nettó ára m²-enként. */
  roofShadeAbovePerM2Net: number
  roofShadeBelowPerM2Net: number
  /** Matt (szatinált) üveg felára m²-enként az alapkivitelhez képest. */
  glazingSatinPerM2Net: number
  /** Hővisszaverő (napvédő) burkolat felára m²-enként. */
  glazingHeatPerM2Net: number
  /** Opál (tejüveg) felára üvegtetőn m²-enként; polikarbonátnál az opál az alapkivitel. */
  glazingOpalPerM2Net: number
  /** Füstös (színezett) burkolat felára m²-enként. */
  glazingTintedPerM2Net: number
  /** Dőlt tető felára: magasított hátsó oszlopok, ferde bekötés, oldalkitöltés. Ft / fok / szélesség-méter. */
  pitchPerDegreePerMeterNet: number
  /** Nyíló üvegajtó (egy db) felára az üvegfal m²-ára felett. */
  doorHingedNet: number
  /** Tolóajtó (egy db) felára az üvegfal m²-ára felett. */
  doorSlidingNet: number
  /** Kétrétegű, hőszigetelt (Low-E) oldalüvegezés felára az üvegfal m²-ére. */
  wallGlazingDoublePerM2Net: number
  /** Háromrétegű hőszigetelt oldalüvegezés felára az üvegfal m²-ére. */
  wallGlazingTriplePerM2Net: number
  /** Télikert hőhídmentes profilrendszer felára a szerkezeti ár arányában (0–1). */
  thermalProfileRate: number
  /** Alap- és padlószerkezet, m²-enként. */
  foundationPerM2Net: number
  /** Split klíma (fűtés + hűtés), egy db. */
  climateSplitNet: number
  /** Padlófűtés, m²-enként. */
  underfloorPerM2Net: number
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
