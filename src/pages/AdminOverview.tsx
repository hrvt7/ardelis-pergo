import { formatHuf } from '@/lib/pricing'
import { ROOF_INFO } from '@/lib/roofs'
import { computeLeadStats, STATUS_COLORS, type LeadRow } from '@/lib/adminLeads'
import { computeFunnel, type EventRow } from '@/lib/adminStats'
import type { RoofType } from '@/types/pergola'

const compactHuf = (value: number) => (value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString('hu-HU', { maximumFractionDigits: 1 })} M Ft` : formatHuf(value))
const shortDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="dash-kpi"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>
}

function DailyBars({ daily }: { daily: { day: string; count: number }[] }) {
  const max = Math.max(1, ...daily.map((item) => item.count))
  const width = 840
  const height = 150
  const step = width / daily.length
  return <svg className="dash-chart" viewBox={`0 0 ${width} ${height + 22}`} role="img" aria-label="Érdeklődők száma naponta, az elmúlt 30 napban">
    {[0.25, 0.5, 0.75, 1].map((fraction) => <line key={fraction} x1="0" x2={width} y1={height - height * fraction} y2={height - height * fraction} className="dash-grid" />)}
    {daily.map((item, index) => {
      const barHeight = item.count ? Math.max(4, (item.count / max) * (height - 8)) : 0
      return <g key={item.day}>
        <title>{`${shortDate(item.day)}: ${item.count} érdeklődő`}</title>
        <rect x={index * step + step * 0.18} y={height - barHeight} width={step * 0.64} height={barHeight} rx="3" className="dash-bar" />
        <rect x={index * step} y="0" width={step} height={height} fill="transparent" />
      </g>
    })}
    <text x="0" y={height + 16} className="dash-axis">{shortDate(daily[0].day)}</text>
    <text x={width / 2} y={height + 16} textAnchor="middle" className="dash-axis">{shortDate(daily[Math.floor(daily.length / 2)].day)}</text>
    <text x={width} y={height + 16} textAnchor="end" className="dash-axis">{shortDate(daily[daily.length - 1].day)}</text>
  </svg>
}

function StatusDonut({ items, total }: { items: { key: string; label: string; count: number }[]; total: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return <div className="dash-donut">
    <svg viewBox="0 0 140 140" role="img" aria-label="Érdeklődők megoszlása státusz szerint">
      <circle cx="70" cy="70" r={radius} className="dash-donut-track" />
      {total > 0 && items.filter((item) => item.count > 0).map((item) => {
        const length = (item.count / total) * circumference
        const circle = <circle key={item.key} cx="70" cy="70" r={radius} fill="none" stroke={STATUS_COLORS[item.key]} strokeWidth="14" strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
        offset += length
        return circle
      })}
      <text x="70" y="68" textAnchor="middle" className="dash-donut-value">{total}</text>
      <text x="70" y="86" textAnchor="middle" className="dash-axis">érdeklődő</text>
    </svg>
    <ul>{items.map((item) => <li key={item.key}><i style={{ background: STATUS_COLORS[item.key] }} />{item.label}<strong>{item.count}</strong></li>)}</ul>
  </div>
}

function HBars({ items, empty }: { items: { key: string; count: number }[]; empty: string }) {
  if (items.length === 0) return <p className="admin-hint">{empty}</p>
  const max = Math.max(...items.map((item) => item.count))
  return <ul className="dash-hbars">{items.map((item) => <li key={item.key}><span>{item.key}</span><div><i style={{ width: `${(item.count / max) * 100}%` }} /></div><strong>{item.count}</strong></li>)}</ul>
}

function FunnelCard({ events, recent }: { events: EventRow[] | null; recent: number }) {
  if (events === null) return <p className="admin-hint">Betöltés…</p>
  const funnel = computeFunnel(events, recent)
  if (funnel.steps[0].count === 0) return <p className="admin-hint">Még nincs látogatottsági adat. A mérés a konfigurátor első megnyitásától indul (futtasd a supabase/events.sql-t, ha még nem tetted).</p>
  const max = funnel.steps[0].count
  return <>
    <ul className="dash-hbars dash-funnel">{funnel.steps.map((step) => <li key={step.key}><span>{step.label}</span><div><i style={{ width: `${Math.max(2, (step.count / max) * 100)}%` }} /></div><strong>{step.count}{step.rate !== null && <small> {Math.round(step.rate * 100)}%</small>}</strong></li>)}</ul>
    <p className="admin-hint">Névtelen, süti nélküli mérés, az elmúlt 30 nap. Összesített konverzió: <strong>{funnel.conversion === null ? '—' : `${(funnel.conversion * 100).toLocaleString('hu-HU', { maximumFractionDigits: 1 })}%`}</strong> (megnyitásból felmérési kérés).</p>
  </>
}

export default function AdminOverview({ leads, events, onOpenLeads }: { leads: LeadRow[]; events: EventRow[] | null; onOpenLeads: () => void }) {
  const stats = computeLeadStats(leads)
  if (leads.length === 0) return <div className="dash"><div className="dash-empty"><strong>Még nem érkezett érdeklődő.</strong><p>Amint valaki felmérést kér a konfigurátorban, itt jelennek meg a mutatók és a grafikonok.</p></div><section className="dash-card"><h3>Látogatói tölcsér</h3><FunnelCard events={events} recent={stats.last30} /></section></div>
  const recent = leads.slice(0, 5)
  return <div className="dash">
    <div className="dash-kpis">
      <Kpi label="Összes érdeklődő" value={String(stats.total)} hint={`${stats.last7} az elmúlt 7 napban`} />
      <Kpi label="Feldolgozatlan" value={String(stats.fresh)} hint={stats.fresh ? 'Hívásra vár' : 'Minden kezelve'} />
      <Kpi label="Átlagos irányár" value={compactHuf(stats.averageGross)} hint="bruttó, érdeklődőnként" />
      <Kpi label="Nyitott érték" value={compactHuf(stats.openValue)} hint="új + folyamatban + ajánlat" />
      <Kpi label="Nyerési arány" value={stats.winRate === null ? '—' : `${Math.round(stats.winRate * 100)}%`} hint="megnyert / lezárt" />
    </div>
    <div className="dash-grid-2">
      <section className="dash-card dash-wide"><h3>Érdeklődők az elmúlt 30 napban</h3><DailyBars daily={stats.daily} /></section>
      <section className="dash-card"><h3>Státuszok</h3><StatusDonut items={stats.byStatus} total={stats.total} /></section>
      <section className="dash-card dash-wide"><h3>Látogatói tölcsér</h3><FunnelCard events={events} recent={stats.last30} /></section>
      <section className="dash-card"><h3>Népszerű tetőtípusok</h3><HBars items={stats.byRoof.map((item) => ({ key: ROOF_INFO[item.key as RoofType]?.name ?? item.key, count: item.count }))} empty="Nincs adat." /></section>
      <section className="dash-card"><h3>Települések</h3><HBars items={stats.byPlace} empty="Nincs adat." /></section>
      <section className="dash-card"><h3>Legfrissebb érdeklődők <button type="button" className="admin-link" onClick={onOpenLeads}>Mind megtekintése</button></h3>
        <ul className="dash-recent">{recent.map((lead) => <li key={lead.ref}><div><strong>{lead.customer_name}</strong><small>{lead.city} · {new Date(lead.created_at).toLocaleDateString('hu-HU')}</small></div><span className="dash-pill" style={{ ['--pill' as string]: STATUS_COLORS[lead.status] }}>{lead.status === 'new' ? 'Új' : lead.status}</span><strong>{compactHuf(lead.estimate_gross)}</strong></li>)}</ul>
      </section>
    </div>
  </div>
}
