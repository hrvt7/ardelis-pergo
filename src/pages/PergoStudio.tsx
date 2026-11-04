import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Armchair, FileDown, Box, Check, ChevronRight, CloudRain, Image, Info, Maximize2, Moon, Presentation, Redo2, Rotate3d, RotateCcw, Scan, ShieldCheck, Sun, SunMedium, Undo2, View, WandSparkles, X } from 'lucide-react'
import { Link } from 'react-router'
import ConfiguratorControls from '@/components/ConfiguratorControls'
import { InfoDialog, PriceSettingsDialog, ResetDialog } from '@/components/Dialogs'
import PergolaScene from '@/components/PergolaScene'
import PricePanel, { AnimatedPrice } from '@/components/PricePanel'
import SummaryPanel from '@/components/SummaryPanel'
import { copyShareUrl, exportPergolaPdf } from '@/lib/exportPdf'
import { shareHash } from '@/lib/shareCode'
import { captureScene } from '@/lib/showcase'
import { houseSummary, loadHouseLook, saveHouseLook } from '@/lib/house'
import { createShareUrl, DEFAULT_SCENE, hasStoredDraft, loadInitialConfig, loadPrices, persistConfig, persistPrices } from '@/lib/config'
import { calculatePrice, formatHuf } from '@/lib/pricing'
import { normalizeConfig, parseConfig } from '@/tenants/rules'
import type { Tenant } from '@/tenants/types'
import { useTenant } from '@/tenants/TenantContext'
import type { SheetState } from '@/components/ConfiguratorControls'
import type { CameraFocus, CameraView, ConfigStep, PergolaConfig, PriceSettings, SavedConfiguration, SceneSettings, SideKey } from '@/types/pergola'
import { usePageSeo } from '@/lib/usePageSeo'
import type { ShadeResult } from '@/components/ShadeProbe'
import { studySun } from '@/lib/sunSite'
import { isMovableRoof } from '@/lib/roofs'
import { DEFAULT_USAGE, estimateEnergy, roundCost, type EnergyUsage } from '@/lib/energy'
import type { FurnitureSet } from '@/types/pergola'

const timeForSun = (elevation: number): SceneSettings['time'] => (elevation < -4 ? 'night' : elevation < 12 ? 'sunset' : 'day')
const timeForClock = (hour: number): SceneSettings['time'] => (hour >= 20 || hour < 7 ? 'night' : hour >= 17 ? 'sunset' : 'day')

const ArDialog = lazy(() => import('@/components/ArDialog'))
const SunStudyPanel = lazy(() => import('@/components/SunStudyPanel'))
const BudgetDialog = lazy(() => import('@/components/BudgetDialog'))
const MoodPanel = lazy(() => import('@/components/MoodPanel'))
const AdvisorDialog = lazy(() => import('@/components/AdvisorDialog'))
const EnergyDialog = lazy(() => import('@/components/EnergyDialog'))

function buildArUrl(config: PergolaConfig) {
  const url = new URL(createShareUrl(config))
  url.searchParams.set('ar', '1')
  url.pathname = url.pathname.replace(/^\/embed\//, '/k/')
  return url.toString()
}

const CAMERA_VIEWS: { id: CameraView; label: string; icon: typeof View }[] = [
  { id: 'perspective', label: 'Kívülről', icon: View },
  { id: 'interior', label: 'Alulról', icon: Maximize2 },
  { id: 'top', label: 'Felülről', icon: Box },
  { id: 'detail', label: 'Részlet', icon: Scan },
  { id: 'sofa', label: 'Kanapé', icon: Armchair },
]

const CHANGE_LABELS: Record<string, string> = {
  width: 'Szélesség', depth: 'Mélység', height: 'Magasság', mount: 'Rögzítés', roof: 'Tetőrendszer', frameColor: 'Szerkezetszín', customRal: 'Egyedi szín', roofColor: 'Tető / lamellák színe', roofRal: 'Tető / lamellák színe', sides: 'Oldalkialakítás', louverAngle: 'Lamellaszög', screenOpen: 'ZIP nyitottság', led: 'Periméter LED', heaters: 'Teraszfűtés', speakers: 'Hangrendszer', sensors: 'Szenzorcsomag', solar: 'Napelemes tető', split: 'Osztott oldal', ledRgb: 'Színváltós LED', fans: 'Mennyezeti ventilátor', smartHome: 'Okosotthon-vezérlés', roofShade: 'Tetőárnyékoló', shadeFabric: 'Árnyékoló színe'
}

const savedKey = (tenant: Tenant) => `pergo-atelier-saved-v3:${tenant.id}`

function loadSaved(tenant: Tenant): SavedConfiguration[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(savedKey(tenant)) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, 2).flatMap((item: Partial<SavedConfiguration>) => {
      const config = parseConfig(tenant, item?.config)
      return config && typeof item.id === 'string' ? [{ id: item.id, name: String(item.name ?? item.id), config, savedAt: Number(item.savedAt) || 0, ...(typeof item.image === 'string' && item.image.startsWith('data:image/') ? { image: item.image } : {}) }] : []
    })
  } catch { return [] }
}

