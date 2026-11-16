import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { getDisplayCurrency } from '@/lib/money'
import { FileText } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'
import { ROOF_INFO } from '@/lib/roofs'
import { computeLeadStats, computePipeline, STATUS_COLORS, type LeadRow } from '@/lib/adminLeads'
import { computeFunnel, type EventRow } from '@/lib/adminStats'
import { eventTotals, SCENE_SPEED, STEP_REACH } from '@/lib/statsFunnel'
import type { RoofType } from '@/types/pergola'
import { Checklist, type ChecklistItem } from '@/components/admin/adminKit'
import Workspace from '@/components/admin/Workspace'

const compactHuf = (value: number) => (getDisplayCurrency() === 'HUF' && value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString('hu-HU', { maximumFractionDigits: 1 })} M Ft` : formatPrice(value))
const shortDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })

/**
 * Sima, monoton görbe a pontokon át (Fritsch–Carlson): nem lő túl a pontokon,
 * így nulla napnál sem bukik a tengely alá, és csúcsot sem talál ki.
 */
function smoothPath(points: [number, number][]) {
  const n = points.length
  if (n < 2) return ''
  const dx = points.slice(1).map((point, i) => point[0] - points[i][0])
  const slope = points.slice(1).map((point, i) => (point[1] - points[i][1]) / (dx[i] || 1))
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0]
    if (i === n - 1) return slope[n - 2]
    const a = slope[i - 1]
    const b = slope[i]
    return a * b <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / a + (dx[i] + 2 * dx[i - 1]) / b)
  })
  let path = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const h = dx[i] / 3
    path += ` C${x0 + h},${y0 + tangent[i] * h} ${x1 - h},${y1 - tangent[i + 1] * h} ${x1},${y1}`
  }
  return path
}

function CountValue({ value }: { value: string }) {
  const match = /^(\d[\d\s\u00a0]*)(.*)$/.exec(value)
  const target = match ? Number(match[1].replace(/[\s\u00a0]/g, '')) : NaN
  const grouped = Boolean(match && /[\s\u00a0]/.test(match[1].trim()))
  const [shown, setShown] = useState(() => (Number.isFinite(target) && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : target))
  useEffect(() => {
    if (!Number.isFinite(target) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { const id = window.setTimeout(() => setShown(target), 0); return () => window.clearTimeout(id) }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => { const t = Math.min(1, (now - start) / 800); setShown(Math.round(target * (1 - Math.pow(1 - t, 3)))); if (t < 1) frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])
  if (!match || !Number.isFinite(target)) return <>{value}</>
  return <span aria-label={value}>{grouped ? shown.toLocaleString('hu-HU').replace(/\u00a0/g, ' ') : shown}{match[2]}</span>
}

function AreaChart({ daily }: { daily: { day: string; count: number }[] }) {
  const id = useId()
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const width = 900
  const height = 220
  // A tengely felső értéke 3 többszöröse, így mind a négy rácsvonal egész számot jelöl.
  const max = Math.ceil(Math.max(3, ...daily.map((item) => item.count)) / 3) * 3
  const left = 34
  const x = (index: number) => left + (index / Math.max(1, daily.length - 1)) * (width - left - 8)
  const base = height - 26
  const y = (count: number) => base - (count / max) * (height - 40)
  const points = daily.map((item, index): [number, number] => [x(index), y(item.count)])
  const line = smoothPath(points)
  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    setHover(Math.min(daily.length - 1, Math.max(0, Math.round(((event.clientX - box.left) / box.width) * (daily.length - 1)))))
  }
  const active = hover === null ? null : daily[hover]
  return <div className="area-wrap">
    <svg ref={ref} className="area" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Érdeklődők száma naponta" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent-primary)" stopOpacity=".32" /><stop offset="1" stopColor="var(--accent-primary)" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3].map((i) => <g key={i}><line x1={left} x2={width} y1={14 + (i * (height - 40)) / 3} y2={14 + (i * (height - 40)) / 3} className="area-grid" /><text x={left - 10} y={18 + (i * (height - 40)) / 3} textAnchor="end" className="area-axis">{(max * (3 - i)) / 3}</text></g>)}
      <path d={`${line} L${x(daily.length - 1)},${base} L${x(0)},${base} Z`} fill={`url(#${id})`} />
      <path d={line} className="area-line" />
      {active && hover !== null && <g><line x1={x(hover)} x2={x(hover)} y1="8" y2={base} className="area-cursor" /><circle cx={x(hover)} cy={y(active.count)} r="5" className="area-dot" /></g>}
      <text x={left} y={height} className="area-axis">{shortDate(daily[0].day)}</text>
      <text x={(left + width) / 2} y={height} textAnchor="middle" className="area-axis">{shortDate(daily[Math.floor(daily.length / 2)].day)}</text>
      <text x={width - 8} y={height} textAnchor="end" className="area-axis">{shortDate(daily[daily.length - 1].day)}</text>
    </svg>
    {active && hover !== null && <div className="area-tip" style={{ left: `${(x(hover) / width) * 100}%` }}><b>{active.count}</b> érdeklődő<small>{shortDate(active.day)}</small></div>}
  </div>
}

