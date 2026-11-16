// Gyártói munkaterület (2026-11-16, Ádám referenciája: sötét CRM-felület nagy kártyákkal). A kritikus kör után:
// 1) felül négy egyforma számkártya (a nyitott érték az egyetlen Vanilla kártya); 2) ELSŐ a „Teendők” – rácsban,
// vízszintes görgetés nélkül, a lejártak elöl, minden kártyán hívás; 3) „Új érdeklődők” tömör kártyákon.
// Minden adat valódi: az érdeklődés pöttyei a lead-pontszámból, a címkék a valóban megtörtént jelekből jönnek.
// Fotó nincs (a vevőkről nem tárolunk képet): monogramos kör áll a helyén.
import { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Bell, ChevronDown, FileText, Flame, Mail, PhoneCall } from 'lucide-react'
import { initials, isWonStatus, LEAD_STATUSES, STATUS_COLORS, timeAgo, type LeadRow } from '@/lib/adminLeads'
import { scoreLead, TIER_LABELS } from '@/lib/leadScore'
import { compactMoney, DAY, engagementChips, interestDots, leadSize, OPEN_STATUSES, roofName, todayTasks, type Task } from '@/lib/workspace'

const tel = (lead: LeadRow) => `tel:${lead.phone.replace(/[^+0-9]/g, '')}`

export function Dots({ score, reasons }: { score: number; reasons: string[] }) {
  const on = interestDots(score)
  return <span className="ws-dots" role="img" aria-label={`Érdeklődés: ${on} / 5`} title={reasons.length ? `Lead-pontszám ${score}/100: ${reasons.join(' · ')}` : `Lead-pontszám ${score}/100 (nincs viselkedési adat)`}>{[0, 1, 2, 3, 4].map((index) => <i key={index} className={index < on ? `is-on d${index}` : ''} />)}</span>
}

/** Az áttekintő és az érdeklődők oldal közös érdeklődés-jelzője: szint és pontszám + öt pötty (4.81). */
export function LeadInterest({ lead }: { lead: LeadRow }) {
  const score = scoreLead(lead)
  return <span className="ws-interest"><small>{score.tier === 'hot' && <Flame size={12} />}{TIER_LABELS[score.tier]} · {score.score}</small><Dots score={score.score} reasons={score.reasons} /></span>
}

function Pills<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string, number?][]; onChange: (next: T) => void; label: string }) {
  return <div className="ws-pills" role="group" aria-label={label}>{options.map(([key, text, count]) => <button type="button" key={key} className={value === key ? 'is-on' : ''} aria-pressed={value === key} onClick={() => onChange(key)}>{key === 'hot' && <Flame size={14} />}{text}{count != null && <b>{count}</b>}</button>)}</div>
}

