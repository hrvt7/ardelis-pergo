import { PANEL, panelLayout } from './solar'
import { ROOF_INFO, ROOF_TYPES } from './roofs'
import { isWallSide, omittedPosts, sideWalls } from './mount'
import type { PergolaConfig, PriceBreakdown, PriceLine, PriceSettings, RoofType, SideKey, SideType } from '../types/pergola'

export const DEFAULT_PRICES: PriceSettings = {
  louveredPerM2Net: 165000,
  retractablePerM2Net: 240000,
  fixedPerM2Net: 85000,
  fabricRoofPerM2Net: 125000,
  glassRoofPerM2Net: 105000,
  polycarbonatePerM2Net: 70000,
  freestandingSurchargeNet: 120000,
  sideWallAttachPerMeterNet: 24000,
  postNet: 65000,
  zipPerM2Net: 45000,
  glassPerM2Net: 105000,
  louverWallPerM2Net: 70000,
  ledPerMeterNet: 10000,
  heaterUnitNet: 200000,
  speakerPairNet: 220000,
  sensorsNet: 95000,
  solarPerKwpNet: 330000,
  customColorRate: 0.06,
  installationRate: 0.1,
  vatRate: 0.27,
}

export const ROOF_LABELS = Object.fromEntries(ROOF_TYPES.map((roof) => [roof, `${ROOF_INFO[roof].name} · ${ROOF_INFO[roof].short}`])) as Record<RoofType, string>

export const SIDE_LABELS: Record<SideType, string> = {
  none: 'Nyitott',
  zip: 'ZIP screen',
  glass: 'Tolóüveg',
  louver: 'Fix lamella',
}

/** Ártételek címe (pl. „Bal oldal · ZIP screen”, nem „Bal oldali oldal”). */
const SIDE_TITLES: Record<SideKey, string> = { front: 'Elülső oldal', back: 'Hátsó oldal', left: 'Bal oldal', right: 'Jobb oldal' }

export const SIDE_NAMES: Record<SideKey, string> = {
  front: 'Elülső',
  back: 'Hátsó',
  left: 'Bal oldali',
  right: 'Jobb oldali',
}

export const formatHuf = (value: number) =>
  new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(Math.round(value))

export const formatNumber = (value: number, digits = 1) =>
  new Intl.NumberFormat('hu-HU', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)

const round = (value: number) => Math.round(value / 1000) * 1000

export function calculatePrice(config: PergolaConfig, prices: PriceSettings, roofLabels: Record<RoofType, string> = ROOF_LABELS): PriceBreakdown {
  const area = config.width * config.depth
  const perimeter = 2 * (config.width + config.depth)
  const lines: PriceLine[] = []

  const roofRate = prices[ROOF_INFO[config.roof].priceKey]

  const structure = area * roofRate
  lines.push({
    id: 'structure',
    label: roofLabels[config.roof],
    detail: `${formatNumber(area)} m² × ${formatHuf(roofRate)} / m²`,
    amountNet: round(structure),
  })

  if (config.mount === 'freestanding') {
    lines.push({
      id: 'mount',
      label: 'Önálló szerkezeti kivitel',
      detail: 'Négyoszlopos minta-konstrukció',
      amountNet: round(prices.freestandingSurchargeNet),
    })
  }

  sideWalls(config.mount).forEach((side) => {
    lines.push({
      id: `wall-${side}`,
      label: `Oldalfali rögzítés · ${side === 'left' ? 'bal' : 'jobb'} oldal`,
      detail: `${formatNumber(config.depth, 2)} fm × ${formatHuf(prices.sideWallAttachPerMeterNet)} / fm`,
      amountNet: round(config.depth * prices.sideWallAttachPerMeterNet),
    })
  })

  const savedPosts = omittedPosts(config.mount)
  if (savedPosts > 0 && prices.postNet > 0) {
    lines.push({
      id: 'posts-saved',
      label: `Elmaradó oszlop · ${savedPosts} db`,
      detail: `A falak kiváltják · ${savedPosts} × ${formatHuf(prices.postNet)}`,
      amountNet: -round(savedPosts * prices.postNet),
    })
  }

  if (config.frameColor === 'custom') {
    lines.push({
      id: 'color',
      label: 'Egyedi RAL felületkezelés',
      detail: `Szerkezeti ár × ${Math.round(prices.customColorRate * 100)}%`,
      amountNet: round(structure * prices.customColorRate),
    })
  }

  ;(['front', 'back', 'left', 'right'] as SideKey[]).forEach((side) => {
    const type = config.sides[side]
    if (type === 'none' || isWallSide(config.mount, side)) return
    const length = side === 'front' || side === 'back' ? config.width : config.depth
    const sideArea = length * config.height
    const rate = type === 'zip' ? prices.zipPerM2Net : type === 'glass' ? prices.glassPerM2Net : prices.louverWallPerM2Net
    lines.push({
      id: `side-${side}`,
      label: `${SIDE_TITLES[side]} · ${SIDE_LABELS[type]}`,
      detail: `${formatNumber(sideArea)} m² × ${formatHuf(rate)} / m²`,
      amountNet: round(sideArea * rate),
    })
  })

  if (config.led) {
    lines.push({
      id: 'led',
      label: 'Periméter LED-világítás',
      detail: `${formatNumber(perimeter)} fm integrált világítás`,
      amountNet: round(perimeter * prices.ledPerMeterNet),
    })
  }
  if (config.heaters > 0) {
    lines.push({
      id: 'heaters',
      label: 'Infravörös teraszfűtés',
      detail: `${config.heaters} db · integrált rögzítéssel`,
      amountNet: round(config.heaters * prices.heaterUnitNet),
    })
  }
  if (config.speakers) {
    lines.push({
      id: 'speakers',
      label: 'Bluetooth hangrendszer',
      detail: '1 pár · beépített kialakítás',
      amountNet: round(prices.speakerPairNet),
    })
  }
  if (config.sensors) {
    lines.push({
      id: 'sensors',
      label: 'Eső- és szélérzékelő csomag',
      detail: 'Automata vezérlési mintacsomag',
      amountNet: round(prices.sensorsNet),
    })
  }

  if (config.solar && config.roof === 'fixed') {
    const layout = panelLayout(config)
    if (layout.count > 0) lines.push({
      id: 'solar',
      label: 'Napelemes tető',
      detail: `${layout.count} × ${PANEL.wp} Wp = ${formatNumber(layout.kwp, 2)} kWp · ${formatHuf(prices.solarPerKwpNet)} / kWp`,
      amountNet: round(layout.kwp * prices.solarPerKwpNet),
    })
  }

  const subtotalNet = lines.reduce((sum, line) => sum + line.amountNet, 0)
  const installationNet = round(subtotalNet * prices.installationRate)
  const totalNet = subtotalNet + installationNet
  const vatNet = round(totalNet * prices.vatRate)
  const totalGross = totalNet + vatNet

  return { area, perimeter, lines, subtotalNet, installationNet, totalNet, vatNet, totalGross }
}