export default function PergoStudio() {
  const { tenant, labels: ROOF_LABELS, admin, embed, homeHref } = useTenant()
  usePageSeo('/studio/pergola', { noindex: embed || !tenant.demo, title: tenant.demo ? undefined : `${tenant.brand.name} · pergola konfigurátor` })
  const [config, setConfig] = useState<PergolaConfig>(() => loadInitialConfig(tenant))
  // Visszatérő látogató: ha piszkozatból (nem linkből) indultunk, és az nem az alapterv, felajánljuk a folytatást.
  const [welcomeBack, setWelcomeBack] = useState(() => !window.location.hash && JSON.stringify(config) !== JSON.stringify(normalizeConfig(tenant, tenant.defaultConfig)) && hasStoredDraft(tenant))
  const projectKey = `pergo-project-name:${tenant.id}`
  const [projectName, setProjectName] = useState(() => { try { return localStorage.getItem(projectKey) ?? '' } catch { return '' } })
  useEffect(() => { try { localStorage.setItem(projectKey, projectName) } catch { /* privát mód */ } }, [projectKey, projectName])
  const [prices, setPrices] = useState<PriceSettings>(() => loadPrices(tenant, admin))
  // A ház kinézete (homlokzat, nyílászárók) a böngészőben megmarad: a vásárló háza nem változik két látogatás között.
  const [scene, setScene] = useState<SceneSettings>(() => ({ ...DEFAULT_SCENE, ...loadHouseLook(tenant.id) }))
  useEffect(() => { saveHouseLook(tenant.id, scene) }, [tenant.id, scene.wallFinish, scene.wallColor, scene.windowColor]) // eslint-disable-line react-hooks/exhaustive-deps
  const [step, setStep] = useState<ConfigStep>('size')
  // Mobilon az alsó lap három állású: kicsi (csak lépés), fél (a 3D felül látszik), teljes.
  const [sheet, setSheet] = useState<SheetState>('peek')
  const setMobileControlsOpen = useCallback((open: boolean) => setSheet((current) => (open ? (current === 'peek' ? 'half' : current) : 'peek')), [])
  const [selectedSide, setSelectedSide] = useState<SideKey | 'roof'>('front')
  const [view, setView] = useState<CameraView>('perspective')
  const [modal, setModal] = useState<'prices' | 'info' | 'reset' | 'ar' | 'budget' | 'advisor' | 'energy' | null>(() => {
    // ?ar=1 (a QR-kódból érkezve) érintőképernyőn azonnal az AR-ablakot nyitja.
    try { return new URLSearchParams(window.location.search).get('ar') === '1' && window.matchMedia('(pointer: coarse)').matches ? 'ar' : null } catch { return null }
  })
  const [toast, setToast] = useState('')
  const [exporting, setExporting] = useState(false)
  const [presentation, setPresentation] = useState(false)
  const [delta, setDelta] = useState<{ amount: number; label: string } | null>(null)
  // Kontextus-kamera, változás-jelző és rezgés.
  const [focus, setFocus] = useState<CameraFocus | null>(null)
  const focusSeq = useRef(0)
  const [change, setChange] = useState<{ id: number; amount: number; label: string } | null>(null)
  const lastBuzz = useRef(0)
  const eveningShown = useRef(false)
  const sceneRef = useRef<SceneSettings>(DEFAULT_SCENE)
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 820)
  useEffect(() => { const query = window.matchMedia('(max-width: 820px)'); const update = () => setIsNarrow(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update) }, [])
  const [saved, setSaved] = useState<SavedConfiguration[]>(() => loadSaved(tenant))
  const history = useRef<{ past: PergolaConfig[]; future: PergolaConfig[] }>({ past: [], future: [] })
  const photoUrl = useRef<string | null>(null)
  const price = useMemo(() => calculatePrice(config, prices, ROOF_LABELS), [config, prices, ROOF_LABELS])
  const [energyUsage, setEnergyUsage] = useState<EnergyUsage>(DEFAULT_USAGE)
  const energy = useMemo(() => estimateEnergy(config, energyUsage, tenant.energy?.heaterWatts), [config, energyUsage, tenant])
  const energyCost = energy.hasElectrics ? roundCost(energy.cost) : null

  useEffect(() => persistConfig(tenant, config), [tenant, config])
  // Ha az oldal megosztott linkkel nyílt, a címsor linkje kövesse a módosításokat — különben
  // frissítéskor a régi link felülírná a vásárló közben végzett változtatásait.
  useEffect(() => {
    if (!/^#(c|k)=/.test(window.location.hash)) return
    const timer = window.setTimeout(() => {
      const next = `#${shareHash(config)}`
      if (window.location.hash !== next) window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${next}`)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [config])
  useEffect(() => { if (admin) persistPrices(tenant, prices) }, [tenant, admin, prices])
  useEffect(() => { try { localStorage.setItem(savedKey(tenant), JSON.stringify(saved)) } catch { /* privát mód */ } }, [tenant, saved])
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

  const focusSide = useCallback((side: SideKey) => setFocus({ id: ++focusSeq.current, kind: 'side', side }), [])
  /** Vissza az áttekintő nézetbe — akkor is, ha a kamera épp egy oldalra fókuszált. */
  const overview = useCallback(() => { setView('perspective'); setFocus({ id: ++focusSeq.current, kind: 'overview' }) }, [])
  /** Mit mutasson a kamera egy módosítás után (csak ha az automatikus kamera be van kapcsolva). */
  const reactToChange = useCallback((before: PergolaConfig, after: PergolaConfig) => {
    const current = sceneRef.current
    if (!current.autoCamera || current.photoMode || current.sunStudy) return
    const sides = (['front', 'back', 'left', 'right'] as SideKey[]).find((side) => before.sides[side] !== after.sides[side] || before.split?.[side] !== after.split?.[side])
    if (sides) { setView('perspective'); focusSide(sides); return }
    if ((after.fans ?? 0) > (before.fans ?? 0)) { setView('interior'); return }
    // Új tetőárnyékoló: kihúzva, áttekintő nézetből mutatjuk (alulról a kameragombsorral nézhető).
    if (after.roofShade && after.roofShade !== before.roofShade) { setScene((value) => ({ ...value, shadeOut: 100 })); overview(); return }
    if (before.frameColor !== after.frameColor || before.customRal !== after.customRal || before.roofColor !== after.roofColor || before.roofRal !== after.roofRal) { overview(); return }
    if (before.mount !== after.mount || before.roof !== after.roof) overview()
    const lightsOn = (!before.led && after.led) || (!before.ledRgb && after.ledRgb) || (before.heaters === 0 && after.heaters > 0)
    if (lightsOn && !eveningShown.current && current.time !== 'night') {
      eveningShown.current = true
      setScene((value) => ({ ...value, time: 'night', dayTime: 21.5 }))
      setToast('Esti nézetre váltottunk, hogy lásd a fényeket. Nappalra a felső sávban válthatsz vissza.')
    }
  }, [focusSide, overview])

  const applyConfig = useCallback((nextOrPatch: PergolaConfig | Partial<PergolaConfig>, replace = false) => {
    const next = normalizeConfig(tenant, replace ? nextOrPatch as PergolaConfig : { ...config, ...nextOrPatch })
    if (JSON.stringify(next) === JSON.stringify(config)) return
    const nextPrice = calculatePrice(next, prices, ROOF_LABELS)
    // Az összetartozó mezők (szín + kód) egy módosításnak számítanak.
    const PAIRED: Record<string, string> = { customRal: 'frameColor', roofRal: 'roofColor', ledRgb: 'led', shadeFabric: 'roofShade' }
    const changedKeys = [...new Set(Object.keys(nextOrPatch).filter((key) => key !== 'louverAngle' && key !== 'screenOpen' && JSON.stringify((next as unknown as Record<string, unknown>)[key]) !== JSON.stringify((config as unknown as Record<string, unknown>)[key])).map((key) => (PAIRED[key] && key in nextOrPatch && PAIRED[key] in nextOrPatch ? PAIRED[key] : key)))]
    const changed = changedKeys[0]
    const label = changedKeys.length > 1 ? 'Több módosítás' : changed ? CHANGE_LABELS[changed] ?? 'Konfiguráció' : 'Beállítás'
    setDelta({ amount: nextPrice.totalGross - price.totalGross, label })
    setChange({ id: Date.now(), amount: nextPrice.totalGross - price.totalGross, label })
    // Finom visszajelzés érintőképernyőn (csúszka húzásakor ritkítva).
    const now = performance.now()
    if (now - lastBuzz.current > 260 && typeof navigator.vibrate === 'function' && window.matchMedia('(pointer: coarse)').matches) { lastBuzz.current = now; try { navigator.vibrate(8) } catch { /* nem támogatott */ } }
    reactToChange(config, next)
    history.current.past.push(config)
    history.current.past = history.current.past.slice(-40)
    history.current.future = []
    setConfig(next)
  }, [config, price.totalGross, prices, tenant, ROOF_LABELS, reactToChange])

  const updateConfig = useCallback((patch: Partial<PergolaConfig>) => applyConfig(patch), [applyConfig])
  const replaceConfig = useCallback((next: PergolaConfig) => applyConfig(next, true), [applyConfig])
  const updateScene = useCallback((patch: Partial<SceneSettings>) => {
    // A ház kinézetének módosításakor a kamera az áttekintő nézetbe áll, hogy a ház és a pergola együtt látsszon.
    const current = sceneRef.current
    if (('wallFinish' in patch || 'wallColor' in patch || 'windowColor' in patch) && current.autoCamera && !current.photoMode && !current.sunStudy) overview()
    setScene((value) => ({ ...value, ...patch }))
  }, [overview])
  useEffect(() => { sceneRef.current = scene }, [scene])
  useEffect(() => {
    if (!change) return
    const timer = window.setTimeout(() => setChange(null), 6000)
    return () => window.clearTimeout(timer)
  }, [change])
  /** Lépésváltás: a kamera a lépéshez illő nézetre áll (szín: közeli, oldalak: a kiválasztott oldal, összegzés: körbeforgás). */
  const goStep = useCallback((next: ConfigStep) => {
    setStep(next)
    const current = sceneRef.current
    if (!current.autoCamera || current.photoMode || current.sunStudy) return
    if (next === 'color' || next === 'size' || next === 'mount' || next === 'extras') overview()
    else if (next === 'sides') { setView('perspective'); if (selectedSideRef.current !== 'roof') focusSide(selectedSideRef.current) }
    else if (next === 'summary') { setView('perspective'); setFocus({ id: ++focusSeq.current, kind: 'showcase' }) }
  }, [focusSide, overview])
  const selectedSideRef = useRef<SideKey | 'roof'>('front')
  useEffect(() => { selectedSideRef.current = selectedSide }, [selectedSide])
  const selectSide = useCallback((side: SideKey | 'roof') => {
    setSelectedSide(side)
    if (!sceneRef.current.autoCamera) return
    if (side === 'roof') overview()
    else { setView('perspective'); focusSide(side) }
  }, [focusSide, overview])
  const [shade, setShade] = useState<ShadeResult | null>(null)
  const [moodHidden, setMoodHidden] = useState(false)
  const applyAdvice = useCallback((next: PergolaConfig, furniture: FurnitureSet) => { replaceConfig(next); setScene((current) => ({ ...current, furniture })); setView('perspective'); setStep('size'); setModal(null); setToast('A javasolt pergola betöltve. Innen minden szabadon módosítható; visszavonás: ↶') }, [replaceConfig])
  const [priceCollapsed, setPriceCollapsed] = useState(() => { try { return localStorage.getItem('pergo-price-collapsed') === '1' } catch { return false } })
  const togglePrice = useCallback(() => setPriceCollapsed((current) => { try { localStorage.setItem('pergo-price-collapsed', current ? '0' : '1') } catch { /* privát mód */ } return !current }), [])
  const toggleSunStudy = useCallback(() => setScene((current) => {
    if (current.sunStudy) return { ...current, sunStudy: false, time: timeForClock(current.dayTime) }
    setShade(null)
    // Az árnyék nyáron számít igazán: első bekapcsoláskor július közepe.
    const next = { ...current, sunStudy: true, photoMode: false, sunDate: current.sunDate || `${new Date().getFullYear()}-07-15` }
    return { ...next, time: timeForSun(studySun(next).elevation) }
  }), [])
  const handleSideSelect = useCallback((side: SideKey | 'roof') => {
    setSelectedSide(side)
    setStep('sides')
    setMobileControlsOpen(true)
    if (side !== 'roof' && sceneRef.current.autoCamera) focusSide(side)
  }, [focusSide, setMobileControlsOpen])

  const undo = useCallback(() => {
    setConfig((current) => {
      const previous = history.current.past.pop()
      if (!previous) return current
      history.current.future.push(current)
      setDelta(null)
      setChange(null)
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
      const key = event.key.toLowerCase()
      if (!(event.metaKey || event.ctrlKey) || (key !== 'z' && key !== 'y')) return
      // Szövegmezőben a böngésző saját visszavonása marad; csúszkán, jelölőnégyzeten a konfigurációé.
      const target = event.target as HTMLElement
      const textInput = target instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'button'].includes(target.type)
      if (textInput || ['TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      event.preventDefault()
      if (key === 'y' || event.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  const handleShare = async () => {
    const url = createShareUrl(config)
    // A címsorban csak a hash frissül (beágyazott nézetben az útvonal maradjon /embed/).
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${shareHash(config)}`)
    try { await copyShareUrl(url); setToast('Megosztható hivatkozás a vágólapra másolva.') }
    catch { setToast('A hivatkozás frissült a címsorban; onnan másolhatod.') }
  }
  const handleExport = async () => {
    setExporting(true)
    try { await exportPergolaPdf(config, price, tenant, ROOF_LABELS, createShareUrl(config), energyUsage, projectName.trim() || undefined, houseSummary(scene)); setToast('A PDF-összefoglaló elkészült.') }
    catch (error) { console.error(error); setToast('A PDF nem készült el. Próbáld újra, vagy frissítsd az oldalt.') }
    finally { setExporting(false) }
  }
  const handlePhoto = (file: File) => {
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name)) { setToast('Kérlek, képfájlt válassz.'); return }
    const url = URL.createObjectURL(file)
    // Előbb ellenőrizzük, hogy a böngésző meg tudja-e jeleníteni (pl. iPhone HEIC fotó nem minden böngészőben megy).
    const probe = new window.Image()
    probe.onload = () => {
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current)
      photoUrl.current = url
      setScene((current) => ({ ...current, photoUrl: url, photoMode: true, sunStudy: false }))
      setView('perspective')
      setToast('A fotó csak helyben nyílt meg. Állítsd be a pergola pozícióját és méretét.')
    }
    probe.onerror = () => {
      URL.revokeObjectURL(url)
      setToast('Ezt a képet a böngésző nem tudja megnyitni (pl. HEIC). Kérlek, JPG vagy PNG fotót válassz.')
    }
    probe.src = url
  }
  const saveSlot = (slot: 'A' | 'B') => {
    const image = captureScene(640, 0.72) ?? undefined
    const item: SavedConfiguration = { id: slot, name: `Konfiguráció ${slot}`, config: JSON.parse(JSON.stringify(config)) as PergolaConfig, savedAt: Date.now(), ...(image ? { image } : {}) }
    setSaved((current) => {
      const without = current.filter((savedItem) => savedItem.id !== slot)
      return slot === 'A' ? [item, ...without.filter((savedItem) => savedItem.id === 'B')].slice(0, 2) : [...without.filter((savedItem) => savedItem.id === 'A'), item].slice(0, 2)
    })
    setToast(`Konfiguráció ${slot} elmentve ebben a böngészőben.`)
  }
  const summary = <SummaryPanel onExport={handleExport} exporting={exporting} shareUrl={createShareUrl(config)} config={config} price={price} prices={prices} saved={saved} onSave={saveSlot} onLoad={replaceConfig} onNotify={setToast} onBudget={() => setModal('budget')} energyCost={energyCost} onEnergy={() => setModal('energy')} projectName={projectName} onProjectName={setProjectName} house={houseSummary(scene)} />

  return (
    <div className={`app-shell ${presentation ? 'presentation-mode' : ''} ${priceCollapsed ? 'price-collapsed' : ''}`}>
      <header className="app-header">
        <a className="brand" href="#top" aria-label={`${tenant.brand.name} kezdőnézet`} onClick={(event) => { event.preventDefault(); setView('perspective') }}>{tenant.brand.logoUrl ? <img src={tenant.brand.logoUrl} alt="" aria-hidden="true" style={{ height: 30, width: 'auto' }} /> : <svg viewBox="0 0 30 30" aria-hidden="true"><path d="M3 23V7h17l7 7-7 7H3Zm6-5h10l3-2-3-2H9v4Z" fill="currentColor" /><path d="M3 26 27 3" stroke="currentColor" strokeWidth="1.4" /></svg>}<span><strong>{tenant.brand.name}</strong>{tenant.brand.suffix && <small>{tenant.brand.suffix}</small>}</span></a>
        <div className="project-identity"><span>ÉPÍTÉSZETI KONFIGURÁTOR</span><strong>Valós méretek. Azonnali előnézet.</strong></div>
        <div className="header-actions"><div className="history-actions"><button type="button" aria-label="Visszavonás" title="Visszavonás · Ctrl+Z" onClick={undo} disabled={!history.current.past.length}><Undo2 size={17} /></button><button type="button" aria-label="Ismétlés" title="Ismétlés · Ctrl+Shift+Z" onClick={redo} disabled={!history.current.future.length}><Redo2 size={17} /></button></div><button type="button" className="header-text-button advisor-toggle" aria-label="Tanácsadó" onClick={() => setModal('advisor')}><WandSparkles size={16} /><span>Tanácsadó</span></button><button type="button" className="header-text-button presentation-toggle" aria-label={presentation ? 'Szerkesztés' : 'Bemutató'} onClick={() => setPresentation(!presentation)}><Presentation size={16} /><span>{presentation ? 'Szerkesztés' : 'Bemutató'}</span></button><button type="button" className="header-text-button" aria-label="Tudnivalók" onClick={() => setModal('info')}><Info size={16} /><span>Tudnivalók</span></button><button type="button" className="header-text-button" aria-label="Alaphelyzet" onClick={() => setModal('reset')}><RotateCcw size={16} /><span>Alaphelyzet</span></button></div>
      </header>

      <main className="studio-shell" id="top">
        <section className={`viewer-panel ${scene.photoMode ? 'photo-preview' : ''}`} aria-label="3D előnézet">
          {scene.photoMode && scene.photoUrl && <img className="photo-backdrop" src={scene.photoUrl} alt="A feltöltött teraszfotó háttere" />}
          <PergolaScene config={config} scene={scene} view={view} focus={focus} viewShift={sheet === 'half' && isNarrow ? 0.2 : 0} onSideSelect={handleSideSelect} onSceneChange={updateScene} onShade={setShade} />
          <div className="viewer-heading"><span>{scene.photoMode ? 'SAJÁT TERASZ / ELŐNÉZET' : 'ÉLŐ ÉPÍTÉSZETI JELENET'}</span><h1>{ROOF_LABELS[config.roof].split(' · ')[0]} <i>/</i> {config.width.toFixed(1).replace('.', ',')}<small> m</small></h1><p>{ROOF_LABELS[config.roof].split(' · ')[1]} · {config.depth.toFixed(1).replace('.', ',')} m mély</p></div>
          <div className="viewer-live"><i />VALÓS IDEJŰ 3D</div>
          <div className="weather-toolbar" aria-label="Gyors jelenetbeállítások"><button type="button" className={scene.rain ? 'selected' : ''} aria-pressed={scene.rain} title="Eső be- és kikapcsolása" onClick={() => updateScene({ rain: !scene.rain })}><CloudRain size={17} /><span>Eső</span></button><button type="button" className={scene.time === 'night' ? 'selected' : ''} title="Nappal és éjszaka váltása" onClick={() => { setMoodHidden(false); updateScene(scene.time === 'night' ? { time: 'day', dayTime: 13, sunStudy: false } : { time: 'night', dayTime: 22, sunStudy: false }) }}>{scene.time === 'night' ? <Sun size={17} /> : <Moon size={17} />}<span>{scene.time === 'night' ? 'Nappal' : 'Éjszaka'}</span></button>{scene.photoUrl && <button type="button" className={scene.photoMode ? 'selected' : ''} title="Fotós előnézet" onClick={() => updateScene({ photoMode: !scene.photoMode })}><Image size={17} /><span>Fotó</span></button>}<button type="button" className={scene.sunStudy ? 'selected' : ''} aria-pressed={scene.sunStudy} title="Árnyékelemzés: valós napállás a saját helyszíneden" onClick={toggleSunStudy}><SunMedium size={17} /><span>Árnyék</span></button><button type="button" className="ar-launch" title="Nézd meg valós méretben a saját kertedben (AR)" onClick={() => { if (embed) window.open(buildArUrl(config), '_blank', 'noopener'); else setModal('ar') }}><Rotate3d size={17} /><span>AR</span></button></div>
          {scene.rain && config.sensors && isMovableRoof(config.roof) && <div className="automation-status" role="status"><ShieldCheck size={16} /><span><strong>Esőautomata aktív</strong>{config.roof === 'retractable' ? 'A tolótető biztonságos, zárt pozícióban.' : 'A tetőlamellák biztonságos, zárt pozícióban.'}</span></div>}
          {scene.time === 'night' && !scene.sunStudy && !moodHidden && !scene.photoMode && <Suspense fallback={null}><div className={`sun-panel-slot is-mood${scene.rain && config.sensors && isMovableRoof(config.roof) ? ' below-status' : ''}`}><MoodPanel config={config} scene={scene} prices={prices} onChange={updateConfig} onSceneChange={updateScene} onClose={() => setMoodHidden(true)} /></div></Suspense>}
          {scene.sunStudy && !scene.photoMode && <Suspense fallback={null}><div className={`sun-panel-slot${scene.rain && config.sensors && isMovableRoof(config.roof) ? ' below-status' : ''}`}><SunStudyPanel scene={scene} shade={shade} onChange={updateScene} onClose={toggleSunStudy} /></div></Suspense>}
          {view === 'sofa' && <div className="pov-note" role="status"><Armchair size={16} /><span><strong>Kanapé panoráma</strong>Húzd a képet a körbenézéshez · a nyilakkal is forgatható</span></div>}
          {presentation && <div className="presentation-note"><span>ÜGYFÉL-BEMUTATÓ</span><strong>{config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · {ROOF_LABELS[config.roof].split(' · ')[0]}</strong><small>Húzd a jelenetet a forgatáshoz · ESC a szerkesztéshez</small></div>}
          <div className="camera-toolbar" aria-label="Kamera nézetek">{CAMERA_VIEWS.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={view === id ? 'selected' : ''} aria-pressed={view === id} onClick={() => { setView(id); if (id === 'sofa' && scene.autoRotate) updateScene({ autoRotate: false }) }} title={`${label} nézet`}><Icon size={16} /><span>{label}</span></button>)}</div>
          {welcomeBack && <div className="welcome-back" role="status">
            <span><strong>Üdv újra!</strong>Ott folytatod, ahol abbahagytad: {config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · {formatHuf(price.totalGross)}</span>
            <button type="button" className="welcome-primary" onClick={() => setWelcomeBack(false)}>Folytatom</button>
            <button type="button" onClick={() => { replaceConfig(tenant.defaultConfig); setProjectName(''); setWelcomeBack(false); goStep('size') }}>Új terv</button>
          </div>}
          {change && change.amount !== 0 && !presentation && <div key={change.id} className={`change-pill ${change.amount < 0 ? 'is-down' : 'is-up'}`} role="status" aria-live="polite">
            <strong>{change.amount > 0 ? '+' : '−'}{formatHuf(Math.abs(change.amount))}</strong><span>{change.label}</span>
            <button type="button" onClick={() => { undo(); setChange(null) }}><Undo2 size={14} />Visszavonás</button>
          </div>}
          <div className="viewer-footer"><span>{scene.photoMode ? 'HELYI FOTÓS ELŐNÉZET' : '1 egység = 1 méter'}</span><span>{price.area.toFixed(1).replace('.', ',')} m²</span></div>
        </section>

        <ConfiguratorControls config={config} scene={scene} step={step} selectedSide={selectedSide} summary={summary} onStepChange={goStep} onSideSelect={selectSide} onChange={updateConfig} onSceneChange={updateScene} onPreset={replaceConfig} prices={prices} onPhotoUpload={handlePhoto} sheet={sheet} onSheetChange={setSheet} onAdvisor={() => setModal('advisor')} energyCost={energyCost} onEnergy={() => setModal('energy')} />
        <PricePanel config={config} price={price} exporting={exporting} delta={delta} compact onEditPrices={admin ? () => setModal('prices') : undefined} onExport={handleExport} onShare={handleShare} onBudget={() => setModal('budget')} collapsed={priceCollapsed} onToggleCollapse={togglePrice} energyCost={energyCost} onEnergy={() => setModal('energy')} />
      </main>

      <div className="mobile-price-bar"><div><span>Bruttó irányár</span><strong data-value={price.totalGross}><AnimatedPrice value={price.totalGross} /></strong></div><button type="button" className="mobile-pdf" aria-label="PDF letöltése" disabled={exporting} onClick={handleExport}><FileDown size={19} /></button><button type="button" onClick={() => { goStep(step === 'summary' ? 'size' : 'summary'); setMobileControlsOpen(true) }}>{step === 'summary' ? 'Tovább tervezés' : 'Összegzés'}<ChevronRight size={16} /></button></div>
      {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button type="button" aria-label="Értesítés bezárása" onClick={() => setToast('')}><X size={16} /></button></div>}
      {modal === 'prices' && admin && <PriceSettingsDialog prices={prices} onChange={setPrices} onReset={() => { setPrices(tenant.prices); setToast('A gyártói árlista visszaállt.') }} onClose={() => setModal(null)} />}
      {modal === 'info' && <InfoDialog onClose={() => setModal(null)} />}
      {modal === 'budget' && <Suspense fallback={null}><BudgetDialog config={config} prices={prices} furniture={scene.furniture} currentGross={price.totalGross} onApply={(next) => { updateConfig(next); setModal(null); setToast('A terv a keretösszegedhez igazítva. Visszavonás: ↶') }} onClose={() => setModal(null)} /></Suspense>}
      {modal === 'advisor' && <Suspense fallback={null}><AdvisorDialog prices={prices} onApply={applyAdvice} onClose={() => setModal(null)} /></Suspense>}
      {modal === 'energy' && <Suspense fallback={null}><EnergyDialog config={config} prices={prices} usage={energyUsage} onUsageChange={setEnergyUsage} onConfigChange={updateConfig} onClose={() => setModal(null)} /></Suspense>}
      {modal === 'ar' && <Suspense fallback={null}><ArDialog shareUrl={buildArUrl(config)} onClose={() => setModal(null)} /></Suspense>}
      {modal === 'reset' && <ResetDialog onConfirm={() => { replaceConfig(tenant.defaultConfig); setScene((current) => ({ ...DEFAULT_SCENE, wallFinish: current.wallFinish, wallColor: current.wallColor, windowColor: current.windowColor })); setView('perspective'); setStep('size'); setToast('Az alapkonfiguráció visszaállt.') }} onClose={() => setModal(null)} />}
      {homeHref && (homeHref.startsWith('/') ? <Link className="studio-home-link" to={homeHref}>Kezdőlap</Link> : <a className="studio-home-link" href={homeHref} target="_top" rel="noreferrer">Kezdőlap</a>)}
    </div>
  )
}
