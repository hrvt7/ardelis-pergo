// A konfiguráció URL-be kódolása (#k=...). Böngészőben és szerveren is fut.
import type { PergolaConfig } from '../types/pergola'

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
