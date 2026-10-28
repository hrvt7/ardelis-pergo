import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Armchair, Box, Check, ChevronRight, CloudRain, Image, Info, Maximize2, Moon, Presentation, Redo2, RotateCcw, Scan, ShieldCheck, Sun, Undo2, View, X } from 'lucide-react'
import { Link } from 'react-router'
import ConfiguratorControls from '@/components/ConfiguratorControls'
import { InfoDialog, PriceSettingsDialog, ResetDialog } from '@/components/Dialogs'
import PergolaScene from '@/components/PergolaScene'
import PricePanel from '@/components/PricePanel'
import SummaryPanel from '@/components/SummaryPanel'
import { copyShareUrl, exportPergolaPdf } from '@/lib/exportPdf'
import { createShareUrl, DEFAULT_CONFIG, DEFAULT_SCENE, loadInitialConfig, loadPrices, persistConfig, persistPrices } from '@/lib/config'
import { calculatePrice, DEFAULT_PRICES, formatHuf, ROOF_LABELS } from '@/lib/pricing'
import type { CameraView, ConfigStep, PergolaConfig, PriceSettings, SavedConfiguration, SceneSettings, SideKey } from '@/types/pergola'
import { usePageSeo } from '@/lib/usePageSeo'

const CAMERA_VIEWS: { id: CameraView; label: string; icon: typeof View }[] = [
  { id: 'perspective', label: 'Kívülről', icon: View },
  { id: 'interior', label: 'Alulról', icon: Maximize2 },
  { id: 'top', label: 'Felülről', icon: Box },
  { id: 'detail', label: 'Részlet', icon: Scan },
  { id: 'sofa', label: 'Kanapé', icon: Armchair },
]

const CHANGE_LABELS: Record<string, string> = {
  width: 'Szélesség', depth: 'Mélység', height: 'Magasság', mount: 'Rögzítés', roof: 'Tetőrendszer', frameColor: 'Szerkezetszín', customRal: 'Egyedi RAL', sides: 'Oldalkialakítás', louverAngle: 'Lamellaszög', screenOpen: 'ZIP nyitottság', led: 'Periméter LED', heaters: 'Teraszfűtés', speakers: 'Hangrendszer', sensors: 'Szenzorcsomag',
}

function loadSaved(): SavedConfiguration[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('pergo-atelier-saved-v2') ?? '[]')
    return Array.isArray(parsed) ? parsed.slice(0, 2) : []
  } catch { return [] }
}

