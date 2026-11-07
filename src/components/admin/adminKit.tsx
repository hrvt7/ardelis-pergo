/* eslint-disable react-refresh/only-export-components */
// Az admin prémium elemei: értesítések (toast), parancspaletta (Cmd+K), induló ellenőrzőlista, beágyazás-generátor, terv-vázlat.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Code2, Copy, Download, ExternalLink, FileText, LayoutDashboard, Search, Settings2, Sparkles, Users } from 'lucide-react'
import { initials, STATUS_COLORS, type LeadRow } from '@/lib/adminLeads'

/* ───────────── Értesítések ───────────── */
export interface Toast { id: number; text: string; kind: 'ok' | 'info' | 'lead'; action?: { label: string; run: () => void } }

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), [])
  const push = useCallback((text: string, kind: Toast['kind'] = 'ok', action?: Toast['action']) => {
    const id = ++seq.current
    setToasts((list) => [...list.slice(-3), { id, text, kind, action }])
    window.setTimeout(() => dismiss(id), kind === 'lead' ? 9000 : 3800)
  }, [dismiss])
  return { toasts, push, dismiss }
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return <div className="toasts" role="status" aria-live="polite">
    {toasts.map((toast) => <div key={toast.id} className={`toast is-${toast.kind}`}>
      <span className="toast-icon">{toast.kind === 'lead' ? <Sparkles size={16} /> : <Check size={16} />}</span>
      <span className="toast-text">{toast.text}</span>
      {toast.action && <button type="button" onClick={() => { toast.action!.run(); onDismiss(toast.id) }}>{toast.action.label}</button>}
    </div>)}
  </div>
}

/* ───────────── Parancspaletta ───────────── */
export interface PaletteCommand { id: string; label: string; hint?: string; icon: ReactNode; run: () => void }

export function CommandPalette(props: { open: boolean; onClose: () => void; commands: PaletteCommand[]; leads: LeadRow[]; onOpenLead: (ref: string) => void }) {
  // Nyitáskor új példány: a keresés és a kijelölés magától nulláról indul.
  return props.open ? <PaletteBody {...props} /> : null
}

function PaletteBody({ onClose, commands, leads, onOpenLead }: { open: boolean; onClose: () => void; commands: PaletteCommand[]; leads: LeadRow[]; onOpenLead: (ref: string) => void }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { const id = window.setTimeout(() => input.current?.focus(), 20); return () => window.clearTimeout(id) }, [])
  const needle = query.trim().toLowerCase()
  const items = useMemo(() => {
    const cmds = commands.filter((command) => !needle || command.label.toLowerCase().includes(needle))
    const found = needle ? leads.filter((lead) => [lead.customer_name, lead.city, lead.ref, lead.email].some((field) => field.toLowerCase().includes(needle))).slice(0, 6) : leads.slice(0, 3)
    return [
      ...cmds.map((command) => ({ key: command.id, group: 'Műveletek', label: command.label, hint: command.hint, icon: command.icon, run: command.run })),
      ...found.map((lead) => ({ key: lead.ref, group: needle ? 'Érdeklődők' : 'Legfrissebb', label: lead.customer_name, hint: `${lead.city} · ${lead.ref}`, icon: <span className="avatar sm">{initials(lead.customer_name)}</span> as ReactNode, run: () => onOpenLead(lead.ref), color: STATUS_COLORS[lead.status] })),
    ]
  }, [commands, leads, needle, onOpenLead])
  const pick = (position: number) => { const item = items[position]; if (item) { onClose(); item.run() } }
  return <div className="palette-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="palette" role="dialog" aria-modal="true" aria-label="Gyorskereső">
      <label className="palette-input"><Search size={17} /><input ref={input} value={query} placeholder="Ugrás, keresés, művelet…" aria-label="Gyorskereső"
        onChange={(event) => { setQuery(event.target.value); setIndex(0) }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setIndex((value) => Math.min(items.length - 1, value + 1)) }
          else if (event.key === 'ArrowUp') { event.preventDefault(); setIndex((value) => Math.max(0, value - 1)) }
          else if (event.key === 'Enter') { event.preventDefault(); pick(index) }
          else if (event.key === 'Escape') onClose()
        }} /><kbd>Esc</kbd></label>
      <ul className="palette-list">
        {items.length === 0 && <li className="palette-empty">Nincs találat.</li>}
        {items.map((item, position) => <li key={item.key}>
          {(position === 0 || items[position - 1].group !== item.group) && <div className="palette-group">{item.group}</div>}
          <button type="button" className={position === index ? 'is-on' : ''} onMouseEnter={() => setIndex(position)} onClick={() => pick(position)}>
            <span className="palette-ico">{item.icon}</span><span className="palette-label">{item.label}</span>{item.hint && <small>{item.hint}</small>}
          </button>
        </li>)}
      </ul>
    </div>
  </div>
}

export const PALETTE_ICONS = { overview: <LayoutDashboard size={16} />, leads: <Users size={16} />, settings: <Settings2 size={16} />, embed: <Code2 size={16} />, csv: <Download size={16} />, report: <FileText size={16} />, open: <ExternalLink size={16} /> }

/* ───────────── Induló ellenőrzőlista ───────────── */
export interface ChecklistItem { key: string; label: string; hint: string; done: boolean; go?: () => void }

