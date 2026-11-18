import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Armchair, Box, ChevronRight, Eye, House, Maximize2, Moon, Scan, Sun, Sunset, Video, X, type LucideIcon } from 'lucide-react'
import type { CameraView, PergolaConfig, QualityLevel, SceneSettings } from '@/types/pergola'
import { cameraViewsFor } from '@/lib/cameraViews'
import HouseLook from '@/components/HouseLook'
import { tr } from '@/i18n/locale'
import LiquidGlass from './LiquidGlass'
import LiquidSlider from './LiquidSlider'
import MetalSwitch from './MetalSwitch'

type Panel = 'camera' | 'time' | 'environment' | 'display'
const VIEW_ICONS: Record<CameraView, LucideIcon> = { perspective: Eye, interior: Maximize2, top: Box, detail: Scan, sofa: Armchair, front: Eye }
const timeOf = (dayTime: number): SceneSettings['time'] => (dayTime >= 20 || dayTime < 7 ? 'night' : dayTime >= 17 ? 'sunset' : 'day')

/**
 * Nézet és Környezet eszköztár (D8): a bal szélen lebegő folyékony üveg sín négy ikonnal (a jobb oldali kártyával egy anyagból); mindegyik
 * a mellette nyíló üvegpanelt nyitja, egy témával: Kamera, Napszak, Környezet, Megjelenítés.
 * A beállítások csak a látványt változtatják, az árat nem.
 */
