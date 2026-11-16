// Lamelix – B2B nyitóoldal pergola- és árnyékolástechnikai gyártóknak. Cél: demókérés.
// Koncepció (docs/landing/DESIGN.md): „az asztalon a termék” – a konfigurátor kódból újrarajzolt darabjai lebegnek
// a valódi 3D tető körül; rendrakás-kollázs; a valódi konfigurátor képsorozata görgetésre; élő vonalas SVG-jelenetek;
// a gyártói admin pipeline-ja. Világos, pasztell rendszer (Urbanist, #ECECEF, Vanilla kiemelés).
import SimFrame from '@/components/SimFrame'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { COLOR_CATALOG } from '@/lib/colors'
import { ROOF_TYPES } from '@/lib/roofs'
import { SIDE_TYPES } from '@/lib/sides'
import { MOUNT_TYPES } from '@/lib/mount'
import { ArrowRight, Box, Check, Copy, LogIn, Mail, Send, Smartphone, Table2 } from 'lucide-react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { assetUrl } from '@/lib/assetUrl'
import LamelixLogo from '@/components/LamelixLogo'
import { ProcessTimeline, RoiCalculator } from '@/components/platform/LandingSections'
import Hero from '@/components/landing/Hero'
import ProblemCollage from '@/components/landing/ProblemCollage'
import BuildSequence from '@/components/landing/BuildSequence'
import FeatureScenes from '@/components/landing/FeatureScenes'
import AdminBoard from '@/components/landing/AdminBoard'
import FinalCta from '@/components/landing/FinalCta'
import InkDefs from '@/components/landing/InkDefs'
import PlanSwitch from '@/components/landing/PlanSwitch'
import FaqChat from '@/components/landing/FaqChat'
import WhyStrip from '@/components/landing/WhyStrip'
import { usePageSeo } from '@/lib/usePageSeo'
import { hint } from '@/lib/fieldHint'
import { formatMoney, PLANS, SETUP_FEE, type PlanId } from '@/lib/platformPricing'
import { LangProvider, type Lang } from '@/i18n/lang'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'
import LangSwitch from '@/i18n/LangSwitch'
import { funnel, funnelSourceLabel } from '@/lib/funnel'
import '@/platform.css'
import '@/landing.css'

gsap.registerPlugin(ScrollTrigger)

// Látványelemek (performative-ui) lustán: a könyvtár csak a nyitóoldallal töltődik, a konfigurátorral nem.
const CountingStats = lazy(() => import('@/components/Showpieces').then((m) => ({ default: m.CountingStats })))
const BigFooter = lazy(() => import('@/components/Showpieces').then((m) => ({ default: m.BigFooter })))
const ImageCompare = lazy(() => import('@/components/Showpieces').then((m) => ({ default: m.ImageCompare })))
const BeforeAfterList = lazy(() => import('@/components/Showpieces').then((m) => ({ default: m.BeforeAfterList })))
const terrace = (name: string) => ({ src: assetUrl(`/assets/home/${name}.webp`), srcSet: `${assetUrl(`/assets/home/${name}-960.webp`)} 960w, ${assetUrl(`/assets/home/${name}.webp`)} 1920w` })
/** A katalógusból számolt, valódi számok a felfutó számsorhoz. */
const STATS = { colors: COLOR_CATALOG.length, roofs: ROOF_TYPES.length, sides: SIDE_TYPES.filter((type) => type !== 'none').length, mounts: MOUNT_TYPES.length }

/** Kapcsolati cím a nyitóoldalon és a GYIK-ben; élesben a VITE_CONTACT_EMAIL környezeti változóból (céges domain). */
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'hrvthadam.7@icloud.com'
const DEMO_PATH = '/konfigurator'
function Browser({ children, url }: { children: ReactNode; url?: string }) {
  return <div className="pf-browser">
    <div className="pf-browser-bar" aria-hidden="true"><i /><i /><i /><span>{url}</span></div>
    <div className="pf-browser-body">{children}</div>
  </div>
}

type FormState = { status: 'idle' | 'sending' | 'sent' | 'error'; message?: string; ref?: string; fallback?: string }

