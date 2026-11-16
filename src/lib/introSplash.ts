// Nyitó animáció (Lamelix logó – örvény, 9:16) a telepített webapp indításakor, mobilon és tableten, amíg a háttérben
// betölt a 3D konfigurátor. Tiszta döntési modul: a src/intro/boot.ts használja (a build az index.html-be ágyazza),
// a tests/introSplash.test.ts ellenőrzi.
import { isAppPath } from './swRoutes'

export const INTRO_SRC = '/assets/intro/lamelix-intro.mp4'
/** A munkameneten belül csak egyszer (pl. a „Frissítés” utáni újratöltésnél már nem). */
export const INTRO_SESSION_KEY = 'lamelix-intro-played'
/** A videó vége után legfeljebb ennyit várunk a 3D jelenetre (az utolsó, logós képkockán állva), utána mindenképp eltűnik. */
export const INTRO_MAX_HOLD_MS = 6000
/** Ha a videó ennyi idő alatt sem indul el (pl. iOS energiatakarékos mód tiltja), a nyitókép azonnal eltűnik. */
export const INTRO_START_TIMEOUT_MS = 2500

export interface IntroEnvironment {
  pathname: string
  search: string
  /** Kezdőképernyőről (telepített appként) fut: display-mode standalone / fullscreen, vagy iOS navigator.standalone. */
  standalone: boolean
  /** Érintőképernyős mobil vagy tablet (durva mutató). */
  touch: boolean
  reducedMotion: boolean
  /** Ebben a munkamenetben már lejátszottuk. */
  playedThisSession: boolean
}

/** ?intro=1 kényszeríti (bemutatóhoz, próbához böngészőben is), ?intro=0 tiltja. */
export function introParam(search: string): boolean | null {
  const value = new URLSearchParams(search).get('intro')
  if (value === null) return null
  return !/^(0|false|ki|off|nem)$/i.test(value)
}

export function shouldPlayIntro(env: IntroEnvironment): boolean {
  if (!isAppPath(env.pathname)) return false
  const param = introParam(env.search)
  if (param !== null) return param
  if (env.reducedMotion || env.playedThisSession) return false
  return env.standalone && env.touch
}

/** Mikor tűnhet el: a videó véget ért (vagy kihagyták) ÉS a 3D kész, vagy a vég óta letelt a várakozási idő. */
export function introCanClose(state: { ended: boolean; skipped: boolean; sceneReady: boolean; msSinceEnd: number }) {
  if (state.skipped) return true
  if (!state.ended) return false
  return state.sceneReady || state.msSinceEnd >= INTRO_MAX_HOLD_MS
}
