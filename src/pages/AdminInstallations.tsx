// Admin „Telepítések” nézet: a rögzített digitális ikerpéldányok listája, részletek (komponensek, garancia), link, törlés.
import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Download, ExternalLink, ShieldCheck, ShieldOff, Trash2, Wrench, X } from 'lucide-react'
import { qrDataUrl } from '@/lib/qrSticker'
import { downloadStickerPdf, downloadStickerPng } from '@/components/admin/stickerDownload'
import { ownerLink, type AdminInstallation } from '@/lib/adminInstallations'
import { warrantyGroupLabel, warrantyState } from '@/lib/installations'
import { formatMoney } from '@/lib/money'
import type { LeadRow } from '@/lib/adminLeads'
import { EmptyArt } from '@/pages/AdminLeads'

const longDate = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'long' })
const day = (value: string) => longDate.format(new Date(`${value.slice(0, 10)}T12:00:00`))
const PRODUCT_LABEL: Record<string, string> = { pergola: 'Pergola', veranda: 'Veranda', conservatory: 'Télikert' }

function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false)
  return <button type="button" className="btn" onClick={() => { void navigator.clipboard?.writeText(url).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1400) }).catch(() => undefined) }}>{done ? <Check size={15} /> : <Copy size={15} />}{done ? 'Másolva' : 'Link másolása'}</button>
}

function Sticker({ url, brand, headline }: { url: string; brand: { name: string; logoUrl?: string }; headline: string }) {
  const [preview, setPreview] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')
  useEffect(() => { let alive = true; void qrDataUrl(url, 360).then((data) => { if (alive) setPreview(data) }).catch(() => undefined); return () => { alive = false } }, [url])
  const run = async (kind: 'png' | 'pdf') => {
    setState('busy')
    try { await (kind === 'png' ? downloadStickerPng : downloadStickerPdf)({ url, brandName: brand.name, headline, logoUrl: brand.logoUrl }); setState('idle') } catch { setState('error') }
  }
  return <div className="sticker-box">
    {preview && <img src={preview} width={140} height={140} alt="QR-kód a tulajdonosi oldalhoz" />}
    <div>
      <p className="admin-hint">Nyomtatható matrica (80 × 100 mm) a termékre: logó, QR-kód, a termék neve. A tulajdonos a beolvasással éri el a termékkönyvet és a hibabejelentést. Kültérre időjárásálló matricapapír ajánlott.</p>
      <div className="install-actions"><button type="button" className="btn" disabled={state === 'busy'} onClick={() => void run('pdf')}><Download size={15} />PDF (nyomtatáshoz)</button><button type="button" className="btn" disabled={state === 'busy'} onClick={() => void run('png')}><Download size={15} />PNG</button></div>
      {state === 'error' && <p className="admin-message is-error" role="alert">A matrica nem készült el. Próbáld újra.</p>}
    </div>
  </div>
}

