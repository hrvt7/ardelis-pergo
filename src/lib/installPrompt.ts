// Telepítési segítség: az Android/Chrome „beforeinstallprompt” eseményét az oldal indulásakor elkapjuk (csak egyszer jön),
// hogy a Nézet panel később felajánlhassa a telepítést. iPaden/iPhone-on ilyen esemény nincs: ott szöveges súgó.

interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function captureInstallPrompt() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallPromptEvent
    listeners.forEach((listener) => listener())
  })
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((listener) => listener()) })
}

export const canPromptInstall = () => deferred !== null
export function onInstallPromptChange(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }

/** A böngésző telepítési ablaka (csak felhasználói koppintásra hívható). */
export async function promptInstall() {
  const event = deferred
  if (!event) return false
  deferred = null
  await event.prompt()
  const choice = await event.userChoice.catch(() => ({ outcome: 'dismissed' as const }))
  listeners.forEach((listener) => listener())
  return choice.outcome === 'accepted'
}

/** Kezdőképernyőről (telepített appként) fut-e az oldal. */
export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  const media = (query: string) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  return media('(display-mode: standalone)') || media('(display-mode: fullscreen)') || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** iPad / iPhone (az iPadOS asztali Safarija „Macintosh”-nak mutatja magát, de érintős). */
export const isAppleMobile = (nav: { userAgent: string; maxTouchPoints?: number } = navigator) => /iPad|iPhone|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1)
