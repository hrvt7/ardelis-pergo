// Modulház: a React nélküli mag a src/products/modularHouse.ts-ben van (a szerver is azt használja);
// itt csak a böngészős rész: piszkozat a localStorage-ban, megosztó link.
import { decodeModularHash, encodeModularHash, MODULAR_DEFAULTS, parseModularConfig, type ModularHouseConfig } from '@/products/modularHouse'

const KEY = 'lamelix-config-modular-v1'

export function loadModularConfig(): ModularHouseConfig {
  try {
    const shared = window.location.hash ? decodeModularHash(window.location.hash) : null
    const parsed = parseModularConfig(shared ?? JSON.parse(localStorage.getItem(KEY) ?? 'null'))
    if (parsed) return parsed
  } catch { /* Hibás hivatkozás vagy privát mód esetén az alapmodell indul. */ }
  return { ...MODULAR_DEFAULTS }
}

export function persistModularConfig(config: ModularHouseConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(config)) } catch { /* privát mód */ }
}

export function createModularShareUrl(config: ModularHouseConfig) {
  const url = new URL(window.location.href)
  url.hash = encodeModularHash(config)
  return url.toString()
}

/** Van-e a böngészőben mentett, az alaptól eltérő piszkozat (link nélkül nyitva). */
export function hasModularDraft(config: ModularHouseConfig) {
  try { return !window.location.hash && localStorage.getItem(KEY) !== null && JSON.stringify(config) !== JSON.stringify(MODULAR_DEFAULTS) } catch { return false }
}
