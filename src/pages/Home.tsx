import { useLayoutEffect, useRef, useState } from 'react'
import { assetUrl } from '@/lib/assetUrl'
import { ArrowDown, ArrowRight, ArrowUpRight, Armchair, Check, FileText, Home as HomeIcon, MoveRight, Ruler, Share2, SunMedium, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import SiteHeader, { SiteFooter } from '@/components/SiteChrome'
import { PERGOLA_FAQS } from '@contracts/seo'
import '@/legal.css'
import { usePageSeo } from '@/lib/usePageSeo'
import { WALL_COLORS, WINDOW_COLORS } from '@/lib/house'
import '@/home-film.css'

gsap.registerPlugin(ScrollTrigger)

/** Saját 3D stúdiónkból renderelt képek (public/assets/home). */
const shot = (name: string) => assetUrl(`/assets/home/${name}.webp`)
const shotSet = (name: string) => `${assetUrl(`/assets/home/${name}-960.webp`)} 960w, ${shot(name)} 1920w`

function Shot({ name, alt, className, eager = false, sizes = '100vw' }: { name: string; alt: string; className?: string; eager?: boolean; sizes?: string }) {
  return <img className={className} src={shot(name)} srcSet={shotSet(name)} sizes={sizes} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async" />
}

const FACADE_COUNT = Object.values(WALL_COLORS).reduce((sum, list) => sum + list.length, 0)

const CHAPTERS = [
  ['elmeny', 'Élmény'],
  ['film', 'Forma'],
  ['szinek', 'Színek'],
  ['reszletek', 'Részletek'],
  ['studio', 'Stúdió'],
  ['folyamat', 'Folyamat'],
  ['gyik', 'Kérdések'],
] as const

const PALETTE = [
  { id: 'anthracite', label: 'Antracit', code: 'RAL 7016', swatch: '#383e42', image: 'hero', note: 'A legkeresettebb: modern, vakolt homlokzathoz és sötét ablakkerethez.' },
  { id: 'white', label: 'Fehér', code: 'RAL 9016', swatch: '#f1f0ea', image: 'color-white', note: 'Világos, könnyed hatás. Sötét homlokzat előtt kiemeli a szerkezetet.' },
  { id: 'black', label: 'Mélyfekete', code: 'RAL 9005', swatch: '#141618', image: 'color-black', note: 'Grafikus, határozott vonal. Fekete nyílászárókkal egy rendszert alkot.' },
  { id: 'wood', label: 'Aranytölgy', code: 'Fa hatású', swatch: '#a8743d', image: 'color-wood', note: 'Meleg, természetes tónus fa hatású ablakokhoz és kerti környezethez.' },
] as const

const DETAILS = [
  { id: '01', image: 'detail', title: 'Szabályozható fény.', label: 'BIOKLIMATIKUS LAMELLATETŐ', text: 'A motoros alumínium lamellák 0–90° között dönthetők. A napfény, az árnyék és a szellőzés a nap minden órájában a terasz használatához igazítható.', metric: '0–90°' },
  { id: '02', image: 'glass-shade', title: 'Üveg alatt is árnyék.', label: 'ÜVEGTETŐ + MOTOROS ÁRNYÉKOLÓ', text: 'Üveg- és polikarbonát tetőhöz tető feletti vagy tető alatti motoros ponyva választható, négy színben. A 3D-ben egy kattintással ki- és behúzható.', metric: '2 típus' },
  { id: '03', image: 'sides', title: 'Zárd, ahol kell.', label: 'ZIP SCREEN / TOLÓÜVEG / LAMELLAFAL', text: 'Minden oldal külön zárható ZIP screennel, tolóüveggel vagy fix lamellafallal. A modell és az irányár minden változtatást azonnal követ.', metric: '4 oldal' },
]

const FEATURES = [
  { icon: HomeIcon, title: 'A saját házad előtt', text: `${FACADE_COUNT} homlokzati szín vakolt, tégla és fa felülettel, ${WINDOW_COLORS.length} nyílászáró-szín — vagy szín egy fotóról.`, wide: true, image: 'color-white' },
  { icon: Ruler, title: 'Centiméterre pontos', text: 'Méretcímkék és 180 cm-es emberi figura a valós arányokhoz.' },
  { icon: SunMedium, title: 'Napállás és este', text: 'Nappal, aranyórában vagy éjjel, LED-del: úgy látod, ahogy élni fogod.' },
  { icon: Wallet, title: 'Költségkeret-tervező', text: 'Megadod a keretet, a stúdió megmutatja, mit érdemes elhagyni vagy cserélni.' },
  { icon: Share2, title: 'Megosztható terv', text: 'Link és kép a családnak — ugyanazt a tervet látja mindenki.' },
  { icon: FileText, title: 'PDF összefoglaló', text: 'Méretek, anyaglista, irányár és a ház leírása egy dokumentumban.' },
  { icon: Armchair, title: 'Ülj le benne', text: 'Kanapé-nézet: a terasz belülről, a lamellák alól.', wide: true, image: 'sofa' },
] as const

function SplitLine({ children, italic = false }: { children: string; italic?: boolean }) {
  return <span className={`cinema-line${italic ? ' is-italic' : ''}`} aria-hidden="true">
    {Array.from(children).map((character, index) => <span className="cinema-char-mask" key={`${character}-${index}`}><span className="cinema-char">{character === ' ' ? ' ' : character}</span></span>)}
  </span>
}

function OvalLink({ to, children, dark = false }: { to: string; children: string; dark?: boolean }) {
  return <Link className={`oval-link${dark ? ' is-dark' : ''}`} to={to}>
    <svg viewBox="0 0 240 76" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="120" cy="38" rx="116" ry="34" /></svg>
    <span>{children}</span><ArrowRight size={18} />
  </Link>
}

function Blueprint() {
  return <svg className="film-blueprint" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g fill="none">
      <path pathLength="1" d="M175 592V260l402-129 450 132v329M175 260l402 132 450-129M577 392v200" />
      <path pathLength="1" d="m205 274 372 118 419-119M236 288l341 108 387-108M268 302l309 98 356-98" />
      <path pathLength="1" d="M128 622h946M128 612v20m946-20v20M150 665h860" />
      <path pathLength="1" d="M1090 260h58v332h-58M1138 260h20m-20 332h20" />
    </g>
  </svg>
}

const MARQUEE = ['Bioklimatikus lamella', 'Üvegtető', 'Motoros árnyékoló', 'ZIP screen', 'Tolóüveg', 'Periméter LED', 'Infra fűtés', 'Napelem', 'Okosotthon', 'Szenzorok']

export default function Home() {
  usePageSeo('/minta')
  const root = useRef<HTMLDivElement>(null)
  const film = useRef<HTMLElement>(null)
  const filmStage = useRef<HTMLDivElement>(null)
  const craft = useRef<HTMLElement>(null)
  const craftTrack = useRef<HTMLDivElement>(null)
  const filmProgress = useRef<HTMLSpanElement>(null)
  const pageProgress = useRef<HTMLElement>(null)
  const [color, setColor] = useState<(typeof PALETTE)[number]['id']>('anthracite')
  const [chapter, setChapter] = useState('')
  const active = PALETTE.find((item) => item.id === color)!

  useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const readyWindow = window as Window & { __ready?: boolean }
    readyWindow.__ready = false
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const jump = new URLSearchParams(window.location.search).get('jump')
    let disposed = false
    let lenis: Lenis | undefined
    let ticker: ((time: number) => void) | undefined
    let settleFrame = 0
    const heroImage = element.querySelector<HTMLImageElement>('.cinema-hero-visual img')

    const settle = () => {
      if (disposed) return
      ScrollTrigger.refresh()
      lenis?.resize()
      if (jump !== null) {
        window.scrollTo(0, Number(jump) || 0)
        ScrollTrigger.update()
      } else if (window.location.hash) {
        const anchor = document.getElementById(window.location.hash.slice(1))
        if (anchor) {
          const top = anchor.getBoundingClientRect().top + window.scrollY
          if (lenis) lenis.scrollTo(top, { immediate: true, force: true })
          else window.scrollTo(0, top)
          ScrollTrigger.update()
        }
      }
      settleFrame = requestAnimationFrame(() => {
        if (!disposed) readyWindow.__ready = true
      })
    }

    if (heroImage && !heroImage.complete) {
      heroImage.addEventListener('load', settle, { once: true })
      heroImage.addEventListener('error', settle, { once: true })
    }

    if (reduced) element.classList.add('reduced-motion')

    const context = gsap.context(() => {
      // Aktív fejezet (oldalsó index) — mozgáscsökkentésnél is működik.
      CHAPTERS.forEach(([id]) => {
        const section = document.getElementById(id)
        if (section) ScrollTrigger.create({ trigger: section, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => { if (self.isActive) setChapter(id) } })
      })
      ScrollTrigger.create({ trigger: '.cinema-hero', start: 'top top', end: 'bottom 55%', onToggle: (self) => { if (self.isActive) setChapter('') } })

      if (reduced) return

      if (jump === null) {
        const entrance = gsap.timeline({ defaults: { ease: 'power4.out' } })
        entrance
          .fromTo('.cinema-char', { yPercent: 120 }, { yPercent: 0, duration: 1.15, stagger: 0.018 }, 0.12)
          .fromTo('.cinema-hero-visual', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.35 }, 0)
          .fromTo('.cinema-hero-visual img', { scale: 1.16 }, { scale: 1.04, duration: 1.8 }, 0)
          .fromTo('.hero-intro-item', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.75, stagger: 0.09 }, 0.52)
          .fromTo('.hero-ghost', { opacity: 0 }, { opacity: 0.1, duration: 1.2 }, 0.65)
      }

      // Hero: a kép lassabban mozog, a szöveg elhalványul görgetéskor.
      gsap.to('.cinema-hero-visual img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.cinema-hero', start: 'top top', end: 'bottom top', scrub: true } })
      gsap.to('.cinema-hero-copy', { yPercent: -18, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.cinema-hero', start: 'top top', end: 'bottom top', scrub: true } })

      lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: true })
      lenis.on('scroll', ScrollTrigger.update)
      ticker = (time: number) => lenis?.raf(time * 1000)
      gsap.ticker.add(ticker)
      gsap.ticker.lagSmoothing(0)

      // Futószalag: görgetési sebességtől függő dőlés és gyorsulás.
      const marquee = element.querySelector<HTMLElement>('.cinema-marquee-track')
      if (marquee) {
        const loop = gsap.to(marquee, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 })
        const skew = gsap.quickTo(marquee, 'skewX', { duration: 0.5, ease: 'power3' })
        ScrollTrigger.create({
          trigger: '.cinema-marquee', start: 'top bottom', end: 'bottom top',
          onUpdate: (self) => {
            const velocity = gsap.utils.clamp(-1, 1, self.getVelocity() / 2400)
            skew(velocity * -7)
            loop.timeScale(1 + Math.abs(velocity) * 5)
          },
        })
      }

      // Számlálók.
      gsap.utils.toArray<HTMLElement>('[data-count]', element).forEach((counter) => {
        const target = Number(counter.dataset.count)
        const state = { value: 0 }
        gsap.to(state, { value: target, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: counter, start: 'top 85%', once: true }, onUpdate: () => { counter.textContent = String(Math.round(state.value)) } })
      })

      // Képek: belépéskor kinyíló maszk + finom parallaxis.
      gsap.utils.toArray<HTMLElement>('[data-clip]', element).forEach((frame) => {
        gsap.fromTo(frame, { clipPath: 'inset(14% 10% 14% 10%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', scrollTrigger: { trigger: frame, start: 'top 92%', end: 'top 35%', scrub: 0.6 } })
      })
      gsap.utils.toArray<HTMLElement>('[data-parallax]', element).forEach((image) => {
        const amount = Number(image.dataset.parallax) || 10
        gsap.fromTo(image, { yPercent: -amount }, { yPercent: amount, ease: 'none', scrollTrigger: { trigger: image.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } })
      })

      if (film.current && filmStage.current) {
        const beats = gsap.utils.toArray<HTMLElement>('.film-beat', film.current)
        const shots = gsap.utils.toArray<HTMLElement>('.film-shot', film.current)
        const paths = gsap.utils.toArray<SVGPathElement>('.film-blueprint path', film.current)
        gsap.set(beats.slice(1), { autoAlpha: 0 })
        gsap.set(shots.slice(1), { autoAlpha: 0 })
        gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 })

        const story = gsap.timeline({
          scrollTrigger: {
            trigger: film.current,
            start: 'top top',
            end: () => `+=${window.innerHeight * 4.2}`,
            pin: filmStage.current,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              film.current?.style.setProperty('--film-progress', `${self.progress}`)
              film.current?.style.setProperty('--film-chapter', `${Math.min(3, Math.floor(self.progress * 4))}`)
              if (filmProgress.current) filmProgress.current.textContent = `${Math.round(self.progress * 100)}`.padStart(2, '0')
            },
          },
        })

        const swap = (index: number, at: number) => {
          story
            .to(beats[index - 1], { autoAlpha: 0, y: -42, duration: 0.25 }, at - 0.3)
            .fromTo(shots[index], { autoAlpha: 0, scale: 1.12 }, { autoAlpha: 1, scale: 1.02, duration: 0.55, ease: 'power2.inOut' }, at - 0.28)
            .fromTo(beats[index], { autoAlpha: 0, y: 52 }, { autoAlpha: 1, y: 0, duration: 0.3 }, at)
        }

        story
          .to('.film-media', { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.65, ease: 'power2.inOut' }, 0)
          .to(shots[0], { scale: 1.02, duration: 1, ease: 'none' }, 0)
          .to(paths, { strokeDashoffset: 0, duration: 0.72, stagger: 0.06, ease: 'none' }, 0.05)
          .to('.film-grid', { opacity: 0, duration: 0.45 }, 0.42)
          .to('.hero-film-word', { xPercent: -9, opacity: 0.06, duration: 3.8, ease: 'none' }, 0)
          .to('.film-blueprint', { opacity: 0, duration: 0.35 }, 0.82)
        swap(1, 1)
        story.to(shots[1], { scale: 1.08, xPercent: -1.5, duration: 0.9, ease: 'none' }, 1.1)
        swap(2, 1.9)
        story.to(shots[2], { scale: 1.08, xPercent: 1.5, duration: 0.9, ease: 'none' }, 2)
        swap(3, 2.8)
        story
          .to(shots[3], { scale: 1.06, duration: 0.9, ease: 'none' }, 2.9)
          .to('.film-handoff', { opacity: 1, duration: 0.45 }, 3.35)
      }

      // Folyamat: a vonal a görgetéssel rajzolódik ki.
      gsap.fromTo('.process-line i', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.cinema-process-steps', start: 'top 80%', end: 'bottom 55%', scrub: true } })
      gsap.utils.toArray<HTMLElement>('.cinema-process-steps article', element).forEach((step, index) => {
        gsap.fromTo(step, { opacity: 0.18 }, { opacity: 1, scrollTrigger: { trigger: '.cinema-process-steps', start: `top ${80 - index * 7}%`, end: `top ${66 - index * 7}%`, scrub: true } })
      })

      // Záró blokk: a kép lassan közelít.
      gsap.fromTo('.cinema-final-media img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.cinema-final', start: 'top bottom', end: 'bottom bottom', scrub: true } })
    }, element)

    const media = gsap.matchMedia()
    if (!reduced) {
      media.add('(min-width: 821px)', () => {
        if (!craft.current || !craftTrack.current) return
        const track = craftTrack.current
        const distance = () => Math.max(1, track.scrollWidth - window.innerWidth)
        const horizontal = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: craft.current,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => craft.current?.style.setProperty('--craft-progress', `${self.progress}`),
          },
        })
        gsap.utils.toArray<HTMLElement>('.craft-art img', track).forEach((image) => {
          gsap.fromTo(image, { xPercent: -6 }, {
            xPercent: 6,
            ease: 'none',
            scrollTrigger: { trigger: image.parentElement, containerAnimation: horizontal, start: 'left right', end: 'right left', scrub: true },
          })
        })
      })

      context.add(() => {
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: (self) => {
            element.classList.toggle('is-scrolled', window.scrollY > 32)
            if (pageProgress.current) pageProgress.current.style.transform = `scaleX(${self.progress})`
          },
        })

        gsap.utils.toArray<HTMLElement>('[data-cinema-reveal]', element).forEach((section) => {
          const children = section.querySelectorAll('[data-reveal-item]')
          gsap.fromTo(children, { opacity: 0, y: 40 }, {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: section, start: 'top 78%', once: true },
          })
        })
      })
    }

    if (!heroImage || heroImage.complete) settle()

    return () => {
      disposed = true
      if (settleFrame) cancelAnimationFrame(settleFrame)
      heroImage?.removeEventListener('load', settle)
      heroImage?.removeEventListener('error', settle)
      if (ticker) gsap.ticker.remove(ticker)
      lenis?.destroy()
      media.revert()
      context.revert()
    }
  }, [])

  return <div className="marketing-page cinema-page" ref={root}>
    <SiteHeader action={<Link className="header-studio-link" to="/konfigurator">Megnyitom a stúdiót <ArrowUpRight size={15} /></Link>} />
    <aside className="sample-banner" role="note"><b>Élő termékbemutató</b><span>Ez egy minta gyártói oldal: a Lamelix konfigurátor-szoftvert fejleszt gyártóknak, kivitelezést nem vállal.</span><Link to="/">Lamelix gyártóknak →</Link></aside>
    <div className="cinema-page-progress" aria-hidden="true"><i ref={pageProgress} /></div>
    <nav className={`chapter-rail${chapter ? ' is-visible' : ''}`} aria-label="Fejezetek">
      {CHAPTERS.map(([id, label], index) => <a key={id} href={`#${id}`} className={chapter === id ? 'is-active' : ''} aria-current={chapter === id ? 'true' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><b>{label}</b></a>)}
    </nav>
    <main>
      <section className="cinema-hero" aria-labelledby="home-title">
        <div className="hero-ghost" aria-hidden="true">PERGO</div>
        <div className="cinema-hero-copy">
          <div className="cinema-overline hero-intro-item"><span>LAMELIX</span><i />PERGOLA · VERANDA · TÉLIKERT</div>
          <h1 id="home-title" aria-label="A teraszod. Újragondolva."><SplitLine>A teraszod.</SplitLine><SplitLine italic>Újragondolva.</SplitLine></h1>
          <p className="hero-intro-item">Tervezd meg a pergolát, a verandát vagy a télikertet a saját teraszod méreteire, a saját házad színei elé. Tetőrendszer, oldalzárás, üvegfal, árnyékolás és fény — valós idejű 3D-ben, azonnali irányárral.</p>
          <div className="cinema-hero-actions hero-intro-item"><OvalLink to="/konfigurator">Saját teraszfedés tervezése</OvalLink><a className="cinema-text-link" href="#elmeny">Fedezd fel <ArrowDown size={15} /></a></div>
          <div className="cinema-hero-proof hero-intro-item"><span><Check size={14} />Valós idejű 3D</span><span><Check size={14} />Azonnali irányár</span><span><Check size={14} />PDF és felmérés</span></div>
        </div>
        <div className="cinema-hero-visual">
          <Shot name="hero-golden" alt="Antracit bioklimatikus pergola egy vakolt családi ház teraszán, aranyórában" eager sizes="(max-width: 820px) 100vw, 60vw" />
          <div className="cinema-hero-shade" />
          <span className="hero-edition">PERGO®<small>ATELIER SERIES / 01</small></span>
          <span className="hero-material-note">A KÉP A 3D STÚDIÓBAN KÉSZÜLT<br />5,4 × 4,0 M · RAL 7016</span>
        </div>
        <div className="hero-scroll-cue" aria-hidden="true"><span>GÖRGESS</span><i /></div>
      </section>

      <div className="cinema-marquee" aria-hidden="true"><div className="cinema-marquee-track">{[...MARQUEE, ...MARQUEE].map((item, index) => <span key={index}>{item}<i>✦</i></span>)}</div></div>

      <section className="cinema-intro" id="elmeny" data-cinema-reveal>
        <div className="intro-index" data-reveal-item>LAMELIX / 01<br />VALÓS MÉRETEK.<br />ÁTLÁTHATÓ TERVEZÉS.</div>
        <div className="intro-heading" data-reveal-item><h2>Nem egy tető.<br /><em>Egy új tér.</em></h2></div>
        <div className="intro-copy" data-reveal-item><p>A bioklimatikus pergola az időjáráshoz és a terasz használatához igazodik: a dönthető lamellákkal szabályozod a napfényt és a szellőzést. A veranda fix tetővel és üvegfallal zárt, évszaktól függetlenül használható tér; a télikert hőszigetelt üvegszerkezettel fűthető-hűthető, akár egész éves nappali.</p><Link className="text-arrow-link" to="/konfigurator">Kipróbálom a 3D stúdiót <MoveRight /></Link></div>
        <div className="intro-facts" data-reveal-item>
          <div><strong><b data-count="90">90</b>°</strong><span>a lamellák legnagyobb dőlésszöge</span></div>
          <div><strong><b data-count={FACADE_COUNT}>{FACADE_COUNT}</b></strong><span>homlokzati szín a házadhoz</span></div>
          <div><strong><b data-count={WINDOW_COLORS.length}>{WINDOW_COLORS.length}</b></strong><span>nyílászáró-szín</span></div>
          <div><strong><b data-count="1">1</b></strong><span>terv: 3D, PDF és felmérés</span></div>
        </div>
      </section>

      <section className="cinema-film" id="film" ref={film} aria-label="A PERGO forma, méret, fény és este jelenete">
        <div className="film-stage" ref={filmStage}>
          <div className="hero-film-word" aria-hidden="true">PERGO</div>
          <div className="film-media" aria-hidden="true">
            <Shot className="film-shot" name="hero" alt="" />
            <Shot className="film-shot" name="dims" alt="" />
            <Shot className="film-shot" name="glass-shade" alt="" />
            <Shot className="film-shot" name="night" alt="" />
            <div className="film-day-grade" />
          </div>
          <div className="film-grid" aria-hidden="true" />
          <Blueprint />
          <div className="film-topline"><span>LAMELIX / TERASZFEDÉS</span><span>MINDEN KÉP A 3D STÚDIÓBÓL</span></div>
          <div className="film-beats">
            <article className="film-beat beat-form"><span className="film-beat-index">01 / A FORMA</span><h2>A vonal,<br />ami <em>helyet</em><br />teremt.</h2><p>Oszlop, gerenda és lamella egyetlen arányos szerkezetben — a te házad előtt, a te homlokzatszíneddel.</p></article>
            <article className="film-beat beat-measure"><span className="film-beat-index">02 / A MÉRET</span><h2>Nem „körülbelül”.<br /><em>Centiméterre.</em></h2><p>Szélesség, mélység és magasság centiméterre. A méretcímkék és az emberi léptékű figura megmutatják, mekkora lesz valójában a tér.</p></article>
            <article className="film-beat beat-light"><span className="film-beat-index">03 / A FÉNY</span><h2>A fény<br /><em>a te kezedben.</em></h2><p>Lamellatető, üvegtető vagy polikarbonát — üveg alá és fölé motoros árnyékolóval. A fényt te szabod meg.</p></article>
            <article className="film-beat beat-evening"><span className="film-beat-index">04 / AZ ESTE</span><h2>Napnyugta után is<br /><em>a tiéd a terasz.</em></h2><p>Periméter LED, infra fűtés, hangszórók és oldalzárás. Az éjszakai nézetben pontosan látod, milyen lesz.</p><Link to="/konfigurator">Tervezd meg a sajátod <ArrowUpRight /></Link></article>
          </div>
          <div className="film-bottomline"><div className="film-chapters"><span>FORMA</span><span>MÉRET</span><span>FÉNY</span><span>ESTE</span></div><div className="film-track"><i /></div><span className="film-counter"><b ref={filmProgress}>00</b> / 100</span></div>
          <div className="film-handoff" aria-hidden="true" />
        </div>
        <div className="film-reduced">
          <article><Shot name="dims" alt="Teraszfedés méretcímkékkel és emberi léptékű figurával" /><h2>Centiméterre pontos.</h2><p>Szélesség, mélység és magasság centiméterre, méretcímkékkel és emberi figurával.</p></article>
          <article><Shot name="night" alt="Teraszfedés éjszaka, bekapcsolt LED világítással" /><h2>Napnyugta után is a tiéd a terasz.</h2><p>Periméter LED, infra fűtés és oldalzárás — az éjszakai nézetben is.</p></article>
        </div>
      </section>

      <section className="cinema-colors" id="szinek" aria-labelledby="colors-title" data-cinema-reveal>
        <div className="colors-copy" data-reveal-item>
          <div className="cinema-section-index">02 — SZÍN ÉS HÁZ</div>
          <h2 id="colors-title">Illik<br /><em>a házadhoz?</em></h2>
          <p>A stúdióban a mintaház homlokzatát és ablakait a saját házadra állítod — vakolt, tégla vagy fa felület, a leggyakoribb színekkel, vagy egy fotóról vett árnyalattal. Utána a szerkezet színe egy kattintással igazítható a nyílászárókhoz.</p>
          <div className="colors-picker" role="radiogroup" aria-label="Szerkezet színe">
            {PALETTE.map((item) => <button key={item.id} type="button" role="radio" aria-checked={color === item.id} className={color === item.id ? 'is-active' : ''} onClick={() => setColor(item.id)}>
              <i style={{ background: item.swatch }} /><span><strong>{item.label}</strong><small>{item.code}</small></span>
            </button>)}
          </div>
          <p className="colors-note" aria-live="polite">{active.note}</p>
        </div>
        <div className="colors-stage" data-reveal-item>
          <div className="colors-frame" data-clip>
            {PALETTE.map((item) => <Shot key={item.id} className={color === item.id ? 'is-active' : ''} name={item.image} alt={item.id === color ? `${item.label} szerkezet a 3D stúdióban` : ''} sizes="(max-width: 820px) 100vw, 58vw" />)}
            <span className="colors-tag"><i style={{ background: active.swatch }} />{active.label} · {active.code}</span>
          </div>
          <div className="colors-house" aria-hidden="true">{Object.values(WALL_COLORS).flat().slice(0, 12).map((item) => <i key={item.hex} style={{ background: item.hex }} />)}<span>+ fotóról</span></div>
        </div>
      </section>

      <section className="craft-run" id="reszletek" ref={craft} aria-label="PERGO műszaki részletei">
        <div className="craft-heading"><span>03 — RÉSZLETEK</span><h2>A szépség<br /><em>a részletekben van.</em></h2><p>A tetőmozgás, az árnyékolás és az oldalzárás nem díszítőelem: a terasz mindennapi használhatóságát határozzák meg. Mindegyik ki- és bekapcsolható a 3D-ben.</p></div>
        <div className="craft-track" ref={craftTrack}>
          {DETAILS.map((detail) => <article className="craft-panel" key={detail.id}>
            <div className="craft-art"><Shot name={detail.image} alt={detail.title} sizes="(max-width: 820px) 100vw, 45vw" /><strong>{detail.metric}</strong></div>
            <div className="craft-copy"><span>{detail.id} / {detail.label}</span><h3>{detail.title}</h3><p>{detail.text}</p></div>
          </article>)}
        </div>
        <div className="craft-progress" aria-hidden="true"><i /></div>
      </section>

      <section className="cinema-bento" id="studio" aria-labelledby="studio-title" data-cinema-reveal>
        <div className="bento-heading" data-reveal-item><div className="cinema-section-index">04 — A STÚDIÓ</div><h2 id="studio-title">Ne csak képzeld el.<br /><em>Forgasd meg.</em></h2><p>Egy tervezőasztal, ami a vásárló nyelvén beszél: amit beállítasz, azt azonnal látod — és tudod, mennyibe kerül.</p></div>
        <div className="bento-grid">
          {FEATURES.map((feature) => { const Icon = feature.icon; return <article key={feature.title} className={'wide' in feature && feature.wide ? 'is-wide' : ''} data-reveal-item>
            {'image' in feature && feature.image && <div className="bento-media"><Shot name={feature.image} alt="" sizes="(max-width: 820px) 100vw, 50vw" /></div>}
            <div className="bento-copy"><Icon size={22} strokeWidth={1.4} /><h3>{feature.title}</h3><p>{feature.text}</p></div>
          </article> })}
        </div>
        <div className="bento-cta" data-reveal-item><OvalLink to="/konfigurator">Belépek a stúdióba</OvalLink></div>
      </section>

      <section className="cinema-process" id="folyamat" data-cinema-reveal>
        <div className="cinema-section-index" data-reveal-item>05 — A TERVTŐL A FELMÉRÉSIG</div>
        <div className="cinema-process-heading" data-reveal-item><h2>Egy terv.<br /><em>Négy egyszerű lépés.</em></h2><p>A tervhez műszaki összefoglaló tartozik, így a felmérésig mindenki ugyanazt a konfigurációt látja: te, a családod és a szakember.</p></div>
        <div className="process-line" aria-hidden="true"><i /></div>
        <div className="cinema-process-steps">{[
          ['01', 'Megtervezed', 'Méret, tetőrendszer, szín, oldalzárás és komfort — a saját házad előtt, valós 3D-ben.'],
          ['02', 'Elmented', 'PDF-et és megosztható linket készítesz, hogy a család is lássa ugyanazt a tervet.'],
          ['03', 'Felmérést kérsz', 'A tervet a neved és elérhetőséged mellé csatolva egy kattintással elküldöd a gyártónak.'],
          ['04', 'Egyeztettek', 'A szakember a terved alapján keres meg. A végleges ár a helyszíni felmérés után készül.'],
        ].map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="cinema-knowledge" id="utmutato" aria-labelledby="guide-title" data-cinema-reveal>
        <div className="knowledge-heading" data-reveal-item><div className="cinema-section-index">06 — TERVEZÉSI ÚTMUTATÓ</div><h2 id="guide-title">Mire figyelj,<br /><em>ha teraszfedést tervezel?</em></h2><p>A jó teraszfedés nemcsak a terasz méretéhez passzol. A rögzítés, a vízelvezetés, a nyílászárók és a mindennapi használat együtt határozza meg a megfelelő kialakítást.</p></div>
        <div className="knowledge-grid" data-reveal-item>
          <article><span>01 / MÉRET ÉS ELHELYEZÉS</span><h3>A külső méret csak a kezdet.</h3><p>A tervezéshez a rendelkezésre álló felületen kívül a nyílászárók, az eresz, a burkolat és a kerti mozgás is számít. A konfigurátor külső szerkezeti méreteket kezel; a pontos rögzítési pontokat helyszínen kell ellenőrizni.</p></article>
          <article><span>02 / TETŐ ÉS OLDALZÁRÁS</span><h3>A használat választja ki a rendszert.</h3><p>A dönthető lamellák a fényt és a szellőzést szabályozzák, az üvegtető alá vagy fölé motoros árnyékoló kerülhet, a ZIP screen és a tolóüveg oldalirányú védelmet ad. Verandánál és télikertnél fix vagy üvegtető, üvegfal, ajtó, hőszigetelés és klíma is a tervezés része.</p></article>
          <article><span>03 / IRÁNYÁR ÉS FELMÉRÉS</span><h3>A kalkulációt felmérés követi.</h3><p>A konfigurátor a beállításaidból tájékoztató irányárat számol. A végleges műszaki tartalom és ár a rögzítési felületek, a vízelvezetés, az elektromos csatlakozások és a kiegészítők helyszíni ellenőrzése után készül.</p></article>
        </div>
      </section>

      <section className="cinema-faq" id="gyik" aria-labelledby="faq-title" data-cinema-reveal>
        <div className="faq-heading" data-reveal-item><div className="cinema-section-index">07 — GYAKORI KÉRDÉSEK</div><h2 id="faq-title">Rövid válaszok<br /><em>a pergola-, veranda- és télikerttervezésről.</em></h2><p>Az alábbi válaszok a tervezés legfontosabb kérdéseit foglalják össze. A konkrét műszaki megoldás mindig a helyszíntől és a végleges kivitelezéstől függ.</p></div>
        <div className="faq-list" data-reveal-item>{PERGOLA_FAQS.map((item, index) => <details key={item.question}><summary><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.question}</strong><i aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
      </section>

      <section className="cinema-final" aria-labelledby="final-title">
        <div className="cinema-final-media" aria-hidden="true"><Shot name="night" alt="" /></div>
        <div className="cinema-final-copy"><span>LAMELIX / TERASZFEDÉS</span><h2 id="final-title">Kezdd el a saját<br /><em>teraszod tervezését.</em></h2><p>Öt perc, és látod a teraszod — nappal és este, a saját házad előtt.</p></div>
        <Link className="cinema-final-button" to="/konfigurator" aria-label="Tervezés indítása"><span>KEZDD EL</span><ArrowUpRight /></Link>
      </section>
    </main>
    <SiteFooter />
  </div>
}
