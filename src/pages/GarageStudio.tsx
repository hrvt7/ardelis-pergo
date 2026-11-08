// Garázskapu konfigurátor: saját mag (products/garage.ts), saját 3D (GarageScene), a kerítés-stúdió héjával és paneljeivel.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Check, ChevronRight, DoorOpen, DoorClosed, Download, Info, Link2, Maximize2, Moon, MoveUpRight, Redo2, RotateCcw, Ruler, Scan, Settings2, Sun, Trees, Undo2, UserRound, View, X } from 'lucide-react'
import { Link } from 'react-router'
import GarageControls, { type GarageStep } from '@/components/GarageControls'
import { ProductSwitch } from '@/components/ProductChooser'
import CatalogPricePanel from '@/components/CatalogPricePanel'
import GarageScene, { type GarageSceneSettings, type GarageView } from '@/components/GarageScene'
import LeadForm from '@/components/LeadForm'
import { Brand } from '@/components/SiteChrome'
import { useTenant } from '@/tenants/TenantContext'
import { createGarageShareUrl, loadGarageConfig, loadGaragePrices, persistGarageConfig } from '@/lib/garage'
import { exportSpecPdf } from '@/lib/exportSpecPdf'
import { formatHuf, formatNumber } from '@/lib/pricing'
import { calculateGaragePrice, GARAGE_DEFAULTS, GARAGE_LABELS, GARAGE_META, garageSpecCode, garageSpecRows, type GarageConfig } from '@/products/garage'

const views: { id: GarageView; label: string; icon: typeof View }[] = [
  { id: 'perspective', label: 'Tér', icon: View }, { id: 'front', label: 'Front', icon: Maximize2 },
  { id: 'detail', label: 'Részlet', icon: Scan }, { id: 'interior', label: 'Belülről', icon: Box },
]
const changeLabels: Record<string, string> = { type: 'Kaputípus', width: 'Szélesség', height: 'Magasság', panel: 'Panelminta', insulation: 'Szigetelés', windows: 'Ablak', color: 'Szín', customRal: 'Egyedi RAL', motor: 'Kapumotor', smartControl: 'Okos vezérlés', photocell: 'Fotocella', wicket: 'Személybejáró', sideDoor: 'Oldalajtó', lowHeadroom: 'Alacsony szemöldök' }

