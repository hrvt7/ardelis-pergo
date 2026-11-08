// Garázskapu termékcsalád React nélküli magja: konfiguráció-séma, alapértékek, mintaárlista, feliratok, spec-kód,
// fejléc és leírás a lead-e-mailhez, megosztó kód. Csak relatív importok: a lead-végpont (Edge) is ezt használja a
// garázskapu-motoron keresztül (src/products/engines.ts).
import { z } from 'zod'
import type { PriceBreakdown, PriceLine } from '../types/pergola'
import { formatHuf, formatNumber } from '../lib/pricing'

export type GarageType = 'sectional' | 'tilt' | 'roller' | 'sideSliding'
export type GaragePanel = 'microRib' | 'largeRib' | 'cassette' | 'flat' | 'woodgrain'
export type GarageInsulation = 'single' | 'insulated40' | 'insulated60'
export type GarageWindows = 'none' | 'topRow' | 'vertical' | 'square'
export type GarageColor = 'anthracite' | 'white' | 'black' | 'bronze' | 'silver' | 'goldenOak' | 'custom'

export interface GarageConfig {
  type: GarageType
  /** Tiszta nyílásméret méterben (szélesség × magasság). */
  width: number
  height: number
  panel: GaragePanel
  insulation: GarageInsulation
  windows: GarageWindows
  color: GarageColor
  customRal?: string
  motor: boolean
  smartControl: boolean
  photocell: boolean
  /** Személybejáró ajtó a kapulapban. */
  wicket: boolean
  /** Külön oldalajtó a kapu mellett, azonos arculattal. */
  sideDoor: boolean
  /** Alacsony szemöldökű beépítés (kevés hely a nyílás fölött). */
  lowHeadroom: boolean
}

export interface GaragePriceSettings {
  perM2: Record<GarageType, number>
  insulationFactor: Record<GarageInsulation, number>
  panelFactor: Record<GaragePanel, number>
  windows: Record<Exclude<GarageWindows, 'none'>, number>
  motor: number
  smartControl: number
  photocell: number
  wicket: number
  sideDoor: number
  lowHeadroom: number
  customColorRate: number
  installationRate: number
  vatRate: number
}

/** Tipikus egyállásos szekcionált kapu: 2,5 × 2,125 m, 40 mm-es szendvicspanel, motorral és fotocellával. */
export const GARAGE_DEFAULTS: GarageConfig = {
  type: 'sectional', width: 2.5, height: 2.125, panel: 'largeRib', insulation: 'insulated40', windows: 'none',
  color: 'anthracite', motor: true, smartControl: false, photocell: true, wicket: false, sideDoor: false, lowHeadroom: false,
}

/** Nettó mintaárak (HUF). A gyártó saját árlistája később a tenantból jön. */
export const GARAGE_PRICE_DEFAULTS: GaragePriceSettings = {
  perM2: { sectional: 78000, tilt: 52000, roller: 88000, sideSliding: 112000 },
  insulationFactor: { single: 0.82, insulated40: 1, insulated60: 1.22 },
  panelFactor: { microRib: 1, largeRib: 1, cassette: 1.08, flat: 1.05, woodgrain: 1.14 },
  windows: { topRow: 165000, vertical: 118000, square: 142000 },
  motor: 195000,
  smartControl: 48000,
  photocell: 29000,
  wicket: 265000,
  sideDoor: 285000,
  lowHeadroom: 58000,
  customColorRate: 0.12,
  installationRate: 0.12,
  vatRate: 0.27,
}

export const GARAGE_META = { name: 'Garage', title: 'Garázskapu', description: 'Szekcionált, billenő, redőny- vagy oldalra nyíló garázskapu nyílásméretre, panelmintával, ablakkal és motorral.' }

export const GARAGE_LABELS = {
  type: { sectional: 'Szekcionált kapu', tilt: 'Billenő kapu', roller: 'Redőnykapu', sideSliding: 'Oldalra nyíló szekcionált' },
  panel: { microRib: 'Keskeny bordás (M-borda)', largeRib: 'Széles bordás (L-borda)', cassette: 'Kazettás', flat: 'Sima, bordamentes', woodgrain: 'Fahatású mintázat' },
  insulation: { single: 'Egyhéjú acéllemez', insulated40: '40 mm szendvicspanel', insulated60: '60 mm szendvicspanel' },
  windows: { none: 'Nincs ablak', topRow: 'Felső ablaksor', vertical: 'Függőleges üvegsáv', square: 'Négyzetes ablakok' },
  color: { anthracite: 'Antracit · RAL 7016', white: 'Fehér · RAL 9016', black: 'Fekete · RAL 9005', bronze: 'Bronz · RAL 8017', silver: 'Ezüst · RAL 9006', goldenOak: 'Aranytölgy fólia', custom: 'Egyedi RAL' },
} as const

