// Lamelix service worker (kézzel írt forrás). A build (vite.config.ts → offlineSw plugin) esbuild-del dist/sw.js-be
// csomagolja, és a __OFFLINE_MANIFEST__ helyére beírja az aktuális előtöltési listát – így minden új build új sw.js-t ad,
// amit a böngésző frissítésként ismer fel. Az útvonal-döntés a tesztelt src/lib/swRoutes.ts-ben van.
//
// Stratégiák: hash-elt build-fájlok és public/assets → cache-first; oldalbetöltés → network-first (offline: tárolt
// index.html); /api/*, admin, ajánlat, belépés és minden nem-GET kérés → mindig hálózat, nem kerül tárba.
import { ASSET_CACHE, CACHE_PREFIX, REV_HEADER, buildCacheName, isBuildFile, navigationCacheKey, swStrategy, type OfflineFile, type OfflineManifest } from '../lib/swRoutes'

declare const __OFFLINE_MANIFEST__: OfflineManifest

// A projekt DOM-típusokkal fordul (a WebWorker lib ütközne vele), ezért a SW-specifikus felületet itt írjuk le.
interface ExtendableEvent extends Event { waitUntil(promise: Promise<unknown>): void }
interface FetchEvent extends ExtendableEvent { request: Request; respondWith(response: Response | Promise<Response>): void }
interface ExtendableMessageEvent extends ExtendableEvent { data: unknown; ports: readonly MessagePort[] }
interface SwClient { id: string; postMessage(message: unknown): void }
interface SwScope {
  location: Location
  registration: { active: unknown }
  skipWaiting(): Promise<void>
  clients: { claim(): Promise<void>; matchAll(options?: { includeUncontrolled?: boolean; type?: string }): Promise<SwClient[]> }
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEvent) => void): void
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void
  addEventListener(type: 'message', listener: (event: ExtendableMessageEvent) => void): void
}

const sw = self as unknown as SwScope
const MANIFEST = __OFFLINE_MANIFEST__
const BUILD_CACHE = buildCacheName(MANIFEST.version)
const ORIGIN = sw.location.origin
/** Gyenge wifi: ennyi ideig várunk a hálózatra oldalbetöltésnél, utána a tárolt oldal jön. */
const NAVIGATION_TIMEOUT_MS = 3500

const revByUrl = new Map<string, string>([...MANIFEST.build, ...MANIFEST.assets].map((file) => [file.url, file.rev]))
const buildUrls = new Set(MANIFEST.build.map((file) => file.url))
const cacheFor = (path: string) => (buildUrls.has(path) || isBuildFile(path) ? BUILD_CACHE : ASSET_CACHE)

/** A válasz a rev fejléccel kerül a tárba; így az activate fájlonként el tudja dönteni, hogy elavult-e. */
async function store(cacheName: string, key: string, response: Response, rev: string | undefined) {
  if (!response.ok || response.status !== 200 || response.type === 'opaque') return
  const headers = new Headers(response.headers)
  if (rev) headers.set(REV_HEADER, rev)
  const body = await response.blob()
  const cache = await caches.open(cacheName)
  await cache.put(key, new Response(body, { status: 200, statusText: response.statusText, headers }))
}

/** Tárolt és a jelenlegi manifest szerint friss válasz (ha a fájl nincs a manifestben, bármilyen tárolt változat jó). */
async function freshMatch(path: string) {
  const cache = await caches.open(cacheFor(path))
  const hit = await cache.match(path)
  if (!hit) return undefined
  const want = revByUrl.get(path)
  if (want && hit.headers.get(REV_HEADER) !== want) return undefined
  return hit
}

async function cacheFirst(request: Request) {
  const path = new URL(request.url).pathname
  // Tartomány-kérés (videó, nagy bináris részlet): a tárolt teljes válasz nem felel meg rá, hálózat.
  if (request.headers.has('range')) return fetch(request)
  const hit = await freshMatch(path)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) await store(cacheFor(path), path, response.clone(), revByUrl.get(path)).catch(() => undefined)
  return response
}

async function networkFirst(request: Request) {
  const key = navigationCacheKey(request.url, ORIGIN)
  const cache = await caches.open(BUILD_CACHE)
  const network = fetch(request).then(async (response) => {
    if (response.ok && response.headers.get('content-type')?.includes('text/html')) await cache.put(key, response.clone()).catch(() => undefined)
    return response
  })
  network.catch(() => undefined)
  const timeout = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), NAVIGATION_TIMEOUT_MS))
  try {
    const first = await Promise.race([network, timeout])
    if (first) return first
  } catch { /* offline: tárolt oldal */ }
  const cached = (await cache.match(key)) ?? (await cache.match('/index.html'))
  if (cached) return cached
  return network
}

