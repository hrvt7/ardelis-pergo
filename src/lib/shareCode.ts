// A konfiguráció URL-be kódolása. Böngészőben és szerveren is fut.
//
// Új, rövid formátum (#c=…): pozíciós mezők aláhúzással elválasztva, pl.
//   500_400_260_L_l_a_g00z_35_65_1_1_0_1
// Kb. 40 karakter a régi ~400 helyett → olvasható QR-kód, SMS-be is fér.
// A régi formátum (#k=… base64 JSON) továbbra is beolvasható.
import { findShadeFabric, ROOF_SHADE_INFO, SHADE_FABRICS } from './roofShade'
import type { FrameColor, MountType, PergolaConfig, RoofType, SideType } from '../types/pergola'
import { GLAZING_INFO, ROOF_INFO, ROOF_TYPES } from './roofs'
import { SIDE_INFO, SIDE_TYPES } from './sides'
import { CLIMATE_INFO, WALL_GLAZING_INFO } from './buildings'

const MOUNT: Record<MountType, string> = { wall: 'W', 'corner-left': 'L', 'corner-right': 'R', niche: 'N', freestanding: 'F' }
const ROOF = Object.fromEntries(ROOF_TYPES.map((roof) => [roof, ROOF_INFO[roof].share])) as Record<RoofType, string>
const COLOR: Record<FrameColor, string> = { anthracite: 'a', black: 'b', white: 'w', bronze: 'z', custom: 'c' }
const SIDE = Object.fromEntries(SIDE_TYPES.map((type) => [type, SIDE_INFO[type].share])) as Record<SideType, string>
const SIDE_KEYS = ['front', 'back', 'left', 'right'] as const
const COLOR_BY_CHAR = invertColor()
function invertColor() { return Object.fromEntries(Object.entries({ anthracite: 'a', black: 'b', white: 'w', bronze: 'z', custom: 'c' }).map(([key, value]) => [value, key])) as Record<string, FrameColor> }
/** Kód a linkbe: csak a hash-mintában engedett karakterek (A–Z, 0–9, %), minden elválasztó escape-elve. */
const encodeCode = (code: string) => encodeURIComponent(code.slice(0, 24)).replace(/[-_.!'()*~]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`)
const safeDecode = (text: string) => { try { return decodeURIComponent(text) } catch { return undefined } }
const invert = <T extends string>(map: Record<T, string>) => Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key])) as Record<string, T>

export function configToCompact(config: PergolaConfig) {
  const sides = (['front', 'back', 'left', 'right'] as const).map((side) => SIDE[config.sides[side]]).join('')
  const parts = [
    Math.round(config.width * 100), Math.round(config.depth * 100), Math.round(config.height * 100),
    MOUNT[config.mount], ROOF[config.roof], COLOR[config.frameColor], sides,
    Math.round(config.louverAngle), Math.round(config.screenOpen),
    config.led ? 1 : 0, config.heaters, config.speakers ? 1 : 0, config.sensors ? 1 : 0,
  ].map(String)
  // Csak a hash-mintában engedett karakterek maradhatnak (A–Z, 0–9, . -); minden más %XX.
  const ral = config.frameColor === 'custom' && config.customRal ? encodeCode(config.customRal) : ''
  // 14. mező: egyedi RAL (üres is lehet), 15.: kapcsolók kötőjellel: p = napelem, r = RGB LED,
  // v1/v2 = ventilátor, h = okosotthon, s…. = félbe osztott oldalak második fele („.” = nem osztott).
  const flags: string[] = []
  if (config.solar) flags.push('p')
  if (config.ledRgb) flags.push('r')
  if (config.fans) flags.push(`v${config.fans}`)
  if (config.smartHome) flags.push('h')
  if (config.pitch) flags.push(`i${Math.round(config.pitch)}`)
  if (config.glazing) flags.push(`u${GLAZING_INFO[config.glazing].share}`)
  if (config.roofShade) flags.push(`${ROOF_SHADE_INFO[config.roofShade].share}${findShadeFabric(config.shadeFabric).share}`)
  if (config.roofColor) flags.push(`t${COLOR[config.roofColor]}${config.roofColor === 'custom' && config.roofRal ? encodeCode(config.roofRal) : ''}`)
  if (config.split && SIDE_KEYS.some((side) => config.split?.[side])) flags.push(`s${SIDE_KEYS.map((side) => { const type = config.split?.[side]; return type ? SIDE[type] : '.' }).join('')}`)
  // Zárt építmény: e = veranda (ev) / télikert (ec), w = oldalüvegezés, k = klíma, q = alap és padló.
  if (config.building) flags.push(config.building === 'conservatory' ? 'ec' : 'ev')
  if (config.wallGlazing) flags.push(`w${WALL_GLAZING_INFO[config.wallGlazing].share}`)
  if (config.climate) flags.push(`k${CLIMATE_INFO[config.climate].share}`)
  if (config.foundation) flags.push('q')
  if (ral || flags.length) parts.push(ral)
  if (flags.length) parts.push(flags.join('-'))
  return parts.join('_')
}

