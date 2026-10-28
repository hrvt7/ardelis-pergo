import { z } from 'zod'
import { DEFAULT_PRICES } from '@/lib/pricing'
import type { PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'

export const DEFAULT_CONFIG: PergolaConfig = {
  width: 5,
  depth: 4,
  height: 2.6,
  mount: 'wall',
  roof: 'louvered',
  frameColor: 'anthracite',
  sides: { front: 'none', back: 'none', left: 'zip', right: 'none' },
  louverAngle: 35,
  screenOpen: 65,
  led: true,
  heaters: 0,
  speakers: false,
  sensors: true,
}

export const DEFAULT_SCENE: SceneSettings = {
  time: 'day',
  dayTime: 13,
  ground: 'terrace',
  showDimensions: false,
  autoRotate: false,
  rain: false,
  wind: false,
  showPerson: false,
  showHotspots: false,
  glassOpen: false,
  wallLouverOpen: false,
  quality: 'auto',
  photoMode: false,
  photoX: 0,
  photoY: 0,
  photoScale: 1,
}

const RAL_COLORS: Record<string, string> = {
  '7016': '#343a3d', '7021': '#303336', '7024': '#484a49', '7035': '#c5c9c7',
  '7039': '#676b66', '7040': '#969d9f', '7042': '#8f9594', '9005': '#15191c',
  '9010': '#eeeae0', '9016': '#dedfd9', '6005': '#314b3c', '6009': '#2f3c31',
  '6011': '#66715a', '6021': '#687467', '3004': '#74373b', '3009': '#694039',
  '5010': '#315c78', '5011': '#263e50', '5021': '#3d7180', '8017': '#4b3830',
  '8019': '#45403c', '8022': '#312c27', '1035': '#a4936d', '1036': '#9c8758',
}

export function getFrameColorHex(config: Pick<PergolaConfig, 'frameColor' | 'customRal'>) {
  if (config.frameColor !== 'custom') {
    return { anthracite: '#323a3d', black: '#191d20', white: '#dedfd9', bronze: '#705b4c' }[config.frameColor]
  }
  const code = config.customRal?.toUpperCase().match(/\d{4}/)?.[0]
  return (code && RAL_COLORS[code]) || '#687467'
}

export const PRESETS: { id: string; name: string; description: string; config: PergolaConfig }[] = [
  {
    id: 'basic', name: 'Alap', description: '3,5 × 3 m · nyitott, letisztult',
    config: { ...DEFAULT_CONFIG, width: 3.5, depth: 3, mount: 'freestanding', sides: { front: 'none', back: 'none', left: 'none', right: 'none' }, led: false, sensors: false },
  },
  {
    id: 'comfort', name: 'Komfort', description: '5 × 4 m · ZIP + LED + szenzor',
    config: DEFAULT_CONFIG,
  },
  {
    id: 'premium', name: 'Prémium', description: '6 × 4,5 m · üveg + fűtés + hang',
    config: { ...DEFAULT_CONFIG, width: 6, depth: 4.5, mount: 'freestanding', frameColor: 'black', sides: { front: 'glass', back: 'louver', left: 'glass', right: 'zip' }, heaters: 2, speakers: true },
  },
]

const configSchema = z.object({
  width: z.number().min(2.5).max(7),
  depth: z.number().min(2.5).max(5),
  height: z.number().min(2.2).max(3.2),
  mount: z.enum(['freestanding', 'wall']),
  roof: z.enum(['louvered', 'retractable', 'fixed']),
  frameColor: z.enum(['anthracite', 'black', 'white', 'bronze', 'custom']),
  customRal: z.string().max(12).optional(),
  sides: z.object({
    front: z.enum(['none', 'zip', 'glass', 'louver']),
    back: z.enum(['none', 'zip', 'glass', 'louver']),
    left: z.enum(['none', 'zip', 'glass', 'louver']),
    right: z.enum(['none', 'zip', 'glass', 'louver']),
  }),
  louverAngle: z.number().min(0).max(90),
  screenOpen: z.number().min(0).max(100),
  led: z.boolean(),
  heaters: z.number().int().min(0).max(4),
  speakers: z.boolean(),
  sensors: z.boolean(),
})

const priceSchema = z.object({
  louveredPerM2Net: z.number().min(0).max(2000000),
  retractablePerM2Net: z.number().min(0).max(2000000),
  fixedPerM2Net: z.number().min(0).max(2000000),
  freestandingSurchargeNet: z.number().min(0).max(5000000),
  zipPerM2Net: z.number().min(0).max(1000000),
  glassPerM2Net: z.number().min(0).max(1000000),
  louverWallPerM2Net: z.number().min(0).max(1000000),
  ledPerMeterNet: z.number().min(0).max(500000),
  heaterUnitNet: z.number().min(0).max(2000000),
  speakerPairNet: z.number().min(0).max(2000000),
  sensorsNet: z.number().min(0).max(2000000),
  customColorRate: z.number().min(0).max(1),
  installationRate: z.number().min(0).max(1),
  vatRate: z.number().min(0).max(1),
})

const CONFIG_KEY = 'pergo-atelier-config-v1'
const PRICE_KEY = 'pergo-atelier-prices-v1'

export function loadInitialConfig(): PergolaConfig {
  try {
    const match = window.location.hash.match(/^#k=([A-Za-z0-9_-]+)$/)
    if (match) {
      const base64 = match[1].replace(/-/g, '+').replace(/_/g, '/')
      const parsed = configSchema.safeParse(JSON.parse(atob(base64)))
      if (parsed.success) return parsed.data
    }
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) {
      const parsed = configSchema.safeParse(JSON.parse(stored))
      if (parsed.success) return parsed.data
    }
  } catch {
    // A hibás hivatkozás vagy böngészőadat nem akadályozhatja meg az indulást.
  }
  return DEFAULT_CONFIG
}

export function loadPrices(): PriceSettings {
  try {
    const stored = localStorage.getItem(PRICE_KEY)
    if (stored) {
      const parsed = priceSchema.safeParse(JSON.parse(stored))
      if (parsed.success) return parsed.data
    }
  } catch {
    // Alapértelmezett tarifák használata.
  }
  return DEFAULT_PRICES
}

export function persistConfig(config: PergolaConfig) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)) } catch { /* privát mód */ }
}

export function persistPrices(prices: PriceSettings) {
  try { localStorage.setItem(PRICE_KEY, JSON.stringify(prices)) } catch { /* privát mód */ }
}

export function configToHash(config: PergolaConfig) {
  return btoa(JSON.stringify(config)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function createShareUrl(config: PergolaConfig) {
  const url = new URL(window.location.href)
  url.hash = `k=${configToHash(config)}`
  return url.toString()
}
