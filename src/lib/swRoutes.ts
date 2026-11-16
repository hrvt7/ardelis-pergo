// A service worker útvonal-stratégiája: tiszta, importmentes modul (a src/sw/sw.ts és a build-plugin is ezt használja,
// a tests/swRoutes.test.ts ellenőrzi). Semmilyen böngésző- vagy Node-API-t nem érint.

export type SwStrategy = 'cache-first' | 'network-first' | 'network-only'

/** A gyorsítótárak közös előtagja: az activate csak a saját (lamelix-) tárakat takarítja. */
export const CACHE_PREFIX = 'lamelix-'
/** A jelenet-eszközök tára: fájlonként verziózott (rev), ezért egy új build nem dobja el a már letöltött, változatlan fájlokat. */
export const ASSET_CACHE = `${CACHE_PREFIX}assets-v1`
/** A build tára (index.html, hash-elt JS/CSS/betűk): buildenként új név, a régit az activate törli. */
export const buildCacheName = (buildId: string) => `${CACHE_PREFIX}build-${buildId}`
/** A tárolt válaszra írt fejléc: ebből tudja a SW, hogy a tárolt fájl a jelenlegi manifest szerinti változat-e. */
export const REV_HEADER = 'x-lamelix-rev'

/** Offline is szükséges jelenet- és felületi fájlok kiterjesztései (public/assets és public/vendor alatt). */
export const OFFLINE_ASSET_EXT = ['glb', 'gltf', 'bin', 'hdr', 'ktx2', 'jpg', 'jpeg', 'png', 'webp', 'avif', 'svg', 'woff', 'woff2', 'json', 'mjs', 'js', 'gz', 'mp4'] as const

/** Vite által hash-elt build-fájl: /assets/<név>-<8 karakteres hash>.<kiterjesztés> (közvetlenül az assets alatt, almappa nélkül). */
const BUILD_FILE = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/

const extOf = (pathname: string) => {
  const match = /\.([a-z0-9]+)$/i.exec(pathname)
  return match ? match[1].toLowerCase() : ''
}

export const isBuildFile = (pathname: string) => BUILD_FILE.test(pathname)

/** A public/assets vagy public/vendor alatti, offline is kellő fájl (3D modell, HDR, textúra, kép, betű, adat). */
export function isOfflineAsset(pathname: string) {
  if (!/^\/(assets|vendor)\//.test(pathname) || isBuildFile(pathname)) return false
  return (OFFLINE_ASSET_EXT as readonly string[]).includes(extOf(pathname))
}

/**
 * Személyes adatot mutató oldalak: soha nem szolgáljuk ki őket gyorsítótárból, és nem is tároljuk őket.
 * Gyártói admin (/k/<id>/admin), ajánlat-megtekintő (/ajanlat/<token>), belépés.
 */
export function isPrivatePage(pathname: string) {
  return /^\/k\/[^/]+\/admin(\/|$)/.test(pathname) || /^\/ajanlat(\/|$)/.test(pathname) || /^\/(belepes|login|admin)(\/|$)/.test(pathname)
}

/** Ezeket a fájlokat a böngésző frissességgel kell, hogy kapja (frissítés-felismerés, manifest). */
const ALWAYS_NETWORK = new Set(['/sw.js', '/offline-manifest.json', '/site.webmanifest'])

export interface SwRequestInfo {
  url: string
  /** A SW saját origója (self.location.origin). */
  origin: string
  method?: string
  /** Request.mode: 'navigate' = oldalbetöltés. */
  mode?: string
  /** Request.destination: 'document' = oldalbetöltés (iframe is). */
  destination?: string
}

/** Melyik stratégiával szolgálja ki a SW a kérést. Az /api/* és minden nem-GET kérés mindig hálózat. */
export function swStrategy(request: SwRequestInfo): SwStrategy {
  if ((request.method ?? 'GET').toUpperCase() !== 'GET') return 'network-only'
  let url: URL
  try { url = new URL(request.url, request.origin) } catch { return 'network-only' }
  if (url.origin !== request.origin) return 'network-only'
  const path = url.pathname
  if (path === '/api' || path.startsWith('/api/')) return 'network-only'
  if (ALWAYS_NETWORK.has(path)) return 'network-only'
  if (isPrivatePage(path)) return 'network-only'
  const navigation = request.mode === 'navigate' || request.destination === 'document' || request.destination === 'iframe'
  if (navigation) return path.startsWith('/demo/') ? 'network-only' : 'network-first'
  if (isBuildFile(path) || isOfflineAsset(path)) return 'cache-first'
  return 'network-only'
}

/** A navigáció tárolási kulcsa: csak az útvonal (a ?quality= és hasonló paraméterek nem szaporítják a tárat). */
export const navigationCacheKey = (url: string, origin: string) => new URL(url, origin).pathname

export interface OfflineFile { url: string; rev: string; size: number }
export interface OfflineManifest { version: string; build: OfflineFile[]; assets: OfflineFile[] }

/** A konfigurátor oldalai: csak innen regisztrál a SW, és csak itt fut a nyitó animáció (a nyitóoldal és az admin nem). */
export const isAppPath = (pathname: string) => /^\/(konfigurator|embed)(\/|$)/.test(pathname) || (/^\/k\/[^/]+/.test(pathname) && !/^\/k\/[^/]+\/admin(\/|$)/.test(pathname))

/**
 * HTTP Range fejléc értelmezése egy ismert méretű, tárolt fájlra (a videót a Safari mindig tartományokban kéri; offline a
 * SW a tárolt teljes fájlból vág). Egyetlen tartományt kezel: bytes=a-b, bytes=a-, bytes=-n. Érvénytelen → null.
 */
export function parseByteRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || size <= 0) return null
  const [, from, to] = match
  if (from === '' && to === '') return null
  let start: number
  let end: number
  if (from === '') { const suffix = Number(to); if (suffix === 0) return null; start = Math.max(0, size - suffix); end = size - 1 }
  else { start = Number(from); end = to === '' ? size - 1 : Math.min(Number(to), size - 1) }
  if (start > end || start >= size) return null
  return { start, end }
}
