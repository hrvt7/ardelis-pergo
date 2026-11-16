// Digitális ikerpéldány („Telepítések”): a felszerelt termék befagyasztott pillanatképe, a zárt komponenslista,
// a garancia számítása és a bővítés szabályai. Böngészőben és szerveren (Edge) is fut, ezért csak relatív importok.
import { tr } from '../i18n/locale'
import { ROOF_INFO } from './roofs'
import { SIDE_INFO } from './sides'
import { isWallSide } from './mount'
import { configToCompact } from './shareCode'
import type { PergolaConfig, PriceBreakdown, SideKey, SideType } from '../types/pergola'

/** A pillanatkép szerkezetének verziója. Ha a formátum változik, nő; a régi rekordok a saját verziójukkal olvashatók. */
export const INSTALLATION_SCHEMA_VERSION = 1

export const WARRANTY_GROUPS = ['structure', 'electronics', 'led', 'other'] as const
export type WarrantyGroup = typeof WARRANTY_GROUPS[number]
/** Garancia komponenscsoportonként, hónapban (0–240). */
export type WarrantyMonths = Record<WarrantyGroup, number>

/** Kiinduló értékek az űrlapon — a gyártó a beállításokban és telepítésenként is felülírja. Nem jogi vállalás. */
export const DEFAULT_WARRANTY_MONTHS: WarrantyMonths = { structure: 60, electronics: 24, led: 24, other: 24 }

export const warrantyGroupLabel = (group: WarrantyGroup) => ({
  structure: tr('Szerkezet', 'Konstruktion'),
  electronics: tr('Motor és elektronika', 'Motor und Elektronik'),
  led: tr('LED-világítás', 'LED-Beleuchtung'),
  other: tr('Egyéb', 'Sonstiges'),
})[group]

export type InstallationProduct = 'pergola' | 'veranda' | 'conservatory'
export const INSTALLATION_PRODUCTS: InstallationProduct[] = ['pergola', 'veranda', 'conservatory']

export interface InstallationComponent {
  /** Stabil azonosító (a hibabejelentés és a cikkszám-leképezés kulcsa), pl. „roof”, „side-front”, „led”. */
  key: string
  label: string
  group: WarrantyGroup
}

export interface InstallationSnapshot {
  version: number
  product: InstallationProduct
  config: PergolaConfig
  /** A konfigurátor rövid megosztási kódja (#c=…) a rögzítés pillanatában. */
  shareCode: string
  /** Zárt komponenslista: a hibabejelentés csak ezek közül választhat. */
  components: InstallationComponent[]
  /** Az akkori ár (a későbbi árlista-változás nem írja felül). */
  price: { totalNet: number; totalGross: number; currency: string }
  /** Egy soros megnevezés, pl. „Lamellás tető · 5,00 × 4,00 m”. */
  headline: string
  /** Olvasható konfigurációs sorok a rögzítés pillanatában. */
  spec: [string, string][]
}

const SIDE_KEYS: SideKey[] = ['front', 'back', 'left', 'right']
const sideName = (side: SideKey) => ({ front: tr('Elülső oldal', 'Vorderseite'), back: tr('Hátsó oldal', 'Rückseite'), left: tr('Bal oldal', 'Linke Seite'), right: tr('Jobb oldal', 'Rechte Seite') })[side]

export const installationProduct = (config: Pick<PergolaConfig, 'building'>): InstallationProduct | null =>
  config.building === 'carport' ? null : (config.building ?? 'pergola')

