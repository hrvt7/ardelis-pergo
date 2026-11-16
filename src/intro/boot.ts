// Nyitó animáció indítója. A build (vite.config.ts → introInline) esbuild-del az index.html <body> elejére ágyazza
// inline szkriptként, így a videó már az alkalmazás JavaScriptjének letöltése ELŐTT elindul; közben a háttérben
// betölt a 3D konfigurátor. Eltűnik, ha a videó véget ért és a 3D kész (vagy a vég után legfeljebb 6 mp-cel),
// a „Kihagyás” gombbal azonnal. Ha a rendszer tiltja az automatikus lejátszást (pl. iOS energiatakarékos mód),
// a videó első képkockáján „Lejátszás” gomb jelenik meg; koppintás nélkül a nyitókép a 3D elkészültekor eltűnik.
import { INTRO_SESSION_KEY, INTRO_SRC, introCanClose, shouldPlayIntro } from '../lib/introSplash'

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
  // Fekvő, nagyon széles kijelzőn (fekvő telefon) a teljes 9:16 kép látszik, egyébként kitölti a képernyőt.
  const fit = media('(min-aspect-ratio: 19/10)') ? 'contain' : 'cover'
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#010503;display:flex;align-items:center;justify-content:center;opacity:1;transition:opacity .45s ease;touch-action:none;cursor:pointer'
  const video = document.createElement('video')
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.autoplay = true
  video.preload = 'auto'
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.setAttribute('aria-hidden', 'true')
  video.disablePictureInPicture = true
  video.style.cssText = `width:100%;height:100%;object-fit:${fit};pointer-events:none`
  video.src = INTRO_SRC
  const skip = document.createElement('button')
  skip.type = 'button'
  skip.textContent = 'Kihagyás'
  skip.setAttribute('aria-label', 'Nyitó animáció kihagyása')
  skip.style.cssText = 'position:absolute;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));min-height:40px;padding:0 16px;border:1px solid rgba(216,255,114,.35);border-radius:999px;background:rgba(1,5,3,.55);color:#d8e6cf;font:500 14px/1 system-ui,-apple-system,sans-serif;letter-spacing:.02em'
  const playButton = document.createElement('button')
  playButton.type = 'button'
  playButton.textContent = '▶  Lejátszás'
  playButton.setAttribute('aria-label', 'Nyitó animáció lejátszása')
  playButton.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;min-height:52px;padding:0 26px;border:1px solid rgba(216,255,114,.6);border-radius:999px;background:rgba(1,5,3,.6);color:#e8f5d8;font:600 17px/1 system-ui,-apple-system,sans-serif;letter-spacing:.02em;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)'
  root.append(video, playButton, skip)
  document.body.prepend(root)
  document.documentElement.style.overflow = 'hidden'

  const openedAt = Date.now()
  const state = { started: false, ended: false, skipped: false, blocked: false, endedAt: 0, closed: false }
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
  const markStarted = () => { if (!state.started && !video.paused) { state.started = true; state.blocked = false; playButton.style.display = 'none' } }
  const showBlocked = () => { if (state.started || state.closed) return; state.blocked = true; playButton.style.display = 'block' }
  const tryPlay = () => {
    const attempt = video.play()
    // A tiltott automatikus lejátszás nem hiba: az első képkocka marad, koppintásra indul.
    if (attempt && typeof attempt.catch === 'function') attempt.then(markStarted, showBlocked)
  }
  video.addEventListener('playing', markStarted)
  video.addEventListener('timeupdate', () => { if (video.currentTime > 0) markStarted() })
  video.addEventListener('ended', () => { state.ended = true; state.endedAt = Date.now(); check() })
  // Valódi betöltési hiba (pl. a fájl nem érhető el): nincs mit mutatni, a konfigurátor jön.
  video.addEventListener('error', close)
  skip.addEventListener('click', (event) => { event.stopPropagation(); state.skipped = true; check() })
  playButton.addEventListener('click', (event) => { event.stopPropagation(); playButton.style.display = 'none'; tryPlay() })
  // A videóra koppintás: ha áll (tiltott automatikus lejátszás), elindítja; lejátszás közben nem csinál semmit
  // (véletlen érintés ne zárja be; bezárni a „Kihagyás” gombbal lehet).
  root.addEventListener('click', () => { if (!state.started) { playButton.style.display = 'none'; tryPlay() } })
  timer = window.setInterval(check, 150)
  tryPlay()
}

try { boot() } catch { /* a nyitókép soha nem akadályozhatja az alkalmazás indulását */ }
