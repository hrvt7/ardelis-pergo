// Admin „Szerviz” nézet: a tulajdonosi oldalról érkezett hibabejelentések állapotkezeléssel és fotókkal.
import { useMemo, useState } from 'react'
import { ExternalLink, Image as ImageIcon, RefreshCw } from 'lucide-react'
import { SERVICE_STATUS_LABEL, type AdminInstallation, type AdminServiceRequest } from '@/lib/adminInstallations'
import type { LeadRow } from '@/lib/adminLeads'
import { EmptyArt } from '@/pages/AdminLeads'

const STATUSES = Object.entries(SERVICE_STATUS_LABEL) as [AdminServiceRequest['status'], string][]
const COLORS: Record<AdminServiceRequest['status'], string> = { new: '#EFF0A3', in_progress: '#D8DFE9', closed: '#7C7E85' }
const dateTime = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })

export default function AdminService({ requests, installations, leads, error, loadedAt, onReload, onStatus, onOpenInstallation }: { requests: AdminServiceRequest[]; installations: AdminInstallation[]; leads: LeadRow[]; error: string; loadedAt: number; onReload: () => void; onStatus: (id: number, status: AdminServiceRequest['status']) => void; onOpenInstallation: (id: number) => void }) {
  const [filter, setFilter] = useState<'all' | AdminServiceRequest['status']>('all')
  const byId = useMemo(() => new Map(installations.map((item) => [item.id, item])), [installations])
  const names = useMemo(() => new Map(leads.map((lead) => [lead.ref, lead])), [leads])
  const shown = requests.filter((item) => filter === 'all' || item.status === filter)
  const [now] = useState(() => Date.now())
  const stale = loadedAt > 0 && now - loadedAt > 9 * 60_000
  return <div className="service">
    {error && <p className="admin-message is-error" role="alert">{error}</p>}
    <p className="admin-hint">A bejelentés a tulajdonos leírása és fotói alapján készül. A rendszer nem azonosít alkatrészt és nem rendel automatikusan; az anyaglista csak tájékoztató, a pontos alkatrészt a helyszíni vizsgálat dönti el.</p>
    <div className="toolbar">
      <div className="tabs" role="group" aria-label="Szűrés állapot szerint">
        <button type="button" className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>Mind <b>{requests.length}</b></button>
        {STATUSES.map(([key, label]) => <button type="button" key={key} className={filter === key ? 'is-on' : ''} onClick={() => setFilter(key)}><i style={{ background: COLORS[key] }} />{label} <b>{requests.filter((item) => item.status === key).length}</b></button>)}
      </div>
      <button type="button" className="btn ghost" onClick={onReload}><RefreshCw size={15} />Frissítés</button>
    </div>
    {stale && <p className="admin-hint">A fotólinkek 10 percig érvényesek. Ha egy kép nem nyílik meg, kattints a Frissítésre.</p>}
    {shown.length === 0 ? <div className="card empty"><EmptyArt /><strong>{requests.length === 0 ? 'Még nem érkezett hibabejelentés.' : 'Nincs a szűrésnek megfelelő bejelentés.'}</strong><p>A tulajdonosok a termék QR-kódjáról vagy a tulajdonosi linkről jelenthetnek hibát.</p></div>
      : <div className="service-list">{shown.map((item) => {
        const installation = byId.get(item.installationId)
        const component = installation?.components.find((entry) => entry.key === item.component)
        const lead = installation?.leadRef ? names.get(installation.leadRef) : undefined
        return <article key={item.id} className="card service-card" style={{ ['--pill' as string]: COLORS[item.status] }}>
          <header><div><h3>{component?.label ?? item.component}</h3><small>{[lead?.customer_name, installation?.headline, dateTime.format(new Date(item.createdAt))].filter(Boolean).join(' · ')}</small></div>
            <select aria-label="Állapot" value={item.status} onChange={(event) => onStatus(item.id, event.target.value as AdminServiceRequest['status'])}>{STATUSES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></header>
          <p className="service-text">{item.description}</p>
          {item.photos.length > 0 && <div className="service-photos">{item.photos.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${index + 1}. fotó megnyitása`}><img src={url} alt={`${index + 1}. fotó`} loading="lazy" onError={(event) => { event.currentTarget.replaceWith(Object.assign(document.createElement('span'), { textContent: 'Lejárt link' })) }} /></a>)}</div>}
          {item.photos.length === 0 && <p className="admin-hint"><ImageIcon size={14} /> Fotó nélkül</p>}
          <footer>{lead && <><a href={`tel:${lead.phone.replace(/[^+0-9]/g, '')}`}>{lead.phone}</a><a href={`mailto:${lead.email}`}>{lead.email}</a></>}{installation && <button type="button" className="btn ghost" onClick={() => onOpenInstallation(installation.id)}><ExternalLink size={14} />Telepítés</button>}</footer>
        </article>
      })}</div>}
  </div>
}
