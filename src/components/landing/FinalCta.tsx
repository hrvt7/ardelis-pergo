// Záró blokk: a funkciók vonalrajz-csempéi két sorban lassan úsznak, középen elmosott fehér sávon a cím és a gombok.
import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'
import { SCENES, type Labels } from './featureArt'

const ROW_A = ['ar', 'sun', 'pdf', 'photo', 'budget'] as const
const ROW_B = ['night', 'advisor', 'energy', 'ar', 'sun'] as const
const ROW_C = ['budget', 'photo', 'night', 'pdf', 'advisor'] as const

export default function FinalCta({ demoPath }: { demoPath: string }) {
  const { c } = useCopy()
  const labels: Labels = c.features.visual
  const row = (ids: readonly (keyof typeof SCENES)[], dir: string) => <div className={`lx-tiles ${dir}`} aria-hidden="true">
    {[0, 1].map((copy) => <div className="lx-tiles-track" key={copy}>{ids.map((id, index) => <div className={`lx-tile ${id === 'night' ? 'is-ink' : ''}`} key={`${id}${index}`}>{SCENES[id](labels)}</div>)}</div>)}
  </div>
  return <section className="lx-final" aria-labelledby="final-title">
    {row(ROW_A, 'is-left')}
    {row(ROW_B, 'is-right')}
    {row(ROW_C, 'is-left')}
    <div className="lx-final-band">
      <h2 id="final-title"><Em parts={c.final.title} /></h2>
      <p>{c.final.text}</p>
      <div className="lx-actions"><a className="lx-btn lx-btn-ink" href="#demo" data-track="ajanlatkeres">{c.nav.requestDemo} <ArrowRight size={18} /></a><Link className="lx-btn lx-btn-line" to={demoPath} data-track="elo_demo">{c.nav.liveDemo} <ArrowUpRight size={17} /></Link></div>
    </div>
  </section>
}
