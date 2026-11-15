// Modulház vezérlőpanel: a garázskapu/kerítés panelnyelvén (Konfiguráció 01/04, számozott lépések).
// Típus → Kivitel → Megjelenés → Kérés. A színek csak a látványt állítják, az irányárat nem.
import { ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Choices, Section } from '@/components/CatalogControls'
import { formatHuf, formatNumber } from '@/lib/pricing'
import { MODULAR_COLOR_HEX, MODULAR_LABELS, MODULAR_META, MODULAR_MODEL_IDS, MODULAR_MODELS, MODULAR_PRICE_DEFAULTS, type ModularHouseConfig } from '@/products/modularHouse'

export type ModularStep = 'model' | 'finish' | 'look' | 'summary'
const steps: { id: ModularStep; label: string }[] = [{ id: 'model', label: 'Típus' }, { id: 'finish', label: 'Kivitel' }, { id: 'look', label: 'Megjelenés' }, { id: 'summary', label: 'Kérés' }]
const headings: Record<Exclude<ModularStep, 'summary'>, [string, string]> = { model: ['Típus', 'Melyik modulház?'], finish: ['Kivitel', 'Készültség és felhasználás'], look: ['Megjelenés', 'Homlokzat, nyílászárók, tető'] }

interface Props {
  config: ModularHouseConfig
  step: ModularStep
  summary: ReactNode
  mobileOpen: boolean
  onMobileToggle: () => void
  onStep: (step: ModularStep) => void
  onChange: (patch: Partial<ModularHouseConfig>) => void
}

function Swatches<T extends string>({ value, colors, labels, onChange }: { value: T; colors: Record<T, string>; labels: Record<T, string>; onChange: (value: T) => void }) {
  return <div className="material-swatches catalog-colors">{(Object.keys(colors) as T[]).map((id) => <button type="button" key={id} className={value === id ? 'selected' : ''} onClick={() => onChange(id)}><span className="material-sphere" style={{ '--swatch': colors[id] } as CSSProperties}>{value === id && <Check size={18} />}</span><strong>{labels[id]}</strong><small /></button>)}</div>
}

export default function ModularHouseControls({ config, step, summary, mobileOpen, onMobileToggle, onStep, onChange }: Props) {
  const index = steps.findIndex((item) => item.id === step)
  const [stepTrack, setStepTrack] = useState({ index, dir: 'fwd' as 'fwd' | 'back' })
  if (stepTrack.index !== index) setStepTrack({ index, dir: index > stepTrack.index ? 'fwd' : 'back' })
  const model = MODULAR_MODELS[config.model]
  return <aside className={`controls-panel glass-panel catalog-controls ${mobileOpen ? 'is-mobile-open mobile-open' : ''}`}>
    <button type="button" className="sheet-toggle" onClick={onMobileToggle} aria-expanded={mobileOpen}><span className="sheet-handle" /><span>{MODULAR_META.title} beállításai</span><ChevronDown size={16} /></button>
    <div className="config-head"><div><span>Konfiguráció</span><strong>{String(index + 1).padStart(2, '0')} / 0{steps.length}</strong></div><span className="mini-summary">{model.title} · {formatNumber(model.grossArea)} m²</span></div>
    <nav className="control-tabs catalog-step-tabs" aria-label="Konfigurációs lépések">{steps.map(({ id, label }, i) => <button type="button" key={id} className={step === id ? 'active' : i < index ? 'complete' : ''} onClick={() => onStep(id)}><span className="step-dot">{i < index ? <Check size={11} /> : i + 1}</span><span>{label}</span></button>)}</nav>
    <div className="controls-scroll"><div className={`panel-content dir-${stepTrack.dir}`} key={step}>
      {step !== 'summary' && <div className="step-heading"><span>0{index + 1} · {headings[step][0]}</span><h2>{headings[step][1]}</h2></div>}
      {step === 'model' && <>
        <Section title="Modulház típusa" description="Valós méretű típusterv; a 3D modell a gyártó alaprajza alapján készült.">
          <Choices value={config.model} columns={1} options={MODULAR_MODEL_IDS.map((id) => ({ value: id, label: MODULAR_MODELS[id].title, note: `Bruttó ${formatNumber(MODULAR_MODELS[id].grossArea)} m² · nettó ${formatNumber(MODULAR_MODELS[id].netArea)} m² · ${formatHuf(MODULAR_PRICE_DEFAULTS.perM2Net[id])} / m² nettó` }))} onChange={(value) => onChange({ model: value })} />
        </Section>
        <Section title="Műszaki adatok">
          <dl className="bom-list">
            <div><dt>Külső méret</dt><dd>{formatNumber(model.footprint.width, 2)} × {formatNumber(model.footprint.depth, 2)} m</dd></div>
            <div><dt>Helyiségek</dt><dd>{model.rooms}</dd></div>
            {model.structure.map((item, i) => <div key={item}><dt>{i === 0 ? 'Szerkezet' : ''}</dt><dd>{item}</dd></div>)}
            <div><dt>Magasságok</dt><dd>A 3D-ben becsült: gerinc ≈ {formatNumber(model.estimated.ridge, 2)} m, tetőhajlás ≈ {model.estimated.pitch}°</dd></div>
          </dl>
        </Section>
      </>}
      {step === 'finish' && <>
        <Section title="Kivitel" description="A gyártó m²-ára a külső kulcsrakész, belül emelt szerkezetkész állapotra vonatkozik.">
          <Choices value={config.finish} columns={1} options={(['shell', 'turnkey'] as const).map((value) => ({ value, label: MODULAR_LABELS.finish[value], note: MODULAR_LABELS.finishNote[value] }))} onChange={(finish) => onChange({ finish })} />
        </Section>
        <Section title="Felhasználás" description="Az ÁFA mértéke a felhasználástól függ. A gyártó tájékoztatása szerint családi házként 5%; a jogosultságot könyvelő vagy adótanácsadó ellenőrizze.">
          <Choices value={config.use} columns={1} options={(['home', 'other'] as const).map((value) => ({ value, label: MODULAR_LABELS.use[value] }))} onChange={(use) => onChange({ use })} />
        </Section>
      </>}
      {step === 'look' && <>
        <Section title="Homlokzat" description="Színezett nemesvakolat. A szín a látványt állítja; az elérhető színeket a gyártó adja meg."><Swatches value={config.facade} colors={MODULAR_COLOR_HEX.facade} labels={MODULAR_LABELS.facade} onChange={(facade) => onChange({ facade })} /></Section>
        <Section title="Nyílászárók"><Swatches value={config.joinery} colors={MODULAR_COLOR_HEX.joinery} labels={MODULAR_LABELS.joinery} onChange={(joinery) => onChange({ joinery })} /></Section>
        <Section title="Tetőcserép"><Swatches value={config.roof} colors={MODULAR_COLOR_HEX.roof} labels={MODULAR_LABELS.roof} onChange={(roof) => onChange({ roof })} /></Section>
      </>}
      {step === 'summary' && summary}
    </div></div>
    <div className="step-navigation"><button type="button" disabled={index === 0} onClick={() => onStep(steps[index - 1].id)}><ArrowLeft size={14} />Vissza</button><span>{index + 1} / {steps.length}</span><button type="button" className="next-step" onClick={() => { if (index === steps.length - 1) document.querySelector('.catalog-controls .lead-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); else onStep(steps[index + 1].id) }}>{index === steps.length - 1 ? 'Ajánlatot kérek' : 'Tovább'}<ArrowRight size={14} /></button></div>
  </aside>
}
