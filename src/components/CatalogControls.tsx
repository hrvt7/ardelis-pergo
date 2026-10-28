import { ArrowLeft, ArrowRight, Check, ChevronDown, Ruler, Shapes, Sparkles, ClipboardCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { COLOR_HEX, FAMILY_META, LABELS } from '@/lib/catalog'
import { formatHuf } from '@/lib/pricing'
import type { OutdoorColor, OutdoorConfig } from '@/types/catalog'
import type { PriceBreakdown } from '@/types/pergola'

export type CatalogStep = 'size' | 'design' | 'extras' | 'summary'
const steps: { id: CatalogStep; label: string; icon: typeof Ruler }[] = [
  { id: 'size', label: 'Méret', icon: Ruler }, { id: 'design', label: 'Kivitel', icon: Shapes },
  { id: 'extras', label: 'Extrák', icon: Sparkles }, { id: 'summary', label: 'Kérés', icon: ClipboardCheck },
]

function Range({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  return <div className="slider-field"><div className="field-heading"><label>{label}</label><div className="number-with-unit"><input type="number" aria-label={label} value={value} min={min} max={max} step={step} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))} /><span>{unit}</span></div></div><input className="range-input" type="range" aria-label={`${label} csúszka`} value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /><div className="range-limits"><span>{min} {unit}</span><span>{max} {unit}</span></div></div>
}
function Choices<T extends string>({ value, options, onChange, columns = 2 }: { value: T; options: { value: T; label: string; note?: string }[]; onChange: (value: T) => void; columns?: number }) {
  return <div className="catalog-choices" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{options.map((option) => <button type="button" key={option.value} className={value === option.value ? 'selected' : ''} onClick={() => onChange(option.value)}><span>{option.label}{option.note && <small>{option.note}</small>}</span>{value === option.value && <Check size={14} />}</button>)}</div>
}
function Toggle({ label, note, checked, onChange }: { label: string; note: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className={`extra-card ${checked ? 'is-on' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span><strong>{label}</strong><small>{note}</small></span><span className={`switch-track ${checked ? 'is-on' : ''}`}><span /></span></button>
}
function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="catalog-control-section"><div className="section-title"><h3>{title}</h3>{description && <p>{description}</p>}</div>{children}</section>
}

interface Props {
  config: OutdoorConfig
  step: CatalogStep
  price: PriceBreakdown
  summary: ReactNode
  mobileOpen: boolean
  onMobileToggle: () => void
  onStep: (step: CatalogStep) => void
  onChange: (patch: Partial<OutdoorConfig>) => void
}
export default function CatalogControls({ config, step, price, summary, mobileOpen, onMobileToggle, onStep, onChange }: Props) {
  const meta = FAMILY_META[config.family]
  const roofFamily = config.family === 'canopy' || config.family === 'carport'
  const index = steps.findIndex((item) => item.id === step)
  const finishOptions: { value: OutdoorConfig['finish']; label: string; materials: OutdoorConfig['frameMaterial'][] }[] = [
    { value: 'powder', label: 'Porfestés', materials: ['aluminium', 'steel', 'wrought'] },
    { value: 'galvanizedPowder', label: 'Horganyzás + porfestés', materials: ['steel', 'wrought'] },
    { value: 'woodlook', label: 'Fahatású bevonat', materials: ['aluminium', 'wpc'] },
    { value: 'lazur', label: 'Lazúr', materials: ['wood', 'glulam'] },
  ]
  const availableFinishes = finishOptions.filter((option) => option.materials.includes(config.frameMaterial))
  const changeMaterial = (frameMaterial: OutdoorConfig['frameMaterial']) => {
    const options = finishOptions.filter((option) => option.materials.includes(frameMaterial))
    const finish = frameMaterial === 'wood' || frameMaterial === 'glulam'
      ? 'lazur'
      : frameMaterial === 'wpc'
        ? 'woodlook'
        : options.some((option) => option.value === config.finish)
          ? config.finish
          : options[0].value
    const color = finish === 'lazur' || finish === 'woodlook'
      ? 'wood'
      : config.color === 'wood'
        ? 'anthracite'
        : config.color
    onChange({
      frameMaterial,
      finish,
      color,
      style: frameMaterial === 'wrought' ? 'ornamental' : config.style === 'ornamental' ? 'vertical' : config.style,
    })
  }
  const changeColor = (color: OutdoorColor) => {
    if (color !== 'wood') {
      const finish = config.color === 'wood'
        ? availableFinishes.find((option) => option.value !== 'woodlook' && option.value !== 'lazur')?.value
        : config.finish
      if (finish) onChange({ color, finish })
      return
    }
    const finish = availableFinishes.find((option) => option.value === 'lazur' || option.value === 'woodlook')?.value
    if (finish) onChange({ color, finish })
  }
  const colors: { value: OutdoorColor; label: string; code: string }[] = [
    { value: 'anthracite', label: 'Antracit', code: 'RAL 7016' }, { value: 'black', label: 'Fekete', code: 'RAL 9005' },
    { value: 'white', label: 'Fehér', code: 'RAL 9016' }, { value: 'bronze', label: 'Bronz', code: 'RAL 8017' },
    { value: 'green', label: 'Zöld', code: 'RAL 6005' }, { value: 'wood', label: 'Fahatás', code: 'Dió / tölgy' }, { value: 'custom', label: 'Egyedi', code: 'RAL' },
  ]
  const availableColors = colors.filter((color) => color.value === 'wood'
    ? availableFinishes.some((option) => option.value === 'woodlook' || option.value === 'lazur')
    : availableFinishes.some((option) => option.value !== 'woodlook' && option.value !== 'lazur'))
  return <aside className={`controls-panel glass-panel catalog-controls ${mobileOpen ? 'is-mobile-open mobile-open' : ''}`}>
    <button type="button" className="sheet-toggle" onClick={onMobileToggle} aria-expanded={mobileOpen}><span className="sheet-handle" /><span>{meta.title} beállításai</span><ChevronDown size={16} /></button>
    <div className="config-head"><div><span>{meta.series}</span><strong>3D / LIVE</strong></div><div className="mini-summary">{formatHuf(price.totalGross)}<br />bruttó irányár</div></div>
    <nav className="control-tabs catalog-step-tabs" aria-label="Konfigurációs lépések">{steps.map(({ id, label, icon: Icon }, i) => <button type="button" key={id} className={step === id ? 'active' : i < index ? 'complete' : ''} onClick={() => onStep(id)}><span className="step-dot">{i < index ? <Check size={11} /> : <Icon size={11} />}</span><span>{label}</span></button>)}</nav>
    <div className="controls-scroll"><div className="panel-content" key={`${config.family}-${step}`}>
      {step !== 'summary' && <div className="step-heading"><span>{meta.series}</span><h2>{step === 'size' ? 'Arányok és méretek' : step === 'design' ? 'Anyag és karakter' : 'Működés és comfort'}</h2></div>}
      {step === 'size' && (roofFamily ? <>
        {config.family === 'carport' && <Section title="Beállók száma"><Choices value={String(config.bays)} options={[{ value: '1', label: 'Egyállásos' }, { value: '2', label: 'Kétállásos' }]} onChange={(v) => onChange({ bays: Number(v) as 1 | 2 })} /></Section>}
        <Section title="Külső méretek" description="A modell valós méterarányban frissül."><Range label="Szélesség egy modulon" value={config.width} min={config.family === 'carport' ? 2.8 : 1.2} max={config.family === 'carport' ? 4.5 : 8} step={0.1} unit="m" onChange={(width) => onChange({ width })} /><Range label="Mélység" value={config.depth} min={config.family === 'carport' ? 4.5 : 0.8} max={config.family === 'carport' ? 8 : 5} step={0.1} unit="m" onChange={(depth) => onChange({ depth })} /><Range label="Belső magasság" value={config.height} min={2.1} max={3.4} step={0.05} unit="m" onChange={(height) => onChange({ height })} /></Section>
        <Section title="Szerkezeti kapcsolat"><Choices value={config.mount} options={(config.family === 'canopy' ? [{ value: 'cantilever', label: 'Fali konzolos', note: 'Oszlopok nélkül' }, { value: 'posts', label: 'Fali + oszlopos', note: 'Teherbírás függő' }] : [{ value: 'freestanding', label: 'Önálló', note: 'Független szerkezet' }, { value: 'wall', label: 'Falhoz csatlakozó', note: 'Házfalhoz illesztve' }]) as { value: OutdoorConfig['mount']; label: string; note: string }[]} onChange={(mount) => onChange({ mount })} /></Section>
      </> : <>
        <Section title="Telekhatároló hossza"><Range label="Kerítésszakaszok" value={config.length} min={2} max={50} step={0.5} unit="fm" onChange={(length) => onChange({ length })} /><Range label="Magasság" value={config.height} min={0.8} max={2.4} step={0.05} unit="m" onChange={(height) => onChange({ height })} /></Section>
        <Section title="Gépkocsikapu"><Choices value={config.gateType} options={(Object.keys(LABELS.gate) as (keyof typeof LABELS.gate)[]).map((value) => ({ value, label: LABELS.gate[value] }))} onChange={(gateType) => onChange({ gateType, ...(gateType === 'none' ? { gateAutomation: false, safetyKit: false } : {}) })} />{config.gateType !== 'none' && <Range label="Hasznos kapunyílás" value={config.gateWidth} min={2.4} max={6} step={0.1} unit="m" onChange={(gateWidth) => onChange({ gateWidth })} />}</Section>
      </>)}
      {step === 'design' && (roofFamily ? <>
        <Section title="Szerkezeti anyag"><Choices value={config.frameMaterial} options={(['aluminium', 'steel', 'glulam'] as const).map((value) => ({ value, label: LABELS.frame[value] }))} onChange={changeMaterial} /></Section>
        <Section title="Fedés"><Choices value={config.roofMaterial} options={(Object.keys(LABELS.roof) as (keyof typeof LABELS.roof)[]).filter((v) => config.family === 'carport' || v !== 'louvered').map((value) => ({ value, label: LABELS.roof[value] }))} onChange={(roofMaterial) => onChange({ roofMaterial })} /></Section>
        <Section title="Tetőforma"><Choices value={config.shape} options={[{ value: 'mono', label: 'Egyenes' }, { value: 'curved', label: 'Íves' }, { value: 'gable', label: 'Nyereg' }]} columns={3} onChange={(shape) => onChange({ shape })} /></Section>
        {config.family === 'carport' && <Section title="Oldalzárás"><Choices value={config.sideWalls} options={[{ value: 'none', label: 'Nyitott' }, { value: 'louver', label: 'Lamella' }, { value: 'glass', label: 'Üveg' }, { value: 'privacy', label: 'Zárt panel' }]} onChange={(sideWalls) => onChange({ sideWalls })} /></Section>}
      </> : <>
        <Section title="Anyag és felület"><Choices value={config.frameMaterial} options={(['aluminium', 'steel', 'wrought', 'wood', 'wpc'] as const).map((value) => ({ value, label: LABELS.frame[value] }))} onChange={changeMaterial} /><Choices value={config.finish} options={availableFinishes} onChange={(finish) => onChange({ finish, color: finish === 'woodlook' || finish === 'lazur' ? 'wood' : config.color === 'wood' ? 'anthracite' : config.color })} /></Section>
        <Section title="Mintázat"><Choices value={config.style} options={(Object.keys(LABELS.style) as (keyof typeof LABELS.style)[]).map((value) => ({ value, label: LABELS.style[value] }))} onChange={(style) => onChange({ style })} /></Section>
      </>)}
      {step === 'design' && <Section title="Szín és felületkezelés"><div className="material-swatches catalog-colors">{availableColors.map((color) => <button type="button" key={color.value} className={config.color === color.value ? 'selected' : ''} onClick={() => changeColor(color.value)}><span className="material-sphere" style={{ '--swatch': COLOR_HEX[color.value] } as React.CSSProperties}>{config.color === color.value && <Check size={18} />}</span><strong>{color.label}</strong><small>{color.code}</small></button>)}</div>{config.color === 'custom' && <label className="text-field"><span>Egyedi RAL-kód</span><input value={config.customRal ?? ''} onChange={(e) => onChange({ customRal: e.target.value.toUpperCase().slice(0, 12) })} placeholder="RAL 7035" /><small>A kód bekerül a spec-kódba. Az egyedi szín felára külön tétel.</small></label>}</Section>}
      {step === 'extras' && <div className="extra-grid">
        {roofFamily ? <>
          <Toggle label="Integrált LED" note="Rejtett, melegfehér világítási csatorna" checked={config.led} onChange={(led) => onChange({ led })} />
          <Toggle label="Eresz és vízelvezetés" note="Lefolyó és csatlakozási mintacsomag" checked={config.gutter} onChange={(gutter) => onChange({ gutter })} />
          <Toggle label="Alapozási iránytétel" note="Talaj és statika szerint felülvizsgálandó" checked={config.foundation} onChange={(foundation) => onChange({ foundation })} />
          {config.family === 'carport' && <><Toggle label="Zárható tárolómodul" note="Eszköztár a beállóval azonos arculatban" checked={config.storage} onChange={(storage) => onChange({ storage })} /><Toggle label="EV-előkészítés" note="Kábelút és szerelvényhely, töltő nélkül" checked={config.evReady} onChange={(evReady) => onChange({ evReady })} /><Toggle label="Napelem-előkészítés" note="Statikai és kábelút-foglalás, rendszer nélkül" checked={config.solarReady} onChange={(solarReady) => onChange({ solarReady })} /></>}
        </> : <>
          <Toggle label="Illeszkedő kiskapu" note="Zárral és kilinccsel, azonos mintázattal" checked={config.pedestrianGate} onChange={(pedestrianGate) => onChange({ pedestrianGate })} />
          {config.gateType !== 'none' && <Toggle label="Motoros kapunyitás" note="Vezérlés és két távirányító mintacsomag" checked={config.gateAutomation} onChange={(gateAutomation) => onChange({ gateAutomation, safetyKit: gateAutomation ? config.safetyKit : false })} />}
          {config.gateType !== 'none' && config.gateAutomation && <Toggle label="Biztonsági fényfüggöny" note="Motoros kapuhoz tartozó biztonsági csomag" checked={config.safetyKit} onChange={(safetyKit) => onChange({ safetyKit })} />}
          <Toggle label="Audio-video kaputelefon" note="Interkom és kábelút-előkészítés" checked={config.intercom} onChange={(intercom) => onChange({ intercom })} />
        </>}
      </div>}
      {step === 'summary' && summary}
    </div></div>
    <div className="step-navigation"><button type="button" disabled={index === 0} onClick={() => onStep(steps[index - 1].id)}><ArrowLeft size={14} />Vissza</button><span>{index + 1} / {steps.length}</span><button type="button" className="next-step" onClick={() => onStep(steps[(index + 1) % steps.length].id)}>{index === steps.length - 1 ? 'Tervezés' : 'Tovább'}<ArrowRight size={14} /></button></div>
  </aside>
}