/** A termék komponensei a konfiguráció alapján — mindig ugyanabban a sorrendben, ugyanazokkal a kulcsokkal. */
export function installationComponents(config: PergolaConfig, roofName = ROOF_INFO[config.roof].name): InstallationComponent[] {
  const list: InstallationComponent[] = [
    { key: 'frame', label: tr('Váz és oszlopok', 'Gestell und Pfosten'), group: 'structure' },
    { key: 'roof', label: `${tr('Tető', 'Dach')}: ${roofName}`, group: 'structure' },
  ]
  if (ROOF_INFO[config.roof].motion !== 'none') list.push({ key: 'roof-drive', label: tr('Tetőmozgató motor', 'Dachantrieb'), group: 'electronics' })
  for (const side of SIDE_KEYS) {
    if (isWallSide(config.mount, side)) continue
    const types = [config.sides[side], config.split?.[side]].filter((type): type is SideType => Boolean(type) && type !== 'none')
    if (types.length === 0) continue
    const unique = [...new Set(types)]
    const motorized = unique.some((type) => SIDE_INFO[type].motorized)
    list.push({ key: `side-${side}`, label: `${sideName(side)}: ${unique.map((type) => SIDE_INFO[type].label).join(' + ')}`, group: motorized ? 'electronics' : 'other' })
  }
  if (config.led) list.push({ key: 'led', label: config.ledRgb ? tr('Színváltós RGB+W LED', 'Farbwechsel-LED RGB+W') : tr('Periméter LED', 'Umlaufende LED'), group: 'led' })
  if (config.heaters > 0) list.push({ key: 'heaters', label: `${tr('Fűtőpanel', 'Heizstrahler')} (${config.heaters} ${tr('db', 'Stk.')})`, group: 'electronics' })
  if (config.fans) list.push({ key: 'fans', label: `${tr('Mennyezeti ventilátor', 'Deckenventilator')} (${config.fans} ${tr('db', 'Stk.')})`, group: 'electronics' })
  if (config.sensors) list.push({ key: 'sensors', label: tr('Eső- és szélszenzor', 'Regen- und Windsensor'), group: 'electronics' })
  if (config.speakers) list.push({ key: 'speakers', label: tr('Hangrendszer', 'Soundsystem'), group: 'electronics' })
  if (config.smartHome) list.push({ key: 'smart-home', label: tr('Okosotthon-vezérlés', 'Smart-Home-Steuerung'), group: 'electronics' })
  if (config.roofShade) list.push({ key: 'roof-shade', label: tr('Motoros tetőárnyékoló', 'Motorisierte Dachbeschattung'), group: 'electronics' })
  if (config.solar) list.push({ key: 'solar', label: tr('Napelemes tető', 'Photovoltaik-Dach'), group: 'electronics' })
  if (config.climate && config.building === 'conservatory') list.push({ key: 'climate', label: tr('Fűtés-hűtés', 'Heizung/Kühlung'), group: 'electronics' })
  list.push({ key: 'other', label: tr('Egyéb / nem tudom', 'Sonstiges / weiß nicht'), group: 'other' })
  return list
}

/** A befagyasztott pillanatkép. Csak a rögzítéskor fut; utána a tárolt példány az irányadó. */
export function buildSnapshot(input: { config: PergolaConfig; price: PriceBreakdown; currency: string; roofName: string; headline: string; spec: [string, string][] }): InstallationSnapshot | null {
  const product = installationProduct(input.config)
  if (!product) return null
  return {
    version: INSTALLATION_SCHEMA_VERSION,
    product,
    config: input.config,
    shareCode: configToCompact(input.config),
    components: installationComponents(input.config, input.roofName),
    price: { totalNet: input.price.totalNet, totalGross: input.price.totalGross, currency: input.currency },
    headline: input.headline,
    spec: input.spec,
  }
}

/** Determinisztikus JSON (rendezett kulcsok) — a pillanatkép ujjlenyomatához. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter((key) => (value as Record<string, unknown>)[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(',')}}`
  return JSON.stringify(value)
}

export async function snapshotHash(snapshot: InstallationSnapshot) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableStringify(snapshot)))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Lejárat: telepítés napja + hónapok (hónap végén a hónap utolsó napjára igazítva). */
export function warrantyExpiry(installedAt: string, months: number): string {
  const [year, month, day] = installedAt.slice(0, 10).split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}

