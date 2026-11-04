// PERGO Studio — B2B nyitóoldal pergola- és outdoor-gyártóknak. Cél: demókérés.
// Látvány: 3D-ben dőlő termékképernyő, görgetésre kiegyenesedik; szövegfelfedés; rögzített bemutató
// (konfigurátor → lead → statisztika → mobil); a gyártói képek a saját termékből készültek (demóadatokkal).
import { useLayoutEffect, useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Box, Calculator, Check, ChevronDown, Code2, Copy, LayoutDashboard, Mail, Palette, QrCode, Send, Smartphone, Table2, Upload, Users } from 'lucide-react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { assetUrl } from '@/lib/assetUrl'
import { usePageSeo } from '@/lib/usePageSeo'
import { formatFt, monthlyPrice, PLANS, SETUP_FEE, SETUP_INCLUDES, type PlanId } from '@/lib/platformPricing'
import '@/platform.css'

gsap.registerPlugin(ScrollTrigger)

const CONTACT_EMAIL = 'hrvtadam.7@icloud.com'
const DEMO_PATH = '/k/demo'
const img = (name: string) => assetUrl(`/assets/platform/${name}.webp`)
const imgSet = (name: string) => `${img(`${name}-900`)} 900w, ${img(name)} 1600w`

function Shot({ name, alt, eager = false, sizes = '(max-width: 900px) 100vw, 60vw' }: { name: string; alt: string; eager?: boolean; sizes?: string }) {
  return <img src={img(name)} srcSet={imgSet(name)} sizes={sizes} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async" width={1600} height={1000} />
}

function Mark() {
  return <svg viewBox="0 0 34 34" aria-hidden="true"><path d="M4 27V9l13-5 13 5v18M4 15h26M10 27V15m14 12V15M4 27h26" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
}

function Browser({ children, url = 'konfigurator.ceged.hu' }: { children: ReactNode; url?: string }) {
  return <div className="pf-browser">
    <div className="pf-browser-bar" aria-hidden="true"><i /><i /><i /><span>{url}</span></div>
    <div className="pf-browser-body">{children}</div>
  </div>
}

const BENEFITS = [
  { icon: Calculator, title: 'Azonnali irányár', text: 'A vevő méretet, tetőt, oldalzárást és extrákat választ — az ár a saját árazása szerint, nettó/bruttó, telepítéssel, másodpercek alatt.', wide: true },
  { icon: QrCode, title: 'QR-kódos terv', text: 'Minden terv egy linken és QR-kódon él tovább: a vevő megosztja a családdal, Ön egy kattintással megnyitja.' },
  { icon: Users, title: 'Lead pipeline', text: 'A felmérési kérelem a teljes konfigurációval, PDF-fel és elérhetőséggel azonnal beérkezik — e-mailben és az adminban.' },
  { icon: LayoutDashboard, title: 'Gyártói admin', text: 'Érdeklődők státusszal és belső megjegyzéssel, látogatói tölcsér, CSV export. Asztalon és telefonon is.' },
  { icon: Table2, title: 'Ármátrix', text: 'Tetőtípusonként méretpár → nettó ár táblázat, akár Excelből bemásolva. A köztes méreteket a rendszer interpolálja.' },
] as const

const BEATS = [
  { id: 'konfigurator', index: '01', title: 'A vevő megtervezi.', text: 'Valós méretek, a saját háza színei, nappal és este — 3D-ben, a böngészőben, telepítés nélkül. Közben végig látja az irányárat.', image: 'studio', alt: 'A 3D pergola-konfigurátor tervező felülete irányárral' },
  { id: 'lead', index: '02', title: 'Ön kész leadet kap.', text: 'Név, telefon, település, pontos konfiguráció és irányár. Hívás, e-mail, státusz és a terv megnyitása egy panelen.', image: 'admin-leads', alt: 'Érdeklődő részletei a gyártói adminban: irányár, státusz, elérhetőség' },
  { id: 'meres', index: '03', title: 'Látja, mi működik.', text: 'Hányan nyitották meg, hányan módosítottak, hányan kértek felmérést — és mekkora nyitott érték van a csatornában.', image: 'admin-overview', alt: 'A gyártói admin áttekintése: érdeklődők, nyitott érték, látogatói tölcsér' },
  { id: 'mobil', index: '04', title: 'Terepen is kéznél.', text: 'A lead lista és a részletek telefonra optimalizálva: egy koppintás a hívás, a státusz és a terv.', image: 'admin-mobile', alt: 'Érdeklődő részletei telefonon, hívás, e-mail és terv gombokkal', phone: true },
] as const

