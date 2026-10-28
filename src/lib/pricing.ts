import type { PergolaConfig, PriceBreakdown, PriceLine, PriceSettings, RoofType, SideKey, SideType } from '../types/pergola'

export const DEFAULT_PRICES: PriceSettings = {
  louveredPerM2Net: 220000,
  retractablePerM2Net: 340000,
  fixedPerM2Net: 80000,
  freestandingSurchargeNet: 120000,
  zipPerM2Net: 85000,
  glassPerM2Net: 165000,
  louverWallPerM2Net: 120000,
  ledPerMeterNet: 12000,
  heaterUnitNet: 220000,
  speakerPairNet: 280000,
  sensorsNet: 180000,
  customColorRate: 0.06,
  installationRate: 0.12,
  vatRate: 0.27,
}

export const ROOF_LABELS: Record<RoofType, string> = {
  louvered: 'Aero · motoros lamellás',
  retractable: 'Glide · eltolható lamellás',
  fixed: 'Line · fix alumínium',
}

export const SIDE_LABELS: Record<SideType, string> = {
  none: 'Nyitott',
  zip: 'ZIP screen',
  glass: 'Tolóüveg',
  louver: 'Fix lamella',
}

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

  const roofRate = config.roof === 'louvered'
    ? prices.louveredPerM2Net
    : config.roof === 'retractable'
      ? prices.retractablePerM2Net
      : prices.fixedPerM2Net

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
    if (type === 'none' || (config.mount === 'wall' && side === 'back')) return
    const length = side === 'front' || side === 'back' ? config.width : config.depth
    const sideArea = length * config.height
    const rate = type === 'zip' ? prices.zipPerM2Net : type === 'glass' ? prices.glassPerM2Net : prices.louverWallPerM2Net
    lines.push({
      id: `side-${side}`,
      label: `${SIDE_NAMES[side]} oldal · ${SIDE_LABELS[type]}`,
      detail: `${formatNumber(sideArea)} m² × ${formatHuf(rate)} / m²`,
      amountNet: round(sideArea * rate),
    })
  })

  if (config.led) {
    lines.push({
      id: 'led',
      label: 'Periméter LED · melegfehér',
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

  const subtotalNet = lines.reduce((sum, line) => sum + line.amountNet, 0)
  const installationNet = round(subtotalNet * prices.installationRate)
  const totalNet = subtotalNet + installationNet
  const vatNet = round(totalNet * prices.vatRate)
  const totalGross = totalNet + vatNet

  return { area, perimeter, lines, subtotalNet, installationNet, totalNet, vatNet, totalGross }
}