export default function App() {
  usePageSeo('/studio/pergola')
  const [config, setConfig] = useState<PergolaConfig>(loadInitialConfig)
  const [prices, setPrices] = useState<PriceSettings>(loadPrices)
  const [scene, setScene] = useState<SceneSettings>(DEFAULT_SCENE)
  const [step, setStep] = useState<ConfigStep>('size')
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false)
  const [selectedSide, setSelectedSide] = useState<SideKey>('front')
  const [view, setView] = useState<CameraView>('perspective')
  const [modal, setModal] = useState<'prices' | 'info' | 'reset' | null>(null)
  const [toast, setToast] = useState('')
  const [exporting, setExporting] = useState(false)
  const [presentation, setPresentation] = useState(false)
  const [delta, setDelta] = useState<{ amount: number; label: string } | null>(null)
  const [saved, setSaved] = useState<SavedConfiguration[]>(loadSaved)
  const history = useRef<{ past: PergolaConfig[]; future: PergolaConfig[] }>({ past: [], future: [] })
  const photoUrl = useRef<string | null>(null)
  const price = useMemo(() => calculatePrice(config, prices), [config, prices])

  useEffect(() => persistConfig(config), [config])
  useEffect(() => persistPrices(prices), [prices])
  useEffect(() => { try { localStorage.setItem('pergo-atelier-saved-v2', JSON.stringify(saved)) } catch { /* privát mód */ } }, [saved])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])
  useEffect(() => () => { if (photoUrl.current) URL.revokeObjectURL(photoUrl.current) }, [])
  useEffect(() => {
    if (!presentation) return
    const exit = (event: KeyboardEvent) => { if (event.key === 'Escape') setPresentation(false) }
    window.addEventListener('keydown', exit)
    return () => window.removeEventListener('keydown', exit)
  }, [presentation])

  const applyConfig = useCallback((nextOrPatch: PergolaConfig | Partial<PergolaConfig>, replace = false) => {
    const next = replace ? nextOrPatch as PergolaConfig : { ...config, ...nextOrPatch }
    if (JSON.stringify(next) === JSON.stringify(config)) return
    const nextPrice = calculatePrice(next, prices)
    const changed = Object.keys(nextOrPatch).find((key) => key !== 'louverAngle' && key !== 'screenOpen' && JSON.stringify((next as unknown as Record<string, unknown>)[key]) !== JSON.stringify((config as unknown as Record<string, unknown>)[key]))
    setDelta({ amount: nextPrice.totalGross - price.totalGross, label: changed ? CHANGE_LABELS[changed] ?? 'Konfiguráció' : 'Beállítás' })
    history.current.past.push(config)
    history.current.past = history.current.past.slice(-40)
    history.current.future = []
    setConfig(next)
  }, [config, price.totalGross, prices])

  const updateConfig = useCallback((patch: Partial<PergolaConfig>) => applyConfig(patch), [applyConfig])
  const replaceConfig = useCallback((next: PergolaConfig) => applyConfig(next, true), [applyConfig])
  const updateScene = useCallback((patch: Partial<SceneSettings>) => setScene((current) => ({ ...current, ...patch })), [])
  const handleSideSelect = useCallback((side: SideKey) => {
    setSelectedSide(side)
    setStep('sides')
    setMobileControlsOpen(true)
  }, [])

  const undo = useCallback(() => {
    setConfig((current) => {
      const previous = history.current.past.pop()
      if (!previous) return current
      history.current.future.push(current)
      setDelta(null)
      return previous
    })
  }, [])
  const redo = useCallback(() => {
    setConfig((current) => {
      const next = history.current.future.pop()
      if (!next) return current
      history.current.past.push(current)
      setDelta(null)
      return next
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  const handleShare = async () => {
    const url = createShareUrl(config)
    window.history.replaceState(null, '', url)
    try { await copyShareUrl(url); setToast('Megosztható hivatkozás a vágólapra másolva.') }
    catch { setToast('A hivatkozás frissült a címsorban; onnan másolhatod.') }
  }
  const handleExport = async () => {
    setExporting(true)
    try { await exportPergolaPdf(config, price); setToast('A PDF-összefoglaló elkészült.') }
    catch (error) { console.error(error); setToast('A PDF nem készült el. Próbáld újra, vagy frissítsd az oldalt.') }
    finally { setExporting(false) }
  }
  const handlePhoto = (file: File) => {
    if (!file.type.startsWith('image/')) { setToast('Kérlek, képfájlt válassz.'); return }
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current)
    const url = URL.createObjectURL(file)
    photoUrl.current = url
    setScene((current) => ({ ...current, photoUrl: url, photoMode: true }))
    setView('perspective')
    setToast('A fotó csak helyben nyílt meg. Állítsd be a pergola pozícióját és méretét.')
  }
  const saveSlot = (slot: 'A' | 'B') => {
    const item: SavedConfiguration = { id: slot, name: `Konfiguráció ${slot}`, config: JSON.parse(JSON.stringify(config)) as PergolaConfig, savedAt: Date.now() }
    setSaved((current) => {
      const without = current.filter((savedItem) => savedItem.id !== slot)
      return slot === 'A' ? [item, ...without.filter((savedItem) => savedItem.id === 'B')].slice(0, 2) : [...without.filter((savedItem) => savedItem.id === 'A'), item].slice(0, 2)
    })
    setToast(`Konfiguráció ${slot} elmentve ebben a böngészőben.`)
  }
  const summary = <SummaryPanel config={config} price={price} prices={prices} saved={saved} onSave={saveSlot} onLoad={replaceConfig} onNotify={setToast} />

  return (
    <div className={`app-shell ${presentation ? 'presentation-mode' : ''}`}>
      <header className="app-header">
        <a className="brand" href="#top" aria-label="ARDELIS Pergo kezdőnézet" onClick={(event) => { event.preventDefault(); setView('perspective') }}><svg viewBox="0 0 30 30" aria-hidden="true"><path d="M3 23V7h17l7 7-7 7H3Zm6-5h10l3-2-3-2H9v4Z" fill="currentColor" /><path d="M3 26 27 3" stroke="currentColor" strokeWidth="1.4" /></svg><span><strong>ARDELIS</strong><small>/ PERGO</small></span></a>
        <div className="project-identity"><span>ÉPÍTÉSZETI KONFIGURÁTOR</span><strong>Valós méretek. Azonnali előnézet.</strong></div>
        <div className="header-actions"><div className="history-actions"><button type="button" aria-label="Visszavonás" title="Visszavonás · Ctrl+Z" onClick={undo} disabled={!history.current.past.length}><Undo2 size={17} /></button><button type="button" aria-label="Ismétlés" title="Ismétlés · Ctrl+Shift+Z" onClick={redo} disabled={!history.current.future.length}><Redo2 size={17} /></button></div><button type="button" className="header-text-button presentation-toggle" aria-label={presentation ? 'Szerkesztés' : 'Bemutató'} onClick={() => setPresentation(!presentation)}><Presentation size={16} /><span>{presentation ? 'Szerkesztés' : 'Bemutató'}</span></button><button type="button" className="header-text-button" aria-label="Tudnivalók" onClick={() => setModal('info')}><Info size={16} /><span>Tudnivalók</span></button><button type="button" className="header-text-button" aria-label="Alaphelyzet" onClick={() => setModal('reset')}><RotateCcw size={16} /><span>Alaphelyzet</span></button></div>
      </header>

      <main className="studio-shell" id="top">
        <section className={`viewer-panel ${scene.photoMode ? 'photo-preview' : ''}`} aria-label="3D előnézet">
          {scene.photoMode && scene.photoUrl && <img className="photo-backdrop" src={scene.photoUrl} alt="A feltöltött teraszfotó háttere" />}
          <PergolaScene config={config} scene={scene} view={view} onSideSelect={handleSideSelect} onSceneChange={updateScene} />
          <div className="viewer-heading"><span>{scene.photoMode ? 'SAJÁT TERASZ / ELŐNÉZET' : 'ÉLŐ ÉPÍTÉSZETI JELENET'}</span><h1>{ROOF_LABELS[config.roof].split(' · ')[0]} <i>/</i> {config.width.toFixed(1).replace('.', ',')}<small> m</small></h1><p>{ROOF_LABELS[config.roof].split(' · ')[1]} · {config.depth.toFixed(1).replace('.', ',')} m mély</p></div>
          <div className="viewer-live"><i />VALÓS IDEJŰ 3D</div>
          <div className="weather-toolbar" aria-label="Gyors jelenetbeállítások"><button type="button" className={scene.rain ? 'selected' : ''} aria-pressed={scene.rain} title="Eső be- és kikapcsolása" onClick={() => updateScene({ rain: !scene.rain })}><CloudRain size={17} /><span>Eső</span></button><button type="button" className={scene.time === 'night' ? 'selected' : ''} title="Nappal és éjszaka váltása" onClick={() => updateScene(scene.time === 'night' ? { time: 'day', dayTime: 13 } : { time: 'night', dayTime: 22 })}>{scene.time === 'night' ? <Sun size={17} /> : <Moon size={17} />}<span>{scene.time === 'night' ? 'Nappal' : 'Éjszaka'}</span></button>{scene.photoUrl && <button type="button" className={scene.photoMode ? 'selected' : ''} title="Fotós előnézet" onClick={() => updateScene({ photoMode: !scene.photoMode })}><Image size={17} /><span>Fotó</span></button>}</div>
          {scene.rain && config.sensors && config.roof !== 'fixed' && <div className="automation-status" role="status"><ShieldCheck size={16} /><span><strong>Esőautomata aktív</strong>{config.roof === 'retractable' ? 'A tolótető biztonságos, zárt pozícióban.' : 'A tetőlamellák biztonságos, zárt pozícióban.'}</span></div>}
          {view === 'sofa' && <div className="pov-note" role="status"><Armchair size={16} /><span><strong>Kanapé panoráma</strong>Húzd a képet a körbenézéshez · a nyilakkal is forgatható</span></div>}
          {presentation && <div className="presentation-note"><span>ÜGYFÉL-BEMUTATÓ</span><strong>{config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · {ROOF_LABELS[config.roof].split(' · ')[0]}</strong><small>Húzd a jelenetet a forgatáshoz · ESC a szerkesztéshez</small></div>}
          <div className="camera-toolbar" aria-label="Kamera nézetek">{CAMERA_VIEWS.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={view === id ? 'selected' : ''} aria-pressed={view === id} onClick={() => { setView(id); if (id === 'sofa' && scene.autoRotate) updateScene({ autoRotate: false }) }} title={`${label} nézet`}><Icon size={16} /><span>{label}</span></button>)}</div>
          <div className="viewer-footer"><span>{scene.photoMode ? 'HELYI FOTÓS ELŐNÉZET' : '1 egység = 1 méter'}</span><span>{price.area.toFixed(1).replace('.', ',')} m²</span></div>
        </section>

        <ConfiguratorControls config={config} scene={scene} step={step} selectedSide={selectedSide} summary={summary} onStepChange={setStep} onSideSelect={setSelectedSide} onChange={updateConfig} onSceneChange={updateScene} onPreset={replaceConfig} onPhotoUpload={handlePhoto} mobileOpen={mobileControlsOpen} onMobileToggle={() => setMobileControlsOpen((open) => !open)} />
        <PricePanel config={config} price={price} exporting={exporting} delta={delta} compact onEditPrices={() => setModal('prices')} onExport={handleExport} onShare={handleShare} />
      </main>

      <div className="mobile-price-bar"><div><span>Bruttó irányár</span><strong>{formatHuf(price.totalGross)}</strong></div><button type="button" onClick={() => { setStep(step === 'summary' ? 'size' : 'summary'); setMobileControlsOpen(true) }}>{step === 'summary' ? 'Tovább tervezés' : 'Összegzés'}<ChevronRight size={16} /></button></div>
      {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button type="button" aria-label="Értesítés bezárása" onClick={() => setToast('')}><X size={16} /></button></div>}
      {modal === 'prices' && <PriceSettingsDialog prices={prices} onChange={setPrices} onReset={() => { setPrices(DEFAULT_PRICES); setToast('Az alapértelmezett mintaárak visszaálltak.') }} onClose={() => setModal(null)} />}
      {modal === 'info' && <InfoDialog onClose={() => setModal(null)} />}
      {modal === 'reset' && <ResetDialog onConfirm={() => { replaceConfig(DEFAULT_CONFIG); setScene(DEFAULT_SCENE); setView('perspective'); setStep('size'); setToast('Az Atelier alapkonfiguráció visszaállt.') }} onClose={() => setModal(null)} />}
      <Link className="studio-home-link" to="/">Kezdőlap</Link>
    </div>
  )
}
