import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Hand, Maximize2, X } from 'lucide-react'
import { assetUrl } from '@/lib/assetUrl'

interface Labels { title: string; activate: string; release: string; fallback: string; fullscreen: string }

/**
 * Önálló működésbemutató (külön HTML) izolált keretben.
 * - Csak szándékra tölt (4.66): addig a demóról készült álló kép látszik, így görgetés közben nem indul el egy nehéz
 *   WebGL-oldal (ez okozott akadást). Kattintásra töltődik és rögtön interaktív; messzire görgetve felszabadítja a GPU-t.
 * - Alapból nem fogja el a görgetést: kattintásra kapcsol interaktívra, a gombbal vagy az egér kilépésekor vissza.
 */
export default function SimFrame({ src, labels }: { src: string; labels: Labels }) {
  const box = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [active, setActive] = useState(false)
  const start = () => { setLoaded(true); setActive(true) }
  useEffect(() => {
    const element = box.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) { setLoaded(false); setActive(false) } }, { rootMargin: '60% 0px 60% 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <div className={`pf-sim${active ? ' is-active' : ''}`} ref={box} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setActive(false) }}>
    {loaded ? <iframe src={src} title={labels.title} allow="fullscreen" referrerPolicy="no-referrer" /> : <img className="pf-sim-ph" src={assetUrl('/assets/landing/sim-poster-800.webp')} srcSet={`${assetUrl('/assets/landing/sim-poster-800.webp')} 800w, ${assetUrl('/assets/landing/sim-poster.webp')} 1280w`} sizes="(max-width: 760px) 100vw, 1100px" alt="" aria-hidden="true" loading="lazy" decoding="async" />}
    {!active && <button type="button" className="pf-sim-gate" onClick={start} aria-label={labels.activate}><span><Hand size={16} />{labels.activate}</span></button>}
    {active && <button type="button" className="pf-sim-release" onClick={() => setActive(false)}><X size={14} />{labels.release}</button>}
    {typeof document !== 'undefined' && document.fullscreenEnabled && <button type="button" className="pf-sim-fs" onClick={() => { void box.current?.requestFullscreen?.().then(start).catch(() => undefined) }}><Maximize2 size={13} />{labels.fullscreen}</button>}
    <a className="pf-sim-open" href={src} target="_blank" rel="noopener"><ExternalLink size={13} />{labels.fallback}</a>
  </div>
}
