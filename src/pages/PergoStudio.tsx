import TenantMark from '@/components/TenantMark'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SlidersHorizontal, Armchair, Cog, FileDown, Box, ImagePlus, Check, ChevronRight, CloudRain, Gauge, Image, Info, Layers, LayoutGrid, Maximize2, Presentation, Redo2, Rotate3d, RotateCcw, Scan, ShieldCheck, SunMedium, Undo2, View, Wallet, WandSparkles, X } from 'lucide-react'
import { Link } from 'react-router'
import ConfiguratorControls, { SceneSettingsPanel } from '@/components/ConfiguratorControls'
import { InfoDialog, PriceSettingsDialog, ResetDialog } from '@/components/Dialogs'
import PergolaScene from '@/components/PergolaScene'
import PricePanel, { AnimatedPrice, PriceDeltaPop } from '@/components/PricePanel'
import SummaryPanel from '@/components/SummaryPanel'
import { track } from '@/lib/analytics'
import { copyShareUrl, exportPergolaPdf } from '@/lib/exportPdf'
import { noteEngagement, noteStep, startEngagement } from '@/lib/engagement'
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
import { detectArPath, type ArPath } from '@/lib/arSupport'
import PhotoBar from '@/components/PhotoBar'
import LamelixLogo from '@/components/LamelixLogo'
import { DEFAULT_PLACEMENT, PHOTO_ACCEPT, validatePhotoFile, type PhotoPlacement } from '@/lib/photoPlacement'
import { clearPlacement, deletePhoto, loadPhoto, loadPlacement, savePhoto, savePlacement } from '@/lib/photoStore'
import type { ShadeResult } from '@/components/ShadeProbe'
import { studySun } from '@/lib/sunSite'
import { isMovableRoof } from '@/lib/roofs'
import { isClosedBuilding } from '@/lib/buildings'
import FullscreenControl from '@/components/FullscreenControl'
import { DEFAULT_USAGE, estimateEnergy, roundCost, type EnergyUsage } from '@/lib/energy'
import type { FurnitureSet } from '@/types/pergola'

const timeForSun = (elevation: number): SceneSettings['time'] => (elevation < -4 ? 'night' : elevation < 12 ? 'sunset' : 'day')
const timeForClock = (hour: number): SceneSettings['time'] => (hour >= 20 || hour < 7 ? 'night' : hour >= 17 ? 'sunset' : 'day')

const ArDialog = lazy(() => import('@/components/ArDialog'))
const SunStudyPanel = lazy(() => import('@/components/SunStudyPanel'))
import MechanismPanel from '@/components/MechanismPanel'
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

