// A konfiguráció URL-be kódolása. Böngészőben és szerveren is fut.
//
// Új, rövid formátum (#c=…): pozíciós mezők aláhúzással elválasztva, pl.
//   500_400_260_L_l_a_g00z_35_65_1_1_0_1
// Kb. 40 karakter a régi ~400 helyett → olvasható QR-kód, SMS-be is fér.
// A régi formátum (#k=… base64 JSON) továbbra is beolvasható.
import type { FrameColor, MountType, PergolaConfig, RoofType, SideType } from '../types/pergola'

const MOUNT: Record<MountType, string> = { wall: 'W', 'corner-left': 'L', 'corner-right': 'R', niche: 'N', freestanding: 'F' }
const ROOF: Record<RoofType, string> = { louvered: 'l', retractable: 'r', fixed: 'f' }
const COLOR: Record<FrameColor, string> = { anthracite: 'a', black: 'b', white: 'w', bronze: 'z', custom: 'c' }
const SIDE: Record<SideType, string> = { none: '0', zip: 'z', glass: 'g', louver: 'l' }
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
  if (config.frameColor === 'custom' && config.customRal) parts.push(encodeURIComponent(config.customRal.slice(0, 12)).replace(/[_!'()*~]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`))
  return parts.join('_')
}

/** Nyers objektumot ad vissza; az érvényesítést a hívó végzi (parseConfig). */
export function compactToJson(code: string): unknown {
  const parts = code.split('_')
  if (parts.length < 13) return null
  const [w, d, h, mount, roof, color, sides, angle, open, led, heaters, speakers, sensors, ral] = parts
  const sideMap = invert(SIDE)
  const number = (value: string) => Number(value)
  return {
    width: number(w) / 100, depth: number(d) / 100, height: number(h) / 100,
    mount: invert(MOUNT)[mount], roof: invert(ROOF)[roof], frameColor: invert(COLOR)[color],
    sides: { front: sideMap[sides[0]], back: sideMap[sides[1]], left: sideMap[sides[2]], right: sideMap[sides[3]] },
    louverAngle: number(angle), screenOpen: number(open),
    led: led === '1', heaters: number(heaters), speakers: speakers === '1', sensors: sensors === '1',
    ...(ral ? { customRal: decodeURIComponent(ral) } : {}),
  }
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
