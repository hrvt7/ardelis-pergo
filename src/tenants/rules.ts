// A gyártói szabályok alkalmazása egy konfigurációra.
// Böngészőben és szerveren is fut: a szerver ugyanezzel normalizálja és
// számolja újra a beérkező leadet, így a kliens által küldött ár nem számít.
import { z } from 'zod'
import { calculatePrice } from '../lib/pricing'
import { ROOF_TYPES } from '../lib/roofs'
import { isWallSide } from '../lib/mount'
import type { PergolaConfig, PriceBreakdown, PriceSettings, RoofType, SideKey } from '../types/pergola'
import type { Tenant } from './types'

const sideEnum = z.enum(['none', 'zip', 'glass', 'glassFramed', 'glassFixed', 'louver', 'slatAlu', 'slatWood'])

/** Szerkezeti séma: típusokat és durva tartományt ellenőriz, gyártótól függetlenül. */
export const pergolaConfigSchema = z.object({
  width: z.number().finite().min(1).max(20),
  depth: z.number().finite().min(1).max(20),
  height: z.number().finite().min(1).max(6),
  mount: z.enum(['freestanding', 'wall', 'corner-left', 'corner-right', 'niche']),
  roof: z.enum(['louvered', 'retractable', 'fabric', 'glass', 'polycarbonate', 'fixed']),
  frameColor: z.enum(['anthracite', 'black', 'white', 'bronze', 'custom']),
  customRal: z.string().max(12).optional(),
  sides: z.object({ front: sideEnum, back: sideEnum, left: sideEnum, right: sideEnum }),
  louverAngle: z.number().finite().min(0).max(90),
  screenOpen: z.number().finite().min(0).max(100),
  led: z.boolean(),
  heaters: z.number().int().min(0).max(20),
  speakers: z.boolean(),
  sensors: z.boolean(),
  solar: z.boolean().optional(),
  split: z.object({ front: sideEnum.optional(), back: sideEnum.optional(), left: sideEnum.optional(), right: sideEnum.optional() }).optional(),
  ledRgb: z.boolean().optional(),
  fans: z.number().int().min(0).max(4).optional(),
  smartHome: z.boolean().optional(),
})

export const priceSettingsSchema = z.object({
  louveredPerM2Net: z.number().min(0).max(2000000),
  retractablePerM2Net: z.number().min(0).max(2000000),
  fixedPerM2Net: z.number().min(0).max(2000000),
  fabricRoofPerM2Net: z.number().min(0).max(2000000).default(125000),
  glassRoofPerM2Net: z.number().min(0).max(2000000).default(105000),
  polycarbonatePerM2Net: z.number().min(0).max(2000000).default(70000),
  freestandingSurchargeNet: z.number().min(0).max(5000000),
  sideWallAttachPerMeterNet: z.number().min(0).max(1000000).default(0),
  postNet: z.number().min(0).max(2000000).default(0),
  zipPerM2Net: z.number().min(0).max(1000000),
  glassPerM2Net: z.number().min(0).max(1000000),
  louverWallPerM2Net: z.number().min(0).max(1000000),
  ledPerMeterNet: z.number().min(0).max(500000),
  heaterUnitNet: z.number().min(0).max(2000000),
  speakerPairNet: z.number().min(0).max(2000000),
  sensorsNet: z.number().min(0).max(2000000),
  solarPerKwpNet: z.number().min(0).max(5000000).default(330000),
  glassFramedPerM2Net: z.number().min(0).max(1000000).default(95000),
  glassFixedPerM2Net: z.number().min(0).max(1000000).default(80000),
  slatAluPerM2Net: z.number().min(0).max(1000000).default(55000),
  slatWoodPerM2Net: z.number().min(0).max(1000000).default(45000),
  splitProfileNet: z.number().min(0).max(1000000).default(35000),
  ledRgbPerMeterNet: z.number().min(0).max(500000).default(4000),
  fanUnitNet: z.number().min(0).max(2000000).default(130000),
  smartHomeNet: z.number().min(0).max(2000000).default(120000),
  customColorRate: z.number().min(0).max(1),
  installationRate: z.number().min(0).max(1),
  vatRate: z.number().min(0).max(1),
})

const clamp = (value: number, [min, max]: [number, number]) => Math.min(max, Math.max(min, value))
const roundCm = (value: number) => Math.round(value * 100) / 100

