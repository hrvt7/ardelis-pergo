import { useEffect, useState } from 'react'
import { Check, Copy, Download, ExternalLink, GripVertical, KanbanSquare, List, Mail, Phone, Search, X } from 'lucide-react'
import { formatHuf } from '@/lib/pricing'
import { ROOF_INFO } from '@/lib/roofs'
import { initials, LEAD_STATUSES, leadsToCsv, STATUS_COLORS, timeAgo, type LeadRow } from '@/lib/adminLeads'
import type { RoofType } from '@/types/pergola'
import QuoteSection, { type QuoteApi } from '@/components/admin/QuoteSection'
import { PlanSketch } from '@/components/admin/adminKit'

const STATUS_LABEL = Object.fromEntries(LEAD_STATUSES) as Record<string, string>
const dateFormat = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })
const roofName = (lead: LeadRow) => (lead.config?.roof ? ROOF_INFO[lead.config.roof as RoofType]?.name ?? lead.config.roof : '—')

/** Üres állapot: a pergola körvonala kirajzolódik, majd a lamellák „bekapcsolnak”. */
export function EmptyArt() {
  return <svg className="empty-art" viewBox="0 0 120 64" width="132" height="70" aria-hidden="true">
    <path className="ea-ground" d="M6 58h108" />
    <path className="ea-frame" d="M20 58V20M100 58V20M14 20h92" />
    {[0, 1, 2, 3, 4].map((index) => <path key={index} className="ea-louver" style={{ ['--i' as string]: index }} d={`M${26 + index * 15} 16l9 8`} />)}
  </svg>
}

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