export const GARAGE_COLOR_HEX: Record<GarageColor, string> = {
  anthracite: '#343a3d', white: '#e4e4de', black: '#171b1d', bronze: '#5a4639', silver: '#a7abaa', goldenOak: '#9a6a3c', custom: '#687467',
}
const RAL: Record<string, string> = { '7016': '#343a3d', '7024': '#484a49', '7035': '#c5c9c7', '9005': '#15191c', '9006': '#a7abaa', '9010': '#eeeae0', '9016': '#e4e4de', '6005': '#314b3c', '8017': '#4b3830', '3004': '#74373b', '5010': '#315c78' }
export function garageColor(config: GarageConfig) {
  if (config.color !== 'custom') return GARAGE_COLOR_HEX[config.color]
  return RAL[config.customRal?.match(/\d{4}/)?.[0] ?? ''] ?? '#687467'
}

/** Mely beállítások értelmezhetők az adott kaputípusnál (a vezérlők és a 3D is ezt követi). */
export const garageFeatures = (type: GarageType) => ({
  panel: type !== 'roller',
  insulation: type === 'sectional' || type === 'sideSliding',
  windows: type !== 'roller',
  wicket: type === 'sectional' || type === 'sideSliding',
  lowHeadroom: type === 'sectional',
})

const round = (value: number) => Math.round(value / 1000) * 1000

export function calculateGaragePrice(config: GarageConfig, prices: GaragePriceSettings): PriceBreakdown {
  const lines: PriceLine[] = []
  const features = garageFeatures(config.type)
  const area = config.width * config.height
  const perimeter = 2 * (config.width + config.height)
  const rate = prices.perM2[config.type]
  const insulationFactor = features.insulation ? prices.insulationFactor[config.insulation] : 1
  const panelFactor = features.panel ? prices.panelFactor[config.panel] : 1
  const door = area * rate * insulationFactor * panelFactor
  lines.push({ id: 'door', label: GARAGE_LABELS.type[config.type], detail: `${formatNumber(config.width, 2)} × ${formatNumber(config.height, 2)} m · ${formatNumber(area)} m² × ${formatHuf(rate)} / m²${features.insulation ? ` · ${GARAGE_LABELS.insulation[config.insulation]}` : ''}`, amountNet: round(door) })
  lines.push({ id: 'frame', label: 'Vezetősín, tok és vasalat', detail: config.type === 'sectional' ? 'Sínrendszer, torziós rugó, görgők' : config.type === 'roller' ? 'Oldalsó vezetők és tengelydoboz' : config.type === 'tilt' ? 'Billenő karok és rugók' : 'Alsó-felső vezetősín, görgők', amountNet: round(perimeter * 9500) })
  if (features.windows && config.windows !== 'none') lines.push({ id: 'windows', label: GARAGE_LABELS.windows[config.windows], detail: 'Hőszigetelt, kétrétegű betét', amountNet: prices.windows[config.windows] })
  if (features.wicket && config.wicket) lines.push({ id: 'wicket', label: 'Személybejáró a kapulapban', detail: 'Küszöb nélküli, zárral és kilinccsel', amountNet: prices.wicket })
  if (config.sideDoor) lines.push({ id: 'sideDoor', label: 'Illeszkedő oldalajtó', detail: 'Azonos panel és szín · 0,95 × 2,1 m', amountNet: prices.sideDoor })
  if (config.motor) lines.push({ id: 'motor', label: 'Kapumotor', detail: 'Mennyezeti hajtás, két távirányító, vészkioldó', amountNet: prices.motor })
  if (config.motor && config.smartControl) lines.push({ id: 'smart', label: 'Okos vezérlés', detail: 'Wi-Fi modul, app, kódkapcsoló', amountNet: prices.smartControl })
  if (config.motor && config.photocell) lines.push({ id: 'photocell', label: 'Fotocella', detail: 'Becsípődés elleni érzékelő pár', amountNet: prices.photocell })
  if (features.lowHeadroom && config.lowHeadroom) lines.push({ id: 'lowHeadroom', label: 'Alacsony szemöldök vasalat', detail: 'Kettős vízszintes sín, elöl futó rugó', amountNet: prices.lowHeadroom })
  if (config.color === 'custom') lines.push({ id: 'color', label: 'Egyedi RAL szín', detail: `Kapulap × ${Math.round(prices.customColorRate * 100)}%`, amountNet: round(door * prices.customColorRate) })

  const subtotalNet = lines.reduce((sum, line) => sum + line.amountNet, 0)
  const installationNet = round(subtotalNet * prices.installationRate)
  const totalNet = subtotalNet + installationNet
  const vatNet = round(totalNet * prices.vatRate)
  return { area, perimeter, lines, subtotalNet, installationNet, totalNet, vatNet, totalGross: totalNet + vatNet }
}

