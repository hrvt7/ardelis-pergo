// Színkatalógus: a pergolákhoz jellemzően rendelt RAL Classic színek, DB metálszínek és
// fa hatású bevonatok, magyar névvel. Böngészőben és szerveren is fut.
//
// A színminták (hex) képernyős közelítések: a valódi árnyalatot a gyártói színminta mutatja.
// A gyártó alapszínei (tenant.colors) felár nélküliek; a katalógus többi színe egyedi szín.
import type { FrameColor, PergolaConfig, RoofType } from '../types/pergola'
import type { Tenant } from '../tenants/types'

export type ColorGroup = 'grey' | 'light' | 'dark' | 'brown' | 'metallic' | 'wood' | 'color'
export type ColorKind = 'ral' | 'db' | 'wood' | 'effect'

export interface CatalogColor {
  /** Kód, ahogy a megrendelésen szerepel: „RAL 7016”, „DB 703”, „FA DIÓ”. */
  code: string
  name: string
  hex: string
  group: ColorGroup
  kind: ColorKind
  /** Pergolákhoz gyakran választott szín (elöl jelenik meg). */
  popular?: boolean
  /** Kereséshez további szavak. */
  aliases?: string[]
}

export const COLOR_GROUPS: { id: ColorGroup; label: string }[] = [
  { id: 'grey', label: 'Szürkék' },
  { id: 'light', label: 'Fehér, krém' },
  { id: 'dark', label: 'Fekete, sötét' },
  { id: 'brown', label: 'Barnák' },
  { id: 'metallic', label: 'Metál' },
  { id: 'wood', label: 'Fa hatású' },
  { id: 'color', label: 'Színes' },
]

const ral = (code: string, name: string, hex: string, group: ColorGroup, popular = false, aliases: string[] = []): CatalogColor => ({ code: `RAL ${code}`, name, hex, group, kind: 'ral', popular, aliases })

