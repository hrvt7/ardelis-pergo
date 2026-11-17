// Admin „Szerviz” nézet: a tulajdonosi oldalról érkezett hibabejelentések munkalappal (felelős, határidő,
// diagnózis, javítás, alkatrész, munkaidő, garancia, költség, eredmény) és leíró hibastatisztikával.
import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, BarChart3, CalendarClock, ClipboardList, ExternalLink, Image as ImageIcon, RefreshCw, UserRound } from 'lucide-react'
import { SERVICE_STATUS_LABEL, type AdminInstallation, type AdminServiceRequest, type ServicePatch } from '@/lib/adminInstallations'
import { isOverdue, localDay, MIN_RELIABLE, SERVICE_OUTCOME_LABEL, SERVICE_OUTCOMES, serviceStats, type ServiceOutcome, type StatRow } from '@/lib/serviceStats'
import type { LeadRow } from '@/lib/adminLeads'
import { EmptyArt } from '@/pages/AdminLeads'

const STATUSES = Object.entries(SERVICE_STATUS_LABEL) as [AdminServiceRequest['status'], string][]
const COLORS: Record<AdminServiceRequest['status'], string> = { new: '#EFF0A3', in_progress: '#D8DFE9', closed: '#7C7E85' }
const dateTime = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })
const dateOnly = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium' })
const money = new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 })
const monthName = new Intl.DateTimeFormat('hu-HU', { month: 'short' })
const percent = (value: number | null) => (value === null ? '–' : `${Math.round(value * 100)}%`)

type Filter = 'all' | 'overdue' | AdminServiceRequest['status']

