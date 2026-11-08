// Kültéri (lineáris) termékcsaládok közös, React nélküli magja: kerítés és kapu (a korábbi katalógus-réteg öröksége).
// Konfiguráció-séma, alapértékek, árazás, feliratok, spec-kód és a lead/e-mail leírása. Csak relatív importok,
// mert a lead-végpont (Edge) is ezt használja a kerítés-motoron keresztül (src/products/engines.ts).
import { z } from 'zod'
import type { OutdoorColor, OutdoorConfig, OutdoorFamily, OutdoorPriceSettings } from '../types/catalog'
import type { PriceBreakdown, PriceLine } from '../types/pergola'
import { formatHuf, formatNumber } from '../lib/pricing'

export const OUTDOOR_DEFAULTS: Record<OutdoorFamily, OutdoorConfig> = {
  canopy: {
    family: 'canopy', width: 3.2, depth: 1.4, height: 2.5, length: 12,
    mount: 'cantilever', frameMaterial: 'aluminium', roofMaterial: 'polycarbonate', shape: 'curved',
    style: 'horizontal', finish: 'powder', color: 'anthracite', bays: 1, sideWalls: 'none',
    led: true, gutter: true, storage: false, evReady: false, solarReady: false, foundation: false,
    pedestrianGate: false, gateType: 'none', gateWidth: 3.5, gateAutomation: false, safetyKit: false, intercom: false,
  },
  carport: {
    family: 'carport', width: 3.4, depth: 5.4, height: 2.45, length: 12,
    mount: 'freestanding', frameMaterial: 'aluminium', roofMaterial: 'sandwich', shape: 'mono',
    style: 'horizontal', finish: 'powder', color: 'anthracite', bays: 1, sideWalls: 'louver',
    led: true, gutter: true, storage: false, evReady: true, solarReady: false, foundation: true,
    pedestrianGate: false, gateType: 'none', gateWidth: 3.5, gateAutomation: false, safetyKit: false, intercom: false,
  },
  // Kerítés: a kutatás (docs/TERMEKADATOK.md) szerint tipikus 1,6–1,8 m magas alu lamellás rendszer tolókapuval és kiskapuval.
  fence: {
    family: 'fence', width: 3.2, depth: 1.4, height: 1.6, length: 14,
    mount: 'posts', frameMaterial: 'aluminium', roofMaterial: 'aluminium', shape: 'mono',
    style: 'horizontal', finish: 'powder', color: 'anthracite', bays: 1, sideWalls: 'none',
    led: false, gutter: false, storage: false, evReady: false, solarReady: false, foundation: true,
    pedestrianGate: true, gateType: 'sliding', gateWidth: 3.5, gateAutomation: true, safetyKit: true, intercom: false,
  },
  gate: {
    family: 'gate', width: 3.2, depth: 1.4, height: 1.7, length: 7,
    mount: 'posts', frameMaterial: 'wrought', roofMaterial: 'aluminium', shape: 'mono',
    style: 'ornamental', finish: 'galvanizedPowder', color: 'black', bays: 1, sideWalls: 'none',
    led: false, gutter: false, storage: false, evReady: false, solarReady: false, foundation: true,
    pedestrianGate: true, gateType: 'cantilever', gateWidth: 4, gateAutomation: true, safetyKit: true, intercom: true,
  },
}

/** Nettó mintaárak (HUF). A gyártó saját árlistája később a tenantból jön; a kerítés fm-árak a kutatás nagyságrendjével egyeznek. */
export const OUTDOOR_PRICE_DEFAULTS: OutdoorPriceSettings = {
  canopyPerM2: { polycarbonate: 48000, glass: 105000, sandwich: 72000, aluminium: 78000, louvered: 220000 },
  carportPerM2: { polycarbonate: 68000, glass: 118000, sandwich: 92000, aluminium: 85000, louvered: 235000 },
  fencePerM2: { aluminium: 46000, steel: 38000, wrought: 55000, wood: 34000, wpc: 42000 },
  postPerMeter: 8500,
  pedestrianGate: 145000,
  gatePerM2: 78000,
  swingMechanism: 120000,
  slidingMechanism: 190000,
  cantileverMechanism: 280000,
  gateMotor: 220000,
  safetyKit: 65000,
  intercom: 140000,
  ledPerMeter: 11000,
  gutterPerMeter: 6500,
  storageUnit: 320000,
  evPreparation: 95000,
  solarPreparation: 120000,
  foundationPerM2: 16000,
  sideLouverPerM2: 75000,
  sideGlassPerM2: 135000,
  sidePrivacyPerM2: 68000,
  customColorRate: 0.15,
  installationRate: 0.13,
  vatRate: 0.27,
}

