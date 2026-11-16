// Nyitó animáció indítója. A build (vite.config.ts → introInline) esbuild-del az index.html <body> elejére ágyazza
// inline szkriptként, így a videó már az alkalmazás JavaScriptjének letöltése ELŐTT elindul; közben a háttérben
// betölt a 3D konfigurátor. Eltűnik, ha a videó véget ért és a 3D kész (vagy a vég után legfeljebb 6 mp-cel),
// koppintásra kihagyható. Ha a videó nem indul el (pl. iOS energiatakarékos mód), azonnal eltűnik.
import { INTRO_SESSION_KEY, INTRO_SRC, INTRO_START_TIMEOUT_MS, introCanClose, shouldPlayIntro } from '../lib/introSplash'

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
  root.append(video, skip)
  document.body.prepend(root)
  document.documentElement.style.overflow = 'hidden'

  const state = { ended: false, skipped: false, endedAt: 0, started: false, closed: false }
  let timer = 0
  const close = () => {
    if (state.closed) return
    state.closed = true
    window.clearInterval(timer)
    root.style.opacity = '0'
    document.documentElement.style.overflow = ''
    window.setTimeout(() => { video.pause(); video.removeAttribute('src'); video.load(); root.remove() }, 480)
  }
  const sceneReady = () => !!document.querySelector('.scene-canvas-wrap[data-scene-ready="true"]')
  const check = () => {
    if (introCanClose({ ended: state.ended, skipped: state.skipped, sceneReady: sceneReady(), msSinceEnd: state.ended ? Date.now() - state.endedAt : 0 })) close()
  }
  video.addEventListener('playing', () => { state.started = true })
  video.addEventListener('ended', () => { state.ended = true; state.endedAt = Date.now(); check() })
  video.addEventListener('error', close)
  root.addEventListener('click', () => { state.skipped = true; check() })
  timer = window.setInterval(check, 150)
  window.setTimeout(() => { if (!state.started) close() }, INTRO_START_TIMEOUT_MS)
  const attempt = video.play()
  if (attempt && typeof attempt.catch === 'function') attempt.catch(close)
}

try { boot() } catch { /* a nyitókép soha nem akadályozhatja az alkalmazás indulását */ }
