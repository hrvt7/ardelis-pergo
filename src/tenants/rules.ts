// A gyártói szabályok alkalmazása egy konfigurációra.
// Böngészőben és szerveren is fut: a szerver ugyanezzel normalizálja és
// számolja újra a beérkező leadet, így a kliens által küldött ár nem számít.
import { DEFAULT_SHADE_FABRIC, SHADE_FABRICS, supportsRoofShade } from '../lib/roofShade'
import { z } from 'zod'
import { calculatePrice } from '../lib/pricing'
import { defaultGlazing, glazingOptions, PITCH_RANGE, ROOF_TYPES } from '../lib/roofs'
import { normalizeColorCode, pickCatalogColor, supportsTwoTone } from '../lib/colors'
import type { PergolaConfig, PriceBreakdown, PriceSettings, RoofType, SideKey } from '../types/pergola'
import { availableBuildings, BUILDING_ROOFS, CONSERVATORY_SIDE_TYPES, defaultWallGlazing, isClosedBuilding, wallGlazingOptions } from '../lib/buildings'
import type { Tenant } from './types'

const sideEnum = z.enum(['none', 'zip', 'glass', 'glassFramed', 'glassFixed', 'door', 'doorSliding', 'louver', 'slatAlu', 'slatWood'])

/** Szerkezeti séma: típusokat és durva tartományt ellenőriz, gyártótól függetlenül. */
export const pergolaConfigSchema = z.object({
  width: z.number().finite().min(1).max(20),
  depth: z.number().finite().min(1).max(20),
  height: z.number().finite().min(1).max(6),
  mount: z.enum(['freestanding', 'wall', 'corner-left', 'corner-right', 'niche']),
  roof: z.enum(['louvered', 'retractable', 'fabric', 'glass', 'polycarbonate', 'fixed']),
  frameColor: z.enum(['anthracite', 'black', 'white', 'bronze', 'custom']),
  customRal: z.string().max(24).optional(),
  roofColor: z.enum(['anthracite', 'black', 'white', 'bronze', 'custom']).optional(),
  roofRal: z.string().max(24).optional(),
  sides: z.object({ front: sideEnum, back: sideEnum, left: sideEnum, right: sideEnum }),
  louverAngle: z.number().finite().min(0).max(90),
  pitch: z.number().finite().min(0).max(30).optional(),
  glazing: z.enum(['clear', 'satin', 'opal', 'heat', 'tinted']).optional(),
  screenOpen: z.number().finite().min(0).max(100),
  led: z.boolean(),
  heaters: z.number().int().min(0).max(20),
  speakers: z.boolean(),
  sensors: z.boolean(),
  solar: z.boolean().optional(),
  split: z.object({ front: sideEnum.optional(), back: sideEnum.optional(), left: sideEnum.optional(), right: sideEnum.optional() }).optional(),
  ledRgb: z.boolean().optional(),
  fans: z.number().int().min(0).max(9).optional(),
  smartHome: z.boolean().optional(),
  roofShade: z.enum(['above', 'below']).optional(),
  shadeFabric: z.enum(['white', 'sand', 'grey', 'anthracite']).optional(),
  building: z.enum(['veranda', 'conservatory']).optional(),
  wallGlazing: z.enum(['single', 'double', 'triple']).optional(),
  climate: z.enum(['split', 'underfloor', 'both']).optional(),
  foundation: z.boolean().optional(),
})

const matrixPointSchema = z.object({ width: z.number().positive().max(30), depth: z.number().positive().max(30), netPrice: z.number().positive().max(200000000) })
const priceMatrixSchema = z.object({
  louvered: z.array(matrixPointSchema).max(400).optional(),
  retractable: z.array(matrixPointSchema).max(400).optional(),
  fabric: z.array(matrixPointSchema).max(400).optional(),
  glass: z.array(matrixPointSchema).max(400).optional(),
  polycarbonate: z.array(matrixPointSchema).max(400).optional(),
  fixed: z.array(matrixPointSchema).max(400).optional(),
})

