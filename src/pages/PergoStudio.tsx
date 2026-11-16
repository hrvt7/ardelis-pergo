import { SCENE_READY_EVENT, sceneEvent, stepEvent } from '@/lib/funnelEvents'
import IntroSceneGate from '@/components/IntroSceneGate'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Armchair, Cog, Box, Footprints, ImagePlus, Check, ChevronRight, CloudRain, Gauge, Image, Layers, Maximize2, Rotate3d, Scan, ShieldCheck, SunMedium, View, Wallet, WandSparkles, X } from 'lucide-react'
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
import { createShareUrl, DEFAULT_SCENE, hasStoredDraft, loadInitialConfig, loadPrices, persistConfig, persistPrices, productDefaultConfig } from '@/lib/config'
import { calculatePrice, formatPrice } from '@/lib/pricing'
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
import { BuildingPicker, type ModularChoice } from '@/components/BuildingControls'
import { offersModularHouse } from '@/products'
import { MODULAR_PRICE_DEFAULTS } from '@/products/modularHouse'
import { MODULAR_VIEWS, useModularStudio } from '@/components/useModularStudio'
import { preloadModularHouse } from '@/lib/modularHouse'
import { ChangePill, SceneToolbar, StudioHeader, StudioViewSettings, WelcomeBack, type ToolItem } from '@/components/studio/StudioChrome'
import { usePresentation } from '@/components/studio/studioState'
import PanelPrice from '@/components/studio/PanelPrice'
import CameraViewMenu from '@/components/studio/CameraViewMenu'
import WalkOverlay from '@/components/studio/WalkOverlay'
import { buildWalkArea } from '@/lib/walkArea'
import { glassViewShiftX, resolveUiStyle, studioInitialTime, UI_STYLE_KEY, usesCyclorama, type UiStyle } from '@/lib/uiStyle'
import { cameraViewsFor } from '@/lib/cameraViews'
import { mobileBarAction } from '@/lib/configSteps'
import { DEFAULT_USAGE, energyCostSupported, estimateEnergy, roundCost, type EnergyUsage } from '@/lib/energy'
import type { FurnitureSet } from '@/types/pergola'

const timeForSun = (elevation: number): SceneSettings['time'] => (elevation < -4 ? 'night' : elevation < 12 ? 'sunset' : 'day')
const timeForClock = (hour: number): SceneSettings['time'] => (hour >= 20 || hour < 7 ? 'night' : hour >= 17 ? 'sunset' : 'day')

const ArDialog = lazy(() => import('@/components/ArDialog'))
const SunStudyPanel = lazy(() => import('@/components/SunStudyPanel'))
import MechanismPanel from '@/components/MechanismPanel'
import { LANDSCAPE_PHONE_QUERY, SHEET_LAYOUT_QUERY } from '@/lib/viewport'
import { clampPanelWidth, defaultPanelWidth, PANEL_WIDTH_KEY, panelWidthRange, readStoredWidths, writeStoredWidths, type PanelLayout } from '@/lib/panelResize'
import PanelResizer from '@/components/studio/PanelResizer'
import { localized, tr } from '../i18n/locale'
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

const CAMERA_ICONS: Partial<Record<CameraView, typeof View>> = { perspective: View, interior: Maximize2, top: Box, detail: Scan, sofa: Armchair }

