// Modulház termékcsalád React nélküli magja: típuskatalógus, konfiguráció-séma, alapértékek, árazás, feliratok,
// spec-kód, fejléc és leírás a lead-e-mailhez, megosztó kód. Csak relatív importok: a lead-végpont (Edge) is ezt
// használja a modulház-motoron keresztül (src/products/engines.ts).
//
// Az árak és a műszaki adatok a gyártó nyilvános adatlapjáról valók (Álomterasz, A45 típus, 2026. november).
// Ami ott nem szerepel (magasságok, tetőhajlás), az a 3D modellben becsült, és a felületen is becsültként jelenik meg.
import { z } from 'zod'
import type { PriceBreakdown, PriceLine } from '../types/pergola'
import { formatHuf, formatNumber } from '../lib/pricing'

export type ModularModel = 'a45'
/** shell: külső kulcsrakész + belső emelt szerkezetkész (a gyártó alapára); turnkey: teljes kulcsrakész (egyedi ajánlat). */
export type ModularFinish = 'shell' | 'turnkey'
/** home: családi házként (5% ÁFA a gyártó tájékoztatása szerint); other: egyéb célra (27% ÁFA). */
export type ModularUse = 'home' | 'other'
export type ModularFacade = 'white' | 'offwhite' | 'sand' | 'lightgrey' | 'graphite'
export type ModularJoinery = 'anthracite' | 'white' | 'goldenOak'
export type ModularRoof = 'anthracite' | 'red' | 'brown'

export interface ModularHouseConfig {
  model: ModularModel
  finish: ModularFinish
  use: ModularUse
  facade: ModularFacade
  joinery: ModularJoinery
  roof: ModularRoof
}

export interface ModularModelInfo {
  id: ModularModel
  name: string
  title: string
  /** Alapterület m²-ben, a gyártó adatlapja szerint. */
  grossArea: number
  netArea: number
  rooms: string
  /** Külső befoglaló méret (vakolt falsíkok), méter — az alaprajzból. */
  footprint: { width: number; depth: number }
  /** A 3D modell becsült magasságai, méter (a metszetrajz megérkezéséig). */
  estimated: { floor: number; eave: number; ridge: number; pitch: number }
  glb: string
  structure: string[]
}

export const MODULAR_MODELS: Record<ModularModel, ModularModelInfo> = {
  a45: {
    id: 'a45',
    name: 'A45',
    title: 'A45 modulház',
    grossArea: 45,
    netArea: 39,
    rooms: 'Nappali, konyha-étkező, 1 szoba, fürdő, tároló, közlekedő',
    footprint: { width: 9.23, depth: 5.28 },
    estimated: { floor: 0.35, eave: 2.86, ridge: 5.0, pitch: 30 },
    glb: '/assets/models/houses/house_a45.glb',
    structure: ['Beton pontalapozás', 'Impregnált fenyő vázszerkezet, 15 cm kőzetgyapot', 'Teljes külső homlokzati szigetelés, színezett nemesvakolat', '3 rétegű üvegezésű nyílászárók beépítéssel', 'Szeglemezes tető betoncserép fedéssel', 'Gipszkarton falak, víz- és villanykiállások'],
  },
}

export const MODULAR_MODEL_IDS = Object.keys(MODULAR_MODELS) as ModularModel[]

export interface ModularPriceSettings {
  /** Nettó ár m²-enként, típusonként (HUF). */
  perM2Net: Record<ModularModel, number>
  /** Melyik alapterületre vonatkozik az m²-ár. A gyártó adatlapja nem mondja meg; egyeztetendő. */
  areaBasis: 'gross' | 'net'
  vat: Record<ModularUse, number>
}

/** A gyártó nyilvános ára: 445 000 Ft nettó / m² (alomterasz.hu, 2026. 11.). Az m²-alap (bruttó 45 m²) egyeztetendő. */
export const MODULAR_PRICE_DEFAULTS: ModularPriceSettings = {
  perM2Net: { a45: 445000 },
  areaBasis: 'gross',
  vat: { home: 0.05, other: 0.27 },
}

export const MODULAR_DEFAULTS: ModularHouseConfig = { model: 'a45', finish: 'shell', use: 'home', facade: 'white', joinery: 'anthracite', roof: 'anthracite' }

export const MODULAR_META = { name: 'Modulhaz', title: 'Modulház', description: 'Előregyártott, darus emeléssel telepített modulház valós méretben: típus, kivitel, homlokzat és nyílászárók színe.' }

export const MODULAR_LABELS = {
  finish: { shell: 'Külső kulcsrakész, belül emelt szerkezetkész', turnkey: 'Teljes kulcsrakész' },
  finishNote: { shell: 'A gyártó alapára: kívül kész, belül gipszkarton falak és víz-, villanykiállások', turnkey: 'Belső burkolás, festés, szaniterek: a gyártó egyedi ajánlata szerint' },
  use: { home: 'Családi ház (5% ÁFA)', other: 'Egyéb célra (27% ÁFA)' },
  facade: { white: 'Fehér', offwhite: 'Törtfehér', sand: 'Homok', lightgrey: 'Világosszürke', graphite: 'Grafit' },
  joinery: { anthracite: 'Antracit', white: 'Fehér', goldenOak: 'Aranytölgy' },
  roof: { anthracite: 'Antracit', red: 'Téglavörös', brown: 'Barna' },
} as const