export const FAMILY_META: Record<OutdoorFamily, { name: string; series: string; title: string; description: string }> = {
  canopy: { name: 'Cover', series: 'LAMELIX / COVER', title: 'Előtető', description: 'Konzolos vagy oszlopos, falhoz illesztett bejárati és terasz-előtető.' },
  carport: { name: 'Drive', series: 'LAMELIX / DRIVE', title: 'Autóbeálló', description: 'Egy- vagy kétállásos, vízelvezetett és EV-előkészíthető autóbeálló.' },
  fence: { name: 'Fence', series: 'LAMELIX / FENCE', title: 'Kerítés és kapu', description: 'Alumínium, acél, kovácsoltvas, fa vagy WPC telekhatároló rendszer, kapuval és kiskapuval.' },
  gate: { name: 'Gate', series: 'LAMELIX / GATE', title: 'Kapu', description: 'Kiskapu, nyíló-, toló- és úszókapu, azonos kerítésarculattal.' },
}

export const COLOR_HEX: Record<OutdoorColor, string> = {
  anthracite: '#343a3d', black: '#171b1d', white: '#dedfd9', bronze: '#705b4c', green: '#314b3c', wood: '#8a6544', custom: '#687467',
}

const RAL: Record<string, string> = { '7016': '#343a3d', '7024': '#484a49', '7035': '#c5c9c7', '9005': '#15191c', '9010': '#eeeae0', '9016': '#dedfd9', '6005': '#314b3c', '8017': '#4b3830', '3004': '#74373b', '5010': '#315c78' }
export function outdoorColor(config: OutdoorConfig) {
  if (config.color !== 'custom') return COLOR_HEX[config.color]
  return RAL[config.customRal?.match(/\d{4}/)?.[0] ?? ''] ?? '#687467'
}

export const LABELS = {
  roof: { polycarbonate: 'UV-védett üregkamrás polikarbonát', glass: 'Ragasztott biztonsági üveg', sandwich: 'Hőszigetelt szendvicspanel', aluminium: 'Zárt alumínium fedés', louvered: 'Motoros bioklimatikus lamella' },
  frame: { aluminium: 'Porfestett alumínium', steel: 'Horganyzott és porfestett acél', glulam: 'Ragasztott, lazúrozott fa', wrought: 'Kovácsolt acél', wood: 'Lazúrozott fenyő', wpc: 'Fa–acél / WPC betét' },
  style: { horizontal: 'Vízszintes lamella', vertical: 'Függőleges profil', diagonal: 'Átlós profil', picket: 'Klasszikus rudazat', ornamental: 'Íves, kovácsolt ornamentika', privacy: 'Zárt, teljes betét' },
  gate: { none: 'Nincs gépkocsikapu', swing: 'Kétszárnyú nyílókapu', sliding: 'Sínen futó tolókapu', cantilever: 'Kontrás úszókapu' },
} as const

const COLOR_LABELS: Record<OutdoorColor, string> = { anthracite: 'Antracit · RAL 7016', black: 'Fekete · RAL 9005', white: 'Fehér · RAL 9016', bronze: 'Bronz · RAL 8017', green: 'Zöld · RAL 6005', wood: 'Fahatású', custom: 'Egyedi RAL' }

const round = (value: number) => Math.round(value / 1000) * 1000
/** Folyóméter: egész szám tizedes nélkül (14 fm), különben egy tizedes (12,5 fm). */
const fm = (value: number) => formatNumber(value, Number.isInteger(value) ? 0 : 1)

