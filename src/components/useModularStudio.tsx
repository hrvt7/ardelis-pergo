// Modulház a konfigurátoron belül: állapot, ár, lépések, megosztás, PDF és az oldalpanel tartalma. A PergoStudio
// használja: ha a „Mit építesz?” választóban a Modulház van kiválasztva, ugyanazon az oldalon és ugyanabban a 3D
// vásznon a pergola helyén a típusház áll, a panel és az ár a modulházé. Saját mag: products/modularHouse.ts.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Box, Download, Info, Link2, MoveUpRight, Ruler } from 'lucide-react'
import ModularHouseControls, { type ModularStep } from '@/components/ModularHouseControls'
import CatalogPricePanel from '@/components/CatalogPricePanel'
import type { ModularView } from '@/components/ModularHouseScene'
import LeadForm from '@/components/LeadForm'
import { useSceneThumbnail } from '@/components/studio/studioState'
import { createModularShareUrl, loadModularConfig, persistModularConfig } from '@/lib/modularHouse'
import { exportSpecPdf } from '@/lib/exportSpecPdf'
import { formatPrice, formatNumber } from '@/lib/pricing'
import { calculateModularPrice, MODULAR_DEFAULTS, MODULAR_LABELS, MODULAR_META, MODULAR_MODELS, MODULAR_NOT_INCLUDED, MODULAR_PRICE_DEFAULTS, modularSpecCode, modularSpecRows, type ModularHouseConfig } from '@/products/modularHouse'

export const MODULAR_VIEWS: { id: ModularView; label: string }[] = [{ id: 'perspective', label: 'Tér' }, { id: 'front', label: 'Homlokzat' }, { id: 'side', label: 'Oldal' }, { id: 'top', label: 'Felülről' }]
const changeLabels: Record<keyof ModularHouseConfig, string> = { model: 'Típus', finish: 'Kivitel', use: 'Felhasználás (ÁFA)', facade: 'Homlokzat', joinery: 'Nyílászárók', roof: 'Tető' }
const NOTES = [
  'Tájékoztató kalkuláció, nem ajánlattétel. Az m²-ár a gyártó nyilvános adatlapjáról való; az árazott alapterület (bruttó vagy nettó) a gyártóval egyeztetendő.',
  `Az irányár nem tartalmazza: ${MODULAR_NOT_INCLUDED.join(', ').toLowerCase()}.`,
  'Az ÁFA mértéke a felhasználástól függ (családi házként a gyártó tájékoztatása szerint 5%); a jogosultságot szakember ellenőrizze.',
  'A 3D modell az alaprajz méretei szerint készült; a magasságok és a tetőhajlás becsültek.',
]

export type ModularChange = { id: number; amount: number; label: string } | null

