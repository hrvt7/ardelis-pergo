// Nyitó animáció indítója. A build (vite.config.ts → introInline) esbuild-del az index.html <body> elejére ágyazza
// inline szkriptként, így a videó már az alkalmazás JavaScriptjének letöltése ELŐTT elindul; közben a háttérben
// betölt a 3D konfigurátor. Teljes képernyős, gomb és kihagyás nélkül végigfut; eltűnik, ha a videó véget ért és a
// 3D kész (vagy a vég után legfeljebb 6 mp-cel). Ha a rendszer tiltja az automatikus lejátszást (pl. iOS
// energiatakarékos mód, „Videók automatikus lejátszása” ki), ugyanez a videó a hardveres dekóderrel (WebCodecs)
// vászonra rajzolva fut le – erre a tiltás nem vonatkozik, és nem szaggat; ha ez sem elérhető, animált AVIF kép.
// Az iOS saját play-jele egyik esetben sem jelenik meg.
import { playWithDecoder } from './decoderPlayer'
import { INTRO_ANIM_SRC, INTRO_DONE_EVENT, INTRO_INDEX_SRC, INTRO_DURATION_MS, INTRO_FLAG, INTRO_LOGO_SRC, INTRO_RELEASE_IF_NOT_STARTED_MS, INTRO_SESSION_KEY, INTRO_SRC, introCanClose, shouldPlayIntro } from '../lib/introSplash'

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
  // Amíg az animáció fut, a 3D jelenet nem épül fel (különben szaggatna); a végén szabad az út (src/lib/introGate.ts).
  document.documentElement.dataset[INTRO_FLAG] = 'playing'
  let released = false
  const releaseScene = () => {
    if (released) return
    released = true
    document.documentElement.dataset[INTRO_FLAG] = 'done'
    window.dispatchEvent(new Event(INTRO_DONE_EVENT))
  }

  const openedAt = Date.now()
  const state = { started: false, ended: false, blocked: false, endedAt: 0, closed: false }
  let timer = 0
  const close = () => {
    if (state.closed) return
    state.closed = true
    releaseScene()
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
    // Ha az animáció néhány mp alatt sem indult el (lassú hálózat), a 3D ne várjon rá: épüljön a nyitókép mögött.
    if (!state.started && now - openedAt >= INTRO_RELEASE_IF_NOT_STARTED_MS) releaseScene()
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
    const logo = still(INTRO_LOGO_SRC)
    root.append(logo)
    const anim = still(INTRO_ANIM_SRC)
    anim.addEventListener('load', () => {
      if (state.closed) return
      state.blocked = false
      state.started = true
      root.append(anim)
      // A vége: a logós állókép marad (a WebKit az animált képet újraindítaná), és a szokásos zárás jön.
      const finish = () => { anim.remove(); state.ended = true; state.endedAt = Date.now(); releaseScene(); check() }
      window.setTimeout(finish, INTRO_DURATION_MS - 100)
    }, { once: true })
    // Ha az animált kép sem tölthető be, a 3D a logós kép mögött épül fel.
    anim.addEventListener('error', releaseScene, { once: true })
  }
  // Tiltott automatikus lejátszás: 1. hardveres dekóder vászonra (sima, mint a videó), 2. animált kép.
  const playBlockedFallback = () => {
    if (state.started || state.closed) return
    state.blocked = true
    video.style.display = 'none'
    const canvas = document.createElement('canvas')
    canvas.style.cssText = fill
    root.append(canvas)
    const giveUp = () => { canvas.remove(); if (!state.closed && !state.started) playAnimatedFallback() }
    playWithDecoder(canvas, INTRO_SRC, INTRO_INDEX_SRC).then((playback) => {
      if (!playback) { giveUp(); return }
      if (state.closed) { playback.stop(); return }
      playback.started.then(() => {
        if (state.closed) { playback.stop(); return }
        state.blocked = false
        state.started = true
        playback.ended.then(() => { state.ended = true; state.endedAt = Date.now(); releaseScene(); check() })
      }, giveUp)
    }, giveUp)
  }
  video.addEventListener('playing', markStarted)
  video.addEventListener('timeupdate', () => { if (video.currentTime > 0 && !state.blocked) markStarted() })
  video.addEventListener('ended', () => { state.ended = true; state.endedAt = Date.now(); releaseScene(); check() })
  // Valódi betöltési hiba (pl. a fájl nem érhető el): nincs mit mutatni, a konfigurátor jön.
  video.addEventListener('error', () => { if (!state.blocked) close() })
  timer = window.setInterval(check, 150)
  const attempt = video.play()
  if (attempt && typeof attempt.then === 'function') attempt.then(markStarted, playBlockedFallback)
}

try { boot() } catch { /* a nyitókép soha nem akadályozhatja az alkalmazás indulását */ }
