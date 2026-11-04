import { useState } from 'react'
import { formatHuf } from '@/lib/pricing'
import { LEAD_STATUSES, STATUS_COLORS, type LeadRow } from '@/lib/adminLeads'

const dateFormat = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })

export default function AdminLeads({ leads, error, onReload, onStatus }: { leads: LeadRow[]; error: string; onReload: () => void; onStatus: (ref: string, status: string) => void }) {
  const [filter, setFilter] = useState('all')
  const shown = filter === 'all' ? leads : leads.filter((lead) => lead.status === filter)
  const count = (status: string) => leads.filter((lead) => lead.status === status).length

  return <div className="admin-leads">
    {error && <p className="admin-message is-error" role="alert">{error}</p>}
    <div className="admin-filter" role="group" aria-label="Szűrés státusz szerint">
      <button type="button" className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>Mind ({leads.length})</button>
      {LEAD_STATUSES.map(([key, label]) => <button type="button" key={key} className={filter === key ? 'is-on' : ''} onClick={() => setFilter(key)}>{label} ({count(key)})</button>)}
      <button type="button" className="admin-link" onClick={onReload}>Frissítés</button>
    </div>
    {shown.length === 0 && <p className="admin-hint">{leads.length === 0 ? 'Még nem érkezett érdeklődő.' : 'Ebben a státuszban nincs érdeklődő.'}</p>}
    <ul className="admin-lead-list">
      {shown.map((lead) => <li key={lead.ref} className="admin-lead" style={{ ['--pill' as string]: STATUS_COLORS[lead.status] }}>
        <div className="admin-lead-top">
          <div><strong>{lead.customer_name}</strong><small>{lead.ref} · {dateFormat.format(new Date(lead.created_at))}</small></div>
          <strong className="admin-lead-price">{formatHuf(lead.estimate_gross)}<small>bruttó irányár</small></strong>
        </div>
        <p className="admin-lead-place">{[lead.postal_code, lead.city, lead.address].filter(Boolean).join(' ')} · {lead.region}</p>
        {lead.notes && <p className="admin-lead-notes">{lead.notes}</p>}
        <div className="admin-lead-actions">
          <a href={`tel:${lead.phone.replace(/[^+0-9]/g, '')}`}>{lead.phone}</a>
          <a href={`mailto:${lead.email}`}>{lead.email}</a>
          <a href={lead.config_url} target="_blank" rel="noopener noreferrer">Konfiguráció megnyitása</a>
          <select aria-label="Státusz" value={lead.status} onChange={(event) => onStatus(lead.ref, event.target.value)}>
            {LEAD_STATUSES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </li>)}
    </ul>
  </div>
}
