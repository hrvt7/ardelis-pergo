// A bejárás kezelőfelülete a 3D kép fölött: kilépés, joystick (érintőképernyőn) és egyszeri, rövid súgó.
// Diszkrét, prémium bemutatóhoz illő: nincs célkereszt, nincs játékos HUD.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Footprints, X } from 'lucide-react'
import { EYE_HEIGHT } from '@/lib/walkArea'
import { setStick } from '@/lib/walkInput'

const HINT_KEY = 'pergo-walk-hint'
const STICK_RADIUS = 46

function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState<[number, number]>([0, 0])
  const pointer = useRef<number | null>(null)
  const update = (event: ReactPointerEvent) => {
    const rect = base.current?.getBoundingClientRect()
    if (!rect) return
    let dx = event.clientX - (rect.left + rect.width / 2)
    let dy = event.clientY - (rect.top + rect.height / 2)
    const length = Math.hypot(dx, dy)
    if (length > STICK_RADIUS) { dx *= STICK_RADIUS / length; dy *= STICK_RADIUS / length }
    setKnob([dx, dy])
    setStick(dx / STICK_RADIUS, -dy / STICK_RADIUS)
  }
  const release = () => { pointer.current = null; setKnob([0, 0]); setStick(0, 0) }
  useEffect(() => () => setStick(0, 0), [])
  return <div ref={base} className="walk-stick" role="application" aria-label="Séta: húzd a kívánt irányba"
    onPointerDown={(event) => { pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); update(event) }}
    onPointerMove={(event) => { if (event.pointerId === pointer.current) update(event) }}
    onPointerUp={release} onPointerCancel={release}>
    <span className="walk-stick-knob" style={{ transform: `translate(${knob[0]}px, ${knob[1]}px)` }} />
  </div>
}

export default function WalkOverlay({ onExit, touch, roofBlocked }: { onExit: () => void; touch: boolean; roofBlocked: boolean }) {
  const [hint, setHint] = useState(() => { try { return localStorage.getItem(HINT_KEY) !== '1' } catch { return true } })
  useEffect(() => {
    if (!hint) return
    const done = () => { setHint(false); try { localStorage.setItem(HINT_KEY, '1') } catch { /* privát mód */ } }
    const timer = window.setTimeout(done, 7000)
    window.addEventListener('pointerdown', done, { once: true })
    window.addEventListener('keydown', done, { once: true })
    return () => { window.clearTimeout(timer); window.removeEventListener('pointerdown', done); window.removeEventListener('keydown', done) }
  }, [hint])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onExit() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])
  return <>
    <div className="walk-badge" role="status"><Footprints size={15} aria-hidden="true" /><span>Bejárás · {Math.round(EYE_HEIGHT * 100)} cm szemmagasság</span></div>
    <button type="button" className="walk-exit" onClick={onExit}><X size={16} aria-hidden="true" />Kilépés a bejárásból</button>
    {touch && <Joystick />}
    {roofBlocked && <div className="walk-note" role="status">A pergola belmagassága kisebb a szemmagasságnál, ezért a tető alá nem lehet besétálni.</div>}
    {hint && <div className="walk-hint" role="status">
      <strong>Így járhatod be</strong>
      <span>{touch ? 'Húzd a képet: körbenézel · Bal alsó kör: sétálsz' : 'Húzd a képet: körbenézel · W A S D vagy nyilak: sétálsz'}</span>
      <span>Kilépés: jobb felső gomb{touch ? '' : ' vagy Esc'}</span>
    </div>}
  </>
}
