// Héró: balra a kinetikus cím, jobbra a valódi 3D lamellás tető pasztell shader-égen, körülötte a konfigurátor
// kódból újrarajzolt darabjai (lépéssáv, ár-dokk, színválasztó, lamellaszög, beérkező lead) három mélységi síkon.
// A lapok a kurzorra eltérő mértékben dőlnek; érintőn lassan lebegnek. A 3D tétlen időben töltődik.
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight, Check, Mail } from 'lucide-react'
import { COLOR_CATALOG } from '@/lib/colors'
import { formatMoney } from '@/lib/platformPricing'
import { useCopy } from '@/i18n/useCopy'
import { funnel } from '@/lib/funnel'
import { louvreAngle, type LouvreDrive } from '@/components/platform/louvreDrive'
import Odometer from './Odometer'
import { BUILD_PRICES } from './buildData'

const HeroLouvre = lazy(() => import('@/components/platform/HeroLouvre'))
const HERO_COLORS = (['RAL 7016', 'RAL 9016', 'FA DIÓ'] as const).map((code) => COLOR_CATALOG.find((color) => color.code === code)).filter((color): color is (typeof COLOR_CATALOG)[number] => !!color)
const COLOR_KEYS = ['anthracite', 'white', 'walnut'] as const

export default function Hero({ demoPath }: { demoPath: string }) {
  const { lang, c } = useCopy()
  const h = c.hero
  const v = c.v2.hero
  const stage = useRef<HTMLDivElement>(null)
  // A 3D vezérlése egy ref-ben (görgetés, kurzor, csúszka, szín): a jelenet újrarenderelés nélkül követi.
  const drive = useRef<LouvreDrive>({ progress: 0, px: 0, py: 0, manual: null, frame: HERO_COLORS[0]?.hex ?? '#373f43' })
  const angleOut = useRef<HTMLOutputElement>(null)
  const angleInput = useRef<HTMLInputElement>(null)
  const [scene3d, setScene3d] = useState(false)
  const [ready3d, setReady3d] = useState(false)
  const [compact, setCompact] = useState(false)
  const [frameHex, setFrameHex] = useState(HERO_COLORS[0]?.hex ?? '#373f43')
  const [step, setStep] = useState(() => (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 6 : 5))
  const used = useRef(false)
  const markUsed = () => { if (!used.current) { used.current = true; funnel('hero_3d_use') } }

  const showAngle = () => {
    const value = Math.round(louvreAngle(drive.current))
    if (angleOut.current) angleOut.current.textContent = `${value}°`
    if (angleInput.current && drive.current.manual == null) { angleInput.current.value = String(value); angleInput.current.setAttribute('aria-valuetext', `${value}°`) }
  }


  // A 3D jelenet tétlen időben indul; WebGL2 nélkül (vagy ?gl=0) a pasztell poszter marad.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const sync = () => setCompact(media.matches)
    sync()
    media.addEventListener('change', sync)
    let ok = false
    try { ok = !!document.createElement('canvas').getContext('webgl2') } catch { ok = false }
    const off = new URLSearchParams(window.location.search).get('gl') === '0'
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: object) => number }).requestIdleCallback
    let timer = 0
    if (ok && !off) { if (idle) idle(() => setScene3d(true), { timeout: 1500 }); else timer = window.setTimeout(() => setScene3d(true), 600) }
    return () => { media.removeEventListener('change', sync); window.clearTimeout(timer) }
  }, [])

  // A lépéssáv és az ár-dokk együtt lép végig a konfigurátor hét lépésén (valódi árakkal); a végén lead érkezik.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // a 3. lépéstől (tető, első ár) a lead megérkezéséig, majd elölről – mindig valódi ár látszik
    const id = window.setInterval(() => setStep((current) => (current >= 7 ? 2 : current + 1)), 1700)
    return () => window.clearInterval(id)
  }, [])

  // Kurzor: a lapok mélységük szerint mozognak, a 3D kamera is követi; a szög kijelzője frissül.
  useEffect(() => {
    const element = stage.current?.closest<HTMLElement>('.lx-hero')
    if (!element || !window.matchMedia('(pointer: fine)').matches) return
    let frame = 0
    const move = (event: PointerEvent) => {
      const px = (event.clientX / window.innerWidth - 0.5) * 2
      const py = (event.clientY / window.innerHeight - 0.5) * 2
      drive.current.px = px
      drive.current.py = py
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => { element.style.setProperty('--px', px.toFixed(3)); element.style.setProperty('--py', py.toFixed(3)); showAngle() })
    }
    element.addEventListener('pointermove', move)
    return () => { element.removeEventListener('pointermove', move); cancelAnimationFrame(frame) }
  }, [])

  // Görgetésre a lamellák nyílnak (amíg a csúszkához nem nyúltak).
  useEffect(() => {
    const onScroll = () => {
      const element = stage.current
      if (!element) return
      const box = element.getBoundingClientRect()
      drive.current.progress = Math.min(1, Math.max(0, -box.top / Math.max(1, box.height)))
      showAngle()
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const shown = Math.min(step, 6)
  const price = BUILD_PRICES[shown] ?? BUILD_PRICES[2]!
  const leadIn = step >= 6

  return <section className="lx-hero" aria-labelledby="pf-title">
    <div className="lx-hero-copy">
      <p className="lx-eyebrow lx-rise"><span className="lx-dot" />{h.eyebrow}</p>
      <h1 id="pf-title" className="lx-hero-title">
        <span className="lx-line"><span>{h.line1}</span></span>
        <span className="lx-line"><span><em className="lx-mark">{h.line2}</em></span></span>
        <span className="lx-line"><span>{h.line3}</span></span>
      </h1>
      <p className="lx-lead lx-rise">{h.lead}</p>
      <div className="lx-actions lx-rise">
        <a className="lx-btn lx-btn-ink" href="#demo" data-track="ajanlatkeres">{h.ctaDemo} <ArrowRight size={18} /></a>
        <Link className="lx-btn lx-btn-line" to={demoPath} data-track="elo_demo">{h.ctaLive} <ArrowUpRight size={17} /></Link>
      </div>
      <ul className="lx-proof lx-rise">{h.proof.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
    </div>

    <div className="lx-stage-wrap" ref={stage}>
      <div className={`lx-stage ${ready3d ? 'is-ready' : ''}`}>
        <div className="lx-stage-poster" aria-hidden="true" />
        {scene3d && <div className="lx-stage-canvas" aria-hidden="true"><Suspense fallback={null}><HeroLouvre drive={drive} compact={compact} onReady={() => setReady3d(true)} /></Suspense></div>}
      </div>

      {/* 1. mélység: lépéssáv */}
      <div className="lx-float lx-f-steps" style={{ '--z': 1.4 } as CSSProperties} aria-hidden="true">
        <span className="lx-float-label">{v.stepLabel} · {shown + 1} / 7</span>
        <ol>{c.v2.steps.map((name, index) => <li key={name} className={index === shown ? 'is-on' : index < shown ? 'is-done' : ''}><b>{index < shown ? <Check size={11} strokeWidth={3} /> : index + 1}</b>{index === shown && <span>{name}</span>}</li>)}</ol>
      </div>

      {/* 2. mélység: ár-dokk, valódi árakkal */}
      <div className="lx-float lx-f-price" style={{ '--z': 2.2 } as CSSProperties}>
        <span className="lx-float-label">{h.chipA.label}</span>
        <strong><Odometer text={formatMoney(price, lang)} label={h.chipA.label} /></strong>
        <small>{h.chipA.sub}</small>
      </div>

      {/* 3. mélység: valódi vezérlők a 3D-hez */}
      <div className="lx-float lx-f-control" style={{ '--z': 1 } as CSSProperties} role="group" aria-label={h.control.group}>
        <label className="lx-angle"><span>{v.angleLabel} <output ref={angleOut}>8°</output></span>
          <input ref={angleInput} type="range" min={0} max={90} step={1} defaultValue={8} aria-valuetext="8°" onChange={(event) => { drive.current.manual = Number(event.target.value); showAngle(); event.target.setAttribute('aria-valuetext', `${event.target.value}°`); markUsed() }} />
        </label>
        <div className="lx-swatches" role="radiogroup" aria-label={h.control.color}>
          {HERO_COLORS.map((color, index) => <button key={color.code} type="button" role="radio" aria-checked={frameHex === color.hex} aria-label={h.control.colors[COLOR_KEYS[index]]} title={h.control.colors[COLOR_KEYS[index]]} style={{ '--sw': color.hex } as CSSProperties} onClick={() => { drive.current.frame = color.hex; setFrameHex(color.hex); markUsed() }} />)}
        </div>
      </div>

      {/* beérkező lead a 7. lépés után */}
      <div className={`lx-float lx-f-lead ${leadIn ? 'is-in' : ''}`} style={{ '--z': 2.8 } as CSSProperties} aria-hidden="true">
        <span className="lx-avatar"><Mail size={17} /></span>
        <div><span className="lx-float-label"><i className="lx-ping" />{v.leadPing}<em className="lx-example">{c.v2.example}</em></span><strong>{h.chipB.detail}</strong><small>{formatMoney(BUILD_PRICES[6]!, lang)} · PDF · QR</small></div>
      </div>
    </div>
  </section>
}
