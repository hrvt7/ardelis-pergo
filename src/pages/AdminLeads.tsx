import { useEffect, useState } from 'react'
import { Check, Copy, Download, ExternalLink, Mail, Phone, Search, X } from 'lucide-react'
import { formatHuf } from '@/lib/pricing'
import { ROOF_INFO } from '@/lib/roofs'
import { initials, LEAD_STATUSES, leadsToCsv, STATUS_COLORS, timeAgo, type LeadRow } from '@/lib/adminLeads'
import type { RoofType } from '@/types/pergola'

const STATUS_LABEL = Object.fromEntries(LEAD_STATUSES) as Record<string, string>
const dateFormat = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })
const roofName = (lead: LeadRow) => (lead.config?.roof ? ROOF_INFO[lead.config.roof as RoofType]?.name ?? lead.config.roof : '—')

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  return <button type="button" className="icon-btn" aria-label={`${label} másolása`} title={`${label} másolása`} onClick={() => {
    void navigator.clipboard?.writeText(value).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1400) }).catch(() => undefined)
  }}>{done ? <Check size={15} /> : <Copy size={15} />}</button>
}

function Qr({ url }: { url: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let alive = true
    void import('qrcode').then(({ toDataURL }) => toDataURL(url, { width: 240, margin: 1 })).then((data) => { if (alive) setSrc(data) }).catch(() => undefined)
    return () => { alive = false }
  }, [url])
  return src ? <img className="drawer-qr" src={src} width={120} height={120} alt="A konfigurációt megnyitó QR-kód" /> : null
}

