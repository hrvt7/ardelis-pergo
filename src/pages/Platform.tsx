// Lamelix – B2B nyitóoldal pergola- és árnyékolástechnikai gyártóknak. Cél: demókérés.
// Látvány: 3D-ben dőlő termékképernyő, görgetésre kiegyenesedik; szövegfelfedés; rögzített bemutató
// (konfigurátor → lead → statisztika → mobil); a gyártói képek a saját termékből készültek (demóadatokkal).
import SimFrame from '@/components/SimFrame'
import { useLayoutEffect, useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Box, Check, Copy, Mail, QrCode, Send, Smartphone, Table2 } from 'lucide-react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { assetUrl } from '@/lib/assetUrl'
import LamelixLogo from '@/components/LamelixLogo'
import BenefitCards from '@/components/platform/BenefitCards'
import { CustomerFeatures, Faq, ProcessTimeline, RoiCalculator } from '@/components/platform/LandingSections'
import { usePageSeo } from '@/lib/usePageSeo'
import { formatMoney, monthlyPrice, PLANS, SETUP_FEE, type PlanId } from '@/lib/platformPricing'
import { LangProvider, type Lang } from '@/i18n/lang'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'
import LangSwitch from '@/i18n/LangSwitch'
import '@/platform.css'

gsap.registerPlugin(ScrollTrigger)

const CONTACT_EMAIL = 'hrvtadam.7@icloud.com'
const DEMO_PATH = '/konfigurator'
const img = (name: string) => assetUrl(`/assets/platform/${name}.webp`)
const imgSet = (name: string) => `${img(`${name}-900`)} 900w, ${img(name)} 1600w`

function Shot({ name, alt, eager = false, sizes = '(max-width: 900px) 100vw, 60vw' }: { name: string; alt: string; eager?: boolean; sizes?: string }) {
  return <img src={img(name)} srcSet={imgSet(name)} sizes={sizes} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async" width={1600} height={1000} />
}

function Browser({ children, url }: { children: ReactNode; url?: string }) {
  return <div className="pf-browser">
    <div className="pf-browser-bar" aria-hidden="true"><i /><i /><i /><span>{url}</span></div>
    <div className="pf-browser-body">{children}</div>
  </div>
}

const BEATS = [
  { id: 'konfigurator', index: '01', image: 'studio' },
  { id: 'lead', index: '02', image: 'admin-leads' },
  { id: 'meres', index: '03', image: 'admin-overview' },
  { id: 'mobil', index: '04', image: 'admin-mobile', phone: true },
] as const

type FormState = { status: 'idle' | 'sending' | 'sent' | 'error'; message?: string; ref?: string; fallback?: string }