export function Checklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((item) => item.done).length
  const ratio = done / items.length
  return <section className="card checklist">
    <header><h3>Induló lista</h3><span className="check-count">{done}/{items.length}</span></header>
    <div className="check-body">
      <svg className="check-ring" viewBox="0 0 44 44" aria-label={`${Math.round(ratio * 100)}% kész`} role="img"><circle cx="22" cy="22" r="18" className="kpi-ring-track" /><circle cx="22" cy="22" r="18" className="kpi-ring-fill" strokeDasharray={`${ratio * 113.1} 113.1`} transform="rotate(-90 22 22)" /><text x="22" y="26" textAnchor="middle">{Math.round(ratio * 100)}%</text></svg>
      <ul>{items.map((item) => <li key={item.key} className={item.done ? 'is-done' : ''}>
        <span className="check-dot">{item.done && <Check size={12} />}</span>
        <div><b>{item.label}</b><small>{item.hint}</small></div>
        {!item.done && item.go && <button type="button" className="ghost-link" onClick={item.go}>Megnyitás</button>}
      </li>)}</ul>
    </div>
  </section>
}

/* ───────────── Beágyazás-generátor ───────────── */
function useCopy() {
  const [done, setDone] = useState<string | null>(null)
  const copy = (key: string, value: string, after?: () => void) => {
    void navigator.clipboard?.writeText(value).then(() => { setDone(key); window.setTimeout(() => setDone(null), 1600); after?.() }).catch(() => undefined)
  }
  return { done, copy }
}

export function EmbedPanel({ tenantId, onCopied }: { tenantId: string; onCopied: () => void }) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const embedUrl = `${origin}/embed/${tenantId}`
  const pageUrl = `${origin}/k/${tenantId}`
  const [height, setHeight] = useState(760)
  const [qr, setQr] = useState('')
  const { done, copy } = useCopy()
  const snippet = `<iframe src="${embedUrl}" title="Pergola konfigurátor" width="100%" height="${height}" style="border:0;border-radius:12px" loading="lazy" allow="fullscreen; xr-spatial-tracking; camera"></iframe>`
  useEffect(() => {
    let alive = true
    void import('qrcode').then(({ toDataURL }) => toDataURL(pageUrl, { width: 320, margin: 1 })).then((data) => { if (alive) setQr(data) }).catch(() => undefined)
    return () => { alive = false }
  }, [pageUrl])
  return <div className="embed">
    <section className="card">
      <header><h3>Beágyazás a weboldalba</h3></header>
      <p className="admin-hint">Másold be a kódot oda, ahol a konfigurátornak meg kell jelennie (pl. „Pergola” aloldal). A beállítások módosításai azonnal élnek, a kódot nem kell cserélni.</p>
      <label className="embed-height"><span>Magasság</span><input type="range" min="520" max="1100" step="20" value={height} onChange={(event) => setHeight(Number(event.target.value))} /><b>{height} px</b></label>
      <pre className="embed-code"><code>{snippet}</code></pre>
      <div className="embed-actions">
        <button type="button" className="btn primary" onClick={() => copy('code', snippet, onCopied)}>{done === 'code' ? <Check size={15} /> : <Copy size={15} />}{done === 'code' ? 'Másolva' : 'Kód másolása'}</button>
        <button type="button" className="btn" onClick={() => copy('link', pageUrl, onCopied)}>{done === 'link' ? <Check size={15} /> : <Copy size={15} />}{done === 'link' ? 'Másolva' : 'Link másolása'}</button>
        <a className="btn" href={pageUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Megnyitás</a>
      </div>
    </section>
    <section className="card embed-qr">
      <header><h3>QR-kód</h3></header>
      {qr ? <img src={qr} width={160} height={160} alt="A konfigurátort megnyitó QR-kód" /> : <div className="qr-ph" />}
      <p className="admin-hint">Nyomtatványra, kiállítói standra, ajánlatra: telefonnal azonnal megnyílik a konfigurátor.</p>
      {qr && <a className="btn" href={qr} download={`konfigurator-${tenantId}-qr.png`}><Download size={15} />PNG letöltése</a>}
    </section>
    <section className="card span-all">
      <header><h3>Élő előnézet</h3><small className="muted">így látják a látogatók</small></header>
      <div className="embed-frame"><iframe src={embedUrl} title="Konfigurátor előnézet" loading="lazy" style={{ height }} /></div>
    </section>
  </div>
}

/* ───────────── Terv-vázlat (felülnézet) ───────────── */
export function PlanSketch({ width, depth, roof }: { width: number; depth: number; roof?: string }) {
  const scale = Math.min(150 / width, 90 / depth)
  const w = width * scale
  const d = depth * scale
  const x = (200 - w) / 2
  const y = (130 - d) / 2
  const louvers = roof === 'louvered' || roof === 'retractable'
  const lines = Math.max(3, Math.round(w / 9))
  return <svg className="plan-sketch" viewBox="0 0 200 130" role="img" aria-label={`Felülnézeti vázlat, ${width} × ${depth} méter`}>
    <rect x="6" y="6" width="188" height="118" rx="10" className="ps-ground" />
    <rect x={x} y={y} width={w} height={d} rx="3" className="ps-roof" />
    {louvers && Array.from({ length: lines }, (_, i) => <line key={i} x1={x + ((i + 1) * w) / (lines + 1)} x2={x + ((i + 1) * w) / (lines + 1)} y1={y + 2} y2={y + d - 2} className="ps-louver" />)}
    {[[x, y], [x + w, y], [x, y + d], [x + w, y + d]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.6" className="ps-post" />)}
    <text x="100" y={y + d + 11} textAnchor="middle" className="ps-dim">{width} m</text>
    <text x={x - 6} y="66" textAnchor="middle" transform={`rotate(-90 ${x - 6} 66)`} className="ps-dim">{depth} m</text>
  </svg>
}
