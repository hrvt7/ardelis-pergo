import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { ArrowDownRight, ArrowUpRight, FileText, PhoneCall } from 'lucide-react'
import { formatHuf } from '@/lib/pricing'
import { ROOF_INFO } from '@/lib/roofs'
import { computeLeadStats, computePipeline, initials, STATUS_COLORS, timeAgo, LEAD_STATUSES, type LeadRow } from '@/lib/adminLeads'
import { computeFunnel, type EventRow } from '@/lib/adminStats'
import type { RoofType } from '@/types/pergola'
import { Checklist, type ChecklistItem } from '@/components/admin/adminKit'

const compactHuf = (value: number) => (value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString('hu-HU', { maximumFractionDigits: 1 })} M Ft` : formatHuf(value))
const shortDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
const STATUS_LABEL = Object.fromEntries(LEAD_STATUSES) as Record<string, string>

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

function Sparkline({ values }: { values: number[] }) {
  const id = useId()
  const max = Math.max(1, ...values)
  const points = values.map((value, index): [number, number] => [(index / Math.max(1, values.length - 1)) * 100, 26 - (value / max) * 22])
  const line = smoothPath(points)
  return <svg className="kpi-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent-primary)" stopOpacity=".35" /><stop offset="1" stopColor="var(--accent-primary)" stopOpacity="0" /></linearGradient></defs>
    <path d={`${line} L100,30 L0,30 Z`} fill={`url(#${id})`} /><path d={line} className="kpi-spark-line" vectorEffect="non-scaling-stroke" />
  </svg>
}

/** Számfelfutás a KPI-értéken („12 480 Ft”, „37”, „4,2%”): az első számcsoport fut fel, a többi marad. */
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

function Kpi({ label, value, hint, delta, spark, ring }: { label: string; value: string; hint?: string; delta?: number | null; spark?: number[]; ring?: number | null }) {
  return <div className="kpi" onPointerMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--mx', `${event.clientX - box.left}px`); event.currentTarget.style.setProperty('--my', `${event.clientY - box.top}px`) }}>
    <div className="kpi-head"><span>{label}</span>{delta != null && delta !== 0 && <em className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta)}</em>}</div>
    <strong><CountValue value={value} /></strong>
    {hint && <small>{hint}</small>}
    {spark && <Sparkline values={spark} />}
    {ring != null && <svg className="kpi-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" className="kpi-ring-track" /><circle cx="18" cy="18" r="15" className="kpi-ring-fill" strokeDasharray={`${ring * 94.2} 94.2`} transform="rotate(-90 18 18)" /></svg>}
  </div>
}

function AreaChart({ daily }: { daily: { day: string; count: number }[] }) {
  const id = useId()
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const width = 900
  const height = 220
  const max = Math.max(3, ...daily.map((item) => item.count))
  const x = (index: number) => 8 + (index / Math.max(1, daily.length - 1)) * (width - 16)
  const y = (count: number) => height - 14 - (count / max) * (height - 40)
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
      {[0, 1, 2, 3].map((i) => <line key={i} x1="0" x2={width} y1={14 + (i * (height - 40)) / 3} y2={14 + (i * (height - 40)) / 3} className="area-grid" />)}
      <path d={`${line} L${x(daily.length - 1)},${height - 14} L${x(0)},${height - 14} Z`} fill={`url(#${id})`} />
      <path d={line} className="area-line" />
      {active && hover !== null && <g><line x1={x(hover)} x2={x(hover)} y1="8" y2={height - 14} className="area-cursor" /><circle cx={x(hover)} cy={y(active.count)} r="5" className="area-dot" /></g>}
      <text x="8" y={height} className="area-axis">{shortDate(daily[0].day)}</text>
      <text x={width / 2} y={height} textAnchor="middle" className="area-axis">{shortDate(daily[Math.floor(daily.length / 2)].day)}</text>
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
    <p className="admin-hint">Névtelen, süti nélküli mérés, az elmúlt 30 nap. Összesített konverzió: <strong>{funnel.conversion === null ? '—' : `${(funnel.conversion * 100).toLocaleString('hu-HU', { maximumFractionDigits: 1 })}%`}</strong> (megnyitásból felmérési kérés).</p>
  </div>
}