function DemoForm({ plan, onPlan }: { plan: PlanId | 'unsure'; onPlan: (plan: PlanId | 'unsure') => void }) {
  const { lang, c } = useCopy()
  const f = c.form
  const [state, setState] = useState<FormState>({ status: 'idle' })
  const [copied, setCopied] = useState(false)
  const [opened] = useState(() => Date.now())
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '').trim()
    setState({ status: 'sending' })
    try {
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value('name'), company: value('company'), email: value('email'), phone: value('phone'), website: value('website'), product: value('product') || 'pergola', plan, lang, message: value('message'), consent: form.get('consent') === 'on', fax: value('fax'), elapsedMs: Date.now() - opened }),
      })
      const data = await response.json().catch(() => null) as { ok?: boolean; ref?: string; error?: string; fallbackEmail?: string } | null
      if (response.ok && data?.ok) { setState({ status: 'sent', ref: data.ref }); return }
      setState({ status: 'error', message: data?.error ?? f.failed, fallback: response.status === 400 ? undefined : data?.fallbackEmail ?? CONTACT_EMAIL })
    } catch {
      setState({ status: 'error', message: f.offline, fallback: CONTACT_EMAIL })
    }
  }
  if (state.status === 'sent') return <div className="pf-form-done" role="status">
    <span className="pf-done-mark"><Check size={26} /></span>
    <h3>{f.doneTitle}</h3>
    <p>{f.doneText}</p>
    {state.ref && <small>{f.ref}{state.ref}</small>}
  </div>
  return <form className="pf-form" onSubmit={submit} noValidate={false}>
    <div className="pf-form-grid">
      <label><span>{f.name}</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
      <label><span>{f.company}</span><input name="company" required minLength={2} maxLength={160} autoComplete="organization" /></label>
      <label><span>{f.email}</span><input name="email" type="email" required maxLength={320} autoComplete="email" /></label>
      <label><span>{f.phone}</span><input name="phone" type="tel" maxLength={40} pattern="[+0-9 ()/\-]*" autoComplete="tel" /></label>
      <label><span>{f.website}</span><input name="website" maxLength={300} placeholder={f.websitePlaceholder} autoComplete="url" /></label>
      <label><span>{f.product}</span><select name="product" defaultValue="pergola">{(Object.keys(f.products) as (keyof typeof f.products)[]).map((key) => <option key={key} value={key}>{f.products[key]}</option>)}</select></label>
    </div>
    <fieldset className="pf-plan-pick">
      <legend>{f.planLegend}</legend>
      {([...PLANS.map((item) => [item.id, c.pricing.plans[item.id].name] as const), ['unsure', f.planUnsure] as const]).map(([id, label]) => <label key={id} className={plan === id ? 'is-on' : ''}><input type="radio" name="plan" value={id} checked={plan === id} onChange={() => onPlan(id)} />{label}</label>)}
    </fieldset>
    <label className="pf-wide"><span>{f.message}</span><textarea name="message" rows={3} maxLength={2000} placeholder={f.messagePlaceholder} /></label>
    <input className="pf-hp" name="fax" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    <label className="pf-consent"><input type="checkbox" name="consent" required /><span>{f.consent} <a href="/adatkezeles" target="_blank" rel="noopener">{f.privacyLink}</a></span></label>
    {state.status === 'error' && <div className="pf-form-error" role="alert">
      <p>{state.message}{state.fallback ? f.fallback : ''}</p>
      {state.fallback && <div className="pf-fallback"><a href={`mailto:${state.fallback}?subject=${encodeURIComponent(f.mailSubject)}`}>{state.fallback}</a><button type="button" onClick={() => { void navigator.clipboard?.writeText(state.fallback!).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) }).catch(() => undefined) }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? f.copied : f.copy}</button></div>}
    </div>}
    <button className="pf-btn pf-btn-primary pf-submit" type="submit" disabled={state.status === 'sending'}>{state.status === 'sending' ? f.sending : <>{f.submit} <Send size={17} /></>}</button>
    <p className="pf-form-note">{f.note}</p>
  </form>
}

/** A főoldal két nyelven: / (magyar) és /en (angol). */
export default function Platform({ lang = 'hu' }: { lang?: Lang }) {
  return <LangProvider value={lang}><PlatformPage /></LangProvider>
}