const STEPS = [
  { icon: Upload, title: 'Átküldi a termékeit és árait', text: 'Méretkorlátok, tetőtípusok, színek, extrák és árlista vagy ármátrix — Excelben is jó.' },
  { icon: Palette, title: 'Mi beállítjuk az arculatát', text: 'Logó, színek, cégadatok, értesítési címek. Ön csak jóváhagyja.' },
  { icon: Code2, title: 'Beépítjük a weboldalába', text: 'Egy link vagy egy beágyazási kód — WordPress, Wix, Shopify vagy egyedi oldal.' },
  { icon: Mail, title: 'Érkeznek a beárazott leadek', text: 'E-mailben és az adminban, a teljes tervvel. Az árakat bármikor maga módosítja.' },
] as const

const FAQS = [
  { q: 'Mennyi idő a bevezetés?', a: 'Jellemzően 5–10 munkanap attól számítva, hogy megkaptuk a termékadatokat és az árakat. A demót még aznap megmutatjuk az Ön logójával.' },
  { q: 'Beépíthető a meglévő weboldalunkba?', a: 'Igen. Kap egy saját linket (pl. a „Tervezd meg” gombhoz) és egy beágyazási kódot, ami bármilyen weboldalon működik. A konfigurátor az Ön arculatát viseli.' },
  { q: 'Mi van, ha a termékünk eltér a demótól?', a: 'A méretkorlátok, tetőtípusok, oldalfalak, rögzítési módok, színek, extrák és árak az adminban állíthatók. Egyedi profil vagy új termék 3D modellezése külön ajánlat alapján.' },
  { q: 'Hova kerülnek a vevők adatai?', a: 'A felmérési kérelem azonnal az Ön e-mail-címére megy, és megjelenik a gyártói adminban. A vevővel Ön tartja a kapcsolatot — mi nem keressük meg.' },
  { q: 'Van hűségidő?', a: 'Nincs. A havi előfizetés a hónap végére felmondható; éves fizetésnél két hónap díját elengedjük.' },
] as const

type FormState = { status: 'idle' | 'sending' | 'sent' | 'error'; message?: string; ref?: string; fallback?: string }

