import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, CloudRain, Columns3, Gauge, Image, LampCeiling, Minus, Moon, Move, Plus, SlidersHorizontal, SolarPanel, Sparkles, Sun, Sunset, Upload, WandSparkles, Zap } from 'lucide-react'
import { isWallSide, MOUNT_DESCRIPTIONS, MOUNT_LABELS, MOUNT_SHORT, MOUNT_TYPES, wallLabel } from '@/lib/mount'
import { formatHuf, formatNumber } from '@/lib/pricing'
import { FanOption, RgbOption, RoofShadeOption, SideSettings, SideStrip, SmartHomeOption } from '@/components/SideAndExtras'
import { enabledRoofs, presetConfig, tenantPrice } from '@/tenants/rules'
import { ROOF_INFO } from '@/lib/roofs'
import { useTenant } from '@/tenants/TenantContext'
import { getSizeRecommendation } from '@/lib/specification'
import { closedSegments } from '@/lib/sides'
import { estimateSolar } from '@/lib/solar'
import FurniturePicker from '@/components/FurniturePicker'
import HouseLook, { WindowMatch } from '@/components/HouseLook'
import { finishPreview, houseSummary, wallColorHex } from '@/lib/house'
import { supportsRoofShade } from '@/lib/roofShade'
import ColorPicker from '@/components/ColorPicker'
import type { ConfigStep, MountType, PergolaConfig, PriceSettings, QualityLevel, RoofType, SceneSettings, SideKey } from '@/types/pergola'

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
  selectedSide: SideKey | 'roof'
  summary: ReactNode
  onStepChange: (step: ConfigStep) => void
  onSideSelect: (side: SideKey | 'roof') => void
  onChange: (patch: Partial<PergolaConfig>) => void
  onSceneChange: (patch: Partial<SceneSettings>) => void
  onPreset: (config: PergolaConfig) => void
  prices: PriceSettings
  onPhotoUpload: (file: File) => void
  /** Mobil alsó lap állása. */
  sheet: SheetState
  onSheetChange: (sheet: SheetState) => void
  /** A tanácsadó megnyitása (4 kérdés → javasolt konfiguráció). */
  onAdvisor?: () => void
  /** Üzemeltetési költség: becsült éves összeg és a részletek megnyitása. */
  energyCost?: number | null
  onEnergy?: () => void
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
          }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
          <span>{metric ? 'cm' : unit}</span>
        </span>
      </div>
      <input id={id} className="range-input ticked" type="range" min={min * factor} max={max * factor} step={step * factor} value={shown} onChange={(event) => onChange(Number(event.target.value) / factor)} />
      <div className="range-limits"><span>{metric ? Math.round(min * factor) : min * factor} {metric ? 'cm' : unit}</span><span>{metric ? Math.round(max * factor) : max * factor} {metric ? 'cm' : unit}</span></div>
    </div>
  )
}

/** A tanácsadó belépője: kiemelt kártya a lépések elején. */
function AdvisorCard({ onOpen }: { onOpen: () => void }) {
  return <button type="button" className="advisor-card" onClick={onOpen}>
    <span className="advisor-card-icon"><WandSparkles size={18} /></span>
    <span><strong>Nem tudod, hol kezdd?</strong><small>4 egyszerű kérdés, és összeállítjuk a hozzád illő pergolát</small></span>
    <ChevronRight size={16} />
  </button>
}

