export type MountType = 'freestanding' | 'wall' | 'corner-left' | 'corner-right' | 'niche'
export type WallFinish = 'plaster' | 'brick' | 'cedar'
export type RoofType = 'louvered' | 'retractable' | 'fixed'
export type SideType = 'none' | 'zip' | 'glass' | 'louver'
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
  sides: Record<SideKey, SideType>
  louverAngle: number
  screenOpen: number
  led: boolean
  heaters: number
  speakers: boolean
  sensors: boolean
}

export interface SceneSettings {
  time: TimeOfDay
  dayTime: number
  ground: GroundType
  showDimensions: boolean
  autoRotate: boolean
  rain: boolean
  wind: boolean
  showPerson: boolean
  showHotspots: boolean
  glassOpen: boolean
  wallLouverOpen: boolean
  quality: QualityLevel
  /** A ház oldalszárnyának homlokzata L- és U-rögzítésnél (csak látvány). */
  wallFinish: WallFinish
  photoMode: boolean
  photoUrl?: string
  photoX: number
  photoY: number
  photoScale: number
}

export interface PriceSettings {
  louveredPerM2Net: number
  retractablePerM2Net: number
  fixedPerM2Net: number
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
  customColorRate: number
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
export type ConfigStep = 'size' | 'mount' | 'color' | 'sides' | 'extras' | 'summary'

export interface SavedConfiguration {
  id: string
  name: string
  config: PergolaConfig
  savedAt: number
}
