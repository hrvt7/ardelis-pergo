// „Lead-utazás”: a gyártói admin pipeline-ja kódból, sötét (ink) lapon. A beérkező kérelem kártyája oszlopról
// oszlopra lép (Új → Kapcsolatban → Ajánlat kiment → Megnyert), amíg a szakasz látszik. Demóadatok, jelölve.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Phone } from 'lucide-react'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'

export default function AdminBoard() {
  const { c } = useCopy()
  const a = c.v2.admin
  const items = c.cards.lead.items
  const root = useRef<HTMLDivElement>(null)
  const [col, setCol] = useState(() => (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 3 : 0))

  useEffect(() => {
    const element = root.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    const io = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer)
      if (entry.isIntersecting) timer = window.setInterval(() => setCol((current) => (current + 1) % 4), 1900)
    }, { threshold: 0.35 })
    io.observe(element)
    return () => { io.disconnect(); window.clearInterval(timer) }
  }, [])

  return <section className="lx-admin" id="admin" aria-labelledby="admin-title">
    <div className="lx-admin-copy">
      <p className="lx-eyebrow">{a.eyebrow}</p>
      <h2 id="admin-title"><Em parts={a.title} /></h2>
      <p className="lx-sub">{a.sub}</p>
      <dl className="lx-kpis">{c.cards.admin.kpis.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <small className="lx-demo-note">{a.demoNote}</small>
    </div>
    <div className="lx-board" ref={root} role="img" aria-label={`${a.columns.join(' → ')}: ${a.card.name}, ${a.card.place}, ${a.card.price}`}>
      {a.columns.map((name, index) => <div className={`lx-col ${index === col ? 'is-target' : ''}`} key={name} aria-hidden="true">
        <header><i style={{ '--c': ['#EFF0A3', '#D8DFE9', '#F3D9A6', '#CFDECA'][index] } as CSSProperties} />{name}</header>
        {index === 0 && items[1] && <div className="lx-lcard"><span className="lx-avatar">{items[1][0]}</span><div><strong>{items[1][1]}</strong><small>{items[1][2]}</small></div><b>{items[1][3]}</b></div>}
        {index === 1 && items[2] && <div className="lx-lcard"><span className="lx-avatar">{items[2][0]}</span><div><strong>{items[2][1]}</strong><small>{items[2][2]}</small></div><b>{items[2][3]}</b></div>}
      </div>)}
      <div className="lx-lcard lx-lcard-move" aria-hidden="true" style={{ '--col': col } as CSSProperties}>
        <span className="lx-avatar">{items[0]?.[0]}</span>
        <div><strong>{a.card.name}</strong><small>{a.card.place}</small></div>
        <b>{a.card.price}</b>
        <span className="lx-call"><Phone size={13} />{a.card.call}</span>
      </div>
    </div>
  </section>
}
