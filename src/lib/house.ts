// A vásárló házának kinézete a 3D jelenetben: homlokzat anyaga és színe, nyílászárók színe.
// Csak látvány — az árat nem befolyásolja, de segít eldönteni, milyen színű pergola illik a házhoz.
import type { CSSProperties } from 'react'
import type { SceneSettings, WallFinish } from '@/types/pergola'
import { hexDistance } from '@/lib/colors'

export interface HouseSwatch {
  id: string
  name: string
  hex: string
  /** Rövid magyarázat a kártyán (pl. „a leggyakoribb”). */
  note?: string
}

export interface WindowSwatch extends HouseSwatch {
  /** Megjelenés: festett / fóliázott fa hatású / fémes alumínium. */
  kind: 'solid' | 'wood' | 'metal'
  /** A pergolához ajánlott katalógusszín kódja (a nyílászárókhoz igazításhoz). */
  match: string
}

export const WALL_FINISH_INFO: Record<WallFinish, { label: string; description: string }> = {
  plaster: { label: 'Vakolt', description: 'Színezett nemesvakolat' },
  brick: { label: 'Tégla', description: 'Látszótégla, klinker' },
  cedar: { label: 'Fa', description: 'Fa vagy fa hatású burkolat' },
}

/** A leggyakoribb homlokzati színek anyagonként. Az első az alapértelmezett. */
export const WALL_COLORS: Record<WallFinish, HouseSwatch[]> = {
  plaster: [
    { id: 'white', name: 'Fehér', hex: '#f1efe9', note: 'a leggyakoribb' },
    { id: 'offwhite', name: 'Törtfehér', hex: '#ebe3d2' },
    { id: 'sand', name: 'Homok', hex: '#dccba7' },
    { id: 'vanilla', name: 'Vanília', hex: '#ecdba6' },
    { id: 'peach', name: 'Barack', hex: '#e7c3a5' },
    { id: 'lightgrey', name: 'Szürke', hex: '#cfcfca' },
    { id: 'pebble', name: 'Kavics', hex: '#a39f96' },
    { id: 'graphite', name: 'Grafit', hex: '#55595b' },
  ],
  brick: [
    { id: 'red', name: 'Vörös', hex: '#9b5640', note: 'hagyományos' },
    { id: 'brown', name: 'Barna', hex: '#6a4434' },
    { id: 'sand', name: 'Homok', hex: '#c9a575' },
    { id: 'anthracite', name: 'Antracit', hex: '#4a4a4b' },
    { id: 'whitewash', name: 'Festett fehér', hex: '#e7e4dc' },
  ],
  cedar: [
    { id: 'natural', name: 'Natúr', hex: '#8a5a3c', note: 'mint a mintaházon' },
    { id: 'larch', name: 'Vörösfenyő', hex: '#b48858' },
    { id: 'walnut', name: 'Sötét pác', hex: '#563826' },
    { id: 'silver', name: 'Szürkült', hex: '#8f8b84' },
    { id: 'black', name: 'Fekete', hex: '#2c2b2a' },
  ],
}

/** Nyílászárók (ablak-, ajtókeretek, bejárati ajtó) leggyakoribb színei. */
export const WINDOW_COLORS: WindowSwatch[] = [
  { id: 'white', name: 'Fehér', hex: '#efefec', kind: 'solid', match: 'RAL 9016', note: 'a leggyakoribb' },
  { id: 'anthracite', name: 'Antracit', hex: '#363b3e', kind: 'solid', match: 'RAL 7016', note: 'modern' },
  { id: 'black', name: 'Fekete', hex: '#1c1f21', kind: 'solid', match: 'RAL 9005' },
  { id: 'silver', name: 'Alumínium', hex: '#a2a6a7', kind: 'metal', match: 'RAL 9006' },
  { id: 'brown', name: 'Barna', hex: '#4b3a30', kind: 'solid', match: 'RAL 8019' },
  { id: 'goldenoak', name: 'Aranytölgy', hex: '#a8743d', kind: 'wood', match: 'FA ARANYTÖLGY' },
  { id: 'walnut', name: 'Dió', hex: '#5e3d26', kind: 'wood', match: 'FA DIÓ' },
]

export const DEFAULT_HOUSE: Pick<SceneSettings, 'wallFinish' | 'wallColor' | 'windowColor'> = {
  wallFinish: 'cedar',
  wallColor: WALL_COLORS.cedar[0].hex,
  windowColor: 'anthracite',
}

const HEX = /^#[0-9a-f]{6}$/i

export const defaultWallColor = (finish: WallFinish) => WALL_COLORS[finish][0].hex

/** A homlokzat színe a jelenethez (érvénytelen értéknél az anyag alapszíne). */
export function wallColorHex(finish: WallFinish, color: string | undefined) {
  return color && HEX.test(color) ? color.toLowerCase() : defaultWallColor(finish)
}