export default function GarageStudio() {
  const { tenant, homeHref } = useTenant()
  const [config, setConfig] = useState<GarageConfig>(loadGarageConfig)
  const [prices] = useState(loadGaragePrices)
  const [scene, setScene] = useState<GarageSceneSettings>({ night: false, open: false, showPerson: false, dimensions: true, environment: true })
  const [view, setView] = useState<GarageView>('perspective')
  const [step, setStep] = useState<GarageStep>('size')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState('')
  const [delta, setDelta] = useState<{ amount: number; label: string } | null>(null)
  const history = useRef<{ past: GarageConfig[]; future: GarageConfig[] }>({ past: [], future: [] })
  const price = useMemo(() => calculateGaragePrice(config, prices), [config, prices])

  useEffect(() => persistGarageConfig(config), [config])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3600); return () => window.clearTimeout(timer) }, [toast])

  const update = useCallback((patch: Partial<GarageConfig>) => {
    const next = { ...config, ...patch }
    if (JSON.stringify(next) === JSON.stringify(config)) return
    const changed = Object.keys(patch).find((key) => JSON.stringify(patch[key as keyof GarageConfig]) !== JSON.stringify(config[key as keyof GarageConfig]))
    const nextPrice = calculateGaragePrice(next, prices)
    setDelta({ amount: nextPrice.totalGross - price.totalGross, label: changed ? changeLabels[changed] ?? 'Konfiguráció' : 'Beállítás' })
    history.current.past.push(config); history.current.past = history.current.past.slice(-40); history.current.future = []
    setConfig(next)
  }, [config, price.totalGross, prices])
  const undo = useCallback(() => setConfig((current) => { const previous = history.current.past.pop(); if (!previous) return current; history.current.future.push(current); return previous }), [])
  const redo = useCallback(() => setConfig((current) => { const next = history.current.future.pop(); if (!next) return current; history.current.past.push(current); return next }), [])
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return; const target = event.target as HTMLElement; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return; event.preventDefault(); if (event.shiftKey) redo(); else undo() }
    window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener)
  }, [undo, redo])

  const share = async () => {
    const url = createGarageShareUrl(config); window.history.replaceState(null, '', url)
    try { await navigator.clipboard.writeText(url); setToast('Megosztható hivatkozás a vágólapra másolva.') } catch { setToast('A hivatkozás a címsorban másolható.') }
  }
  const exportPdf = async () => {
    setExporting(true)
    try {
      await exportSpecPdf({ family: GARAGE_META.name, title: GARAGE_META.title, code: garageSpecCode(config), rows: garageSpecRows(config, price).filter(([label]) => label !== 'Termék'), price, notes: ['Tájékoztató kalkuláció, nem ajánlattétel és nem kiviteli terv.', 'A végleges ár felmérés, a falnyílás és a szemöldök pontos mérete, a villamos csatlakozás és a gyártói rendszer alapján változhat.', 'A motor működéséhez 230 V-os csatlakozás szükséges a mennyezeten; a kiépítés nem része az irányárnak.'] })
      setToast('A műszaki PDF elkészült.')
    } catch { setToast('A PDF nem készült el. Próbáld újra.') } finally { setExporting(false) }
  }
  const reset = () => { if (!window.confirm('Visszaállítod a garázskaput az alapkonfigurációra?')) return; history.current.past.push(config); history.current.future = []; setConfig({ ...GARAGE_DEFAULTS }); setDelta(null); setStep('size'); setToast('Az alapkonfiguráció visszaállt.') }

  const specs = garageSpecRows(config, price).filter(([label]) => label !== 'Termék' && label !== 'Konfigurációs kód')
  const summary = <div className="summary-panel catalog-summary">
    <div className="summary-hero"><div className="summary-thumbnail"><div className="thumbnail-placeholder"><Box size={24} /><span>{GARAGE_META.title}</span></div></div><div><span>ÉLŐ KONFIGURÁCIÓ</span><h3>{GARAGE_LABELS.type[config.type]}</h3><p>{GARAGE_META.description}</p><strong>{formatHuf(price.totalGross)}</strong><small>bruttó irányár, telepítési mintatétellel</small></div></div>
    <div className="summary-actions"><button type="button" onClick={exportPdf} disabled={exporting}><Download size={14} />{exporting ? 'Készül…' : 'PDF'}</button><button type="button" onClick={share}><Link2 size={14} />Megosztás</button></div>
    <section className="summary-section"><div className="summary-section-title"><Ruler size={15} /><h3>Műszaki összefoglaló</h3></div><div className="spec-code"><span>SPEC-KÓD</span><strong>{garageSpecCode(config)}</strong></div><dl className="bom-list">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <section className="summary-section lead-section"><div className="summary-section-title"><MoveUpRight size={15} /><h3>Felmérési kérelem</h3></div><LeadForm productFamily="garage-door" config={config} estimateNet={price.totalNet} estimateGross={price.totalGross} /></section>
    <div className="summary-footnote"><Info size={14} /><span>A piszkozat a böngésződben marad. Csak az űrlap elküldésekor jön létre valós, adatbázisban rögzített projekt.</span></div>
  </div>

  return <div className="app-shell catalog-studio">
    <header className="app-header"><Brand compact /><div className="project-identity"><span>{tenant.brand.name.toUpperCase()} · 3D KONFIGURÁTOR</span><ProductSwitch /></div><div className="header-actions"><div className="history-actions"><button type="button" aria-label="Visszavonás" onClick={undo} disabled={!history.current.past.length}><Undo2 size={17} /></button><button type="button" aria-label="Ismétlés" onClick={redo} disabled={!history.current.future.length}><Redo2 size={17} /></button></div><button type="button" className="header-text-button" onClick={reset}><RotateCcw size={16} /><span>Alaphelyzet</span></button></div></header>
    <main className="studio-shell">
      <section className="viewer-panel" aria-label="Garázskapu 3D előnézet"><GarageScene config={config} scene={scene} view={view} />
        <div className="viewer-heading"><span>ÉLŐ ÉPÍTÉSZETI JELENET</span><h1><span className="kinetic" key={config.type}>{GARAGE_LABELS.type[config.type].split(' ')[0]}</span> <i>/</i> <span className="kinetic" key={`w${config.width}`}>{formatNumber(config.width, 2)}</span><small> m</small></h1><p>{GARAGE_LABELS.type[config.type]} · {formatNumber(config.width, 2)} × {formatNumber(config.height, 2)} m nyílás</p></div>
        <div className="viewer-live"><i />PARAMÉTERES 3D</div>
        <div className="weather-toolbar">
          <button type="button" className={scene.night ? 'selected' : ''} onClick={() => setScene((current) => ({ ...current, night: !current.night }))}>{scene.night ? <Sun size={17} /> : <Moon size={17} />}<span>{scene.night ? 'Nappal' : 'Éjszaka'}</span></button>
          <button type="button" className={scene.open ? 'selected' : ''} aria-pressed={scene.open} title="A kapu nyitása és zárása" onClick={() => setScene((current) => ({ ...current, open: !current.open }))}>{scene.open ? <DoorClosed size={17} /> : <DoorOpen size={17} />}<span>{scene.open ? 'Zárás' : 'Nyitás'}</span></button>
          <button type="button" className={scene.environment ? 'selected' : ''} aria-pressed={scene.environment} title="A ház és a környezet be- és kikapcsolása" onClick={() => setScene((current) => ({ ...current, environment: !current.environment }))}><Trees size={17} /><span>Környezet</span></button>
          <button type="button" className={scene.showPerson ? 'selected' : ''} onClick={() => setScene((current) => ({ ...current, showPerson: !current.showPerson }))}><UserRound size={17} /><span>Méretarány</span></button>
          <button type="button" className={scene.dimensions ? 'selected' : ''} onClick={() => setScene((current) => ({ ...current, dimensions: !current.dimensions }))}><Ruler size={17} /><span>Méret</span></button>
        </div>
        <div className="camera-toolbar" aria-label="Kamera nézetek">{views.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={view === id ? 'selected' : ''} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span></button>)}</div>
        <div className="viewer-footer"><span>1 egység = 1 méter</span><span>{formatNumber(price.area)} m² kapulap</span></div>
      </section>
      <GarageControls config={config} step={step} summary={summary} mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(!mobileOpen)} onStep={setStep} onChange={update} />
      <CatalogPricePanel heading={{ eyebrow: GARAGE_LABELS.type[config.type], title: `${formatNumber(config.width, 2)} × ${formatNumber(config.height, 2)} m nyílás`, measure: `${formatNumber(price.area)} m² kapulap · paraméteres modell` }} price={price} exporting={exporting} delta={delta} onExport={exportPdf} onShare={share} />
    </main>
    <div className="mobile-price-bar"><div><span>Bruttó irányár</span><strong>{formatHuf(price.totalGross)}</strong></div><button type="button" onClick={() => { setStep(step === 'summary' ? 'size' : 'summary'); setMobileOpen(true) }}>{step === 'summary' ? 'Tovább tervezés' : 'Összegzés'}<ChevronRight size={16} /></button></div>
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button type="button" aria-label="Értesítés bezárása" onClick={() => setToast('')}><X size={16} /></button></div>}
    {homeHref && (homeHref.startsWith('/') ? <Link className="studio-home-link" to={homeHref}>Kezdőlap</Link> : <a className="studio-home-link" href={homeHref} target="_top" rel="noreferrer">Kezdőlap</a>)}
    <span hidden><Settings2 size={1} /></span>
  </div>
}