export function calculateOutdoorPrice(config: OutdoorConfig, prices: OutdoorPriceSettings): PriceBreakdown {
  const lines: PriceLine[] = []
  const area = config.family === 'carport' ? config.width * config.bays * config.depth : config.width * config.depth
  const perimeter = config.family === 'carport' ? 2 * (config.width * config.bays + config.depth) : 2 * (config.width + config.depth)
  const customRate = config.color === 'custom' ? prices.customColorRate : 0
  let structure = 0

  if (config.family === 'canopy' || config.family === 'carport') {
    const rateTable = config.family === 'canopy' ? prices.canopyPerM2 : prices.carportPerM2
    const rate = rateTable[config.roofMaterial]
    const materialFactor = config.frameMaterial === 'glulam' ? 1.18 : config.frameMaterial === 'steel' ? 0.94 : 1
    const shapeFactor = config.shape === 'curved' ? 1.16 : config.shape === 'gable' ? 1.12 : 1
    structure = area * rate * materialFactor * shapeFactor
    lines.push({ id: 'structure', label: `${FAMILY_META[config.family].name} szerkezet és fedés`, detail: `${formatNumber(area)} m² × ${formatHuf(rate)} / m² · forma- és anyagkorrekció`, amountNet: round(structure) })
    if (config.mount === 'posts' || config.mount === 'freestanding') {
      const count = config.family === 'carport' ? (config.bays + 1) * 2 : 2
      lines.push({ id: 'posts', label: 'Oszlopos kivitel és lábszerelés', detail: `${count} oszlop · pontos kialakítás felmérést igényel`, amountNet: round(count * 48000) })
    }
    if (config.sideWalls !== 'none') {
      const sideArea = config.depth * config.height
      const rate = config.sideWalls === 'glass' ? prices.sideGlassPerM2 : config.sideWalls === 'privacy' ? prices.sidePrivacyPerM2 : prices.sideLouverPerM2
      lines.push({ id: 'sidewall', label: 'Oldalzárás', detail: `${formatNumber(sideArea)} m² · ${config.sideWalls}`, amountNet: round(sideArea * rate) })
    }
    if (config.foundation) lines.push({ id: 'foundation', label: 'Alapozási mintacsomag', detail: `${formatNumber(area)} m² · talajvizsgálat nélküli iránytétel`, amountNet: round(area * prices.foundationPerM2) })
    if (config.storage) lines.push({ id: 'storage', label: 'Integrált, zárható tároló', detail: '1 modul · külön felméréssel', amountNet: prices.storageUnit })
    if (config.evReady) lines.push({ id: 'ev', label: 'EV-töltés előkészítése', detail: 'Kábelút és szerelvényhely · töltő és villamos munka nélkül', amountNet: prices.evPreparation })
    if (config.solarReady) lines.push({ id: 'solar', label: 'Napelemes szerelési előkészítés', detail: 'Statikai és kábelút-előkészítés · napelemrendszer nélkül', amountNet: prices.solarPreparation })
  } else {
    const material = config.frameMaterial === 'glulam' ? 'wood' : config.frameMaterial
    const rate = prices.fencePerM2[material as keyof OutdoorPriceSettings['fencePerM2']] ?? prices.fencePerM2.aluminium
    const styleFactor = config.style === 'ornamental' ? 1.32 : config.style === 'diagonal' ? 1.12 : config.style === 'privacy' ? 1.18 : 1
    const finishFactor = config.finish === 'galvanizedPowder' ? 1.14 : config.finish === 'woodlook' ? 1.16 : 1
    structure = config.length * config.height * rate * styleFactor * finishFactor
    lines.push({ id: 'fence', label: `${LABELS.frame[config.frameMaterial]} kerítés`, detail: `${formatNumber(config.length)} fm × ${formatNumber(config.height)} m · ${LABELS.style[config.style]}`, amountNet: round(structure) })
    lines.push({ id: 'posts', label: 'Oszlopok, fedél és rögzítés', detail: `${formatNumber(config.length)} fm szerkezeti mintatétel`, amountNet: round(config.length * prices.postPerMeter) })
    if (config.pedestrianGate) lines.push({ id: 'pedestrian', label: 'Illeszkedő kiskapu', detail: 'Zár és kilincs mintacsomaggal', amountNet: prices.pedestrianGate })
    if (config.gateType !== 'none') {
      const mechanism = config.gateType === 'swing' ? prices.swingMechanism : config.gateType === 'sliding' ? prices.slidingMechanism : prices.cantileverMechanism
      lines.push({ id: 'gate', label: LABELS.gate[config.gateType], detail: `${formatNumber(config.gateWidth)} × ${formatNumber(config.height)} m · ${formatHuf(prices.gatePerM2)} / m²`, amountNet: round(config.gateWidth * config.height * prices.gatePerM2 + mechanism) })
      if (config.gateAutomation) lines.push({ id: 'motor', label: 'Kapuautomatika', detail: 'Motor, vezérlés és két távirányító mintacsomag', amountNet: prices.gateMotor })
      if (config.safetyKit) lines.push({ id: 'safety', label: 'Biztonsági csomag', detail: 'Fényfüggöny és biztonsági érzékelés', amountNet: prices.safetyKit })
      if (config.intercom) lines.push({ id: 'intercom', label: 'Kaputelefon-előkészítés', detail: 'Audio-video interkom mintacsomag', amountNet: prices.intercom })
    }
  }

  if (config.led) lines.push({ id: 'led', label: 'Integrált LED világítás', detail: `${formatNumber(perimeter)} fm · világítási terv nélkül`, amountNet: round(perimeter * prices.ledPerMeter) })
  if (config.gutter && (config.family === 'canopy' || config.family === 'carport')) lines.push({ id: 'gutter', label: 'Eresz és rejtett vízelvezetés', detail: `${formatNumber(config.width * (config.family === 'carport' ? config.bays : 1))} fm`, amountNet: round(config.width * (config.family === 'carport' ? config.bays : 1) * prices.gutterPerMeter) })
  if (customRate) lines.push({ id: 'color', label: 'Egyedi RAL / felületkezelés', detail: `Szerkezeti tétel × ${Math.round(customRate * 100)}%`, amountNet: round(structure * customRate) })

  const subtotalNet = lines.reduce((sum, line) => sum + line.amountNet, 0)
  const installationNet = round(subtotalNet * prices.installationRate)
  const totalNet = subtotalNet + installationNet
  const vatNet = round(totalNet * prices.vatRate)
  return { area, perimeter, lines, subtotalNet, installationNet, totalNet, vatNet, totalGross: totalNet + vatNet }
}

