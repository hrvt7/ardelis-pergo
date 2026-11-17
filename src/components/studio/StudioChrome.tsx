// Termékfüggetlen stúdió-keret, amelyet minden konfigurátor (pergola/carport, kerítés, garázskapu) használ:
// fejléc (gyártói márka, termékváltó, teljes képernyő, visszavonás, Bemutató, Tudnivalók/Árazás, Alaphelyzet),
// jelenet-eszköztár (napszak-váltó, a termék gyorsgombjai, „Eszközök” menü) és a „Nézet és vizualizáció” panel.
// A termék csak a saját eszközeit és a saját nézet-beállításait adja hozzá; a közös rész mindenhol azonos.
import { useEffect, useState, type ReactNode } from 'react'
import { Box, Download, House, Info, LayoutGrid, Link2, Moon, Presentation, Redo2, RotateCcw, SlidersHorizontal, Sun, Sunset, Undo2, X, type LucideIcon } from 'lucide-react'
import { formatPrice } from '@/lib/pricing'
import type { PriceChange } from '@/components/studio/studioState'
import FullscreenControl from '@/components/FullscreenControl'
import { ProductSwitch } from '@/components/ProductChooser'
import TenantMark from '@/components/TenantMark'
import { useTenant } from '@/tenants/TenantContext'
import { STUDIO_TIMES, type StudioTime } from '@/lib/studioLighting'
import { tr } from '../../i18n/locale'

export interface StudioView { time: StudioTime; environment: boolean; showPerson: boolean; dimensions: boolean; autoRotate: boolean }

export function StudioHeader({ onHome, canUndo, canRedo, onUndo, onRedo, presentation, onPresentation, onInfo, infoLabel = tr('Tudnivalók', 'Hinweise'), onReset }: { onHome: () => void; canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; presentation: boolean; onPresentation: () => void; onInfo?: () => void; infoLabel?: string; onReset: () => void }) {
  const { tenant } = useTenant()
  return <header className="app-header">
    <a className="brand" href="#top" aria-label={`${tenant.brand.name} ${tr('kezdőnézet', 'Startansicht')}`} onClick={(event) => { event.preventDefault(); onHome() }}><TenantMark tenant={tenant} /></a>
    <div className="project-identity"><span>{tr('ÉPÍTÉSZETI KONFIGURÁTOR', 'ARCHITEKTUR-KONFIGURATOR')}</span><ProductSwitch /></div>
    <div className="header-actions">
      <FullscreenControl />
      <div className="history-actions"><button type="button" aria-label={tr('Visszavonás', 'Rückgängig')} title={tr('Visszavonás · Ctrl+Z', 'Rückgängig · Strg+Z')} onClick={onUndo} disabled={!canUndo}><Undo2 size={17} /></button><button type="button" aria-label={tr('Ismétlés', 'Wiederholen')} title={tr('Ismétlés · Ctrl+Shift+Z', 'Wiederholen · Strg+Umschalt+Z')} onClick={onRedo} disabled={!canRedo}><Redo2 size={17} /></button></div>
      <button type="button" className="header-text-button presentation-toggle" aria-label={presentation ? tr('Vissza a szerkesztéshez', 'Zurück zur Bearbeitung') : tr('Bemutató nézet: a panelek elrejtése, csak a terv látszik', 'Präsentationsansicht: Panels ausblenden, nur der Entwurf ist sichtbar')} title={presentation ? tr('Vissza a szerkesztéshez', 'Zurück zur Bearbeitung') : tr('A panelek elrejtése, csak a terv látszik', 'Panels ausblenden, nur der Entwurf ist sichtbar')} onClick={onPresentation}><Presentation size={16} /><span>{presentation ? tr('Szerkesztés', 'Bearbeiten') : tr('Bemutató nézet', 'Präsentation')}</span></button>
      {onInfo && <button type="button" className="header-text-button" aria-label={infoLabel} onClick={onInfo}><Info size={16} /><span>{infoLabel}</span></button>}
      <ResetButton onReset={onReset} />
    </div>
  </header>
}

