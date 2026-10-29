import { configToHash, decodeShareHash, shareHash } from '@/lib/shareCode'
import { findColor } from './colors'
import { parseConfig, priceSettingsSchema } from '@/tenants/rules'

export { configToHash }
import type { Tenant } from '@/tenants/types'
import type { PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'

export const DEFAULT_SCENE: SceneSettings = {
  time: 'day',
  dayTime: 13,
  ground: 'terrace',
  showDimensions: false,
  autoRotate: false,
  autoCamera: true,
  rain: false,
  winter: false,
  ledColor: null,
  fanOn: false,
  wind: false,
  showPerson: false,
  showHotspots: false,
  glassOpen: false,
  wallLouverOpen: false,
  quality: 'auto',
  wallFinish: 'cedar',
  photoMode: false,
  photoX: 0,
  photoY: 0,
  photoScale: 1,
  sunStudy: false,
  sunDate: '',
  sunHour: 15,
  site: null,
  facing: 180,
  furniture: 'lounge',
  showFurnitureZone: false,
  ledLevel: 80,
  ledKelvin: 2700,
  heatersOn: true,
}

const RAL_COLORS: Record<string, string> = {
  '7016': '#343a3d', '7021': '#303336', '7024': '#484a49', '7035': '#c5c9c7',
  '7039': '#676b66', '7040': '#969d9f', '7042': '#8f9594', '9005': '#15191c',
  '9010': '#eeeae0', '9016': '#dedfd9', '6005': '#314b3c', '6009': '#2f3c31',
  '6011': '#66715a', '6021': '#687467', '3004': '#74373b', '3009': '#694039',
  '5010': '#315c78', '5011': '#263e50', '5021': '#3d7180', '8017': '#4b3830',
  '8019': '#45403c', '8022': '#312c27', '1035': '#a4936d', '1036': '#9c8758',
}

export function getFrameColorHex(config: Pick<PergolaConfig, 'frameColor' | 'customRal'>, colors?: readonly { id: string; hex: string; modelHex?: string }[]) {
  const catalog = config.frameColor === 'custom' ? findColor(config.customRal) : undefined
  if (catalog) return catalog.hex
  if (config.frameColor !== 'custom') {
    const color = colors?.find((item) => item.id === config.frameColor)
    return color?.modelHex ?? color?.hex
      ?? { anthracite: '#323a3d', black: '#191d20', white: '#dedfd9', bronze: '#705b4c' }[config.frameColor]
  }
  const code = config.customRal?.toUpperCase().match(/\d{4}/)?.[0]
  return (code && RAL_COLORS[code]) || '#687467'
}

// Böngészőben tárolt piszkozat és (csak admin módban) szerkesztett árak,
// gyártónként külön kulccsal, hogy két gyártó demója ne keveredjen.
const configKey = (tenant: Tenant) => `pergo-atelier-config-v2:${tenant.id}`
const priceKey = (tenant: Tenant) => `pergo-atelier-prices-v2:${tenant.id}`

export function readStored(key: string): unknown {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/** Van-e a böngészőben elmentett piszkozat ehhez a gyártóhoz. */
export function hasStoredDraft(tenant: Tenant) {
  return readStored(configKey(tenant)) !== null
}

export function loadInitialConfig(tenant: Tenant): PergolaConfig {
  // A hibás hivatkozás nem akadályozhatja meg az indulást: ilyenkor a piszkozat vagy az alapállapot jön.
  const shared = window.location.hash ? parseConfig(tenant, decodeShareHash(window.location.hash)) : null
  if (shared) return shared
  return parseConfig(tenant, readStored(configKey(tenant))) ?? tenant.defaultConfig
}

/** Admin módban a böngészőben szerkesztett árak, egyébként a gyártó árlistája. */
export function loadPrices(tenant: Tenant, admin: boolean): PriceSettings {
  if (!admin) return tenant.prices
  const parsed = priceSettingsSchema.safeParse(readStored(priceKey(tenant)))
  return parsed.success ? parsed.data : tenant.prices
}

export function persistConfig(tenant: Tenant, config: PergolaConfig) {
  try { localStorage.setItem(configKey(tenant), JSON.stringify(config)) } catch { /* privát mód */ }
}

export function persistPrices(tenant: Tenant, prices: PriceSettings) {
  try { localStorage.setItem(priceKey(tenant), JSON.stringify(prices)) } catch { /* privát mód */ }
}

export function createShareUrl(config: PergolaConfig) {
  const url = new URL(window.location.href)
  // Beágyazott (gyártói weboldalba tett) nézetből a link az önálló oldalra mutasson.
  url.pathname = url.pathname.replace(/\/embed\//, '/k/')
  url.searchParams.delete('admin')
  url.searchParams.delete('ar')
  url.searchParams.delete('arDebug')
  url.hash = shareHash(config)
  return url.toString()
}