function HBars({ items, empty }: { items: { key: string; count: number }[]; empty: string }) {
  if (items.length === 0) return <p className="admin-hint">{empty}</p>
  const max = Math.max(...items.map((item) => item.count))
  return <ul className="hbars">{items.map((item) => <li key={item.key}><span>{item.key}</span><div><i style={{ width: `${(item.count / max) * 100}%` }} /></div><strong>{item.count}</strong></li>)}</ul>
}

const DAY = 86_400_000

/** „Ma teendő”: a következő lépésre váró érdeklődők a kor szerint (új: első hívás, kapcsolatban: 3 nap, ajánlat: 5 nap után utánkövetés). */
function TodayCard({ leads, now, onOpen }: { leads: LeadRow[]; now: number; onOpen: (ref: string) => void }) {
  const age = (lead: LeadRow) => (now - new Date(lead.created_at).getTime()) / DAY
  const tasks = leads.flatMap((lead) => {
    if (lead.status === 'new') return [{ lead, why: age(lead) < 1 ? 'Új, első hívás' : `Új, ${Math.floor(age(lead))} napja vár`, weight: 3 + age(lead) }]
    if (lead.status === 'contacted' && age(lead) > 3) return [{ lead, why: 'Utánkövetés: nincs ajánlat', weight: 2 }]
    if (lead.status === 'offered' && age(lead) > 5) return [{ lead, why: 'Ajánlat nyomon követése', weight: 2.5 }]
    return []
  }).sort((a, b) => b.weight - a.weight).slice(0, 5)
  return <section className="card today">
    <header><h3>Ma teendő</h3>{tasks.length > 0 && <span className="check-count">{tasks.length}</span>}</header>
    {tasks.length === 0 ? <p className="admin-hint">Nincs teendő. Minden érdeklődő kezelve van.</p> : <ul className="recent">{tasks.map(({ lead, why }) => <li key={lead.ref}>
      <button type="button" className="today-row" onClick={() => onOpen(lead.ref)}><span className="avatar">{initials(lead.customer_name)}</span><div><strong>{lead.customer_name}</strong><small>{why}</small></div></button>
      <a className="icon-btn call" href={`tel:${lead.phone.replace(/[^+0-9]/g, '')}`} aria-label={`${lead.customer_name} hívása`} title="Hívás"><PhoneCall size={15} /></a>
    </li>)}</ul>}
  </section>
}

function PipelineCard({ leads }: { leads: LeadRow[] }) {
  const pipeline = computePipeline(leads)
  const max = Math.max(1, ...pipeline.stages.map((stage) => stage.value))
  return <section className="card pipeline">
    <header><h3>Értékesítési csatorna</h3></header>
    <div className="pipe-forecast"><span>Súlyozott várható bevétel</span><strong><CountValue value={compactHuf(pipeline.forecast)} /></strong><small>megnyert eddig: {compactHuf(pipeline.wonValue)}</small></div>
    <ul className="pipe-stages">{pipeline.stages.map((stage) => <li key={stage.key}>
      <div><span><i style={{ background: STATUS_COLORS[stage.key] }} />{stage.label}</span><b>{stage.count} db · {compactHuf(stage.value)}</b></div>
      <div className="pipe-bar"><i style={{ width: `${(stage.value / max) * 100}%`, background: STATUS_COLORS[stage.key] }} /></div>
      <small>{Math.round(stage.odds * 100)}% lezárási esély (becslés)</small>
    </li>)}</ul>
  </section>
}

const RANGES = [7, 30, 90] as const