/** Folyamatosan húzható mezők: gyors egymásutánjuk egy visszavonási lépés. */
const CONTINUOUS_KEYS = new Set(['width', 'depth', 'height', 'pitch'])
const CHANGE_LABELS: Record<string, string> = localized(() => ({
  width: tr('Szélesség', 'Breite'), depth: tr('Mélység', 'Tiefe'), height: tr('Magasság', 'Höhe'), mount: tr('Rögzítés', 'Montage'), roof: tr('Tetőrendszer', 'Dachsystem'), frameColor: tr('Szerkezetszín', 'Konstruktionsfarbe'), customRal: tr('Egyedi szín', 'Sonderfarbe'), roofColor: tr('Tető / lamellák színe', 'Farbe Dach / Lamellen'), roofRal: tr('Tető / lamellák színe', 'Farbe Dach / Lamellen'), sides: tr('Oldalkialakítás', 'Seitengestaltung'), louverAngle: tr('Lamellaszög', 'Lamellenwinkel'), screenOpen: tr('ZIP nyitottság', 'ZIP-Öffnung'), led: tr('Periméter LED', 'Umlaufende LED'), heaters: tr('Teraszfűtés', 'Terrassenheizung'), speakers: 'Hangrendszer', sensors: 'Szenzorcsomag', solar: tr('Napelemes tető', 'Photovoltaik-Dach'), split: 'Osztott oldal', ledRgb: tr('Színváltós LED', 'Farbwechsel-LED'), fans: tr('Mennyezeti ventilátor', 'Deckenventilator'), smartHome: tr('Okosotthon-vezérlés', 'Smart-Home-Steuerung'), roofShade: tr('Tetőárnyékoló', 'Dachbeschattung'), shadeFabric: tr('Árnyékoló színe', 'Farbe der Beschattung')
}))

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
  usePageSeo(product === 'carport' ? '/konfigurator/carport' : '/konfigurator', { noindex: embed || !tenant.demo, title: tenant.demo ? undefined : `${tenant.brand.name} · ${product === 'carport' ? 'Carport' : 'Pergola'} ${tr('konfigurátor', 'Konfigurator')}` })
  const [config, setConfig] = useState<PergolaConfig>(() => loadInitialConfig(tenant, product))
  // Visszatérő látogató: ha piszkozatból (nem linkből) indultunk, és az nem az alapterv, felajánljuk a folytatást.
  const [welcomeBack, setWelcomeBack] = useState(() => !window.location.hash && JSON.stringify(config) !== JSON.stringify(normalizeConfig(tenant, productDefaultConfig(tenant, product))) && hasStoredDraft(tenant, product))
  const projectKey = `pergo-project-name:${tenant.id}`
  const [projectName, setProjectName] = useState(() => { try { return localStorage.getItem(projectKey) ?? '' } catch { return '' } })
  useEffect(() => { try { localStorage.setItem(projectKey, projectName) } catch { /* privát mód */ } }, [projectKey, projectName])
  const [prices, setPrices] = useState<PriceSettings>(() => loadPrices(tenant, admin))
  // A ház kinézete (homlokzat, nyílászárók) a böngészőben megmarad: a vásárló háza nem változik két látogatás között.
  const [scene, setScene] = useState<SceneSettings>(() => {
    let style: UiStyle = 'soft'
    try { style = resolveUiStyle(window.location.search, localStorage.getItem(UI_STYLE_KEY)) } catch { style = resolveUiStyle(window.location.search, null) }
    return { ...DEFAULT_SCENE, ...(studioInitialTime(style) ?? {}), ...loadHouseLook(tenant.id) }
  })
  useEffect(() => { saveHouseLook(tenant.id, scene) }, [tenant.id, scene.houseStyle, scene.wallFinish, scene.wallColor, scene.windowColor]) // eslint-disable-line react-hooks/exhaustive-deps
  // Modulház: ugyanazon a felületen, a „Mit építesz?” választóból; a középső modell, a lépések és az ár a modulházé.
  // A `#h=` megosztó link modulház nézetben nyit; egyébként a legutóbbi választás marad meg (gyártónként).
  const modularKey = `lamelix-studio-kind:${tenant.id}`
  const modularOffered = product === 'pergola' && offersModularHouse(tenant)
  const [modularMode, setModularMode] = useState(() => {
    if (!modularOffered) return false
    if (window.location.hash) return window.location.hash.startsWith('#h=')
    try { return localStorage.getItem(modularKey) === 'modular' } catch { return false }
  })
  useEffect(() => { if (modularOffered) { try { localStorage.setItem(modularKey, modularMode ? 'modular' : 'frame') } catch { /* privát mód */ } } }, [modularKey, modularMode, modularOffered])
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
  // Modulház: ugyanaz a vászon és panel, csak a modell, a lépések és az ár cserélődik (nincs újratöltés).
  const modular = useModularStudio({ active: modularMode, notify: setToast })
  useEffect(() => { if (modularOffered) preloadModularHouse(modular.config) }, [modularOffered, modular.config])
  const [exporting, setExporting] = useState(false)
  // Egyszer megmutatjuk, hogyan mozgatható a jelenet (telefonon és laptopon más a mozdulat): az első húzásnál (vagy 7 mp után) eltűnik, és nem jön vissza.
  const coarsePointer = useMemo(() => { try { return window.matchMedia('(pointer: coarse)').matches } catch { return false } }, [])
  // Az asztali tipp új (jobb gombos mozgatás): saját kulccsal, hogy aki a régit már látta, ezt egyszer még megkapja.
  const hintKey = coarsePointer ? 'pergo-rotate-hint' : 'pergo-rotate-hint-desktop-2'
  const [rotateHint, setRotateHint] = useState(() => { try { return localStorage.getItem(hintKey) !== '1' } catch { return false } })
  useEffect(() => {
    if (!rotateHint) return
    const done = () => { setRotateHint(false); try { localStorage.setItem(hintKey, '1') } catch { /* privát mód */ } }
    const canvas = document.querySelector('.scene-canvas-wrap')
    canvas?.addEventListener('pointerdown', done, { once: true })
    // Az időzítő csak a kész jelenettől indul (a töltőképernyő alatt a tipp nem látszik, lásd CSS).
    let timer = 0
    const arm = () => { if (!timer && canvas?.getAttribute('data-scene-ready') === 'true') timer = window.setTimeout(done, 7000) }
    arm()
    const observer = canvas ? new MutationObserver(arm) : null
    if (canvas) observer?.observe(canvas, { attributes: true, attributeFilter: ['data-scene-ready'] })
    return () => { canvas?.removeEventListener('pointerdown', done); observer?.disconnect(); window.clearTimeout(timer) }
  }, [rotateHint, hintKey])
  const [presentation, setPresentation] = usePresentation()
  const [delta, setDelta] = useState<{ amount: number; label: string } | null>(null)
  // Kontextus-kamera, változás-jelző és rezgés.
  const [focus, setFocus] = useState<CameraFocus | null>(null)
  const focusSeq = useRef(0)
  const [change, setChange] = useState<{ id: number; amount: number; label: string } | null>(null)
  const lastBuzz = useRef(0)
  const eveningShown = useRef(false)
  const sceneRef = useRef<SceneSettings>(DEFAULT_SCENE)
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia(SHEET_LAYOUT_QUERY).matches)
  useEffect(() => { const query = window.matchMedia(SHEET_LAYOUT_QUERY); const update = () => setIsNarrow(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update) }, [])
  // Telefon fekvő nézetben a vezérlők állandóan nyitott oldalsávban vannak (nincs alsó lap).
  const [landscapePhone, setLandscapePhone] = useState(() => window.matchMedia(LANDSCAPE_PHONE_QUERY).matches)
  useEffect(() => { const query = window.matchMedia(LANDSCAPE_PHONE_QUERY); const update = () => setLandscapePhone(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update) }, [])
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
  const price = useMemo(() => calculatePrice(config, prices, ROOF_LABELS, tenant.currency), [config, prices, ROOF_LABELS, tenant.currency])
  const [energyUsage, setEnergyUsage] = useState<EnergyUsage>(DEFAULT_USAGE)
  const energy = useMemo(() => estimateEnergy(config, energyUsage, tenant.energy?.heaterWatts), [config, energyUsage, tenant])
  const energySupported = energyCostSupported(tenant.currency)
  const energyCost = energySupported && energy.hasElectrics ? roundCost(energy.cost) : null
  const openEnergy = energySupported ? () => setModal('energy') : undefined

  useEffect(() => persistConfig(tenant, config, product), [tenant, config, product])
  // Névtelen konverziómérés: megnyitás és az első érdemi módosítás (csak vásárlói nézetben).
  const firstConfig = useRef(config)
  useEffect(() => { if (!admin) { track(tenant.id, 'open'); startEngagement(tenant.id) } }, [tenant.id, admin])
  // A lead-pontozáshoz: melyik lépéseket járta be (csak a böngészőben gyűlik, a kérelemmel megy ki).
  useEffect(() => { noteStep(tenant.id, step) }, [tenant.id, step])
  useEffect(() => { if (!admin && config !== firstConfig.current) track(tenant.id, 'configure') }, [tenant.id, admin, config])
  // Lépésenkénti lemorzsolódás és betöltési idő mérése (névtelen, munkamenetenként egyszer; audit: mérőszámok).
  useEffect(() => { const name = stepEvent(step); if (!admin && name) track(tenant.id, name) }, [tenant.id, admin, step])
  useEffect(() => {
    if (admin) return
    const onReady = (event: Event) => track(tenant.id, sceneEvent(Number((event as CustomEvent<number>).detail) || 0))
    window.addEventListener(SCENE_READY_EVENT, onReady)
    return () => window.removeEventListener(SCENE_READY_EVENT, onReady)
  }, [tenant.id, admin])
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

  const focusSide = useCallback((side: SideKey) => setFocus({ id: ++focusSeq.current, kind: 'side', side }), [])
  /** Vissza az áttekintő nézetbe — akkor is, ha a kamera épp egy oldalra fókuszált. */
  const overview = useCallback(() => { setView('perspective'); setFocus({ id: ++focusSeq.current, kind: 'overview' }) }, [])
  /** Mit mutasson a kamera egy módosítás után (csak ha az automatikus kamera be van kapcsolva). */
  const reactToChange = useCallback((before: PergolaConfig, after: PergolaConfig) => {
    const current = sceneRef.current
    if (!current.autoCamera || current.photoMode || current.sunStudy) return
    const sides = (['front', 'back', 'left', 'right'] as SideKey[]).find((side) => before.sides[side] !== after.sides[side] || before.split?.[side] !== after.split?.[side])
    if (sides) { setView('perspective'); focusSide(sides); return }
    // Ventilátor: alulnézet a tető alá — akkor is odarepül, ha már alulnézetben voltunk, de közben elforgatták a képet.
    if ((after.fans ?? 0) > (before.fans ?? 0)) { setView('interior'); setFocus({ id: ++focusSeq.current, kind: 'overview' }); return }
    // Új tetőárnyékoló: kihúzva, áttekintő nézetből mutatjuk (alulról a kameragombsorral nézhető).
    if (after.roofShade && after.roofShade !== before.roofShade) { setScene((value) => ({ ...value, shadeOut: 100 })); overview(); return }
    if (before.frameColor !== after.frameColor || before.customRal !== after.customRal || before.roofColor !== after.roofColor || before.roofRal !== after.roofRal) { overview(); return }
    if (before.mount !== after.mount || before.roof !== after.roof) overview()
    const lightsOn = (!before.led && after.led) || (!before.ledRgb && after.ledRgb) || (before.heaters === 0 && after.heaters > 0)
    if (lightsOn && !eveningShown.current && current.time !== 'night') {
      eveningShown.current = true
      setScene((value) => ({ ...value, time: 'night', dayTime: 21.5 }))
      setToast(tr('Esti nézetre váltottunk, hogy lásd a fényeket. Nappalra a felső sávban válthatsz vissza.', 'Wir haben auf Abend umgeschaltet, damit Sie das Licht sehen. Oben können Sie zurück auf Tag schalten.'))
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
    const nextPrice = calculatePrice(next, prices, ROOF_LABELS, tenant.currency)
    // Az összetartozó mezők (szín + kód) egy módosításnak számítanak.
    const PAIRED: Record<string, string> = { customRal: 'frameColor', roofRal: 'roofColor', ledRgb: 'led', shadeFabric: 'roofShade' }
    const changedKeys = [...new Set(Object.keys(nextOrPatch).filter((key) => key !== 'louverAngle' && key !== 'screenOpen' && JSON.stringify((next as unknown as Record<string, unknown>)[key]) !== JSON.stringify((config as unknown as Record<string, unknown>)[key])).map((key) => (PAIRED[key] && key in nextOrPatch && PAIRED[key] in nextOrPatch ? PAIRED[key] : key)))]
    const changed = changedKeys[0]
    const label = changedKeys.length > 1 ? tr('Több módosítás', 'Mehrere Änderungen') : changed ? CHANGE_LABELS[changed] ?? tr('Konfiguráció', 'Konfiguration') : tr('Beállítás', 'Einstellung')
    setDelta({ amount: nextPrice.totalGross - price.totalGross, label })
    setChange({ id: Date.now(), amount: nextPrice.totalGross - price.totalGross, label })
    // Finom visszajelzés érintőképernyőn (csúszka húzásakor ritkítva).
    const now = performance.now()
    if (now - lastBuzz.current > 260 && typeof navigator.vibrate === 'function' && window.matchMedia('(pointer: coarse)').matches) { lastBuzz.current = now; try { navigator.vibrate(8) } catch { /* nem támogatott */ } }
    // Teljes terv betöltésekor (csomag, tanácsadó, alaphelyzet) csak áttekintő nézet: az egyes módosításokhoz kötött
    // reakciók (oldalra fókusz, esti nézet a LED-hez) itt félrevezetők lennének.
    if (replace) { const current = sceneRef.current; if (current.autoCamera && !current.photoMode && !current.sunStudy) overview() }
    else reactToChange(config, next)
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
  }, [config, price.totalGross, prices, tenant, ROOF_LABELS, reactToChange, overview])

  const updateConfig = useCallback((patch: Partial<PergolaConfig>) => applyConfig(patch), [applyConfig])
  const replaceConfig = useCallback((next: PergolaConfig) => applyConfig(next, true), [applyConfig])
  const updateScene = useCallback((patch: Partial<SceneSettings>) => {
    // A ház kinézetének módosításakor a kamera az áttekintő nézetbe áll, hogy a ház és a pergola együtt látsszon.
    const current = sceneRef.current
    if (('houseStyle' in patch || 'wallFinish' in patch || 'wallColor' in patch || 'windowColor' in patch) && current.autoCamera && !current.photoMode && !current.sunStudy) overview()
    setScene((value) => ({ ...value, ...patch }))
  }, [overview])

  // Csak fejlesztői szerveren: a nyitóoldal képsorozatának rögzítéséhez (képkockánként vezérelt konfigurátor). Élesben nincs.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__lxCapture = { setConfig: updateConfig, setScene: updateScene, setPresentation }
    return () => { delete w.__lxCapture }
  }, [updateConfig, updateScene, setPresentation])
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
    if (next === 'color' || next === 'size' || next === 'mount' || next === 'roof' || next === 'extras') overview()
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
  const applyAdvice = useCallback((next: PergolaConfig, furniture: FurnitureSet) => { replaceConfig(next); setScene((current) => ({ ...current, furniture })); setView('perspective'); setStep('size'); setModal(null); setToast(tr('A javasolt pergola betöltve. Innen minden szabadon módosítható; visszavonás: ↶', 'Die vorgeschlagene Pergola ist geladen. Alles ist frei änderbar; rückgängig: ↶')) }, [replaceConfig])
  // Az élő ár a panel alján; a részletes kalkuláció csak kérésre nyílik (ne takarja a 3D-t).
  const [detailsOpen, setDetailsOpen] = useState(false)
  useEffect(() => {
    if (!detailsOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetailsOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [detailsOpen])
  // Felületi stílus: ?style=glass (üveges panelek a 3D fölött) vagy a jelenlegi; a választást a böngésző megjegyzi.
  const [uiStyle] = useState(() => { try { return resolveUiStyle(window.location.search, localStorage.getItem(UI_STYLE_KEY)) } catch { return resolveUiStyle(window.location.search, null) } })
  useEffect(() => { try { if (new URLSearchParams(window.location.search).has('style')) localStorage.setItem(UI_STYLE_KEY, uiStyle) } catch { /* privát mód */ } }, [uiStyle])
  // A body-ba portált ablakok (fotós színválasztó) is a világos felületet kapják.
  useEffect(() => { document.body.classList.toggle('ui-light', uiStyle === 'light'); return () => { document.body.classList.remove('ui-light') } }, [uiStyle])
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  useEffect(() => { const update = () => setViewportWidth(window.innerWidth); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update) }, [])
  // Húzással állítható panelszélesség (asztalon és fekvő telefonon); álló telefonon alsó lap van, ott nincs.
  const panelLayout: PanelLayout | null = landscapePhone ? 'landscape-phone' : isNarrow ? null : 'desktop'
  const [storedWidths, setStoredWidths] = useState(() => { try { return readStoredWidths(localStorage.getItem(PANEL_WIDTH_KEY)) } catch { return {} } })
  const panelWidth = panelLayout ? clampPanelWidth(storedWidths[panelLayout] ?? defaultPanelWidth(panelLayout, viewportWidth), panelLayout, viewportWidth) : 0
  const panelRange = panelLayout ? panelWidthRange(panelLayout, viewportWidth) : { min: 0, max: 0 }
  const setPanelWidth = useCallback((width: number | null) => {
    if (!panelLayout) return
    setStoredWidths((current) => {
      const next = { ...current }
      if (width === null) delete next[panelLayout]
      else next[panelLayout] = clampPanelWidth(width, panelLayout, window.innerWidth)
      try { localStorage.setItem(PANEL_WIDTH_KEY, writeStoredWidths(next)) } catch { /* privát mód */ }
      return next
    })
  }, [panelLayout])
  const viewShiftX = uiStyle === 'glass' && !isNarrow ? glassViewShiftX(viewportWidth, viewportWidth, 12, panelWidth) : 0
  // Bejárás: első személyű nézet emberi szemmagasságban; a konfiguráció és a jelenet ugyanaz.
  const [walking, setWalking] = useState(false)
  const enterWalk = useCallback(() => {
    setPresentation(false)
    setDetailsOpen(false)
    setScene((current) => ({ ...current, photoMode: false, sunStudy: false, mechanism: false, exploded: false, autoRotate: false }))
    setView('perspective')
    if (isNarrow) setSheet('peek')
    setWalking(true)
  }, [isNarrow, setPresentation])
  const exitWalk = useCallback(() => { setWalking(false); overview() }, [overview])
  const walkRoofBlocked = useMemo(() => walking && buildWalkArea(config, { furniture: 'none', studio: true }).roofBlocked, [walking, config])
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
    // A tetőre koppintva a Tető lépés, egy oldalra koppintva az Oldalak lépés nyílik.
    setStep(side === 'roof' ? 'roof' : 'sides')
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
      if (key === 'y' || event.shiftKey) (modularMode ? modular.redo : redo)()
      else (modularMode ? modular.undo : undo)()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo, modularMode, modular.undo, modular.redo])

  const handleShare = async () => {
    const url = createShareUrl(config)
    // A címsorban csak a hash frissül (beágyazott nézetben az útvonal maradjon /embed/).
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${shareHash(config)}`)
    try { await copyShareUrl(url); setToast(tr('Megosztható hivatkozás a vágólapra másolva.', 'Teilbarer Link in die Zwischenablage kopiert.')) }
    catch { setToast(tr('A hivatkozás frissült a címsorban; onnan másolhatod.', 'Der Link wurde in der Adresszeile aktualisiert; dort können Sie ihn kopieren.')) }
    if (!admin) { track(tenant.id, 'share'); noteEngagement(tenant.id, 'share') }
  }
  const handleExport = async () => {
    setExporting(true)
    if (!admin) { track(tenant.id, 'pdf'); noteEngagement(tenant.id, 'pdf') }
    try { await exportPergolaPdf(config, price, tenant, ROOF_LABELS, createShareUrl(config), energyUsage, projectName.trim() || undefined, houseSummary(scene)); setToast(tr('A PDF-összefoglaló elkészült.', 'Die PDF-Zusammenfassung ist fertig.')) }
    catch (error) { console.error(error); setToast(tr('A PDF nem készült el. Próbáld újra, vagy frissítsd az oldalt.', 'Das PDF konnte nicht erstellt werden. Bitte erneut versuchen oder die Seite neu laden.')) }
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
      setToast(tr('Fotó mód: húzd a pergolát a helyére, majd állítsd a méretét és a forgatást. A kép nem hagyja el az eszközödet.', 'Fotomodus: Ziehen Sie die Pergola an ihren Platz, dann Größe und Drehung einstellen. Das Bild verlässt Ihr Gerät nicht.'))
    }
    probe.onerror = () => {
      URL.revokeObjectURL(url)
      setToast(tr('Ezt a képet a böngésző nem tudja megnyitni. Kérlek, JPG, PNG vagy WebP fotót válassz.', 'Dieses Bild kann der Browser nicht öffnen. Bitte ein JPG-, PNG- oder WebP-Foto wählen.'))
    }
    probe.src = url
  }
  const deleteUserPhoto = () => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current)
    photoUrl.current = null
    void deletePhoto(photoKey)
    clearPlacement(photoKey)
    setScene((current) => ({ ...current, ...DEFAULT_PLACEMENT, photoUrl: undefined, photoMode: false }))
    setToast(tr('A fotó törölve. Vissza a 3D jelenethez.', 'Foto gelöscht. Zurück zur 3D-Szene.'))
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
    setToast(`${tr('Konfiguráció ${slot} elmentve ebben a böngészőben.', 'Konfiguration ${slot} in diesem Browser gespeichert.')}`)
    if (!admin) noteEngagement(tenant.id, 'saved')
  }
  const summary = <SummaryPanel onFix={updateConfig} shareUrl={createShareUrl(config)} config={config} price={price} prices={prices} saved={saved} onSave={saveSlot} onLoad={replaceConfig} onNotify={setToast} onBudget={() => setModal('budget')} energyCost={energyCost} onEnergy={openEnergy} onExport={handleExport} exporting={exporting} projectName={projectName} onProjectName={setProjectName} house={houseSummary(scene)} />

  const modularChoice: ModularChoice | undefined = modularOffered ? {
    selected: modularMode,
    priceNote: `${formatPrice(MODULAR_PRICE_DEFAULTS.perM2Net.a45)} / m²`,
    onSelect: () => enterModular(),
  } : undefined
  // Visszaváltás pergolára / verandára / télikertre / carportra: a keretes konfiguráció ott folytatódik, ahol abbahagyták.
  const exitModular = (patch: Partial<PergolaConfig>) => {
    setModularMode(false)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
    if (Object.keys(patch).length) updateConfig(patch)
    setStep('size')
  }
  const enterModular = () => {
    setModularMode(true)
    modular.setStep('model')
    // A pergolához kötött jelenet-módok (fotó, árnyék, működés, eső, bejárás) a háznál nem értelmezettek.
    updateScene({ photoMode: false, sunStudy: false, mechanism: false, rain: false, exploded: false })
    if (walking) exitWalk()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
  }
  // Ár + következő lépés: telefonon és fekvő telefonon a beállítópanel saját alsó sora (nem külön, mindig látható sáv).
  const mobileBar = (
    <div className="mobile-price-bar"><div><span>{tr('Bruttó irányár', 'Richtpreis brutto')}</span><strong data-value={modularMode ? modular.price.totalGross : price.totalGross}><AnimatedPrice value={modularMode ? modular.price.totalGross : price.totalGross} /></strong><PriceDeltaPop value={modularMode ? modular.price.totalGross : price.totalGross} /></div><button type="button" onClick={() => {
        if (modularMode) { modular.setStep(modular.step === 'summary' ? 'model' : 'summary'); setSheet('full'); return }
        const action = mobileBarAction(step)
        if (action.kind === 'step') { goStep(action.step); setMobileControlsOpen(true); return }
        setSheet('full')
        window.setTimeout(() => document.querySelector('.lead-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 260)
      }}>{modularMode ? (modular.step === 'summary' ? tr('Tovább tervezés', 'Weiter planen') : tr('Összegzés', 'Übersicht')) : mobileBarAction(step).label}<ChevronRight size={16} /></button></div>
  )
  return (
    <div className={`app-shell layout-a ${modularMode ? '' : 'bar-in-panel'} ${presentation ? 'presentation-mode' : ''} ${detailsOpen ? 'details-open' : ''} ${walking ? 'walk-mode' : ''} ${uiStyle === 'glass' ? 'style-glass' : ''} ${uiStyle === 'studio' ? 'style-studio' : ''} ${uiStyle === 'light' ? 'style-light' : ''}`} style={panelLayout ? ({ '--panel-w': `${panelWidth}px`, '--side-w': `${panelWidth}px` } as CSSProperties) : undefined}>
      <StudioHeader onHome={() => (modularMode ? modular.setView('perspective') : setView('perspective'))} canUndo={modularMode ? modular.canUndo : history.current.past.length > 0} canRedo={modularMode ? modular.canRedo : history.current.future.length > 0} onUndo={modularMode ? modular.undo : undo} onRedo={modularMode ? modular.redo : redo} presentation={presentation} onPresentation={() => setPresentation(!presentation)} onInfo={() => setModal('info')} onReset={() => (modularMode ? (window.confirm('Visszaállítod a modulházat az alapkonfigurációra?') && modular.reset()) : setModal('reset'))} />

      <main className="studio-shell" id="top">
        <section className={`viewer-panel ${scene.photoMode ? 'photo-preview' : ''}`} aria-label={tr('3D előnézet', '3D-Vorschau')}>
          {scene.photoMode && scene.photoUrl && <img className="photo-backdrop" src={scene.photoUrl} alt={tr('A feltöltött teraszfotó háttere', 'Hintergrund aus dem hochgeladenen Terrassenfoto')} />}
          <IntroSceneGate><PergolaScene cyclorama={usesCyclorama(uiStyle)} cycloramaTone={uiStyle === 'light' ? 'light' : 'neutral'} config={config} scene={scene} view={view} focus={focus} viewShift={sheetView === 'half' && isNarrow && !landscapePhone ? 0.2 : 0} onSideSelect={walking || modularMode ? undefined : handleSideSelect} onSceneChange={updateScene} modular={modularMode ? { config: modular.config, view: modular.view, dimensions: scene.showDimensions } : null} onShade={setShade} walk={walking} viewShiftX={viewShiftX} /></IntroSceneGate>
          {walking && <WalkOverlay onExit={exitWalk} touch={coarsePointer || isNarrow} roofBlocked={walkRoofBlocked} />}
          {modularMode ? <div className="viewer-heading"><span>{tr('ÉLŐ ÉPÍTÉSZETI JELENET', 'LIVE-ARCHITEKTURSZENE')}</span><h1><span className="kinetic" key={modular.model.name}>{modular.model.name}</span> <i>/</i> <span className="kinetic">{modular.model.grossArea.toFixed(1).replace('.', ',')}</span><small> m²</small></h1><p>{modular.model.title} · {modular.model.footprint.width.toFixed(2).replace('.', ',')} × {modular.model.footprint.depth.toFixed(2).replace('.', ',')} m</p></div>
            : <div className="viewer-heading"><span>{scene.photoMode ? tr('SAJÁT TERASZ / ELŐNÉZET', 'EIGENE TERRASSE / VORSCHAU') : tr('ÉLŐ ÉPÍTÉSZETI JELENET', 'LIVE-ARCHITEKTURSZENE')}</span><h1><span className="kinetic" key={ROOF_LABELS[config.roof]}>{ROOF_LABELS[config.roof].split(' · ')[0]}</span> <i>/</i> <span className="kinetic" key={`w${config.width}`}>{config.width.toFixed(1).replace('.', ',')}</span><small> m</small></h1><p>{ROOF_LABELS[config.roof].split(' · ')[1]} · {config.depth.toFixed(1).replace('.', ',')} m {tr('mély', 'tief')}</p></div>}
          <div className="viewer-live"><i />{tr('VALÓS IDEJŰ 3D', 'ECHTZEIT-3D')}</div>
          <SceneToolbar leading={modularMode ? <CameraViewMenu views={MODULAR_VIEWS.map((item) => ({ ...item, icon: View }))} value={modular.view} onChange={modular.setView} /> : <CameraViewMenu views={cameraViewsFor(config.building === 'carport' ? 'carport' : product).map((item) => ({ ...item, icon: CAMERA_ICONS[item.id] ?? View }))} value={view} onChange={(id) => { setView(id); if (id === 'sofa' && scene.autoRotate) updateScene({ autoRotate: false }) }} />} time={scene.time} onTimeChange={(time) => updateScene({ time, dayTime: time === 'day' ? 13 : time === 'sunset' ? 18 : 22 })}
            viewPanel={modularMode ? <StudioViewSettings productName={tr('a ház', 'das Haus')} view={{ time: scene.time, environment: scene.ground !== 'studio', showPerson: Boolean(scene.showPerson), dimensions: scene.showDimensions, autoRotate: scene.autoRotate }} onChange={(patch) => updateScene({ ...(patch.time ? { time: patch.time, dayTime: patch.time === 'day' ? 13 : patch.time === 'sunset' ? 18 : 22 } : {}), ...(patch.environment !== undefined ? { ground: patch.environment ? 'terrace' : 'studio' } : {}), ...(patch.showPerson !== undefined ? { showPerson: patch.showPerson } : {}), ...(patch.dimensions !== undefined ? { showDimensions: patch.dimensions } : {}), ...(patch.autoRotate !== undefined ? { autoRotate: patch.autoRotate } : {}) })} /> : <SceneSettingsPanel config={config} scene={scene} prices={prices} onChange={updateConfig} onSceneChange={updateScene} onPhotoUpload={handlePhoto} />}
            quick={modularMode ? [] : [
              { id: 'walk', icon: Footprints, label: tr('Bejárás', 'Rundgang'), className: 'walk-launch', title: tr('Bejárás első személyű nézetben, emberi szemmagasságból', 'Rundgang in der Ich-Perspektive, auf Augenhöhe'), active: walking, run: () => (walking ? exitWalk() : enterWalk()) },
              { id: 'rain', icon: CloudRain, label: tr('Eső', 'Regen'), className: 'icon-rain', title: tr('Eső be- és kikapcsolása', 'Regen ein- und ausschalten'), active: scene.rain, run: () => updateScene({ rain: !scene.rain }) },
              ...(arHidden ? [] : [{ id: 'ar', icon: Rotate3d, label: 'AR', className: 'ar-launch icon-ar', title: arPath === 'desktop' ? tr('Nézd meg a kertedben valós méretben — telefonon (QR-kód)', 'In Originalgröße im eigenen Garten ansehen — am Handy (QR-Code)') : tr('Nézd meg valós méretben a saját kertedben (AR)', 'In Originalgröße im eigenen Garten ansehen (AR)'), run: () => { if (!admin) { track(tenant.id, 'ar'); noteEngagement(tenant.id, 'ar') } if (embed) window.open(buildArUrl(config), '_blank', 'noopener'); else setModal('ar') } }]),
            ]}
            toolsBusy={!modularMode && (scene.sunStudy || scene.photoMode || mechanismOn || scene.exploded)}
            tools={modularMode ? [] : ([
              { id: 'sun', icon: SunMedium, name: tr('Árnyékelemzés', 'Schattenanalyse'), note: tr('Valós napállás a saját helyszíneden, dátum és óra szerint', 'Realer Sonnenstand an Ihrem Standort, nach Datum und Uhrzeit'), active: scene.sunStudy, run: toggleSunStudy },
              { id: 'photo', icon: scene.photoUrl ? Image : ImagePlus, name: tr('Fotóba helyezés', 'Ins Foto setzen'), note: config.building === 'carport' ? (scene.photoUrl ? tr('A carport a saját udvarod fotóján', 'Der Carport auf dem Foto Ihres Hofs') : tr('Töltsd fel az udvarod fotóját, és helyezd rá a carportot', 'Laden Sie ein Foto Ihres Hofs hoch und platzieren Sie den Carport')) : (scene.photoUrl ? tr('A pergola a saját teraszod fotóján', 'Die Pergola auf dem Foto Ihrer Terrasse') : tr('Töltsd fel a teraszod fotóját, és helyezd rá a pergolát', 'Laden Sie ein Foto Ihrer Terrasse hoch und platzieren Sie die Pergola')), active: scene.photoMode, run: () => { if (!scene.photoUrl) openPhotoPicker(); else updateScene({ photoMode: !scene.photoMode, sunStudy: false }) } },
              ...(config.roof === 'louvered' ? [{ id: 'mechanism', icon: Cog, name: tr('Működés-bemutató', 'Funktionsvorführung'), note: tr('A lamellahajtás mozgásban, valós gyári adatokkal', 'Der Lamellenantrieb in Bewegung, mit realen Herstellerdaten'), active: mechanismOn, run: () => updateScene({ mechanism: !scene.mechanism, sunStudy: false, photoMode: false, exploded: false }) }] : []),
              { id: 'exploded', icon: Layers, name: tr('Robbantott nézet', 'Explosionsansicht'), note: tr('A szerkezet elemei szétválasztva', 'Die Bauteile auseinandergezogen'), active: scene.exploded, run: () => updateScene({ exploded: !scene.exploded, mechanism: false }) },
              { id: 'budget', icon: Wallet, name: tr('Költségkeret-tervező', 'Budgetplaner'), note: tr('Add meg a keretet, megmutatjuk, mi fér bele', 'Budget eingeben, wir zeigen, was hineinpasst'), active: false, run: () => setModal('budget') },
              { id: 'energy', icon: Gauge, name: energyCost ? `${tr('Üzemeltetés', 'Betrieb')} ≈ ${formatPrice(energyCost)} / ${tr('év', 'Jahr')}` : tr('Üzemeltetési költség', 'Betriebskosten'), note: tr('Áramköltség a valós lakossági tarifával', 'Stromkosten mit realem Haushaltstarif'), active: false, run: () => setModal('energy') },
              { id: 'advisor', icon: WandSparkles, name: tr('Tanácsadó', 'Berater'), note: tr('4 kérdés, és javaslunk egy hozzád illő kivitelt', '4 Fragen, und wir schlagen eine passende Ausführung vor'), active: false, run: () => setModal('advisor') },
            ] as ToolItem[]).filter(({ id }) => !(config.building === 'carport' && id === 'advisor') && !(id === 'energy' && !energySupported))}
            presentation={presentation} onPresentation={() => setPresentation(!presentation)} onExport={handleExport} onShare={handleShare} />
          {scene.rain && config.sensors && isMovableRoof(config.roof) && <div className="automation-status" role="status"><ShieldCheck size={16} /><span><strong>{tr('Esőautomata aktív', 'Regenautomatik aktiv')}</strong>{config.roof === 'retractable' ? tr('A tolótető biztonságos, zárt pozícióban.', 'Das Schiebedach ist sicher geschlossen.') : tr('A tetőlamellák biztonságos, zárt pozícióban.', 'Die Dachlamellen sind sicher geschlossen.')}</span></div>}
          {scene.time === 'night' && !modularMode && !scene.sunStudy && !mechanismOn && !moodHidden && !scene.photoMode && <Suspense fallback={null}><div className={`sun-panel-slot is-mood${scene.rain && config.sensors && isMovableRoof(config.roof) ? ' below-status' : ''}`}><MoodPanel config={config} scene={scene} prices={prices} onChange={updateConfig} onSceneChange={updateScene} onClose={() => setMoodHidden(true)} /></div></Suspense>}
          {mechanismOn && <Suspense fallback={null}><div className={`sun-panel-slot is-mechanism${scene.rain && config.sensors && isMovableRoof(config.roof) ? ' below-status' : ''}`}><MechanismPanel config={config} onClose={() => updateScene({ mechanism: false })} /></div></Suspense>}
          {scene.sunStudy && !scene.photoMode && <Suspense fallback={null}><div className={`sun-panel-slot${scene.rain && config.sensors && isMovableRoof(config.roof) ? ' below-status' : ''}`}><SunStudyPanel scene={scene} shade={shade} onChange={updateScene} onClose={toggleSunStudy} /></div></Suspense>}
          {!modularMode && view === 'sofa' && <div className="pov-note" role="status"><Armchair size={16} /><span><strong>{tr('Kanapé panoráma', 'Sofa-Panorama')}</strong>{tr('Húzd a képet a körbenézéshez · a nyilakkal is forgatható', 'Bild ziehen zum Umsehen · auch mit den Pfeiltasten drehbar')}</span></div>}
          {rotateHint && view !== 'sofa' && !scene.photoMode && !welcomeBack && <div className="pov-note rotate-hint" role="status"><Rotate3d size={16} /><span><strong>{tr('Húzd a forgatáshoz', 'Zum Drehen ziehen')}</strong>{coarsePointer ? tr('Két ujjal nagyíthatsz', 'Mit zwei Fingern zoomen') : tr('Jobb gombbal vagy két ujjas görgetéssel mozgatod · görgővel, csípéssel nagyítasz', 'Rechte Maustaste oder Zwei-Finger-Wischen verschiebt · Mausrad oder Pinch zoomt')}</span></div>}
          {presentation && modularMode && <div className="presentation-note"><span>{tr('ÜGYFÉL-BEMUTATÓ', 'KUNDENPRÄSENTATION')}</span><strong>{modular.model.title} · bruttó {modular.model.grossArea.toFixed(1).replace('.', ',')} m²</strong><small>{tr('Húzd a jelenetet a forgatáshoz · ESC a szerkesztéshez', 'Szene zum Drehen ziehen · ESC zum Bearbeiten')}</small></div>}
          {presentation && !modularMode && <div className="presentation-note"><span>{tr('ÜGYFÉL-BEMUTATÓ', 'KUNDENPRÄSENTATION')}</span><strong>{config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · {ROOF_LABELS[config.roof].split(' · ')[0]}</strong><small>{tr('Húzd a jelenetet a forgatáshoz · ESC a szerkesztéshez', 'Szene zum Drehen ziehen · ESC zum Bearbeiten')}</small></div>}
          {scene.photoMode ? <PhotoBar placement={{ photoX: scene.photoX, photoY: scene.photoY, photoScale: scene.photoScale, photoRotation: scene.photoRotation, photoTilt: scene.photoTilt, photoLens: scene.photoLens }} coarse={isNarrow || window.matchMedia('(pointer: coarse)').matches} onChange={(next) => updateScene(next)} onReset={() => updateScene({ ...DEFAULT_PLACEMENT })} onReplace={openPhotoPicker} onDelete={deleteUserPhoto} onDone={() => updateScene({ photoMode: false })} />
            : null}
          {welcomeBack && !modularMode && <WelcomeBack summary={`${config.width.toFixed(1).replace('.', ',')} × ${config.depth.toFixed(1).replace('.', ',')} m · ${formatPrice(price.totalGross)}`} onContinue={() => setWelcomeBack(false)} onFresh={() => { replaceConfig(productDefaultConfig(tenant, product)); setProjectName(''); setWelcomeBack(false); goStep('size') }} />}
          {!presentation && (modularMode ? <ChangePill change={modular.change} onUndo={() => { modular.undo(); modular.clearChange() }} /> : <ChangePill change={change} onUndo={() => { undo(); setChange(null) }} />)}
          <div className="viewer-footer"><span>{scene.photoMode ? tr('HELYI FOTÓS ELŐNÉZET', 'LOKALE FOTOVORSCHAU') : tr('1 egység = 1 méter', '1 Einheit = 1 Meter')}</span><span>{modularMode ? `bruttó ${modular.model.grossArea.toFixed(1).replace('.', ',')} m² · nettó ${modular.model.netArea.toFixed(1).replace('.', ',')} m²` : `${price.area.toFixed(1).replace('.', ',')} m²`}</span>{tenant.platformCredit !== false && <a className="platform-credit" href="/" target="_blank" rel="noopener" title={tr('3D konfigurátor: Lamelix', '3D-Konfigurator: Lamelix')}><LamelixLogo variant="symbol" tone="onDark" height={11} title={null} />Lamelix</a>}</div>
        </section>

        {panelLayout && !presentation && !walking && <PanelResizer width={panelWidth} min={panelRange.min} max={panelRange.max} onChange={setPanelWidth} onReset={() => setPanelWidth(null)} />}
        {modularMode && modularChoice ? <>
          {modular.controls({ typePicker: <BuildingPicker config={config} prices={prices} onChange={exitModular} modular={modularChoice} />, footer: <PanelPrice gross={modular.price.totalGross} detailsOpen={detailsOpen} onToggleDetails={() => setDetailsOpen((open) => !open)} />, mobileOpen: sheetView !== 'peek', onMobileToggle: () => setSheet(sheetView === 'peek' ? 'full' : 'peek') })}
          {modular.pricePanel({ detailsOpen, onToggle: () => setDetailsOpen((open) => !open) })}
        </> : <>
          <ConfiguratorControls mobileBar={mobileBar} modular={modularChoice} config={config} scene={scene} step={step} selectedSide={selectedSide} summary={summary} onStepChange={(next) => { goStep(next); if (isNarrow) setMobileControlsOpen(true) }} onSideSelect={selectSide} onChange={updateConfig} onSceneChange={updateScene} onPreset={replaceConfig} prices={prices} sheet={sheetView} onSheetChange={setSheet} onAdvisor={() => setModal('advisor')} energyCost={energyCost} onEnergy={openEnergy} footer={<PanelPrice gross={price.totalGross} detailsOpen={detailsOpen} onToggleDetails={() => setDetailsOpen((open) => !open)} />} />
          <PricePanel config={config} price={price} exporting={exporting} delta={delta} compact onEditPrices={admin ? () => setModal('prices') : undefined} onExport={handleExport} onShare={handleShare} onBudget={() => setModal('budget')} collapsed={!detailsOpen} onToggleCollapse={() => setDetailsOpen((open) => !open)} energyCost={energyCost} onEnergy={openEnergy} />
        </>}
      </main>

      {modularMode && mobileBar}
      {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button type="button" aria-label={tr('Értesítés bezárása', 'Hinweis schließen')} onClick={() => setToast('')}><X size={16} /></button></div>}
      {modal === 'prices' && admin && <PriceSettingsDialog prices={prices} onChange={setPrices} onReset={() => { setPrices(tenant.prices); setToast(tr('A gyártói árlista visszaállt.', 'Die Herstellerpreisliste wurde wiederhergestellt.')) }} onClose={() => setModal(null)} />}
      {modal === 'info' && <InfoDialog onClose={() => setModal(null)} />}
      {modal === 'budget' && <Suspense fallback={null}><BudgetDialog config={config} prices={prices} furniture={scene.furniture} currentGross={price.totalGross} onApply={(next) => { updateConfig(next); setModal(null); setToast(tr('A terv a keretösszegedhez igazítva. Visszavonás: ↶', 'Der Entwurf wurde an Ihr Budget angepasst. Rückgängig: ↶')) }} onClose={() => setModal(null)} /></Suspense>}
      {modal === 'advisor' && <Suspense fallback={null}><AdvisorDialog prices={prices} onApply={applyAdvice} onClose={() => setModal(null)} /></Suspense>}
      {modal === 'energy' && energySupported && <Suspense fallback={null}><EnergyDialog config={config} prices={prices} usage={energyUsage} onUsageChange={setEnergyUsage} onConfigChange={updateConfig} onClose={() => setModal(null)} /></Suspense>}
      <input ref={photoInput} className="visually-hidden-input" type="file" accept={PHOTO_ACCEPT} tabIndex={-1} aria-hidden="true" onChange={(event) => { const file = event.target.files?.[0]; if (file) handlePhoto(file); event.target.value = '' }} />
      {modal === 'ar' && <Suspense fallback={null}><ArDialog shareUrl={buildArUrl(config)} onClose={() => setModal(null)} onPhoto={() => { if (scene.photoUrl) updateScene({ photoMode: true, sunStudy: false }); else openPhotoPicker() }} /></Suspense>}
      {modal === 'reset' && <ResetDialog onConfirm={() => { replaceConfig(productDefaultConfig(tenant, product)); setScene((current) => ({ ...DEFAULT_SCENE, houseStyle: current.houseStyle, wallFinish: current.wallFinish, wallColor: current.wallColor, windowColor: current.windowColor })); setView('perspective'); setStep('size'); setToast(tr('Az alapkonfiguráció visszaállt.', 'Die Grundkonfiguration wurde wiederhergestellt.')) }} onClose={() => setModal(null)} />}
      {homeHref && <nav aria-label={tr('Vissza a kezdőlapra', 'Zurück zur Startseite')}>{homeHref.startsWith('/') ? <Link className="studio-home-link" to={homeHref}>{tr('Kezdőlap', 'Startseite')}</Link> : <a className="studio-home-link" href={homeHref} target="_top" rel="noreferrer">{tr('Kezdőlap', 'Startseite')}</a>}</nav>}
    </div>
  )
}
