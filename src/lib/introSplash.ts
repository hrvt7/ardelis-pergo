// Nyitó animáció (Lamelix logó – örvény, 9:16) a telepített webapp indításakor, mobilon és tableten, amíg a háttérben
// betölt a 3D konfigurátor. Tiszta döntési modul: a src/intro/boot.ts használja (a build az index.html-be ágyazza),
// a tests/introSplash.test.ts ellenőrzi.
import { isAppPath } from './swRoutes'

export const INTRO_SRC = '/assets/intro/lamelix-intro.mp4'
/** A logó + „lamelix” felirat zárókockája (mp): ezt mutatjuk állóképként, ha az automatikus lejátszás tiltott. */
export const INTRO_LOGO_FRAME_S = 8.6
/** A munkameneten belül csak egyszer (pl. a „Frissítés” utáni újratöltésnél már nem). */
export const INTRO_SESSION_KEY = 'lamelix-intro-played'
/** A videó vége után legfeljebb ennyit várunk a 3D jelenetre (az utolsó, logós képkockán állva), utána mindenképp eltűnik. */
export const INTRO_MAX_HOLD_MS = 6000
/**
 * Ha a videó ennyi idő alatt sem indul el (és nem is a lejátszásra várunk koppintással), a nyitókép eltűnik.
 * Lassú wifin az első indításkor a 2,8 MB-os videó lassan érkezik: ennyit adunk neki, de a 3D-t nem tartjuk vissza vele.
 */
export const INTRO_START_TIMEOUT_MS = 12000

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

/** Végső biztosíték: ha a lejátszás elakad (megszakadt hálózat), ennyi után mindenképp eltűnik (9 mp-es videó + tartalék). */
export const INTRO_HARD_CAP_MS = 22000

export interface IntroState {
  /** A videó ténylegesen fut (playing vagy előrehaladó lejátszási idő). */
  started: boolean
  ended: boolean
  /** Az automatikus lejátszást a rendszer tiltja (pl. iOS energiatakarékos mód): koppintásra indítható. */
  blocked: boolean
  sceneReady: boolean
  msSinceOpen: number
  msSinceEnd: number
}

/**
 * Mikor tűnhet el a nyitókép:
 * - lejátszás közben nem (végigfut, akkor is, ha a 3D már kész), csak ha elakad: INTRO_HARD_CAP_MS után;
 * - a vége után, ha a 3D kész, különben legfeljebb INTRO_MAX_HOLD_MS-ig áll a logós zárókockán;
 * - ha még nem indult el (lassú betöltés vagy tiltott automatikus lejátszás, ilyenkor a logós zárókocka áll): amint
 *   a 3D kész, mert a konfigurátort nem tartjuk vissza egy állóképpel; különben legkésőbb INTRO_START_TIMEOUT_MS után.
 */
export function introCanClose(state: IntroState) {
  if (state.msSinceOpen >= INTRO_HARD_CAP_MS) return true
  if (state.ended) return state.sceneReady || state.msSinceEnd >= INTRO_MAX_HOLD_MS
  if (state.started) return false
  return state.sceneReady || state.msSinceOpen >= INTRO_START_TIMEOUT_MS
}
