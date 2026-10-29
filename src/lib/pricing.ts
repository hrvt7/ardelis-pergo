import { PANEL, panelLayout } from './solar'
import { describeColor, roofPartName, type ColorInfo } from './colors'

/** Az árszámításnak csak a szín jellege kell (alapszín-e), a gyártói név nem. */
const COLORLESS = { colors: [] as { id: never; name: string; detail: string; hex: string }[] }
import { HALF_NAMES, SIDE_INFO, SIDE_LABELS, sideLength, sideSegments, splitProfiles } from './sides'
import { ROOF_INFO, ROOF_TYPES } from './roofs'
import { omittedPosts, sideWalls } from './mount'
import type { PergolaConfig, PriceBreakdown, PriceLine, PriceSettings, RoofType, SideKey } from '../types/pergola'

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
  glassFramedPerM2Net: 95000,
  glassFixedPerM2Net: 80000,
  slatAluPerM2Net: 55000,
  slatWoodPerM2Net: 45000,
  splitProfileNet: 35000,
  ledRgbPerMeterNet: 4000,
  fanUnitNet: 130000,
  smartHomeNet: 120000,
  customColorRate: 0.06,
  woodColorRate: 0.18,
  installationRate: 0.1,
  vatRate: 0.27,
}

export const ROOF_LABELS = Object.fromEntries(ROOF_TYPES.map((roof) => [roof, `${ROOF_INFO[roof].name} · ${ROOF_INFO[roof].short}`])) as Record<RoofType, string>

export { SIDE_LABELS } from './sides'

/** Ártételek címe (pl. „Bal oldal · ZIP screen”, nem „Bal oldali oldal”). */
const SIDE_TITLES: Record<SideKey, string> = { front: 'Elülső oldal', back: 'Hátsó oldal', left: 'Bal oldal', right: 'Jobb oldal' }

export const SIDE_NAMES: Record<SideKey, string> = {
  front: 'Elülső',
  back: 'Hátsó',
  left: 'Bal oldali',
  right: 'Jobb oldali',
}

// Az Intl.NumberFormat létrehozása drága (~50 µs): egyszer készül, utána újrahasznosítjuk.
// (A költségkeret-tervező egy futása több tízezer árat számol.)
const HUF_FORMAT = new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 })
const NUMBER_FORMATS = new Map<number, Intl.NumberFormat>()

export const formatHuf = (value: number) => HUF_FORMAT.format(Math.round(value))

export function formatNumber(value: number, digits = 1) {
  let format = NUMBER_FORMATS.get(digits)
  if (!format) { format = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: digits, minimumFractionDigits: digits }); NUMBER_FORMATS.set(digits, format) }
  return format.format(value)
}

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

  // Egyedi szín: a szerkezeti ár arányában (fa hatású bevonat külön kulccsal). Kéttónusú kivitelnél
  // a váz és a tető/lamellák fele-fele arányban viseli; két alapszín kombinációja felár nélküli.
  const colorParts: { id: string; part: string; color: ColorInfo; share: number }[] = []
  const frame = describeColor(COLORLESS, config.frameColor, config.customRal)
  if (config.roofColor) {
    const roofInfo = describeColor(COLORLESS, config.roofColor, config.roofRal)
    if (!frame.standard) colorParts.push({ id: 'color', part: 'Váz', color: frame, share: 0.5 })
    if (!roofInfo.standard) colorParts.push({ id: 'color-roof', part: roofPartName(config.roof), color: roofInfo, share: 0.5 })
  } else if (!frame.standard) {
    colorParts.push({ id: 'color', part: '', color: frame, share: 1 })
  }
  colorParts.forEach(({ id, part, color, share }) => {
    const rate = color.kind === 'wood' ? prices.woodColorRate : prices.customColorRate
    const what = color.kind === 'wood' ? 'Fa hatású bevonat' : 'Egyedi szín'
    lines.push({
      id,
      label: `${part ? `${part} · ` : ''}${what}${color.name === 'Egyedi szín' ? (color.code ? ` · ${color.code}` : '') : ` · ${color.kind === 'wood' ? color.name : `${color.name} (${color.code})`}`}`,
      detail: `Szerkezeti ár${share < 1 ? ' fele' : ''} × ${Math.round(rate * 100)}%`,
      amountNet: round(structure * share * rate),
    })
  })

  ;(['front', 'back', 'left', 'right'] as SideKey[]).forEach((side) => {
    const segments = sideSegments(config, side)
    const length = sideLength(config, side)
    segments.forEach((segment) => {
      const key = SIDE_INFO[segment.type].priceKey
      if (!key) return
      const sideArea = length * (segment.to - segment.from) * config.height
      const rate = prices[key] as number
      lines.push({
        id: segment.half === null ? `side-${side}` : `side-${side}-${segment.half}`,
        label: `${SIDE_TITLES[side]}${segment.half === null ? '' : `, ${HALF_NAMES[side][segment.half]}`} · ${SIDE_LABELS[segment.type]}`,
        detail: `${formatNumber(sideArea)} m² × ${formatHuf(rate)} / m²`,
        amountNet: round(sideArea * rate),
      })
    })
  })
  const profiles = splitProfiles(config)
  if (profiles > 0) {
    lines.push({
      id: 'split-profiles',
      label: `Osztóprofil · ${profiles} db`,
      detail: `Félbe osztott oldal középső merevítője · ${profiles} × ${formatHuf(prices.splitProfileNet)}`,
      amountNet: round(profiles * prices.splitProfileNet),
    })
  }

  if (config.led) {
    lines.push({
      id: 'led',
      label: 'Periméter LED-világítás',
      detail: `${formatNumber(perimeter)} fm integrált világítás`,
      amountNet: round(perimeter * prices.ledPerMeterNet),
    })
  }
  if (config.led && config.ledRgb) {
    lines.push({
      id: 'led-rgb',
      label: 'Színváltós RGB+W LED',
      detail: `${formatNumber(perimeter)} fm × ${formatHuf(prices.ledRgbPerMeterNet)} felár · színek és jelenetek`,
      amountNet: round(perimeter * prices.ledRgbPerMeterNet),
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

  if (config.fans) {
    lines.push({
      id: 'fans',
      label: `Mennyezeti ventilátor · ${config.fans} db`,
      detail: 'Kültéri (IP44), DC motor, tartógerendával és bekötéssel',
      amountNet: round(config.fans * prices.fanUnitNet),
    })
  }
  if (config.smartHome) {
    lines.push({
      id: 'smart-home',
      label: 'Okosotthon-vezérlés',
      detail: 'Wi-Fi központ · telefonos app, időzítés, jelenetek, hangvezérlés',
      amountNet: round(prices.smartHomeNet),
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
