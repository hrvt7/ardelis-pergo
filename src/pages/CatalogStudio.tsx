import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Check, ChevronRight, Download, Eye, EyeOff, Info, Link2, Maximize2, MoveUpRight, Ruler, Scan, Settings2, View, X } from 'lucide-react'
import { Link } from 'react-router'
import CatalogControls, { type CatalogStep } from '@/components/CatalogControls'
import CatalogPricePanel from '@/components/CatalogPricePanel'
import CatalogScene, { type CatalogSceneSettings, type CatalogView } from '@/components/CatalogScene'
import LeadForm from '@/components/LeadForm'
import { AnimatedPrice, PriceDeltaPop } from '@/components/PricePanel'
import OutdoorPriceDialog from '@/components/OutdoorPriceDialog'
import { ChangePill, SceneToolbar, StudioHeader, StudioViewSettings, WelcomeBack } from '@/components/studio/StudioChrome'
import { DEFAULT_STUDIO_TIME } from '@/lib/studioLighting'
import { useChangePill, usePriceCollapse, usePresentation, useSceneThumbnail } from '@/components/studio/studioState'
import { useTenant } from '@/tenants/TenantContext'
import { calculateOutdoorPrice, createOutdoorShareUrl, FAMILY_META, hasOutdoorDraft, LABELS, loadOutdoorConfig, loadOutdoorPrices, OUTDOOR_DEFAULTS, outdoorSpecCode, persistOutdoorConfig, persistOutdoorPrices } from '@/lib/catalog'
import { exportCatalogPdf } from '@/lib/exportCatalogPdf'
import { formatHuf, formatNumber } from '@/lib/pricing'
import type { OutdoorConfig, OutdoorFamily } from '@/types/catalog'

const views: { id: CatalogView; label: string; icon: typeof View }[] = [
  { id: 'perspective', label: 'Tér', icon: View }, { id: 'front', label: 'Front', icon: Maximize2 },
  { id: 'top', label: 'Felül', icon: Box }, { id: 'detail', label: 'Részlet', icon: Scan },
]
const changeLabels: Record<string, string> = { width: 'Szélesség', depth: 'Mélység', height: 'Magasság', length: 'Kerítéshossz', mount: 'Rögzítés', frameMaterial: 'Szerkezeti anyag', roofMaterial: 'Fedés', shape: 'Tetőforma', style: 'Mintázat', finish: 'Felületkezelés', color: 'Szín', gateType: 'Kaputípus', gateAutomation: 'Automatika', sideWalls: 'Oldalzárás' }
const mountLabels: Record<OutdoorConfig['mount'], string> = { wall: 'Falhoz csatlakozó', freestanding: 'Önálló', cantilever: 'Fali konzolos', posts: 'Fali + oszlopos' }

