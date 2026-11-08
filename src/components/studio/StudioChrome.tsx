// Termékfüggetlen stúdió-keret, amelyet minden konfigurátor (pergola/carport, kerítés, garázskapu) használ:
// fejléc (gyártói márka, termékváltó, teljes képernyő, visszavonás, Bemutató, Tudnivalók/Árazás, Alaphelyzet),
// jelenet-eszköztár (napszak-váltó, a termék gyorsgombjai, „Eszközök” menü) és a „Nézet és vizualizáció” panel.
// A termék csak a saját eszközeit és a saját nézet-beállításait adja hozzá; a közös rész mindenhol azonos.
import { useEffect, useState, type ReactNode } from 'react'
import { Box, Download, House, Info, LayoutGrid, Link2, Moon, Presentation, Redo2, RotateCcw, SlidersHorizontal, Sun, Sunset, Undo2, X, type LucideIcon } from 'lucide-react'
import FullscreenControl from '@/components/FullscreenControl'
import { ProductSwitch } from '@/components/ProductChooser'
import TenantMark from '@/components/TenantMark'
import { useTenant } from '@/tenants/TenantContext'
import { STUDIO_TIMES, type StudioTime } from '@/lib/studioLighting'

export interface StudioView { time: StudioTime; environment: boolean; showPerson: boolean; dimensions: boolean; autoRotate: boolean }

export function StudioHeader({ onHome, canUndo, canRedo, onUndo, onRedo, presentation, onPresentation, onInfo, infoLabel = 'Tudnivalók', onReset }: { onHome: () => void; canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; presentation: boolean; onPresentation: () => void; onInfo?: () => void; infoLabel?: string; onReset: () => void }) {
  const { tenant } = useTenant()
  return <header className="app-header">
    <a className="brand" href="#top" aria-label={`${tenant.brand.name} kezdőnézet`} onClick={(event) => { event.preventDefault(); onHome() }}><TenantMark tenant={tenant} /></a>
    <div className="project-identity"><span>ÉPÍTÉSZETI KONFIGURÁTOR</span><ProductSwitch /></div>
    <div className="header-actions">
      <FullscreenControl />
      <div className="history-actions"><button type="button" aria-label="Visszavonás" title="Visszavonás · Ctrl+Z" onClick={onUndo} disabled={!canUndo}><Undo2 size={17} /></button><button type="button" aria-label="Ismétlés" title="Ismétlés · Ctrl+Shift+Z" onClick={onRedo} disabled={!canRedo}><Redo2 size={17} /></button></div>
      <button type="button" className="header-text-button presentation-toggle" aria-label={presentation ? 'Szerkesztés' : 'Bemutató'} onClick={onPresentation}><Presentation size={16} /><span>{presentation ? 'Szerkesztés' : 'Bemutató'}</span></button>
      {onInfo && <button type="button" className="header-text-button" aria-label={infoLabel} onClick={onInfo}><Info size={16} /><span>{infoLabel}</span></button>}
      <button type="button" className="header-text-button" aria-label="Alaphelyzet" onClick={onReset}><RotateCcw size={16} /><span>Alaphelyzet</span></button>
    </div>
  </header>
}