/** Folyamatosan húzható mezők: gyors egymásutánjuk egy visszavonási lépés. */
const CONTINUOUS_KEYS = new Set(['width', 'depth', 'height', 'pitch'])
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
  const { tenant, labels: ROOF_LABELS, admin, embed, homeHref, product } = useTenant()
  usePageSeo(product === 'carport' ? '/konfigurator/carport' : '/konfigurator', { noindex: embed || !tenant.demo, title: tenant.demo ? undefined : `${tenant.brand.name} · ${product === 'carport' ? 'carport' : 'pergola'} konfigurátor` })
  const [config, setConfig] = useState<PergolaConfig>(() => loadInitialConfig(tenant, product))
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
  // Érintőképernyőn egyszer megmutatjuk, hogy a jelenet forgatható: az első húzásnál (vagy 7 mp után) eltűnik, és nem jön vissza.
  const [rotateHint, setRotateHint] = useState(() => { try { return window.matchMedia('(pointer: coarse)').matches && localStorage.getItem('pergo-rotate-hint') !== '1' } catch { return false } })
  useEffect(() => {
    if (!rotateHint) return
    const done = () => { setRotateHint(false); try { localStorage.setItem('pergo-rotate-hint', '1') } catch { /* privát mód */ } }
    const canvas = document.querySelector('.scene-canvas-wrap')
    canvas?.addEventListener('pointerdown', done, { once: true })
    // Az időzítő csak a kész jelenettől indul (a töltőképernyő alatt a tipp nem látszik, lásd CSS).
    let timer = 0
    const arm = () => { if (!timer && canvas?.getAttribute('data-scene-ready') === 'true') timer = window.setTimeout(done, 7000) }
    arm()
    const observer = canvas ? new MutationObserver(arm) : null
    if (canvas) observer?.observe(canvas, { attributes: true, attributeFilter: ['data-scene-ready'] })
    return () => { canvas?.removeEventListener('pointerdown', done); observer?.disconnect(); window.clearTimeout(timer) }
  }, [rotateHint])
  const [presentation, setPresentation] = useState(false)
  const [delta, setDelta] = useState<{ amount: number; label: string } | null>(null)
  // Kontextus-kamera, változás-jelző és rezgés.
  const [focus, setFocus] = useState<CameraFocus | null>(null)
  const focusSeq = useRef(0)
  const [change, setChange] = useState<{ id: number; amount: number; label: string } | null>(null)
  const lastBuzz = useRef(0)
  const eveningShown = useRef(false)
  const sceneRef = useRef<SceneSettings>(DEFAULT_SCENE)
  const LANDSCAPE_PHONE = '(orientation: landscape) and (max-height: 520px) and (pointer: coarse)'
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia(`(max-width: 820px), ${LANDSCAPE_PHONE}`).matches)
  useEffect(() => { const query = window.matchMedia(`(max-width: 820px), ${LANDSCAPE_PHONE}`); const update = () => setIsNarrow(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update) }, [])
  // Telefon fekvő nézetben a vezérlők állandóan nyitott oldalsávban vannak (nincs alsó lap).
  const [landscapePhone, setLandscapePhone] = useState(() => window.matchMedia(LANDSCAPE_PHONE).matches)
  useEffect(() => { const query = window.matchMedia(LANDSCAPE_PHONE); const update = () => setLandscapePhone(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update) }, [])
  const sheetView: SheetState = landscapePhone ? 'half' : sheet
  const [saved, setSaved] = useState<SavedConfiguration[]>(() => loadSaved(tenant))
  const history = useRef<{ past: PergolaConfig[]; future: PergolaConfig[] }>({ past: [], future: [] })
  const lastEdit = useRef<{ key: string; time: number }>({ key: '', time: 0 })
  const buildingStash = useRef<{ roof: PergolaConfig['roof']; sides: PergolaConfig['sides']; split: PergolaConfig['split']; pitch: PergolaConfig['pitch']; closedSides: PergolaConfig['sides'] } | null>(null)
  const roofStash = useRef<Partial<Record<PergolaConfig['roof'], Partial<Pick<PergolaConfig, 'glazing' | 'roofShade' | 'shadeFabric' | 'solar' | 'roofColor' | 'roofRal'>>>>>({})
  const configRef = useRef(config)
  useEffect(() => { configRef.current = config }, [config])
  const photoUrl = useRef<string | null>(null)
  // White-label: a gyártói konfigurátor fülén a gyártó logója legyen (ha van), ne a platformé.
  useEffect(() => {
    const logo = tenant.brand.logoUrl
    if (!logo) return
    const icons = [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')]
    const previous = icons.map((icon) => icon.href)
    icons.forEach((icon) => { icon.href = logo })
    return () => icons.forEach((icon, index) => { icon.href = previous[index] })
  }, [tenant.brand.logoUrl])
  // AR-képesség: nem támogatott telefonon nem kínálunk AR-t (a QR-ről érkezőknek a párbeszéd elmagyarázza, miért).
  const [arPath, setArPath] = useState<ArPath | null>(null)
  useEffect(() => { let alive = true; void detectArPath().then((path) => { if (alive) setArPath(path) }); return () => { alive = false } }, [])
  const arHidden = arPath === 'ios-unsupported' || arPath === 'android-unsupported'
  const price = useMemo(() => calculatePrice(config, prices, ROOF_LABELS), [config, prices, ROOF_LABELS])
  const [energyUsage, setEnergyUsage] = useState<EnergyUsage>(DEFAULT_USAGE)
  const energy = useMemo(() => estimateEnergy(config, energyUsage, tenant.energy?.heaterWatts), [config, energyUsage, tenant])
  const energyCost = energy.hasElectrics ? roundCost(energy.cost) : null

  useEffect(() => persistConfig(tenant, config), [tenant, config])
  // Névtelen konverziómérés: megnyitás és az első érdemi módosítás (csak vásárlói nézetben).
  const firstConfig = useRef(config)
  useEffect(() => { if (!admin) { track(tenant.id, 'open'); startEngagement(tenant.id) } }, [tenant.id, admin])
  // A lead-pontozáshoz: melyik lépéseket járta be (csak a böngészőben gyűlik, a kérelemmel megy ki).
  useEffect(() => { noteStep(tenant.id, step) }, [tenant.id, step])
  useEffect(() => { if (!admin && config !== firstConfig.current) track(tenant.id, 'configure') }, [tenant.id, admin, config])
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
  // Korábban feltöltött fotó visszatöltése (csak ebben a böngészőben tárolva); a fotó mód nem kapcsol be magától.
  useEffect(() => {
    let alive = true
    void loadPhoto(tenant.id).then((blob) => {
      if (!alive || !blob || photoUrl.current) return
      const url = URL.createObjectURL(blob)
      photoUrl.current = url
      setScene((current) => ({ ...current, ...(loadPlacement(tenant.id) ?? DEFAULT_PLACEMENT), photoUrl: url }))
    })
    return () => { alive = false }
  }, [tenant.id])
  // Az elhelyezés mentése (PDF-hez és következő megnyitáshoz).
  useEffect(() => {
    if (!scene.photoUrl) return
    savePlacement(tenant.id, { photoX: scene.photoX, photoY: scene.photoY, photoScale: scene.photoScale, photoRotation: scene.photoRotation, photoTilt: scene.photoTilt, photoLens: scene.photoLens })
  }, [tenant.id, scene.photoUrl, scene.photoX, scene.photoY, scene.photoScale, scene.photoRotation, scene.photoTilt, scene.photoLens])
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
    // Tetőváltáskor a tetőhöz kötött beállítások (üvegezés, árnyékoló, napelem, tetőszín) megmaradnak a régi tetőhöz,
    // és visszaváltáskor visszajönnek: a normalizálás ugyanis a nem odaillőket eldobja.
    let merged: PergolaConfig = replace ? nextOrPatch as PergolaConfig : { ...config, ...nextOrPatch }
    if (replace) { roofStash.current = {}; buildingStash.current = null }
    if (!replace && 'roof' in nextOrPatch && nextOrPatch.roof && nextOrPatch.roof !== config.roof) {
      const { glazing, roofShade, shadeFabric, solar, roofColor, roofRal } = config
      roofStash.current[config.roof] = { glazing, roofShade, shadeFabric, solar, roofColor, roofRal }
      const restored = roofStash.current[nextOrPatch.roof] ?? {}
      const explicit = nextOrPatch as Record<string, unknown>
      merged = { ...config, ...Object.fromEntries(Object.entries(restored).filter(([key, value]) => value !== undefined && !(key in explicit))), ...nextOrPatch }
    }
    // Pergolából veranda/télikertbe váltáskor a tető, az oldalak és a dőlés kényszerből változnak; pergolára visszaváltva
    // az eredeti állapot jön vissza (a közben kézzel módosított oldalak megmaradnak).
    let enteringBuilding = false
    if (!replace && 'building' in nextOrPatch) {
      const wasClosed = isClosedBuilding(config.building)
      const willBeClosed = isClosedBuilding(nextOrPatch.building)
      if (!wasClosed && willBeClosed) enteringBuilding = true
      if (wasClosed && !willBeClosed && buildingStash.current) {
        const saved = buildingStash.current
        const sides = Object.fromEntries((['front', 'back', 'left', 'right'] as const).map((side) => [side, config.sides[side] === saved.closedSides[side] ? saved.sides[side] : config.sides[side]])) as PergolaConfig['sides']
        merged = { ...merged, roof: saved.roof, sides, split: saved.split, pitch: saved.pitch }
        buildingStash.current = null
      }
    }
    const next = normalizeConfig(tenant, merged)
    if (enteringBuilding) buildingStash.current = { roof: config.roof, sides: config.sides, split: config.split, pitch: config.pitch, closedSides: next.sides }
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
    // Csúszkahúzásnál (folyamatos mező, rövid időn belül) egyetlen visszavonási lépés keletkezik, nem tucatnyi.
    const nowMs = Date.now()
    const continuous = changedKeys.length === 1 && CONTINUOUS_KEYS.has(changedKeys[0])
    const coalesce = continuous && lastEdit.current.key === changedKeys[0] && nowMs - lastEdit.current.time < 700 && history.current.past.length > 0
    lastEdit.current = { key: continuous ? changedKeys[0] : '', time: nowMs }
    if (!coalesce) {
      history.current.past.push(config)
      history.current.past = history.current.past.slice(-40)
    }
    history.current.future = []
    configRef.current = next
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
  const [viewOpen, setViewOpen] = useState(false)
  // Eszközök menü: a szakértői eszközök egy helyen, névvel — a 3D feletti sáv csak a gyors kapcsolókat mutatja.
  const [toolsOpen, setToolsOpen] = useState(false)
  useEffect(() => { if (!viewOpen) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setViewOpen(false) }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [viewOpen])
  const applyAdvice = useCallback((next: PergolaConfig, furniture: FurnitureSet) => { replaceConfig(next); setScene((current) => ({ ...current, furniture })); setView('perspective'); setStep('size'); setModal(null); setToast('A javasolt pergola betöltve. Innen minden szabadon módosítható; visszavonás: ↶') }, [replaceConfig])
  const [priceCollapsed, setPriceCollapsed] = useState(() => { try { return localStorage.getItem('pergo-price-collapsed') === '1' } catch { return false } })
  const togglePrice = useCallback(() => setPriceCollapsed((current) => { try { localStorage.setItem('pergo-price-collapsed', current ? '0' : '1') } catch { /* privát mód */ } return !current }), [])
  const mechanismOn = config.roof === 'louvered' && !!scene.mechanism && !scene.photoMode && !scene.sunStudy
  const toggleSunStudy = useCallback(() => setScene((current) => {
    if (current.sunStudy) return { ...current, sunStudy: false, time: timeForClock(current.dayTime) }
    setShade(null)
    // Az árnyék nyáron számít igazán: első bekapcsoláskor július közepe.
    const next = { ...current, sunStudy: true, photoMode: false, mechanism: false, sunDate: current.sunDate || `${new Date().getFullYear()}-07-15` }
    return { ...next, time: timeForSun(studySun(next).elevation) }
  }), [])
  const handleSideSelect = useCallback((side: SideKey | 'roof') => {
    setSelectedSide(side)
    setStep('sides')
    setMobileControlsOpen(true)
    if (side !== 'roof' && sceneRef.current.autoCamera) focusSide(side)
  }, [focusSide, setMobileControlsOpen])

  // A visszavonás/újra nem mellékhatás a setState-en belül (az updater többször is lefuthat, és kihagyna lépéseket):
  // az aktuális konfigurációt ref-ből olvassuk, a history módosítása és a setConfig külön lépés.
  const undo = useCallback(() => {
    const previous = history.current.past.pop()
    if (!previous) return
    history.current.future.push(configRef.current)
    configRef.current = previous
    setDelta(null)
    setChange(null)
    setConfig(previous)
  }, [])
  const redo = useCallback(() => {
    const next = history.current.future.pop()
    if (!next) return
    history.current.past.push(configRef.current)
    configRef.current = next
    setDelta(null)
    setConfig(next)
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
    if (!admin) { track(tenant.id, 'share'); noteEngagement(tenant.id, 'share') }
  }
  const handleExport = async () => {
    setExporting(true)
    if (!admin) { track(tenant.id, 'pdf'); noteEngagement(tenant.id, 'pdf') }
    try { await exportPergolaPdf(config, price, tenant, ROOF_LABELS, createShareUrl(config), energyUsage, projectName.trim() || undefined, houseSummary(scene)); setToast('A PDF-összefoglaló elkészült.') }
    catch (error) { console.error(error); setToast('A PDF nem készült el. Próbáld újra, vagy frissítsd az oldalt.') }
    finally { setExporting(false) }
  }
  const photoKey = tenant.id
  const showPhoto = (url: string, placement: PhotoPlacement, active: boolean) => {
    if (photoUrl.current && photoUrl.current !== url) URL.revokeObjectURL(photoUrl.current)
    photoUrl.current = url
    setScene((current) => ({ ...current, ...placement, photoUrl: url, photoMode: active, sunStudy: active ? false : current.sunStudy }))
  }
  const handlePhoto = (file: File) => {
    const problem = validatePhotoFile(file)
    if (problem) { setToast(problem); return }
    const url = URL.createObjectURL(file)
    // Előbb ellenőrizzük, hogy a böngésző tényleg meg tudja-e jeleníteni (sérült vagy nem támogatott kép).
    const probe = new window.Image()
    probe.onload = () => {
      showPhoto(url, DEFAULT_PLACEMENT, true)
      setPresentation(false)
      savePlacement(photoKey, DEFAULT_PLACEMENT)
      void savePhoto(photoKey, file)
      setToast('Fotó mód: húzd a pergolát a helyére, majd állítsd a méretét és a forgatást. A kép nem hagyja el az eszközödet.')
    }
    probe.onerror = () => {
      URL.revokeObjectURL(url)
      setToast('Ezt a képet a böngésző nem tudja megnyitni. Kérlek, JPG, PNG vagy WebP fotót válassz.')
    }
    probe.src = url
  }
  const deleteUserPhoto = () => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current)
    photoUrl.current = null
    void deletePhoto(photoKey)
    clearPlacement(photoKey)
    setScene((current) => ({ ...current, ...DEFAULT_PLACEMENT, photoUrl: undefined, photoMode: false }))
    setToast('A fotó törölve. Vissza a 3D jelenethez.')
  }
  const photoInput = useRef<HTMLInputElement>(null)
  const openPhotoPicker = () => photoInput.current?.click()
  const saveSlot = (slot: 'A' | 'B') => {
    const image = captureScene(640, 0.72) ?? undefined
    const item: SavedConfiguration = { id: slot, name: `Konfiguráció ${slot}`, config: JSON.parse(JSON.stringify(config)) as PergolaConfig, savedAt: Date.now(), ...(image ? { image } : {}) }
    setSaved((current) => {
      const without = current.filter((savedItem) => savedItem.id !== slot)
      return slot === 'A' ? [item, ...without.filter((savedItem) => savedItem.id === 'B')].slice(0, 2) : [...without.filter((savedItem) => savedItem.id === 'A'), item].slice(0, 2)
    })
    setToast(`Konfiguráció ${slot} elmentve ebben a böngészőben.`)
    if (!admin) noteEngagement(tenant.id, 'saved')
  }
  const summary = <SummaryPanel shareUrl={createShareUrl(config)} config={config} price={price} prices={prices} saved={saved} onSave={saveSlot} onLoad={replaceConfig} onNotify={setToast} onBudget={() => setModal('budget')} energyCost={energyCost} onEnergy={() => setModal('energy')} onExport={handleExport} exporting={exporting} projectName={projectName} onProjectName={setProjectName} house={houseSummary(scene)} />

  return (
    <div className={`app-shell ${presentation ? 'presentation-mode' : ''} ${priceCollapsed ? 'price-collapsed' : ''}`}>
      <header className="app-header">
        <a className="brand" href="#top" aria-label={`${tenant.brand.name} kezdőnézet`} onClick={(event) => { event.preventDefault(); setView('perspective') }}><TenantMark tenant={tenant} /></a>
        <div className="project-identity"><span>ÉPÍTÉSZETI KONFIGURÁTOR</span><strong>Valós méretek. Azonnali előnézet.</strong></div>
        <div className="header-actions"><FullscreenControl /><div className="history-actions"><button type="button" aria-label="Visszavonás" title="Visszavonás · Ctrl+Z" onClick={undo} disabled={!history.current.past.length}><Undo2 size={17} /></button><button type="button" aria-label="Ismétlés" title="Ismétlés · Ctrl+Shift+Z" onClick={redo} disabled={!history.current.future.length}><Redo2 size={17} /></button></div><button type="button" className="header-text-button presentation-toggle" aria-label={presentation ? 'Szerkesztés' : 'Bemutató'} onClick={() => setPresentation(!presentation)}><Presentation size={16} /><span>{presentation ? 'Szerkesztés' : 'Bemutató'}</span></button><button type="button" className="header-text-button" aria-label="Tudnivalók" onClick={() => setModal('info')}><Info size={16} /><span>Tudnivalók</span></button><button type="button" className="header-text-button" aria-label="Alaphelyzet" onClick={() => setModal('reset')}><RotateCcw size={16} /><span>Alaphelyzet</span></button></div>
      </header>

      <main className="studio-shell" id="top">
        <section className={`viewer-panel ${scene.photoMode ? 'photo-preview' : ''}`} aria-label="3D előnézet">
          {scene.photoMode && scene.photoUrl && <img className="photo-backdrop" src={scene.photoUrl} alt="A feltöltött teraszfotó háttere" />}
          <PergolaScene config={config} scene={scene} view={view} focus={focus} viewShift={sheetView === 'half' && isNarrow && !landscapePhone ? 0.2 : 0} onSideSelect={handleSideSelect} onSceneChange={updateScene} onShade={setShade} />
          <div className="viewer-heading"><span>{scene.photoMode ? 'SAJÁT TERASZ / ELŐNÉZET' : 'ÉLŐ ÉPÍTÉSZETI JELENET'}</span><h1>{ROOF_LABELS[config.roof].split(' · ')[0]} <i>/</i> {config.width.toFixed(1).replace('.', ',')}<small> m</small></h1><p>{ROOF_LABELS[config.roof].split(' · ')[1]} · {config.depth.toFixed(1).replace('.', ',')} m mély</p></div>
          <div className="viewer-live"><i />VALÓS IDEJŰ 3D</div>
          <div className="weather-toolbar" aria-label="Gyors jelenetbeállítások"><button type="button" className={scene.rain ? 'selected' : ''} aria-pressed={scene.rain} title="Eső be- és kikapcsolása" onClick={() => updateScene({ rain: !scene.rain })}><CloudRain size={17} /><span>Eső</span></button>{!arHidden && <button type="button" className="ar-launch" title={arPath === 'desktop' ? 'Nézd meg a kertedben valós méretben — telefonon (QR-kód)' : 'Nézd meg valós méretben a saját kertedben (AR)'} onClick={() => { if (!admin) { track(tenant.id, 'ar'); noteEngagement(tenant.id, 'ar') } if (embed) window.open(buildArUrl(config), '_blank', 'noopener'); else setModal('ar') }}><Rotate3d size={17} /><span>AR</span></button>}<button type="button" className={`view-toggle tools-toggle ${toolsOpen || viewOpen || scene.sunStudy || scene.photoMode || mechanismOn || scene.exploded ? 'selected' : ''}`} aria-pressed={toolsOpen} aria-expanded={toolsOpen} title="Eszközök: nézet, árnyékelemzés, fotó, működés, robbantott nézet, keret, üzemeltetés, tanácsadó" onClick={() => { setToolsOpen((open) => !open); setViewOpen(false) }}><LayoutGrid size={17} /><span>Eszközök</span></button></div>
          {toolsOpen && <div className="view-popover tools-menu glass-panel" role="dialog" aria-label="Eszközök"><div className="view-popover-head"><strong>Eszközök</strong><button type="button" aria-label="Bezárás" onClick={() => setToolsOpen(false)}><X size={16} /></button></div><div className="tools-list">
            {([
              { id: 'view', icon: SlidersHorizontal, name: 'Nézet és vizualizáció', note: 'Napszak, napirány, környezet, bútor, feliratok, 3D-minőség', active: false, run: () => { setViewOpen(true) } },
              { id: 'sun', icon: SunMedium, name: 'Árnyékelemzés', note: 'Valós napállás a saját helyszíneden, dátum és óra szerint', active: scene.sunStudy, run: toggleSunStudy },
              { id: 'photo', icon: scene.photoUrl ? Image : ImagePlus, name: 'Fotóba helyezés', note: scene.photoUrl ? 'A pergola a saját teraszod fotóján' : 'Töltsd fel a teraszod fotóját, és helyezd rá a pergolát', active: scene.photoMode, run: () => { if (!scene.photoUrl) openPhotoPicker(); else updateScene({ photoMode: !scene.photoMode, sunStudy: false }) } },
              ...(config.roof === 'louvered' ? [{ id: 'mechanism', icon: Cog, name: 'Működés-bemutató', note: 'A lamellahajtás mozgásban, valós gyári adatokkal', active: mechanismOn, run: () => updateScene({ mechanism: !scene.mechanism, sunStudy: false, photoMode: false, exploded: false }) }] : []),
              { id: 'exploded', icon: Layers, name: 'Robbantott nézet', note: 'A szerkezet elemei szétválasztva', active: scene.exploded, run: () => updateScene({ exploded: !scene.exploded, mechanism: false }) },
              { id: 'budget', icon: Wallet, name: 'Költségkeret-tervező', note: 'Add meg a keretet, megmutatjuk, mi fér bele', active: false, run: () => setModal('budget') },
              { id: 'energy', icon: Gauge, name: energyCost ? `Üzemeltetés ≈ ${formatHuf(energyCost)} / év` : 'Üzemeltetési költség', note: 'Áramköltség a valós lakossági tarifával', active: false, run: () => setModal('energy') },
              { id: 'advisor', icon: WandSparkles, name: 'Tanácsadó', note: '4 kérdés, és javaslunk egy hozzád illő kivitelt', active: false, run: () => setModal('advisor') },
            ] as const).map(({ id, icon: Icon, name, note, active, run }) => <button type="button" key={id} className={`tools-item${active ? ' is-active' : ''}`} aria-pressed={active} onClick={() => { setToolsOpen(false); run() }}><Icon size={18} /><span><strong>{name}</strong><small>{note}</small></span>{active && <em>Bekapcsolva</em>}</button>)}
          </div></div>}
          {viewOpen && <div className="view-popover glass-panel" role="dialog" aria-label="Nézet és vizualizáció"><div className="view-popover-head"><strong>Nézet és vizualizáció</strong><button type="button" aria-label="Bezárás" onClick={() => setViewOpen(false)}><X size={16} /></button></div><SceneSettingsPanel config={config} scene={scene} prices={prices} onChange={updateConfig} onSceneChange={updateScene} onPhotoUpload={handlePhoto} /></div>}
          {scene.rain && config.sensors && isMovableRoof(config.roof) && <div className="automation-status" role="status"><ShieldCheck size={16} /><span><strong>Esőautomata aktív</strong>{config.roof === 'retractable' ? 'A tolótető biztonságos, zárt pozícióban.' : 'A tetőlamellák biztonságos, zárt pozícióban.'}</span></div>}
          {scene.time === 'night' && !scene.sunStudy && !mechanismOn && !moodHidden && !scene.photoMode && <Suspense fallback={null}><div className={`sun-panel-slot is-mood${scene.rain && config.sensors && isMovableRoof(config.roof) ? ' below-status' : ''}`}><MoodPanel config={config} scene={scene} prices={prices} onChange={updateConfig} onSceneChange={updateScene} onClose={() => setMoodHidden(true)} /></div></Suspense>}
          {mechanismOn && <Suspense fallback={null}><div className={`sun-panel-slot is-mechanism${scene.rain && config.sensors && isMovableRoof(config.roof) ? ' below-status' : ''}`}><MechanismPanel config={config} onClose={() => updateScene({ mechanism: false })} /></div></Suspense>}
          {scene.sunStudy && !scene.photoMode && <Suspense fallback={null}><div className={`sun-panel-slot${scene.rain && config.sensors && isMovableRoof(config.roof) ? ' below-status' : ''}`}><SunStudyPanel scene={scene} shade={shade} onChange={updateScene} onClose={toggleSunStudy} /></div></Suspense>}
          {view === 'sofa' && <div className="pov-note" role="status"><Armchair size={16} /><span><strong>Kanapé panoráma</strong>Húzd a képet a körbenézéshez · a nyilakkal is forgatható</span></div>}
          {rotateHint && view !== 'sofa' && !scene.photoMode && !welcomeBack && <div className="pov-note rotate-hint" role="status"><Rotate3d size={16} /><span><strong>Húzd a forgatáshoz</strong>Két ujjal nagyíthatsz</span></div>}
          {presentation && <div className="presentation-note"><span>ÜGYFÉL-BEMUTATÓ</span><strong>{config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · {ROOF_LABELS[config.roof].split(' · ')[0]}</strong><small>Húzd a jelenetet a forgatáshoz · ESC a szerkesztéshez</small></div>}
          {scene.photoMode ? <PhotoBar placement={{ photoX: scene.photoX, photoY: scene.photoY, photoScale: scene.photoScale, photoRotation: scene.photoRotation, photoTilt: scene.photoTilt, photoLens: scene.photoLens }} coarse={isNarrow || window.matchMedia('(pointer: coarse)').matches} onChange={(next) => updateScene(next)} onReset={() => updateScene({ ...DEFAULT_PLACEMENT })} onReplace={openPhotoPicker} onDelete={deleteUserPhoto} onDone={() => updateScene({ photoMode: false })} />
            : <div className="camera-toolbar" aria-label="Kamera nézetek">{CAMERA_VIEWS.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={view === id ? 'selected' : ''} aria-pressed={view === id} onClick={() => { setView(id); if (id === 'sofa' && scene.autoRotate) updateScene({ autoRotate: false }) }} title={`${label} nézet`}><Icon size={16} /><span>{label}</span></button>)}</div>}
          {welcomeBack && <div className="welcome-back" role="status">
            <span><strong>Üdv újra!</strong>Ott folytatod, ahol abbahagytad: {config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · {formatHuf(price.totalGross)}</span>
            <button type="button" className="welcome-primary" onClick={() => setWelcomeBack(false)}>Folytatom</button>
            <button type="button" onClick={() => { replaceConfig(tenant.defaultConfig); setProjectName(''); setWelcomeBack(false); goStep('size') }}>Új terv</button>
          </div>}
          {change && change.amount !== 0 && !presentation && <div key={change.id} className={`change-pill ${change.amount < 0 ? 'is-down' : 'is-up'}`} role="status" aria-live="polite">
            <strong>{change.amount > 0 ? '+' : '−'}{formatHuf(Math.abs(change.amount))}</strong><span>{change.label}</span>
            <button type="button" onClick={() => { undo(); setChange(null) }}><Undo2 size={14} />Visszavonás</button>
          </div>}
          <div className="viewer-footer"><span>{scene.photoMode ? 'HELYI FOTÓS ELŐNÉZET' : '1 egység = 1 méter'}</span><span>{price.area.toFixed(1).replace('.', ',')} m²</span>{tenant.platformCredit !== false && <a className="platform-credit" href="/" target="_blank" rel="noopener" title="3D konfigurátor: Lamelix"><LamelixLogo variant="symbol" tone="onDark" height={11} title={null} />Lamelix</a>}</div>
        </section>

        <ConfiguratorControls config={config} scene={scene} step={step} selectedSide={selectedSide} summary={summary} onStepChange={goStep} onSideSelect={selectSide} onChange={updateConfig} onSceneChange={updateScene} onPreset={replaceConfig} prices={prices} sheet={sheetView} onSheetChange={setSheet} onAdvisor={() => setModal('advisor')} energyCost={energyCost} onEnergy={() => setModal('energy')} />
        <PricePanel config={config} price={price} exporting={exporting} delta={delta} compact onEditPrices={admin ? () => setModal('prices') : undefined} onExport={handleExport} onShare={handleShare} onBudget={() => setModal('budget')} collapsed={priceCollapsed} onToggleCollapse={togglePrice} energyCost={energyCost} onEnergy={() => setModal('energy')} />
      </main>

      <div className="mobile-price-bar"><div><span>Bruttó irányár</span><strong data-value={price.totalGross}><AnimatedPrice value={price.totalGross} /></strong><PriceDeltaPop value={price.totalGross} /></div><button type="button" className="mobile-pdf" aria-label="PDF letöltése" disabled={exporting} onClick={handleExport}><FileDown size={19} /></button><button type="button" onClick={() => { goStep(step === 'summary' ? 'size' : 'summary'); setMobileControlsOpen(true) }}>{step === 'summary' ? 'Tovább tervezés' : 'Összegzés'}<ChevronRight size={16} /></button></div>
      {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button type="button" aria-label="Értesítés bezárása" onClick={() => setToast('')}><X size={16} /></button></div>}
      {modal === 'prices' && admin && <PriceSettingsDialog prices={prices} onChange={setPrices} onReset={() => { setPrices(tenant.prices); setToast('A gyártói árlista visszaállt.') }} onClose={() => setModal(null)} />}
      {modal === 'info' && <InfoDialog onClose={() => setModal(null)} />}
      {modal === 'budget' && <Suspense fallback={null}><BudgetDialog config={config} prices={prices} furniture={scene.furniture} currentGross={price.totalGross} onApply={(next) => { updateConfig(next); setModal(null); setToast('A terv a keretösszegedhez igazítva. Visszavonás: ↶') }} onClose={() => setModal(null)} /></Suspense>}
      {modal === 'advisor' && <Suspense fallback={null}><AdvisorDialog prices={prices} onApply={applyAdvice} onClose={() => setModal(null)} /></Suspense>}
      {modal === 'energy' && <Suspense fallback={null}><EnergyDialog config={config} prices={prices} usage={energyUsage} onUsageChange={setEnergyUsage} onConfigChange={updateConfig} onClose={() => setModal(null)} /></Suspense>}
      <input ref={photoInput} className="visually-hidden-input" type="file" accept={PHOTO_ACCEPT} tabIndex={-1} aria-hidden="true" onChange={(event) => { const file = event.target.files?.[0]; if (file) handlePhoto(file); event.target.value = '' }} />
      {modal === 'ar' && <Suspense fallback={null}><ArDialog shareUrl={buildArUrl(config)} onClose={() => setModal(null)} onPhoto={() => { if (scene.photoUrl) updateScene({ photoMode: true, sunStudy: false }); else openPhotoPicker() }} /></Suspense>}
      {modal === 'reset' && <ResetDialog onConfirm={() => { replaceConfig(tenant.defaultConfig); setScene((current) => ({ ...DEFAULT_SCENE, wallFinish: current.wallFinish, wallColor: current.wallColor, windowColor: current.windowColor })); setView('perspective'); setStep('size'); setToast('Az alapkonfiguráció visszaállt.') }} onClose={() => setModal(null)} />}
      {homeHref && (homeHref.startsWith('/') ? <Link className="studio-home-link" to={homeHref}>Kezdőlap</Link> : <a className="studio-home-link" href={homeHref} target="_top" rel="noreferrer">Kezdőlap</a>)}
    </div>
  )
}
