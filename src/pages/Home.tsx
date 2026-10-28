import { useLayoutEffect, useRef } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, MoveRight } from 'lucide-react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import SiteHeader, { SiteFooter } from '@/components/SiteChrome'
import { PERGOLA_FAQS } from '@contracts/seo'
import { usePageSeo } from '@/lib/usePageSeo'
import '@/home-film.css'

gsap.registerPlugin(ScrollTrigger)

const details = [
  { id: '01', title: 'Szabályozható fény.', label: 'AERO / BIOKLIMATIKUS TETŐ', text: 'A motoros alumínium lamellák 0–90° között dönthetők. Így a napfény, az árnyék és a szellőzés a terasz használatához igazítható.', metric: '0—90°', art: 'louvers' },
  { id: '02', title: 'Rejtett vízelvezetés.', label: 'INTEGRÁLT VÍZELVEZETÉS', text: 'A vízgyűjtő a gerendákba, a lefolyó pedig az oszlopba integrálható. A csapadékvíz elvezetése így nem rontja el a pergola letisztult arányait.', metric: '360°', art: 'section' },
  { id: '03', title: 'Esti komfort.', label: 'KOMFORT / FÉNY / VÉDELEM', text: 'Periméter LED, ZIP screen, tolóüveg, infravörös fűtés és szenzorok is konfigurálhatók. A kiválasztott kiegészítők azonnal megjelennek a modellen.', metric: '24 / 7', art: 'light' },
]

function SplitLine({ children, italic = false }: { children: string; italic?: boolean }) {
  return <span className={`cinema-line${italic ? ' is-italic' : ''}`} aria-hidden="true">
    {Array.from(children).map((character, index) => <span className="cinema-char-mask" key={`${character}-${index}`}><span className="cinema-char">{character === ' ' ? '\u00A0' : character}</span></span>)}
  </span>
}

function OvalLink({ to, children, dark = false }: { to: string; children: string; dark?: boolean }) {
  return <Link className={`oval-link${dark ? ' is-dark' : ''}`} to={to}>
    <svg viewBox="0 0 240 76" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="120" cy="38" rx="116" ry="34" /></svg>
    <span>{children}</span><ArrowRight size={18} />
  </Link>
}

