// Héró „Felhők felett” (Ádám választása, 2026-11-16): pasztell ég, három réteg felhő (kódból generált
// fotószerű képek) mélységi parallaxszal, középen kódból rajzolt vonalas kéz a telefonnal, a képernyőn a VALÓDI
// konfigurátor. A cím betűnként úszik fel, a kurzor közelében a betűk elvékonyodnak (változó Urbanist súly).
// Görgetéskor a telefon kiegyenesedik és ráközelít a képernyőre, amíg az kitölti az ablakot – onnan indul
// a „Hét lépés” szakasz. Telefonon ugyanez, külön elrendezéssel.
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight, Check, Mail } from 'lucide-react'
import { assetUrl } from '@/lib/assetUrl'
import { formatMoney } from '@/lib/platformPricing'
import { useCopy } from '@/i18n/useCopy'
import Odometer from './Odometer'
import HandPhone from './HandPhone'
import { PHONE_TILT, SCREEN_ORIGIN } from './handGeometry'
import { BUILD_PRICES } from './buildData'

/** Betűkre bontott sor; a szóközök megmaradnak (a tördelés szavanként történik). */
function Letters({ text, from }: { text: string; from: number }) {
  let index = from
  return <>{text.split(' ').map((word, w, all) => <Fragment key={w}><span className="lx-word">{[...word].map((ch, c) => <span className="lx-ch" key={c} style={{ '--i': index++ } as CSSProperties}>{ch}</span>)}</span>{w < all.length - 1 ? ' ' : null}</Fragment>)}</>
}

