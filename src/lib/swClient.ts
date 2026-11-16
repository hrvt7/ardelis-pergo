import { isAppPath } from './swRoutes'

export { isAppPath }
// A service worker regisztrációja és a vele való üzenetváltás (frissítés, offline letöltés, állapot).
// A regisztráció csak éles buildben, biztonságos kapcsolaton (https; helyi próbához localhost) és nem az előnézeti
// (artifact) buildben történik.

export interface SwEnvironment { prod: boolean; mode: string; router?: string; protocol: string; hostname: string; supported: boolean; pathname?: string }


/** Tiszta döntés (tesztelhető): kell-e SW-t regisztrálni ebben a környezetben. */
export function shouldRegisterSw(env: SwEnvironment) {
  if (!env.prod || !env.supported) return false
  if (env.mode === 'artifact' || env.router === 'memory') return false
  if (env.pathname !== undefined && !isAppPath(env.pathname)) return false
  if (env.protocol === 'https:') return true
  // A localhost a böngészőkben biztonságos környezet: a vite preview-n futó böngészős próbához.
  return env.protocol === 'http:' && (env.hostname === 'localhost' || env.hostname === '127.0.0.1')
}

export interface OfflineProgress { done: number; total: number; bytesDone: number; bytesTotal: number; failed: number }
export interface OfflineStatus { version: string; cached: number; total: number; bytes: number; bytesTotal: number }

type UpdateListener = (waiting: ServiceWorker | null) => void
let waitingWorker: ServiceWorker | null = null
const updateListeners = new Set<UpdateListener>()
const announce = (worker: ServiceWorker | null) => { waitingWorker = worker; updateListeners.forEach((listener) => listener(worker)) }

/** Feliratkozás az „új verzió elérhető” állapotra (a várakozó SW-re). */
export function onSwUpdate(listener: UpdateListener) {
  updateListeners.add(listener)
  listener(waitingWorker)
  return () => { updateListeners.delete(listener) }
}

/** A várakozó új verzió átvétele: a SW aktiválódik, az oldal egyszer újratölt. Csak a felhasználó kérésére hívjuk. */
export function applySwUpdate() {
  if (!waitingWorker) return
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; window.location.reload() } })
  waitingWorker.postMessage({ type: 'SKIP_WAITING' })
}

/** Az első betöltés már letöltött fájljait (még a SW átvétele előtt kérve) átadjuk a SW-nek, hogy tárba tegye őket. */
function warmCache(worker: ServiceWorker) {
  try {
    const urls = performance.getEntriesByType('resource').map((entry) => entry.name).filter((url) => url.startsWith(window.location.origin))
    if (urls.length) worker.postMessage({ type: 'CACHE_URLS', urls })
  } catch { /* nem elérhető: a fájlok a következő használatkor kerülnek tárba */ }
}

/** A build adatait a hívó (main.tsx) adja át: így a modul a Node-os tesztekben is betölthető. */
export function registerServiceWorker(build: { prod: boolean; mode: string; router?: string }) {
  const env: SwEnvironment = {
    ...build,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    supported: 'serviceWorker' in navigator,
  }
  if (!shouldRegisterSw(env)) return
  const start = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
      // Már futó munkamenet mellett érkező új verzió: nem vált át magától, csak jelzi (a felhasználó dönt).
      const track = (worker: ServiceWorker | null) => {
        if (!worker) return
        worker.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(worker) })
      }
      if (registration.waiting && navigator.serviceWorker.controller) announce(registration.waiting)
      track(registration.installing)
      registration.addEventListener('updatefound', () => track(registration.installing))
      void navigator.serviceWorker.ready.then((ready) => { if (ready.active) warmCache(ready.active) })
      // Hosszan nyitva hagyott bemutató eszköz: óránként rákérdez az új verzióra.
      window.setInterval(() => { void registration.update().catch(() => undefined) }, 60 * 60 * 1000)
    }).catch(() => undefined)
  }
  // A regisztráció az oldal betöltése után indul, hogy ne versenyezzen az első megjelenítéssel.
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}

async function activeWorker() {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration()
  return registration?.active ?? null
}

/** Az offline letöltés elérhető-e (van aktív SW). */
export async function offlineSupported() { return (await activeWorker()) !== null }

export async function readOfflineStatus(): Promise<OfflineStatus | null> {
  const worker = await activeWorker()
  if (!worker) return null
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const timer = window.setTimeout(() => resolve(null), 8000)
    channel.port1.onmessage = (event) => { window.clearTimeout(timer); resolve((event.data as { status: OfflineStatus }).status) }
    worker.postMessage({ type: 'STATUS' }, [channel.port2])
  })
}

/** Az összes jelenet-eszköz és build-fájl letöltése a SW tárába; a haladást a visszahívás kapja. */
export async function downloadOffline(onProgress: (progress: OfflineProgress) => void): Promise<OfflineProgress> {
  const worker = await activeWorker()
  if (!worker) throw new Error('A service worker nem aktív')
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = (event) => {
      const data = event.data as { type: 'PROGRESS' | 'DONE'; progress: OfflineProgress }
      onProgress(data.progress)
      if (data.type === 'DONE') resolve(data.progress)
    }
    worker.postMessage({ type: 'PRECACHE_ALL' }, [channel.port2])
  })
}
