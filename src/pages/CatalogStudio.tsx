import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Check, ChevronRight, Download, Eye, EyeOff, Info, Link2, Maximize2, Moon, MoveUpRight, Ruler, Scan, Settings2, Sun, Undo2, Redo2, RotateCcw, UserRound, View, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import CatalogControls, { type CatalogStep } from '@/components/CatalogControls'
import CatalogPricePanel from '@/components/CatalogPricePanel'
import CatalogScene, { type CatalogSceneSettings, type CatalogView } from '@/components/CatalogScene'
import LeadForm from '@/components/LeadForm'
import OutdoorPriceDialog from '@/components/OutdoorPriceDialog'
import { Brand } from '@/components/SiteChrome'
import { calculateOutdoorPrice, createOutdoorShareUrl, FAMILY_META, LABELS, loadOutdoorConfig, loadOutdoorPrices, OUTDOOR_DEFAULTS, outdoorSpecCode, persistOutdoorConfig, persistOutdoorPrices } from '@/lib/catalog'
import { exportCatalogPdf } from '@/lib/exportCatalogPdf'
import { formatHuf } from '@/lib/pricing'
import type { OutdoorConfig, OutdoorFamily } from '@/types/catalog'

const views: { id: CatalogView; label: string; icon: typeof View }[] = [
  { id: 'perspective', label: 'Tér', icon: View }, { id: 'front', label: 'Front', icon: Maximize2 },
  { id: 'top', label: 'Felül', icon: Box }, { id: 'detail', label: 'Részlet', icon: Scan },
]
const changeLabels: Record<string, string> = { width: 'Szélesség', depth: 'Mélység', height: 'Magasság', length: 'Kerítéshossz', mount: 'Rögzítés', frameMaterial: 'Szerkezeti anyag', roofMaterial: 'Fedés', shape: 'Tetőforma', style: 'Mintázat', finish: 'Felületkezelés', color: 'Szín', gateType: 'Kaputípus', gateAutomation: 'Automatika', sideWalls: 'Oldalzárás' }
const mountLabels: Record<OutdoorConfig['mount'], string> = { wall: 'Falhoz csatlakozó', freestanding: 'Önálló', cantilever: 'Fali konzolos', posts: 'Fali + oszlopos' }