export const MODULAR_COLOR_HEX = {
  facade: { white: '#f1efe9', offwhite: '#ebe3d2', sand: '#dccba7', lightgrey: '#cfcfca', graphite: '#55595b' } as Record<ModularFacade, string>,
  joinery: { anthracite: '#363b3e', white: '#efefec', goldenOak: '#a8743d' } as Record<ModularJoinery, string>,
  roof: { anthracite: '#2b2f33', red: '#8a3b2a', brown: '#4e3a30' } as Record<ModularRoof, string>,
}

/** Ami a gyártó adatlapja szerint nincs az árban (PDF, összegzés). */
export const MODULAR_NOT_INCLUDED = ['Szállítás és darus emelés', 'Tervezés és engedélyezés', 'Közműbekötések', 'Tereprendezés, terasz', 'Teljes kulcsrakész belső befejezés (egyedi ajánlat)']

const round = (value: number) => Math.round(value / 1000) * 1000

export const modularArea = (config: ModularHouseConfig, prices: ModularPriceSettings) => {
  const model = MODULAR_MODELS[config.model]
  return prices.areaBasis === 'gross' ? model.grossArea : model.netArea
}

export function calculateModularPrice(config: ModularHouseConfig, prices: ModularPriceSettings): PriceBreakdown {
  const model = MODULAR_MODELS[config.model]
  const area = modularArea(config, prices)
  const rate = prices.perM2Net[config.model]
  const lines: PriceLine[] = [{
    id: 'house',
    label: `${model.title} · ${MODULAR_LABELS.finish.shell.toLowerCase()}`,
    detail: `${formatNumber(area)} m² (${prices.areaBasis === 'gross' ? 'bruttó' : 'nettó'} alapterület) × ${formatHuf(rate)} / m² · pontalapozással, beépítve`,
    amountNet: round(area * rate),
  }]
  if (config.finish === 'turnkey') lines.push({ id: 'turnkey', label: 'Teljes kulcsrakész belső befejezés', detail: 'Egyedi ajánlat alapján – nincs benne az irányárban', amountNet: 0 })
  const subtotalNet = lines.reduce((sum, line) => sum + line.amountNet, 0)
  const totalNet = subtotalNet
  const vatNet = round(totalNet * prices.vat[config.use])
  return { area, perimeter: 2 * (model.footprint.width + model.footprint.depth), lines, subtotalNet, installationNet: 0, totalNet, vatNet, totalGross: totalNet + vatNet }
}

export function modularSpecCode(config: ModularHouseConfig) {
  return ['MODUL', MODULAR_MODELS[config.model].name, config.finish === 'shell' ? 'SK' : 'KK', config.use === 'home' ? 'LAK' : 'EGY', config.facade.toUpperCase(), config.joinery.toUpperCase(), config.roof.toUpperCase()].join('-')
}

/** Egy sor a lead-e-mail fejlécébe, pl. „Modulház · A45 modulház · 45 m² · családi ház”. */
export function modularHeadline(config: ModularHouseConfig) {
  const model = MODULAR_MODELS[config.model]
  return `${MODULAR_META.title} · ${model.title} · bruttó ${formatNumber(model.grossArea)} m² · ${config.finish === 'shell' ? 'szerkezetkész belső' : 'teljes kulcsrakész'}`
}

/** A konfiguráció olvasható sorai (lead-e-mail, adatbázis, PDF). */
export function modularSpecRows(config: ModularHouseConfig, price: PriceBreakdown): [string, string][] {
  const model = MODULAR_MODELS[config.model]
  return [
    ['Termék', MODULAR_META.title],
    ['Típus', model.title],
    ['Alapterület', `bruttó ${formatNumber(model.grossArea)} m² · nettó ${formatNumber(model.netArea)} m²`],
    ['Külső méret', `${formatNumber(model.footprint.width, 2)} × ${formatNumber(model.footprint.depth, 2)} m`],
    ['Helyiségek', model.rooms],
    ['Kivitel', MODULAR_LABELS.finish[config.finish]],
    ['Felhasználás', MODULAR_LABELS.use[config.use]],
    ['Homlokzat', `Színezett nemesvakolat · ${MODULAR_LABELS.facade[config.facade].toLowerCase()}`],
    ['Nyílászárók', `3 rétegű üvegezés · ${MODULAR_LABELS.joinery[config.joinery].toLowerCase()}`],
    ['Tető', `Betoncserép · ${MODULAR_LABELS.roof[config.roof].toLowerCase()}`],
    ['Árazott alapterület', `${formatNumber(price.area)} m²`],
    ['Konfigurációs kód', modularSpecCode(config)],
  ]
}

export const modularConfigSchema = z.object({
  model: z.enum(['a45']),
  finish: z.enum(['shell', 'turnkey']),
  use: z.enum(['home', 'other']),
  facade: z.enum(['white', 'offwhite', 'sand', 'lightgrey', 'graphite']),
  joinery: z.enum(['anthracite', 'white', 'goldenOak']),
  roof: z.enum(['anthracite', 'red', 'brown']),
})

export function parseModularConfig(raw: unknown): ModularHouseConfig | null {
  const parsed = modularConfigSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

const toBase64Url = (text: string) => btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromBase64Url = (text: string) => decodeURIComponent(escape(atob(text.replace(/-/g, '+').replace(/_/g, '/'))))
export const encodeModularHash = (config: ModularHouseConfig) => `h=${toBase64Url(JSON.stringify(config))}`
export function decodeModularHash(hash: string): unknown {
  const match = hash.replace(/^#/, '').match(/^h=([A-Za-z0-9_-]+)$/)
  if (!match) return null
  try { return JSON.parse(fromBase64Url(match[1])) } catch { return null }
}