export const COLOR_CATALOG: CatalogColor[] = [
  // Szürkék
  ral('7016', 'Antracitszürke', '#373f43', 'grey', true, ['antracit', 'sötétszürke']),
  ral('7021', 'Feketésszürke', '#2b2f32', 'grey', true, ['sötét antracit']),
  ral('7024', 'Grafitszürke', '#474a51', 'grey', true, ['grafit']),
  ral('7022', 'Umbraszürke', '#3e3b37', 'grey', true, ['umbra', 'barnásszürke']),
  ral('7039', 'Kvarcszürke', '#6c6960', 'grey', true, ['kvarc', 'meleg szürke']),
  ral('7030', 'Kőszürke', '#8b8c7a', 'grey', true, ['kő']),
  ral('7035', 'Világosszürke', '#cbcfcb', 'grey', true, ['világos szürke']),
  ral('7040', 'Ablakszürke', '#9da1aa', 'grey', true, ['ablak']),
  ral('7012', 'Bazaltszürke', '#4e5754', 'grey'),
  ral('7015', 'Palaszürke', '#434750', 'grey', false, ['pala']),
  ral('7026', 'Gránitszürke', '#2f353b', 'grey', false, ['gránit']),
  ral('7011', 'Vasszürke', '#434b4d', 'grey'),
  ral('7043', 'Közlekedési szürke B', '#4e5452', 'grey'),
  ral('7037', 'Porszürke', '#7d7f7d', 'grey'),
  ral('7036', 'Platinaszürke', '#8f8b8c', 'grey', false, ['platina']),
  ral('7042', 'Közlekedési szürke A', '#8d948d', 'grey'),
  ral('7045', 'Telegrey 1', '#909090', 'grey'),
  ral('7046', 'Telegrey 2', '#82898f', 'grey'),
  ral('7038', 'Achátszürke', '#b5b8b1', 'grey'),
  ral('7044', 'Selyemszürke', '#cac4b0', 'grey', false, ['selyem', 'bézsszürke']),
  ral('7032', 'Kavicsszürke', '#b8b799', 'grey', false, ['kavics']),
  ral('7047', 'Telegrey 4', '#d0d0d0', 'grey'),
  ral('7000', 'Mókusszürke', '#78858b', 'grey'),
  ral('7001', 'Ezüstszürke', '#8a9597', 'grey'),
  ral('7004', 'Jelzőszürke', '#969992', 'grey'),
  ral('7005', 'Egérszürke', '#646b63', 'grey'),
  ral('7006', 'Bézsszürke', '#6d6552', 'grey'),
  ral('7010', 'Ponyvaszürke', '#4c514a', 'grey'),
  ral('7023', 'Betonszürke', '#686c5e', 'grey', false, ['beton']),
  ral('7031', 'Kékesszürke', '#474b4e', 'grey'),
  ral('7033', 'Cementszürke', '#7d8471', 'grey', false, ['cement']),
  ral('7034', 'Sárgásszürke', '#8f8b66', 'grey'),
  // Fehér, krém
  ral('9016', 'Közlekedési fehér', '#f1f0ea', 'light', true, ['fehér']),
  ral('9010', 'Tiszta fehér', '#f1ece1', 'light', true, ['hófehér', 'törtfehér']),
  ral('9001', 'Krémfehér', '#efe6d2', 'light', true, ['krém']),
  ral('9003', 'Jelzőfehér', '#f4f4f4', 'light'),
  ral('9002', 'Szürkésfehér', '#e7ebda', 'light'),
  ral('9018', 'Papiruszfehér', '#cfd3cd', 'light', false, ['papirusz']),
  ral('1013', 'Gyöngyfehér', '#eae6ca', 'light', false, ['gyöngy']),
  ral('1015', 'Világos elefántcsont', '#e6d2b5', 'light', true, ['elefántcsont', 'homok', 'bézs']),
  ral('1014', 'Elefántcsont', '#ddc49a', 'light', false, ['elefántcsont']),
  // Fekete, sötét
  ral('9005', 'Mélyfekete', '#151719', 'dark', true, ['fekete', 'koromfekete']),
  ral('9004', 'Jelzőfekete', '#282828', 'dark'),
  ral('9011', 'Grafitfekete', '#1c1e20', 'dark'),
  ral('9017', 'Közlekedési fekete', '#1e1e1e', 'dark'),
  ral('8022', 'Feketésbarna', '#212121', 'dark'),
  // Barnák
  ral('8019', 'Szürkésbarna', '#403a3a', 'brown', true, ['sötétbarna']),
  ral('8017', 'Csokoládébarna', '#45322e', 'brown', true, ['csoki', 'barna']),
  ral('8014', 'Szépiabarna', '#382c1e', 'brown'),
  ral('8016', 'Mahagónibarna', '#4c2f27', 'brown', false, ['mahagóni']),
  ral('8011', 'Diófabarna', '#5b3a29', 'brown', false, ['dió']),
  ral('8028', 'Földbarna', '#4e3b31', 'brown', false, ['föld']),
  ral('8025', 'Halványbarna', '#755c48', 'brown'),
  ral('8024', 'Bézsbarna', '#79553d', 'brown'),
  ral('8007', 'Őzbarna', '#59351f', 'brown'),
  ral('8003', 'Agyagbarna', '#734222', 'brown', false, ['agyag']),
  ral('8001', 'Okkerbarna', '#955f20', 'brown', false, ['okker']),
  ral('8023', 'Narancsbarna', '#a65e2e', 'brown'),
  ral('1011', 'Barnabézs', '#8a6642', 'brown'),
  ral('1019', 'Szürkésbézs', '#a48f7a', 'brown', false, ['bézs', 'homok']),
  ral('1001', 'Bézs', '#c2b078', 'brown', false, ['bézs', 'homok']),
  // Metál és hatásos bevonatok
  { code: 'DB 703', name: 'Vascsillám antracit', hex: '#4b4e50', group: 'metallic', kind: 'db', popular: true, aliases: ['vascsillám', 'metál antracit', 'eisenglimmer'] },
  { code: 'DB 702', name: 'Vascsillám szürke', hex: '#8a8d8e', group: 'metallic', kind: 'db', aliases: ['vascsillám'] },
  { code: 'DB 701', name: 'Ezüst metál', hex: '#a1a3a3', group: 'metallic', kind: 'db', aliases: ['ezüst'] },
  ral('9006', 'Fehéralumínium', '#a5a8a6', 'metallic', true, ['alumínium', 'ezüst']),
  ral('9007', 'Szürkealumínium', '#8f8f8c', 'metallic', false, ['alumínium']),
  { code: 'CORTEN', name: 'Corten hatású', hex: '#8b4a2b', group: 'metallic', kind: 'effect', aliases: ['rozsda', 'corten'] },
  // Fa hatású (szublimációs) bevonatok
  { code: 'FA DIÓ', name: 'Dió', hex: '#5e3d26', group: 'wood', kind: 'wood', popular: true, aliases: ['dió', 'fa', 'faerezet'] },
  { code: 'FA ARANYTÖLGY', name: 'Aranytölgy', hex: '#a8743d', group: 'wood', kind: 'wood', popular: true, aliases: ['tölgy', 'fa'] },
  { code: 'FA ANTIKTÖLGY', name: 'Antik tölgy', hex: '#6f5236', group: 'wood', kind: 'wood', aliases: ['tölgy', 'fa'] },
  { code: 'FA CSERESZNYE', name: 'Cseresznye', hex: '#8a4a2f', group: 'wood', kind: 'wood', aliases: ['fa'] },
  { code: 'FA TEAK', name: 'Teak', hex: '#8a6338', group: 'wood', kind: 'wood', aliases: ['fa'] },
  { code: 'FA SZÜRKETÖLGY', name: 'Szürke tölgy', hex: '#7c7468', group: 'wood', kind: 'wood', aliases: ['tölgy', 'fa', 'szürke'] },
  // Színes
  ral('6005', 'Mohazöld', '#2f4538', 'color', true, ['zöld', 'sötétzöld']),
  ral('6009', 'Fenyőzöld', '#31372b', 'color', false, ['zöld']),
  ral('6012', 'Feketészöld', '#343e40', 'color', false, ['zöld']),
  ral('6003', 'Olívazöld', '#424632', 'color', false, ['zöld', 'olíva']),
  ral('6015', 'Feketésolíva', '#3b3c36', 'color', false, ['olíva']),
  ral('6011', 'Rezedazöld', '#587246', 'color', false, ['zöld']),
  ral('6021', 'Halványzöld', '#89ac76', 'color', false, ['zöld']),
  ral('5011', 'Acélkék', '#1a2b3c', 'color', false, ['kék', 'sötétkék']),
  ral('5004', 'Feketéskék', '#18171c', 'color', false, ['kék']),
  ral('5003', 'Zafírkék', '#1f3855', 'color', false, ['kék']),
  ral('5008', 'Szürkéskék', '#26303a', 'color', false, ['kék']),
  ral('5010', 'Enciánkék', '#0e294b', 'color', false, ['kék']),
  ral('5014', 'Galambkék', '#606e8c', 'color', false, ['kék']),
  ral('3004', 'Bíborvörös', '#75151e', 'color', false, ['bordó', 'piros']),
  ral('3005', 'Borvörös', '#5e2129', 'color', false, ['bordó']),
  ral('3009', 'Oxidvörös', '#642424', 'color', false, ['piros']),
  ral('3011', 'Barnásvörös', '#781f19', 'color', false, ['piros']),
  ral('3000', 'Tűzpiros', '#af2b1e', 'color', false, ['piros']),
]