/** Újrakezdés kétlépcsős megerősítéssel (böngészős felugró ablak nélkül): az első kattintás csak rákérdez. */
function ResetButton({ onReset }: { onReset: () => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 3500)
    return () => window.clearTimeout(timer)
  }, [armed])
  return <button type="button" className={`header-text-button reset-button${armed ? ' is-armed' : ''}`} aria-label={armed ? tr('Biztosan újrakezded? A mostani terv elvész. Kattints újra a megerősítéshez.', 'Wirklich neu beginnen? Der aktuelle Entwurf geht verloren. Zum Bestätigen erneut klicken.') : tr('Újrakezdés: minden beállítás visszaáll', 'Neu beginnen: alle Einstellungen werden zurückgesetzt')} title={tr('Minden beállítás visszaáll az alapra', 'Alle Einstellungen werden zurückgesetzt')} onClick={() => { if (armed) { setArmed(false); onReset() } else setArmed(true) }}><RotateCcw size={16} /><span aria-live="polite">{armed ? tr('Biztosan? Kattints újra', 'Sicher? Erneut klicken') : tr('Újrakezdés', 'Neu beginnen')}</span></button>
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
    <div className="section-title"><h3>{tr('Napszak', 'Tageszeit')}</h3><p>{tr('A jelenet megvilágítása: déli nap, meleg aranyóra vagy esti fények.', 'Beleuchtung der Szene: Mittagssonne, warme goldene Stunde oder Abendlicht.')}</p></div>
    <div className="scene-options compact" role="radiogroup" aria-label={tr('Napszak', 'Tageszeit')}>{STUDIO_TIMES.map(({ id, label }) => { const Icon = TIME_ICONS[id]; return <button type="button" role="radio" aria-checked={view.time === id} key={id} className={view.time === id ? 'selected' : ''} onClick={() => onChange({ time: id })}><Icon size={17} /><span>{label}</span></button> })}</div>
    <div className="section-title"><h3>{tr('Környezet', 'Umgebung')}</h3><p>{tr('Családi ház a háttérben, vagy csak a termék semleges háttér előtt – katalógus-bemutatóhoz.', 'Einfamilienhaus im Hintergrund oder nur das Produkt vor neutralem Hintergrund – für die Katalogpräsentation.')}</p></div>
    <div className="scene-options compact two" role="radiogroup" aria-label={tr('Környezet', 'Umgebung')}>
      <button type="button" role="radio" aria-checked={view.environment} className={view.environment ? 'selected' : ''} onClick={() => onChange({ environment: true })}><House size={17} /><span>{tr('Családi ház', 'Einfamilienhaus')}</span></button>
      <button type="button" role="radio" aria-checked={!view.environment} className={!view.environment ? 'selected' : ''} onClick={() => onChange({ environment: false })}><Box size={17} /><span>Csak {productName}</span></button>
    </div>
    <div className="scene-toggle-grid">
      <ToggleRow label={tr('180 cm-es figura', '180-cm-Figur')} description={tr('A méretek szemléltetéséhez', 'Zur Veranschaulichung der Größe')} checked={view.showPerson} onChange={(showPerson) => onChange({ showPerson })} />
      <ToggleRow label={tr('Méretcímkék', 'Maßangaben')} description={tr('Aktuális méretek centiméterben', 'Aktuelle Maße in Zentimetern')} checked={view.dimensions} onChange={(dimensions) => onChange({ dimensions })} />
      <ToggleRow label={tr('Automata forgatás', 'Automatisch drehen')} description={tr('Lassú körbeforgás; húzásra megáll', 'Langsame Drehung; stoppt beim Ziehen')} checked={view.autoRotate} onChange={(autoRotate) => onChange({ autoRotate })} />
    </div>
  </div>
}

/**
 * Jelenet-eszköztár (jobb felső sarok): napszak-váltó, a termék gyorsgombjai, „Eszközök” menü.
 * Az Eszközök menüben elöl a „Nézet és vizualizáció” és a termék saját eszközei, utána a közös Bemutató, PDF, Megosztás.
 */
