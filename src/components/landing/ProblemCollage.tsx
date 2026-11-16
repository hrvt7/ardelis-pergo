// „Rendrakás”: a mai ajánlatkérés szétszórt papírjai (Excel-árlista, telefonos kérdés, PDF-katalógus, visszahívó
// cetli, színkérdés, kézzel írt ajánlat) görgetésre középre húzódnak, és egyetlen Lamelix-tervlappá rendeződnek.
// Kódból rajzolt vonalas SVG-k; a haladás egy CSS-változó (--p), így minden képkockán csak egy szám változik.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { formatMoney } from '@/lib/platformPricing'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'
import { BUILD_PRICES } from './buildData'

const INK = '#212121'

/** A cetlik vonalrajza (1,5 px ink körvonal, pasztell kitöltés). */
const SCRAP_ART: ReactNode[] = [
  // Excel-táblázat
  <svg key="xls" viewBox="0 0 120 80" aria-hidden="true"><rect x="2" y="2" width="116" height="76" rx="6" fill="#fff" stroke={INK} strokeWidth="1.5" /><rect x="2" y="2" width="116" height="16" rx="6" fill="#CFDECA" stroke={INK} strokeWidth="1.5" />{[34, 50, 66].map((y) => <line key={y} x1="2" x2="118" y1={y} y2={y} stroke={INK} strokeWidth="1" opacity=".35" />)}{[40, 78].map((x) => <line key={x} x1={x} x2={x} y1="18" y2="78" stroke={INK} strokeWidth="1" opacity=".35" />)}<rect x="44" y="38" width="30" height="9" rx="2" fill="#EFF0A3" /><text x="10" y="13" fontSize="8" fontWeight="700" fill={INK}>A</text><text x="46" y="13" fontSize="8" fontWeight="700" fill={INK}>B</text></svg>,
  // beszédbuborék telefonnal
  <svg key="call" viewBox="0 0 120 80" aria-hidden="true"><path d="M10 8h100a8 8 0 0 1 8 8v34a8 8 0 0 1-8 8H42l-14 14v-14H10a8 8 0 0 1-8-8V16a8 8 0 0 1 8-8z" fill="#fff" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" /><path d="M20 26h70M20 38h48" stroke={INK} strokeWidth="1.5" strokeLinecap="round" /><circle cx="96" cy="38" r="7" fill="#EFF0A3" stroke={INK} strokeWidth="1.5" /><text x="93.5" y="41.5" fontSize="10" fontWeight="700" fill={INK}>?</text></svg>,
  // PDF-katalógus
  <svg key="pdf" viewBox="0 0 120 80" aria-hidden="true"><path d="M30 4h44l16 16v56H30z" fill="#fff" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" /><path d="M74 4v16h16" fill="none" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" /><rect x="38" y="28" width="44" height="22" rx="3" fill="#D8DFE9" stroke={INK} strokeWidth="1.2" /><path d="M42 46l9-9 7 6 6-5 14 8" fill="none" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" /><path d="M38 58h44M38 66h30" stroke={INK} strokeWidth="1.5" strokeLinecap="round" /></svg>,
  // visszahívó cetli
  <svg key="note" viewBox="0 0 120 80" aria-hidden="true"><path d="M24 6h72v58l-14 12H24z" fill="#EFF0A3" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" /><path d="M82 76V64h14" fill="none" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" /><path d="M34 22h50M34 34h38M34 46h44" stroke={INK} strokeWidth="1.5" strokeLinecap="round" /><circle cx="60" cy="6" r="4" fill={INK} /></svg>,
  // színkérdés
  <svg key="color" viewBox="0 0 120 80" aria-hidden="true"><rect x="8" y="10" width="104" height="60" rx="10" fill="#fff" stroke={INK} strokeWidth="1.5" />{[['#373F43', 30], ['#F1F0EA', 60], ['#6B4F35', 90]].map(([fill, x]) => <circle key={String(x)} cx={Number(x)} cy="40" r="12" fill={String(fill)} stroke={INK} strokeWidth="1.5" />)}<text x="54" y="66" fontSize="10" fontWeight="700" fill={INK}>?</text></svg>,
  // kézzel írt ajánlat
  <svg key="doc" viewBox="0 0 120 80" aria-hidden="true"><rect x="28" y="4" width="64" height="72" rx="4" fill="#fff" stroke={INK} strokeWidth="1.5" /><path d="M36 18c6-3 12 3 18 0s12 3 18 0 8 2 12 0M36 32c8-3 14 3 22 0s10 2 18 0M36 46c5-2 10 2 16 0" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" /><path d="M64 58l14-14 5 5-14 14-7 2z" fill="#CFDECA" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" /></svg>,
]

/** A cetlik kiinduló helye (a középponthoz képest, vw/vh) és elforgatása. */
const SPOTS: readonly { x: number; y: number; r: number }[] = [
  { x: -34, y: -22, r: -9 }, { x: 30, y: -26, r: 7 }, { x: -38, y: 18, r: 6 }, { x: 34, y: 20, r: -8 }, { x: -12, y: -34, r: 4 }, { x: 10, y: 30, r: -5 },
]

export default function ProblemCollage() {
  const { lang, c } = useCopy()
  const p = c.v2.problem
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = section.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { element.style.setProperty('--p', '1'); return }
    let raf = 0
    const update = () => {
      raf = 0
      const box = element.getBoundingClientRect()
      const span = Math.max(1, box.height - window.innerHeight)
      const value = Math.min(1, Math.max(0, -box.top / span))
      element.style.setProperty('--p', value.toFixed(3))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  return <section className="lx-problem" id="elonyok" ref={section} aria-labelledby="problem-title">
    <div className="lx-problem-sticky">
      <div className="lx-problem-head">
        <p className="lx-eyebrow">{p.eyebrow}</p>
        <h2 id="problem-title"><Em parts={p.title} /></h2>
        <p className="lx-sub">{p.sub}</p>
        <a className="lx-btn lx-btn-ink lx-problem-cta" href="#demo" data-track="ajanlatkeres">{c.nav.requestDemo} <ArrowRight size={18} /></a>
      </div>
      <div className="lx-problem-field">
        <ul className="lx-scraps">
          {p.scraps.map((label, index) => <li key={label} className="lx-scrap" style={{ '--x': SPOTS[index].x, '--y': SPOTS[index].y, '--r': SPOTS[index].r, '--i': index } as CSSProperties}>
            {SCRAP_ART[index]}<span>{label}</span>
          </li>)}
        </ul>
        <article className="lx-plan" aria-label={p.solved}>
          <header><span className="lx-plan-mark" aria-hidden="true">L</span><div><strong>{p.solved}</strong><small>{p.solvedSub}</small></div></header>
          <dl>{c.v2.steps.slice(0, 6).map((name, index) => <div key={name}><dt>{name}</dt><dd>{c.v2.build.picks[index]}</dd></div>)}</dl>
          <footer><span>{c.v2.build.priceLabel}</span><strong>{formatMoney(BUILD_PRICES[6]!, lang)}</strong></footer>
        </article>
      </div>
    </div>
  </section>
}