export function outdoorSpecCode(config: OutdoorConfig) {
  const parts = [FAMILY_META[config.family].name.toUpperCase()]
  if (config.family === 'canopy' || config.family === 'carport') {
    parts.push(config.roofMaterial.slice(0, 3).toUpperCase(), `${config.width.toFixed(1)}X${config.depth.toFixed(1)}`, config.mount.toUpperCase())
    if (config.family === 'carport') parts.push(`${config.bays}BAY`)
  } else {
    parts.push(config.frameMaterial.toUpperCase(), config.style.toUpperCase(), `${config.length.toFixed(1)}FM`, config.gateType.toUpperCase())
  }
  parts.push(config.color === 'custom' ? config.customRal?.replace(/\D/g, '') || 'RAL' : config.color.toUpperCase())
  return parts.join('-')
}

/** Egy sor a lead-e-mail fejlécébe és a vevői visszaigazolásba, pl. „Kerítés és kapu · 14 fm · 1,6 m · antracit”. */
export function outdoorHeadline(config: OutdoorConfig) {
  const meta = FAMILY_META[config.family]
  if (config.family === 'canopy' || config.family === 'carport') return `${meta.title} · ${formatNumber(config.width * (config.family === 'carport' ? config.bays : 1), 2)} × ${formatNumber(config.depth, 2)} m`
  return `${meta.title} · ${fm(config.length)} fm · ${formatNumber(config.height, 2)} m · ${COLOR_LABELS[config.color].split(' · ')[0].toLowerCase()}`
}