export function SceneToolbar({ time, onTimeChange, viewPanel, quick = [], tools = [], toolsBusy = false, presentation, onPresentation, onExport, onShare, leading, variant = 'bar', onToolUse }: { /** A fülben választott eszköz azonosítója (a napszaké 'time') – a stúdió ezzel zárja a többi eszköz nyitva maradt paneljét. */ onToolUse?: (id: string) => void; /** „rail”: a képernyő jobb széléből kinövő fekete fül, benne minden eszköz ikonként (a pergola-stúdió lebegő elrendezése, 4.76). */ variant?: 'bar' | 'rail'; time: StudioTime; onTimeChange: (time: StudioTime) => void; viewPanel: ReactNode; /** Az eszközsor elejére kerülő elem (pl. kameranézet-menü). */ leading?: ReactNode; quick?: QuickToggle[]; tools?: ToolItem[]; toolsBusy?: boolean; presentation: boolean; onPresentation: () => void; onExport: () => void; onShare: () => void }) {
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
  // Telefonon a gyors kapcsolók (bejárás, időjárás stb.) feliratos menüpontként az Eszközök között vannak,
  // a jelenet szélén csak a nézet, a napszak és az Eszközök ikon marad (H13).
  const quickItems: (ToolItem & { mobileOnly: true })[] = quick.map(({ id, icon, label, title, active, run }) => ({ id: `quick-${id}`, icon, name: label, note: title, active, run, mobileOnly: true }))
  const items: (ToolItem & { mobileOnly?: boolean })[] = [
    ...quickItems,
    { id: 'view', icon: SlidersHorizontal, name: tr('Nézet és vizualizáció', 'Ansicht und Visualisierung'), note: tr('Napszak, környezet, méretarány, feliratok, forgatás', 'Tageszeit, Umgebung, Maßstab, Beschriftungen, Drehung'), run: () => setViewOpen((open) => !open) },
    ...tools,
    { id: 'presentation', icon: Presentation, name: presentation ? tr('Kilépés a bemutatóból', 'Präsentation beenden') : tr('Bemutató mód', 'Präsentationsmodus'), note: tr('Csak a 3D jelenet, panelek nélkül — ügyfélnek mutatáshoz', 'Nur die 3D-Szene, ohne Panels — zum Zeigen beim Kunden'), active: presentation, run: onPresentation },
    { id: 'pdf', icon: Download, name: tr('PDF összefoglaló', 'PDF-Zusammenfassung'), note: tr('Műszaki tartalom, kép és tételes irányár', 'Technischer Inhalt, Bild und detaillierter Richtpreis'), run: onExport },
    { id: 'share', icon: Link2, name: tr('Megosztás', 'Teilen'), note: tr('Hivatkozás erre a konfigurációra', 'Link zu dieser Konfiguration'), run: onShare },
  ]
  const viewPopover = viewOpen && <div className="view-popover glass-panel" role="dialog" aria-label={tr('Nézet és vizualizáció', 'Ansicht und Visualisierung')}><div className="view-popover-head"><strong>{tr('Nézet és vizualizáció', 'Ansicht und Visualisierung')}</strong><button type="button" aria-label={tr('Bezárás', 'Schließen')} onClick={() => setViewOpen(false)}><X size={16} /></button></div>{viewPanel}</div>
  if (variant === 'rail') {
    // Minden eszköz egy fülben, ikonként; a felirat a gomb bal oldalán jelenik meg (egér és billentyűzet-fókusz).
    const groups: (ToolItem & { label?: string })[][] = [
      quick.map(({ id, icon, label, title, active, run }) => ({ id, icon, name: label, note: title, active, run })),
      items.filter((item) => !item.mobileOnly && !['presentation', 'pdf', 'share'].includes(item.id)).map((item) => item.id === 'view' ? { ...item, active: viewOpen } : item),
      items.filter((item) => ['presentation', 'pdf', 'share'].includes(item.id)),
    ]
    return <>
      <nav className="tool-rail" aria-label={tr('Eszközök', 'Werkzeuge')}>
        <div className="tool-rail-scroll">
          {leading}
          <button type="button" className={`rail-btn${time !== 'day' ? ' is-active' : ''}`} aria-label={`${tr('Napszak', 'Tageszeit')}: ${timeLabel}`} onClick={() => { onToolUse?.('time'); onTimeChange(nextTime[time]) }}><TimeIcon size={19} /><span className="rail-tip">{tr('Napszak', 'Tageszeit')}: {timeLabel}</span></button>
          {groups.map((group, index) => group.length > 0 && <div key={index} className="rail-group">{group.map(({ id, icon: Icon, name, active, run }) => <button type="button" key={id} className={`rail-btn${active ? ' is-active' : ''}`} aria-label={name} aria-pressed={active === undefined ? undefined : Boolean(active)} onClick={() => { if (id !== 'view') setViewOpen(false); onToolUse?.(id); run() }}><Icon size={19} /><span className="rail-tip">{name}</span></button>)}</div>)}
        </div>
      </nav>
      {viewPopover}
    </>
  }
  return <>
    <div className="weather-toolbar" aria-label={tr('Gyors jelenetbeállítások', 'Schnelle Szeneneinstellungen')}>
      {leading}
      <button type="button" title={`${tr('Napszak', 'Tageszeit')}: ${timeLabel} — ${tr('váltás', 'wechseln')}`} aria-label={`${tr('Napszak', 'Tageszeit')}: ${timeLabel}`} onClick={() => onTimeChange(nextTime[time])} className={`icon-time icon-${time}${time !== 'day' ? ' selected' : ''}`}><TimeIcon size={17} /><span>{timeLabel}</span></button>
      {quick.map(({ id, icon: Icon, label, title, active, className, run }) => <button type="button" key={id} className={[className, 'quick-toggle', active ? 'selected' : ''].filter(Boolean).join(' ')} aria-pressed={active === undefined ? undefined : active} title={title} onClick={run}><Icon size={17} /><span>{label}</span></button>)}
      <button type="button" className={`view-toggle tools-toggle icon-grid ${toolsOpen || viewOpen || toolsBusy ? 'selected' : ''}`} aria-pressed={toolsOpen} aria-expanded={toolsOpen} title={tr('Eszközök: nézet, napszak, környezet, bemutató, PDF, megosztás', 'Werkzeuge: Ansicht, Tageszeit, Umgebung, Präsentation, PDF, Teilen')} onClick={() => { setToolsOpen((open) => !open); setViewOpen(false) }}><LayoutGrid size={17} /><span>{tr('Eszközök', 'Werkzeuge')}</span></button>
    </div>
    {toolsOpen && <div className="view-popover tools-menu glass-panel" role="dialog" aria-label={tr('Eszközök', 'Werkzeuge')}><div className="view-popover-head"><strong>{tr('Eszközök', 'Werkzeuge')}</strong><button type="button" aria-label={tr('Bezárás', 'Schließen')} onClick={() => setToolsOpen(false)}><X size={16} /></button></div>
      <div className="tools-list">{items.map(({ id, icon: Icon, name, note, active, run, mobileOnly }) => <button type="button" key={id} className={`tools-item${active ? ' is-active' : ''}${mobileOnly ? ' is-mobile-only' : ''}`} aria-pressed={Boolean(active)} onClick={() => { setToolsOpen(false); run() }}><Icon size={18} /><span><strong>{name}</strong><small>{note}</small></span>{active && <em>Bekapcsolva</em>}</button>)}</div>
    </div>}
    {viewPopover}
  </>
}

