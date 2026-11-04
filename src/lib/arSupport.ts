// Melyik AR-út indítható ezen az eszközön? iOS: AR Quick Look (USDZ), Android: WebXR (ARCore-képes Chrome),
// asztali gép: QR-kód a telefonhoz. Ha az eszköz nem tud AR-t, nem ígérünk AR-t (a gomb el is rejthető).

export type ArPath = 'quick-look' | 'webxr' | 'ios-unsupported' | 'android-unsupported' | 'desktop'

export interface ArEnvironment {
  userAgent: string
  platform?: string
  maxTouchPoints?: number
  quickLook: boolean
  webxr: boolean
}

/** iPadOS 13+ asztali (Mac) user agentet küld; az érintőpontok száma különbözteti meg. */
export const isIos = (env: Pick<ArEnvironment, 'userAgent' | 'platform' | 'maxTouchPoints'>) =>
  /iPhone|iPad|iPod/i.test(env.userAgent) || (/Mac/i.test(env.platform ?? '') && (env.maxTouchPoints ?? 0) > 1)
export const isAndroid = (env: Pick<ArEnvironment, 'userAgent'>) => /Android/i.test(env.userAgent)
/** Közösségi appok beépített böngészője (Facebook, Instagram, Messenger, TikTok, LinkedIn, Android WebView): itt az AR szinte sosem indul. */
export const isInAppBrowser = (userAgent: string) => /FBAN|FBAV|FB_IAB|Instagram|Messenger|TikTok|musical_ly|LinkedInApp|Line\/|; wv\)/i.test(userAgent)

export function resolveArPath(env: ArEnvironment): ArPath {
  if (isIos(env)) return env.quickLook ? 'quick-look' : 'ios-unsupported'
  if (isAndroid(env)) return env.webxr ? 'webxr' : 'android-unsupported'
  return 'desktop'
}

let detected: Promise<ArPath> | null = null
/** Egyszeri, gyorsítótárazott felismerés a böngészőben. */
export function detectArPath(): Promise<ArPath> {
  if (detected) return detected
  detected = (async () => {
    let quickLook = false
    let webxr = false
    try { quickLook = Boolean(document.createElement('a').relList?.supports?.('ar')) } catch { /* régi böngésző */ }
    try {
      const xr = (navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr
      webxr = Boolean(xr && await Promise.race([xr.isSessionSupported('immersive-ar'), new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 2500))]))
    } catch { /* nincs WebXR */ }
    return resolveArPath({ userAgent: navigator.userAgent, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints, quickLook, webxr })
  })()
  return detected
}

/** Rövid, eszközhöz illő útmutató, ha az AR nem indítható. */
export function unsupportedHint(path: ArPath, userAgent: string): string {
  if (isInAppBrowser(userAgent)) return 'Ebben az alkalmazáson belüli böngészőben az AR nem indul el. Nyisd meg a linket a telefon saját böngészőjében (iPhone: Safari, Android: Chrome) — a „…” menüben: „Megnyitás böngészőben”.'
  if (path === 'ios-unsupported') return 'Ezen az iPhone-on / iPaden a böngésző nem engedi az AR-t. Nyisd meg a linket Safariban (iOS 13 vagy újabb).'
  if (path === 'android-unsupported') return 'Ezen a telefonon az AR nem indítható. Androidon a Google Chrome és az ARCore („Google Play-szolgáltatások AR-hez”) szükséges — régebbi vagy belépő kategóriás telefonokon ez nem érhető el.'
  return ''
}
