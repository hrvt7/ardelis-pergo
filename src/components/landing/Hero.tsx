// Héró „Felhők felett” (Ádám választása, 2026-11-16): pasztell ég, három réteg felhő (kódból generált
// fotószerű képek) mélységi parallaxszal, középen lebegő laptop, a kijelzőn a VALÓDI asztali
// konfigurátor (a korábbi kézben tartott telefon helyett). A cím betűnként úszik fel, a kurzor közelében a betűk elvékonyodnak (változó Urbanist súly).
// Görgetéskor felülről sorban bezáródnak a lamellák (Lamella-redőny), a zárt tetőn egy mondat; a „Hét lépés”
// szakasz elején kinyílnak, és alattuk már az a szakasz áll. Telefonon ugyanez, külön elrendezéssel.
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight, Check, Mail } from 'lucide-react'
import { assetUrl } from '@/lib/assetUrl'
import { formatMoney } from '@/lib/platformPricing'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'
import Odometer from './Odometer'
import Laptop from './Laptop'
import { BUILD_PRICES } from './buildData'

/** A redőny lamelláinak száma. */
const SLATS = 12

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
  const louvers = useRef<HTMLDivElement>(null)
  const laptop = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(() => (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 6 : 4))

  // Az ár-lap és a lead a konfigurátor lépésein lépked (valódi árak); a végén megérkezik a kérelem.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setStep((current) => (current >= 7 ? 2 : current + 1)), 1700)
    return () => window.clearInterval(id)
  }, [])

  // Mozgás: görgetés és kurzor egyetlen rAF-ben, közvetlenül a néhány mozgó elem transform/opacity értékével
  // (nem CSS-változóval a gyökéren – az az egész részfa stílusát újraszámoltatná).
  // Átvezetés „Lamella-redőny” (Ádám választása, 2026-11-16): a héró végén felülről sorban bezáródnak a lamellák,
  // a zárt tetőn egy mondat áll; a „Hét lépés” szakasz elején a lamellák kinyílnak, alattuk már az a szakasz van.
  useEffect(() => {
    const element = root.current
    const phone = device.current
    const heading = title.current
    const roof = louvers.current
    const screen = laptop.current
    if (!element || !phone || !heading || !roof || !screen) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(pointer: fine)').matches && !reduced
    const q = <T extends Element>(selector: string) => element.querySelector<T>(selector)
    const back = q<HTMLElement>('.lx-cloud-back')
    const mid = q<HTMLElement>('.lx-cloud-mid')
    const front = q<HTMLElement>('.lx-cloud-front')
    const sticky = q<HTMLElement>('.lx-sky-sticky')
    const chips = [...phone.querySelectorAll<HTMLElement>('.lx-chip')].map((chip) => ({ chip, d: Number.parseFloat(chip.dataset.depth ?? '1') }))
    const slats = [...roof.querySelectorAll<HTMLElement>('.lx-slat')]
    const roofText = roof.querySelector<HTMLElement>('.lx-roof-text')
    const letters = [...heading.querySelectorAll<HTMLElement>('.lx-ch')]
    const weights = letters.map(() => '1')
    let centers: { x: number; y: number }[] = []
    let near = { top: 0, bottom: 0 }
    let p = 0
    let close = 0
    let open = 0
    let target = { x: 0, y: 0 }
    const pointer = { x: 0, y: 0, cx: 0, cy: 0 }
    let raf = 0
    let roofShown = false
    let skyHidden = false

    const panel = q<HTMLElement>('.lx-sky-panel')
    const copy = q<HTMLElement>('.lx-sky-copy')
    const side = q<HTMLElement>('.lx-sky-side')
    // Ha a tartalom (a laptop alja) nem fér ki a rögzített panelbe (alacsony telefon, böngésző-sávok), a görgetés
    // első szakaszában a tartalom felcsúszik, így a laptop teljesen előjön, mielőtt a lamellák zárnak.
    let overflow = 0
    const measure = () => {
      if (!panel) return
      overflow = Math.max(0, phone.offsetTop + phone.offsetHeight + 24 - panel.clientHeight)
    }
    const clamp = (value: number) => Math.min(1, Math.max(0, value))
    const ease = (t: number) => t * t * (3 - 2 * t)
    const read = () => {
      const box = element.getBoundingClientRect()
      const span = Math.max(1, box.height - window.innerHeight)
      p = reduced ? 0 : clamp(-box.top / span)
      close = clamp((p - 0.38) / 0.56)
      // nyitás: a következő szakasz teteje az ablak tetejére ért, onnan fél képernyőnyi görgetés alatt
      const next = element.nextElementSibling as HTMLElement | null
      open = next && !reduced ? clamp(-next.getBoundingClientRect().top / (window.innerHeight * 0.55)) : 0
    }
    const lens = () => {
      if (!fine) return
      if (!centers.length) {
        centers = letters.map((letter) => { const r = letter.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 + window.scrollY } })
        const box = heading.getBoundingClientRect()
        near = { top: box.top + window.scrollY - 160, bottom: box.bottom + window.scrollY + 160 }
      }
      const py = pointer.cy + window.scrollY
      const inside = close < 0.01 && py > near.top && py < near.bottom
      centers.forEach((center, index) => {
        const k = inside ? Math.max(0, 1 - Math.hypot(center.x - pointer.cx, center.y - py) / 160) : 0
        const next = k > 0.02 ? (1 - k * 0.7).toFixed(2) : '1'
        if (weights[index] !== next) { weights[index] = next; letters[index].style.setProperty('--k', next) }
      })
    }
    const write = () => {
      const { x: px, y: py } = pointer
      const vh = window.innerHeight / 100
      if (back) back.style.transform = `translateX(-50%) translate3d(${(px * -12).toFixed(1)}px, ${(p * -60).toFixed(1)}px, 0)`
      if (mid) mid.style.transform = `translateX(-46%) translate3d(${(px * -26).toFixed(1)}px, ${(p * 20).toFixed(1)}px, 0)`
      if (front) front.style.transform = `translateX(-54%) translate3d(${(px * -48).toFixed(1)}px, ${(p * 6 * vh).toFixed(1)}px, 0)`
      const lift = -overflow * ease(clamp(p / 0.34))
      for (const block of [copy, side]) if (block) block.style.transform = lift ? `translate3d(0, ${lift.toFixed(1)}px, 0)` : ''
      phone.style.transform = `translate3d(${(px * 10).toFixed(1)}px, ${(py * 6 + lift).toFixed(1)}px, 0)`
      // a laptop a kurzor felé dől (finoman), görgetéskor kissé előrebillen
      screen.style.transform = `perspective(1800px) rotateX(${(7 - py * 3 + p * 6).toFixed(2)}deg) rotateY(${(-9 + px * 5).toFixed(2)}deg)`
      for (const { chip, d } of chips) chip.style.transform = `translate3d(${(px * d * 14).toFixed(1)}px, ${(py * d * 10 - p * d * 3 * vh).toFixed(1)}px, 0)`

      // lamellák: felülről sorban zárnak (90° → 0°), majd felülről sorban nyílnak (0° → −90°)
      const active = close > 0 && open < 1
      if (active !== roofShown) { roofShown = active; roof.classList.toggle('is-on', active) }
      if (active) {
        const n = slats.length
        slats.forEach((slat, index) => {
          const delay = (index / n) * 0.45
          const c = ease(clamp((close - delay) / 0.55))
          const o = ease(clamp((open - delay) / 0.55))
          slat.style.transform = `rotateX(${(o > 0 ? -90 * o : 90 * (1 - c)).toFixed(2)}deg)`
        })
        if (roofText) {
          const t = clamp((close - 0.5) / 0.3) * (1 - clamp(open / 0.25))
          roofText.style.opacity = t.toFixed(3)
          roofText.style.transform = `translate3d(0, ${((1 - t) * 18).toFixed(1)}px, 0)`
        }
      }
      // zárt tetőnél a héró eltűnik, alatta (a negatív margó miatt) már a „Hét lépés” áll
      const hide = close >= 0.999 || open > 0
      if (hide !== skyHidden && sticky) { skyHidden = hide; sticky.style.visibility = hide ? 'hidden' : '' }
    }
    const tick = () => {
      raf = 0
      read()
      pointer.x += (target.x - pointer.x) * 0.12
      pointer.y += (target.y - pointer.y) * 0.12
      write()
      lens()
      if (Math.abs(target.x - pointer.x) > 0.002 || Math.abs(target.y - pointer.y) > 0.002) raf = requestAnimationFrame(tick)
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(tick) }
    const move = (event: PointerEvent) => {
      pointer.cx = event.clientX
      pointer.cy = event.clientY
      target = { x: (event.clientX / window.innerWidth - 0.5) * 2, y: (event.clientY / window.innerHeight - 0.5) * 2 }
      schedule()
    }
    const leave = () => { target = { x: 0, y: 0 }; pointer.cy = -9999; schedule() }
    const resetLens = () => { centers = [] }
    const onResize = () => { resetLens(); measure(); schedule() }
    measure()
    void document.fonts?.ready.then(() => { measure(); schedule() })
    read()
    write()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    if (fine) {
      element.addEventListener('pointermove', move)
      element.addEventListener('pointerleave', leave)
      void document.fonts?.ready.then(resetLens)
    }
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf)
    }
  }, [])

  const shown = Math.min(step, 6)
  const price = BUILD_PRICES[shown] ?? BUILD_PRICES[2]!
  const lines = [h.line1, h.line2, h.line3]
  const starts = lines.map((_, index) => lines.slice(0, index).reduce((sum, line) => sum + line.length, 0))

  return <section className="lx-sky" ref={root} aria-labelledby="pf-title">
    <div className="lx-sky-sticky">
      <div className="lx-sky-panel">
        <img className="lx-cloud lx-cloud-back" src={assetUrl('/assets/landing/clouds-back.webp')} alt="" aria-hidden="true" width={2000} height={700} decoding="async" fetchPriority="high" />
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
          <Laptop label={v.laptopLabel} ref={laptop} />
          <div className="lx-chip lx-chip-price" data-depth="1.6">
            <span className="lx-float-label">{h.chipA.label}<em className="lx-example">{c.v2.example}</em></span>
            <strong><Odometer text={formatMoney(price, lang)} label={h.chipA.label} /></strong>
            <small>{h.chipA.sub}</small>
          </div>
          <div className="lx-chip lx-chip-steps" data-depth="1" aria-hidden="true">
            <span className="lx-float-label">{v.stepLabel} · {shown + 1} / 7</span>
            <ol>{c.v2.steps.map((name, index) => <li key={name} className={index === shown ? 'is-on' : index < shown ? 'is-done' : ''}><b>{index < shown ? <Check size={11} strokeWidth={3} /> : index + 1}</b>{index === shown && <span>{name}</span>}</li>)}</ol>
          </div>
          <div className={`lx-chip lx-chip-lead ${step >= 6 ? 'is-in' : ''}`} data-depth="2.2" aria-hidden="true">
            <span className="lx-avatar"><Mail size={17} /></span>
            <div><span className="lx-float-label"><i className="lx-ping" />{v.leadPing}<em className="lx-example">{c.v2.example}</em></span><strong>{h.chipB.detail}</strong><small>{formatMoney(BUILD_PRICES[6]!, lang)} · PDF · QR</small></div>
          </div>
        </div>

        <img className="lx-cloud lx-cloud-front" src={assetUrl('/assets/landing/clouds-front.webp')} alt="" aria-hidden="true" width={2000} height={600} decoding="async" />
      </div>
    </div>
    <div className="lx-louvers" ref={louvers} aria-hidden="true">
      {Array.from({ length: SLATS }, (_, index) => <i className="lx-slat" key={index} />)}
      <p className="lx-roof-text"><span className="lx-eyebrow">{v.louverLabel}</span><strong><Em parts={v.louver} /></strong></p>
    </div>
  </section>
}
