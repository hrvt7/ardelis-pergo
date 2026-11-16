// Nyitó animáció indítója. A build (vite.config.ts → introInline) esbuild-del az index.html <body> elejére ágyazza
// inline szkriptként, így a videó már az alkalmazás JavaScriptjének letöltése ELŐTT elindul; közben a háttérben
// betölt a 3D konfigurátor. Teljes képernyős, gomb és kihagyás nélkül végigfut; eltűnik, ha a videó véget ért és a
// 3D kész (vagy a vég után legfeljebb 6 mp-cel). Ha a rendszer tiltja az automatikus lejátszást (pl. iOS
// energiatakarékos mód, „Videók automatikus lejátszása” ki), ugyanez az animáció animált AVIF képként fut le – a
// képekre a tiltás nem vonatkozik, és az iOS saját play-jele sem jelenik meg.
import { INTRO_ANIM_SRC, INTRO_DURATION_MS, INTRO_LOGO_SRC, INTRO_SESSION_KEY, INTRO_SRC, introCanClose, shouldPlayIntro } from '../lib/introSplash'

const media = (query: string) => typeof matchMedia === 'function' && matchMedia(query).matches

function boot() {
  let played = false
  try { played = sessionStorage.getItem(INTRO_SESSION_KEY) === '1' } catch { /* privát mód */ }
  const play = shouldPlayIntro({
    pathname: location.pathname,
    search: location.search,
    standalone: media('(display-mode: standalone)') || media('(display-mode: fullscreen)') || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    touch: media('(pointer: coarse)') || (navigator.maxTouchPoints ?? 0) > 1,
    reducedMotion: media('(prefers-reduced-motion: reduce)'),
    playedThisSession: played,
  })
  if (!play) return
  try { sessionStorage.setItem(INTRO_SESSION_KEY, '1') } catch { /* privát mód */ }

  const root = document.createElement('div')
  root.id = 'lamelix-intro'
  root.setAttribute('role', 'presentation')
  root.setAttribute('aria-hidden', 'true')
  // Teljes képernyő: a 9:16 videó kitölti a kijelzőt (fekvő tableten a középső, logós sáv látszik).
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#010503;opacity:1;transition:opacity .45s ease;touch-action:none;overflow:hidden'
  const video = document.createElement('video')
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.autoplay = true
  video.preload = 'auto'
  video.controls = false
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.disablePictureInPicture = true
  video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none'
  video.src = INTRO_SRC
  // Az iOS natív „lejátszás” jele (tiltott automatikus lejátszásnál) soha ne látsszon a nyitóképen.
  const style = document.createElement('style')
  style.textContent = '#lamelix-intro video::-webkit-media-controls,#lamelix-intro video::-webkit-media-controls-start-playback-button,#lamelix-intro video::-webkit-media-controls-overlay-play-button{display:none!important;-webkit-appearance:none!important;opacity:0!important}'
  root.append(style, video)
  // Az érintés nem jut át a félig betöltött konfigurátorra, és nem is zárja be a nyitóképet.
  for (const type of ['click', 'touchstart', 'touchmove', 'pointerdown', 'wheel']) root.addEventListener(type, (event) => { event.preventDefault(); event.stopPropagation() }, { passive: false })
  document.body.prepend(root)
  document.documentElement.style.overflow = 'hidden'

  const openedAt = Date.now()
  const state = { started: false, ended: false, blocked: false, endedAt: 0, closed: false }
  let timer = 0
  const close = () => {
    if (state.closed) return
    state.closed = true
    window.clearInterval(timer)
    root.style.opacity = '0'
    root.style.pointerEvents = 'none'
    document.documentElement.style.overflow = ''
    window.setTimeout(() => { video.pause(); video.removeAttribute('src'); video.load(); root.remove() }, 480)
  }
  const sceneReady = () => !!document.querySelector('.scene-canvas-wrap[data-scene-ready="true"]')
  const check = () => {
    if (state.closed) return
    const now = Date.now()
    if (introCanClose({ ...state, sceneReady: sceneReady(), msSinceOpen: now - openedAt, msSinceEnd: state.ended ? now - state.endedAt : 0 })) close()
  }
  const markStarted = () => { if (!state.started && !video.paused) { state.started = true; state.blocked = false } }
  const fill = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none'
  const still = (src: string) => { const img = document.createElement('img'); img.alt = ''; img.decoding = 'async'; img.style.cssText = fill; img.src = src; return img }
  // Tiltott automatikus lejátszás: a videó helyett ugyanez az animáció animált képként (gomb nélkül, magától fut).
  // Amíg betölt, a logós állókép látszik; ha a 3D addig elkészül, nem tartjuk vissza.
  const playAnimatedFallback = () => {
    if (state.started || state.closed) return
    state.blocked = true
    video.style.display = 'none'
    const logo = still(INTRO_LOGO_SRC)
    root.append(logo)
    const anim = still(INTRO_ANIM_SRC)
    anim.addEventListener('load', () => {
      if (state.closed) return
      state.blocked = false
      state.started = true
      root.append(anim)
      // A vége: a logós állókép marad (a WebKit az animált képet újraindítaná), és a szokásos zárás jön.
      window.setTimeout(() => { anim.remove(); state.ended = true; state.endedAt = Date.now(); check() }, INTRO_DURATION_MS - 150)
    }, { once: true })
  }
  video.addEventListener('playing', markStarted)
  video.addEventListener('timeupdate', () => { if (video.currentTime > 0 && !state.blocked) markStarted() })
  video.addEventListener('ended', () => { state.ended = true; state.endedAt = Date.now(); check() })
  // Valódi betöltési hiba (pl. a fájl nem érhető el): nincs mit mutatni, a konfigurátor jön.
  video.addEventListener('error', () => { if (!state.blocked) close() })
  timer = window.setInterval(check, 150)
  const attempt = video.play()
  if (attempt && typeof attempt.then === 'function') attempt.then(markStarted, playAnimatedFallback)
}

try { boot() } catch { /* a nyitókép soha nem akadályozhatja az alkalmazás indulását */ }