function PlatformPage() {
  const { lang, c } = useCopy()
  usePageSeo(lang === 'en' ? '/en' : '/')
  const root = useRef<HTMLDivElement>(null)
  const [annual, setAnnual] = useState(false)
  const [plan, setPlan] = useState<PlanId | 'unsure'>('unsure')
  const [scrolled, setScrolled] = useState(false)

  const choosePlan = (id: PlanId) => {
    setPlan(id)
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Kártyák: finom 3D dőlés az egér alatt (CSS változókkal, újrarenderelés nélkül).
  const tilt = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return
    const card = event.currentTarget
    const box = card.getBoundingClientRect()
    card.style.setProperty('--rx', `${((event.clientY - box.top) / box.height - 0.5) * -7}deg`)
    card.style.setProperty('--ry', `${((event.clientX - box.left) / box.width - 0.5) * 9}deg`)
    card.style.setProperty('--mx', `${((event.clientX - box.left) / box.width) * 100}%`)
    card.style.setProperty('--my', `${((event.clientY - box.top) / box.height) * 100}%`)
  }
  const untilt = (event: PointerEvent<HTMLElement>) => { event.currentTarget.style.setProperty('--rx', '0deg'); event.currentTarget.style.setProperty('--ry', '0deg') }

  useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    if (reduced) { element.classList.add('pf-reduced'); return () => window.removeEventListener('scroll', onScroll) }

    let lenis: Lenis | undefined
    let ticker: ((time: number) => void) | undefined
    const context = gsap.context(() => {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: { offset: -72 } })
      lenis.on('scroll', ScrollTrigger.update)
      ticker = (time: number) => lenis?.raf(time * 1000)
      gsap.ticker.add(ticker)
      gsap.ticker.lagSmoothing(0)

      // Belépés: címsor sorai, majd a döntött képernyő „leszáll”.
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .fromTo('.pf-hero-line > span', { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.09 }, 0.1)
        .fromTo('.pf-hero-fade', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.45)
        .fromTo('.pf-stage', { opacity: 0, y: 80, rotateX: 38 }, { opacity: 1, y: 0, rotateX: 24, duration: 1.6 }, 0.2)
        .fromTo('.pf-chip', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.7, stagger: 0.12, ease: 'back.out(1.6)' }, 1)

      // Hero: görgetésre a képernyő kiegyenesedik és közelebb jön (3D perspektíva).
      gsap.to('.pf-stage', { rotateX: 0, rotateY: 0, scale: 1.04, y: -40, ease: 'none', scrollTrigger: { trigger: '.pf-hero', start: 'top top', end: 'bottom 30%', scrub: 0.8 } })
      gsap.to('.pf-chip-a', { y: -90, ease: 'none', scrollTrigger: { trigger: '.pf-hero', start: 'top top', end: 'bottom top', scrub: true } })
      gsap.to('.pf-chip-b', { y: -150, ease: 'none', scrollTrigger: { trigger: '.pf-hero', start: 'top top', end: 'bottom top', scrub: true } })
      gsap.to('.pf-chip-c', { y: -60, ease: 'none', scrollTrigger: { trigger: '.pf-hero', start: 'top top', end: 'bottom top', scrub: true } })
      gsap.to('.pf-hero-glow', { opacity: 0.25, scale: 1.3, ease: 'none', scrollTrigger: { trigger: '.pf-hero', start: 'top top', end: 'bottom top', scrub: true } })

      // Egérparallaxis a hero képernyőn.
      const stage = element.querySelector<HTMLElement>('.pf-tilt')
      const hero = element.querySelector<HTMLElement>('.pf-hero')
      if (stage && hero && window.matchMedia('(pointer: fine)').matches) {
        const rotX = gsap.quickTo(stage, 'rotateX', { duration: 0.8, ease: 'power3' })
        const rotY = gsap.quickTo(stage, 'rotateY', { duration: 0.8, ease: 'power3' })
        const move = (event: globalThis.PointerEvent) => {
          rotY(((event.clientX / window.innerWidth) - 0.5) * 8)
          rotX(((event.clientY / window.innerHeight) - 0.5) * -5)
        }
        hero.addEventListener('pointermove', move)
        return () => hero.removeEventListener('pointermove', move)
      }
    }, element)

    const scrollContext = gsap.context(() => {
      // Kijelentés: a szavak a görgetéssel „kigyulladnak”.
      gsap.fromTo('.pf-statement .pf-word', { opacity: 0.14 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '.pf-statement', start: 'top 78%', end: 'bottom 45%', scrub: true } })

      // Belépő elemek.
      gsap.utils.toArray<HTMLElement>('[data-pf-reveal]', element).forEach((section) => {
        gsap.fromTo(section.querySelectorAll('[data-pf-item]'), { opacity: 0, y: 46, rotateX: 8 }, { opacity: 1, y: 0, rotateX: 0, duration: 1, stagger: 0.09, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: section, start: 'top 80%', once: true } })
      })

      // Lépések: a vonal kirajzolódik.
      gsap.fromTo('.sx-line i', { '--sx': 0 }, { '--sx': 1, ease: 'none', scrollTrigger: { trigger: '.sx', start: 'top 75%', end: 'bottom 65%', scrub: true } })

      // Záró blokk: a fény körbefordul.
      gsap.fromTo('.pf-final', { '--pf-angle': '0deg' }, { '--pf-angle': '200deg', ease: 'none', scrollTrigger: { trigger: '.pf-final', start: 'top bottom', end: 'bottom top', scrub: true } })
    }, element)

    // Rögzített bemutató csak széles képernyőn; mobilon egymás alatti kártyák.
    const media = gsap.matchMedia()
    media.add('(min-width: 961px)', () => {
      const section = element.querySelector<HTMLElement>('.pf-show')
      if (!section) return
      const beats = gsap.utils.toArray<HTMLElement>('.pf-beat', section)
      const frames = gsap.utils.toArray<HTMLElement>('.pf-show-frame', section)
      const dots = gsap.utils.toArray<HTMLElement>('.pf-show-dots i', section)
      gsap.set(beats.slice(1), { autoAlpha: 0, y: 40 })
      gsap.set(frames.slice(1), { autoAlpha: 0, rotateY: -16, z: -160 })
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${window.innerHeight * 3}`,
          pin: '.pf-show-pin',
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const active = Math.min(beats.length - 1, Math.floor(self.progress * beats.length * 0.999))
            dots.forEach((dot, index) => dot.classList.toggle('is-on', index === active))
          },
        },
      })
      beats.forEach((_, index) => {
        if (index === 0) return
        const at = index
        timeline
          .to(beats[index - 1], { autoAlpha: 0, y: -40, duration: 0.3 }, at - 0.35)
          .to(frames[index - 1], { autoAlpha: 0, rotateY: 14, z: -180, duration: 0.45, ease: 'power2.in' }, at - 0.4)
          .to(frames[index], { autoAlpha: 1, rotateY: 0, z: 0, duration: 0.5, ease: 'power2.out' }, at - 0.1)
          .to(beats[index], { autoAlpha: 1, y: 0, duration: 0.3 }, at - 0.05)
      })
      timeline.to({}, { duration: 0.4 })
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (ticker) gsap.ticker.remove(ticker)
      lenis?.destroy()
      media.revert()
      scrollContext.revert()
      context.revert()
    }
  }, [])

  const statement = c.statement.text

  const n = c.nav
  const h = c.hero
  const pr = c.pricing
  return <div className="pf-page" ref={root}>
    <header className={`pf-header${scrolled ? ' is-scrolled' : ''}`}>
      <a className="pf-brand" href="#top" aria-label={n.brandAria}><LamelixLogo className="pf-logo" height={30} title={null} /><small>{n.brandSmall}</small></a>
      <nav aria-label={n.mainAria}><a href="#elonyok">{n.benefits}</a><a href="#bemutato">{n.showcase}</a><a href="#funkciok">{n.features}</a><a href="#mukodes">{n.how}</a><a href="#arak">{n.pricing}</a><a href="#gyik">{n.faq}</a></nav>
      <div className="pf-header-actions"><LangSwitch /><Link className="pf-link-quiet" to={DEMO_PATH}>{n.liveDemo}</Link><a className="pf-btn pf-btn-primary pf-btn-sm" href="#demo">{n.requestDemo}</a></div>
    </header>

    <main id="top">
      <section className="pf-hero" aria-labelledby="pf-title">
        <div className="pf-hero-glow" aria-hidden="true" />
        <div className="pf-hero-copy">
          <p className="pf-eyebrow pf-hero-fade"><span className="pf-pulse" />{h.eyebrow}</p>
          <h1 id="pf-title"><span className="pf-hero-line"><span>{h.line1}</span></span><span className="pf-hero-line"><span><em>{h.line2}</em></span></span><span className="pf-hero-line"><span>{h.line3}</span></span></h1>
          <p className="pf-lead pf-hero-fade">{h.lead}</p>
          <div className="pf-hero-actions pf-hero-fade"><a className="pf-btn pf-btn-primary" href="#demo">{h.ctaDemo} <ArrowRight size={18} /></a><Link className="pf-btn pf-btn-ghost" to={DEMO_PATH}>{h.ctaLive} <ArrowUpRight size={17} /></Link></div>
          <ul className="pf-proof pf-hero-fade">{h.proof.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
        </div>
        <div className="pf-scene" aria-hidden="false">
          <div className="pf-stage">
            <div className="pf-tilt">
              <Browser url={h.browserUrl}><Shot name="studio" alt={h.imgAlt} eager sizes="(max-width: 900px) 100vw, 58vw" /></Browser>
              <div className="pf-chip pf-chip-a"><span>{h.chipA.label}</span><strong>{h.chipA.value}</strong><small>{h.chipA.sub}</small></div>
              <div className="pf-chip pf-chip-b"><i className="pf-chip-dot" /><div><span>{h.chipB.label}</span><strong>{h.chipB.name}</strong><small>{h.chipB.detail}</small></div></div>
              <div className="pf-chip pf-chip-c"><QrCode size={30} /><div><strong>{h.chipC.title}</strong><small>{h.chipC.sub}</small></div></div>
            </div>
          </div>
        </div>
      </section>

      <div className="pf-marquee" aria-hidden="true"><div className="pf-marquee-track">{[0, 1].map((copy) => <span key={copy}>{c.marquee.map((item) => <b key={item}>{item}<i>✦</i></b>)}</span>)}</div></div>

      <section className="pf-statement" aria-label={c.statement.aria}>
        <p>{statement.split(' ').map((word, index) => <span className="pf-word" key={index}>{word} </span>)}</p>
      </section>

      <section className="pf-section" id="elonyok" aria-labelledby="elonyok-title" data-pf-reveal>
        <div className="pf-head" data-pf-item><p className="pf-eyebrow">{c.benefits.eyebrow}</p><h2 id="elonyok-title"><Em parts={c.benefits.title} /></h2></div>
        <BenefitCards demoPath={DEMO_PATH} />
      </section>

      <section className="pf-show" id="bemutato" aria-labelledby="bemutato-title">
        <div className="pf-show-pin">
          <div className="pf-show-copy">
            <p className="pf-eyebrow">{c.showcase.eyebrow}</p>
            <h2 id="bemutato-title" className="sr-only">{c.showcase.srTitle}</h2>
            <div className="pf-beats">
              {BEATS.map((beat, index) => { const text = c.showcase.beats[index]; return <article className="pf-beat" key={beat.id}>
                <span className="pf-beat-index">{beat.index} / 04</span><h3>{text.title}</h3><p>{text.text}</p>
                <div className="pf-beat-media">{'phone' in beat ? <div className="pf-phone"><img src={img(beat.image)} alt={text.alt} loading="lazy" decoding="async" width={520} height={1126} /></div> : <Browser url={beat.id === 'konfigurator' ? h.browserUrl : h.adminUrl}><Shot name={beat.image} alt={text.alt} /></Browser>}</div>
              </article> })}
            </div>
            <div className="pf-show-dots" aria-hidden="true">{BEATS.map((beat) => <i key={beat.id} />)}</div>
            <Link className="pf-btn pf-btn-ghost pf-show-cta" to={DEMO_PATH}>{c.showcase.cta} <ArrowUpRight size={17} /></Link>
          </div>
          <div className="pf-show-stage" aria-hidden="true">
            {BEATS.map((beat) => <div className="pf-show-frame" key={beat.id}>{'phone' in beat ? <div className="pf-phone"><img src={img(beat.image)} alt="" loading="lazy" decoding="async" width={520} height={1126} /></div> : <Browser url={beat.id === 'konfigurator' ? h.browserUrl : h.adminUrl}><Shot name={beat.image} alt="" /></Browser>}</div>)}
          </div>
        </div>
      </section>

      <section className="pf-section" id="funkciok" aria-labelledby="funkciok-title" data-pf-reveal>
        <div className="pf-head pf-head-row" data-pf-item>
          <div><p className="pf-eyebrow">{c.features.eyebrow}</p><h2 id="funkciok-title"><Em parts={c.features.title} /></h2></div>
          <p className="pf-sub">{c.features.sub}</p>
        </div>
        <CustomerFeatures />
      </section>

      <section className="pf-section pf-live" id="mukodes-elo" aria-labelledby="live-title" data-pf-reveal>
        <div className="pf-head pf-head-row" data-pf-item>
          <div><p className="pf-eyebrow">{c.live.eyebrow}</p><h2 id="live-title"><Em parts={c.live.title} /></h2></div>
          <p className="pf-sub">{c.live.sub}</p>
        </div>
        <div className="pf-live-stage" data-pf-item>
          <Browser url="lamelix.vercel.app/demo/sb400-live"><SimFrame src="/demo/sb400-live.html" labels={{ title: c.live.iframeTitle, activate: c.live.activate, release: c.live.release, fallback: c.live.fallback, fullscreen: c.live.fullscreen }} /></Browser>
        </div>
        <ul className="pf-live-chips" data-pf-item>{c.live.chips.map((chip) => <li key={chip}><Check size={15} />{chip}</li>)}</ul>
        <div className="pf-live-note" data-pf-item><div><h3>{c.live.noteTitle}</h3><p>{c.live.note}</p></div><a className="pf-btn pf-btn-ghost" href="#demo">{c.live.cta} <ArrowUpRight size={17} /></a></div>
      </section>

      <section className="pf-section" id="mukodes" aria-labelledby="mukodes-title" data-pf-reveal>
        <div className="pf-head" data-pf-item><p className="pf-eyebrow">{c.how.eyebrow}</p><h2 id="mukodes-title"><Em parts={c.how.title} /></h2></div>
        <ProcessTimeline />
      </section>

      <section className="pf-section" id="arak" aria-labelledby="arak-title" data-pf-reveal>
        <div className="pf-head pf-head-row" data-pf-item>
          <div><p className="pf-eyebrow">{pr.eyebrow}</p><h2 id="arak-title"><Em parts={pr.title} /></h2><p className="pf-sub">{pr.sub}</p></div>
          <div className="pf-billing" role="group" aria-label={pr.billingAria}><button type="button" className={annual ? '' : 'is-on'} aria-pressed={!annual} onClick={() => setAnnual(false)}>{pr.monthly}</button><button type="button" className={annual ? 'is-on' : ''} aria-pressed={annual} onClick={() => setAnnual(true)}>{pr.annual} <em>{pr.annualBadge}</em></button></div>
        </div>
        <ul className="pf-every" data-pf-item aria-label={pr.everyAria}><li className="pf-every-label">{pr.everyLabel}</li>{pr.everyPlan.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul>
        <div className="pf-plans">
          {PLANS.map((item) => {
            const price = monthlyPrice(item, annual)
            const text = pr.plans[item.id]
            return <article key={item.id} className={`pf-plan${item.featured ? ' is-featured' : ''}`} data-pf-item onPointerMove={tilt} onPointerLeave={untilt}>
              {item.featured && <span className="pf-plan-badge">{pr.badge}</span>}
              <h3>{text.name}</h3><p className="pf-plan-tag">{text.tagline}</p>
              <div className="pf-price">{price === null ? <strong>{pr.custom}</strong> : <><strong>{formatMoney(price, lang)}</strong><span>{pr.perMonth}</span></>}</div>
              <p className="pf-price-note">{price === null ? pr.customNote : annual ? pr.annualNote(formatMoney(price * 12, lang)) : pr.monthlyNote}</p>
              <ul>{text.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
              <button type="button" className={`pf-btn ${item.featured ? 'pf-btn-primary' : 'pf-btn-ghost'}`} onClick={() => choosePlan(item.id)}>{item.monthly === null ? pr.ctaQuote : pr.ctaDemo} <ArrowRight size={17} /></button>
            </article>
          })}
        </div>
        <div className="pf-setup" data-pf-item>
          <div><span className="pf-setup-icon"><Box size={22} /></span><div><strong>{pr.setupTitle(formatMoney(SETUP_FEE, lang))}</strong><p>{pr.setupLead}</p></div></div>
          <ul>{pr.setupIncludes.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
        </div>
        <RoiCalculator annual={annual} />
        <p className="pf-fineprint" data-pf-item>{pr.fineprint}</p>
      </section>

      <section className="pf-section pf-demo" id="demo" aria-labelledby="demo-title" data-pf-reveal>
        <div className="pf-demo-copy" data-pf-item>
          <p className="pf-eyebrow">{c.demo.eyebrow}</p>
          <h2 id="demo-title"><Em parts={c.demo.title} /></h2>
          <p className="pf-sub">{c.demo.sub}</p>
          <ul className="pf-demo-points"><li><Smartphone size={18} />{c.demo.points[0]}</li><li><Table2 size={18} />{c.demo.points[1]}</li><li><Mail size={18} />{c.demo.writeUs}<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li></ul>
          {c.demo.liveNote && <p className="pf-demo-note">{c.demo.liveNote}</p>}
        </div>
        <div className="pf-demo-form" data-pf-item><DemoForm plan={plan} onPlan={setPlan} /></div>
      </section>

      <section className="pf-section pf-faq" id="gyik" aria-labelledby="gyik-title" data-pf-reveal>
        <Faq email={CONTACT_EMAIL} demoPath={DEMO_PATH} />
      </section>

      <section className="pf-final" aria-labelledby="final-title">
        <div className="pf-final-inner">
          <h2 id="final-title"><Em parts={c.final.title} /></h2>
          <p>{c.final.text}</p>
          <div className="pf-hero-actions"><a className="pf-btn pf-btn-primary" href="#demo">{n.requestDemo} <ArrowRight size={18} /></a><Link className="pf-btn pf-btn-ghost" to={DEMO_PATH}>{n.liveDemo} <ArrowUpRight size={17} /></Link></div>
        </div>
      </section>
    </main>

    <footer className="pf-footer">
      <a className="pf-brand" href="#top" aria-label={n.brandAria}><LamelixLogo className="pf-logo" height={28} title={null} /></a>
      <p>{c.footer.text}</p>
      <nav aria-label={n.footerAria}><Link to={DEMO_PATH}>{n.liveDemo}</Link>{c.footer.sample && <Link to="/minta">{c.footer.sample}</Link>}<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></nav>
      <small>© {new Date().getFullYear()} Lamelix</small>
    </footer>
  </div>
}