export const priceSettingsSchema = z.object({
  priceMatrix: priceMatrixSchema.optional(),
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
  roofShadeAbovePerM2Net: z.number().min(0).max(1000000).default(52000),
  roofShadeBelowPerM2Net: z.number().min(0).max(1000000).default(38000),
  glazingSatinPerM2Net: z.number().min(0).max(1000000).default(12000),
  glazingHeatPerM2Net: z.number().min(0).max(1000000).default(22000),
  glazingOpalPerM2Net: z.number().min(0).max(1000000).default(16000),
  glazingTintedPerM2Net: z.number().min(0).max(1000000).default(18000),
  pitchPerDegreePerMeterNet: z.number().min(0).max(100000).default(1800),
  doorHingedNet: z.number().min(0).max(5000000).default(260000),
  doorSlidingNet: z.number().min(0).max(5000000).default(480000),
  wallGlazingDoublePerM2Net: z.number().min(0).max(1000000).default(24000),
  wallGlazingTriplePerM2Net: z.number().min(0).max(1000000).default(42000),
  thermalProfileRate: z.number().min(0).max(1).default(0.14),
  foundationPerM2Net: z.number().min(0).max(1000000).default(38000),
  climateSplitNet: z.number().min(0).max(5000000).default(480000),
  underfloorPerM2Net: z.number().min(0).max(1000000).default(30000),
  customColorRate: z.number().min(0).max(1),
  woodColorRate: z.number().min(0).max(1).default(0.18),
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
/** Szín egységesítése: a katalógusból választott, de a gyártónál alapszínnek számító RAL alapszín lesz. */
function normalizeColorChoice(tenant: Tenant, color: PergolaConfig['frameColor'], custom: string | undefined): { color: PergolaConfig['frameColor']; custom?: string } {
  if (color !== 'custom') return { color }
  const code = normalizeColorCode(custom)
  if (!code) return { color: 'custom' }
  return pickCatalogColor(tenant, code) ?? { color: 'custom', custom: code }
}

export function normalizeConfig(tenant: Tenant, config: PergolaConfig): PergolaConfig {
  const roofs = enabledRoofs(tenant)
  const colorIds = tenant.colors.map((color) => color.id)
  const colorOk = colorIds.includes(config.frameColor) || (config.frameColor === 'custom' && tenant.customRal)
  // Zárt építmény (veranda/télikert) csak ha a gyártó kínálja; ehhez illő tető és (télikertnél) üveg/ajtó oldalfal kell.
  const allowedBuildings = availableBuildings(roofs, tenant.sides)
  const building = isClosedBuilding(config.building) && allowedBuildings.includes(config.building) ? config.building : undefined
  const roof = building
    ? (BUILDING_ROOFS[building].includes(config.roof) && roofs.includes(config.roof) ? config.roof : BUILDING_ROOFS[building].find((item) => roofs.includes(item))!)
    : roofs.includes(config.roof) ? config.roof : roofs[0]
  // Télikertben csak üveg/ajtó engedett: más oldalfal fix üvegre cserélődik (a hőszigetelés miatt).
  const fitSide = (type: PergolaConfig['sides'][SideKey]) => {
    const kept = type === 'none' || tenant.sides.includes(type) ? type : 'none'
    return building === 'conservatory' && !CONSERVATORY_SIDE_TYPES.includes(kept) ? 'glassFixed' as const : kept
  }
  const sides = Object.fromEntries((['front', 'back', 'left', 'right'] as SideKey[]).map((side) => [side, fitSide(config.sides[side])])) as PergolaConfig['sides']
  const frame = normalizeColorChoice(tenant, colorOk ? config.frameColor : (colorIds[0] ?? 'anthracite'), config.customRal)
  const frameColor = frame.color
  // Kéttónusú: csak alumínium tetőnél és ha a gyártó kínálja; a vázzal azonos szín nem külön tétel.
  const roofChoice = config.roofColor && tenant.twoTone && supportsTwoTone(roof) && (colorIds.includes(config.roofColor) || (config.roofColor === 'custom' && tenant.customRal))
    ? normalizeColorChoice(tenant, config.roofColor, config.roofRal)
    : null
  const twoTone = roofChoice && !(roofChoice.color === frame.color && (roofChoice.custom ?? '') === (frame.custom ?? '')) ? roofChoice : null
  const mount = tenant.mounts.includes(config.mount) ? config.mount : tenant.mounts[0]
  // Félbe osztás a gyártó által kínált típussal. Fali oldalon is megmarad (mint az oldal típusa),
  // csak nem érvényes: ha a rögzítést visszaváltják, az osztás is visszajön.
  const splitEntries = (['front', 'back', 'left', 'right'] as SideKey[]).flatMap((side) => {
    const type = config.split?.[side]
    if (!type) return []
    return [[side, fitSide(type)] as const]
  })
  const led = tenant.extras.led && config.led
  return {
    ...config,
    width: roundCm(clamp(config.width, tenant.limits.width)),
    depth: roundCm(clamp(config.depth, tenant.limits.depth)),
    height: roundCm(clamp(config.height, tenant.limits.height)),
    mount,
    roof,
    building,
    frameColor,
    customRal: frame.custom,
    roofColor: twoTone ? twoTone.color : undefined,
    roofRal: twoTone ? twoTone.custom : undefined,
    sides,
    louverAngle: clamp(config.louverAngle, [0, 90]),
    // Dőlés egész fokban; 0 = vízszintes (a mező ilyenkor el is marad). A burkolat az alapkivitelnél szintén elmarad.
    pitch: Math.round(clamp(config.pitch ?? 0, PITCH_RANGE)) || undefined,
    // Oldalüvegezés: csak zárt építménynél, az alapkivitel (veranda: edzett, télikert: kétrétegű) nem külön tétel.
    wallGlazing: building && config.wallGlazing && config.wallGlazing !== defaultWallGlazing(building) && wallGlazingOptions(building).includes(config.wallGlazing) ? config.wallGlazing : undefined,
    // Klíma csak télikertben; split klíma csak ha a tenant kínálja a klímát.
    climate: building === 'conservatory' && config.climate ? config.climate : undefined,
    foundation: building === 'conservatory' && config.foundation ? true : undefined,
    glazing: config.glazing && glazingOptions(roof).includes(config.glazing) && config.glazing !== defaultGlazing(roof) ? config.glazing : undefined,
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
    // Tetőárnyékoló csak üveg-/polikarbonát tetőhöz, ha a gyártó kínálja; tetőcserénél elmarad.
    ...(tenant.extras.roofShade && config.roofShade && supportsRoofShade(roof) ? { roofShade: config.roofShade, shadeFabric: SHADE_FABRICS.some((item) => item.id === config.shadeFabric) ? config.shadeFabric : DEFAULT_SHADE_FABRIC } : { roofShade: undefined, shadeFabric: undefined }),
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
