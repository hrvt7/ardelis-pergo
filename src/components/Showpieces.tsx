// Látványelemek a nyitóoldalakhoz a performative-ui könyvtárból, a Lamelix témájára hangolva (pui-theme.css).
// Lustán töltődik (lazy), hogy a könyvtár ne kerüljön a konfigurátor csomagjába.
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { BigBack, SlippyWords, StatCounter, StickyBanner, WordRoll } from 'performative-ui'
import 'performative-ui/styles.css'
import '@/pui-theme.css'

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Jellemző-sorok, amelyek görgetésre ellentétes irányba csúsznak. A sorok hossza elég, hogy a szél sose üres. */
export function FeatureSlips({ rows, highlight = [] }: { rows: string[][]; highlight?: string[] }) {
  return <div className="lx-slippy" aria-hidden="true">
    <SlippyWords rows={rows.map((row) => [...row, ...row].map((label, index) => ({ label, key: `${label}-${index}`, gradient: highlight.includes(label) })))} intensity={220} gap={10} fade />
  </div>
}

/** Forgó szó a címsor feliratában (pl. PERGOLA → VERANDA → TÉLIKERT). */
export function RollingWord({ words }: { words: string[] }) {
  return <span className="lx-roll"><WordRoll words={words} intervalMs={2600} transitionMs={560} /></span>
}

export interface StatItem { value: number; suffix?: string; label: string }

/** Felfutó számok: csak akkor indulnak, amikor a sor a képernyőre ér (görgetésfigyeléssel, nem IntersectionObserverrel — az rejtett lapon késik). Valódi, katalógusból számolt értékek. */
export function CountingStats({ items }: { items: StatItem[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(REDUCED)
  useEffect(() => {
    if (live) return
    // Ha a sor már elérte a képernyő alsó részét (vagy a látogató túlgörgött rajta), indul a számlálás.
    const check = () => { const rect = ref.current?.getBoundingClientRect(); if (rect && rect.top < window.innerHeight * 0.88) setLive(true) }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [live])
  return <div className="lx-stats" ref={ref}>
    {items.map((item) => <div key={item.label}><strong>{live ? <StatCounter target={item.value} durationMs={1400} /> : <span className="pui-stat">0</span>}{item.suffix && <small>{item.suffix}</small>}</strong><span>{item.label}</span></div>)}
  </div>
}

/**
 * Ragadós CTA-sáv: akkor látszik, amikor a `after` elem már kigörgött felülre, és eltűnik, amint az `until` elem
 * a képernyőre ér (a záró szekció saját gombjával nem versenyez).
 */
export function StickyCta({ after, until, text, cta, to, theme = 'pui-lamelix' }: { after: string; until: string; text: ReactNode; cta: ReactNode; to: string; /** a témaosztály, mert a portál kívül esik az oldal gyökerén */ theme?: 'pui-lamelix' | 'pui-film' }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    // Két elem helyzete görgetésenként: olcsó, és a React csak akkor renderel, ha a láthatóság tényleg vált.
    const update = () => {
      const start = document.querySelector(after)?.getBoundingClientRect()
      const end = document.querySelector(until)?.getBoundingClientRect()
      const passed = start ? start.bottom < 0 : window.scrollY > window.innerHeight
      const ended = end ? end.top < window.innerHeight : false
      setVisible(passed && !ended)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [after, until])
  // A body-ba kerül (portál): a nyitóoldal animált szülői transzformot kapnak, ami alatt a fixed pozíció nem működne.
  return createPortal(<div className={`lx-sticky ${theme}${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
    <StickyBanner trailing={<Link to={to} tabIndex={visible ? 0 : -1}>{cta} <ArrowRight size={14} /></Link>}><span className="lx-sticky-text">{text}</span></StickyBanner>
  </div>, document.body)
}

export interface FooterColumn { heading: string; links: { label: string; href: string }[] }

/** Lábléc fal méretű felirattal: a link-oszlopok fölött az óriás, halvány LAMELIX. A belső linkek kliensoldali navigációval nyílnak. */
export function BigFooter({ company, columns, copyright, brand }: { company: string; columns: FooterColumn[]; copyright: ReactNode; brand?: ReactNode }) {
  const navigate = useNavigate()
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest('a')
    const href = anchor?.getAttribute('href') ?? ''
    if (!href.startsWith('/') || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    navigate(href)
  }
  return <div onClick={onClick}>
    <BigBack className="lx-bigback" company={company} columns={columns} copyright={<span>{brand && <span className="lx-bigback-brand">{brand}</span>}{copyright}</span>} />
  </div>
}
