// Modulház nézet a konfigurátoron belül: ugyanaz az oldal és héj (fejléc, 3D, vezérlőpanel, árpanel), csak a középső
// modell a valós méretű típusház, a lépések és az ár a modulházé. A PergoStudio jeleníti meg, ha a „Mit építesz?”
// választóban a Modulház van kiválasztva. Saját mag: products/modularHouse.ts; 3D: ModularHouseScene.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Box, Check, ChevronRight, Download, Info, Link2, Maximize2, MoveUpRight, PanelRight, Ruler, SquareDashed, View, X } from 'lucide-react'
import { Link } from 'react-router'
import ModularHouseControls, { type ModularStep } from '@/components/ModularHouseControls'
import CatalogPricePanel from '@/components/CatalogPricePanel'
import ModularHouseScene, { type ModularSceneSettings, type ModularView } from '@/components/ModularHouseScene'
import LeadForm from '@/components/LeadForm'
import { AnimatedPrice, PriceDeltaPop } from '@/components/PricePanel'
import { ChangePill, SceneToolbar, StudioHeader, StudioViewSettings, WelcomeBack } from '@/components/studio/StudioChrome'
import { useChangePill, usePresentation, useSceneThumbnail } from '@/components/studio/studioState'
import PanelPrice from '@/components/studio/PanelPrice'
import { DEFAULT_STUDIO_TIME } from '@/lib/studioLighting'
import { useTenant } from '@/tenants/TenantContext'
import { createModularShareUrl, hasModularDraft, loadModularConfig, persistModularConfig } from '@/lib/modularHouse'
import { exportSpecPdf } from '@/lib/exportSpecPdf'
import { formatHuf, formatNumber } from '@/lib/pricing'
import { calculateModularPrice, MODULAR_DEFAULTS, MODULAR_LABELS, MODULAR_META, MODULAR_MODELS, MODULAR_NOT_INCLUDED, MODULAR_PRICE_DEFAULTS, modularSpecCode, modularSpecRows, type ModularHouseConfig } from '@/products/modularHouse'

const views: { id: ModularView; label: string; icon: typeof View }[] = [
  { id: 'perspective', label: 'Tér', icon: View }, { id: 'front', label: 'Homlokzat', icon: Maximize2 },
  { id: 'side', label: 'Oldal', icon: PanelRight }, { id: 'top', label: 'Felülről', icon: SquareDashed },
]
const changeLabels: Record<keyof ModularHouseConfig, string> = { model: 'Típus', finish: 'Kivitel', use: 'Felhasználás (ÁFA)', facade: 'Homlokzat', joinery: 'Nyílászárók', roof: 'Tető' }
const NOTES = [
  'Tájékoztató kalkuláció, nem ajánlattétel. Az m²-ár a gyártó nyilvános adatlapjáról való; az árazott alapterület (bruttó vagy nettó) a gyártóval egyeztetendő.',
  `Az irányár nem tartalmazza: ${MODULAR_NOT_INCLUDED.join(', ').toLowerCase()}.`,
  'Az ÁFA mértéke a felhasználástól függ (családi házként a gyártó tájékoztatása szerint 5%); a jogosultságot szakember ellenőrizze.',
  'A 3D modell az alaprajz méretei szerint készült; a magasságok és a tetőhajlás becsültek.',
]