export function warrantyState(installedAt: string, months: number, now = new Date()) {
  const expiresAt = warrantyExpiry(installedAt, months)
  return { expiresAt, active: months > 0 && now.toISOString().slice(0, 10) <= expiresAt }
}

export const isWarrantyMonths = (value: unknown): value is WarrantyMonths =>
  Boolean(value) && typeof value === 'object' && WARRANTY_GROUPS.every((group) => {
    const months = (value as Record<string, unknown>)[group]
    return typeof months === 'number' && Number.isInteger(months) && months >= 0 && months <= 240
  })

// ── Bővítés ─────────────────────────────────────────────────────────────────
// A felszerelt szerkezet (méret, tető, rögzítés, szín, épülettípus, üvegezés) nem változhat: csak hozzáadni lehet.
// A szerver a beküldött konfigurációt mindig ezzel a függvénnyel igazítja vissza, a böngészőben látott zár csak kényelem.

const LOCKED_KEYS = ['width', 'depth', 'height', 'modules', 'mount', 'roof', 'frameColor', 'customRal', 'roofColor', 'roofRal', 'pitch', 'glazing', 'building', 'openSides', 'wallGlazing', 'climate', 'foundation', 'solar'] as const satisfies readonly (keyof PergolaConfig)[]

/** Az eredeti konfigurációhoz csak hozzáadott elemeket enged át: nyitott oldal lezárása, LED, fűtés, ventilátor, szenzor, hang, okosotthon, tetőárnyékoló. */
export function clampExpansion(original: PergolaConfig, next: PergolaConfig): PergolaConfig {
  const result: PergolaConfig = { ...next, sides: { ...original.sides }, split: original.split ? { ...original.split } : undefined, doorMirror: original.doorMirror ? { ...original.doorMirror } : undefined }
  for (const key of LOCKED_KEYS) (result as unknown as Record<string, unknown>)[key] = original[key]
  for (const side of SIDE_KEYS) {
    const open = original.sides[side] === 'none' && !original.split?.[side] && !isWallSide(original.mount, side)
    if (!open) continue
    result.sides[side] = next.sides[side]
    if (next.split?.[side]) result.split = { ...result.split, [side]: next.split[side] }
    if (next.doorMirror?.[side] !== undefined) result.doorMirror = { ...result.doorMirror, [side]: next.doorMirror[side] }
  }
  // Ami már megvan, nem vehető el (csak hozzáadás): a meglévő LED/fűtés/stb. marad.
  result.led = original.led || next.led
  result.ledRgb = original.led ? original.ledRgb : next.ledRgb
  result.heaters = Math.max(original.heaters, next.heaters)
  result.fans = Math.max(original.fans ?? 0, next.fans ?? 0) || undefined
  result.sensors = original.sensors || next.sensors
  result.speakers = original.speakers || next.speakers
  result.smartHome = Boolean(original.smartHome || next.smartHome) || undefined
  result.roofShade = original.roofShade ?? next.roofShade
  result.shadeFabric = original.roofShade ? original.shadeFabric : next.shadeFabric
  if (!result.split || Object.keys(result.split).length === 0) delete result.split
  if (!result.doorMirror || Object.keys(result.doorMirror).length === 0) delete result.doorMirror
  for (const key of ['fans', 'smartHome', 'roofShade', 'shadeFabric', 'ledRgb'] as const) if (result[key] === undefined) delete result[key]
  return result
}

/** A bővítésben hozzáadott komponensek kulcsai (üres = nincs valódi bővítés). */
export function expansionAdditions(original: PergolaConfig, next: PergolaConfig): string[] {
  const before = new Map(installationComponents(original).map((item) => [item.key, item.label]))
  return installationComponents(next).filter((item) => item.key !== 'other' && before.get(item.key) !== item.label).map((item) => item.key)
}

// ── Nyilvános token ─────────────────────────────────────────────────────────
/** 32 bájt (256 bit) kriptográfiai véletlen, base64url → 43 karakter. */
export function newInstallationToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export const INSTALLATION_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/