/** Nyers objektumot ad vissza; az érvényesítést a hívó végzi (parseConfig). */
export function compactToJson(code: string): unknown {
  const parts = code.split('_')
  if (parts.length < 13) return null
  const [w, d, h, mount, roof, color, sides, angle, open, led, heaters, speakers, sensors, ral, flags] = parts
  const sideMap = invert(SIDE)
  const number = (value: string) => Number(value)
  return {
    width: number(w) / 100, depth: number(d) / 100, height: number(h) / 100,
    mount: invert(MOUNT)[mount], roof: invert(ROOF)[roof], frameColor: invert(COLOR)[color],
    sides: { front: sideMap[sides[0]], back: sideMap[sides[1]], left: sideMap[sides[2]], right: sideMap[sides[3]] },
    louverAngle: number(angle), screenOpen: number(open),
    led: led === '1', heaters: number(heaters), speakers: speakers === '1', sensors: sensors === '1',
    ...(ral ? { customRal: safeDecode(ral) } : {}),
    ...parseFlags(flags ?? '', sideMap),
  }
}

function parseFlags(text: string, sideMap: Record<string, SideType>) {
  const result: Partial<PergolaConfig> = {}
  for (const flag of text.split('-').filter(Boolean)) {
    if (flag === 'p') result.solar = true
    else if (flag === 'r') result.ledRgb = true
    else if (flag === 'h') result.smartHome = true
    else if (/^i\d{1,2}$/.test(flag)) result.pitch = Number(flag.slice(1))
    else if (/^u[csohf]$/.test(flag)) result.glazing = (Object.entries(GLAZING_INFO).find(([, info]) => info.share === flag[1])?.[0]) as PergolaConfig['glazing']
    else if (/^[ab][a-z]$/.test(flag)) {
      result.roofShade = flag[0] === 'a' ? 'above' : 'below'
      result.shadeFabric = SHADE_FABRICS.find((item) => item.share === flag[1])?.id ?? 'white'
    }
    else if (/^t[a-z]/.test(flag) && COLOR_BY_CHAR[flag[1]]) {
      result.roofColor = COLOR_BY_CHAR[flag[1]]
      if (flag.length > 2) result.roofRal = safeDecode(flag.slice(2))
    }
    else if (flag === 'ev' || flag === 'ec') result.building = flag === 'ec' ? 'conservatory' : 'veranda'
    else if (/^w[sdt]$/.test(flag)) result.wallGlazing = Object.entries(WALL_GLAZING_INFO).find(([, info]) => info.share === flag[1])?.[0] as PergolaConfig['wallGlazing']
    else if (/^k[sub]$/.test(flag)) result.climate = Object.entries(CLIMATE_INFO).find(([, info]) => info.share === flag[1])?.[0] as PergolaConfig['climate']
    else if (flag === 'q') result.foundation = true
    else if (/^v\d$/.test(flag)) result.fans = Math.min(2, Number(flag.slice(1)))
    else if (/^s.{4}$/.test(flag)) {
      const split: NonNullable<PergolaConfig['split']> = {}
      SIDE_KEYS.forEach((side, index) => { const type = sideMap[flag[index + 1]]; if (type) split[side] = type })
      if (Object.keys(split).length) result.split = split
    }
  }
  return result
}

/** Régi formátum: base64url JSON. */
export function configToHash(config: PergolaConfig) {
  const bytes = new TextEncoder().encode(JSON.stringify(config))
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function hashToJson(hash: string): unknown {
  const base64 = hash.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0))))
}

/** A teljes URL-hash („#c=…” vagy „#k=…”) visszafejtése; hibánál null. */
export function decodeShareHash(hash: string): unknown {
  try {
    const compact = hash.match(/^#c=([A-Za-z0-9_.%-]+)$/)
    if (compact) return compactToJson(compact[1])
    const legacy = hash.match(/^#k=([A-Za-z0-9_-]+)$/)
    if (legacy) return hashToJson(legacy[1])
  } catch {
    // hibás link
  }
  return null
}

export const shareHash = (config: PergolaConfig) => `c=${configToCompact(config)}`