export default function ModularWorkspace({ typePicker }: { /** A „Mit építesz?” választó (innen lehet visszaváltani pergolára). */ typePicker: ReactNode }) {
  const { homeHref } = useTenant()
  const [config, setConfig] = useState<ModularHouseConfig>(loadModularConfig)
  const [scene, setScene] = useState<ModularSceneSettings>({ time: DEFAULT_STUDIO_TIME, showPerson: false, dimensions: true, environment: true, autoRotate: false })
  const [presentation, setPresentation] = usePresentation()
  // Mint a pergolánál: alul egy élő ár, a teljes kalkuláció a „Részletek” gombra nyílik a panel mellett.
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [change, announceChange, clearChange] = useChangePill()
  const [welcomeBack, setWelcomeBack] = useState(() => hasModularDraft(config))
  const [view, setView] = useState<ModularView>('perspective')
  const [step, setStep] = useState<ModularStep>('model')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState('')
  const [delta, setDelta] = useState<{ amount: number; label: string } | null>(null)
  const history = useRef<{ past: ModularHouseConfig[]; future: ModularHouseConfig[] }>({ past: [], future: [] })
  const price = useMemo(() => calculateModularPrice(config, MODULAR_PRICE_DEFAULTS), [config])
  const model = MODULAR_MODELS[config.model]

  useEffect(() => persistModularConfig(config), [config])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3600); return () => window.clearTimeout(timer) }, [toast])

  const update = useCallback((patch: Partial<ModularHouseConfig>) => {
    const next = { ...config, ...patch }
    if (JSON.stringify(next) === JSON.stringify(config)) return
    const changed = (Object.keys(patch) as (keyof ModularHouseConfig)[]).find((key) => patch[key] !== config[key])
    const nextPrice = calculateModularPrice(next, MODULAR_PRICE_DEFAULTS)
    const label = changed ? changeLabels[changed] : 'Beállítás'
    setDelta({ amount: nextPrice.totalGross - price.totalGross, label })
    announceChange(nextPrice.totalGross - price.totalGross, label)
    setWelcomeBack(false)
    history.current.past.push(config); history.current.past = history.current.past.slice(-40); history.current.future = []
    setConfig(next)
  }, [config, price.totalGross, announceChange])
  const undo = useCallback(() => setConfig((current) => { const previous = history.current.past.pop(); if (!previous) return current; history.current.future.push(current); return previous }), [])
  const redo = useCallback(() => setConfig((current) => { const next = history.current.future.pop(); if (!next) return current; history.current.past.push(current); return next }), [])
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return; const target = event.target as HTMLElement; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return; event.preventDefault(); if (event.shiftKey) redo(); else undo() }
    window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener)
  }, [undo, redo])

  const share = async () => {
    const url = createModularShareUrl(config); window.history.replaceState(null, '', url)
    try { await navigator.clipboard.writeText(url); setToast('Megosztható hivatkozás a vágólapra másolva.') } catch { setToast('A hivatkozás a címsorban másolható.') }
  }
  const exportPdf = async () => {
    setExporting(true)
    try {
      await exportSpecPdf({ family: MODULAR_META.name, title: model.title, code: modularSpecCode(config), rows: modularSpecRows(config, price).filter(([label]) => label !== 'Termék'), price, notes: NOTES, installationLabel: null })
      setToast('A műszaki PDF elkészült.')
    } catch { setToast('A PDF nem készült el. Próbáld újra.') } finally { setExporting(false) }
  }
  const fresh = () => { history.current.past.push(config); history.current.future = []; setConfig({ ...MODULAR_DEFAULTS }); setDelta(null); setStep('model') }
  const reset = () => { if (!window.confirm('Visszaállítod a modulházat az alapkonfigurációra?')) return; fresh(); setToast('Az alapkonfiguráció visszaállt.') }

  const specs = modularSpecRows(config, price).filter(([label]) => label !== 'Termék' && label !== 'Konfigurációs kód')
  const thumbnail = useSceneThumbnail(step === 'summary', config)
  const headline = `${model.title} · bruttó ${formatNumber(model.grossArea)} m²`
  const summary = <div className="summary-panel catalog-summary">
    <div className="summary-hero"><div className="summary-thumbnail">{thumbnail ? <img src={thumbnail} alt="A konfigurált modulház képe" /> : <div className="thumbnail-placeholder"><Box size={24} /><span>{model.title}</span></div>}</div><div><span>ÉLŐ KONFIGURÁCIÓ</span><h3>{model.title}</h3><p>{MODULAR_LABELS.finish[config.finish]}</p><strong>{formatHuf(price.totalGross)}</strong><small>bruttó irányár, {MODULAR_LABELS.use[config.use].toLowerCase()}</small></div></div>
    <div className="summary-actions"><button type="button" onClick={exportPdf} disabled={exporting}><Download size={14} />{exporting ? 'Készül…' : 'PDF'}</button><button type="button" onClick={share}><Link2 size={14} />Megosztás</button></div>
    <section className="summary-section"><div className="summary-section-title"><Ruler size={15} /><h3>Műszaki összefoglaló</h3></div><div className="spec-code"><span>SPEC-KÓD</span><strong>{modularSpecCode(config)}</strong></div><dl className="bom-list">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <section className="summary-section"><div className="summary-section-title"><Info size={15} /><h3>Nincs benne az irányárban</h3></div><ul className="summary-notes">{MODULAR_NOT_INCLUDED.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <section className="summary-section lead-section"><div className="summary-section-title"><MoveUpRight size={15} /><h3>Ajánlatkérés</h3></div><LeadForm productFamily="modular-house" config={config} estimateNet={price.totalNet} estimateGross={price.totalGross} /></section>
    <div className="summary-footnote"><Info size={14} /><span>A piszkozat a böngésződben marad. Csak az űrlap elküldésekor jön létre valós, adatbázisban rögzített projekt.</span></div>
  </div>

  return <div className={`app-shell layout-a modular-mode ${presentation ? 'presentation-mode' : ''} ${detailsOpen ? 'details-open' : ''}`}>
    <StudioHeader onHome={() => setView('perspective')} canUndo={history.current.past.length > 0} canRedo={history.current.future.length > 0} onUndo={undo} onRedo={redo} presentation={presentation} onPresentation={() => setPresentation(!presentation)} onReset={reset} />
    <main className="studio-shell">
      <section className="viewer-panel" aria-label="Modulház 3D előnézet"><ModularHouseScene config={config} scene={scene} view={view} />
        <div className="viewer-heading"><span>ÉLŐ ÉPÍTÉSZETI JELENET</span><h1><span className="kinetic" key={config.model}>{model.name}</span> <i>/</i> <span className="kinetic">{formatNumber(model.grossArea)}</span><small> m²</small></h1><p>{model.title} · {formatNumber(model.footprint.width, 2)} × {formatNumber(model.footprint.depth, 2)} m</p></div>
        <SceneToolbar time={scene.time} onTimeChange={(time) => setScene((current) => ({ ...current, time }))} viewPanel={<StudioViewSettings view={scene} productName="a ház" onChange={(patch) => setScene((current) => ({ ...current, ...patch }))} />} presentation={presentation} onPresentation={() => setPresentation(!presentation)} onExport={exportPdf} onShare={share} />
        <div className="camera-toolbar" aria-label="Kamera nézetek">{views.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={view === id ? 'selected' : ''} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span></button>)}</div>
        <div className="viewer-footer"><span>1 egység = 1 méter</span><span>bruttó {formatNumber(model.grossArea)} m² · nettó {formatNumber(model.netArea)} m²</span></div>
        {welcomeBack && !presentation && <WelcomeBack summary={`${headline} · ${formatHuf(price.totalGross)}`} onContinue={() => setWelcomeBack(false)} onFresh={() => { fresh(); setWelcomeBack(false) }} />}
        {!presentation && <ChangePill change={change} onUndo={() => { undo(); clearChange() }} />}
        {presentation && <div className="presentation-note"><span>ÜGYFÉL-BEMUTATÓ</span><strong>{headline}</strong><small>Húzd a jelenetet a forgatáshoz · ESC a szerkesztéshez</small></div>}
      </section>
      <ModularHouseControls config={config} step={step} summary={summary} typePicker={typePicker} footer={<PanelPrice gross={price.totalGross} detailsOpen={detailsOpen} onToggleDetails={() => setDetailsOpen((open) => !open)} />} mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(!mobileOpen)} onStep={setStep} onChange={update} />
      <CatalogPricePanel collapsed={!detailsOpen} onToggleCollapse={() => setDetailsOpen((open) => !open)} heading={{ eyebrow: MODULAR_LABELS.finish[config.finish], title: model.title, measure: `${formatNumber(price.area)} m² × ${formatHuf(MODULAR_PRICE_DEFAULTS.perM2Net[config.model])} / m² nettó` }} price={price} exporting={exporting} delta={delta} onExport={exportPdf} onShare={share}
        installation={null} totalNote="A gyártó m²-árából · nem ajánlattétel" disclaimer={`Tájékoztató irányár. Nincs benne: ${MODULAR_NOT_INCLUDED.slice(0, 4).join(', ').toLowerCase()}.`} />
    </main>
    <div className="mobile-price-bar"><div><span>Bruttó irányár</span><strong data-value={price.totalGross}><AnimatedPrice value={price.totalGross} /></strong><PriceDeltaPop value={price.totalGross} /></div><button type="button" onClick={() => { setStep(step === 'summary' ? 'model' : 'summary'); setMobileOpen(true) }}>{step === 'summary' ? 'Tovább tervezés' : 'Összegzés'}<ChevronRight size={16} /></button></div>
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button type="button" aria-label="Értesítés bezárása" onClick={() => setToast('')}><X size={16} /></button></div>}
    {homeHref && (homeHref.startsWith('/') ? <Link className="studio-home-link" to={homeHref}>Kezdőlap</Link> : <a className="studio-home-link" href={homeHref} target="_top" rel="noreferrer">Kezdőlap</a>)}
  </div>
}