/** Ármódosító buborék visszavonással (minden konfigurátorban ugyanaz). */
export function ChangePill({ change, onUndo }: { change: PriceChange | null; onUndo: () => void }) {
  if (!change || change.amount === 0) return null
  return <div key={change.id} className={`change-pill ${change.amount < 0 ? 'is-down' : 'is-up'}`} role="status" aria-live="polite">
    <strong>{change.amount > 0 ? '+' : '−'}{formatPrice(Math.abs(change.amount))}</strong><span>{change.label}</span>
    <button type="button" onClick={onUndo}><Undo2 size={14} />{tr('Visszavonás', 'Rückgängig')}</button>
  </div>
}

/** „Üdv újra” sáv: a mentett piszkozat folytatása vagy új terv (minden konfigurátorban ugyanaz). */
export function WelcomeBack({ summary, onContinue, onFresh }: { summary: string; onContinue: () => void; onFresh: () => void }) {
  return <div className="welcome-back" role="status">
    <span><strong>{tr('Üdv újra!', 'Willkommen zurück!')}</strong>Ott folytatod, ahol abbahagytad: {summary}</span>
    <button type="button" className="welcome-primary" onClick={onContinue}>Folytatom</button>
    <button type="button" onClick={onFresh}>{tr('Új terv', 'Neuer Entwurf')}</button>
  </div>
}