export default function SceneRail({ config, scene, view, compact, tucked = false, onUntuck, onView, onSceneChange, onChange }: { config: PergolaConfig; scene: SceneSettings; view: CameraView; compact: boolean; /** telefonon nyitott lapnál a sín a szél mögé húzódik, csak egy fül látszik */ tucked?: boolean; onUntuck?: () => void; onView: (view: CameraView) => void; onSceneChange: (patch: Partial<SceneSettings>) => void; onChange: (patch: Partial<PergolaConfig>) => void }) {
  const [open, setOpen] = useState<Panel | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const carport = config.building === 'carport'
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(null)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', close) }
  }, [open])

  const tools: { id: Panel; icon: LucideIcon; label: string }[] = [
    { id: 'camera', icon: Video, label: tr('Kamera', 'Kamera') },
    { id: 'time', icon: Sun, label: tr('Napszak', 'Tageszeit') },
    { id: 'environment', icon: House, label: tr('Környezet', 'Umgebung') },
    { id: 'display', icon: Scan, label: tr('Megjelenítés', 'Anzeige') },
  ]
  const setDayTime = (dayTime: number) => onSceneChange({ dayTime, time: timeOf(dayTime) })
  const thing = carport ? tr('a carport', 'Carport') : tr('a pergola', 'Pergola')

  const panels: Record<Panel, { title: string; body: ReactNode }> = {
    camera: { title: tr('Kamera', 'Kamera'), body: <>
      <div className="rb-view-grid" role="radiogroup" aria-label={tr('Nézőpont', 'Blickwinkel')}>
        {cameraViewsFor(carport ? 'carport' : 'pergola').map((item) => { const Icon = VIEW_ICONS[item.id]; const active = view === item.id; return <button type="button" role="radio" aria-checked={active} key={item.id} className={`rb-option rb-view${active ? ' is-selected' : ''}`} onClick={() => { onView(item.id); if (item.id === 'sofa' && scene.autoRotate) onSceneChange({ autoRotate: false }) }}><Icon size={18} strokeWidth={1.6} /><strong>{item.label}</strong></button> })}
      </div>
      <MetalSwitch label={tr('Automata forgatás', 'Automatisch drehen')} description={tr('Koppintásra megáll', 'Stoppt beim Antippen')} checked={scene.autoRotate} onChange={(autoRotate) => onSceneChange({ autoRotate })} />
      <MetalSwitch label={tr('Követő kamera', 'Mitführende Kamera')} description={tr('Választáskor odafordul (oldal, szín, ventilátor)', 'Dreht sich bei Auswahl hin (Seite, Farbe, Ventilator)')} checked={scene.autoCamera} onChange={(autoCamera) => onSceneChange({ autoCamera })} />
    </> },
    time: { title: tr('Napszak', 'Tageszeit'), body: <>
      <div className="rb-view-grid is-three" role="radiogroup" aria-label={tr('Napszak', 'Tageszeit')}>
        {([[13, tr('Nappal', 'Tag'), Sun, 'day'], [18, tr('Aranyóra', 'Goldene Stunde'), Sunset, 'sunset'], [22, tr('Éjszaka', 'Nacht'), Moon, 'night']] as const).map(([hour, label, Icon, id]) => <button type="button" role="radio" aria-checked={scene.time === id} key={id} className={`rb-option rb-view${scene.time === id ? ' is-selected' : ''}`} onClick={() => setDayTime(hour)}><Icon size={18} strokeWidth={1.6} /><strong>{label}</strong></button>)}
      </div>
      <LiquidSlider label={tr('Időpont', 'Uhrzeit')} unit="h" step={1} value={Math.round(scene.dayTime)} min={6} max={23} onChange={setDayTime} />
      <p className="rb-note">{tr('A terasz tájolását a Hely és méret lépésben adhatod meg.', 'Die Ausrichtung der Terrasse stellen Sie im Schritt Ort und Größe ein.')}</p>
    </> },
    environment: { title: tr('Környezet', 'Umgebung'), body: <>
      <div className="rb-view-grid is-two" role="radiogroup" aria-label={tr('Háttér', 'Hintergrund')}>
        {([['terrace', tr('Családi ház', 'Einfamilienhaus'), House], ['studio', tr(`Csak ${thing}`, `Nur ${thing}`), Box]] as const).map(([ground, label, Icon]) => { const active = (scene.ground === 'studio') === (ground === 'studio'); return <button type="button" role="radio" aria-checked={active} key={ground} className={`rb-option rb-view${active ? ' is-selected' : ''}`} onClick={() => onSceneChange({ ground })}><Icon size={18} strokeWidth={1.6} /><strong>{label}</strong></button> })}
      </div>
      {scene.ground !== 'studio' && <><h4>{tr('A házad', 'Ihr Haus')}</h4><div className="rb-legacy"><HouseLook config={config} scene={scene} photoUrl={scene.photoUrl ?? null} onSceneChange={onSceneChange} onChange={onChange} /></div></>}
      <p className="rb-note">{tr('Csak látvány: az árat nem módosítja.', 'Nur Optik: ändert den Preis nicht.')}</p>
    </> },
    display: { title: tr('Megjelenítés', 'Anzeige'), body: <>
      <MetalSwitch label={tr('Méretcímkék', 'Maßangaben')} description={tr('Méretek centiméterben a 3D-ben', 'Maße in Zentimetern in 3D')} checked={scene.showDimensions} onChange={(showDimensions) => onSceneChange({ showDimensions })} />
      <MetalSwitch label={tr('180 cm-es figura', '180-cm-Figur')} description={tr('A méretek érzékeltetéséhez', 'Zur Veranschaulichung der Größe')} checked={Boolean(scene.showPerson)} onChange={(showPerson) => onSceneChange({ showPerson })} />
      <MetalSwitch label={tr('Műszaki jelölések', 'Technische Markierungen')} description={tr('Részletek a 3D modellen', 'Details am 3D-Modell')} checked={Boolean(scene.showHotspots)} onChange={(showHotspots) => onSceneChange({ showHotspots })} />
      <MetalSwitch label={tr('Feliratok a 3D-ben', 'Beschriftungen in 3D')} description={tr('Kattintási tippek', 'Klick-Tipps')} checked={scene.labels !== false} onChange={(labels) => onSceneChange({ labels })} />
      <MetalSwitch label={tr('Robbantott nézet', 'Explosionsansicht')} description={tr('A szerkezet elemei szétválasztva', 'Die Bauteile auseinandergezogen')} checked={Boolean(scene.exploded)} onChange={(exploded) => onSceneChange({ exploded })} />
      <label className="rb-select"><span>{tr('3D minőség', '3D-Qualität')}</span><select value={scene.quality} onChange={(event) => onSceneChange({ quality: event.target.value as QualityLevel })}><option value="auto">{tr('Automatikus', 'Automatisch')}</option><option value="ultra">Ultra</option><option value="high">{tr('Magas', 'Hoch')}</option><option value="medium">{tr('Közepes', 'Mittel')}</option><option value="low">{tr('Alacsony', 'Niedrig')}</option></select></label>
    </> },
  }

  return (
    <div className={`rb-rail${compact ? ' is-compact' : ''}${tucked ? ' is-tucked' : ''}`} ref={root}>
      {tucked && <button type="button" className="rb-rail-tab" aria-label={tr('Nézet és környezet megnyitása', 'Ansicht und Umgebung öffnen')} onClick={onUntuck}><ChevronRight size={16} /></button>}
      <LiquidGlass as="nav" className="rb-rail-bar" radius={24} bezel={12} blur={12} aria-label={tr('Nézet és környezet', 'Ansicht und Umgebung')}>
        {tools.map(({ id, icon: Icon, label }) => <button type="button" key={id} className={open === id ? 'is-open' : ''} aria-expanded={open === id} aria-label={label} title={label} onClick={() => setOpen((current) => (current === id ? null : id))}><Icon size={20} strokeWidth={1.6} /><span>{label}</span></button>)}
      </LiquidGlass>
      {open && <LiquidGlass as="section" className="rb-rail-panel" radius={24} bezel={14} aria-label={panels[open].title}>
        <header><h3>{panels[open].title}</h3><button type="button" aria-label={tr('Bezárás', 'Schließen')} onClick={() => setOpen(null)}><X size={16} /></button></header>
        <div className="rb-rail-body">{panels[open].body}</div>
      </LiquidGlass>}
    </div>
  )
}
