// Garázskapu: a React nélküli mag a src/products/garage.ts-ben van (a szerver is azt használja);
// itt csak a böngészős rész: piszkozat és mintaárak a localStorage-ban, megosztó link.
import { decodeGarageHash, encodeGarageHash, GARAGE_DEFAULTS, GARAGE_PRICE_DEFAULTS, parseGarageConfig, type GarageConfig, type GaragePriceSettings } from '@/products/garage'

export function loadGaragePrices(): GaragePriceSettings {
  try {
    const saved = JSON.parse(localStorage.getItem('ardelis-garage-prices-v1') ?? 'null')
    return saved ? { ...GARAGE_PRICE_DEFAULTS, ...saved } : GARAGE_PRICE_DEFAULTS
  } catch { return GARAGE_PRICE_DEFAULTS }
}

export function loadGarageConfig(): GarageConfig {
  try {
    const shared = window.location.hash ? decodeGarageHash(window.location.hash) : null
    const raw = shared ?? JSON.parse(localStorage.getItem('ardelis-config-garage-v1') ?? 'null')
    const parsed = parseGarageConfig(raw)
    if (parsed) return parsed
  } catch { /* Hibás hivatkozás vagy privát mód esetén az alapmodell indul. */ }
  return { ...GARAGE_DEFAULTS }
}

export function persistGarageConfig(config: GarageConfig) {
  try { localStorage.setItem('ardelis-config-garage-v1', JSON.stringify(config)) } catch { /* privát mód */ }
}

export function createGarageShareUrl(config: GarageConfig) {
  const url = new URL(window.location.href)
  url.hash = encodeGarageHash(config)
  return url.toString()
}
