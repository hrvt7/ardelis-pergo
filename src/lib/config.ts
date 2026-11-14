import { configToHash, decodeShareHash, shareHash } from '@/lib/shareCode'
import { findColor } from './colors'
import { buildingPatch } from '@/lib/buildings'
import { enabledRoofs, normalizeConfig, parseConfig, priceSettingsSchema } from '@/tenants/rules'
import type { ProductFamily } from '@/products'

export { configToHash }
import type { Tenant } from '@/tenants/types'
import type { PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'

export const DEFAULT_SCENE: SceneSettings = {
  // Alap: aranyóra (szép, hosszú árnyékok) és csak a pergola, ház nélkül: gyorsabb az első betöltés.
  time: 'sunset',
  dayTime: 18,
  sunDirection: 0,
  ground: 'studio',
  showDimensions: false,
  autoRotate: false,
  autoCamera: true,
  rain: false,
  ledColor: null,
  fanOn: false,
  wind: false,
  showPerson: false,
  showHotspots: false,
  labels: true,
  exploded: false,
  mechanism: false,
  glassOpen: false,
  doorOpen: false,
  climateRun: 'off',
  wallLouverOpen: false,
  quality: 'auto',
  houseStyle: 'classic',
  wallFinish: 'cedar',
  wallColor: '#8a5a3c',
  windowColor: 'anthracite',
  photoMode: false,
  photoX: 0,
  photoY: 0,
  photoScale: 1,
  photoRotation: -25,
  photoTilt: 14,
  photoLens: 1,
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
  shadeOut: 100,
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
// Termékenként külön piszkozat (a carport ne írja felül a teraszfedést); a pergola kulcsa változatlan.
const configKey = (tenant: Tenant, product: ProductFamily = 'pergola') => `pergo-atelier-config-v2:${tenant.id}${product === 'pergola' ? '' : `:${product}`}`
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
export function hasStoredDraft(tenant: Tenant, product: ProductFamily = 'pergola') {
  return readStored(configKey(tenant, product)) !== null
}

/** A termék alapterve: pergolánál a gyártó alapkonfigurációja, carportnál az első carport-csomag (vagy az alapterv carportra állítva). */
export function productDefaultConfig(tenant: Tenant, product: ProductFamily = 'pergola'): PergolaConfig {
  if (product !== 'carport') return tenant.defaultConfig
  const preset = tenant.presets.find((item) => item.config.building === 'carport')
  const base = preset
    ? { ...tenant.defaultConfig, ...preset.config, sides: { ...tenant.defaultConfig.sides, ...preset.config.sides } }
    : { ...tenant.defaultConfig, ...buildingPatch(tenant.defaultConfig, 'carport', enabledRoofs(tenant), tenant.sides) }
  return normalizeConfig(tenant, base as PergolaConfig)
}

export function loadInitialConfig(tenant: Tenant, product: ProductFamily = 'pergola'): PergolaConfig {
  // A hibás hivatkozás nem akadályozhatja meg az indulást: ilyenkor a piszkozat vagy az alapállapot jön.
  const shared = window.location.hash ? parseConfig(tenant, decodeShareHash(window.location.hash)) : null
  if (shared) return shared
  const stored = parseConfig(tenant, readStored(configKey(tenant, product))) ?? productDefaultConfig(tenant, product)
  // Carport útvonalon a kezdőállapot mindig carport.
  if (product === 'carport' && stored.building !== 'carport') return productDefaultConfig(tenant, product)
  // Teraszfedés útvonalon a carport-piszkozat visszavált pergolára (az eredeti oldalakkal): az útvonal családja az irányadó.
  if (product === 'pergola' && stored.building === 'carport') return normalizeConfig(tenant, { ...stored, ...buildingPatch(stored, 'pergola', enabledRoofs(tenant), tenant.sides) } as PergolaConfig)
  return stored
}

/** Admin módban a böngészőben szerkesztett árak, egyébként a gyártó árlistája. */
export function loadPrices(tenant: Tenant, admin: boolean): PriceSettings {
  if (!admin) return tenant.prices
  const parsed = priceSettingsSchema.safeParse(readStored(priceKey(tenant)))
  // A mátrix a gyártó adata (a felületen nem szerkeszthető): mindig a tenantból jön.
  return parsed.success ? { ...parsed.data, priceMatrix: tenant.prices.priceMatrix } : tenant.prices
}

export function persistConfig(tenant: Tenant, config: PergolaConfig, product: ProductFamily = 'pergola') {
  try { localStorage.setItem(configKey(tenant, product), JSON.stringify(config)) } catch { /* privát mód */ }
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
