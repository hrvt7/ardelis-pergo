import { useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { ArrowLeft, ArrowRight, Box, Check, ChevronDown, CloudRain, Columns3, Expand, House, Image, LampCeiling, Layers3, Minus, Moon, Move, PanelTop, Plus, SlidersHorizontal, Sparkles, Sun, Sunset, Upload, Wind, Zap } from 'lucide-react'
import { getFrameColorHex } from '@/lib/config'
import { formatHuf, SIDE_LABELS } from '@/lib/pricing'
import { enabledRoofs, presetConfig } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import { getSizeRecommendation } from '@/lib/specification'
import type { ConfigStep, FrameColor, PergolaConfig, PriceSettings, QualityLevel, SceneSettings, SideKey, SideType } from '@/types/pergola'

const STEPS: { id: ConfigStep; label: string; short: string }[] = [
  { id: 'size', label: 'Méret', short: 'Alapterület' },
  { id: 'mount', label: 'Rögzítés', short: 'Szerkezet' },
  { id: 'color', label: 'Szín', short: 'Felület' },
  { id: 'sides', label: 'Oldalak', short: 'Zárás' },
  { id: 'extras', label: 'Extrák', short: 'Komfort' },
  { id: 'summary', label: 'Összegzés', short: 'Felmérés' },
]

interface Props {
  config: PergolaConfig
  scene: SceneSettings
  step: ConfigStep
  selectedSide: SideKey
  summary: ReactNode
  onStepChange: (step: ConfigStep) => void
  onSideSelect: (side: SideKey) => void
  onChange: (patch: Partial<PergolaConfig>) => void
  onSceneChange: (patch: Partial<SceneSettings>) => void
  onPreset: (config: PergolaConfig) => void
  prices: PriceSettings
  onPhotoUpload: (file: File) => void
  mobileOpen: boolean
  onMobileToggle: () => void
}


function SliderField({ label, value, min, max, step, unit, metric = false, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; metric?: boolean; onChange: (value: number) => void }) {
  const id = `slider-${label.toLowerCase().replace(/[^a-z0-9áéíóöőúüű]+/gi, '-')}`
  const factor = metric ? 100 : 1
  const shown = Math.round(value * factor)
  const [draft, setDraft] = useState(String(shown))
  // Külső változásnál (csúszka, visszavonás) a beírt érték is frissül — effect nélkül.
  const [syncedShown, setSyncedShown] = useState(shown)
  if (syncedShown !== shown) { setSyncedShown(shown); setDraft(String(shown)) }
  return (
    <div className="slider-field">
      <div className="field-heading">
        <label htmlFor={id}>{label}</label>
        <span className="number-with-unit">
          <input aria-label={`${label} értéke ${metric ? 'centiméterben' : unit}`} type="number" min={min * factor} max={max * factor} step={step * factor} value={draft} onChange={(event) => {
            const raw = event.target.value
            setDraft(raw)
            if (!raw.trim()) return
            const next = Number(raw) / factor
            if (Number.isFinite(next) && next >= min && next <= max) onChange(next)
          }} onBlur={() => {
            const parsed = Number(draft)
            const next = draft.trim() && Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed / factor)) : value
            setDraft(String(Math.round(next * factor)))
            if (next !== value) onChange(next)
          }} />
          <span>{metric ? 'cm' : unit}</span>
        </span>
      </div>
      <input id={id} className="range-input ticked" type="range" min={min * factor} max={max * factor} step={step * factor} value={shown} onChange={(event) => onChange(Number(event.target.value) / factor)} />
      <div className="range-limits"><span>{metric ? Math.round(min * factor) : min * factor} {metric ? 'cm' : unit}</span><span>{metric ? Math.round(max * factor) : max * factor} {metric ? 'cm' : unit}</span></div>
    </div>
  )
}

