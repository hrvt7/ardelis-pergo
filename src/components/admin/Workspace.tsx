// Gyártói munkaterület (2026-11-16, Ádám referenciája: sötét CRM-felület nagy kártyákkal): nagy számok,
// „Új érdeklődők” kártyasor és „Mai teendők” kártyasor kiemelt első kártyával. Minden adat valódi: az érdeklődés
// pöttyei a lead-pontszámból (src/lib/leadScore), a chipek a konfigurátorban gyűjtött viselkedési jelekből jönnek.
// Fotó nincs (a vevőkről nem tárolunk képet): monogramos kör áll a helyén.
import { useMemo, useState } from 'react'
import { ArrowUpRight, Bell, ChevronDown, FileText, Flame, Mail, PhoneCall, Search } from 'lucide-react'
import { initials, LEAD_STATUSES, STATUS_COLORS, timeAgo, type LeadRow } from '@/lib/adminLeads'
import { scoreLead, TIER_LABELS } from '@/lib/leadScore'
import { compactMoney, DAY, engagementChips, interestDots, leadSize, OPEN_STATUSES, roofName, todayTasks, type Task } from '@/lib/workspace'

function Dots({ score }: { score: number }) {
  const on = interestDots(score)
  return <span className="ws-dots" aria-label={`Érdeklődés: ${on} / 5`}>{[0, 1, 2, 3, 4].map((index) => <i key={index} className={index < on ? `is-on d${index}` : ''} />)}</span>
}

function Pills<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string, number?][]; onChange: (next: T) => void; label: string }) {
  return <div className="ws-pills" role="group" aria-label={label}>{options.map(([key, text, count]) => <button type="button" key={key} className={value === key ? 'is-on' : ''} aria-pressed={value === key} onClick={() => onChange(key)}>{key === 'hot' && <Flame size={14} />}{text}{count != null && <b>{count}</b>}</button>)}</div>
}

function LeadCard({ lead, now, onOpen }: { lead: LeadRow; now: number; onOpen: (ref: string) => void }) {
  const score = scoreLead(lead)
  const sub = [lead.city, roofName(lead), leadSize(lead)].filter(Boolean).join(' · ')
  return <div className="ws-wrap"><article className="ws-card ws-lead">
    <span className="ws-avatar">{initials(lead.customer_name)}</span>
    <h3>{lead.customer_name}</h3>
    <p className="ws-sub">{sub || timeAgo(lead.created_at, now)}</p>
    <div className="ws-meta">
      <div><small>Forrás</small><span className="ws-chips">{engagementChips(lead).slice(0, 2).map((chip) => <i key={chip}>{chip}</i>)}</span></div>
      <div className="ws-meta-end"><small>{score.tier === 'hot' && <Flame size={12} />}{TIER_LABELS[score.tier]} · {score.score}</small><Dots score={score.score} /></div>
    </div>
  </article><div className="ws-notch"><button type="button" className="ws-round" onClick={() => onOpen(lead.ref)} aria-label={`${lead.customer_name} megnyitása`}><ArrowUpRight size={18} /></button></div></div>
}