function TechnicalArt({ type }: { type: string }) {
  if (type === 'louvers') return <svg viewBox="0 0 640 360" aria-hidden="true"><defs><linearGradient id="film-blade" x1="0" x2="1"><stop stopColor="#666b67"/><stop offset=".48" stopColor="#f5f5f5"/><stop offset="1" stopColor="#414642"/></linearGradient></defs><g transform="translate(74 50)">{Array.from({ length: 7 }, (_, i) => <g key={i} transform={`translate(0 ${i * 39})`}><path d="M0 24 374 0l112 28-382 29Z" fill="url(#film-blade)" stroke="#1a1a1a" strokeOpacity=".25"/><path d="m104 57 12 8 382-29-12-8" fill="#343934"/></g>)}<path d="M0 24v242m486-238v242" stroke="#1a1a1a" strokeWidth="7"/></g></svg>
  if (type === 'section') return <svg viewBox="0 0 640 360" aria-hidden="true"><g fill="none" stroke="currentColor"><path d="M158 42h318v54H202v214h-44Z" strokeWidth="3"/><path d="M178 61h280v16H202" strokeWidth="1"/><path d="M190 103v187" strokeWidth="1" strokeDasharray="5 6"/><path d="m196 116 12 18-12 18m0 28 12 18-12 18m0 28 12 18-12 18" strokeWidth="2"/><path d="M90 310h425M90 302v16m425-16v16"/><path d="M488 42v54h-24" strokeWidth="7"/></g><circle cx="196" cy="116" r="6" fill="currentColor"/><text x="92" y="337" fill="currentColor" fontSize="11" letterSpacing="3">REJTETT FOLYÓKA / OSZLOPBAN FUTÓ LEFOLYÓ</text></svg>
  return <svg viewBox="0 0 640 360" aria-hidden="true"><defs><radialGradient id="film-glow"><stop stopColor="#f6e3b4" stopOpacity=".85"/><stop offset="1" stopColor="#f6e3b4" stopOpacity="0"/></radialGradient></defs><ellipse cx="326" cy="215" rx="250" ry="134" fill="url(#film-glow)"/><g fill="none" stroke="#f5f5f5"><path d="M109 261V99l216-58 215 60v160M109 99l216 62 215-60M325 161v102" strokeWidth="3"/><path d="m125 106 200 57 199-56" stroke="#e9c988" strokeWidth="5"/><path d="M71 263h510" strokeOpacity=".45"/></g></svg>
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

export default function Home() {
  usePageSeo('/')
  const root = useRef<HTMLDivElement>(null)
  const film = useRef<HTMLElement>(null)
  const filmStage = useRef<HTMLDivElement>(null)
  const craft = useRef<HTMLElement>(null)
  const craftTrack = useRef<HTMLDivElement>(null)
  const filmProgress = useRef<HTMLSpanElement>(null)
  const pageProgress = useRef<HTMLElement>(null)

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
      if (!reduced) {
        if (jump === null) {
          const entrance = gsap.timeline({ defaults: { ease: 'power4.out' } })
          entrance
            .fromTo('.cinema-char', { yPercent: 120 }, { yPercent: 0, duration: 1.15, stagger: 0.018 }, 0.12)
            .fromTo('.cinema-hero-visual', { clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' }, { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', duration: 1.35 }, 0)
            .fromTo('.cinema-hero-visual img', { scale: 1.13 }, { scale: 1.02, duration: 1.7 }, 0)
            .fromTo('.hero-intro-item', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.75, stagger: 0.09 }, 0.52)
            .fromTo('.hero-ghost', { opacity: 0 }, { opacity: 0.14, duration: 1.2 }, 0.65)
        }

        lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: true })
        lenis.on('scroll', ScrollTrigger.update)
        ticker = (time: number) => lenis?.raf(time * 1000)
        gsap.ticker.add(ticker)
        gsap.ticker.lagSmoothing(0)

        if (film.current && filmStage.current) {
          const beats = gsap.utils.toArray<HTMLElement>('.film-beat', film.current)
          const paths = gsap.utils.toArray<SVGPathElement>('.film-blueprint path', film.current)
          gsap.set(beats.slice(1), { autoAlpha: 0 })
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
                if (filmProgress.current) filmProgress.current.textContent = `${Math.round(self.progress * 100)}`.padStart(2, '0')
              },
            },
          })

          story
            .to('.film-media', { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.65, ease: 'power2.inOut' }, 0)
            .to('.film-media img', { scale: 1.02, duration: 1, ease: 'none' }, 0)
            .to(paths, { strokeDashoffset: 0, duration: 0.72, stagger: 0.06, ease: 'none' }, 0.05)
            .to('.film-grid', { opacity: 0, duration: 0.45 }, 0.42)
            .to('.hero-film-word', { xPercent: -9, opacity: 0.09, duration: 3.8, ease: 'none' }, 0)
            .to(beats[0], { autoAlpha: 0, y: -42, duration: 0.25 }, 0.67)
            .to('.film-blueprint', { opacity: 0, duration: 0.35 }, 0.82)
            .fromTo(beats[1], { autoAlpha: 0, y: 52 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.98)
            .to('.film-media img', { scale: 1.075, xPercent: -1.5, duration: 1, ease: 'none' }, 1)
            .to('.film-lamella-shadow', { opacity: 0.32, xPercent: 9, duration: 1, ease: 'none' }, 1)
            .to(beats[1], { autoAlpha: 0, y: -42, duration: 0.25 }, 1.67)
            .fromTo(beats[2], { autoAlpha: 0, y: 52 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 1.86)
            .to('.film-night', { opacity: 0.83, duration: 1, ease: 'none' }, 2)
            .to('.film-warm-light', { opacity: 1, duration: 0.75 }, 2.24)
            .to('.film-lamella-shadow', { opacity: 0.08, duration: 0.7 }, 2.18)
            .to(beats[2], { autoAlpha: 0, y: -42, duration: 0.25 }, 2.56)
            .fromTo(beats[3], { autoAlpha: 0, y: 52 }, { autoAlpha: 1, y: 0, duration: 0.32 }, 2.78)
            .to('.film-media img', { scale: 1.025, xPercent: 0, duration: 1, ease: 'none' }, 2.78)
            .to('.film-handoff', { opacity: 1, duration: 0.45 }, 3.35)
        }
      }
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
          },
        })
        gsap.utils.toArray<HTMLElement>('.craft-art', track).forEach((art) => {
          gsap.fromTo(art, { xPercent: -4 }, {
            xPercent: 4,
            ease: 'none',
            scrollTrigger: { trigger: art, containerAnimation: horizontal, start: 'left right', end: 'right left', scrub: true },
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
          gsap.fromTo(children, { opacity: 0, y: 34 }, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.09,
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
    <SiteHeader action={<Link className="header-studio-link" to="/studio/pergola">Megnyitom a stúdiót <ArrowUpRight size={15} /></Link>} />
    <div className="cinema-page-progress" aria-hidden="true"><i ref={pageProgress} /></div>
    <main>
      <section className="cinema-hero" aria-labelledby="home-title">
        <div className="hero-ghost" aria-hidden="true">PERGO</div>
        <div className="cinema-hero-copy">
          <div className="cinema-overline hero-intro-item"><span>ARDELIS ATELIER</span><i />BIOKLIMATIKUS PERGOLA</div>
          <h1 id="home-title" aria-label="A teraszod. Újragondolva."><SplitLine>A teraszod.</SplitLine><SplitLine italic>Újragondolva.</SplitLine></h1>
          <p className="hero-intro-item">Tervezd meg a pergolát a saját teraszod méreteihez. Állítsd be a tetőrendszert, az oldalzárást és a világítást, majd nézd meg az eredményt valós idejű 3D-ben.</p>
          <div className="cinema-hero-actions hero-intro-item"><OvalLink to="/studio/pergola">Saját pergola tervezése</OvalLink><a className="cinema-text-link" href="#elmeny">Fedezd fel <ArrowDown size={15} /></a></div>
          <div className="cinema-hero-proof hero-intro-item"><span><Check size={13} />Valós idejű 3D előnézet</span><span><Check size={13} />Azonnali irányár</span><span><Check size={13} />Felmérési kérelem a tervvel</span></div>
        </div>
        <div className="cinema-hero-visual">
          <img src="/assets/pergo-hero.webp" alt="Modern, antracit alumínium PERGO pergola egy otthon teraszán" fetchPriority="high" decoding="async" />
          <div className="cinema-hero-shade" />
          <span className="hero-edition">PERGO®<small>ATELIER SERIES / 01</small></span>
          <span className="hero-material-note">PORSZINTEREZETT ALUMÍNIUM<br />PARAMÉTERES VALÓSÁG</span>
        </div>
        <div className="hero-scroll-cue" aria-hidden="true"><span>GÖRGESS</span><i /></div>
      </section>

      <section className="cinema-intro" id="elmeny" data-cinema-reveal>
        <div className="intro-index" data-reveal-item>ARDELIS / 01<br />VALÓS MÉRETEK. ÁTLÁTHATÓ TERVEZÉS.</div>
        <div className="intro-heading" data-reveal-item><h2>Nem egy tető.<br /><em>Egy új tér.</em></h2></div>
        <div className="intro-copy" data-reveal-item><p>A bioklimatikus pergola az időjáráshoz és a terasz használatához igazodik. A dönthető lamellákkal szabályozhatod a napfényt és a szellőzést, a rejtett világítással pedig este is kellemes marad a tér.</p><Link className="text-arrow-link" to="/studio/pergola">Kipróbálom a 3D stúdiót <MoveRight /></Link></div>
        <div className="intro-facts" data-reveal-item><div><strong>0—90°</strong><span>dönthető lamellák</span></div><div><strong>180 cm</strong><span>méretarányos emberi figura</span></div><div><strong>1 terv</strong><span>3D, PDF és felmérési kérelem</span></div></div>
      </section>

      <section className="cinema-film" ref={film} aria-label="A PERGO forma, méret és fény jelenete">
        <div className="film-stage" ref={filmStage}>
          <div className="hero-film-word" aria-hidden="true">PERGO</div>
          <div className="film-media" aria-hidden="true">
            <img src="/assets/pergo-hero.webp" alt="" loading="lazy" decoding="async" />
            <div className="film-day-grade" />
            <div className="film-lamella-shadow" />
            <div className="film-night" />
            <div className="film-warm-light" />
          </div>
          <div className="film-grid" aria-hidden="true" />
          <Blueprint />
          <div className="film-topline"><span>ARDELIS / PERGO</span><span>ATELIER SERIES — 01</span></div>
          <div className="film-beats">
            <article className="film-beat beat-form"><span className="film-beat-index">01 / A FORMA</span><h2>A vonal,<br />ami <em>helyet</em><br />teremt.</h2><p>Az oszlopok, a gerendák és a tetőlamellák egyetlen arányos szerkezetet alkotnak.</p></article>
            <article className="film-beat beat-measure"><span className="film-beat-index">02 / A MÉRET</span><h2>Nem „kb.”<br /><em>Milliméter.</em></h2><p>A szélességet, a mélységet és az oszlopmagasságot centiméterben adhatod meg; a modell minden módosításnál követi a méreteket.</p></article>
            <article className="film-beat beat-light"><span className="film-beat-index">03 / A FÉNY</span><h2>A nap<br /><em>veled mozog.</em></h2><p>A motoros lamellák 0–90° között dönthetők, így a napfény, az árnyék és a szellőzés egyszerűen szabályozható.</p></article>
            <article className="film-beat beat-evening"><span className="film-beat-index">04 / AZ ÉLMÉNY</span><h2>Este sem<br /><em>vége a napnak.</em></h2><p>A ZIP screen, a tolóüveg és a periméter LED külön is konfigurálható. A terasz így az esti órákban is kényelmesen használható.</p><Link to="/studio/pergola">Tervezd meg a sajátod <ArrowUpRight /></Link></article>
          </div>
          <div className="film-bottomline"><div className="film-chapters"><span>FORMA</span><span>MÉRET</span><span>FÉNY</span><span>ÉLMÉNY</span></div><div className="film-track"><i /></div><span className="film-counter"><b ref={filmProgress}>00</b> / 100</span></div>
          <div className="film-handoff" aria-hidden="true" />
        </div>
        <div className="film-reduced"><article><h2>A forma. A méret. A fény.</h2><p>Tiszta arányok, milliméterre állítható szerkezet és 0–90° között dönthető lamellák.</p></article><article><h2>Este sem vége a napnak.</h2><p>Rejtett vízelvezetés, oldalzárás és meleg fény — a saját teraszodra tervezve.</p></article></div>
      </section>

      <section className="craft-run" ref={craft} aria-label="PERGO műszaki részletei">
        <div className="craft-heading"><span>ARDELIS / MŰSZAKI RÉSZLETEK</span><h2>A szépség<br /><em>a rendszerben van.</em></h2><p>A tetőmozgás, a vízelvezetés és az oldalzárás nem egyszerű látványelemek: a terasz mindennapi használhatóságát határozzák meg.</p></div>
        <div className="craft-track" ref={craftTrack}>
          {details.map((detail) => <article className={`craft-panel craft-${detail.art}`} key={detail.id}>
            <div className="craft-art"><TechnicalArt type={detail.art} /><strong>{detail.metric}</strong></div>
            <div className="craft-copy"><span>{detail.id} / {detail.label}</span><h3>{detail.title}</h3><p>{detail.text}</p></div>
          </article>)}
        </div>
      </section>

      <section className="studio-cinema" data-cinema-reveal>
        <div className="studio-cinema-visual" data-reveal-item><span aria-hidden="true">PERGO</span><img src="/assets/pergo-hero.webp" alt="PERGO pergola a konfigurátor vizuális környezetében" loading="lazy" decoding="async" /><Blueprint /></div>
        <div className="studio-cinema-copy" data-reveal-item><div className="cinema-section-index">02 — A STÚDIÓ</div><h2>Ne képzeld el.<br /><em>Forgasd meg.</em></h2><p>Add meg a méreteket, válaszd ki a tetőrendszert és az oldalzárást. Nézd meg a pergolát nappal, esőben vagy éjszaka — akár a kanapé nézőpontjából is.</p><ul><li><span>01</span>Valós méretarány és 180 cm-es emberi figura</li><li><span>02</span>PDF műszaki összefoglaló és megosztható terv</li><li><span>03</span>Nettó, ÁFA és bruttó irányár egy nézetben</li></ul><OvalLink to="/studio/pergola">Belépek a konfigurátorba</OvalLink></div>
      </section>

      <section className="cinema-process" id="folyamat" data-cinema-reveal>
        <div className="cinema-section-index" data-reveal-item>03 — A TERVTŐL A FELMÉRÉSIG</div>
        <div className="cinema-process-heading" data-reveal-item><h2>Egy terv.<br /><em>Négy egyszerű lépés.</em></h2><p>A tervhez műszaki összefoglaló és egyedi projektazonosító tartozik, így a felmérésig ugyanazt a konfigurációt használjuk.</p></div>
        <div className="cinema-process-steps" data-reveal-item>{[
          ['01','Konfigurálsz','Méret, tetőrendszer, szín, oldalzárás és komfort — valós 3D-ben.'],
          ['02','Elmented','PDF-et és megosztható hivatkozást készítesz ugyanarról a tervről.'],
          ['03','Felmérést kérsz','A tervet a kapcsolati adataiddal együtt, valós projektkérelemként elküldöd.'],
          ['04','Egyeztetünk','Az AR-azonosítóval követheted a kérésed. A végleges ár felmérés után készül.'],
        ].map(([number,title,text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="cinema-knowledge" id="utmutato" aria-labelledby="guide-title" data-cinema-reveal>
        <div className="knowledge-heading" data-reveal-item><div className="cinema-section-index">04 — TERVEZÉSI ÚTMUTATÓ</div><h2 id="guide-title">Mire figyelj<br /><em>pergolát tervezel?</em></h2><p>A jó pergola nem csak a terasz méretéhez passzol. A rögzítés, a vízelvezetés, a nyílászárók és a mindennapi használat együtt határozza meg a megfelelő kialakítást.</p></div>
        <div className="knowledge-grid" data-reveal-item>
          <article><span>01 / MÉRET ÉS ELHELYEZÉS</span><h3>A külső méret csak a kezdet.</h3><p>A tervezéshez a rendelkezésre álló felületen kívül a nyílászárók, az eresz, a burkolat és a kerti mozgás is számít. A konfigurátor külső szerkezeti méreteket kezel; a pontos rögzítési pontokat helyszínen kell ellenőrizni.</p></article>
          <article><span>02 / TETŐ ÉS OLDALZÁRÁS</span><h3>A használat választja ki a rendszert.</h3><p>A dönthető lamellák a fényt és a szellőzést szabályozzák, a ZIP screen oldalirányú védelmet adhat, a tolóüveg pedig zártabb teret alkothat. A tető és az oldalzárás együtt határozza meg, hogy a terasz milyen időjárásban lesz kényelmes.</p></article>
          <article><span>03 / IRÁNYÁR ÉS FELMÉRÉS</span><h3>A kalkulációt felmérés követi.</h3><p>A konfigurátor a beállításaidból és szerkeszthető mintaárakból számol tájékoztató irányárat. A végleges műszaki tartalom és ár a rögzítési felületek, a vízelvezetés, az elektromos csatlakozások és a kiegészítők helyszíni ellenőrzése után készül.</p></article>
        </div>
      </section>

      <section className="cinema-faq" id="gyik" aria-labelledby="faq-title" data-cinema-reveal>
        <div className="faq-heading" data-reveal-item><div className="cinema-section-index">05 — GYAKORI KÉRDÉSEK</div><h2 id="faq-title">Rövid válaszok<br /><em>a pergolatervezésről.</em></h2><p>Az alábbi válaszok a tervezés legfontosabb kérdéseit foglalják össze. A konkrét műszaki megoldás mindig a helyszíntől és a végleges kivitelezéstől függ.</p></div>
        <div className="faq-list" data-reveal-item>{PERGOLA_FAQS.map((item, index) => <details key={item.question}><summary><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.question}</strong><i aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
      </section>

      <section className="cinema-final" data-cinema-reveal><div data-reveal-item><span>ARDELIS / PERGO</span><h2>Kezdd el a saját<br /><em>pergolád tervezését.</em></h2></div><Link to="/studio/pergola" aria-label="Pergola tervezés indítása" data-reveal-item><span>KEZDD EL</span><ArrowUpRight /></Link></section>
    </main>
    <SiteFooter />
  </div>
}
