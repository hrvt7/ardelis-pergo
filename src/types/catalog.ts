import type { ProductFamily } from '@contracts/catalog'
import type { PriceBreakdown } from '@/types/pergola'

export type OutdoorFamily = Exclude<ProductFamily, 'pergola'>
export type OutdoorColor = 'anthracite' | 'black' | 'white' | 'bronze' | 'green' | 'wood' | 'custom'

export interface OutdoorConfig {
  family: OutdoorFamily
  width: number
  depth: number
  height: number
  length: number
  mount: 'wall' | 'freestanding' | 'cantilever' | 'posts'
  frameMaterial: 'aluminium' | 'steel' | 'glulam' | 'wrought' | 'wood' | 'wpc'
  roofMaterial: 'polycarbonate' | 'glass' | 'sandwich' | 'aluminium' | 'louvered'
  shape: 'mono' | 'curved' | 'gable'
  style: 'horizontal' | 'vertical' | 'diagonal' | 'picket' | 'ornamental' | 'privacy'
  finish: 'powder' | 'galvanizedPowder' | 'woodlook' | 'lazur'
  color: OutdoorColor
  customRal?: string
  bays: 1 | 2
  sideWalls: 'none' | 'louver' | 'glass' | 'privacy'
  led: boolean
  gutter: boolean
  storage: boolean
  evReady: boolean
  solarReady: boolean
  foundation: boolean
  pedestrianGate: boolean
  gateType: 'none' | 'swing' | 'sliding' | 'cantilever'
  gateWidth: number
  gateAutomation: boolean
  safetyKit: boolean
  intercom: boolean
}

export interface OutdoorPriceSettings {
  canopyPerM2: Record<OutdoorConfig['roofMaterial'], number>
  carportPerM2: Record<OutdoorConfig['roofMaterial'], number>
  fencePerM2: Record<'aluminium' | 'steel' | 'wrought' | 'wood' | 'wpc', number>
  postPerMeter: number
  pedestrianGate: number
  gatePerM2: number
  swingMechanism: number
  slidingMechanism: number
  cantileverMechanism: number
  gateMotor: number
  safetyKit: number
  intercom: number
  ledPerMeter: number
  gutterPerMeter: number
  storageUnit: number
  evPreparation: number
  solarPreparation: number
  foundationPerM2: number
  sideLouverPerM2: number
  sideGlassPerM2: number
  sidePrivacyPerM2: number
  customColorRate: number
  installationRate: number
  vatRate: number
}

export interface OutdoorProject {
  family: OutdoorFamily
  config: OutdoorConfig
  price: PriceBreakdown
}