function Drawer({ lead, now, quotes, onClose, onUpdate }: { lead: LeadRow; now: number; quotes?: QuoteApi; onClose: () => void; onUpdate: (ref: string, patch: { status?: string; ownerNote?: string }) => void }) {
  const [note, setNote] = useState(lead.owner_note ?? '')
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // Nyitott panel alatt a háttér ne görögjön (mobilon különösen zavaró).
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous }
  }, [onClose])
  const phone = lead.phone.replace(/[^+0-9]/g, '')
  const size = lead.config?.width && lead.config?.depth ? `${lead.config.width} × ${lead.config.depth} m` : null
  return <>
    <div className="drawer-scrim" onClick={onClose} />
    <aside className="drawer" role="dialog" aria-modal="true" aria-label={`${lead.customer_name} részletei`} style={{ ['--pill' as string]: STATUS_COLORS[lead.status] }}>
      <header>
        <span className="avatar big">{initials(lead.customer_name)}</span>
        <div><h2>{lead.customer_name}</h2><small>{lead.ref} · {timeAgo(lead.created_at, now)}</small></div>
        <button type="button" className="icon-btn" aria-label="Bezárás" onClick={onClose}><X size={17} /></button>
      </header>
      <div className="drawer-body">
        <div className="drawer-hero">
          {lead.config?.width && lead.config?.depth && <PlanSketch width={Number(lead.config.width)} depth={Number(lead.config.depth)} roof={lead.config.roof} />}
          <div className="drawer-price"><span>Bruttó irányár</span><strong>{formatHuf(lead.estimate_gross)}</strong><small>{roofName(lead)}{size ? ` · ${size}` : ''}</small></div>
        </div>

        <div className="field-label">Státusz</div>
        <div className="status-chips" role="group" aria-label="Státusz">
          {LEAD_STATUSES.map(([key, label]) => <button type="button" key={key} className={lead.status === key ? 'is-on' : ''} style={{ ['--pill' as string]: STATUS_COLORS[key] }} aria-pressed={lead.status === key} onClick={() => lead.status !== key && onUpdate(lead.ref, { status: key })}>{label}</button>)}
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

        <div className="field-label">Előzmények</div>
        <ol className="timeline">
          <li><i />Felmérési kérés beérkezett<small>{dateFormat.format(new Date(lead.created_at))}</small></li>
          {lead.status !== 'new' && <li><i style={{ background: STATUS_COLORS[lead.status] }} />Jelenlegi státusz: {STATUS_LABEL[lead.status] ?? lead.status}</li>}
          {lead.owner_note && <li><i />Belső megjegyzés rögzítve</li>}
        </ol>

        {quotes && <QuoteSection leadRef={lead.ref} api={quotes} />}

        <div className="field-label">Konfiguráció</div>
        <div className="config-box">
          <Qr url={lead.config_url} />
          <div><a className="btn" href={lead.config_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Megnyitás</a><p>Olvasd be telefonnal, vagy nyisd meg a vevő pontos tervét.</p></div>
        </div>
      </div>
      {/* Gyorsműveletek: mobilon a hüvelykujj alatt, mindig látszanak. */}
      <footer className="drawer-actions">
        <a className="btn primary" href={`tel:${phone}`}><Phone size={16} />Hívás</a>
        <a className="btn" href={`mailto:${lead.email}?subject=${encodeURIComponent('Ajánlat a pergola tervéhez')}&body=${encodeURIComponent(`Kedves ${lead.customer_name.split(' ').slice(-1)[0]}!\n\nKöszönjük a felmérési kérést (${lead.ref}). A megtervezett pergola irányára ${formatHuf(lead.estimate_gross)}. Szívesen egyeztetnénk egy rövid helyszíni felmérésről: mikor alkalmas Önnek?\n\nÜdvözlettel`)}`}><Mail size={16} />E-mail</a>
        <a className="btn" href={lead.config_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Terv</a>
      </footer>
    </aside>
  </>
}

export default function AdminLeads({ leads, error, onReload, onUpdate, quotes, openRef, onOpenRef }: { leads: LeadRow[]; error: string; onReload: () => void; onUpdate: (ref: string, patch: { status?: string; ownerNote?: string }) => void; openRef: string | null; onOpenRef: (ref: string | null) => void; quotes?: Omit<QuoteApi, 'quotes'> & { all: QuoteApi['quotes'] } }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'table' | 'board'>(() => { try { return localStorage.getItem('admin-leads-view') === 'board' ? 'board' : 'table' } catch { return 'table' } })
  const [dragRef, setDragRef] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const chooseView = (next: 'table' | 'board') => { setView(next); try { localStorage.setItem('admin-leads-view', next) } catch { /* privát mód */ } }
  const setOpenRef = onOpenRef
  const [now] = useState(() => Date.now())
  const needle = query.trim().toLowerCase()
  const shown = leads.filter((lead) => (view === 'board' || filter === 'all' || lead.status === filter) && (!needle || [lead.customer_name, lead.city, lead.ref, lead.email, lead.phone].some((field) => field.toLowerCase().includes(needle))))
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
      <div className="seg view-seg" role="group" aria-label="Nézet"><button type="button" className={view === 'table' ? 'is-on' : ''} onClick={() => chooseView('table')}><List size={14} />Tábla</button><button type="button" className={view === 'board' ? 'is-on' : ''} onClick={() => chooseView('board')}><KanbanSquare size={14} />Kanban</button></div>
      <button type="button" className="btn" onClick={exportCsv} disabled={shown.length === 0}><Download size={15} />CSV ({shown.length})</button>
      <button type="button" className="btn ghost" onClick={onReload}>Frissítés</button>
    </div>
    {view === 'table' && <div className="tabs" role="group" aria-label="Szűrés státusz szerint">
      <button type="button" className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>Mind <b>{leads.length}</b></button>
      {LEAD_STATUSES.map(([key, label]) => <button type="button" key={key} className={filter === key ? 'is-on' : ''} onClick={() => setFilter(key)}><i style={{ background: STATUS_COLORS[key] }} />{label} <b>{count(key)}</b></button>)}
    </div>}
    {view === 'board' ? <div className="board" aria-label="Értékesítési tábla">
      {LEAD_STATUSES.map(([key, label]) => {
        const col = shown.filter((lead) => lead.status === key)
        const sum = col.reduce((total, lead) => total + lead.estimate_gross, 0)
        return <section key={key} className={`board-col${overCol === key ? ' is-over' : ''}`} style={{ ['--pill' as string]: STATUS_COLORS[key] }}
          onDragOver={(event) => { event.preventDefault(); if (overCol !== key) setOverCol(key) }} onDragLeave={() => setOverCol((current) => (current === key ? null : current))}
          onDrop={(event) => { event.preventDefault(); const ref = dragRef ?? event.dataTransfer.getData('text/plain'); setOverCol(null); setDragRef(null); const moved = leads.find((lead) => lead.ref === ref); if (moved && moved.status !== key) onUpdate(ref, { status: key }) }}>
          <header><i /><h3>{label}</h3><b>{col.length}</b><small>{sum ? formatHuf(sum) : ''}</small></header>
          <div className="board-list">
            {col.length === 0 && <p className="board-empty">Húzz ide egy kártyát</p>}
            {col.map((lead) => <article key={lead.ref} className={`board-card${dragRef === lead.ref ? ' is-drag' : ''}`} draggable tabIndex={0}
              onDragStart={(event) => { setDragRef(lead.ref); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', lead.ref) }} onDragEnd={() => { setDragRef(null); setOverCol(null) }}
              onClick={() => setOpenRef(lead.ref)} onKeyDown={(event) => { if (event.key === 'Enter') setOpenRef(lead.ref) }}>
              <div className="bc-top"><span className="avatar sm">{initials(lead.customer_name)}</span><b>{lead.customer_name}</b><GripVertical size={14} className="bc-grip" aria-hidden="true" /></div>
              <div className="bc-meta">{lead.city} · {roofName(lead)}</div>
              <div className="bc-foot"><strong>{formatHuf(lead.estimate_gross)}</strong><small>{timeAgo(lead.created_at, now)}</small></div>
              <div className="bc-moves">{LEAD_STATUSES.filter(([other]) => other !== key).slice(0, 4).map(([other, otherLabel]) => <button type="button" key={other} title={`Áthelyezés: ${otherLabel}`} aria-label={`Áthelyezés: ${otherLabel}`} style={{ background: STATUS_COLORS[other] }} onClick={(event) => { event.stopPropagation(); onUpdate(lead.ref, { status: other }) }} />)}</div>
            </article>)}
          </div>
        </section>
      })}
    </div> : shown.length === 0 ? <div className="card empty"><EmptyArt /><strong>{leads.length === 0 ? 'Még nem érkezett érdeklődő.' : 'Nincs a szűrésnek megfelelő érdeklődő.'}</strong><p>{leads.length === 0 ? 'Amint valaki felmérést kér a konfigurátorban, itt jelenik meg.' : 'Próbálj másik státuszt vagy keresőszót.'}</p></div> :
      <div className="card table" role="table">
        <div className="tr th" role="row"><span>Ügyfél</span><span>Település</span><span>Tető</span><span className="num">Irányár</span><span>Státusz</span><span className="num">Érkezett</span></div>
        {shown.map((lead) => <button type="button" role="row" key={lead.ref} className={`tr${openRef === lead.ref ? ' is-open' : ''}`} onClick={() => setOpenRef(lead.ref)}>
          <span className="who"><span className="avatar">{initials(lead.customer_name)}{lead.status === 'new' && now - new Date(lead.created_at).getTime() < 86_400_000 && <i className="new-dot" title="Új érdeklődő" />}</span><span><b>{lead.customer_name}</b><small className="only-wide">{lead.ref}</small><small className="only-narrow">{[lead.city, roofName(lead), timeAgo(lead.created_at, now)].filter((part) => part && part !== '—').join(' · ')}</small></span></span>
          <span className="muted">{lead.city}</span>
          <span className="muted">{roofName(lead)}</span>
          <span className="num strong">{formatHuf(lead.estimate_gross)}</span>
          <span><span className="pill" style={{ ['--pill' as string]: STATUS_COLORS[lead.status] }}>{STATUS_LABEL[lead.status] ?? lead.status}</span></span>
          <span className="num muted">{timeAgo(lead.created_at, now)}</span>
        </button>)}
      </div>}
    {open && <Drawer key={open.ref} lead={open} now={now} quotes={quotes && { quotes: quotes.all.filter((quote) => quote.leadRef === open.ref), create: quotes.create, withdraw: quotes.withdraw }} onClose={() => setOpenRef(null)} onUpdate={onUpdate} />}
  </div>
}