const BY_CODE = new Map(COLOR_CATALOG.map((color) => [color.code, color]))
export const WOOD_HEXES = new Set(COLOR_CATALOG.filter((color) => color.kind === 'wood').map((color) => color.hex))

const fold = (text: string) => text.toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

/** Kézzel beírt kód egységesítése: „ral7021”, „7021”, „RAL 7021 matt” → „RAL 7021”; „db703” → „DB 703”. */
export function normalizeColorCode(text: string | undefined): string | undefined {
  if (!text) return undefined
  const clean = text.trim().replace(/\s+/g, ' ')
  if (!clean) return undefined
  const ralMatch = clean.match(/^(?:ral\s*)?(\d{4})\b/i)
  if (ralMatch) return `RAL ${ralMatch[1]}`
  const db = clean.match(/^db\s*(\d{3})\b/i)
  if (db) return `DB ${db[1]}`
  const byName = COLOR_CATALOG.find((color) => fold(color.code) === fold(clean) || fold(color.name) === fold(clean))
  return byName ? byName.code : clean.toUpperCase().slice(0, 24)
}

export function findColor(code: string | undefined) {
  const normalized = normalizeColorCode(code)
  return normalized ? BY_CODE.get(normalized) : undefined
}

/** Keresés névre, kódra, becenévre (ékezet nélkül is): „antracit”, „7021”, „homok”, „fa”. */
export function searchColors(query: string, group: ColorGroup | 'all' = 'all') {
  const q = fold(query)
  const digits = q.replace(/\D/g, '')
  return COLOR_CATALOG
    .filter((color) => group === 'all' || color.group === group)
    .filter((color) => !q || fold(`${color.code} ${color.name} ${(color.aliases ?? []).join(' ')}`).includes(q) || (digits.length >= 2 && color.code.replace(/\D/g, '').includes(digits)))
    .sort((a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)))
}

// ---------- Színtávolság (CIE Lab, ΔE94) ----------
function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16)) as [number, number, number]
}

export function rgbToHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')).join('')}`
}