function Toggle({ label, description, checked, icon: Icon, price, onChange }: { label: string; description: string; checked: boolean; icon?: typeof Sun; price?: string; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" className={`extra-card ${checked ? 'is-on' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      {Icon && <Icon size={20} strokeWidth={1.5} />}
      <span><strong>{label}</strong><small>{description}</small>{price && <em>{price}</em>}</span>
      <span className={`switch-track ${checked ? 'is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
  )
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return <div className="section-title"><h3>{title}</h3>{hint && <p>{hint}</p>}</div>
}

function SideDiagram({ config, selected, onSelect }: { config: PergolaConfig; selected: SideKey; onSelect: (side: SideKey) => void }) {
  return (
    <div className="side-diagram" aria-label="Oldalválasztó felülnézet">
      {(['back', 'left', 'right', 'front'] as SideKey[]).map((side) => (
        <button key={side} type="button" className={`diagram-${side} ${selected === side ? 'selected' : ''} type-${config.sides[side]}`} disabled={config.mount === 'wall' && side === 'back'} onClick={() => onSelect(side)} aria-label={`${side === 'front' ? 'Elülső' : side === 'back' ? 'Hátsó' : side === 'left' ? 'Bal' : 'Jobb'} oldal kiválasztása`}>
          {side === 'front' ? 'Elülső' : side === 'back' ? (config.mount === 'wall' ? 'Házfal' : 'Hátsó') : side === 'left' ? 'Bal' : 'Jobb'}
        </button>
      ))}
      <div className="diagram-core"><span>{config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m</span><small>Koppints egy oldalra</small></div>
    </div>
  )
}

export default function ConfiguratorControls({ config, scene, step, selectedSide, summary, onStepChange, onSideSelect, onChange, onSceneChange, onPreset, prices, onPhotoUpload, mobileOpen, onMobileToggle }: Props) {
  const { tenant } = useTenant()
  const { limits } = tenant
  const customRate = Math.round(prices.customColorRate * 100)
  const FRAME_COLORS: { id: FrameColor; name: string; hex: string }[] = [
    ...tenant.colors.map((color) => ({ id: color.id, name: `${color.name} · ${color.detail}`, hex: color.hex })),
    ...(tenant.customRal ? [{ id: 'custom' as const, name: `Egyedi RAL · ${customRate > 0 ? `+${customRate}% ${tenant.demo ? 'minta ' : ''}felár` : 'felár nélkül'}`, hex: '#687467' }] : []),
  ]
  const sideTypes: SideType[] = ['none', ...tenant.sides]
  const touchStart = useRef(0)
  const stepIndex = STEPS.findIndex((item) => item.id === step)
  const hasZip = Object.entries(config.sides).some(([side, type]) => type === 'zip' && !(config.mount === 'wall' && side === 'back'))
  const go = (index: number) => onStepChange(STEPS[Math.max(0, Math.min(STEPS.length - 1, index))].id)
  const touchEnd = (event: TouchEvent) => {
    const distance = event.changedTouches[0].clientX - touchStart.current
    if (Math.abs(distance) > 55) go(stepIndex + (distance < 0 ? 1 : -1))
  }
  const setDayTime = (dayTime: number) => onSceneChange({ dayTime, time: dayTime >= 20 || dayTime < 7 ? 'night' : dayTime >= 17 ? 'sunset' : 'day' })
  const sideNames: Record<SideKey, string> = { front: 'Elülső oldal', back: 'Hátsó oldal', left: 'Bal oldal', right: 'Jobb oldal' }
  const activeColor = getFrameColorHex(config, tenant.colors)
  const customPreview = getFrameColorHex({ frameColor: 'custom', customRal: config.customRal })

  return (
    <aside className={`controls-panel glass-panel ${mobileOpen ? 'is-mobile-open' : ''}`} aria-label="Pergola beállításai" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX }} onTouchEnd={touchEnd}>
      <button type="button" className="sheet-toggle" aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Beállítások összecsukása a 3D nézethez' : 'Pergola beállításainak megnyitása'} onClick={onMobileToggle}><span className="sheet-handle" aria-hidden="true" /><span><SlidersHorizontal size={16} />{mobileOpen ? 'Vissza a 3D nézethez' : 'Beállítások'}</span><ChevronDown size={16} /></button>
      <div className="config-head">
        <div><span>Konfiguráció</span><strong>{String(stepIndex + 1).padStart(2, '0')} / 06</strong></div>
        <span className="mini-summary">{config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · {config.mount === 'wall' ? 'Fal menti' : 'Önálló'}</span>
      </div>
      <div className="control-tabs" role="tablist" aria-label="Konfigurációs lépések">
        {STEPS.map((item, index) => (
          <button key={item.id} type="button" role="tab" aria-selected={step === item.id} className={`${step === item.id ? 'active' : ''} ${index < stepIndex ? 'complete' : ''}`} onClick={() => onStepChange(item.id)} title={item.label}>
            <span className="step-dot">{index < stepIndex ? <Check size={11} /> : index + 1}</span><span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="controls-scroll">
        <div className="panel-content" role="tabpanel" key={step}>
          <div className="step-heading"><span>0{stepIndex + 1} · {STEPS[stepIndex].short}</span><h2>{STEPS[stepIndex].label}</h2></div>

          {step === 'size' && <>
            <SectionTitle title="Külső szerkezeti méretek" hint="Írd be az értékeket centiméterben, vagy használd a csúszkákat." />
            <SliderField label="Szélesség" value={config.width} min={limits.width[0]} max={limits.width[1]} step={0.05} unit="m" metric onChange={(width) => onChange({ width })} />
            <SliderField label="Mélység" value={config.depth} min={limits.depth[0]} max={limits.depth[1]} step={0.05} unit="m" metric onChange={(depth) => onChange({ depth })} />
            <SliderField label="Oszlopmagasság" value={config.height} min={limits.height[0]} max={limits.height[1]} step={0.05} unit="m" metric onChange={(height) => onChange({ height })} />
            {config.width > 6 && <div className="smart-warning"><Columns3 size={18} /><p><strong>Középoszlop javasolt</strong>600 cm felett a műszaki ellenőrzés és egy középoszlop szükséges lehet.</p></div>}
            <div className="smart-helper"><Sparkles size={18} /><p><strong>{getSizeRecommendation(config).split(' · ')[0]}</strong>{getSizeRecommendation(config).split(' · ')[1]}</p></div>
            {config.roof !== 'fixed' && <SliderField label={config.roof === 'retractable' ? 'Tetőnyitás' : 'Lamellaszög'} value={config.louverAngle} min={0} max={90} step={1} unit="°" onChange={(louverAngle) => onChange({ louverAngle })} />}
          </>}

          {step === 'mount' && <>
            <SectionTitle title="Kiinduló csomagok" hint="Egy koppintással indulhatsz, utána minden paraméter szabadon módosítható." />
            <div className="preset-list">{tenant.presets.map((preset) => <button type="button" key={preset.id} onClick={() => onPreset(presetConfig(tenant, preset.config))}><strong>{preset.name}</strong><span>{preset.description}</span><ArrowRight size={15} /></button>)}</div>
            <SectionTitle title="Rögzítés" hint="A házfal és az oszlopok a modellen is frissülnek." />
            <div className="segmented two">
              {tenant.mounts.includes('wall') && <button type="button" className={config.mount === 'wall' ? 'selected' : ''} onClick={() => onChange({ mount: 'wall' })}><House size={18} />Falhoz csatlakozó</button>}
              {tenant.mounts.includes('freestanding') && <button type="button" className={config.mount === 'freestanding' ? 'selected' : ''} onClick={() => onChange({ mount: 'freestanding' })}><Box size={18} />Önálló</button>}
            </div>
            <SectionTitle title="Tetőrendszer" />
            <div className="roof-options">{enabledRoofs(tenant).map((id) => [id, tenant.roofs[id]!.name, tenant.roofs[id]!.description] as const).map(([id, name, description]) => <button type="button" key={id} className={config.roof === id ? 'selected' : ''} onClick={() => onChange({ roof: id })}><PanelTop size={20} /><span><strong>{name}</strong><small>{description}</small></span><span className="selection-dot">{config.roof === id && <Check size={12} />}</span></button>)}</div>
          </>}

          {step === 'color' && <>
            <SectionTitle title="Porszinterezett alumínium" hint="Válassz szerkezetszínt; a 3D modell azonnal megmutatja a kiválasztott felületet." />
            <div className="material-swatches">{FRAME_COLORS.map((color) => <button type="button" key={color.id} className={config.frameColor === color.id ? 'selected' : ''} aria-pressed={config.frameColor === color.id} onClick={() => onChange({ frameColor: color.id })}><span className="material-sphere" style={{ '--swatch': color.id === 'custom' ? customPreview : color.hex } as React.CSSProperties}>{config.frameColor === color.id && <Check size={16} />}</span><strong>{color.name.split(' · ')[0]}</strong><small>{color.name.split(' · ')[1]}</small></button>)}</div>
            {config.frameColor === 'custom' && <label className="text-field"><span>Egyedi RAL-kód</span><input value={config.customRal ?? ''} maxLength={12} placeholder="pl. RAL 7035" onChange={(event) => onChange({ customRal: event.target.value })} /><small>A gyakori RAL-kódok 3D színmintája is frissül.{customRate > 0 ? ` Az ${tenant.demo ? 'mintaárazás' : 'árazás'} ${customRate}% szerkezeti felárral számol.` : ''}</small></label>}
            <div className="finish-sample" style={{ '--finish': activeColor } as React.CSSProperties}><div /><span><strong>{config.frameColor === 'custom' && config.customRal ? `Egyedi RAL · ${config.customRal.toUpperCase()}` : FRAME_COLORS.find((item) => item.id === config.frameColor)?.name}</strong><small>Matt, UV-álló porszinterezett felület</small></span></div>
          </>}

          {step === 'sides' && <>
            <SectionTitle title="Válaszd ki az oldalt" hint="A felülnézeti diagramon vagy közvetlenül a 3D modellen is kiválasztható." />
            <SideDiagram config={config} selected={selectedSide} onSelect={onSideSelect} />
            <div className="selected-side-head"><strong>{sideNames[selectedSide]}</strong><span>{config.mount === 'wall' && selectedSide === 'back' ? 'Házfal' : SIDE_LABELS[config.sides[selectedSide]]}</span></div>
            <div className="side-options large">{sideTypes.map((type) => <button type="button" key={type} disabled={config.mount === 'wall' && selectedSide === 'back'} className={config.sides[selectedSide] === type ? 'selected' : ''} onClick={() => onChange({ sides: { ...config.sides, [selectedSide]: type } })}>{type === 'zip' ? <Wind size={18} /> : type === 'glass' ? <Box size={18} /> : type === 'louver' ? <Layers3 size={18} /> : <Expand size={18} />}<span>{SIDE_LABELS[type]}</span></button>)}</div>
            {hasZip && <div className="inline-setting"><SliderField label="ZIP screen nyitottsága" value={config.screenOpen} min={0} max={100} step={1} unit="%" onChange={(screenOpen) => onChange({ screenOpen })} /></div>}
            {config.sides[selectedSide] === 'glass' && <button type="button" className="side-motion-control" aria-pressed={scene.glassOpen} onClick={() => onSceneChange({ glassOpen: !scene.glassOpen })}><Move size={17} /><span>{scene.glassOpen ? 'Tolóüveg bezárása' : 'Tolóüveg eltolása'}</span></button>}
            {config.sides[selectedSide] === 'louver' && <button type="button" className="side-motion-control" aria-pressed={scene.wallLouverOpen} onClick={() => onSceneChange({ wallLouverOpen: !scene.wallLouverOpen })}><Layers3 size={17} /><span>{scene.wallLouverOpen ? 'Oldallamellák zárása' : 'Oldallamellák döntése'}</span></button>}
            <div className="interaction-hint"><Move size={17} /><p>A tolóüveg és az oldallamella a 3D-ben kattintásra, illetve a fenti gombbal is mozgatható. A ZIP a kazettából gördül le.</p></div>
          </>}

          {step === 'extras' && <>
            <SectionTitle title="Integrált komfort" hint="Az opciók azonnal megjelennek a modellen és a tételes árban." />
            <div className="extra-grid">
              {tenant.extras.led && <Toggle label="Periméter LED" description="Rejtett, melegfehér világítás" icon={LampCeiling} price={`${formatHuf(prices.ledPerMeterNet)} / fm`} checked={config.led} onChange={(led) => onChange({ led })} />}
              {tenant.extras.speakers && <Toggle label="Bluetooth hangrendszer" description="Egy pár beépített hangszóró" icon={Zap} price={formatHuf(prices.speakerPairNet)} checked={config.speakers} onChange={(speakers) => onChange({ speakers })} />}
              {tenant.extras.sensors && <Toggle label="Eső- és szélszenzor" description="Automata tetőzárás esőben" icon={CloudRain} price={formatHuf(prices.sensorsNet)} checked={config.sensors} onChange={(sensors) => onChange({ sensors })} />}
            </div>
            {limits.maxHeaters > 0 && <div className="stepper-row"><span><strong>Infravörös teraszfűtés</strong><small>{formatHuf(prices.heaterUnitNet)} / db</small></span><div className="stepper"><button type="button" aria-label="Fűtőpanel csökkentése" disabled={config.heaters === 0} onClick={() => onChange({ heaters: Math.max(0, config.heaters - 1) })}><Minus size={15} /></button><span>{config.heaters} db</span><button type="button" aria-label="Fűtőpanel növelése" disabled={config.heaters >= limits.maxHeaters} onClick={() => onChange({ heaters: Math.min(limits.maxHeaters, config.heaters + 1) })}><Plus size={15} /></button></div></div>}
          </>}

          {step === 'summary' && summary}
        </div>

        {step !== 'summary' && <details className="scene-settings">
          <summary><span><SlidersHorizontal size={16} />Jelenet és vizualizáció</span><ChevronDown size={15} /></summary>
          <div className="scene-settings-body">
            <SectionTitle title="Napszak" hint="Állítsd be az időpontot, és nézd meg, hogyan változik a jelenet megvilágítása." />
            <div className="time-labels"><span>Reggel</span><strong>{String(Math.floor(scene.dayTime)).padStart(2, '0')}:00</strong><span>Éjjel</span></div>
            <input aria-label="Napszak" className="range-input daylight-range" type="range" min={6} max={23} step={0.25} value={scene.dayTime} onChange={(event) => setDayTime(Number(event.target.value))} />
            <div className="scene-options compact">{([[13, 'Nappal', Sun], [18, 'Aranyóra', Sunset], [22, 'Éjszaka', Moon]] as const).map(([time, label, Icon]) => <button type="button" key={label} className={scene.time === (time === 13 ? 'day' : time === 18 ? 'sunset' : 'night') ? 'selected' : ''} onClick={() => setDayTime(time)}><Icon size={17} /><span>{label}</span></button>)}</div>
            <div className="scene-toggle-grid">
              <Toggle label="Eső" description="Szenzorral automata zárás" checked={scene.rain} onChange={(rain) => onSceneChange({ rain })} />
              <Toggle label="Enyhe szél" description="Növények és ZIP mozgása" checked={scene.wind} onChange={(wind) => onSceneChange({ wind })} />
              <Toggle label="180 cm-es figura" description="A méretek szemléltetéséhez" checked={scene.showPerson} onChange={(showPerson) => onSceneChange({ showPerson })} />
              <Toggle label="Méretcímkék" description="Aktuális méretek centiméterben" checked={scene.showDimensions} onChange={(showDimensions) => onSceneChange({ showDimensions })} />
              <Toggle label="Műszaki jelölések" description="Részletek a 3D modellen" checked={scene.showHotspots} onChange={(showHotspots) => onSceneChange({ showHotspots })} />
              <Toggle label="Automata forgatás" description="Koppintásra megáll" checked={scene.autoRotate} onChange={(autoRotate) => onSceneChange({ autoRotate })} />
            </div>
            <label className="select-field"><span>3D minőség</span><select value={scene.quality} onChange={(event) => onSceneChange({ quality: event.target.value as QualityLevel })}><option value="auto">Automatikus</option><option value="ultra">Ultra</option><option value="high">Magas</option><option value="mobile">Mobil</option></select></label>
            <div className="photo-mode">
              <div><Image size={18} /><span><strong>Előnézet saját fotóval</strong><small>A kép csak ebben a böngészőben jelenik meg.</small></span></div>
              <label className="upload-button"><Upload size={15} />Fotó feltöltése<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPhotoUpload(file); event.target.value = '' }} /></label>
              {scene.photoUrl && <><Toggle label="Fotós előnézet" description="Pergola a saját teraszodon" checked={scene.photoMode} onChange={(photoMode) => onSceneChange({ photoMode })} />{scene.photoMode && <div className="photo-transform"><SliderField label="Vízszintes pozíció" value={scene.photoX} min={-3} max={3} step={0.05} unit="m" onChange={(photoX) => onSceneChange({ photoX })} /><SliderField label="Függőleges pozíció" value={scene.photoY} min={-2} max={2} step={0.05} unit="m" onChange={(photoY) => onSceneChange({ photoY })} /><SliderField label="Méret a fotón" value={scene.photoScale} min={0.5} max={1.8} step={0.05} unit="×" onChange={(photoScale) => onSceneChange({ photoScale })} /></div>}</>}
            </div>
          </div>
        </details>}
      </div>
      <div className="step-navigation"><button type="button" disabled={stepIndex === 0} onClick={() => go(stepIndex - 1)}><ArrowLeft size={16} />Vissza</button><button type="button" className="next-step" disabled={stepIndex === STEPS.length - 1} onClick={() => go(stepIndex + 1)}>{stepIndex === STEPS.length - 2 ? 'Összegzés' : 'Következő'}<ArrowRight size={16} /></button></div>
    </aside>
  )
}
