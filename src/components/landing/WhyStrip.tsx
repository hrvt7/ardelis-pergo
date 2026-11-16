// A brief három érve a versenytársakkal szemben, egy sorban, egy-egy kis vonalrajzzal, a végén a fő cél.
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'

const S = { fill: 'none', stroke: '#212121', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const ICONS: ReactNode[] = [
  <svg key="huf" viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="14" width="48" height="36" rx="8" {...S} style={{ fill: '#EFF0A3' }} /><text x="32" y="38" textAnchor="middle" fontSize="15" fontWeight="700" fill="#212121">Ft</text></svg>,
  <svg key="home" viewBox="0 0 64 64" aria-hidden="true"><path d="M12 30L32 12l20 18v22H12z" {...S} style={{ fill: '#CFDECA' }} /><rect x="24" y="34" width="16" height="12" rx="2" {...S} style={{ fill: '#fff' }} /><path d="M28 40h8" {...S} /></svg>,
  <svg key="days" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="14" width="44" height="40" rx="8" {...S} style={{ fill: '#D8DFE9' }} /><path d="M10 26h44M22 10v8M42 10v8" {...S} /><path d="M24 40l6 6 12-12" {...S} /></svg>,
]

export default function WhyStrip() {
  const { c } = useCopy()
  const w = c.v2.why
  return <section className="lx-why" aria-labelledby="why-title" data-pf-reveal>
    <h2 id="why-title" data-pf-item><Em parts={w.title} /></h2>
    <ul>{w.items.map(([title, text], index) => <li key={title} data-pf-item>{ICONS[index]}<div><h3>{title}</h3><p>{text}</p></div></li>)}</ul>
    <a className="lx-btn lx-btn-ink" href="#demo" data-track="ajanlatkeres" data-pf-item>{c.nav.requestDemo} <ArrowRight size={18} /></a>
  </section>
}