export default function AdminOverview({ leads, events, onOpenLeads, onOpenLead, checklist }: { leads: LeadRow[]; events: EventRow[] | null; onOpenLeads: () => void; onOpenLead: (ref: string) => void; checklist?: ChecklistItem[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const [now] = useState(() => Date.now())
  const stats = computeLeadStats(leads, now, range)
  const delta = stats.last7 - stats.prev7
  const spark = stats.daily.slice(-14).map((item) => item.count)
  const pipeline = computePipeline(leads)
  const setupOpen = checklist?.some((item) => !item.done)

  return <div className="dash">
    <div className="kpis">
      <Kpi label="Érdeklődők" value={String(stats.total)} hint={`${stats.last7} az elmúlt 7 napban`} delta={delta} spark={spark} />
      <Kpi label="Feldolgozatlan" value={String(stats.fresh)} hint={stats.fresh ? 'Hívásra vár' : 'Minden kezelve'} />
      <Kpi label="Átlagos irányár" value={compactHuf(stats.averageGross)} hint="bruttó, érdeklődőnként" />
      <Kpi label="Nyitott érték" value={compactHuf(stats.openValue)} hint="új + folyamatban + ajánlat" />
      <Kpi label="Várható bevétel" value={compactHuf(pipeline.forecast)} hint="súlyozott, becsült" />
      <Kpi label="Nyerési arány" value={stats.winRate === null ? '—' : `${Math.round(stats.winRate * 100)}%`} hint="megnyert / lezárt" ring={stats.winRate} />
    </div>
    <div className="dash-grid">
      {setupOpen && checklist && <div className="span-2"><Checklist items={checklist} /></div>}
      <TodayCard leads={leads} now={now} onOpen={onOpenLead} />
      <PipelineCard leads={leads} />
      <section className="card span-2">
        <header><h3>Érkező érdeklődők</h3><button type="button" className="ghost-link report-btn" onClick={() => window.print()}><FileText size={13} />Jelentés (PDF)</button><div className="seg" role="group" aria-label="Időszak">{RANGES.map((value) => <button type="button" key={value} className={range === value ? 'is-on' : ''} onClick={() => setRange(value)}>{value} nap</button>)}</div></header>
        {leads.length === 0 ? <p className="admin-hint empty-hint">Még nem érkezett érdeklődő. Amint valaki felmérést kér, itt jelenik meg a grafikon.</p> : <AreaChart daily={stats.daily} />}
      </section>
      <section className="card span-2"><header><h3>Látogatói tölcsér</h3></header><FunnelCard events={events} recent={stats.last30} /></section>
      <section className="card">
        <header><h3>Státuszok</h3></header>
        <div className="stackbar" role="img" aria-label="Érdeklődők megoszlása státusz szerint">{stats.total === 0 ? <i style={{ width: '100%' }} /> : stats.byStatus.filter((item) => item.count > 0).map((item) => <i key={item.key} style={{ width: `${(item.count / stats.total) * 100}%`, background: STATUS_COLORS[item.key] }} title={`${item.label}: ${item.count}`} />)}</div>
        <ul className="legend">{stats.byStatus.map((item) => <li key={item.key}><i style={{ background: STATUS_COLORS[item.key] }} />{item.label}<strong>{item.count}</strong></li>)}</ul>
      </section>
      <section className="card"><header><h3>Népszerű tetőtípusok</h3></header><HBars items={stats.byRoof.map((item) => ({ key: ROOF_INFO[item.key as RoofType]?.name ?? item.key, count: item.count }))} empty="Nincs adat." /></section>
      <section className="card"><header><h3>Települések</h3></header><HBars items={stats.byPlace} empty="Nincs adat." /></section>
      <section className="card">
        <header><h3>Legfrissebb</h3><button type="button" className="ghost-link" onClick={onOpenLeads}>Összes</button></header>
        {leads.length === 0 ? <p className="admin-hint">Nincs még érdeklődő.</p> : <ul className="recent">{leads.slice(0, 5).map((lead) => <li key={lead.ref}>
          <span className="avatar">{initials(lead.customer_name)}</span>
          <div><strong>{lead.customer_name}</strong><small>{lead.city} · {timeAgo(lead.created_at, now)}</small></div>
          <div className="recent-end"><strong>{compactHuf(lead.estimate_gross)}</strong><span className="pill" style={{ ['--pill' as string]: STATUS_COLORS[lead.status] }}>{STATUS_LABEL[lead.status] ?? lead.status}</span></div>
        </li>)}</ul>}
      </section>
    </div>
  </div>
}
