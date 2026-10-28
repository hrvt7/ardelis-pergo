import { formatHuf, formatNumber, ROOF_LABELS, SIDE_LABELS, SIDE_NAMES } from '@/lib/pricing'
import type { PergolaConfig, PriceBreakdown, SideKey } from '@/types/pergola'

export interface BomLine { label: string; value: string }

export function getSpecCode(config: PergolaConfig) {
  const roof = { louvered: 'AE', retractable: 'GL', fixed: 'LN' }[config.roof]
  const mount = config.mount === 'wall' ? 'W' : 'F'
  const color = config.frameColor === 'custom'
    ? config.customRal?.replace(/[^a-z0-9]/gi, '').toUpperCase() || 'RAL'
    : { anthracite: '7016', black: '9005', white: '9016', bronze: 'BRZ' }[config.frameColor]
  const sides = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => ({ none: '0', zip: 'Z', glass: 'G', louver: 'L' })[config.sides[side]]).join('')
  return `PG-${roof}-${Math.round(config.width * 100)}${Math.round(config.depth * 100)}-${mount}-${color}-${sides}`
}

export function getBom(config: PergolaConfig): BomLine[] {
  const activeSides = (['front', 'back', 'left', 'right'] as SideKey[]).filter((side) => !(config.mount === 'wall' && side === 'back'))
  const glassPanes = activeSides.reduce((sum, side) => {
    if (config.sides[side] !== 'glass') return sum
    const length = side === 'front' || side === 'back' ? config.width : config.depth
    return sum + Math.max(2, Math.round(length / 1.12))
  }, 0)
  const screens = activeSides.filter((side) => config.sides[side] === 'zip').length
  const middlePosts = Math.max(0, Math.ceil(config.width / 6) - 1)
  return [
    { label: 'Hordozó oszlop', value: `${config.mount === 'wall' ? 2 : 4} db${middlePosts ? ` + ${middlePosts} db középoszlop` : ''} · ${formatNumber(config.height, 2)} m` },
    { label: 'Keretgerenda', value: `2 × ${formatNumber(config.width, 2)} m + 2 × ${formatNumber(config.depth, 2)} m` },
    { label: config.roof === 'fixed' ? 'Fix tetőpanel' : 'Aerofoil tetőlamella', value: config.roof === 'fixed' ? `${Math.max(2, Math.floor(config.depth / 0.65))} résszel` : `${Math.max(10, Math.floor(config.depth / 0.22))} db × ${formatNumber(Math.max(0, config.width - 0.18), 2)} m` },
    { label: 'Tolóüveg panel', value: `${glassPanes} db` },
    { label: 'ZIP screen kazetta', value: `${screens} db` },
    { label: 'Rejtett lefolyó', value: `${config.mount === 'wall' ? 1 : 2} db · oszlopba integrálva` },
    { label: 'Villamos opciók', value: `${config.led ? 'LED' : 'LED nélkül'} · ${config.heaters} db fűtés${config.speakers ? ' · hangrendszer' : ''}${config.sensors ? ' · szenzor' : ''}` },
  ]
}

export function getDeliveryEstimate(config: PergolaConfig) {
  const activeSides = (['front', 'back', 'left', 'right'] as SideKey[]).filter((side) => !(config.mount === 'wall' && side === 'back'))
  const complexity = activeSides.filter((side) => config.sides[side] !== 'none').length + config.heaters + (config.speakers ? 1 : 0)
  const min = Math.min(8, 4 + Math.floor(complexity / 3))
  return `${min}–${min + 2} hét a műszaki jóváhagyástól · nem vállalt határidő`
}

export function getSizeRecommendation(config: PergolaConfig) {
  const area = config.width * config.depth
  if (area < 10) return '2–4 főnek ajánlott · kompakt étkező vagy pihenősarok'
  if (area < 18) return '4–6 főnek ajánlott · kanapé és dohányzóasztal kényelmesen elfér'
  if (area < 27) return '6–8 főnek ajánlott · étkező és pihenősarok együtt is elfér'
  return '8–10 főnek ajánlott · nagyobb étkező és pihenősarok is kialakítható'
}

export function createTextSummary(config: PergolaConfig, price: PriceBreakdown) {
  const sides = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => `${SIDE_NAMES[side]}: ${config.mount === 'wall' && side === 'back' ? 'házfal' : SIDE_LABELS[config.sides[side]]}`).join(', ')
  const extras = [
    config.led ? 'periméter LED' : null,
    config.heaters > 0 ? `${config.heaters} db teraszfűtés` : null,
    config.speakers ? 'hangrendszer' : null,
    config.sensors ? 'eső- és szélszenzor' : null,
  ].filter((item): item is string => Boolean(item))
  return [
    `ARDELIS / Pergo – ${ROOF_LABELS[config.roof]}`,
    `Méret: ${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} × ${formatNumber(config.height, 2)} m (${formatNumber(price.area)} m²)`,
    `Kialakítás: ${config.mount === 'wall' ? 'falhoz csatlakozó' : 'önálló'} · ${sides}`,
    `Kiegészítők: ${extras.length ? extras.join(', ') : 'nincs kiegészítő'}`,
    `Bruttó irányár: ${formatHuf(price.totalGross)} (telepítéssel, nem ajánlattétel)`,
    `Konfigurációs kód: ${getSpecCode(config)}`,
  ].join('\n')
}
