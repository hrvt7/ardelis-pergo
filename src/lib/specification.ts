import { findShadeFabric, ROOF_SHADE_INFO, roofShadeArea, roofShadeSummary } from './roofShade'
import { furnitureFit } from './furniture'
import { PANEL, panelLayout } from './solar'
import { ROOF_INFO, isGlazedRoof, GLAZING_INFO, effectiveGlazing, roofRise } from './roofs'
import { isWallSide, MOUNT_CODES, MOUNT_LABELS, postPositions, sideWalls, wallLabel } from './mount'
import { bayWidth, middlePostCount, moduleCount } from './modules'
import { formatHuf, formatNumber, ROOF_LABELS, SIDE_NAMES } from './pricing'
import { colorSummary } from './colors'
import type { Tenant } from '../tenants/types'
import { CLIMATE_INFO, doorCount } from './buildings'
import { closedSegments, SIDE_INFO, sideSegments, sideSummary, splitProfiles } from './sides'
import type { PergolaConfig, PriceBreakdown, RoofType, SideKey } from '../types/pergola'

/** Alapszínek a gyártó nélküli hívásokhoz (tesztek, régi hívók). */
const DEFAULT_COLORS: Pick<Tenant, 'colors'> = { colors: [
  { id: 'anthracite', name: 'Antracit', detail: 'RAL 7016', hex: '#343a3d', ral: '7016' },
  { id: 'white', name: 'Fehér', detail: 'RAL 9016', hex: '#dedfd9', ral: '9016' },
  { id: 'black', name: 'Fekete', detail: 'RAL 9005', hex: '#15191c', ral: '9005' },
  { id: 'bronze', name: 'Bronz', detail: 'anodizált hatás', hex: '#705b4c' },
] }

export interface BomLine { label: string; value: string }

export function getSpecCode(config: PergolaConfig) {
  const roof = ROOF_INFO[config.roof].spec
  const mount = MOUNT_CODES[config.mount]
  const colorCode = (color: PergolaConfig['frameColor'], custom?: string) => color === 'custom'
    ? custom?.normalize('NFD').replace(/[^a-z0-9]/gi, '').replace(/^RAL/i, '').toUpperCase() || 'RAL'
    : { anthracite: '7016', black: '9005', white: '9016', bronze: 'BRZ' }[color]
  // Kéttónusú: „7016/9016” (váz/tető).
  const color = colorCode(config.frameColor, config.customRal) + (config.roofColor ? `/${colorCode(config.roofColor, config.roofRal)}` : '')
  // Oldalanként egy betű; félbe osztott oldalnál a két fél zárójelben, pl. „(G/Z)”.
  const sides = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => (isWallSide(config.mount, side) ? 'W' : (() => { const codes = sideSegments(config, side).map((segment) => SIDE_INFO[segment.type].spec); return codes.length > 1 ? `(${codes.join('/')})` : codes[0] })())).join('')
  const options = [(config.modules ?? 1) > 1 ? `M${config.modules}` : '', config.solar ? 'PV' : '', config.smartHome ? 'SH' : '', config.fans ? `F${config.fans}` : '', config.led && config.ledRgb ? 'RGB' : '', config.roofShade ? ROOF_SHADE_INFO[config.roofShade].spec : '', config.building === 'conservatory' ? 'TK' : config.building === 'veranda' ? 'VR' : ''].filter(Boolean)
  return `PG-${roof}-${Math.round(config.width * 100)}${Math.round(config.depth * 100)}-${mount}-${color}-${sides}${options.map((option) => `-${option}`).join('')}`
}