export default function CatalogStudio({ family }: { family: OutdoorFamily }) {
  const { homeHref } = useTenant()
  const [config, setConfig] = useState<OutdoorConfig>(() => loadOutdoorConfig(family))
  const [prices, setPrices] = useState(loadOutdoorPrices)
  // A pergola/carport stúdióval azonos kiindulás: aranyóra, semleges háttér (környezet nélkül).
  const [scene, setScene] = useState<CatalogSceneSettings>({ time: DEFAULT_STUDIO_TIME, gateOpen: false, showPerson: false, dimensions: true, environment: false, autoRotate: false })
  const [presentation, setPresentation] = usePresentation()
  const [priceCollapsed, togglePrice] = usePriceCollapse()
  const [change, announceChange, clearChange] = useChangePill()
  const [welcomeBack, setWelcomeBack] = useState(() => hasOutdoorDraft(family, config))
  const [view, setView] = useState<CatalogView>('perspective')
  const [step, setStep] = useState<CatalogStep>('size')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState('')
  const [delta, setDelta] = useState<{ amount: number; label: string } | null>(null)
  const history = useRef<{ past: OutdoorConfig[]; future: OutdoorConfig[] }>({ past: [], future: [] })
  const price = useMemo(() => calculateOutdoorPrice(config, prices), [config, prices])
  const meta = FAMILY_META[family]
  const roof = family === 'canopy' || family === 'carport'

  useEffect(() => persistOutdoorConfig(config), [config])
  useEffect(() => persistOutdoorPrices(prices), [prices])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3600); return () => window.clearTimeout(timer) }, [toast])

  const update = useCallback((patch: Partial<OutdoorConfig>) => {
    const next = { ...config, ...patch }
    if (JSON.stringify(next) === JSON.stringify(config)) return
    const changed = Object.keys(patch).find((key) => JSON.stringify(patch[key as keyof OutdoorConfig]) !== JSON.stringify(config[key as keyof OutdoorConfig]))
    const nextPrice = calculateOutdoorPrice(next, prices)
    const label = changed ? changeLabels[changed] ?? 'Konfiguráció' : 'Beállítás'
    setDelta({ amount: nextPrice.totalGross - price.totalGross, label })
    announceChange(nextPrice.totalGross - price.totalGross, label)
    setWelcomeBack(false)
    history.current.past.push(config); history.current.past = history.current.past.slice(-40); history.current.future = []
    setConfig(next)
  }, [config, price.totalGross, prices, announceChange])
  const replace = useCallback((next: OutdoorConfig) => { history.current.past.push(config); history.current.future = []; setConfig(next); setDelta(null) }, [config])
  const undo = useCallback(() => setConfig((current) => { const previous = history.current.past.pop(); if (!previous) return current; history.current.future.push(current); return previous }), [])
  const redo = useCallback(() => setConfig((current) => { const next = history.current.future.pop(); if (!next) return current; history.current.past.push(current); return next }), [])
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return; const target = event.target as HTMLElement; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return; event.preventDefault(); if (event.shiftKey) redo(); else undo() }
    window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener)
  }, [undo, redo])

  const share = async () => {
    const url = createOutdoorShareUrl(config); window.history.replaceState(null, '', url)
    try { await navigator.clipboard.writeText(url); setToast('Megosztható hivatkozás a vágólapra másolva.') } catch { setToast('A hivatkozás a címsorban másolható.') }
  }
  const exportPdf = async () => {
    setExporting(true)
    try { await exportCatalogPdf(config, price); setToast('A műszaki PDF elkészült.') } catch { setToast('A PDF nem készült el. Próbáld újra.') } finally { setExporting(false) }
  }
  const reset = () => { if (!window.confirm('Visszaállítod ezt a terméket az alapkonfigurációra?')) return; replace({ ...OUTDOOR_DEFAULTS[family] }); setStep('size'); setToast('Az alapkonfiguráció visszaállt.') }

  const specs = roof ? [
    ['Külső méret', `${config.width * (family === 'carport' ? config.bays : 1)} × ${config.depth} × ${config.height} m`],
    ['Szerkezet', LABELS.frame[config.frameMaterial]], ['Fedés', LABELS.roof[config.roofMaterial]], ['Rögzítés', mountLabels[config.mount]],
    ...(family === 'carport' ? [['Beállók', `${config.bays} állás`], ['Oldalzárás', config.sideWalls]] : []),
  ] : [
    ['Rendszerhossz', `${config.length} fm`], ['Magasság', `${config.height} m`], ['Anyag', LABELS.frame[config.frameMaterial]],
    ['Mintázat', LABELS.style[config.style]], ['Kapu', LABELS.gate[config.gateType]], ['Kapunyílás', config.gateType === 'none' ? '—' : `${formatNumber(config.gateWidth)} m`],
  ]
  const thumbnail = useSceneThumbnail(step === 'summary', config)
  const summary = <div className="summary-panel catalog-summary">
    <div className="summary-hero"><div className="summary-thumbnail">{thumbnail ? <img src={thumbnail} alt={`A konfigurált ${meta.title.toLowerCase()} képe`} /> : <div className="thumbnail-placeholder"><Box size={24} /><span>{meta.title}</span></div>}</div><div><span>ÉLŐ KONFIGURÁCIÓ</span><h3>{meta.title}</h3><p>{meta.description}</p><strong>{formatHuf(price.totalGross)}</strong><small>bruttó irányár, telepítési mintatétellel</small></div></div>
    <div className="summary-actions"><button type="button" onClick={exportPdf} disabled={exporting}><Download size={14} />{exporting ? 'Készül…' : 'PDF'}</button><button type="button" onClick={share}><Link2 size={14} />Megosztás</button><button type="button" onClick={() => setPriceOpen(true)}><Settings2 size={14} />Tarifák</button></div>
    <section className="summary-section"><div className="summary-section-title"><Ruler size={15} /><h3>Műszaki összefoglaló</h3></div><div className="spec-code"><span>SPEC-KÓD</span><strong>{outdoorSpecCode(config)}</strong></div><dl className="bom-list">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <section className="summary-section lead-section"><div className="summary-section-title"><MoveUpRight size={15} /><h3>Felmérési kérelem</h3></div><LeadForm productFamily={family} config={config} estimateNet={price.totalNet} estimateGross={price.totalGross} /></section>
    <div className="summary-footnote"><Info size={14} /><span>A piszkozat és a tarifák a böngésződben maradnak. Csak az űrlap elküldésekor jön létre valós, adatbázisban rögzített projekt.</span></div>
  </div>

  const roofless = !roof
  return <div className={`app-shell catalog-studio ${presentation ? 'presentation-mode' : ''} ${priceCollapsed ? 'price-collapsed' : ''}`}>
    <StudioHeader onHome={() => setView('perspective')} canUndo={history.current.past.length > 0} canRedo={history.current.future.length > 0} onUndo={undo} onRedo={redo} presentation={presentation} onPresentation={() => setPresentation(!presentation)} onInfo={() => setPriceOpen(true)} infoLabel="Árazás" onReset={reset} />
    <main className="studio-shell">
      <section className="viewer-panel" aria-label={`${meta.title} 3D előnézet`}><CatalogScene config={config} scene={scene} view={view} />
        <div className="viewer-heading"><span>ÉLŐ ÉPÍTÉSZETI JELENET</span><h1>{meta.title} <i>/</i> <span className="kinetic" key={`n${roof ? config.width * (family === 'carport' ? config.bays : 1) : config.length}`}>{roof ? config.width * (family === 'carport' ? config.bays : 1) : config.length}</span><small> m</small></h1><p>{roof ? `${LABELS.roof[config.roofMaterial]} · ${formatNumber(config.depth)} m mély` : `${LABELS.frame[config.frameMaterial]} · ${LABELS.style[config.style].toLowerCase()} · ${formatNumber(config.height)} m magas`}</p></div>
        <SceneToolbar time={scene.time} onTimeChange={(time) => setScene((current) => ({ ...current, time }))} viewPanel={<StudioViewSettings view={scene} productName={family === 'fence' ? 'a kerítés' : `a ${meta.title.toLowerCase()}`} onChange={(patch) => setScene((current) => ({ ...current, ...patch }))} />} presentation={presentation} onPresentation={() => setPresentation(!presentation)} onExport={exportPdf} onShare={share}
          quick={roofless && config.gateType !== 'none' ? [{ id: 'gate', className: 'icon-door', icon: scene.gateOpen ? EyeOff : Eye, label: scene.gateOpen ? 'Csukás' : 'Nyitás', title: 'A kapu nyitása és zárása', active: scene.gateOpen, run: () => setScene((current) => ({ ...current, gateOpen: !current.gateOpen })) }] : []}
          tools={[{ id: 'prices', icon: Settings2, name: 'Mintaárak szerkesztése', note: 'Folyóméter-, kapu- és tételárak a kalkulációhoz', run: () => setPriceOpen(true) }]} />
        <div className="camera-toolbar" aria-label="Kamera nézetek">{views.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={view === id ? 'selected' : ''} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span></button>)}</div>
        <div className="viewer-footer"><span>1 egység = 1 méter</span><span>{roof ? `${price.area.toFixed(1)} m²` : `${config.length} fm`}</span></div>
        {welcomeBack && !presentation && <WelcomeBack summary={`${roof ? `${formatNumber(config.width)} × ${formatNumber(config.depth)} m` : `${formatNumber(config.length)} fm · ${formatNumber(config.height)} m`} · ${formatHuf(price.totalGross)}`} onContinue={() => setWelcomeBack(false)} onFresh={() => { replace({ ...OUTDOOR_DEFAULTS[family] }); setStep('size'); setWelcomeBack(false) }} />}
        {!presentation && <ChangePill change={change} onUndo={() => { undo(); clearChange() }} />}
        {presentation && <div className="presentation-note"><span>ÜGYFÉL-BEMUTATÓ</span><strong>{meta.title} · {roof ? `${formatNumber(config.width * (family === 'carport' ? config.bays : 1))} × ${formatNumber(config.depth)} m` : `${formatNumber(config.length)} fm · ${formatNumber(config.height)} m`}</strong><small>Húzd a jelenetet a forgatáshoz · ESC a szerkesztéshez</small></div>}
      </section>
      <CatalogControls config={config} step={step} price={price} summary={summary} mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(!mobileOpen)} onStep={setStep} onChange={update} />
      <CatalogPricePanel collapsed={priceCollapsed} onToggleCollapse={togglePrice} heading={{ eyebrow: roof ? meta.title : `${LABELS.style[config.style]} · ${LABELS.gate[config.gateType]}`, title: roof ? `${formatNumber(config.width * (family === 'carport' ? config.bays : 1))} × ${formatNumber(config.depth)} m` : `${formatNumber(config.height)} m magas rendszer`, measure: `${roof ? `${formatNumber(price.area)} m²` : `${formatNumber(config.length)} fm`} · paraméteres modell` }} price={price} exporting={exporting} delta={delta} onEditPrices={() => setPriceOpen(true)} onExport={exportPdf} onShare={share} />
    </main>
    <div className="mobile-price-bar"><div><span>Bruttó irányár</span><strong data-value={price.totalGross}><AnimatedPrice value={price.totalGross} /></strong><PriceDeltaPop value={price.totalGross} /></div><button type="button" onClick={() => { setStep(step === 'summary' ? 'size' : 'summary'); setMobileOpen(true) }}>{step === 'summary' ? 'Tovább tervezés' : 'Összegzés'}<ChevronRight size={16} /></button></div>
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button type="button" aria-label="Értesítés bezárása" onClick={() => setToast('')}><X size={16} /></button></div>}
    {priceOpen && <OutdoorPriceDialog prices={prices} onChange={setPrices} onClose={() => setPriceOpen(false)} />}
    {homeHref && (homeHref.startsWith('/') ? <Link className="studio-home-link" to={homeHref}>Kezdőlap</Link> : <a className="studio-home-link" href={homeHref} target="_top" rel="noreferrer">Kezdőlap</a>)}
  </div>
}