function DemoForm({ plan, onPlan }: { plan: PlanId | 'unsure'; onPlan: (plan: PlanId | 'unsure') => void }) {
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
        body: JSON.stringify({ name: value('name'), company: value('company'), email: value('email'), phone: value('phone'), website: value('website'), product: value('product') || 'pergola', plan, message: value('message'), consent: form.get('consent') === 'on', fax: value('fax'), elapsedMs: Date.now() - opened }),
      })
      const data = await response.json().catch(() => null) as { ok?: boolean; ref?: string; error?: string; fallbackEmail?: string } | null
      if (response.ok && data?.ok) { setState({ status: 'sent', ref: data.ref }); return }
      setState({ status: 'error', message: data?.error ?? 'A küldés nem sikerült.', fallback: response.status === 400 ? undefined : data?.fallbackEmail ?? CONTACT_EMAIL })
    } catch {
      setState({ status: 'error', message: 'Nincs kapcsolat a szerverrel.', fallback: CONTACT_EMAIL })
    }
  }
  if (state.status === 'sent') return <div className="pf-form-done" role="status">
    <span className="pf-done-mark"><Check size={26} /></span>
    <h3>Köszönjük, megkaptuk!</h3>
    <p>1 munkanapon belül jelentkezünk egy időponttal. A demót már az Ön logójával és termékével mutatjuk meg.</p>
    {state.ref && <small>Azonosító: {state.ref}</small>}
  </div>
  return <form className="pf-form" onSubmit={submit} noValidate={false}>
    <div className="pf-form-grid">
      <label><span>Név *</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
      <label><span>Cég *</span><input name="company" required minLength={2} maxLength={160} autoComplete="organization" /></label>
      <label><span>E-mail *</span><input name="email" type="email" required maxLength={320} autoComplete="email" /></label>
      <label><span>Telefon</span><input name="phone" type="tel" maxLength={40} pattern="[+0-9 ()/\-]*" autoComplete="tel" /></label>
      <label><span>Weboldal</span><input name="website" maxLength={300} placeholder="ceged.hu" autoComplete="url" /></label>
      <label><span>Termék</span><select name="product" defaultValue="pergola"><option value="pergola">Pergola</option><option value="pergola+outdoor">Pergola + egyéb outdoor termék</option><option value="carport">Carport / előtető</option><option value="other">Egyéb</option></select></label>
    </div>
    <fieldset className="pf-plan-pick">
      <legend>Melyik csomag érdekli?</legend>
      {([...PLANS.map((item) => [item.id, item.name] as const), ['unsure', 'Még nem tudom'] as const]).map(([id, label]) => <label key={id} className={plan === id ? 'is-on' : ''}><input type="radio" name="plan" value={id} checked={plan === id} onChange={() => onPlan(id)} />{label}</label>)}
    </fieldset>
    <label className="pf-wide"><span>Üzenet</span><textarea name="message" rows={3} maxLength={2000} placeholder="Pl. milyen termékeik vannak, mikor indulnának…" /></label>
    <input className="pf-hp" name="fax" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    <label className="pf-consent"><input type="checkbox" name="consent" required /><span>Hozzájárulok, hogy a megadott adataimat a demó egyeztetéséhez felhasználják.</span></label>
    {state.status === 'error' && <div className="pf-form-error" role="alert">
      <p>{state.message}{state.fallback ? ' Írjon közvetlenül, ugyanígy válaszolunk:' : ''}</p>
      {state.fallback && <div className="pf-fallback"><a href={`mailto:${state.fallback}?subject=${encodeURIComponent('Demókérés — 3D konfigurátor')}`}>{state.fallback}</a><button type="button" onClick={() => { void navigator.clipboard?.writeText(state.fallback!).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) }).catch(() => undefined) }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Másolva' : 'Másolás'}</button></div>}
    </div>}
    <button className="pf-btn pf-btn-primary pf-submit" type="submit" disabled={state.status === 'sending'}>{state.status === 'sending' ? 'Küldés…' : <>Demót kérek <Send size={17} /></>}</button>
    <p className="pf-form-note">Válasz 1 munkanapon belül. Nem adjuk tovább az adatait.</p>
  </form>
}