function TaskCard({ task, lead, hero, onOpen, onUpdate }: { task: Task; lead: LeadRow; hero: boolean; onOpen: (ref: string) => void; onUpdate: (ref: string, patch: { status: string }) => void }) {
  const phone = lead.phone.replace(/[^+0-9]/g, '')
  return <div className="ws-wrap"><article className={`ws-card ws-task${hero ? ' is-hero' : ''}`}>
    <header><span className="ws-avatar sm">{initials(lead.customer_name)}</span><div><strong>{lead.customer_name}</strong><small>{lead.city} · {compactMoney(lead.estimate_gross)}</small></div></header>
    <div className="ws-task-body">
      <span className="ws-round ghost" aria-hidden="true">{lead.status === 'offered' ? <FileText size={20} /> : <PhoneCall size={20} />}</span>
      <div><h3>{task.title}</h3><p>{task.why}{task.overdue && <em> · lejárt</em>}</p></div>
    </div>
    <footer>
      <label className="ws-status"><small>Státusz</small><span><i style={{ background: STATUS_COLORS[lead.status] }} /><select value={lead.status} onChange={(event) => onUpdate(lead.ref, { status: event.target.value })} aria-label={`${lead.customer_name} státusza`}>{LEAD_STATUSES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></span></label>
      <a className="ws-round" href={`mailto:${lead.email}`} aria-label={`E-mail: ${lead.customer_name}`}><Mail size={18} /></a>
      <a className="ws-round solid" href={`tel:${phone}`} aria-label={`${lead.customer_name} hívása`}><PhoneCall size={18} /></a>
    </footer>
  </article><div className="ws-notch is-pair">
    <span className={`ws-round${task.overdue ? ' has-dot' : ''}`} title={task.overdue ? 'Lejárt határidő' : 'Esedékes'} role="img" aria-label={task.overdue ? 'Lejárt határidő' : 'Esedékes'}><Bell size={17} /></span>
    <button type="button" className="ws-round" onClick={() => onOpen(lead.ref)} aria-label={`${lead.customer_name} megnyitása`}><ArrowUpRight size={18} /></button>
  </div></div>
}

type LeadFilter = 'all' | 'hot' | 'new' | 'today'
type TaskFilter = 'all' | 'hot' | 'due' | 'overdue'

export default function Workspace({ leads, onOpenLead, onOpenLeads, onUpdate }: { leads: LeadRow[]; onOpenLead: (ref: string) => void; onOpenLeads: () => void; onUpdate: (ref: string, patch: { status: string }) => void }) {
  const [now] = useState(() => Date.now())
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('all')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')
  const open = leads.filter((lead) => OPEN_STATUSES.has(lead.status))
  const won = leads.filter((lead) => lead.status === 'won')
  const lost = leads.filter((lead) => lead.status === 'lost')
  const week = leads.filter((lead) => now - new Date(lead.created_at).getTime() < 7 * DAY).length
  const openValue = open.reduce((sum, lead) => sum + lead.estimate_gross, 0)
  const isHot = (lead: LeadRow) => scoreLead(lead).tier === 'hot'

  const fresh = useMemo(() => {
    const recent = leads.filter((lead) => lead.status === 'new' || now - new Date(lead.created_at).getTime() < 14 * DAY)
    const pick = leadFilter === 'hot' ? recent.filter(isHot) : leadFilter === 'new' ? recent.filter((lead) => lead.status === 'new') : leadFilter === 'today' ? recent.filter((lead) => now - new Date(lead.created_at).getTime() < DAY) : recent
    return pick.slice(0, 10)
  }, [leads, leadFilter, now])
  const tasks = useMemo(() => todayTasks(leads, now), [leads, now])
  const shownTasks = (taskFilter === 'hot' ? tasks.filter((task) => isHot(task.lead)) : taskFilter === 'due' ? tasks.filter((task) => !task.overdue) : taskFilter === 'overdue' ? tasks.filter((task) => task.overdue) : tasks).slice(0, 8)

  return <div className="ws">
    <div className="ws-stats">
      <div><strong>{open.length}</strong><span>nyitott<br />érdeklődő</span>{week > 0 && <em>+{week} / 7 nap</em>}</div>
      <div><strong>{won.length}</strong><span>megnyert</span></div>
      <div><strong>{lost.length}</strong><span>elveszett</span></div>
      <div className="is-money"><strong>{compactMoney(openValue)}</strong><span>nyitott érték<br />(bruttó irányár)</span></div>
    </div>

    <section className="ws-row" aria-labelledby="ws-new">
      <header><h2 id="ws-new">Új érdeklődők</h2><span className="ws-count">{fresh.length} <small>db</small></span>
        <div className="ws-tools"><button type="button" className="ws-round" onClick={onOpenLeads} aria-label="Keresés az érdeklődők között"><Search size={17} /></button>
          <Pills value={leadFilter} onChange={setLeadFilter} label="Szűrés" options={[['all', 'Mind'], ['hot', 'Forró'], ['new', 'Új'], ['today', 'Ma']]} /></div></header>
      {fresh.length === 0 ? <p className="ws-empty">Nincs a szűrésnek megfelelő érdeklődő.</p> : <div className="ws-track">{fresh.map((lead) => <LeadCard key={lead.ref} lead={lead} now={now} onOpen={onOpenLead} />)}</div>}
    </section>

    <section className="ws-row" aria-labelledby="ws-tasks">
      <header><h2 id="ws-tasks">Mai teendők</h2><span className="ws-count">{tasks.length} <small>feladat</small></span>
        <div className="ws-tools"><Pills value={taskFilter} onChange={setTaskFilter} label="Teendők szűrése" options={[['all', 'Mind'], ['hot', 'Forró'], ['due', 'Esedékes'], ['overdue', 'Lejárt', tasks.filter((task) => task.overdue).length]]} /></div></header>
      {shownTasks.length === 0 ? <p className="ws-empty">Nincs teendő. Minden érdeklődő kezelve van.</p> : <div className="ws-track">{shownTasks.map((task, index) => <TaskCard key={task.lead.ref} task={task} lead={task.lead} hero={index === 0} onOpen={onOpenLead} onUpdate={onUpdate} />)}</div>}
    </section>
    <p className="ws-foot">Az érdeklődés pöttyei a lead-pontszámból jönnek: PDF-letöltés, AR-nézet, visszatérés, kitöltött űrlap.</p>
  </div>
}