function Detail({ item, customer, brand, onClose, onDelete }: { item: AdminInstallation; customer?: string; brand: { name: string; logoUrl?: string }; onClose: () => void; onDelete: (item: AdminInstallation) => Promise<string | null> }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const url = ownerLink(window.location.origin, item.token)
  // A „nem tudom” választás nem valódi komponens: a garancia csak a termékben lévő csoportokra jelenik meg (mint a tulajdonosi oldalon).
  const groups = [...new Set(item.components.filter((component) => component.key !== 'other').map((component) => component.group))]
  return <section className="card install-detail" aria-label="Telepítés részletei">
    <header><div><h2>{item.headline}</h2><small>{[customer, item.leadRef, PRODUCT_LABEL[item.product] ?? item.product].filter(Boolean).join(' · ')}</small></div><button type="button" className="icon-btn" aria-label="Bezárás" onClick={onClose}><X size={17} /></button></header>
    <dl className="facts">
      <div><dt>Telepítés napja</dt><dd>{day(item.installedAt)}</dd></div>
      {item.price && <div><dt>Ár a rögzítéskor</dt><dd>{formatMoney(item.price.totalGross, item.price.currency as 'HUF' | 'EUR')} bruttó <small>({item.price.source === 'quote' ? 'elfogadott ajánlat' : 'árlista szerinti irányár'})</small></dd></div>}
      {item.note && <div><dt>Belső megjegyzés</dt><dd>{item.note}</dd></div>}
    </dl>
    <div className="field-label">Garancia</div>
    <ul className="warranty-list">
      {groups.map((group) => {
        const state = warrantyState(item.installedAt, item.warranty[group])
        return <li key={group} className={state.active ? 'is-active' : 'is-expired'}>{state.active ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}<b>{warrantyGroupLabel(group)}</b><span>{item.warranty[group]} hónap · {state.active ? 'lejár' : 'lejárt'}: {day(state.expiresAt)}</span></li>
      })}
    </ul>
    <div className="field-label">Komponensek <small>(a hibabejelentés csak ezek közül választhat)</small></div>
    <ul className="component-list">{item.components.filter((component) => component.key !== 'other').map((component) => <li key={component.key}>{component.label}<small>{warrantyGroupLabel(component.group)}</small></li>)}</ul>
    <div className="field-label">Tulajdonosi oldal</div>
    <p className="admin-hint">Bejelentkezés nélküli, titkos link: a tulajdonos itt látja a termékét és a garanciát, és innen jelent be hibát. Személyes adatot nem mutat. Aki a linket ismeri, megnyithatja: csak a tulajdonosnak add át.</p>
    <div className="install-actions"><a className="btn primary" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Megnyitás</a><CopyLink url={url} /></div>
    <div className="field-label">QR-matrica</div>
    <Sticker url={url} brand={brand} headline={item.headline} />
    <div className="field-label">Törlés</div>
    <p className="admin-hint">Végleges: a telepítés, a hibabejelentések, a fotók és a napló is törlődik, a tulajdonosi link megszűnik.</p>
    {error && <p className="admin-message is-error" role="alert">{error}</p>}
    {confirm ? <div className="install-actions"><button type="button" className="btn danger" disabled={busy} onClick={async () => { setBusy(true); const failed = await onDelete(item); setBusy(false); if (failed) setError(failed) }}><Trash2 size={15} />{busy ? 'Törlés…' : 'Igen, végleges törlés'}</button><button type="button" className="btn ghost" onClick={() => setConfirm(false)} disabled={busy}>Mégse</button></div>
      : <button type="button" className="btn ghost" onClick={() => setConfirm(true)}><Trash2 size={15} />Telepítés törlése</button>}
  </section>
}

export default function AdminInstallations({ installations, leads, error, selected, onSelect, onDelete, demo, brand }: { brand: { name: string; logoUrl?: string }; installations: AdminInstallation[]; leads: LeadRow[]; error: string; selected: number | null; onSelect: (id: number | null) => void; onDelete: (item: AdminInstallation) => Promise<string | null>; demo?: boolean }) {
  const names = useMemo(() => new Map(leads.map((lead) => [lead.ref, lead.customer_name])), [leads])
  const open = installations.find((item) => item.id === selected) ?? null
  return <div className="installations">
    {error && <p className="admin-message is-error" role="alert">{error}</p>}
    {demo && <p className="admin-hint">Demó módban a telepítések nem rögzíthetők.</p>}
    {installations.length === 0 ? <div className="card empty"><EmptyArt /><strong>Még nincs rögzített telepítés.</strong><p>Egy „Megnyert” érdeklődő paneljén a „Telepítés rögzítése” gombbal hozhatod létre az első digitális ikerpéldányt.</p></div>
      : <div className="card table" role="table">
        <div className="tr-wrap" role="row"><div className="tr th install-tr"><span>Ügyfél</span><span>Termék</span><span>Telepítve</span><span>Garancia</span></div></div>
        {installations.map((item) => {
          const active = Object.entries(item.warranty).filter(([group]) => item.components.some((component) => component.key !== 'other' && component.group === group)).some(([, months]) => warrantyState(item.installedAt, months).active)
          return <div role="row" key={item.id} className="tr-wrap"><button type="button" className={`tr install-tr${selected === item.id ? ' is-open' : ''}`} onClick={() => onSelect(item.id)}>
            <span className="who"><span className="avatar"><Wrench size={14} /></span><span><b>{(item.leadRef && names.get(item.leadRef)) || item.leadRef || '—'}</b><small>{item.leadRef}</small></span></span>
            <span className="muted">{item.headline}</span>
            <span className="muted">{day(item.installedAt)}</span>
            <span><span className={`pill${active ? '' : ' is-muted'}`}>{active ? 'Érvényes' : 'Lejárt'}</span></span>
          </button></div>
        })}
      </div>}
    {open && <Detail key={open.id} brand={brand} item={open} customer={open.leadRef ? names.get(open.leadRef) : undefined} onClose={() => onSelect(null)} onDelete={onDelete} />}
  </div>
}