export function enabledRoofs(tenant: Tenant): RoofType[] {
  return ROOF_TYPES.filter((roof) => tenant.roofs[roof])
}

/** „Aero · motoros lamellás” formátumú címkék a gyártó termékneveivel. */
export function roofLabels(tenant: Tenant): Record<RoofType, string> {
  const fallback = enabledRoofs(tenant)[0]
  const label = (roof: RoofType) => {
    const item = tenant.roofs[roof] ?? tenant.roofs[fallback]!
    return `${item.name} · ${item.short}`
  }
  return Object.fromEntries(ROOF_TYPES.map((roof) => [roof, label(roof)])) as Record<RoofType, string>
}

/**
 * A konfigurációt a gyártó kínálatához igazítja: méreteket a határok közé
 * szorítja, a nem kínált opciókat a legközelebbi elérhetőre cseréli.
 */
export function normalizeConfig(tenant: Tenant, config: PergolaConfig): PergolaConfig {
  const roofs = enabledRoofs(tenant)
  const colorIds = tenant.colors.map((color) => color.id)
  const colorOk = colorIds.includes(config.frameColor) || (config.frameColor === 'custom' && tenant.customRal)
  const sides = Object.fromEntries((['front', 'back', 'left', 'right'] as SideKey[]).map((side) => {
    const type = config.sides[side]
    return [side, type === 'none' || tenant.sides.includes(type) ? type : 'none']
  })) as PergolaConfig['sides']
  const frameColor = colorOk ? config.frameColor : (colorIds[0] ?? 'anthracite')
  const mount = tenant.mounts.includes(config.mount) ? config.mount : tenant.mounts[0]
  // Félbe osztás: csak nem fali oldalon, a gyártó által kínált típussal.
  const splitEntries = (['front', 'back', 'left', 'right'] as SideKey[]).flatMap((side) => {
    const type = config.split?.[side]
    if (!type || isWallSide(mount, side)) return []
    return [[side, type === 'none' || tenant.sides.includes(type) ? type : 'none'] as const]
  })
  const led = tenant.extras.led && config.led
  return {
    ...config,
    width: roundCm(clamp(config.width, tenant.limits.width)),
    depth: roundCm(clamp(config.depth, tenant.limits.depth)),
    height: roundCm(clamp(config.height, tenant.limits.height)),
    mount,
    roof: roofs.includes(config.roof) ? config.roof : roofs[0],
    frameColor,
    customRal: frameColor === 'custom' && config.customRal ? config.customRal : undefined,
    sides,
    louverAngle: clamp(config.louverAngle, [0, 90]),
    screenOpen: clamp(config.screenOpen, [0, 100]),
    led,
    speakers: tenant.extras.speakers && config.speakers,
    sensors: tenant.extras.sensors && config.sensors,
    heaters: Math.round(clamp(config.heaters, [0, tenant.limits.maxHeaters])),
    // Napelem csak fix tetőn és csak ott, ahol a gyártó kínálja; különben a mező el is marad.
    split: splitEntries.length ? Object.fromEntries(splitEntries) as PergolaConfig['split'] : undefined,
    ledRgb: led && tenant.extras.rgb && config.ledRgb ? true : undefined,
    fans: tenant.extras.fans && config.fans ? Math.round(clamp(config.fans, [0, 2])) || undefined : undefined,
    smartHome: tenant.extras.smartHome && config.smartHome ? true : undefined,
    ...(tenant.extras.solar && config.solar && (roofs.includes(config.roof) ? config.roof : roofs[0]) === 'fixed' ? { solar: true } : { solar: undefined }),
  }
}

/** Ismeretlen bemenetből érvényes, a gyártóhoz igazított konfiguráció — vagy null. */
export function parseConfig(tenant: Tenant, raw: unknown): PergolaConfig | null {
  const parsed = pergolaConfigSchema.safeParse(raw)
  return parsed.success ? normalizeConfig(tenant, parsed.data) : null
}

export function presetConfig(tenant: Tenant, patch: Partial<PergolaConfig>): PergolaConfig {
  return normalizeConfig(tenant, { ...tenant.defaultConfig, ...patch, sides: { ...tenant.defaultConfig.sides, ...patch.sides } })
}

export function tenantPrice(tenant: Tenant, config: PergolaConfig, prices: PriceSettings = tenant.prices): PriceBreakdown {
  return calculatePrice(config, prices, roofLabels(tenant))
}