export default function Platform() {
  usePageSeo('/')
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
        gsap.fromTo(section.querySelectorAll('[data-pf-item]'), { opacity: 0, y: 46, rotateX: 8 }, { opacity: 1, y: 0, rotateX: 0, duration: 1, stagger: 0.09, ease: 'power3.out', scrollTrigger: { trigger: section, start: 'top 80%', once: true } })
      })

      // Lépések: a vonal kirajzolódik.
      gsap.fromTo('.pf-steps-line i', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.pf-steps', start: 'top 75%', end: 'bottom 60%', scrub: true } })

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

  const statement = 'A vevő este tizenegykor tervez, a saját teraszára, a saját árával. Ön reggel egy kész, beárazott tervet kap — telefonszámmal.'

  return <div className="pf-page" ref={root}>
    <header className={`pf-header${scrolled ? ' is-scrolled' : ''}`}>
      <a className="pf-brand" href="#top" aria-label="PERGO Studio — az oldal teteje"><Mark /><span><strong>PERGO</strong> Studio</span><small>gyártóknak</small></a>
      <nav aria-label="Fő navigáció"><a href="#elonyok">Előnyök</a><a href="#bemutato">Bemutató</a><a href="#mukodes">Működés</a><a href="#arak">Árak</a><a href="#gyik">GYIK</a></nav>
      <div className="pf-header-actions"><Link className="pf-link-quiet" to={DEMO_PATH}>Élő demó</Link><a className="pf-btn pf-btn-primary pf-btn-sm" href="#demo">Kérek demót</a></div>
    </header>

    <main id="top">
      <section className="pf-hero" aria-labelledby="pf-title">
        <div className="pf-hero-glow" aria-hidden="true" />
        <div className="pf-hero-copy">
          <p className="pf-eyebrow pf-hero-fade"><span className="pf-pulse" />White-label 3D konfigurátor · pergola és outdoor</p>
          <h1 id="pf-title"><span className="pf-hero-line"><span>3D konfigurátor</span></span><span className="pf-hero-line"><span><em>+ lead rendszer</em></span></span><span className="pf-hero-line"><span>pergola{'\u00ad'}gyártóknak.</span></span></h1>
          <p className="pf-lead pf-hero-fade">A vevő a weboldalán megtervezi a pergoláját 3D-ben, azonnal látja az irányárat, és felmérést kér. Ön a teljes tervvel, elérhetőséggel és árral kapja meg — saját arculattal, saját árakkal.</p>
          <div className="pf-hero-actions pf-hero-fade"><a className="pf-btn pf-btn-primary" href="#demo">Kérek demót <ArrowRight size={18} /></a><Link className="pf-btn pf-btn-ghost" to={DEMO_PATH}>Kipróbálom élőben <ArrowUpRight size={17} /></Link></div>
          <ul className="pf-proof pf-hero-fade"><li><Check size={15} />Nincs telepítés</li><li><Check size={15} />Indulás 5–10 munkanap</li><li><Check size={15} />Nincs hűségidő</li></ul>
        </div>
        <div className="pf-scene" aria-hidden="false">
          <div className="pf-stage">
            <div className="pf-tilt">
              <Browser><Shot name="studio" alt="A konfigurátor: 3D pergola, méretek és azonnali bruttó irányár" eager sizes="(max-width: 900px) 100vw, 58vw" /></Browser>
              <div className="pf-chip pf-chip-a"><span>Bruttó irányár</span><strong>5 648 000 Ft</strong><small>telepítéssel · 27% ÁFA</small></div>
              <div className="pf-chip pf-chip-b"><i className="pf-chip-dot" /><div><span>Új érdeklődő · most</span><strong>Kovács Péter · Sárvár</strong><small>Aero 5,0 × 4,0 m · falhoz</small></div></div>
              <div className="pf-chip pf-chip-c"><QrCode size={30} /><div><strong>QR-kódos terv</strong><small>egy kattintás a vevő tervéig</small></div></div>
            </div>
          </div>
        </div>
      </section>

      <div className="pf-marquee" aria-hidden="true"><div className="pf-marquee-track">{[0, 1].map((copy) => <span key={copy}>{['Bioklimatikus lamella', 'Eltolható tető', 'Üvegtető', 'ZIP screen', 'Tolóüveg', 'LED és fűtés', 'Ármátrix', 'PDF összefoglaló', 'QR-kód', 'Beágyazás', 'Gyártói admin'].map((item) => <b key={item}>{item}<i>✦</i></b>)}</span>)}</div></div>

      <section className="pf-statement" aria-label="Miért">
        <p>{statement.split(' ').map((word, index) => <span className="pf-word" key={index}>{word} </span>)}</p>
      </section>

      <section className="pf-section" id="elonyok" aria-labelledby="elonyok-title" data-pf-reveal>
        <div className="pf-head" data-pf-item><p className="pf-eyebrow">01 — Előnyök</p><h2 id="elonyok-title">Minden, ami az <em>érdeklődéstől</em> a felmérésig kell.</h2></div>
        <div className="pf-bento">
          {BENEFITS.map(({ icon: Icon, title, text, ...rest }) => <article key={title} className={`pf-card${'wide' in rest && rest.wide ? ' is-wide' : ''}`} data-pf-item onPointerMove={tilt} onPointerLeave={untilt}>
            <span className="pf-card-icon"><Icon size={22} /></span><h3>{title}</h3><p>{text}</p>
          </article>)}
        </div>
      </section>

      <section className="pf-show" id="bemutato" aria-labelledby="bemutato-title">
        <div className="pf-show-pin">
          <div className="pf-show-copy">
            <p className="pf-eyebrow">02 — Bemutató</p>
            <h2 id="bemutato-title" className="sr-only">Hogyan néz ki a gyakorlatban</h2>
            <div className="pf-beats">
              {BEATS.map((beat) => <article className="pf-beat" key={beat.id}>
                <span className="pf-beat-index">{beat.index} / 04</span><h3>{beat.title}</h3><p>{beat.text}</p>
                <div className="pf-beat-media">{'phone' in beat ? <div className="pf-phone"><img src={img(beat.image)} alt={beat.alt} loading="lazy" decoding="async" width={520} height={1126} /></div> : <Browser url={beat.id === 'konfigurator' ? 'konfigurator.ceged.hu' : 'admin.pergo.studio'}><Shot name={beat.image} alt={beat.alt} /></Browser>}</div>
              </article>)}
            </div>
            <div className="pf-show-dots" aria-hidden="true">{BEATS.map((beat) => <i key={beat.id} />)}</div>
            <Link className="pf-btn pf-btn-ghost pf-show-cta" to={DEMO_PATH}>Nyissa meg az élő demót <ArrowUpRight size={17} /></Link>
          </div>
          <div className="pf-show-stage" aria-hidden="true">
            {BEATS.map((beat) => <div className="pf-show-frame" key={beat.id}>{'phone' in beat ? <div className="pf-phone"><img src={img(beat.image)} alt="" loading="lazy" decoding="async" width={520} height={1126} /></div> : <Browser url={beat.id === 'konfigurator' ? 'konfigurator.ceged.hu' : 'admin.pergo.studio'}><Shot name={beat.image} alt="" /></Browser>}</div>)}
          </div>
        </div>
      </section>

      <section className="pf-section" id="mukodes" aria-labelledby="mukodes-title" data-pf-reveal>
        <div className="pf-head" data-pf-item><p className="pf-eyebrow">03 — Működés</p><h2 id="mukodes-title">Négy lépés, és <em>él</em> a konfigurátor.</h2></div>
        <div className="pf-steps">
          <div className="pf-steps-line" aria-hidden="true"><i /></div>
          {STEPS.map(({ icon: Icon, title, text }, index) => <article key={title} data-pf-item><span className="pf-step-num">{index + 1}</span><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="pf-section" id="arak" aria-labelledby="arak-title" data-pf-reveal>
        <div className="pf-head pf-head-row" data-pf-item>
          <div><p className="pf-eyebrow">04 — Árak</p><h2 id="arak-title">Egy plusz megrendelés <em>éveket</em> fizet ki.</h2><p className="pf-sub">Egy pergolaprojekt jellemzően 3–6 millió forint. Ha a konfigurátor havonta egyetlen extra megrendelést hoz, a díja többszörösen megtérül.</p></div>
          <div className="pf-billing" role="group" aria-label="Fizetési ütem"><button type="button" className={annual ? '' : 'is-on'} aria-pressed={!annual} onClick={() => setAnnual(false)}>Havi</button><button type="button" className={annual ? 'is-on' : ''} aria-pressed={annual} onClick={() => setAnnual(true)}>Éves <em>−2 hónap</em></button></div>
        </div>
        <div className="pf-plans">
          {PLANS.map((item) => {
            const price = monthlyPrice(item, annual)
            return <article key={item.id} className={`pf-plan${item.featured ? ' is-featured' : ''}`} data-pf-item onPointerMove={tilt} onPointerLeave={untilt}>
              {item.featured && <span className="pf-plan-badge">Legnépszerűbb</span>}
              <h3>{item.name}</h3><p className="pf-plan-tag">{item.tagline}</p>
              <div className="pf-price">{price === null ? <strong>Egyedi ajánlat</strong> : <><strong>{formatFt(price)}</strong><span>/ hó</span></>}</div>
              <p className="pf-price-note">{price === null ? 'A hálózat méretétől függően' : annual ? `évente fizetve, ${formatFt(price * 12)} / év` : 'havonta fizetve, bármikor felmondható'}</p>
              <ul>{item.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
              <button type="button" className={`pf-btn ${item.featured ? 'pf-btn-primary' : 'pf-btn-ghost'}`} onClick={() => choosePlan(item.id)}>{item.monthly === null ? 'Ajánlatot kérek' : 'Demót kérek'} <ArrowRight size={17} /></button>
            </article>
          })}
        </div>
        <div className="pf-setup" data-pf-item>
          <div><span className="pf-setup-icon"><Box size={22} /></span><div><strong>Egyszeri bevezetés: {formatFt(SETUP_FEE)}</strong><p>Minden csomaghoz. Tartalmazza:</p></div></div>
          <ul>{SETUP_INCLUDES.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
        </div>
        <p className="pf-fineprint" data-pf-item>Az árak nettó árak, +27% ÁFA. Egyedi 3D profil vagy új termékcsalád modellezése külön ajánlat alapján.</p>
      </section>

      <section className="pf-section pf-demo" id="demo" aria-labelledby="demo-title" data-pf-reveal>
        <div className="pf-demo-copy" data-pf-item>
          <p className="pf-eyebrow">05 — Demó</p>
          <h2 id="demo-title">Nézze meg a <em>saját</em> termékével.</h2>
          <p className="pf-sub">20 perces online bemutató: a konfigurátort már az Ön logójával és egy termékével mutatjuk meg, és átbeszéljük, mi kell az induláshoz.</p>
          <ul className="pf-demo-points"><li><Smartphone size={18} />Kipróbálhatja telefonon is</li><li><Table2 size={18} />Hozza az árlistáját — megmutatjuk az ármátrixban</li><li><Mail size={18} />Vagy írjon: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li></ul>
        </div>
        <div className="pf-demo-form" data-pf-item><DemoForm plan={plan} onPlan={setPlan} /></div>
      </section>

      <section className="pf-section pf-faq" id="gyik" aria-labelledby="gyik-title" data-pf-reveal>
        <div className="pf-head" data-pf-item><p className="pf-eyebrow">06 — Kérdések</p><h2 id="gyik-title">Rövid válaszok.</h2></div>
        <div className="pf-faq-list">{FAQS.map((item) => <details key={item.q} data-pf-item><summary>{item.q}<ChevronDown size={18} /></summary><p>{item.a}</p></details>)}</div>
      </section>

      <section className="pf-final" aria-labelledby="final-title">
        <div className="pf-final-inner">
          <h2 id="final-title">Beszéljünk a <em>következő</em> szezonról.</h2>
          <p>Ha télen indul, tavaszra a vevői már a konfigurátorban terveznek és árat látnak — miközben máshol még árlistára várnak.</p>
          <div className="pf-hero-actions"><a className="pf-btn pf-btn-primary" href="#demo">Kérek demót <ArrowRight size={18} /></a><Link className="pf-btn pf-btn-ghost" to={DEMO_PATH}>Élő demó <ArrowUpRight size={17} /></Link></div>
        </div>
      </section>
    </main>

    <footer className="pf-footer">
      <a className="pf-brand" href="#top"><Mark /><span><strong>PERGO</strong> Studio</span></a>
      <p>White-label 3D konfigurátor és lead rendszer pergola- és outdoor-gyártóknak.</p>
      <nav aria-label="Lábléc"><Link to={DEMO_PATH}>Élő demó</Link><Link to="/ardelis">Mintaoldal (ARDELIS)</Link><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></nav>
      <small>© {new Date().getFullYear()} PERGO Studio</small>
    </footer>
  </div>
}