export default function AdminService({ requests, installations, leads, error, loadedAt, onReload, onSave, onOpenInstallation, demo = false }: { requests: AdminServiceRequest[]; installations: AdminInstallation[]; leads: LeadRow[]; error: string; loadedAt: number; onReload: () => void; onSave: (id: number, patch: ServicePatch) => Promise<boolean>; onOpenInstallation?: (id: number) => void; demo?: boolean }) {
  const [view, setView] = useState<'list' | 'stats'>('list')
  const [filter, setFilter] = useState<Filter>('all')
  const [who, setWho] = useState('')
  const [now] = useState(() => Date.now())
  const today = localDay(new Date(now))
  const byId = useMemo(() => new Map(installations.map((item) => [item.id, item])), [installations])
  const names = useMemo(() => new Map(leads.map((lead) => [lead.ref, lead])), [leads])
  const assignees = useMemo(() => [...new Set(requests.map((item) => item.assignee).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, 'hu')), [requests])
  const overdue = requests.filter((item) => isOverdue(item, today)).length
  const shown = requests
    .filter((item) => (filter === 'all' ? true : filter === 'overdue' ? isOverdue(item, today) : item.status === filter))
    .filter((item) => !who || (who === '-' ? !item.assignee : item.assignee === who))
  const stale = loadedAt > 0 && now - loadedAt > 9 * 60_000
  return <div className="service">
    {error && <p className="admin-message is-error" role="alert">{error}</p>}
    {demo && <p className="admin-hint">Demó adatok: kitalált telepítések és bejelentések a Szerviz nézet bemutatásához. A módosítások nem mentődnek a szerverre.</p>}
    <div className="toolbar">
      <div className="tabs" role="group" aria-label="Nézet">
        <button type="button" className={view === 'list' ? 'is-on' : ''} onClick={() => setView('list')}><ClipboardList size={15} />Bejelentések <b>{requests.length}</b></button>
        <button type="button" className={view === 'stats' ? 'is-on' : ''} onClick={() => setView('stats')}><BarChart3 size={15} />Hibastatisztika</button>
      </div>
      {!demo && <button type="button" className="btn ghost" onClick={onReload}><RefreshCw size={15} />Frissítés</button>}
    </div>
    {view === 'stats' ? <ServiceStatsView requests={requests} installations={installations} now={now} /> : <>
      <p className="admin-hint">A bejelentés a tulajdonos leírása és fotói alapján készül. A rendszer nem azonosít alkatrészt és nem rendel automatikusan; az anyaglista csak tájékoztató, a pontos alkatrészt a helyszíni vizsgálat dönti el.</p>
      <div className="toolbar">
        <div className="tabs" role="group" aria-label="Szűrés állapot szerint">
          <button type="button" className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>Mind <b>{requests.length}</b></button>
          {STATUSES.map(([key, label]) => <button type="button" key={key} className={filter === key ? 'is-on' : ''} onClick={() => setFilter(key)}><i style={{ background: COLORS[key] }} />{label} <b>{requests.filter((item) => item.status === key).length}</b></button>)}
          <button type="button" className={`${filter === 'overdue' ? 'is-on' : ''} ${overdue ? 'is-alert' : ''}`} onClick={() => setFilter('overdue')}><AlertTriangle size={14} />Késésben <b>{overdue}</b></button>
        </div>
        <label className="service-who"><UserRound size={15} /><span className="sr-only">Felelős</span>
          <select value={who} onChange={(event) => setWho(event.target.value)} aria-label="Szűrés felelős szerint">
            <option value="">Minden felelős</option>
            <option value="-">Nincs felelős</option>
            {assignees.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>
      {stale && <p className="admin-hint">A fotólinkek 10 percig érvényesek. Ha egy kép nem nyílik meg, kattints a Frissítésre.</p>}
      <datalist id="service-assignees">{assignees.map((name) => <option key={name} value={name} />)}</datalist>
      {shown.length === 0 ? <div className="card empty"><EmptyArt /><strong>{requests.length === 0 ? 'Még nem érkezett hibabejelentés.' : 'Nincs a szűrésnek megfelelő bejelentés.'}</strong><p>A tulajdonosok a termék QR-kódjáról vagy a tulajdonosi linkről jelenthetnek hibát.</p></div>
        : <div className="service-list">{shown.map((item) => {
          const installation = byId.get(item.installationId)
          const component = installation?.components.find((entry) => entry.key === item.component)
          const lead = installation?.leadRef ? names.get(installation.leadRef) : undefined
          const late = isOverdue(item, today)
          return <article key={item.id} className={`card service-card${late ? ' is-late' : ''}`} style={{ ['--pill' as string]: COLORS[item.status] }}>
            <header><div><h3>{component?.label ?? item.component}</h3><small>{[lead?.customer_name, installation?.headline, dateTime.format(new Date(item.createdAt))].filter(Boolean).join(' · ')}</small></div>
              <select aria-label="Állapot" value={item.status} onChange={(event) => void onSave(item.id, { status: event.target.value as AdminServiceRequest['status'] })}>{STATUSES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></header>
            <div className="service-chips">
              <span className={item.assignee ? '' : 'is-empty'}><UserRound size={13} />{item.assignee ?? 'Nincs felelős'}</span>
              <span className={late ? 'is-late' : item.dueDate ? '' : 'is-empty'}><CalendarClock size={13} />{item.dueDate ? `${late ? 'Lejárt: ' : 'Határidő: '}${dateOnly.format(new Date(`${item.dueDate}T12:00:00`))}` : 'Nincs határidő'}</span>
              {item.outcome && <span>{SERVICE_OUTCOME_LABEL[item.outcome]}</span>}
              {item.warrantyCase !== null && <span>{item.warrantyCase ? 'Garanciális' : 'Fizetős'}</span>}
            </div>
            <p className="service-text">{item.description}</p>
            {item.photos.length > 0 && <div className="service-photos">{item.photos.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${index + 1}. fotó megnyitása`}><img src={url} alt={`${index + 1}. fotó`} loading="lazy" onError={(event) => { event.currentTarget.replaceWith(Object.assign(document.createElement('span'), { textContent: 'Lejárt link' })) }} /></a>)}</div>}
            {item.photos.length === 0 && <p className="admin-hint"><ImageIcon size={14} /> Fotó nélkül</p>}
            <WorkSheet item={item} onSave={onSave} />
            <footer>{lead && <><a href={`tel:${lead.phone.replace(/[^+0-9]/g, '')}`}>{lead.phone}</a><a href={`mailto:${lead.email}`}>{lead.email}</a></>}{installation && onOpenInstallation && <button type="button" className="btn ghost" onClick={() => onOpenInstallation(installation.id)}><ExternalLink size={14} />Telepítés</button>}</footer>
          </article>
        })}</div>}
    </>}
  </div>
}

/** Munkalap: a jegy kezelése (felelős, határidő) és a javítás adatai. Csak a változott mezők mennek a szerverre. */
function WorkSheet({ item, onSave }: { item: AdminServiceRequest; onSave: (id: number, patch: ServicePatch) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const str = (name: string) => String(form.get(name) ?? '').trim() || null
    const int = (name: string) => { const raw = String(form.get(name) ?? '').replace(/\s/g, ''); if (!raw) return null; const value = Math.round(Number(raw.replace(',', '.'))); return Number.isFinite(value) && value >= 0 ? value : null }
    const warranty = String(form.get('warrantyCase') ?? '')
    const outcome = String(form.get('outcome') ?? '')
    const next: ServicePatch = {
      assignee: str('assignee'), dueDate: str('dueDate'), diagnosis: str('diagnosis'), workDone: str('workDone'), partsUsed: str('partsUsed'),
      laborMinutes: int('laborMinutes'), costNet: int('costNet'), warrantyCase: warranty === 'yes' ? true : warranty === 'no' ? false : null,
      outcome: (SERVICE_OUTCOMES as readonly string[]).includes(outcome) ? outcome as ServiceOutcome : null,
    }
    const patch = Object.fromEntries(Object.entries(next).filter(([key, value]) => (item[key as keyof AdminServiceRequest] ?? null) !== value)) as ServicePatch
    if (!Object.keys(patch).length) return
    setBusy(true)
    await onSave(item.id, patch)
    setBusy(false)
  }
  return <details className="service-work">
    <summary>Munkalap{item.diagnosis || item.workDone ? ' · kitöltve' : ''}</summary>
    <form onSubmit={(event) => void submit(event)} key={`${item.id}-${item.assignee}-${item.dueDate}-${item.outcome}`}>
      <label>Felelős<input name="assignee" list="service-assignees" defaultValue={item.assignee ?? ''} maxLength={80} placeholder="Szerelő neve" /></label>
      <label>Határidő<input name="dueDate" type="date" defaultValue={item.dueDate ?? ''} /></label>
      <label className="wide">Diagnózis<textarea name="diagnosis" rows={2} maxLength={2000} defaultValue={item.diagnosis ?? ''} placeholder="Mit találtatok a helyszínen?" /></label>
      <label className="wide">Elvégzett munka<textarea name="workDone" rows={2} maxLength={2000} defaultValue={item.workDone ?? ''} /></label>
      <label className="wide">Felhasznált alkatrész<input name="partsUsed" maxLength={500} defaultValue={item.partsUsed ?? ''} placeholder="pl. lineáris motor, csatlakozó" /></label>
      <label>Munkaidő (perc)<input name="laborMinutes" inputMode="numeric" defaultValue={item.laborMinutes ?? ''} /></label>
      <label>Költség (nettó Ft)<input name="costNet" inputMode="numeric" defaultValue={item.costNet ?? ''} /></label>
      <label>Garanciális?<select name="warrantyCase" defaultValue={item.warrantyCase === null ? '' : item.warrantyCase ? 'yes' : 'no'}><option value="">Nem tudni</option><option value="yes">Igen</option><option value="no">Nem, fizetős</option></select></label>
      <label>Eredmény<select name="outcome" defaultValue={item.outcome ?? ''}><option value="">–</option>{SERVICE_OUTCOMES.map((key) => <option key={key} value={key}>{SERVICE_OUTCOME_LABEL[key]}</option>)}</select></label>
      <div className="wide service-work-actions"><button type="submit" className="btn" disabled={busy}>{busy ? 'Mentés…' : 'Munkalap mentése'}</button><small>Lezárni a fenti állapotválasztóval lehet; a megoldási idő a lezárás pillanatából számol.</small></div>
    </form>
  </details>
}

function StatTable({ title, rows, unit }: { title: string; rows: StatRow[]; unit: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  return <section className="card service-stat">
    <h3>{title}</h3>
    {rows.length === 0 ? <p className="admin-hint">Még nincs adat.</p> : <table>
      <thead><tr><th>{unit}</th><th>Bejelentés</th><th>Telepítve</th><th title="Bejelentés / telepített darab">Arány</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.key}><td><span className="bar" style={{ ['--w' as string]: `${(row.count / max) * 100}%` }} />{row.label}</td><td>{row.count}</td><td>{row.installed || '–'}</td><td>{percent(row.rate)}</td></tr>)}</tbody>
    </table>}
  </section>
}

function ServiceStatsView({ requests, installations, now }: { requests: AdminServiceRequest[]; installations: AdminInstallation[]; now: number }) {
  const stats = useMemo(() => serviceStats(requests, installations, new Date(now)), [requests, installations, now])
  const byId = new Map(installations.map((item) => [item.id, item]))
  const maxMonth = Math.max(1, ...stats.months.map((month) => month.count))
  return <div className="service-stats">
    {!stats.reliable && <p className="admin-message">Kis minta: {stats.installations} telepítés és {stats.total} bejelentés. Az arányok legalább {MIN_RELIABLE.installations} telepítéstől és {MIN_RELIABLE.requests} bejelentéstől mondanak valamit; addig csak tájékoztató számok.</p>}
    <div className="service-kpis">
      <div className="card"><small>Nyitott</small><strong>{stats.open}</strong></div>
      <div className={`card${stats.overdue ? ' is-late' : ''}`}><small>Késésben</small><strong>{stats.overdue}</strong></div>
      <div className="card"><small>Lezárt</small><strong>{stats.closed}</strong></div>
      <div className="card"><small>Megoldási idő (medián)</small><strong>{stats.medianDays === null ? '–' : `${String(stats.medianDays).replace('.', ',')} nap`}</strong></div>
    </div>
    <div className="service-stat-grid">
      <StatTable title="Hibák komponens szerint" rows={stats.byComponent} unit="Komponens" />
      <StatTable title="Hibák modell szerint" rows={stats.byModel} unit="Modell" />
    </div>
    <div className="service-stat-grid">
      <section className="card service-stat">
        <h3>Bejelentések havonta</h3>
        <div className="service-months">{stats.months.map((month) => <div key={month.month}><span style={{ ['--h' as string]: `${(month.count / maxMonth) * 100}%` }} /><b>{month.count}</b><small>{monthName.format(new Date(`${month.month}-15T12:00:00`))}</small></div>)}</div>
      </section>
      <section className="card service-stat">
        <h3>Költség és munka</h3>
        <dl className="service-dl">
          <dt>Garanciális javítás</dt><dd>{money.format(stats.costs.warranty)}</dd>
          <dt>Fizetős javítás</dt><dd>{money.format(stats.costs.paid)}</dd>
          <dt>Munkaidő összesen</dt><dd>{String(stats.costs.laborHours).replace('.', ',')} óra</dd>
          <dt>Költséggel rögzített jegy</dt><dd>{stats.costs.withCost} / {stats.total}</dd>
          {SERVICE_OUTCOMES.map((key) => <div key={key} className="contents"><dt>{SERVICE_OUTCOME_LABEL[key]}</dt><dd>{stats.outcomes[key]}</dd></div>)}
        </dl>
      </section>
    </div>
    <section className="card service-stat">
      <h3>Visszatérő hibák</h3>
      <p className="admin-hint">Ugyanannál a terméknél ugyanarra a komponensre érkezett legalább két bejelentés.</p>
      {stats.repeats.length === 0 ? <p className="admin-hint">Nincs visszatérő hiba.</p> : <ul className="service-repeats">{stats.repeats.map((item) => <li key={`${item.installationId}-${item.component}`}><b>{item.count}×</b> {item.label}<small>{byId.get(item.installationId)?.headline ?? ''}</small></li>)}</ul>}
    </section>
    <p className="admin-hint">Leíró kimutatás a rögzített bejelentésekből és munkalapokból. Az együttjárás nem bizonyítja a hiba okát; a műszaki okot szakembernek kell megerősítenie.</p>
  </div>
}
