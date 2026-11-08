// Garázskapu vezérlőpanel: a pergola/kerítés panelnyelvén (Konfiguráció 01/04, számozott lépések), csak a kapuhoz
// tartozó beállításokkal. A típus dönti el, mely opciók értelmezhetők (garageFeatures).
import { ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Choices, Range, Section, Toggle } from '@/components/CatalogControls'
import { formatNumber } from '@/lib/pricing'
import { GARAGE_COLOR_HEX, GARAGE_LABELS, GARAGE_META, garageFeatures, type GarageColor, type GarageConfig, type GarageType } from '@/products/garage'

export type GarageStep = 'size' | 'design' | 'extras' | 'summary'
const steps: { id: GarageStep; label: string }[] = [{ id: 'size', label: 'Típus' }, { id: 'design', label: 'Kivitel' }, { id: 'extras', label: 'Extrák' }, { id: 'summary', label: 'Kérés' }]

/** A kaputípus tipikus méretkorlátai (a vezérlők ehhez igazítanak; a séma a tágabb tartományt engedi). */
const LIMITS: Record<GarageType, { width: [number, number]; height: [number, number] }> = {
  sectional: { width: [2, 6], height: [1.8, 3] },
  tilt: { width: [2, 3.5], height: [1.8, 2.5] },
  roller: { width: [2, 5], height: [1.8, 3] },
  sideSliding: { width: [2, 6], height: [1.8, 3] },
}

interface Props {
  config: GarageConfig
  step: GarageStep
  summary: ReactNode
  mobileOpen: boolean
  onMobileToggle: () => void
  onStep: (step: GarageStep) => void
  onChange: (patch: Partial<GarageConfig>) => void
}