export default function CatalogStudio({ family }: { family: OutdoorFamily }) {
  const navigate = useNavigate()
  const [config, setConfig] = useState<OutdoorConfig>(() => loadOutdoorConfig(family))
  const [prices, setPrices] = useState(loadOutdoorPrices)
  const [scene, setScene] = useState<CatalogSceneSettings>({ night: false, gateOpen: false, showPerson: false, dimensions: true })
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
    setDelta({ amount: nextPrice.totalGross - price.totalGross, label: changed ? changeLabels[changed] ?? 'Konfiguráció' : 'Beállítás' })
    history.current.past.push(config); history.current.past = history.current.past.slice(-40); history.current.future = []
    setConfig(next)
  }, [config, price.totalGross, prices])
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
    ['Mintázat', LABELS.style[config.style]], ['Kapu', LABELS.gate[config.gateType]], ['Kapunyílás', config.gateType === 'none' ? '—' : `${config.gateWidth} m`],
  ]
  const summary = <div className="summary-panel catalog-summary">
    <div className="summary-hero"><div className="summary-thumbnail"><div className="thumbnail-placeholder"><Box size={24} /><span>{meta.series}</span></div></div><div><span>ÉLŐ KONFIGURÁCIÓ</span><h3>{meta.title}</h3><p>{meta.description}</p><strong>{formatHuf(price.totalGross)}</strong><small>bruttó irányár, telepítési mintatétellel</small></div></div>
    <div className="summary-actions"><button type="button" onClick={exportPdf} disabled={exporting}><Download size={14} />{exporting ? 'Készül…' : 'PDF'}</button><button type="button" onClick={share}><Link2 size={14} />Megosztás</button><button type="button" onClick={() => setPriceOpen(true)}><Settings2 size={14} />Tarifák</button></div>
    <section className="summary-section"><div className="summary-section-title"><Ruler size={15} /><h3>Műszaki összefoglaló</h3></div><div className="spec-code"><span>SPEC-KÓD</span><strong>{outdoorSpecCode(config)}</strong></div><dl className="bom-list">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <section className="summary-section lead-section"><div className="summary-section-title"><MoveUpRight size={15} /><h3>Felmérési kérelem</h3></div><LeadForm productFamily={family} config={config} estimateNet={price.totalNet} estimateGross={price.totalGross} /></section>
    <div className="summary-footnote"><Info size={14} /><span>A piszkozat és a tarifák a böngésződben maradnak. Csak az űrlap elküldésekor jön létre valós, adatbázisban rögzített projekt.</span></div>
  </div>

  return <div className="app-shell catalog-studio">
    <header className="app-header"><Brand compact /><div className="project-identity"><span>ÉPÍTÉSZETI KONFIGURÁTOR</span><select aria-label="Termékcsalád váltása" value={family} onChange={(event) => navigate(`/studio/${event.target.value}`)}><option value="pergola">Pergo · pergola</option><option value="canopy">Cover · előtető</option><option value="carport">Drive · autóbeálló</option><option value="fence">Fence · kerítés</option><option value="gate">Gate · kapu</option></select></div><div className="header-actions"><div className="history-actions"><button type="button" aria-label="Visszavonás" onClick={undo} disabled={!history.current.past.length}><Undo2 size={17} /></button><button type="button" aria-label="Ismétlés" onClick={redo} disabled={!history.current.future.length}><Redo2 size={17} /></button></div><button type="button" className="header-text-button" onClick={() => setPriceOpen(true)}><Info size={16} /><span>Árazás</span></button><button type="button" className="header-text-button" onClick={reset}><RotateCcw size={16} /><span>Alaphelyzet</span></button></div></header>
    <main className="studio-shell">
      <section className="viewer-panel" aria-label={`${meta.title} 3D előnézet`}><CatalogScene config={config} scene={scene} view={view} />
        <div className="viewer-heading"><span>{meta.series} / VALÓS IDEJŰ MODELL</span><h1>{meta.title} <i>/</i> {roof ? config.width * (family === 'carport' ? config.bays : 1) : config.length}<small> m</small></h1><p>{meta.description}</p></div>
        <div className="viewer-live"><i />PARAMÉTERES 3D</div>
        <div className="weather-toolbar"><button type="button" className={scene.night ? 'selected' : ''} onClick={() => setScene((current) => ({ ...current, night: !current.night }))}>{scene.night ? <Sun size={17} /> : <Moon size={17} />}<span>{scene.night ? 'Nappal' : 'Éjszaka'}</span></button>{!roof && config.gateType !== 'none' && <button type="button" className={scene.gateOpen ? 'selected' : ''} onClick={() => setScene((current) => ({ ...current, gateOpen: !current.gateOpen }))}>{scene.gateOpen ? <EyeOff size={17} /> : <Eye size={17} />}<span>{scene.gateOpen ? 'Csukás' : 'Nyitás'}</span></button>}<button type="button" className={scene.showPerson ? 'selected' : ''} onClick={() => setScene((current) => ({ ...current, showPerson: !current.showPerson }))}><UserRound size={17} /><span>Méretarány</span></button><button type="button" className={scene.dimensions ? 'selected' : ''} onClick={() => setScene((current) => ({ ...current, dimensions: !current.dimensions }))}><Ruler size={17} /><span>Méret</span></button></div>
        <div className="camera-toolbar" aria-label="Kamera nézetek">{views.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={view === id ? 'selected' : ''} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span></button>)}</div>
        <div className="viewer-footer"><span>1 egység = 1 méter</span><span>{roof ? `${price.area.toFixed(1)} m²` : `${config.length} fm`}</span></div>
      </section>
      <CatalogControls config={config} step={step} price={price} summary={summary} mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(!mobileOpen)} onStep={setStep} onChange={update} />
      <CatalogPricePanel config={config} price={price} exporting={exporting} delta={delta} onEditPrices={() => setPriceOpen(true)} onExport={exportPdf} onShare={share} />
    </main>
    <div className="mobile-price-bar"><div><span>Bruttó irányár</span><strong>{formatHuf(price.totalGross)}</strong></div><button type="button" onClick={() => { setStep(step === 'summary' ? 'size' : 'summary'); setMobileOpen(true) }}>{step === 'summary' ? 'Tovább tervezés' : 'Összegzés'}<ChevronRight size={16} /></button></div>
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button type="button" aria-label="Értesítés bezárása" onClick={() => setToast('')}><X size={16} /></button></div>}
    {priceOpen && <OutdoorPriceDialog prices={prices} onChange={setPrices} onClose={() => setPriceOpen(false)} />}
    <Link className="studio-home-link" to="/">Katalógus</Link>
  </div>
}
