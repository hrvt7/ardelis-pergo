// Kültéri katalógus (kerítés, kapu): a React nélküli mag a src/products/outdoor.ts-ben van (a szerver is azt használja);
// itt csak a böngészős rész marad: piszkozat és árak a localStorage-ban, megosztó link.
import type { OutdoorConfig, OutdoorFamily, OutdoorPriceSettings } from '@/types/catalog'
import { decodeOutdoorHash, encodeOutdoorHash, OUTDOOR_DEFAULTS, OUTDOOR_PRICE_DEFAULTS, parseOutdoorConfig } from '@/products/outdoor'

export { calculateOutdoorPrice, COLOR_HEX, FAMILY_META, LABELS, OUTDOOR_DEFAULTS, OUTDOOR_PRICE_DEFAULTS, outdoorColor, outdoorSpecCode } from '@/products/outdoor'

export function loadOutdoorPrices(): OutdoorPriceSettings {
  try {
    const saved = JSON.parse(localStorage.getItem('ardelis-outdoor-prices-v1') ?? 'null')
    return saved ? { ...OUTDOOR_PRICE_DEFAULTS, ...saved } : OUTDOOR_PRICE_DEFAULTS
  } catch { return OUTDOOR_PRICE_DEFAULTS }
}

export function loadOutdoorConfig(family: OutdoorFamily): OutdoorConfig {
  const fallback = { ...OUTDOOR_DEFAULTS[family] }
  try {
    const shared = window.location.hash ? decodeOutdoorHash(window.location.hash) : null
    const raw = shared ?? JSON.parse(localStorage.getItem(`ardelis-config-${family}-v1`) ?? 'null')
    const parsed = parseOutdoorConfig(raw, family)
    if (parsed) return parsed
  } catch { /* Hibás hivatkozás vagy privát mód esetén az alapmodell indul. */ }
  return fallback
}

export function persistOutdoorConfig(config: OutdoorConfig) {
  try { localStorage.setItem(`ardelis-config-${config.family}-v1`, JSON.stringify(config)) } catch { /* privát mód */ }
}

export function persistOutdoorPrices(prices: OutdoorPriceSettings) {
  try { localStorage.setItem('ardelis-outdoor-prices-v1', JSON.stringify(prices)) } catch { /* privát mód */ }
}

export function createOutdoorShareUrl(config: OutdoorConfig) {
  const url = new URL(window.location.href)
  url.hash = encodeOutdoorHash(config)
  return url.toString()
}
