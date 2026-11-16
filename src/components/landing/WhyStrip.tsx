// A brief három érve a versenytársakkal szemben, egy sorban, egy-egy kis vonalrajzzal, a végén a fő cél.
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'

const S = { fill: 'none', stroke: '#212121', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
// A termék saját geometriájából rajzolt jelenetek (nem általános ikonok): lamellás tető árcímkével, PDF-terv
// QR-kóddal, és a weboldalba épített konfigurátor pipával.
const ICONS: ReactNode[] = [
  <svg key="huf" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="14" width="40" height="8" rx="2" {...S} style={{ fill: '#D8DFE9' }} /><path d="M12 14v8M18 14v8M24 14v8M30 14v8M36 14v8M42 14v8M10 22v26M42 22v26M4 48h44" {...S} /><rect x="34" y="30" width="26" height="15" rx="5" {...S} style={{ fill: '#fff' }} /><text x="47" y="41" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#212121">Ft</text></svg>,
  <svg key="plan" viewBox="0 0 64 64" aria-hidden="true"><path d="M14 6h24l12 12v40H14z" {...S} style={{ fill: '#fff' }} /><path d="M38 6v12h12" {...S} /><path d="M20 26h24M22 26v12M42 26v12M20 24l4-3h16l4 3" {...S} style={{ fill: '#CFDECA' }} /><path d="M20 46h6v6h-6zM30 46h6v6h-6zM20 52h0M40 46h4M40 52h4" {...S} style={{ fill: '#212121' }} /></svg>,
  <svg key="live" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="50" height="40" rx="6" {...S} style={{ fill: '#fff' }} /><path d="M6 19h50" {...S} /><path d="M18 30h26M20 30v13M42 30v13M18 28l3-3h20l3 3" {...S} /><circle cx="50" cy="48" r="9" {...S} style={{ fill: '#CFDECA' }} /><path d="M46 48l3 3 5-6" {...S} /></svg>,
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