export type ToolItem = { id: string; icon: LucideIcon; name: string; note: string; active?: boolean; run: () => void }
export type QuickToggle = { id: string; icon: LucideIcon; label: string; title: string; active?: boolean; className?: string; run: () => void }

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className={`extra-card ${checked ? 'is-on' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span><strong>{label}</strong><small>{description}</small></span><span className={`switch-track ${checked ? 'is-on' : ''}`}><span /></span></button>
}

const TIME_ICONS: Record<StudioTime, LucideIcon> = { day: Sun, sunset: Sunset, night: Moon }

/** A „Nézet és vizualizáció” panel termékfüggetlen tartalma (a kerítés és a garázskapu ezt használja). */
export function StudioViewSettings({ view, productName, onChange }: { view: StudioView; productName: string; onChange: (patch: Partial<StudioView>) => void }) {
  return <div className="scene-settings-body">
    <div className="section-title"><h3>Napszak</h3><p>A jelenet megvilágítása: déli nap, meleg aranyóra vagy esti fények.</p></div>
    <div className="scene-options compact" role="radiogroup" aria-label="Napszak">{STUDIO_TIMES.map(({ id, label }) => { const Icon = TIME_ICONS[id]; return <button type="button" role="radio" aria-checked={view.time === id} key={id} className={view.time === id ? 'selected' : ''} onClick={() => onChange({ time: id })}><Icon size={17} /><span>{label}</span></button> })}</div>
    <div className="section-title"><h3>Környezet</h3><p>Családi ház a háttérben, vagy csak a termék semleges háttér előtt – katalógus-bemutatóhoz.</p></div>
    <div className="scene-options compact two" role="radiogroup" aria-label="Környezet">
      <button type="button" role="radio" aria-checked={view.environment} className={view.environment ? 'selected' : ''} onClick={() => onChange({ environment: true })}><House size={17} /><span>Családi ház</span></button>
      <button type="button" role="radio" aria-checked={!view.environment} className={!view.environment ? 'selected' : ''} onClick={() => onChange({ environment: false })}><Box size={17} /><span>Csak {productName}</span></button>
    </div>
    <div className="scene-toggle-grid">
      <ToggleRow label="180 cm-es figura" description="A méretek szemléltetéséhez" checked={view.showPerson} onChange={(showPerson) => onChange({ showPerson })} />
      <ToggleRow label="Méretcímkék" description="Aktuális méretek centiméterben" checked={view.dimensions} onChange={(dimensions) => onChange({ dimensions })} />
      <ToggleRow label="Automata forgatás" description="Lassú körbeforgás; húzásra megáll" checked={view.autoRotate} onChange={(autoRotate) => onChange({ autoRotate })} />
    </div>
  </div>
}

/**
 * Jelenet-eszköztár (jobb felső sarok): napszak-váltó, a termék gyorsgombjai, „Eszközök” menü.
 * Az Eszközök menüben elöl a „Nézet és vizualizáció” és a termék saját eszközei, utána a közös Bemutató, PDF, Megosztás.
 */
export function SceneToolbar({ time, onTimeChange, viewPanel, quick = [], tools = [], toolsBusy = false, presentation, onPresentation, onExport, onShare }: { time: StudioTime; onTimeChange: (time: StudioTime) => void; viewPanel: ReactNode; quick?: QuickToggle[]; tools?: ToolItem[]; toolsBusy?: boolean; presentation: boolean; onPresentation: () => void; onExport: () => void; onShare: () => void }) {
  const [toolsOpen, setToolsOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  useEffect(() => {
    if (!toolsOpen && !viewOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setToolsOpen(false); setViewOpen(false) } }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [toolsOpen, viewOpen])
  const nextTime: Record<StudioTime, StudioTime> = { day: 'sunset', sunset: 'night', night: 'day' }
  const TimeIcon = TIME_ICONS[time]
  const timeLabel = STUDIO_TIMES.find((item) => item.id === time)?.label
  const items: ToolItem[] = [
    { id: 'view', icon: SlidersHorizontal, name: 'Nézet és vizualizáció', note: 'Napszak, környezet, méretarány, feliratok, forgatás', run: () => setViewOpen(true) },
    ...tools,
    { id: 'presentation', icon: Presentation, name: presentation ? 'Kilépés a bemutatóból' : 'Bemutató mód', note: 'Csak a 3D jelenet, panelek nélkül — ügyfélnek mutatáshoz', active: presentation, run: onPresentation },
    { id: 'pdf', icon: Download, name: 'PDF összefoglaló', note: 'Műszaki tartalom, kép és tételes irányár', run: onExport },
    { id: 'share', icon: Link2, name: 'Megosztás', note: 'Hivatkozás erre a konfigurációra', run: onShare },
  ]
  return <>
    <div className="weather-toolbar" aria-label="Gyors jelenetbeállítások">
      <button type="button" title={`Napszak: ${timeLabel} — váltás`} aria-label={`Napszak: ${timeLabel}`} onClick={() => onTimeChange(nextTime[time])} className={time !== 'day' ? 'selected' : ''}><TimeIcon size={17} /><span>{timeLabel}</span></button>
      {quick.map(({ id, icon: Icon, label, title, active, className, run }) => <button type="button" key={id} className={[className, active ? 'selected' : ''].filter(Boolean).join(' ')} aria-pressed={active === undefined ? undefined : active} title={title} onClick={run}><Icon size={17} /><span>{label}</span></button>)}
      <button type="button" className={`view-toggle tools-toggle ${toolsOpen || viewOpen || toolsBusy ? 'selected' : ''}`} aria-pressed={toolsOpen} aria-expanded={toolsOpen} title="Eszközök: nézet, napszak, környezet, bemutató, PDF, megosztás" onClick={() => { setToolsOpen((open) => !open); setViewOpen(false) }}><LayoutGrid size={17} /><span>Eszközök</span></button>
    </div>
    {toolsOpen && <div className="view-popover tools-menu glass-panel" role="dialog" aria-label="Eszközök"><div className="view-popover-head"><strong>Eszközök</strong><button type="button" aria-label="Bezárás" onClick={() => setToolsOpen(false)}><X size={16} /></button></div>
      <div className="tools-list">{items.map(({ id, icon: Icon, name, note, active, run }) => <button type="button" key={id} className={`tools-item${active ? ' is-active' : ''}`} aria-pressed={Boolean(active)} onClick={() => { setToolsOpen(false); run() }}><Icon size={18} /><span><strong>{name}</strong><small>{note}</small></span>{active && <em>Bekapcsolva</em>}</button>)}</div>
    </div>}
    {viewOpen && <div className="view-popover glass-panel" role="dialog" aria-label="Nézet és vizualizáció"><div className="view-popover-head"><strong>Nézet és vizualizáció</strong><button type="button" aria-label="Bezárás" onClick={() => setViewOpen(false)}><X size={16} /></button></div>{viewPanel}</div>}
  </>
}