export default function Hero({ demoPath }: { demoPath: string }) {
  const { lang, c } = useCopy()
  const h = c.hero
  const v = c.v2.hero
  const root = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const device = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(() => (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 6 : 4))

  // Az ár-lap és a lead a konfigurátor lépésein lépked (valódi árak); a végén megérkezik a kérelem.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setStep((current) => (current >= 7 ? 2 : current + 1)), 1700)
    return () => window.clearInterval(id)
  }, [])

  // Görgetés: --p (0–1 a héró rögzített szakaszán) és --z (a ráközelítés 0–1), a nagyítás mértéke --zoom.
  useEffect(() => {
    const element = root.current
    const phone = device.current
    if (!element || !phone) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const measure = () => {
      // Elrendezési (transzformáció nélküli) méretek: a képernyő (192 × 412 egység a 620 × 760-as rajzban)
      // magassága töltse ki az ablak ~88%-át, a közepe pedig érkezzen az ablak közepére.
      const w = phone.offsetWidth
      const hgt = phone.offsetHeight
      const scale = Math.min((window.innerHeight * 0.84) / (hgt * (412 / 760)), (window.innerWidth * 0.94) / (w * (192 / 620)))
      element.style.setProperty('--zoom', scale.toFixed(3))
      const cx = phone.offsetLeft + w * (SCREEN_ORIGIN.x / 100)
      const cy = phone.offsetTop + hgt * (SCREEN_ORIGIN.y / 100)
      element.style.setProperty('--dx', `${(window.innerWidth / 2 - cx).toFixed(1)}px`)
      element.style.setProperty('--dy', `${(window.innerHeight / 2 + 26 - cy).toFixed(1)}px`)
    }
    const update = () => {
      raf = 0
      const box = element.getBoundingClientRect()
      const span = Math.max(1, box.height - window.innerHeight)
      const p = reduced ? 0 : Math.min(1, Math.max(0, -box.top / span))
      const z = Math.min(1, Math.max(0, (p - 0.18) / 0.82))
      element.style.setProperty('--p', p.toFixed(4))
      element.style.setProperty('--z', (z * z * (3 - 2 * z)).toFixed(4))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    const onResize = () => { element.style.setProperty('--z', '0'); measure(); update() }
    measure()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
  }, [])

  // Kurzor: mélységi parallax (--px/--py) és „súly-lencse” a cím betűin.
  useEffect(() => {
    const element = root.current
    const heading = title.current
    if (!element || !heading || !window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const letters = [...heading.querySelectorAll<HTMLElement>('.lx-ch')]
    let raf = 0
    let last = { x: 0, y: 0 }
    const frame = () => {
      raf = 0
      element.style.setProperty('--px', ((last.x / window.innerWidth - 0.5) * 2).toFixed(3))
      element.style.setProperty('--py', ((last.y / window.innerHeight - 0.5) * 2).toFixed(3))
      for (const letter of letters) {
        const r = letter.getBoundingClientRect()
        const d = Math.hypot(r.left + r.width / 2 - last.x, r.top + r.height / 2 - last.y)
        const k = Math.max(0, 1 - d / 160)
        const next = k > 0.02 ? (1 - k * 0.7).toFixed(2) : '1'
        if (letter.style.getPropertyValue('--k') !== next) letter.style.setProperty('--k', next)
      }
    }
    const move = (event: PointerEvent) => { last = { x: event.clientX, y: event.clientY }; if (!raf) raf = requestAnimationFrame(frame) }
    const leave = () => letters.forEach((letter) => letter.style.setProperty('--k', '1'))
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerleave', leave)
    return () => { element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf) }
  }, [])

  const shown = Math.min(step, 6)
  const price = BUILD_PRICES[shown] ?? BUILD_PRICES[2]!
  const lines = [h.line1, h.line2, h.line3]
  const starts = lines.map((_, index) => lines.slice(0, index).reduce((sum, line) => sum + line.length, 0))

  return <section className="lx-sky" ref={root} aria-labelledby="pf-title" style={{ '--tilt': `${-PHONE_TILT}deg`, '--ox': `${SCREEN_ORIGIN.x}%`, '--oy': `${SCREEN_ORIGIN.y}%` } as CSSProperties}>
    <div className="lx-sky-sticky">
      <div className="lx-sky-panel">
        <img className="lx-cloud lx-cloud-back" src={assetUrl('/assets/landing/clouds-back.webp')} alt="" aria-hidden="true" width={2000} height={700} decoding="async" />
        <img className="lx-cloud lx-cloud-mid" src={assetUrl('/assets/landing/clouds-mid.webp')} alt="" aria-hidden="true" width={2000} height={700} decoding="async" />

        <div className="lx-sky-copy">
          <p className="lx-eyebrow"><span className="lx-dot" />{h.eyebrow}</p>
          <h1 id="pf-title" className="lx-kinetic" ref={title} aria-label={lines.join(' ')}>
            {lines.map((line, index) => <span className={`lx-kline${index === 1 ? ' is-em' : ''}`} key={line} aria-hidden="true"><Letters text={line} from={starts[index]} /></span>)}
          </h1>
        </div>
        <div className="lx-sky-side">
          <p>{v.sub}</p>
          <div className="lx-actions">
            <a className="lx-btn lx-btn-ink" href="#demo" data-track="ajanlatkeres">{h.ctaDemo} <ArrowRight size={18} /></a>
            <Link className="lx-btn lx-btn-line" to={demoPath} data-track="elo_demo">{h.ctaLive} <ArrowUpRight size={17} /></Link>
          </div>
          <ul className="lx-proof">{h.proof.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
        </div>

        <div className="lx-device" ref={device}>
          <HandPhone label={v.handLabel} />
          <div className="lx-chip lx-chip-price" style={{ '--d': 1.6 } as CSSProperties}>
            <span className="lx-float-label">{h.chipA.label}</span>
            <strong><Odometer text={formatMoney(price, lang)} label={h.chipA.label} /></strong>
            <small>{h.chipA.sub}</small>
          </div>
          <div className="lx-chip lx-chip-steps" style={{ '--d': 1 } as CSSProperties} aria-hidden="true">
            <span className="lx-float-label">{v.stepLabel} · {shown + 1} / 7</span>
            <ol>{c.v2.steps.map((name, index) => <li key={name} className={index === shown ? 'is-on' : index < shown ? 'is-done' : ''}><b>{index < shown ? <Check size={11} strokeWidth={3} /> : index + 1}</b>{index === shown && <span>{name}</span>}</li>)}</ol>
          </div>
          <div className={`lx-chip lx-chip-lead ${step >= 6 ? 'is-in' : ''}`} style={{ '--d': 2.2 } as CSSProperties} aria-hidden="true">
            <span className="lx-avatar"><Mail size={17} /></span>
            <div><span className="lx-float-label"><i className="lx-ping" />{v.leadPing}<em className="lx-example">{c.v2.example}</em></span><strong>{h.chipB.detail}</strong><small>{formatMoney(BUILD_PRICES[6]!, lang)} · PDF · QR</small></div>
          </div>
        </div>

        <img className="lx-cloud lx-cloud-front" src={assetUrl('/assets/landing/clouds-front.webp')} alt="" aria-hidden="true" width={2000} height={600} decoding="async" />
      </div>
    </div>
  </section>
}