export function garageSpecCode(config: GarageConfig) {
  const features = garageFeatures(config.type)
  const parts = ['GARAGE', config.type.toUpperCase(), `${config.width.toFixed(2)}X${config.height.toFixed(2)}`]
  if (features.panel) parts.push(config.panel.toUpperCase())
  if (features.insulation) parts.push(config.insulation === 'single' ? 'S' : config.insulation === 'insulated40' ? '40' : '60')
  parts.push(config.color === 'custom' ? config.customRal?.replace(/\D/g, '') || 'RAL' : config.color.toUpperCase())
  return parts.join('-')
}

/** Egy sor a lead-e-mail fejlécébe, pl. „Garázskapu · Szekcionált kapu · 2,50 × 2,13 m · antracit”. */
export function garageHeadline(config: GarageConfig) {
  return `${GARAGE_META.title} · ${GARAGE_LABELS.type[config.type]} · ${formatNumber(config.width, 2)} × ${formatNumber(config.height, 2)} m · ${GARAGE_LABELS.color[config.color].split(' · ')[0].toLowerCase()}`
}

/** A konfiguráció olvasható sorai (lead-e-mail, adatbázis, PDF). */
export function garageSpecRows(config: GarageConfig, price: PriceBreakdown): [string, string][] {
  const features = garageFeatures(config.type)
  const extras = [config.motor ? 'motor' : null, config.motor && config.smartControl ? 'okos vezérlés' : null, config.motor && config.photocell ? 'fotocella' : null, features.wicket && config.wicket ? 'személybejáró' : null, config.sideDoor ? 'oldalajtó' : null, features.lowHeadroom && config.lowHeadroom ? 'alacsony szemöldök' : null].filter(Boolean)
  return [
    ['Termék', GARAGE_META.title],
    ['Típus', GARAGE_LABELS.type[config.type]],
    ['Nyílásméret', `${formatNumber(config.width, 2)} × ${formatNumber(config.height, 2)} m · ${formatNumber(price.area)} m²`],
    ...(features.panel ? [['Panelminta', GARAGE_LABELS.panel[config.panel]] as [string, string]] : []),
    ...(features.insulation ? [['Szigetelés', GARAGE_LABELS.insulation[config.insulation]] as [string, string]] : []),
    ...(features.windows ? [['Ablak', GARAGE_LABELS.windows[config.windows]] as [string, string]] : []),
    ['Szín', GARAGE_LABELS.color[config.color] + (config.color === 'custom' && config.customRal ? ` (${config.customRal})` : '')],
    ['Felszereltség', extras.length ? extras.join(', ') : 'kézi működtetés'],
    ['Konfigurációs kód', garageSpecCode(config)],
  ]
}

export const garageConfigSchema = z.object({
  type: z.enum(['sectional', 'tilt', 'roller', 'sideSliding']),
  width: z.number().min(2).max(6), height: z.number().min(1.8).max(3),
  panel: z.enum(['microRib', 'largeRib', 'cassette', 'flat', 'woodgrain']),
  insulation: z.enum(['single', 'insulated40', 'insulated60']),
  windows: z.enum(['none', 'topRow', 'vertical', 'square']),
  color: z.enum(['anthracite', 'white', 'black', 'bronze', 'silver', 'goldenOak', 'custom']),
  customRal: z.string().max(12).optional(),
  motor: z.boolean(), smartControl: z.boolean(), photocell: z.boolean(), wicket: z.boolean(), sideDoor: z.boolean(), lowHeadroom: z.boolean(),
})

export function parseGarageConfig(raw: unknown): GarageConfig | null {
  const parsed = garageConfigSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

const toBase64Url = (text: string) => btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromBase64Url = (text: string) => decodeURIComponent(escape(atob(text.replace(/-/g, '+').replace(/_/g, '/'))))
export const encodeGarageHash = (config: GarageConfig) => `g=${toBase64Url(JSON.stringify(config))}`
export function decodeGarageHash(hash: string): unknown {
  const match = hash.replace(/^#/, '').match(/^g=([A-Za-z0-9_-]+)$/)
  if (!match) return null
  try { return JSON.parse(fromBase64Url(match[1])) } catch { return null }
}

/** Az oldalajtó (0,95 m) középvonala: 45 cm falpillér után a kapunyílás jobb oldalán. */
export const GARAGE_SIDE_DOOR = { width: 0.95, gap: 0.45 }
export const garageSideDoorX = (config: GarageConfig) => config.width / 2 + GARAGE_SIDE_DOOR.gap + GARAGE_SIDE_DOOR.width / 2