function DemoForm({ plan, onPlan }: { plan: PlanId | 'unsure'; onPlan: (plan: PlanId | 'unsure') => void }) {
  const { lang, c } = useCopy()
  const f = c.form
  const [state, setState] = useState<FormState>({ status: 'idle' })
  const [copied, setCopied] = useState(false)
  const [opened] = useState(() => Date.now())
  const started = useRef(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '').trim()
    setState({ status: 'sending' })
    try {
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value('name'), company: value('company'), email: value('email'), phone: value('phone'), website: value('website'), product: value('product') || 'pergola', plan, lang, message: value('message'), source: funnelSourceLabel(), consent: form.get('consent') === 'on', fax: value('fax'), elapsedMs: Date.now() - opened }),
      })
      const data = await response.json().catch(() => null) as { ok?: boolean; ref?: string; error?: string; fallbackEmail?: string } | null
      if (response.ok && data?.ok) { funnel('demo_form_submit', { plan }); setState({ status: 'sent', ref: data.ref }); return }
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
  return <form className="pf-form" onSubmit={submit} noValidate={false} onFocus={() => { if (!started.current) { started.current = true; funnel('demo_form_start', { plan }) } }}>
    <div className="pf-form-grid">
      <label><span>{f.name}</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
      <label><span>{f.company}</span><input name="company" required minLength={2} maxLength={160} autoComplete="organization" /></label>
      <label><span>{f.email}</span><input name="email" type="email" required maxLength={320} autoComplete="email" /></label>
      <label><span>{f.phone}</span><input name="phone" type="tel" maxLength={40} pattern="[+0-9 ()/\-]*" autoComplete="tel" /></label>
      <label><span>{f.website}</span><input name="website" maxLength={300} {...hint(f.websiteHint)} autoComplete="url" /></label>
      <label><span>{f.product}</span><select name="product" defaultValue="pergola">{(Object.keys(f.products) as (keyof typeof f.products)[]).map((key) => <option key={key} value={key}>{f.products[key]}</option>)}</select></label>
    </div>
    <fieldset className="pf-plan-pick">
      <legend>{f.planLegend}</legend>
      {([...PLANS.map((item) => [item.id, c.pricing.plans[item.id].name] as const), ['unsure', f.planUnsure] as const]).map(([id, label]) => <label key={id} className={plan === id ? 'is-on' : ''}><input type="radio" name="plan" value={id} checked={plan === id} onChange={() => onPlan(id)} />{label}</label>)}
    </fieldset>
    <label className="pf-wide"><span>{f.message}</span><textarea name="message" rows={3} maxLength={2000} {...hint(f.messageHint)} /></label>
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

  // Tölcsér: a demókérő és az élő demó linkjei, valamint a belépés egy delegált figyelővel mérve.
  useEffect(() => {
    funnelSourceLabel()
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href]')
      if (!link) return
      const href = link.getAttribute('href') ?? ''
      const placement = link.closest('section, header, footer, aside')?.className.split(' ')[0] ?? 'page'
      if (href === '#demo') funnel('demo_click', { placement })
      else if (href.startsWith(DEMO_PATH)) funnel('live_demo_open', { placement })
      else if (href === '/belepes') funnel('login_click', { placement })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    element.classList.add('is-in')
    // A képernyőn kívüli szakaszok végtelen CSS-animációi szünetelnek (kevesebb festés görgetés közben).
    const pauser = new IntersectionObserver((entries) => entries.forEach((entry) => entry.target.classList.toggle('lx-offscreen', !entry.isIntersecting)), { rootMargin: '200px 0px' })
    element.querySelectorAll('main > section, main > div').forEach((section) => pauser.observe(section))
    if (reduced) { element.classList.add('pf-reduced'); return () => { window.removeEventListener('scroll', onScroll); pauser.disconnect() } }

    let lenis: Lenis | undefined
    let ticker: ((time: number) => void) | undefined
    const context = gsap.context(() => {
      lenis = new Lenis({ lerp: 0.14, smoothWheel: true, anchors: { offset: -72 } })
      lenis.on('scroll', ScrollTrigger.update)
      ticker = (time: number) => lenis?.raf(time * 1000)
      gsap.ticker.add(ticker)
      gsap.ticker.lagSmoothing(0)

      // Belépő elemek a szakaszokban.
      gsap.utils.toArray<HTMLElement>('[data-pf-reveal]', element).forEach((section) => {
        gsap.fromTo(section.querySelectorAll('[data-pf-item]'), { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 1, stagger: 0.09, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: section, start: 'top 80%', once: true } })
      })
      // Kiemelő filc: a szakaszcímek kiemelt szava alá a Vanilla sáv behúzódik, amikor a cím beér.
      gsap.utils.toArray<HTMLElement>('h2 em', element).forEach((em) => {
        ScrollTrigger.create({ trigger: em, start: 'top 85%', once: true, onEnter: () => em.classList.add('is-drawn') })
      })
      // Lépések: a vonal kirajzolódik.
      gsap.fromTo('.sx-line i', { '--sx': 0 }, { '--sx': 1, ease: 'none', scrollTrigger: { trigger: '.sx', start: 'top 75%', end: 'bottom 65%', scrub: true } })
    }, element)

    return () => {
      window.removeEventListener('scroll', onScroll)
      pauser.disconnect()
      if (ticker) gsap.ticker.remove(ticker)
      lenis?.destroy()
      context.revert()
    }
  }, [])

  const n = c.nav
  const pr = c.pricing
  const statItems = lang === 'en'
    ? [{ value: STATS.colors, label: 'frame colours (RAL and wood look)' }, { value: STATS.roofs, label: 'roof systems, from louvres to glass' }, { value: STATS.sides, label: 'side enclosure types per side' }, { value: STATS.mounts, label: 'mounting layouts, wall to free-standing' }]
    : [{ value: STATS.colors, label: 'szín a szerkezethez (RAL és fa hatás)' }, { value: STATS.roofs, label: 'tetőrendszer a lamellától az üvegig' }, { value: STATS.sides, label: 'oldalzárás-típus, oldalanként választható' }, { value: STATS.mounts, label: 'rögzítési mód a faltól a szabadon állóig' }]
  const footerColumns = [
    { heading: lang === 'en' ? 'Product' : 'Termék', links: [{ label: n.liveDemo, href: DEMO_PATH }, { label: n.requestDemo, href: '#demo' }, ...(c.footer.sample ? [{ label: c.footer.sample, href: '/minta' }] : [])] },
    { heading: lang === 'en' ? 'Contact' : 'Kapcsolat', links: [{ label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` }, { label: n.login, href: '/belepes' }] },
    { heading: lang === 'en' ? 'Legal' : 'Jogi', links: [{ label: c.form.privacyLink, href: '/adatkezeles' }] },
  ]
  const compare = lang === 'en'
    ? { eyebrow: 'Before and after', title: <>The same terrace. <em>With a pergola.</em></>, text: 'The empty terrace on the left, the same scene with the pergola designed in the 3D studio on the right. This is a demo scene; your buyers can also place the design onto a photo of their own terrace.', beforeAlt: 'Empty wooden terrace in front of a family house', afterAlt: 'The same terrace with an anthracite bioclimatic pergola and garden furniture', beforeLabel: 'Before', afterLabel: 'After', brand: 'with Lamelix', listBefore: ['Price list by e-mail, days later', 'Customer imagines the terrace from a catalogue', 'Requests arrive as “about 5 by 4 metres”', 'Every quote is drawn up by hand'], listAfter: ['Guide price while they design, at eleven at night', 'The design can be viewed on a photo of their own terrace', 'Requests arrive with the full configuration and design link', 'The guide price and the design are already in the request, you only refine'] }
    : { eyebrow: 'Előtte, utána', title: <>Ugyanaz a terasz. <em>Pergolával.</em></>, text: 'Bal oldalt az üres terasz, jobb oldalt ugyanaz a jelenet a 3D stúdióban megtervezett pergolával. A kép bemutató jelenet; a vevő a saját teraszáról készült fotóra is ráhelyezheti a tervet.', beforeAlt: 'Üres faburkolatú terasz egy családi ház előtt', afterAlt: 'Ugyanaz a terasz antracit bioklimatikus pergolával és kerti bútorral', beforeLabel: 'Előtte', afterLabel: 'Utána', brand: 'Lamelix-szel', listBefore: ['Árlista e-mailben, napokkal később', 'A vevő katalógusból képzeli el a teraszt', 'A kérés úgy jön, hogy „kb. 5×4 méter”', 'Minden ajánlat kézzel készül'], listAfter: ['Irányár tervezés közben, este tizenegykor is', 'A terv a saját teraszáról készült fotón is megnézhető', 'A kérés a teljes konfigurációval és a terv linkjével érkezik', 'Az irányár és a terv már a kérésben van, Ön csak pontosít'] }
  return <div className="pf-page pui-lamelix lx-page" ref={root}>
    <InkDefs />
    <header className={`pf-header${scrolled ? ' is-scrolled' : ''}`}>
      <a className="pf-brand" href="#top" aria-label={n.brandAria}><LamelixLogo className="pf-logo" height={30} title={null} tone="onLight" /><small>{n.brandSmall}</small></a>
      <nav aria-label={n.mainAria}><a href="#elonyok">{n.benefits}</a><a href="#bemutato">{n.showcase}</a><a href="#funkciok">{n.features}</a><a href="#mukodes">{n.how}</a><a href="#arak">{n.pricing}</a><a href="#gyik">{n.faq}</a></nav>
      <div className="pf-header-actions"><LangSwitch /><Link className="pf-link-quiet" to="/belepes">{n.login}</Link><Link className="pf-login-icon" to="/belepes" aria-label={n.login} title={n.login}><LogIn size={18} /></Link><a className="pf-btn pf-btn-primary pf-btn-sm" href="#demo">{n.requestDemo}</a></div>
    </header>

    <main id="top">
      <Hero demoPath={DEMO_PATH} />

      <BuildSequence />

      <Suspense fallback={null}>
        <p className="lx-stats-lead">{c.v2.statsLead}</p>
        <CountingStats items={statItems} />
      </Suspense>

      <ProblemCollage />

      <WhyStrip />

      <section className="lx-compare-section" id="elotte-utana" aria-labelledby="compare-title">
        <p className="lx-eyebrow">{compare.eyebrow}</p>
        <h2 id="compare-title">{compare.title}</h2>
        <p>{compare.text}</p>
        <Suspense fallback={null}>
          <ImageCompare before={terrace('terrace-before')} after={terrace('terrace-after')} beforeAlt={compare.beforeAlt} afterAlt={compare.afterAlt} beforeLabel={compare.beforeLabel} afterLabel={compare.afterLabel} />
          <BeforeAfterList before={compare.listBefore} after={compare.listAfter} brand={compare.brand} beforeLabel={compare.beforeLabel} afterLabel={compare.afterLabel} />
        </Suspense>
        <a className="lx-btn lx-btn-ink lx-section-cta" href="#demo" data-track="ajanlatkeres">{n.requestDemo} <ArrowRight size={18} /></a>
      </section>

      <section className="pf-section lx-feature-section" id="funkciok" aria-labelledby="funkciok-title" data-pf-reveal>
        <div className="pf-head pf-head-row" data-pf-item>
          <div><p className="lx-eyebrow">{c.features.eyebrow}</p><h2 id="funkciok-title"><Em parts={c.features.title} /></h2></div>
          <p className="pf-sub">{c.features.sub}</p>
        </div>
        <FeatureScenes />
      </section>

      <AdminBoard />

      <section className="pf-section pf-live" id="mukodes-elo" aria-labelledby="live-title" data-pf-reveal>
        <div className="pf-head pf-head-row" data-pf-item>
          <div><p className="lx-eyebrow">{c.live.eyebrow}</p><h2 id="live-title"><Em parts={c.live.title} /></h2></div>
          <p className="pf-sub">{c.live.sub}</p>
        </div>
        <div className="pf-live-stage" data-pf-item>
          <Browser url="lamelix.vercel.app/demo/sb400-live"><SimFrame src="/demo/sb400-live.html" labels={{ title: c.live.iframeTitle, activate: c.live.activate, release: c.live.release, fallback: c.live.fallback, fullscreen: c.live.fullscreen }} /></Browser>
        </div>
        <ul className="pf-live-chips" data-pf-item>{c.live.chips.map((chip) => <li key={chip}><Check size={15} />{chip}</li>)}</ul>
        <div className="pf-live-note" data-pf-item><div><h3>{c.live.noteTitle}</h3><p>{c.live.note}</p></div><a className="pf-btn pf-btn-ghost" href="#demo">{c.live.cta} <ArrowRight size={17} /></a></div>
      </section>

      <section className="pf-section" id="mukodes" aria-labelledby="mukodes-title" data-pf-reveal>
        <div className="pf-head" data-pf-item><p className="lx-eyebrow">{c.how.eyebrow}</p><h2 id="mukodes-title"><Em parts={c.how.title} /></h2></div>
        <ProcessTimeline />
        <a className="lx-btn lx-btn-ink lx-section-cta" href="#demo" data-track="ajanlatkeres" data-pf-item>{n.requestDemo} <ArrowRight size={18} /></a>
      </section>

      <section className="pf-section" id="arak" aria-labelledby="arak-title" data-pf-reveal>
        <div className="pf-head pf-head-row" data-pf-item>
          <div><p className="lx-eyebrow">{pr.eyebrow}</p><h2 id="arak-title"><Em parts={pr.title} /></h2><p className="pf-sub">{pr.sub}</p></div>
          <div className="pf-billing" role="group" aria-label={pr.billingAria}><button type="button" className={annual ? '' : 'is-on'} aria-pressed={!annual} onClick={() => setAnnual(false)}>{pr.monthly}</button><button type="button" className={annual ? 'is-on' : ''} aria-pressed={annual} onClick={() => setAnnual(true)}>{pr.annual} <em>{pr.annualBadge}</em></button></div>
        </div>
        <ul className="pf-every" data-pf-item aria-label={pr.everyAria}><li className="pf-every-label">{pr.everyLabel}</li>{pr.everyPlan.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul>
        <PlanSwitch annual={annual} onChoose={choosePlan} />
        <div className="pf-setup" data-pf-item>
          <div><span className="pf-setup-icon"><Box size={22} /></span><div><strong>{pr.setupTitle(formatMoney(SETUP_FEE, lang))}</strong><p>{pr.setupLead}</p></div></div>
          <ul>{pr.setupIncludes.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
        </div>
        <RoiCalculator annual={annual} />
        <p className="pf-fineprint" data-pf-item>{pr.fineprint}</p>
        <p className="pf-demo-beta pf-pricing-beta" data-pf-item><b>β</b>{c.demo.beta}</p>
      </section>

      <section className="pf-section pf-demo" id="demo" aria-labelledby="demo-title" data-pf-reveal>
        <div className="pf-demo-copy" data-pf-item>
          <p className="lx-eyebrow">{c.demo.eyebrow}</p>
          <h2 id="demo-title"><Em parts={c.demo.title} /></h2>
          <p className="pf-sub">{c.demo.sub}</p>
          <ul className="pf-demo-points"><li><Smartphone size={18} />{c.demo.points[0]}</li><li><Table2 size={18} />{c.demo.points[1]}</li><li><Mail size={18} />{c.demo.writeUs}<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li></ul>
          {c.demo.liveNote && <p className="pf-demo-note">{c.demo.liveNote}</p>}
          <p className="pf-demo-beta"><b>β</b>{c.demo.beta}</p>
        </div>
        <div className="pf-demo-form" data-pf-item><DemoForm plan={plan} onPlan={setPlan} /></div>
      </section>

      <section className="pf-section pf-faq" id="gyik" aria-labelledby="gyik-title" data-pf-reveal>
        <FaqChat email={CONTACT_EMAIL} demoPath={DEMO_PATH} />
      </section>

      <FinalCta demoPath={DEMO_PATH} />
    </main>

    <Suspense fallback={<footer className="pf-footer">
      <a className="pf-brand" href="#top" aria-label={n.brandAria}><LamelixLogo className="pf-logo" height={28} title={null} tone="onLight" /></a>
      <p>{c.footer.text}</p>
      <nav aria-label={n.footerAria}><Link to={DEMO_PATH}>{n.liveDemo}</Link>{c.footer.sample && <Link to="/minta">{c.footer.sample}</Link>}<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><Link to="/belepes">{n.login}</Link></nav>
      <small>© {new Date().getFullYear()} Lamelix</small>
    </footer>}>
      <BigFooter company="LAMELIX" columns={footerColumns} brand={<LamelixLogo className="pf-logo" height={26} title={null} tone="onLight" />} copyright={<>© {new Date().getFullYear()} Lamelix · {c.footer.text}</>} />
    </Suspense>
  </div>
}