export function getBom(config: PergolaConfig): BomLine[] {
  const segments = closedSegments(config)
  const panes = (types: string[], width: number, min: number) => segments.filter((segment) => types.includes(segment.type)).reduce((sum, segment) => sum + Math.max(min, Math.round(segment.length / width)), 0)
  const glassPanes = panes(['glass'], 1.12, 2)
  const framedPanes = panes(['glassFramed'], 1.2, 2)
  const fixedPanes = panes(['glassFixed'], 1.5, 1)
  const screens = segments.filter((segment) => segment.type === 'zip').length
  const runs = (type: string) => segments.filter((segment) => segment.type === type)
  const runText = (type: string) => runs(type).map((segment) => `${formatNumber(segment.length, 2)} m`).join(' + ')
  const profiles = splitProfiles(config)
  const slatCount = (type: string) => runs(type).length ? Math.ceil((config.height - 0.12) / (type === 'slatWood' ? 0.115 : 0.105)) : 0
  const optional: BomLine[] = [
    ...(framedPanes ? [{ label: 'Keretes tolóüveg elem', value: `${framedPanes} db · alumínium keret, kefés tömítés` }] : []),
    ...(fixedPanes ? [{ label: 'Fix üvegtábla', value: `${fixedPanes} db · 8 mm ESG, U-profilban` }] : []),
    ...(() => { const doors = doorCount(config); return [
      ...(doors.hinged ? [{ label: 'Nyíló ajtó', value: `${doors.hinged} db · 90 cm szabad szélesség, háromponton záródó zár` }] : []),
      ...(doors.sliding ? [{ label: 'Toló ajtószerkezet', value: `${doors.sliding} db · alsó sín, kefés tömítés` }] : []),
    ] })(),
    ...(runs('louver').length ? [{ label: 'Lamellafal', value: `${runText('louver')} · állítható lamellák` }] : []),
    ...(runs('slatAlu').length ? [{ label: 'Alumínium lécfal', value: `${runText('slatAlu')} · ${slatCount('slatAlu')} léc / mező, 25 mm hézag` }] : []),
    ...(runs('slatWood').length ? [{ label: 'Fa lécfal (hőkezelt)', value: `${runText('slatWood')} · ${slatCount('slatWood')} léc / mező, 20 mm hézag` }] : []),
    ...(profiles ? [{ label: 'Osztóprofil (félbe osztott oldal)', value: `${profiles} db · ${formatNumber(config.height, 2)} m` }] : []),
    ...(config.pitch ? [{ label: 'Tetődőlés', value: `${config.pitch}° · hátsó él +${formatNumber(roofRise(config), 2)} m` }] : []),
    ...(effectiveGlazing(config) ? [{ label: 'Tetőburkolat', value: GLAZING_INFO[effectiveGlazing(config)!].label + ' · ' + GLAZING_INFO[effectiveGlazing(config)!].short.toLowerCase() }] : []),
    ...(config.fans ? [{ label: 'Mennyezeti ventilátor', value: `${config.fans} db · tartógerendával, fali kapcsolóval` }] : []),
    ...(config.roofShade ? [{ label: 'Motoros tetőárnyékoló', value: `${ROOF_SHADE_INFO[config.roofShade].short} · ${formatNumber(roofShadeArea(config), 2)} m² · ${findShadeFabric(config.shadeFabric).name.toLowerCase()} ponyva, vezetősínnel, rádiós motorral` }] : []),
  ]
  const posts = postPositions(config).length
  const middlePosts = middlePostCount(config)
  const modules = moduleCount(config)
  const sharedPosts = (modules - 1) * (config.mount === 'freestanding' ? 2 : 1)
  const walls = sideWalls(config.mount)
  return [
    ...(modules > 1 ? [{ label: 'Összekapcsolt modulok', value: `${modules} × ${formatNumber(bayWidth(config), 2)} m mező · közös oszlopokkal, összesen ${formatNumber(config.width, 2)} m` }] : []),
    { label: 'Hordozó oszlop', value: posts === 0 ? 'nincs · a falak tartják' : `${posts - middlePosts - sharedPosts} db${sharedPosts ? ` + ${sharedPosts} db közös modul-oszlop` : ''}${middlePosts ? ` + ${middlePosts} db középoszlop` : ''} · ${formatNumber(config.height, 2)} m` },
    ...(walls.length ? [{ label: 'Oldalfali csatlakozó profil', value: walls.map((side) => `${side === 'left' ? 'bal' : 'jobb'} ${formatNumber(config.depth, 2)} m`).join(' + ') }] : []),
    { label: 'Keretgerenda', value: `2 × ${formatNumber(config.width, 2)} m + 2 × ${formatNumber(config.depth, 2)} m${modules > 1 ? ` + ${modules - 1} × ${formatNumber(config.depth, 2)} m modulgerenda` : ''}` },
    roofBomLine(config),
    ...(config.solar ? [solarBomLine(config)] : []),
    { label: 'Tolóüveg panel', value: `${glassPanes} db` },
    { label: 'ZIP screen kazetta', value: `${screens} db` },
    ...optional,
    { label: 'Rejtett lefolyó', value: posts === 0 ? '1 db · falon vezetett lefolyócső' : `${config.mount === 'freestanding' ? 2 : 1} db · oszlopba integrálva` },
    { label: 'Villamos opciók', value: `${config.led ? (config.ledRgb ? 'RGB+W LED' : 'LED') : 'LED nélkül'} · ${config.heaters} db fűtés${config.speakers ? ' · hangrendszer' : ''}${config.sensors ? ' · szenzor' : ''}${config.smartHome ? ' · okosotthon-központ' : ''}` },
  ]
}

function solarBomLine(config: PergolaConfig): BomLine {
  const layout = panelLayout(config)
  return { label: 'Napelem modul', value: `${layout.count} db × ${PANEL.wp} Wp (${formatNumber(layout.kwp, 2)} kWp) · ${layout.cols} × ${layout.rows} kiosztás` }
}