sw.addEventListener('install', (event) => {
  // Az alkalmazás héja (index.html + a JS/CSS csomagok) azonnal tárba kerül, hogy a második indítás hálózat nélkül is menjen.
  // A betűk és a jelenet-eszközök használat közben, illetve az „Offline letöltés” gombbal töltődnek le.
  const shell = MANIFEST.build.filter((file) => file.url === '/index.html' || /\.(js|css)$/.test(file.url))
  // Ha a héj nem töltődött le teljesen, a telepítés elbukik (a böngésző később újrapróbálja), így nem marad félkész offline állapot.
  event.waitUntil(precache(shell, 4, 'no-cache').then((progress) => { if (progress.failed) throw new Error(`${progress.failed} fájl nem töltődött le`) }))
})

sw.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Régi buildek tárai törlődnek; a jelenet-eszközök tárából csak az elavult vagy már nem létező fájlok.
    const names = await caches.keys()
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== BUILD_CACHE && name !== ASSET_CACHE).map((name) => caches.delete(name)))
    const assets = await caches.open(ASSET_CACHE)
    for (const request of await assets.keys()) {
      const path = new URL(request.url).pathname
      const want = revByUrl.get(path)
      const hit = want ? await assets.match(request) : undefined
      if (!want || hit?.headers.get(REV_HEADER) !== want) await assets.delete(request)
    }
    await sw.clients.claim()
  })())
})

sw.addEventListener('fetch', (event) => {
  const { request } = event
  const strategy = swStrategy({ url: request.url, origin: ORIGIN, method: request.method, mode: request.mode, destination: request.destination })
  // network-only: a SW nem avatkozik be (a böngésző szokásos hálózati kérése, a meglévő hibakezeléssel).
  if (strategy === 'network-only') return
  event.respondWith(strategy === 'cache-first' ? cacheFirst(request) : networkFirst(request))
})

interface Progress { done: number; total: number; bytesDone: number; bytesTotal: number; failed: number }

/** Fájlok letöltése tárba (a már friss példányt kihagyja), korlátozott párhuzamossággal, haladásjelzéssel. */
async function precache(files: OfflineFile[], parallel: number, httpCache: RequestCache, onProgress?: (progress: Progress) => void) {
  const progress: Progress = { done: 0, total: files.length, bytesDone: 0, bytesTotal: files.reduce((sum, file) => sum + file.size, 0), failed: 0 }
  let next = 0
  const worker = async () => {
    while (next < files.length) {
      const file = files[next++]
      try {
        if (!(await freshMatch(file.url))) {
          const response = await fetch(file.url, { cache: httpCache })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          await store(cacheFor(file.url), file.url, response, file.rev)
        }
      } catch { progress.failed += 1 }
      progress.done += 1
      progress.bytesDone += file.size
      onProgress?.({ ...progress })
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallel, files.length) }, worker))
  return progress
}

async function offlineStatus() {
  const files = [...MANIFEST.build, ...MANIFEST.assets]
  let cached = 0
  let bytes = 0
  for (const file of files) if (await freshMatch(file.url)) { cached += 1; bytes += file.size }
  return { version: MANIFEST.version, cached, total: files.length, bytes, bytesTotal: files.reduce((sum, file) => sum + file.size, 0) }
}

sw.addEventListener('message', (event) => {
  const data = event.data as { type?: string; urls?: string[] } | null
  const port = event.ports[0]
  if (!data?.type) return
  if (data.type === 'SKIP_WAITING') { void sw.skipWaiting(); return }
  if (data.type === 'STATUS') { event.waitUntil(offlineStatus().then((status) => port?.postMessage({ type: 'STATUS', status }))); return }
  if (data.type === 'PRECACHE_ALL') {
    const files = [...MANIFEST.build, ...MANIFEST.assets]
    event.waitUntil(precache(files, 3, 'no-cache', (progress) => port?.postMessage({ type: 'PROGRESS', progress })).then((progress) => port?.postMessage({ type: 'DONE', progress })))
    return
  }
  if (data.type === 'CACHE_URLS' && Array.isArray(data.urls)) {
    // Az első betöltés már letöltött fájljai (a SW átvétele előtt): a böngésző HTTP-tárából gyorsan a SW-tárba kerülnek.
    const files = data.urls
      .map((url) => { try { return new URL(url, ORIGIN) } catch { return null } })
      .filter((url): url is URL => !!url && url.origin === ORIGIN && swStrategy({ url: url.href, origin: ORIGIN }) === 'cache-first')
      .map((url) => ({ url: url.pathname, rev: revByUrl.get(url.pathname) ?? '', size: 0 }))
    event.waitUntil(precache(files, 4, 'default'))
  }
})