/** A fa homlokzat eredeti (a modell saját) textúrájával jelenik-e meg. */
export const isOriginalCedar = (finish: WallFinish, color: string | undefined) => finish === 'cedar' && wallColorHex(finish, color) === defaultWallColor('cedar')

export const findWindowColor = (id: string | undefined) => WINDOW_COLORS.find((item) => item.id === id) ?? WINDOW_COLORS.find((item) => item.id === DEFAULT_HOUSE.windowColor)!

/** A homlokzati szín neve: katalógusszín, vagy a legközelebbi árnyalat „-hoz közeli” jelöléssel. */
export function wallColorName(finish: WallFinish, color: string | undefined) {
  const hex = wallColorHex(finish, color)
  const exact = WALL_COLORS[finish].find((item) => item.hex.toLowerCase() === hex)
  if (exact) return exact.name
  const nearest = [...WALL_COLORS[finish]].sort((a, b) => hexDistance(a.hex, hex) - hexDistance(b.hex, hex))[0]
  return hexDistance(nearest.hex, hex) < 8 ? `${nearest.name} árnyalat` : 'egyedi szín'
}

/** Egysoros leírás az összegzéshez és a gyártónak küldött kérelemhez. */
export function houseSummary(look: Pick<SceneSettings, 'wallFinish' | 'wallColor' | 'windowColor'>) {
  const finish = WALL_FINISH_INFO[look.wallFinish]?.label ?? 'Vakolt'
  return `${finish} homlokzat (${wallColorName(look.wallFinish, look.wallColor).toLowerCase()}) · ${findWindowColor(look.windowColor).name.toLowerCase()} nyílászárók`
}

/** Mentett beállítás beolvasása: minden mező külön ellenőrizve, hibás érték helyett alapérték. */
export function parseHouseLook(value: unknown): Pick<SceneSettings, 'wallFinish' | 'wallColor' | 'windowColor'> {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const wallFinish = (['plaster', 'brick', 'cedar'] as const).find((item) => item === input.wallFinish) ?? DEFAULT_HOUSE.wallFinish
  const wallColor = typeof input.wallColor === 'string' && HEX.test(input.wallColor) ? input.wallColor.toLowerCase() : defaultWallColor(wallFinish)
  const windowColor = WINDOW_COLORS.some((item) => item.id === input.windowColor) ? String(input.windowColor) : DEFAULT_HOUSE.windowColor
  return { wallFinish, wallColor, windowColor }
}

const storageKey = (tenantId: string) => `pergo-house-v1:${tenantId}`

export function loadHouseLook(tenantId: string) {
  try { return parseHouseLook(JSON.parse(localStorage.getItem(storageKey(tenantId)) ?? 'null')) } catch { return parseHouseLook(null) }
}

export function saveHouseLook(tenantId: string, look: Pick<SceneSettings, 'wallFinish' | 'wallColor' | 'windowColor'>) {
  try { localStorage.setItem(storageKey(tenantId), JSON.stringify({ wallFinish: look.wallFinish, wallColor: look.wallColor, windowColor: look.windowColor })) } catch { /* privát mód */ }
}

/** Fotón mért szín korrekciója: az árnyékos fotók sötétebbek a valós homlokzatnál, ezért enyhén világosítunk. */
export function brightenPhotoColor(hex: string, amount = 0.12) {
  const value = HEX.test(hex) ? hex : '#cccccc'
  const channels = [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16))
  const lifted = channels.map((channel) => Math.round(Math.min(255, channel + (255 - channel) * amount)))
  return `#${lifted.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/** Anyagminta CSS-sel: vakolat (finom szemcse), tégla (futókötés), fa (vízszintes deszkák). */
export function finishPreview(finish: WallFinish, hex: string): CSSProperties {
  if (finish === 'brick') {
    // Futókötés SVG-mintával: a fuga a tégla színéből kevert világos cementszürke.
    const light = parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16) > 510
    const mortar = light ? '#cfcbc2' : '#bdb6aa'
    const bricks = '<rect x=".6" y=".6" width="10.8" height="4.8"/><rect x="12.6" y=".6" width="10.8" height="4.8"/><rect x="-5.4" y="6.6" width="10.8" height="4.8"/><rect x="6.6" y="6.6" width="10.8" height="4.8"/><rect x="18.6" y="6.6" width="10.8" height="4.8"/>'
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12"><rect width="24" height="12" fill="${mortar}"/><g fill="${hex}">${bricks}</g></svg>`
    return { backgroundColor: mortar, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, backgroundSize: '24px 12px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }
  }
  if (finish === 'cedar') return {
    backgroundColor: hex,
    backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px, rgba(0,0,0,.35) 9px 10px)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)',
  }
  return {
    backgroundColor: hex,
    backgroundImage: 'radial-gradient(rgba(0,0,0,.045) 1px, transparent 1.4px), radial-gradient(rgba(255,255,255,.08) 1px, transparent 1.4px)',
    backgroundSize: '5px 5px, 7px 7px',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)',
  }
}