/** A tető anyaglista-sora tetőtípusonként. */
function roofBomLine(config: PergolaConfig) {
  const span = formatNumber(Math.max(0, config.width - 0.18), 2)
  if (config.roof === 'fixed') return { label: 'Fix tetőpanel', value: `${Math.max(2, Math.floor(config.depth / 0.65))} résszel` }
  if (isGlazedRoof(config.roof)) {
    const bays = Math.max(2, Math.ceil(config.width / 0.95))
    return { label: config.roof === 'glass' ? 'VSG üvegtábla' : 'Polikarbonát lemez', value: `${bays} db × ${formatNumber(config.depth - 0.2, 2)} m · ${bays + 1} db borda` }
  }
  if (config.roof === 'fabric') return { label: 'Textil ponyva + futósín', value: `${formatNumber(config.width * config.depth, 1)} m² · ${Math.max(4, Math.ceil(config.depth / 0.5))} db ponyvatartó` }
  return { label: 'Aerofoil tetőlamella', value: `${Math.max(10, Math.floor(config.depth / 0.22))} db × ${span} m` }
}

export function getDeliveryEstimate(config: PergolaConfig) {
  const complexity = closedSegments(config).length + config.heaters + (config.speakers ? 1 : 0) + (config.fans ?? 0)
  const min = Math.min(8, 4 + Math.floor(complexity / 3))
  return `${min}–${min + 2} hét a műszaki jóváhagyástól · nem vállalt határidő`
}

/** Hány főnek való, és mi fér el alatta — ugyanazzal a helyigény-számítással, mint a bútorválasztó. */
export function getSizeRecommendation(config: PergolaConfig) {
  const fits = (set: Parameters<typeof furnitureFit>[0]) => furnitureFit(set, config)?.level === 'comfortable'
  if (fits('combo')) return '8–10 főnek ajánlott · étkező és pihenősarok együtt is kényelmesen elfér'
  if (fits('dining8')) return '6–8 főnek ajánlott · 8 fős étkező vagy pihenősarok kényelmesen elfér'
  if (fits('dining6')) return '4–6 főnek ajánlott · 6 fős étkező vagy pihenősarok elfér'
  if (fits('lounge')) return '4–5 főnek ajánlott · kanapé és dohányzóasztal kényelmesen elfér'
  return '2–4 főnek ajánlott · kompakt étkező vagy kisebb pihenősarok'
}

export function createTextSummary(config: PergolaConfig, price: PriceBreakdown, roofLabels: Record<RoofType, string> = ROOF_LABELS, brandName = 'Lamelix', colors: Pick<Tenant, 'colors'> = DEFAULT_COLORS) {
  const sides = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => `${SIDE_NAMES[side]}: ${isWallSide(config.mount, side) ? wallLabel(side).toLowerCase() : sideSummary(config, side)}`).join(', ')
  const extras = [
    config.led ? (config.ledRgb ? 'színváltós RGB+W LED' : 'periméter LED') : null,
    config.heaters > 0 ? `${config.heaters} db teraszfűtés` : null,
    config.speakers ? 'hangrendszer' : null,
    config.sensors ? 'eső- és szélszenzor' : null,
    config.fans ? `${config.fans} db mennyezeti ventilátor` : null,
    config.smartHome ? 'okosotthon-vezérlés' : null,
    config.roofShade ? roofShadeSummary(config) : null,
    config.solar ? `napelemes tető (${formatNumber(panelLayout(config).kwp, 2)} kWp)` : null,
  ].filter((item): item is string => Boolean(item))
  return [
    `${brandName} / ${config.building === 'conservatory' ? 'Télikert' : config.building === 'veranda' ? 'Veranda' : 'Pergola'} – ${roofLabels[config.roof]}`,
    `Méret: ${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} × ${formatNumber(config.height, 2)} m (${formatNumber(price.area)} m²)`,
    ...(config.building ? [`Építmény: ${config.building === 'conservatory' ? 'télikert' : config.building === 'carport' ? 'carport' : 'veranda'}${config.climate ? ` · ${CLIMATE_INFO[config.climate].label.toLowerCase()}` : ''}`] : []),
    `Kialakítás: ${MOUNT_LABELS[config.mount].toLowerCase()} · ${sides}`,
    `Szín: ${colorSummary(colors, config)}`,
    `Kiegészítők: ${extras.length ? extras.join(', ') : 'nincs kiegészítő'}`,
    `Bruttó irányár: ${formatHuf(price.totalGross)} (telepítéssel, nem ajánlattétel)`,
    `Konfigurációs kód: ${getSpecCode(config)}`,
  ].join('\n')
}