function FunnelCard({ events, recent }: { events: EventRow[] | null; recent: number }) {
  if (events === null) return <p className="admin-hint">Betöltés…</p>
  const funnel = computeFunnel(events, recent)
  if (funnel.steps[0].count === 0) return <p className="admin-hint">Még nincs látogatottsági adat. A mérés a konfigurátor első megnyitásától indul (futtasd a supabase/events.sql-t, ha még nem tetted).</p>
  const max = funnel.steps[0].count
  return <div className="funnel">
    {funnel.steps.map((step, index) => <div className="funnel-step" key={step.key}>
      <div className="funnel-bar" style={{ ['--w' as string]: `${Math.max(4, (step.count / max) * 100)}%`, ['--shade' as string]: String(1 - index * 0.16) }}><span>{step.label}</span><strong>{step.count}</strong></div>
      {step.rate !== null && <em>{Math.round(step.rate * 100)}%</em>}
    </div>)}
    <p className="admin-hint">Névtelen, süti nélküli eseményszámlálás az elmúlt 30 napról: a lépések nem kapcsolódnak egyedi látogatói úthoz, ezért az arányok közelítő értékek. Becsült konverzió: <strong>{funnel.conversion === null ? '—' : `${(funnel.conversion * 100).toLocaleString('hu-HU', { maximumFractionDigits: 1 })}%`}</strong> (felmérési kérés / megnyitás).</p>
  </div>
}

/** Lépésenkénti elérés és a 3D betöltési idő sávjai (névtelen eseményszámokból, közelítő értékek). */
function StepReach({ events }: { events: EventRow[] | null }) {
  if (events === null) return <p className="admin-hint">Betöltés…</p>
  const steps = eventTotals(events, STEP_REACH)
  const speed = eventTotals(events, SCENE_SPEED)
  if (steps.slice(1).every((step) => step.count === 0)) return <p className="admin-hint">A lépésenkénti mérés most indult; az első adatok néhány látogatás után jelennek meg itt.</p>
  const loads = speed.reduce((sum, item) => sum + item.count, 0)
  return <>
    <HBars items={steps.map((step) => ({ key: step.label, count: step.count }))} empty="Nincs adat." />
    {loads > 0 && <p className="admin-hint">A 3D kép betöltése: {speed.map((item) => `${item.label}: ${Math.round((item.count / loads) * 100)}%`).join(' · ')} ({loads} megnyitás, becsült sávok).</p>}
  </>
}

function HBars({ items, empty }: { items: { key: string; count: number }[]; empty: string }) {
  if (items.length === 0) return <p className="admin-hint">{empty}</p>
  const max = Math.max(...items.map((item) => item.count))
  return <ul className="hbars">{items.map((item) => <li key={item.key}><span>{item.key}</span><div><i style={{ width: `${(item.count / max) * 100}%` }} /></div><strong>{item.count}</strong></li>)}</ul>
}