function Drawer({ lead, now, onClose, onUpdate }: { lead: LeadRow; now: number; onClose: () => void; onUpdate: (ref: string, patch: { status?: string; ownerNote?: string }) => void }) {
  const [note, setNote] = useState(lead.owner_note ?? '')
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const phone = lead.phone.replace(/[^+0-9]/g, '')
  const size = lead.config?.width && lead.config?.depth ? `${lead.config.width} × ${lead.config.depth} m` : null
  return <>
    <div className="drawer-scrim" onClick={onClose} />
    <aside className="drawer" role="dialog" aria-label={`${lead.customer_name} részletei`} style={{ ['--pill' as string]: STATUS_COLORS[lead.status] }}>
      <header>
        <span className="avatar big">{initials(lead.customer_name)}</span>
        <div><h2>{lead.customer_name}</h2><small>{lead.ref} · {timeAgo(lead.created_at, now)}</small></div>
        <button type="button" className="icon-btn" aria-label="Bezárás" onClick={onClose}><X size={17} /></button>
      </header>
      <div className="drawer-body">
        <div className="drawer-price"><span>Bruttó irányár</span><strong>{formatHuf(lead.estimate_gross)}</strong></div>

        <div className="field-label">Státusz</div>
        <div className="status-chips" role="group" aria-label="Státusz">
          {LEAD_STATUSES.map(([key, label]) => <button type="button" key={key} className={lead.status === key ? 'is-on' : ''} style={{ ['--pill' as string]: STATUS_COLORS[key] }} aria-pressed={lead.status === key} onClick={() => lead.status !== key && onUpdate(lead.ref, { status: key })}>{label}</button>)}
        </div>

        <div className="contact-actions">
          <a className="btn primary" href={`tel:${phone}`}><Phone size={15} />Hívás</a>
          <a className="btn" href={`mailto:${lead.email}`}><Mail size={15} />E-mail</a>
        </div>
        <dl className="facts">
          <div><dt>Telefon</dt><dd>{lead.phone}<CopyButton value={lead.phone} label="Telefonszám" /></dd></div>
          <div><dt>E-mail</dt><dd>{lead.email}<CopyButton value={lead.email} label="E-mail-cím" /></dd></div>
          <div><dt>Hely</dt><dd>{[lead.postal_code, lead.city, lead.address].filter(Boolean).join(' ')}{lead.region ? ` · ${lead.region}` : ''}</dd></div>
          <div><dt>Tető</dt><dd>{roofName(lead)}{size ? ` · ${size}` : ''}</dd></div>
          <div><dt>Érkezett</dt><dd>{dateFormat.format(new Date(lead.created_at))}</dd></div>
        </dl>

        {lead.notes && <><div className="field-label">A vevő megjegyzése</div><p className="customer-note">{lead.notes}</p></>}

        <label className="field-label" htmlFor="owner-note">Belső megjegyzés <small>(a vevő nem látja)</small></label>
        <textarea id="owner-note" rows={4} maxLength={2000} value={note} placeholder="pl. Hétfőn visszahívni, a kertben fa van…" onChange={(event) => setNote(event.target.value)} onBlur={() => { if (note.trim() !== (lead.owner_note ?? '')) onUpdate(lead.ref, { ownerNote: note }) }} />

        <div className="field-label">Konfiguráció</div>
        <div className="config-box">
          <Qr url={lead.config_url} />
          <div><a className="btn" href={lead.config_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Megnyitás</a><p>Olvasd be telefonnal, vagy nyisd meg a vevő pontos tervét.</p></div>
        </div>
      </div>
    </aside>
  </>
}

export default function AdminLeads({ leads, error, onReload, onUpdate }: { leads: LeadRow[]; error: string; onReload: () => void; onUpdate: (ref: string, patch: { status?: string; ownerNote?: string }) => void }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [openRef, setOpenRef] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const needle = query.trim().toLowerCase()
  const shown = leads.filter((lead) => (filter === 'all' || lead.status === filter) && (!needle || [lead.customer_name, lead.city, lead.ref, lead.email, lead.phone].some((field) => field.toLowerCase().includes(needle))))
  const count = (status: string) => leads.filter((lead) => lead.status === status).length
  const open = leads.find((lead) => lead.ref === openRef) ?? null
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([leadsToCsv(shown)], { type: 'text/csv;charset=utf-8' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `erdeklodok-${new Date().toISOString().slice(0, 10)}.csv` })
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url)
  }

  return <div className="leads">
    {error && <p className="admin-message is-error" role="alert">{error}</p>}
    <div className="toolbar">
      <label className="search"><Search size={15} /><input type="search" placeholder="Keresés: név, település, azonosító…" aria-label="Keresés" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <button type="button" className="btn" onClick={exportCsv} disabled={shown.length === 0}><Download size={15} />CSV ({shown.length})</button>
      <button type="button" className="btn ghost" onClick={onReload}>Frissítés</button>
    </div>
    <div className="tabs" role="group" aria-label="Szűrés státusz szerint">
      <button type="button" className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>Mind <b>{leads.length}</b></button>
      {LEAD_STATUSES.map(([key, label]) => <button type="button" key={key} className={filter === key ? 'is-on' : ''} onClick={() => setFilter(key)}><i style={{ background: STATUS_COLORS[key] }} />{label} <b>{count(key)}</b></button>)}
    </div>
    {shown.length === 0 ? <div className="card empty"><strong>{leads.length === 0 ? 'Még nem érkezett érdeklődő.' : 'Nincs a szűrésnek megfelelő érdeklődő.'}</strong><p>{leads.length === 0 ? 'Amint valaki felmérést kér a konfigurátorban, itt jelenik meg.' : 'Próbálj másik státuszt vagy keresőszót.'}</p></div> :
      <div className="card table" role="table">
        <div className="tr th" role="row"><span>Ügyfél</span><span>Település</span><span>Tető</span><span className="num">Irányár</span><span>Státusz</span><span className="num">Érkezett</span></div>
        {shown.map((lead) => <button type="button" role="row" key={lead.ref} className={`tr${openRef === lead.ref ? ' is-open' : ''}`} onClick={() => setOpenRef(lead.ref)}>
          <span className="who"><span className="avatar">{initials(lead.customer_name)}</span><span><b>{lead.customer_name}</b><small>{lead.ref}</small></span></span>
          <span className="muted">{lead.city}</span>
          <span className="muted">{roofName(lead)}</span>
          <span className="num strong">{formatHuf(lead.estimate_gross)}</span>
          <span><span className="pill" style={{ ['--pill' as string]: STATUS_COLORS[lead.status] }}>{STATUS_LABEL[lead.status] ?? lead.status}</span></span>
          <span className="num muted">{timeAgo(lead.created_at, now)}</span>
        </button>)}
      </div>}
    {open && <Drawer key={open.ref} lead={open} now={now} onClose={() => setOpenRef(null)} onUpdate={onUpdate} />}
  </div>
}
