// „Hét lépés”: a valódi konfigurátorból képkockánként rögzített képsorozat görgetésre. A robbantott szerkezet
// összeáll, majd a lamellák kinyílnak; mellette a hét lépés kártyája vált, és az irányár a valódi árazó motor
// értékei között gördül. Rögzítés helyett CSS sticky: asztalon és telefonon ugyanúgy, ugrás nélkül fut.
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { assetUrl } from '@/lib/assetUrl'
import { formatMoney } from '@/lib/platformPricing'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'
import Odometer from './Odometer'
import { BUILD_FRAMES, BUILD_PRICES, frameAt, stepAt } from './buildData'

const frameUrl = (index: number, small: boolean) => assetUrl(`/assets/landing/build/${small ? 'm' : 'f'}${String(index).padStart(3, '0')}.webp`)

export default function BuildSequence() {
  const { lang, c } = useCopy()
  const b = c.v2.build
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const images = useRef<(HTMLImageElement | null)[]>([])
  const current = useRef(-1)
  const wanted = useRef(0)
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const element = section.current
    const cv = canvas.current
    if (!element || !cv) return
    const ctx = cv.getContext('2d')
    const small = window.matchMedia('(max-width: 760px)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let loading = false
    const draw = (index: number) => {
      // a legközelebbi már betöltött képkocka (lassú hálózaton sem villan üresen)
      let pick = -1
      for (let d = 0; d < BUILD_FRAMES && pick < 0; d++) for (const i of [index - d, index + d]) if (pick < 0 && images.current[i]?.complete && images.current[i]!.naturalWidth) pick = i
      if (pick < 0 || !ctx) return
      const img = images.current[pick]!
      if (cv.width !== img.naturalWidth) { cv.width = img.naturalWidth; cv.height = img.naturalHeight }
      ctx.drawImage(img, 0, 0)
      current.current = pick
    }
    const load = () => {
      if (loading) return
      loading = true
      // előbb minden negyedik (gyors durva lejátszás), utána a többi
      const order = [...Array.from({ length: BUILD_FRAMES }, (_, i) => i).filter((i) => i % 4 === 0), ...Array.from({ length: BUILD_FRAMES }, (_, i) => i).filter((i) => i % 4 !== 0)]
      for (const i of order) {
        const img = new Image()
        img.decoding = 'async'
        img.onload = () => { if (current.current < 0 || Math.abs(i - wanted.current) <= Math.abs(current.current - wanted.current)) draw(wanted.current) }
        img.src = frameUrl(i, small)
        images.current[i] = img
      }
    }
    const io = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { load(); io.disconnect() } }, { rootMargin: '150% 0px' })
    io.observe(element)
    let raf = 0
    const update = () => {
      raf = 0
      const box = element.getBoundingClientRect()
      const span = Math.max(1, box.height - window.innerHeight)
      const p = reduced ? 1 : Math.min(1, Math.max(0, -box.top / span))
      const frame = frameAt(p)
      wanted.current = frame
      if (frame !== current.current) draw(frame)
      setStep(stepAt(p))
      setProgress(p)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [])

  const price = BUILD_PRICES[step]

  return <section className="lx-build" id="bemutato" ref={section} aria-labelledby="build-title">
    <div className="lx-build-sticky">
      <div className="lx-build-head">
        <p className="lx-eyebrow">{b.eyebrow}</p>
        <h2 id="build-title"><Em parts={b.title} /></h2>
        <p className="lx-sub">{b.sub}</p>
      </div>
      <div className="lx-build-stage">
        <canvas ref={canvas} className="lx-build-canvas" width={920} height={664} role="img" aria-label={b.picks.join(' · ')} />
        <div className="lx-build-progress" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></div>
      </div>
      <ol className="lx-build-steps" aria-label={c.v2.hero.stepLabel}>
        {c.v2.steps.map((name, index) => <li key={name} className={index === step ? 'is-on' : index < step ? 'is-done' : ''} aria-current={index === step ? 'step' : undefined}>
          <b>{index < step ? <Check size={12} strokeWidth={3} /> : index + 1}</b>
          <div><span>{name}</span><strong>{b.picks[index]}</strong></div>
        </li>)}
      </ol>
      <div className="lx-build-price" aria-live="polite">
        <span>{b.priceLabel}</span>
        {price == null ? <><strong className="is-pending">–</strong><small>{b.pending}</small></> : <strong><Odometer text={formatMoney(price, lang)} /></strong>}
        <a className="lx-build-cta" href="#demo" data-track="ajanlatkeres">{c.nav.requestDemo} <ArrowRight size={16} /></a>
      </div>
    </div>
  </section>
}
