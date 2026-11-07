import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Hand, Maximize2, X } from 'lucide-react'

interface Labels { title: string; activate: string; release: string; fallback: string; fullscreen: string }

/**
 * Önálló működésbemutató (külön HTML) izolált keretben.
 * - Csak akkor tölt, ha a látogató közel görgetett (nem terheli a nyitóoldalt), és nagy távolságban fel is szabadítja a GPU-t.
 * - Alapból nem fogja el a görgetést: kattintásra kapcsol interaktívra, a gombbal vagy az egér kilépésekor vissza.
 */
export default function SimFrame({ src, labels }: { src: string; labels: Labels }) {
  const box = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  const [active, setActive] = useState(false)
  useEffect(() => {
    const element = box.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => { setNear(entry.isIntersecting); if (!entry.isIntersecting) setActive(false) }, { rootMargin: '60% 0px 60% 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <div className={`pf-sim${active ? ' is-active' : ''}`} ref={box} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setActive(false) }}>
    {near ? <iframe src={src} title={labels.title} loading="lazy" allow="fullscreen" referrerPolicy="no-referrer" /> : <div className="pf-sim-ph" aria-hidden="true" />}
    {!active && <button type="button" className="pf-sim-gate" onClick={() => setActive(true)} aria-label={labels.activate}><span><Hand size={16} />{labels.activate}</span></button>}
    {active && <button type="button" className="pf-sim-release" onClick={() => setActive(false)}><X size={14} />{labels.release}</button>}
    {typeof document !== 'undefined' && document.fullscreenEnabled && <button type="button" className="pf-sim-fs" onClick={() => { void box.current?.requestFullscreen?.().then(() => setActive(true)).catch(() => undefined) }}><Maximize2 size={13} />{labels.fullscreen}</button>}
    <a className="pf-sim-open" href={src} target="_blank" rel="noopener"><ExternalLink size={13} />{labels.fallback}</a>
  </div>
}