function toLab([r, g, b]: [number, number, number]): [number, number, number] {
  const linear = [r, g, b].map((channel) => { const c = channel / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  const x = (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047
  const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
  const z = (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

export function deltaE([l1, a1, b1]: [number, number, number], [l2, a2, b2]: [number, number, number]) {
  const c1 = Math.hypot(a1, b1)
  const c2 = Math.hypot(a2, b2)
  const dl = l1 - l2
  const dc = c1 - c2
  const dh = Math.sqrt(Math.max(0, (a1 - a2) ** 2 + (b1 - b2) ** 2 - dc ** 2))
  return Math.sqrt(dl ** 2 + (dc / (1 + 0.045 * c1)) ** 2 + (dh / (1 + 0.015 * c1)) ** 2)
}

const LAB = new Map(COLOR_CATALOG.map((color) => [color.code, toLab(hexToRgb(color.hex))]))

/** A mintához legközelebbi katalógusszínek (fa hatásúak nélkül: azokat fotóról nem lehet eltalálni). */
export function nearestColors(hex: string, count = 3) {
  const lab = toLab(hexToRgb(hex))
  return COLOR_CATALOG
    .filter((color) => color.kind !== 'wood')
    .map((color) => ({ color, distance: deltaE(lab, LAB.get(color.code)!) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
}

export const matchLabel = (distance: number) => (distance < 3 ? 'nagyon közeli' : distance < 7 ? 'közeli' : distance < 14 ? 'hasonló' : 'csak távoli egyezés')

// ---------- A konfiguráció színei ----------
/** Kéttónusú kivitel (más színű tető/lamellák) csak alumínium tetőnél értelmes. */
export const supportsTwoTone = (roof: RoofType) => roof === 'louvered' || roof === 'retractable' || roof === 'fixed'
export const roofPartName = (roof: RoofType) => (roof === 'fixed' ? 'Tető' : 'Lamellák')

export interface ColorInfo {
  name: string
  code: string
  hex: string
  /** Felár nélküli gyártói alapszín. */
  standard: boolean
  kind: ColorKind | 'standard'
}

type ColorTenant = Pick<Tenant, 'colors'>

/** Egy alapszín-azonosító vagy egyedi kód leírása. */
export function describeColor(tenant: ColorTenant, color: FrameColor, custom?: string): ColorInfo {
  if (color !== 'custom') {
    const item = tenant.colors.find((entry) => entry.id === color)
    const catalog = item?.ral ? BY_CODE.get(`RAL ${item.ral}`) : undefined
    return { name: item?.name ?? color, code: item?.detail ?? '', hex: item?.modelHex ?? item?.hex ?? catalog?.hex ?? '#555b5e', standard: true, kind: 'standard' }
  }
  const catalog = findColor(custom)
  if (catalog) return { name: catalog.name, code: catalog.code, hex: catalog.hex, standard: false, kind: catalog.kind }
  return { name: 'Egyedi szín', code: normalizeColorCode(custom) ?? '', hex: '#687467', standard: false, kind: 'ral' }
}

export function frameColorInfo(tenant: ColorTenant, config: Pick<PergolaConfig, 'frameColor' | 'customRal'>) {
  return describeColor(tenant, config.frameColor, config.customRal)
}

/** A tető/lamellák színe: kéttónusú kivitelnél a sajátja, különben a vázé. */
export function roofColorInfo(tenant: ColorTenant, config: Pick<PergolaConfig, 'frameColor' | 'customRal' | 'roofColor' | 'roofRal'>) {
  return config.roofColor ? describeColor(tenant, config.roofColor, config.roofRal) : frameColorInfo(tenant, config)
}

/** „Antracitszürke · RAL 7021”, „Dió · FA DIÓ” → „Dió (fa hatású)”, ismeretlen kódnál „Egyedi szín · RAL 1234”. */
export function colorLabel(info: ColorInfo) {
  if (info.kind === 'wood') return `${info.name} (fa hatású)`
  if (!info.code) return info.name === 'Egyedi szín' ? 'Egyedi szín (RAL egyeztetés szerint)' : info.name
  return `${info.name} · ${info.code}`
}

/** Olvasható színleírás: „Antracit · RAL 7016” vagy „Antracit váz, Fehér lamellák”. */
export function colorSummary(tenant: ColorTenant, config: PergolaConfig) {
  const frame = frameColorInfo(tenant, config)
  const label = colorLabel
  if (!config.roofColor) return label(frame)
  return `váz: ${label(frame)} · ${roofPartName(config.roof).toLowerCase()}: ${label(roofColorInfo(tenant, config))}`
}

/**
 * Egy katalógusszín kiválasztása: ha a gyártónál alapszín (azonos RAL), az alapszín azonosítója,
 * különben egyedi szín a kóddal.
 */
export function pickCatalogColor(tenant: Pick<Tenant, 'colors' | 'customRal'>, code: string): { color: FrameColor; custom?: string } | null {
  const normalized = normalizeColorCode(code)
  const standard = tenant.colors.find((item) => item.ral && `RAL ${item.ral}` === normalized)
  if (standard) return { color: standard.id }
  if (!tenant.customRal || !normalized) return null
  return { color: 'custom', custom: normalized }
}