/** Napelemes tető kapcsoló: fix tetőnél be/ki, más tetőnél egy kattintással fix tetőre vált. */
function SolarToggle({ config, prices, onChange }: { config: PergolaConfig; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void }) {
  const { tenant } = useTenant()
  if (!tenant.extras.solar || !tenant.roofs.fixed) return null
  const solar = estimateSolar(config, null)
  const fixedName = tenant.roofs.fixed.name
  if (!solar.layout.count) return null
  const current = tenantPrice(tenant, config, prices).totalGross
  if (config.roof !== 'fixed') {
    const switched = tenantPrice(tenant, { ...config, roof: 'fixed', solar: true }, prices).totalGross
    return <button type="button" className="extra-card solar-switch" onClick={() => onChange({ roof: 'fixed', solar: true })}>
      <SolarPanel size={20} strokeWidth={1.5} />
      <span><strong>Napelemes tető</strong><small>A {fixedName} fix tetőre kérhető · {solar.layout.count} panel, ≈ {formatNumber(Math.round(solar.production / 100) * 100, 0)} kWh/év</small><em>Váltás {fixedName} + napelem: {switched >= current ? '+' : '−'}{formatHuf(Math.abs(switched - current))}</em></span>
      <ArrowRight size={16} />
    </button>
  }
  const delta = config.solar ? current - tenantPrice(tenant, { ...config, solar: undefined }, prices).totalGross : tenantPrice(tenant, { ...config, solar: true }, prices).totalGross - current
  return <Toggle label="Napelemes tető" description={`${solar.layout.count} × 430 Wp = ${formatNumber(solar.layout.kwp, 2)} kWp · ≈ ${formatNumber(Math.round(solar.production / 100) * 100, 0)} kWh/év`} icon={SolarPanel} price={`${config.solar ? '' : '+'}${formatHuf(delta)}`} checked={Boolean(config.solar)} onChange={(solar) => onChange({ solar })} />
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

/** A Szín lépésben: a ház beállított kinézete egy sorban, módosítás a Rögzítés lépésben. */
function HouseContext({ scene, onEdit }: { scene: SceneSettings; onEdit: () => void }) {
  const hex = wallColorHex(scene.wallFinish, scene.wallColor)
  return <button type="button" className="house-context" onClick={onEdit}>
    <span className="house-swatch" style={finishPreview(scene.wallFinish, hex)} aria-hidden="true" />
    <span><small>A házad</small><strong>{houseSummary(scene)}</strong></span>
    <em>Módosítás</em>
  </button>
}

/** Felülnézeti jel: vastag vonal = fal, pont = oszlop. */
function MountIcon({ mount }: { mount: MountType }) {
  const walls = new Set<SideKey>(mount === 'freestanding' ? [] : mount === 'wall' ? ['back'] : mount === 'corner-left' ? ['back', 'left'] : mount === 'corner-right' ? ['back', 'right'] : ['back', 'left', 'right'])
  const posts: [number, number][] = []
  if (!walls.has('back')) posts.push([5, 7], [19, 7])
  if (!walls.has('left')) posts.push([5, 19])
  if (!walls.has('right')) posts.push([19, 19])
  return <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <rect x="5" y="7" width="14" height="12" fill="none" stroke="currentColor" strokeWidth="1" opacity=".55" />
    {walls.has('back') && <path d="M2 5.5h20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />}
    {walls.has('left') && <path d="M3.5 5.5v15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />}
    {walls.has('right') && <path d="M20.5 5.5v15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />}
    {posts.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill="currentColor" />)}
  </svg>
}

function SideDiagram({ config, selected, roofName, onSelect }: { config: PergolaConfig; selected: SideKey | 'roof'; roofName: string; onSelect: (side: SideKey | 'roof') => void }) {
  return (
    <div className="side-diagram" aria-label="Oldal- és tetőválasztó felülnézet">
      {(['back', 'left', 'right', 'front'] as SideKey[]).map((side) => (
        <button key={side} type="button" className={`diagram-${side} ${selected === side ? 'selected' : ''} type-${config.sides[side]}${config.split?.[side] && !isWallSide(config.mount, side) ? ' is-split' : ''}`} disabled={isWallSide(config.mount, side)} onClick={() => onSelect(side)} aria-label={`${side === 'front' ? 'Elülső' : side === 'back' ? 'Hátsó' : side === 'left' ? 'Bal' : 'Jobb'} oldal kiválasztása`} aria-pressed={selected === side}>
          <span>{isWallSide(config.mount, side) ? wallLabel(side) : side === 'front' ? 'Elülső' : side === 'back' ? 'Hátsó' : side === 'left' ? 'Bal' : 'Jobb'}</span>
          {!isWallSide(config.mount, side) && <SideStrip config={config} side={side} />}
        </button>
      ))}
      <button type="button" className={`diagram-core roof-${config.roof} ${selected === 'roof' ? 'selected' : ''}`} onClick={() => onSelect('roof')} aria-pressed={selected === 'roof'} aria-label="Tetőrendszer kiválasztása">
        <span>Tető · {roofName}</span>
        <small>{config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · koppints a cseréhez</small>
      </button>
    </div>
  )
}

/** A tető mozgatása: lamellaszög (forgatható) vagy nyitottság %-ban (eltolható, behúzható). */
function RoofControl({ config, onChange }: { config: PergolaConfig; onChange: (patch: Partial<PergolaConfig>) => void }) {
  const info = ROOF_INFO[config.roof]
  if (info.motion === 'none') return null
  if (info.motion === 'tilt') return <SliderField label="Lamellaszög" value={config.louverAngle} min={0} max={90} step={1} unit="°" onChange={(louverAngle) => onChange({ louverAngle })} />
  return <SliderField label="Tetőnyitás" value={Math.round(config.louverAngle / 0.9)} min={0} max={100} step={1} unit="%" onChange={(open) => onChange({ louverAngle: Math.round(open * 9) / 10 })} />
}

/** Tetőrendszer-választó: név, rövid leírás, tulajdonságok és az árkülönbség a jelenlegi tervhez képest. */
function RoofPicker({ config, prices, onChange }: { config: PergolaConfig; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void }) {
  const { tenant } = useTenant()
  const current = tenantPrice(tenant, config, prices).totalGross
  return <div className="roof-picker">
    {enabledRoofs(tenant).map((roof) => {
      const info = ROOF_INFO[roof]
      const brand = tenant.roofs[roof]!
      const delta = roof === config.roof ? 0 : tenantPrice(tenant, { ...config, roof }, prices).totalGross - current
      return <button type="button" key={roof} className={`roof-card roof-${roof}${config.roof === roof ? ' selected' : ''}`} aria-pressed={config.roof === roof} onClick={() => onChange({ roof })}>
        <span className="roof-card-head"><RoofIcon roof={roof} /><span><strong>{brand.name}</strong><small>{brand.short}</small></span><em>{roof === config.roof ? 'Kiválasztva' : `${delta > 0 ? '+' : '−'}${formatHuf(Math.abs(delta))}`}</em></span>
        <span className="roof-card-text">{brand.description}</span>
        <span className="roof-card-props"><span><b>Árnyék</b>{info.shade}</span><span><b>Eső</b>{info.rain}</span><span><b>Mozgás</b>{info.motion === 'tilt' ? 'Forgatható lamellák' : info.motion === 'slide' ? 'Behúzható / nyitható' : 'Fix'}</span></span>
      </button>
    })}
  </div>
}

function RoofIcon({ roof }: { roof: RoofType }) {
  const common = { width: 28, height: 20, viewBox: '0 0 28 20', 'aria-hidden': true, className: 'roof-icon' } as const
  if (roof === 'louvered' || roof === 'retractable') return <svg {...common}>{[3, 8, 13, 18, 23].map((x, i) => <rect key={x} x={roof === 'retractable' && i > 2 ? x - 6 + i : x} y="5" width="3.2" height="10" rx="1" transform={`rotate(-25 ${x + 1.6} 10)`} />)}</svg>
  if (roof === 'fabric') return <svg {...common}><path d="M2 7 Q6 13 10 7 Q14 13 18 7 Q22 13 26 7" fill="none" strokeWidth="2" /></svg>
  if (roof === 'glass' || roof === 'polycarbonate') return <svg {...common}><rect x="2" y="5" width="24" height="10" rx="1" className={roof === 'glass' ? 'pane-glass' : 'pane-poly'} />{[2, 10, 18, 26].map((x) => <rect key={x} x={x - 1} y="4" width="2" height="12" />)}</svg>
  return <svg {...common}><rect x="2" y="6" width="24" height="8" rx="1" /></svg>
}

export type SheetState = 'peek' | 'half' | 'full'
const SHEET_ORDER: SheetState[] = ['peek', 'half', 'full']

/**
 * Húzható alsó lap (mobil): a fejlécet felfelé/lefelé húzva a következő állásba pattan,
 * koppintásra kicsi ↔ fél. Húzás közben a lap követi az ujjat.
 */
function useSheetGesture(panel: React.RefObject<HTMLElement | null>, sheet: SheetState, onChange: (sheet: SheetState) => void) {
  const drag = useRef<{ y: number; height: number; moved: boolean } | null>(null)
  const finish = (dy: number) => {
    const element = panel.current
    if (element) element.style.removeProperty('height')
    element?.classList.remove('is-dragging')
    const index = SHEET_ORDER.indexOf(sheet)
    if (Math.abs(dy) < 8) { onChange(sheet === 'peek' ? 'half' : 'peek'); return }
    const steps = Math.abs(dy) > 220 ? 2 : 1
    onChange(SHEET_ORDER[Math.max(0, Math.min(2, index + (dy < 0 ? steps : -steps)))])
  }
  return {
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && window.innerWidth > 820) return
      drag.current = { y: event.clientY, height: panel.current?.getBoundingClientRect().height ?? 0, moved: false }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
      const state = drag.current
      const element = panel.current
      if (!state || !element) return
      const dy = event.clientY - state.y
      if (Math.abs(dy) > 6) state.moved = true
      if (!state.moved) return
      element.classList.add('is-dragging')
      const max = (element.parentElement?.getBoundingClientRect().height ?? window.innerHeight) - 16
      element.style.setProperty('height', `${Math.max(96, Math.min(max, state.height - dy))}px`)
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      const state = drag.current
      drag.current = null
      if (!state) return
      finish(state.moved ? event.clientY - state.y : 0)
    },
    onPointerCancel: () => { drag.current = null; panel.current?.style.removeProperty('height'); panel.current?.classList.remove('is-dragging') },
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      // Billentyűzetes aktiválás (Enter/Space) — a mutatós eseményeket a fenti kezelők intézik.
      if (event.detail === 0) onChange(sheet === 'peek' ? 'half' : 'peek')
      else if (window.innerWidth > 820) onChange(sheet === 'peek' ? 'half' : 'peek')
    },
  }
}

export default function ConfiguratorControls({ config, scene, step, selectedSide, summary, onStepChange, onSideSelect, onChange, onSceneChange, onPreset, prices, onPhotoUpload, sheet, onSheetChange, onAdvisor, energyCost, onEnergy }: Props) {
  const { tenant } = useTenant()
  const { limits } = tenant
  const panelRef = useRef<HTMLElement>(null)
  const mobileOpen = sheet !== 'peek'
  const sheetGesture = useSheetGesture(panelRef, sheet, onSheetChange)
  // Lépésváltáskor a lap tetejéről indulunk (ne az előző lépés görgetési helyzetéből).
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [step])
  const [half, setHalf] = useState<0 | 1>(0)
  // Másik oldal kiválasztásakor az első féllel kezdünk (render közbeni szinkron, effect nélkül).
  const [halfSide, setHalfSide] = useState(selectedSide)
  if (halfSide !== selectedSide) { setHalfSide(selectedSide); setHalf(0) }
  const sideSettings = (side: SideKey) => isWallSide(config.mount, side)
    ? <div className="selected-side-head"><strong>{sideNames[side]}</strong><span>{wallLabel(side)} · rögzítési oldal</span></div>
    : <>
      <SideSettings side={side} sideName={sideNames[side]} config={config} scene={scene} prices={prices} half={half} onHalfChange={setHalf} onChange={onChange} onSceneChange={onSceneChange} />
      {hasZip && <div className="inline-setting"><SliderField label="ZIP screen nyitottsága" value={config.screenOpen} min={0} max={100} step={1} unit="%" onChange={(screenOpen) => onChange({ screenOpen })} /></div>}
    </>
  const roofLabelsFor = (roof: RoofType) => `${tenant.roofs[roof]?.name ?? ''} · ${tenant.roofs[roof]?.short ?? ''}`
  const touchStart = useRef(0)
  const stepIndex = STEPS.findIndex((item) => item.id === step)
  const hasZip = closedSegments(config).some((segment) => segment.type === 'zip')
  const go = (index: number) => onStepChange(STEPS[Math.max(0, Math.min(STEPS.length - 1, index))].id)
  const touchEnd = (event: TouchEvent) => {
    const distance = event.changedTouches[0].clientX - touchStart.current
    if (Math.abs(distance) > 55) go(stepIndex + (distance < 0 ? 1 : -1))
  }
  const setDayTime = (dayTime: number) => onSceneChange({ dayTime, time: dayTime >= 20 || dayTime < 7 ? 'night' : dayTime >= 17 ? 'sunset' : 'day' })
  const sideNames: Record<SideKey, string> = { front: 'Elülső oldal', back: 'Hátsó oldal', left: 'Bal oldal', right: 'Jobb oldal' }

  return (
    <aside ref={panelRef} className={`controls-panel glass-panel sheet-${sheet} ${mobileOpen ? 'is-mobile-open' : ''}`} aria-label="Pergola beállításai" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX }} onTouchEnd={touchEnd}>
      <button type="button" className="sheet-toggle" aria-expanded={mobileOpen} aria-label={sheet === 'peek' ? 'Pergola beállításainak megnyitása' : 'Beállítások összecsukása a 3D nézethez'} {...sheetGesture}><span className="sheet-handle" aria-hidden="true" /><span><SlidersHorizontal size={16} />{sheet === 'peek' ? 'Beállítások' : sheet === 'half' ? 'Húzd fel a teljes nézethez' : 'Vissza a 3D nézethez'}</span><ChevronDown size={16} /></button>
      <div className="config-head">
        <div><span>Konfiguráció</span><strong>{String(stepIndex + 1).padStart(2, '0')} / 06</strong></div>
        <span className="mini-summary">{config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · {MOUNT_SHORT[config.mount]}</span>
      </div>
      <div className="control-tabs" role="tablist" aria-label="Konfigurációs lépések">
        {STEPS.map((item, index) => (
          <button key={item.id} type="button" role="tab" aria-selected={step === item.id} className={`${step === item.id ? 'active' : ''} ${index < stepIndex ? 'complete' : ''}`} onClick={() => onStepChange(item.id)} title={item.label}>
            <span className="step-dot">{index < stepIndex ? <Check size={11} /> : index + 1}</span><span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="controls-scroll" ref={scrollRef}>
        <div className="panel-content" role="tabpanel" key={step}>
          <div className="step-heading"><span>0{stepIndex + 1} · {STEPS[stepIndex].short}</span><h2>{STEPS[stepIndex].label}</h2></div>

          {step === 'size' && <>
            {onAdvisor && <AdvisorCard onOpen={onAdvisor} />}
            <SectionTitle title="Külső szerkezeti méretek" hint="Írd be az értékeket centiméterben, vagy használd a csúszkákat." />
            <SliderField label="Szélesség" value={config.width} min={limits.width[0]} max={limits.width[1]} step={0.05} unit="m" metric onChange={(width) => onChange({ width })} />
            <SliderField label="Mélység" value={config.depth} min={limits.depth[0]} max={limits.depth[1]} step={0.05} unit="m" metric onChange={(depth) => onChange({ depth })} />
            <SliderField label="Oszlopmagasság" value={config.height} min={limits.height[0]} max={limits.height[1]} step={0.05} unit="m" metric onChange={(height) => onChange({ height })} />
            {config.width > 6 && <div className="smart-warning"><Columns3 size={18} /><p><strong>Középoszlop javasolt</strong>600 cm felett a műszaki ellenőrzés és egy középoszlop szükséges lehet.</p></div>}
            <div className="smart-helper"><Sparkles size={18} /><p><strong>{getSizeRecommendation(config).split(' · ')[0]}</strong>{getSizeRecommendation(config).split(' · ')[1]}</p></div>
            <FurniturePicker config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
            <RoofControl config={config} onChange={onChange} />
          </>}

          {step === 'mount' && <>
            <SectionTitle title="Kiinduló csomagok" hint="Egy koppintással indulhatsz, utána minden paraméter szabadon módosítható." />
            {onAdvisor && <AdvisorCard onOpen={onAdvisor} />}
            <div className="preset-list">{tenant.presets.map((preset) => <button type="button" key={preset.id} onClick={() => onPreset(presetConfig(tenant, preset.config))}><strong>{preset.name}</strong><span>{preset.description}</span><ArrowRight size={15} /></button>)}</div>
            <SectionTitle title="Rögzítés" hint="A falak, az oszlopok és az ár a modellen is azonnal frissülnek." />
            <div className="roof-options mount-options">{MOUNT_TYPES.filter((mount) => tenant.mounts.includes(mount)).map((mount) => <button type="button" key={mount} className={config.mount === mount ? 'selected' : ''} aria-pressed={config.mount === mount} onClick={() => onChange({ mount })}><MountIcon mount={mount} /><span><strong>{MOUNT_LABELS[mount]}</strong><small>{MOUNT_DESCRIPTIONS[mount]}</small></span><span className="selection-dot">{config.mount === mount && <Check size={12} />}</span></button>)}</div>
            <SectionTitle title="A házad" hint="Állítsd be, hogy a 3D ház a tiédre hasonlítson — így látod, milyen pergola illik hozzá." />
            <HouseLook config={config} scene={scene} photoUrl={scene.photoUrl ?? null} onSceneChange={onSceneChange} onChange={onChange} />
          </>}

          {step === 'color' && <>
            <SectionTitle title="Porszórt alumínium" hint="Alapszín felár nélkül, vagy bármely RAL szín. A 3D modell azonnal mutatja." />
            <div className="house-color-context">
              <HouseContext scene={scene} onEdit={() => onStepChange('mount')} />
              <WindowMatch config={config} scene={scene} onChange={onChange} />
            </div>
            <ColorPicker config={config} prices={prices} photoUrl={scene.photoUrl ?? null} onChange={onChange} />
          </>}

          {step === 'sides' && <>
            <SectionTitle title="Oldalak és tető" hint="Koppints egy oldalra vagy a középső mezőre (tető). Az oldalak a 3D modellen is kiválaszthatók." />
            <SideDiagram config={config} selected={selectedSide} roofName={tenant.roofs[config.roof]?.name ?? ''} onSelect={onSideSelect} />
            {selectedSide === 'roof' ? <>
              <div className="selected-side-head"><strong>Tetőrendszer</strong><span>{roofLabelsFor(config.roof)}</span></div>
              <RoofPicker config={config} prices={prices} onChange={onChange} />
              <RoofControl config={config} onChange={onChange} />
              <RoofShadeOption config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
              {config.roof === 'fixed' && <div className="extra-grid roof-solar"><SolarToggle config={config} prices={prices} onChange={onChange} /></div>}
            </> : sideSettings(selectedSide)}
            <div className="interaction-hint"><Move size={17} /><p>A tolóüveg és az oldallamella a 3D-ben kattintásra, illetve a fenti gombbal is mozgatható. Egy oldal két részre is osztható, például fele tolóüveg, fele lécfal.</p></div>
          </>}

          {step === 'extras' && <>
            <SectionTitle title="Világítás és hangulat" hint="Minden opció azonnal megjelenik a modellen és a tételes árban." />
            <div className="extra-grid">
              {tenant.extras.led && <Toggle label="Periméter LED" description="Rejtett, beépített világítás" icon={LampCeiling} price={`${formatHuf(prices.ledPerMeterNet)} / fm`} checked={config.led} onChange={(led) => onChange({ led, ...(led ? {} : { ledRgb: undefined }) })} />}
              <RgbOption config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
              {tenant.extras.speakers && <Toggle label="Bluetooth hangrendszer" description="Egy pár beépített hangszóró" icon={Zap} price={formatHuf(prices.speakerPairNet)} checked={config.speakers} onChange={(speakers) => onChange({ speakers })} />}
            </div>
            <SectionTitle title="Hő és légmozgás" hint={supportsRoofShade(config.roof) && tenant.extras.roofShade ? 'Árnyékoló a nyári napra, ventilátor a hőségre, fűtés a hűvös estékre.' : 'Fűtés a hűvös estékre, ventilátor a nyári hőségre.'} />
            <RoofShadeOption config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
            {limits.maxHeaters > 0 && <div className="stepper-row"><span><strong>Infravörös teraszfűtés</strong><small>{formatHuf(prices.heaterUnitNet)} / db</small></span><div className="stepper"><button type="button" aria-label="Fűtőpanel csökkentése" disabled={config.heaters === 0} onClick={() => onChange({ heaters: Math.max(0, config.heaters - 1) })}><Minus size={15} /></button><span>{config.heaters} db</span><button type="button" aria-label="Fűtőpanel növelése" disabled={config.heaters >= limits.maxHeaters} onClick={() => onChange({ heaters: Math.min(limits.maxHeaters, config.heaters + 1) })}><Plus size={15} /></button></div></div>}
            <FanOption config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
            <SectionTitle title="Vezérlés és energia" hint="Automatika, egy appból irányítható rendszer és napelem." />
            <div className="extra-grid">
              {tenant.extras.sensors && <Toggle label="Eső- és szélszenzor" description="Automata tetőzárás esőben" icon={CloudRain} price={formatHuf(prices.sensorsNet)} checked={config.sensors} onChange={(sensors) => onChange({ sensors })} />}
              <SmartHomeOption config={config} prices={prices} onChange={onChange} />
              <SolarToggle config={config} prices={prices} onChange={onChange} />
            </div>
            {onEnergy && <button type="button" className="energy-trigger" onClick={onEnergy}><Gauge size={16} /><span><strong>{energyCost ? `Üzemeltetés ≈ ${formatHuf(energyCost)} / év` : 'Üzemeltetési költség'}</strong><small>{energyCost ? 'Áramköltség a valós lakossági tarifával · részletek' : 'Nincs áramfogyasztó a tervben'}</small></span><ChevronRight size={15} /></button>}
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
              <Toggle label="Követő kamera" description="A választáshoz fordul (oldal, szín, ventilátor)" checked={scene.autoCamera} onChange={(autoCamera) => onSceneChange({ autoCamera })} />
            </div>
            <label className="select-field"><span>3D minőség</span><select value={scene.quality} onChange={(event) => onSceneChange({ quality: event.target.value as QualityLevel })}><option value="auto">Automatikus</option><option value="ultra">Ultra</option><option value="high">Magas</option><option value="mobile">Mobil</option></select></label>
            <div className="photo-mode">
              <div><Image size={18} /><span><strong>Előnézet saját fotóval</strong><small>A kép csak ebben a böngészőben jelenik meg.</small></span></div>
              <label className="upload-button"><Upload size={15} />Fotó feltöltése<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPhotoUpload(file); event.target.value = '' }} /></label>
              {scene.photoUrl && <><Toggle label="Fotós előnézet" description="Pergola a saját teraszodon" checked={scene.photoMode} onChange={(photoMode) => onSceneChange({ photoMode, ...(photoMode ? { winter: false } : {}) })} />{scene.photoMode && <div className="photo-transform"><SliderField label="Vízszintes pozíció" value={scene.photoX} min={-3} max={3} step={0.05} unit="m" onChange={(photoX) => onSceneChange({ photoX })} /><SliderField label="Függőleges pozíció" value={scene.photoY} min={-2} max={2} step={0.05} unit="m" onChange={(photoY) => onSceneChange({ photoY })} /><SliderField label="Méret a fotón" value={scene.photoScale} min={0.5} max={1.8} step={0.05} unit="×" onChange={(photoScale) => onSceneChange({ photoScale })} /></div>}</>}
            </div>
          </div>
        </details>}
      </div>
      <div className="step-navigation"><button type="button" disabled={stepIndex === 0} onClick={() => go(stepIndex - 1)}><ArrowLeft size={16} />Vissza</button><button type="button" className="next-step" disabled={stepIndex === STEPS.length - 1} onClick={() => go(stepIndex + 1)}>{stepIndex === STEPS.length - 2 ? 'Összegzés' : 'Következő'}<ArrowRight size={16} /></button></div>
    </aside>
  )
}