export default function GarageControls({ config, step, summary, mobileOpen, onMobileToggle, onStep, onChange }: Props) {
  const index = steps.findIndex((item) => item.id === step)
  const features = garageFeatures(config.type)
  const limits = LIMITS[config.type]
  const changeType = (type: GarageType) => {
    const next = LIMITS[type]
    onChange({ type, width: Math.min(next.width[1], Math.max(next.width[0], config.width)), height: Math.min(next.height[1], Math.max(next.height[0], config.height)) })
  }
  const colors = (Object.keys(GARAGE_LABELS.color) as GarageColor[]).filter((color) => config.panel === 'woodgrain' ? color === 'goldenOak' || color === 'custom' : color !== 'goldenOak')
  return <aside className={`controls-panel glass-panel catalog-controls ${mobileOpen ? 'is-mobile-open mobile-open' : ''}`}>
    <button type="button" className="sheet-toggle" onClick={onMobileToggle} aria-expanded={mobileOpen}><span className="sheet-handle" /><span>{GARAGE_META.title} beállításai</span><ChevronDown size={16} /></button>
    <div className="config-head"><div><span>Konfiguráció</span><strong>{String(index + 1).padStart(2, '0')} / 0{steps.length}</strong></div><span className="mini-summary">{formatNumber(config.width, 2)} × {formatNumber(config.height, 2)} m</span></div>
    <nav className="control-tabs catalog-step-tabs" aria-label="Konfigurációs lépések">{steps.map(({ id, label }, i) => <button type="button" key={id} className={step === id ? 'active' : i < index ? 'complete' : ''} onClick={() => onStep(id)}><span className="step-dot">{i < index ? <Check size={11} /> : i + 1}</span><span>{label}</span></button>)}</nav>
    <div className="controls-scroll"><div className="panel-content" key={step}>
      {step !== 'summary' && <div className="step-heading"><span>0{index + 1} · {step === 'size' ? 'Típus' : step === 'design' ? 'Kivitel' : 'Komfort'}</span><h2>{step === 'size' ? 'Kaputípus és nyílás' : step === 'design' ? 'Panel, ablak, szín' : 'Motor és felszereltség'}</h2></div>}
      {step === 'size' && <>
        <Section title="Kaputípus" description="A típus dönti el a működést és a nyílás fölötti helyigényt.">
          <Choices value={config.type} columns={1} options={[
            { value: 'sectional', label: GARAGE_LABELS.type.sectional, note: 'Függőlegesen nyílik, a mennyezet alá fut · a legjobb hőszigetelés' },
            { value: 'tilt', label: GARAGE_LABELS.type.tilt, note: 'Egy lap kilendül és a mennyezet alá fordul · kedvező ár' },
            { value: 'roller', label: GARAGE_LABELS.type.roller, note: 'Lécek tekerednek a tengelydobozba · kevés hely kell belül' },
            { value: 'sideSliding', label: GARAGE_LABELS.type.sideSliding, note: 'Oldalra, a belső fal mentén nyílik · részben is nyitható' },
          ]} onChange={changeType} />
        </Section>
        <Section title="Tiszta nyílásméret" description="A kész falnyílás szélessége és magassága; a kapu ehhez készül.">
          <Range label="Szélesség" value={config.width} min={limits.width[0]} max={limits.width[1]} step={0.05} unit="m" onChange={(width) => onChange({ width })} />
          <Range label="Magasság" value={config.height} min={limits.height[0]} max={limits.height[1]} step={0.025} unit="m" onChange={(height) => onChange({ height })} />
        </Section>
        {features.lowHeadroom && <Section title="Hely a nyílás fölött"><Toggle label="Alacsony szemöldök" note="Kevesebb mint 20 cm a nyílás és a mennyezet között" checked={config.lowHeadroom} onChange={(lowHeadroom) => onChange({ lowHeadroom })} /></Section>}
      </>}
      {step === 'design' && <>
        {features.panel && <Section title="Panelminta"><Choices value={config.panel} options={(Object.keys(GARAGE_LABELS.panel) as GarageConfig['panel'][]).map((value) => ({ value, label: GARAGE_LABELS.panel[value] }))} onChange={(panel) => onChange({ panel, color: panel === 'woodgrain' ? 'goldenOak' : config.color === 'goldenOak' ? 'anthracite' : config.color })} /></Section>}
        {features.insulation && <Section title="Szigetelés"><Choices value={config.insulation} columns={3} options={(Object.keys(GARAGE_LABELS.insulation) as GarageConfig['insulation'][]).map((value) => ({ value, label: GARAGE_LABELS.insulation[value] }))} onChange={(insulation) => onChange({ insulation })} /></Section>}
        {features.windows && <Section title="Ablak"><Choices value={config.windows} options={(Object.keys(GARAGE_LABELS.windows) as GarageConfig['windows'][]).map((value) => ({ value, label: GARAGE_LABELS.windows[value] }))} onChange={(windows) => onChange({ windows })} /></Section>}
        <Section title="Szín">
          <div className="material-swatches catalog-colors">{colors.map((color) => <button type="button" key={color} className={config.color === color ? 'selected' : ''} onClick={() => onChange({ color })}><span className="material-sphere" style={{ '--swatch': GARAGE_COLOR_HEX[color] } as React.CSSProperties}>{config.color === color && <Check size={18} />}</span><strong>{GARAGE_LABELS.color[color].split(' · ')[0]}</strong><small>{GARAGE_LABELS.color[color].split(' · ')[1] ?? ''}</small></button>)}</div>
          {config.color === 'custom' && <label className="text-field"><span>Egyedi RAL-kód</span><input value={config.customRal ?? ''} onChange={(e) => onChange({ customRal: e.target.value.toUpperCase().slice(0, 12) })} placeholder="RAL 7035" /><small>A kód bekerül a spec-kódba. Az egyedi szín felára külön tétel.</small></label>}
        </Section>
      </>}
      {step === 'extras' && <div className="extra-grid">
        <Toggle label="Kapumotor" note="Mennyezeti hajtás, két távirányító, vészkioldó" checked={config.motor} onChange={(motor) => onChange({ motor, smartControl: motor ? config.smartControl : false, photocell: motor ? config.photocell : false })} />
        {config.motor && <Toggle label="Okos vezérlés" note="Wi-Fi modul, telefonos app, kódkapcsoló a kapu mellett" checked={config.smartControl} onChange={(smartControl) => onChange({ smartControl })} />}
        {config.motor && <Toggle label="Fotocella" note="Becsípődés elleni érzékelő pár a tokszárakon" checked={config.photocell} onChange={(photocell) => onChange({ photocell })} />}
        {features.wicket && <Toggle label="Személybejáró a kapulapban" note="Küszöb nélküli ajtó, zárral és kilinccsel" checked={config.wicket} onChange={(wicket) => onChange({ wicket })} />}
        <Toggle label="Illeszkedő oldalajtó" note="Külön bejárat a kapu mellett, azonos panel és szín" checked={config.sideDoor} onChange={(sideDoor) => onChange({ sideDoor })} />
      </div>}
      {step === 'summary' && summary}
    </div></div>
    <div className="step-navigation"><button type="button" disabled={index === 0} onClick={() => onStep(steps[index - 1].id)}><ArrowLeft size={14} />Vissza</button><span>{index + 1} / {steps.length}</span><button type="button" className="next-step" onClick={() => { if (index === steps.length - 1) document.querySelector('.catalog-controls .lead-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); else onStep(steps[index + 1].id) }}>{index === steps.length - 1 ? 'Felmérést kérek' : 'Tovább'}<ArrowRight size={14} /></button></div>
  </aside>
}
