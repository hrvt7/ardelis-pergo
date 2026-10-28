import { furnitureFit } from './furniture'
import { ROOF_INFO, isGlazedRoof } from './roofs'
import { isWallSide, MOUNT_CODES, MOUNT_LABELS, openSides, postPositions, sideWalls, wallLabel } from './mount'
import { formatHuf, formatNumber, ROOF_LABELS, SIDE_LABELS, SIDE_NAMES } from './pricing'
import type { PergolaConfig, PriceBreakdown, RoofType, SideKey } from '../types/pergola'

export interface BomLine { label: string; value: string }

export function getSpecCode(config: PergolaConfig) {
  const roof = ROOF_INFO[config.roof].spec
  const mount = MOUNT_CODES[config.mount]
  const color = config.frameColor === 'custom'
    ? config.customRal?.replace(/[^a-z0-9]/gi, '').toUpperCase() || 'RAL'
    : { anthracite: '7016', black: '9005', white: '9016', bronze: 'BRZ' }[config.frameColor]
  const sides = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => (isWallSide(config.mount, side) ? 'W' : { none: '0', zip: 'Z', glass: 'G', louver: 'L' }[config.sides[side]])).join('')
  return `PG-${roof}-${Math.round(config.width * 100)}${Math.round(config.depth * 100)}-${mount}-${color}-${sides}`
}

export function getBom(config: PergolaConfig): BomLine[] {
  const activeSides = openSides(config.mount)
  const glassPanes = activeSides.reduce((sum, side) => {
    if (config.sides[side] !== 'glass') return sum
    const length = side === 'front' || side === 'back' ? config.width : config.depth
    return sum + Math.max(2, Math.round(length / 1.12))
  }, 0)
  const screens = activeSides.filter((side) => config.sides[side] === 'zip').length
  const posts = postPositions(config).length
  const middlePosts = config.width > 6 ? 1 : 0
  const walls = sideWalls(config.mount)
  return [
    { label: 'Hordozó oszlop', value: posts === 0 ? 'nincs · a falak tartják' : `${posts - middlePosts} db${middlePosts ? ` + ${middlePosts} db középoszlop` : ''} · ${formatNumber(config.height, 2)} m` },
    ...(walls.length ? [{ label: 'Oldalfali csatlakozó profil', value: walls.map((side) => `${side === 'left' ? 'bal' : 'jobb'} ${formatNumber(config.depth, 2)} m`).join(' + ') }] : []),
    { label: 'Keretgerenda', value: `2 × ${formatNumber(config.width, 2)} m + 2 × ${formatNumber(config.depth, 2)} m` },
    roofBomLine(config),
    { label: 'Tolóüveg panel', value: `${glassPanes} db` },
    { label: 'ZIP screen kazetta', value: `${screens} db` },
    { label: 'Rejtett lefolyó', value: posts === 0 ? '1 db · falon vezetett lefolyócső' : `${config.mount === 'freestanding' ? 2 : 1} db · oszlopba integrálva` },
    { label: 'Villamos opciók', value: `${config.led ? 'LED' : 'LED nélkül'} · ${config.heaters} db fűtés${config.speakers ? ' · hangrendszer' : ''}${config.sensors ? ' · szenzor' : ''}` },
  ]
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
  const activeSides = openSides(config.mount)
  const complexity = activeSides.filter((side) => config.sides[side] !== 'none').length + config.heaters + (config.speakers ? 1 : 0)
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

export function createTextSummary(config: PergolaConfig, price: PriceBreakdown, roofLabels: Record<RoofType, string> = ROOF_LABELS, brandName = 'ARDELIS') {
  const sides = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => `${SIDE_NAMES[side]}: ${isWallSide(config.mount, side) ? wallLabel(side).toLowerCase() : SIDE_LABELS[config.sides[side]]}`).join(', ')
  const extras = [
    config.led ? 'periméter LED' : null,
    config.heaters > 0 ? `${config.heaters} db teraszfűtés` : null,
    config.speakers ? 'hangrendszer' : null,
    config.sensors ? 'eső- és szélszenzor' : null,
  ].filter((item): item is string => Boolean(item))
  return [
    `${brandName} / Pergola – ${roofLabels[config.roof]}`,
    `Méret: ${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} × ${formatNumber(config.height, 2)} m (${formatNumber(price.area)} m²)`,
    `Kialakítás: ${MOUNT_LABELS[config.mount].toLowerCase()} · ${sides}`,
    `Kiegészítők: ${extras.length ? extras.join(', ') : 'nincs kiegészítő'}`,
    `Bruttó irányár: ${formatHuf(price.totalGross)} (telepítéssel, nem ajánlattétel)`,
    `Konfigurációs kód: ${getSpecCode(config)}`,
  ].join('\n')
}