function PipelineCard({ leads }: { leads: LeadRow[] }) {
  const pipeline = computePipeline(leads)
  const max = Math.max(1, ...pipeline.stages.map((stage) => stage.value))
  return <section className="card pipeline">
    <header><h2>Értékesítési csatorna</h2></header>
    <div className="pipe-forecast"><span>Súlyozott várható bevétel</span><strong><CountValue value={compactHuf(pipeline.forecast)} /></strong><small>megnyert eddig: {compactHuf(pipeline.wonValue)}</small></div>
    <ul className="pipe-stages">{pipeline.stages.map((stage) => <li key={stage.key}>
      <div><span><i style={{ background: STATUS_COLORS[stage.key] }} />{stage.label}</span><b>{stage.count} db · {compactHuf(stage.value)}</b></div>
      <div className="pipe-bar"><i style={{ width: `${(stage.value / max) * 100}%`, background: STATUS_COLORS[stage.key] }} /></div>
      <small>{Math.round(stage.odds * 100)}% lezárási esély (becslés)</small>
    </li>)}</ul>
  </section>
}

const RANGES = [7, 30, 90] as const

export default function AdminOverview({ leads, events, onOpenLeads, onOpenLead, onUpdate, checklist }: { leads: LeadRow[]; events: EventRow[] | null; onOpenLeads: () => void; onOpenLead: (ref: string) => void; onUpdate: (ref: string, patch: { status: string }) => void; checklist?: ChecklistItem[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const [now] = useState(() => Date.now())
  const stats = computeLeadStats(leads, now, range)
  const delta = stats.last7 - stats.prev7
  const setupOpen = checklist?.some((item) => !item.done)

  return <div className="dash">
    <Workspace leads={leads} onOpenLead={onOpenLead} onOpenLeads={onOpenLeads} onUpdate={onUpdate} />
    <div className="dash-grid">
      {setupOpen && checklist && <div className="span-2"><Checklist items={checklist} /></div>}
      <PipelineCard leads={leads} />
      <section className="card span-2">
        <header><h2>Érkező érdeklődők</h2><button type="button" className="ghost-link report-btn" onClick={() => window.print()}><FileText size={14} />Jelentés (PDF)</button><div className="seg" role="group" aria-label="Időszak">{RANGES.map((value) => <button type="button" key={value} className={range === value ? 'is-on' : ''} onClick={() => setRange(value)}>{value} nap</button>)}</div></header>
        {leads.length === 0 ? <p className="admin-hint empty-hint">Még nem érkezett érdeklődő. Amint valaki felmérést kér, itt jelenik meg a grafikon.</p> : <AreaChart daily={stats.daily} />}
        <p className="admin-hint chart-note">{stats.last7} érdeklődő az elmúlt 7 napban{delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta} az előző héthez képest)` : ''} · átlagos irányár {compactHuf(stats.averageGross)}</p>
      </section>
      <details className="card span-2 dash-more">
        <summary><h2>Látogatottság és statisztika</h2><span>Konverzió, lépések, tetőtípusok, települések</span></summary>
        <div className="dash-more-grid">
          <section className="span-2"><h3>Eseményszámok és becsült konverzió</h3><FunnelCard events={events} recent={stats.last30} /></section>
          <section><h3>Meddig jutnak a lépésekben?</h3><StepReach events={events} /></section>
          <section><h3>Népszerű tetőtípusok</h3><HBars items={stats.byRoof.map((item) => ({ key: ROOF_INFO[item.key as RoofType]?.name ?? item.key, count: item.count }))} empty="Nincs adat." /></section>
          <section><h3>Települések</h3><HBars items={stats.byPlace} empty="Nincs adat." /></section>
        </div>
      </details>
    </div>
  </div>
}