function StatusSelect({ lead, onUpdate }: { lead: LeadRow; onUpdate: (ref: string, patch: { status: string }) => void }) {
  return <label className="ws-status"><small>Státusz</small><span><i style={{ background: STATUS_COLORS[lead.status] }} /><select value={lead.status} onChange={(event) => onUpdate(lead.ref, { status: event.target.value })} aria-label={`${lead.customer_name} státusza`}>{LEAD_STATUSES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></span></label>
}

function TaskCard({ task, hero, onOpen, onUpdate }: { task: Task; hero: boolean; onOpen: (ref: string) => void; onUpdate: (ref: string, patch: { status: string }) => void }) {
  const { lead } = task
  return <article className={`ws-card ws-task ${hero ? ' is-hero' : ''}`}>
    <div className="ws-notch">
      <button type="button" className="ws-round" onClick={() => onOpen(lead.ref)} title="Részletek" aria-label={`${lead.customer_name} részletei`}><ArrowUpRight size={18} /></button>
    </div>
    <header><span className="ws-avatar sm">{initials(lead.customer_name)}</span><div><strong>{lead.customer_name}</strong><small>{lead.city}{roofName(lead) ? ` · ${roofName(lead)}` : ''}</small></div></header>
    <div className="ws-task-body">
      <span className="ws-round ghost" aria-hidden="true">{lead.status === 'offered' ? <FileText size={20} /> : <PhoneCall size={20} />}</span>
      <div><h3>{task.title}</h3><p><b>{compactMoney(lead.estimate_gross)}</b> · {task.why}{task.overdue && <em className="ws-late"><Bell size={13} aria-hidden="true" />lejárt</em>}</p></div>
    </div>
    <footer>
      <StatusSelect lead={lead} onUpdate={onUpdate} />
      <a className="ws-round" href={`mailto:${lead.email}`} title="E-mail" aria-label={`E-mail: ${lead.customer_name}`}><Mail size={18} /></a>
      <a className="ws-round solid" href={tel(lead)} title="Hívás" aria-label={`${lead.customer_name} hívása`}><PhoneCall size={18} /></a>
    </footer>
  </article>
}

function LeadCard({ lead, now, onOpen }: { lead: LeadRow; now: number; onOpen: (ref: string) => void }) {
  const sub = [lead.city, roofName(lead), leadSize(lead)].filter(Boolean).join(' · ')
  return <article className="ws-card ws-lead">
    <div className="ws-notch"><button type="button" className="ws-round" onClick={() => onOpen(lead.ref)} title="Részletek" aria-label={`${lead.customer_name} részletei`}><ArrowUpRight size={18} /></button></div>
    <header><span className="ws-avatar">{initials(lead.customer_name)}</span><div><h3>{lead.customer_name}</h3><p className="ws-sub">{sub || '—'}</p></div></header>
    <div className="ws-meta">
      <div><small>Forrás</small><span className="ws-tags">{engagementChips(lead).slice(0, 3).map((chip) => <i key={chip}>{chip}</i>)}</span></div>
      <div className="ws-meta-end"><LeadInterest lead={lead} /></div>
    </div>
    <footer><span><b>{compactMoney(lead.estimate_gross)}</b> · {timeAgo(lead.created_at, now)}</span><a className="ws-round solid sm" href={tel(lead)} title="Hívás" aria-label={`${lead.customer_name} hívása`}><PhoneCall size={16} /></a></footer>
  </article>
}

type TaskFilter = 'all' | 'overdue' | 'due' | 'hot'
type LeadFilter = 'all' | 'hot' | 'today'

export default function Workspace({ leads, onOpenLead, onOpenLeads, onUpdate }: { leads: LeadRow[]; onOpenLead: (ref: string) => void; onOpenLeads: () => void; onUpdate: (ref: string, patch: { status: string }) => void }) {
  const [now] = useState(() => Date.now())
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('all')
  const open = leads.filter((lead) => OPEN_STATUSES.has(lead.status))
  const won = leads.filter((lead) => isWonStatus(lead.status)).length
  const lost = leads.filter((lead) => lead.status === 'lost').length
  const week = leads.filter((lead) => now - new Date(lead.created_at).getTime() < 7 * DAY).length
  const openValue = open.reduce((sum, lead) => sum + lead.estimate_gross, 0)
  const winRate = won + lost ? Math.round((won / (won + lost)) * 100) : null
  const isHot = (lead: LeadRow) => scoreLead(lead).tier === 'hot'

  // A lejártak elöl, utána súly szerint (todayTasks már súly szerint rendez).
  const tasks = useMemo(() => { const all = todayTasks(leads, now); return [...all.filter((task) => task.overdue), ...all.filter((task) => !task.overdue)] }, [leads, now])
  const overdue = tasks.filter((task) => task.overdue).length
  const hotTasks = tasks.filter((task) => isHot(task.lead)).length
  const pickTasks = taskFilter === 'overdue' ? tasks.filter((task) => task.overdue) : taskFilter === 'due' ? tasks.filter((task) => !task.overdue) : taskFilter === 'hot' ? tasks.filter((task) => isHot(task.lead)) : tasks
  const shownTasks = pickTasks.slice(0, 6)

  const recent = leads.filter((lead) => now - new Date(lead.created_at).getTime() < 14 * DAY)
  const pickLeads = leadFilter === 'hot' ? recent.filter(isHot) : leadFilter === 'today' ? recent.filter((lead) => now - new Date(lead.created_at).getTime() < DAY) : recent
  const shownLeads = pickLeads.slice(0, 3)

  return <div className="ws">
    <div className="ws-stats">
      <div className="ws-stat"><small>Nyitott érdeklődő</small><strong>{open.length}</strong>{week > 0 && <em>+{week} / 7 nap</em>}</div>
      <div className="ws-stat"><small>Megnyert</small><strong>{won}</strong><em className="is-muted">{lost} elveszett</em></div>
      <div className="ws-stat"><small>Nyerési arány</small><strong>{winRate === null ? '—' : `${winRate}%`}</strong><em className="is-muted">megnyert / lezárt</em></div>
      <div className="ws-stat is-value"><small>Nyitott érték</small><strong>{compactMoney(openValue)}</strong><em className="is-muted">bruttó irányár</em></div>
    </div>

    <section className="ws-row" aria-labelledby="ws-tasks">
      <header><h2 id="ws-tasks">Teendők</h2><span className="ws-count">{tasks.length}</span>
        <Pills value={taskFilter} onChange={setTaskFilter} label="Teendők szűrése" options={[['all', 'Mind', tasks.length], ['overdue', 'Lejárt', overdue], ['due', 'Esedékes', tasks.length - overdue], ['hot', 'Forró', hotTasks]]} /></header>
      {shownTasks.length === 0 ? <p className="ws-empty">Nincs teendő ebben a szűrésben. Minden érdeklődő kezelve van.</p> : <div className="ws-grid">{shownTasks.map((task, index) => <TaskCard key={task.lead.ref} task={task} hero={index === 0} onOpen={onOpenLead} onUpdate={onUpdate} />)}</div>}
      {pickTasks.length > shownTasks.length && <button type="button" className="ws-more-link" onClick={onOpenLeads}>Összes teendő ({pickTasks.length}) <ArrowRight size={16} /></button>}
    </section>

    <section className="ws-row" aria-labelledby="ws-new">
      <header><h2 id="ws-new">Új érdeklődők</h2><span className="ws-count">{recent.length}</span>
        <Pills value={leadFilter} onChange={setLeadFilter} label="Új érdeklődők szűrése" options={[['all', 'Elmúlt 14 nap'], ['hot', 'Forró'], ['today', 'Ma']]} /></header>
      {shownLeads.length === 0 ? <p className="ws-empty">Nincs új érdeklődő ebben a szűrésben.</p> : <div className="ws-grid">{shownLeads.map((lead) => <LeadCard key={lead.ref} lead={lead} now={now} onOpen={onOpenLead} />)}</div>}
      {pickLeads.length > shownLeads.length && <button type="button" className="ws-more-link" onClick={onOpenLeads}>Összes érdeklődő <ArrowRight size={16} /></button>}
    </section>
  </div>
}