export function useModularStudio({ active, notify }: { active: boolean; notify: (message: string) => void }) {
  const [config, setConfig] = useState<ModularHouseConfig>(loadModularConfig)
  const [step, setStep] = useState<ModularStep>('model')
  const [view, setView] = useState<ModularView>('perspective')
  const [exporting, setExporting] = useState(false)
  const [delta, setDelta] = useState<{ amount: number; label: string } | null>(null)
  const [change, setChange] = useState<ModularChange>(null)
  const history = useRef<{ past: ModularHouseConfig[]; future: ModularHouseConfig[] }>({ past: [], future: [] })
  const price = useMemo(() => calculateModularPrice(config, MODULAR_PRICE_DEFAULTS), [config])
  const model = MODULAR_MODELS[config.model]
  useEffect(() => persistModularConfig(config), [config])
  useEffect(() => { if (!change) return; const timer = window.setTimeout(() => setChange(null), 6000); return () => window.clearTimeout(timer) }, [change])

  const update = useCallback((patch: Partial<ModularHouseConfig>) => {
    const next = { ...config, ...patch }
    if (JSON.stringify(next) === JSON.stringify(config)) return
    const changed = (Object.keys(patch) as (keyof ModularHouseConfig)[]).find((key) => patch[key] !== config[key])
    const amount = calculateModularPrice(next, MODULAR_PRICE_DEFAULTS).totalGross - price.totalGross
    const label = changed ? changeLabels[changed] : 'Beállítás'
    setDelta({ amount, label })
    setChange({ id: Date.now(), amount, label })
    history.current.past.push(config); history.current.past = history.current.past.slice(-40); history.current.future = []
    setConfig(next)
  }, [config, price.totalGross])
  const undo = useCallback(() => setConfig((current) => { const previous = history.current.past.pop(); if (!previous) return current; history.current.future.push(current); return previous }), [])
  const redo = useCallback(() => setConfig((current) => { const next = history.current.future.pop(); if (!next) return current; history.current.past.push(current); return next }), [])
  const reset = useCallback(() => { history.current.past.push(config); history.current.future = []; setConfig({ ...MODULAR_DEFAULTS }); setDelta(null); setStep('model'); setView('perspective') }, [config])

  const share = async () => {
    const url = createModularShareUrl(config); window.history.replaceState(window.history.state, '', url)
    try { await navigator.clipboard.writeText(url); notify('Megosztható hivatkozás a vágólapra másolva.') } catch { notify('A hivatkozás a címsorban másolható.') }
  }
  const exportPdf = async () => {
    setExporting(true)
    try {
      await exportSpecPdf({ family: MODULAR_META.name, title: model.title, code: modularSpecCode(config), rows: modularSpecRows(config, price).filter(([label]) => label !== 'Termék'), price, notes: NOTES, installationLabel: null })
      notify('A műszaki PDF elkészült.')
    } catch { notify('A PDF nem készült el. Próbáld újra.') } finally { setExporting(false) }
  }

  const thumbnail = useSceneThumbnail(active && step === 'summary', config)
  const specs = modularSpecRows(config, price).filter(([label]) => label !== 'Termék' && label !== 'Konfigurációs kód')
  const summary = <div className="summary-panel catalog-summary">
    <div className="summary-hero"><div className="summary-thumbnail">{thumbnail ? <img src={thumbnail} alt="A konfigurált modulház képe" /> : <div className="thumbnail-placeholder"><Box size={24} /><span>{model.title}</span></div>}</div><div><span>ÉLŐ KONFIGURÁCIÓ</span><h3>{model.title}</h3><p>{MODULAR_LABELS.finish[config.finish]}</p><strong>{formatPrice(price.totalGross)}</strong><small>bruttó irányár, {MODULAR_LABELS.use[config.use].toLowerCase()}</small></div></div>
    <div className="summary-actions"><button type="button" onClick={exportPdf} disabled={exporting}><Download size={14} />{exporting ? 'Készül…' : 'PDF'}</button><button type="button" onClick={share}><Link2 size={14} />Megosztás</button></div>
    <section className="summary-section"><div className="summary-section-title"><Ruler size={15} /><h3>Műszaki összefoglaló</h3></div><div className="spec-code"><span>SPEC-KÓD</span><strong>{modularSpecCode(config)}</strong></div><dl className="bom-list">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <section className="summary-section"><div className="summary-section-title"><Info size={15} /><h3>Nincs benne az irányárban</h3></div><ul className="summary-notes">{MODULAR_NOT_INCLUDED.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <section className="summary-section lead-section"><div className="summary-section-title"><MoveUpRight size={15} /><h3>Ajánlatkérés</h3></div><LeadForm productFamily="modular-house" config={config} estimateNet={price.totalNet} estimateGross={price.totalGross} /></section>
    <div className="summary-footnote"><Info size={14} /><span>A piszkozat a böngésződben marad. Csak az űrlap elküldésekor jön létre valós, adatbázisban rögzített projekt.</span></div>
  </div>

  const controls = ({ typePicker, footer, mobileOpen, onMobileToggle }: { typePicker: ReactNode; footer: ReactNode; mobileOpen: boolean; onMobileToggle: () => void }) =>
    <ModularHouseControls config={config} step={step} summary={summary} typePicker={typePicker} footer={footer} mobileOpen={mobileOpen} onMobileToggle={onMobileToggle} onStep={setStep} onChange={update} />
  const pricePanel = ({ detailsOpen, onToggle }: { detailsOpen: boolean; onToggle: () => void }) =>
    <CatalogPricePanel collapsed={!detailsOpen} onToggleCollapse={onToggle} heading={{ eyebrow: MODULAR_LABELS.finish[config.finish], title: model.title, measure: `${formatNumber(price.area)} m² × ${formatPrice(MODULAR_PRICE_DEFAULTS.perM2Net[config.model])} / m² nettó` }} price={price} exporting={exporting} delta={delta} onExport={exportPdf} onShare={share}
      installation={null} totalNote="A gyártó m²-árából · nem ajánlattétel" disclaimer={`Tájékoztató irányár. Nincs benne: ${MODULAR_NOT_INCLUDED.slice(0, 4).join(', ').toLowerCase()}.`} />

  return { config, model, price, step, setStep, view, setView, change, clearChange: () => setChange(null), undo, redo, canUndo: history.current.past.length > 0, canRedo: history.current.future.length > 0, reset, share, exportPdf, controls, pricePanel }
}
