import { useState } from 'react'
import { Check, Copy, Download, QrCode } from 'lucide-react'
import { formatHuf } from '@/lib/pricing'
import { LEAD_STATUSES, leadsToCsv, STATUS_COLORS, type LeadRow } from '@/lib/adminLeads'

const dateFormat = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  return <button type="button" className="lead-icon" aria-label={`${label} másolása`} title={`${label} másolása`} onClick={() => {
    void navigator.clipboard?.writeText(value).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1400) }).catch(() => undefined)
  }}>{done ? <Check size={14} /> : <Copy size={14} />}</button>
}

function ConfigQr({ url }: { url: string }) {
  const [src, setSrc] = useState('')
  const [open, setOpen] = useState(false)
  const toggle = async () => {
    if (!src) { const { toDataURL } = await import('qrcode'); setSrc(await toDataURL(url, { width: 220, margin: 1 })) }
    setOpen((value) => !value)
  }
  return <span className="lead-qr"><button type="button" className="lead-icon" aria-label="QR-kód a konfigurációhoz" title="QR-kód" onClick={() => void toggle()}><QrCode size={14} /></button>{open && src && <img src={src} width={140} height={140} alt="A konfigurációt megnyitó QR-kód" />}</span>
}

function OwnerNote({ lead, onSave }: { lead: LeadRow; onSave: (note: string) => void }) {
  const [value, setValue] = useState(lead.owner_note ?? '')
  return <label className="lead-note"><span>Belső megjegyzés (a vevő nem látja)</span>
    <textarea rows={2} maxLength={2000} value={value} placeholder="pl. Hétfőn visszahívni, a kertben fa van…" onChange={(event) => setValue(event.target.value)} onBlur={() => { if (value.trim() !== (lead.owner_note ?? '')) onSave(value) }} /></label>
}

export default function AdminLeads({ leads, error, onReload, onUpdate }: { leads: LeadRow[]; error: string; onReload: () => void; onUpdate: (ref: string, patch: { status?: string; ownerNote?: string }) => void }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = leads.filter((lead) => (filter === 'all' || lead.status === filter) && (!needle || [lead.customer_name, lead.city, lead.ref, lead.email, lead.phone].some((field) => field.toLowerCase().includes(needle))))
  const count = (status: string) => leads.filter((lead) => lead.status === status).length
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([leadsToCsv(shown)], { type: 'text/csv;charset=utf-8' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `erdeklodok-${new Date().toISOString().slice(0, 10)}.csv` })
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url)
  }

  return <div className="admin-leads">
    {error && <p className="admin-message is-error" role="alert">{error}</p>}
    <div className="admin-filter" role="group" aria-label="Szűrés státusz szerint">
      <button type="button" className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>Mind ({leads.length})</button>
      {LEAD_STATUSES.map(([key, label]) => <button type="button" key={key} className={filter === key ? 'is-on' : ''} onClick={() => setFilter(key)}>{label} ({count(key)})</button>)}
      <input type="search" className="lead-search" placeholder="Keresés: név, település, azonosító…" aria-label="Keresés" value={query} onChange={(event) => setQuery(event.target.value)} />
      <button type="button" className="admin-link" onClick={exportCsv} disabled={shown.length === 0}><Download size={13} /> CSV ({shown.length})</button>
      <button type="button" className="admin-link" onClick={onReload}>Frissítés</button>
    </div>
    {shown.length === 0 && <p className="admin-hint">{leads.length === 0 ? 'Még nem érkezett érdeklődő.' : 'Nincs a szűrésnek megfelelő érdeklődő.'}</p>}
    <ul className="admin-lead-list">
      {shown.map((lead) => <li key={lead.ref} className="admin-lead" style={{ ['--pill' as string]: STATUS_COLORS[lead.status] }}>
        <div className="admin-lead-top">
          <div><strong>{lead.customer_name}</strong><small>{lead.ref} · {dateFormat.format(new Date(lead.created_at))}</small></div>
          <strong className="admin-lead-price">{formatHuf(lead.estimate_gross)}<small>bruttó irányár</small></strong>
        </div>
        <p className="admin-lead-place">{[lead.postal_code, lead.city, lead.address].filter(Boolean).join(' ')} · {lead.region}</p>
        {lead.notes && <p className="admin-lead-notes">{lead.notes}</p>}
        <div className="lead-statuses" role="group" aria-label="Státusz">
          {LEAD_STATUSES.map(([key, label]) => <button type="button" key={key} className={lead.status === key ? 'is-on' : ''} style={{ ['--pill' as string]: STATUS_COLORS[key] }} aria-pressed={lead.status === key} onClick={() => lead.status !== key && onUpdate(lead.ref, { status: key })}>{label}</button>)}
        </div>
        <div className="admin-lead-actions">
          <span className="lead-contact"><a href={`tel:${lead.phone.replace(/[^+0-9]/g, '')}`}>{lead.phone}</a><CopyButton value={lead.phone} label="Telefonszám" /></span>
          <span className="lead-contact"><a href={`mailto:${lead.email}`}>{lead.email}</a><CopyButton value={lead.email} label="E-mail-cím" /></span>
          <span className="lead-contact"><a href={lead.config_url} target="_blank" rel="noopener noreferrer">Konfiguráció megnyitása</a><ConfigQr url={lead.config_url} /></span>
        </div>
        <OwnerNote lead={lead} onSave={(ownerNote) => onUpdate(lead.ref, { ownerNote })} />
      </li>)}
    </ul>
  </div>
}