/** A konfiguráció olvasható sorai (lead-e-mail, adatbázis, ajánlat). */
export function outdoorSpecRows(config: OutdoorConfig, price: PriceBreakdown): [string, string][] {
  if (config.family === 'canopy' || config.family === 'carport') {
    return [
      ['Termék', FAMILY_META[config.family].title],
      ['Külső méret', `${formatNumber(config.width * (config.family === 'carport' ? config.bays : 1), 2)} × ${formatNumber(config.depth, 2)} × ${formatNumber(config.height, 2)} m · ${formatNumber(price.area)} m²`],
      ['Szerkezet', LABELS.frame[config.frameMaterial]],
      ['Fedés', LABELS.roof[config.roofMaterial]],
      ['Szín', COLOR_LABELS[config.color] + (config.color === 'custom' && config.customRal ? ` (${config.customRal})` : '')],
      ['Konfigurációs kód', outdoorSpecCode(config)],
    ]
  }
  const gate = config.gateType === 'none' ? 'nincs gépkocsikapu' : `${LABELS.gate[config.gateType]}, ${formatNumber(config.gateWidth, 1)} m nyílás${config.gateAutomation ? ', motoros' : ''}${config.safetyKit ? ', biztonsági csomag' : ''}`
  return [
    ['Termék', FAMILY_META[config.family].title],
    ['Hossz és magasság', `${fm(config.length)} fm × ${formatNumber(config.height, 2)} m`],
    ['Anyag', LABELS.frame[config.frameMaterial]],
    ['Mintázat', LABELS.style[config.style]],
    ['Szín', COLOR_LABELS[config.color] + (config.color === 'custom' && config.customRal ? ` (${config.customRal})` : '')],
    ['Kapu', gate],
    ['Kiskapu', config.pedestrianGate ? 'igen, illeszkedő mintázattal' : 'nincs'],
    ['Lábazat / alap', config.foundation ? 'alapozott oszlopok' : 'nincs'],
    ...(config.intercom ? [['Kaputelefon', 'audio-video előkészítés'] as [string, string]] : []),
    ['Konfigurációs kód', outdoorSpecCode(config)],
  ]
}

export const outdoorConfigSchema = z.object({
  family: z.enum(['canopy', 'carport', 'fence', 'gate']),
  width: z.number().min(1.2).max(9), depth: z.number().min(0.8).max(8),
  height: z.number().min(0.8).max(3.4), length: z.number().min(2).max(50),
  mount: z.enum(['wall', 'freestanding', 'cantilever', 'posts']),
  frameMaterial: z.enum(['aluminium', 'steel', 'glulam', 'wrought', 'wood', 'wpc']),
  roofMaterial: z.enum(['polycarbonate', 'glass', 'sandwich', 'aluminium', 'louvered']),
  shape: z.enum(['mono', 'curved', 'gable']),
  style: z.enum(['horizontal', 'vertical', 'diagonal', 'picket', 'ornamental', 'privacy']),
  finish: z.enum(['powder', 'galvanizedPowder', 'woodlook', 'lazur']),
  color: z.enum(['anthracite', 'black', 'white', 'bronze', 'green', 'wood', 'custom']),
  customRal: z.string().max(12).optional(), bays: z.union([z.literal(1), z.literal(2)]),
  sideWalls: z.enum(['none', 'louver', 'glass', 'privacy']),
  led: z.boolean(), gutter: z.boolean(), storage: z.boolean(), evReady: z.boolean(),
  solarReady: z.boolean(), foundation: z.boolean(), pedestrianGate: z.boolean(),
  gateType: z.enum(['none', 'swing', 'sliding', 'cantilever']), gateWidth: z.number().min(2.4).max(6),
  gateAutomation: z.boolean(), safetyKit: z.boolean(), intercom: z.boolean(),
})

/** Ismeretlen bemenetből érvényes konfiguráció a megadott családdal — vagy null. */
export function parseOutdoorConfig(raw: unknown, family: OutdoorFamily): OutdoorConfig | null {
  const parsed = outdoorConfigSchema.safeParse(raw)
  return parsed.success && parsed.data.family === family ? parsed.data : null
}

// Megosztó kód a hash-be: `k=` + base64url(JSON). (Böngészőben és Edge-en is van btoa/atob.)
const toBase64Url = (text: string) => btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromBase64Url = (text: string) => decodeURIComponent(escape(atob(text.replace(/-/g, '+').replace(/_/g, '/'))))
export const encodeOutdoorHash = (config: OutdoorConfig) => `k=${toBase64Url(JSON.stringify(config))}`
export function decodeOutdoorHash(hash: string): unknown {
  const match = hash.replace(/^#/, '').match(/^k=([A-Za-z0-9_-]+)$/)
  if (!match) return null
  try { return JSON.parse(fromBase64Url(match[1])) } catch { return null }
}
