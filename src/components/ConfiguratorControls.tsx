import { issuesForStep, STEPS } from '@/lib/configSteps'
import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { ArrowLeft, ArrowLeftRight, ArrowRight, Box, Check, ChevronDown, ChevronRight, Lock, CloudRain, Cog, Columns3, Gauge, House, Image, LampCeiling, Minus, Moon, Move, Plus, SlidersHorizontal, SolarPanel, Sparkles, Sun, Sunset, Upload, WandSparkles, Zap } from 'lucide-react'
import { LOCKED_STEPS } from '@/lib/expansion'
import { isWallSide, MOUNT_DESCRIPTIONS, MOUNT_LABELS, MOUNT_SHORT, MOUNT_TYPES, wallLabel } from '@/lib/mount'
import { formatPrice, formatNumber } from '@/lib/pricing'
import { bayWidth, moduleCount, modulesLabel } from '@/lib/modules'
import { FanOption, RgbOption, RoofShadeOption, SideSettings, SideStrip, SmartHomeOption } from '@/components/SideAndExtras'
import { enabledRoofs, presetConfig, tenantPrice } from '@/tenants/rules'
import { defaultGlazing, effectiveGlazing, GLAZING_INFO, glazingOptions, glazingPriceKey, PITCH_RANGE, ROOF_INFO, roofRise, sensorsApplicable } from '@/lib/roofs'
import { SMART_LOUVER_TEXT, smartLouver } from '@/lib/smartLouver'
import { sceneSunVector } from '@/lib/sceneSun'
import { useTenant } from '@/tenants/TenantContext'
import { getSizeRecommendation } from '@/lib/specification'
import { closedSegments } from '@/lib/sides'
import { estimateSolar } from '@/lib/solar'
import FurniturePicker from '@/components/FurniturePicker'
import HouseLook, { StyleIcon, WindowMatch } from '@/components/HouseLook'
import { findWindowColor, finishPreview, HOUSE_STYLE_INFO, HOUSE_STYLES, houseStylePatch, houseSummary, wallColorHex, wallColorName } from '@/lib/house'
import { describeColor } from '@/lib/colors'
import ColorPicker from '@/components/ColorPicker'
import { BuildingIssues, BuildingPicker, ClimateSection, WallGlazingPicker, type ModularChoice } from '@/components/BuildingControls'
import { BUILDING_ROOFS, isClosedBuilding } from '@/lib/buildings'
import type { ConfigStep, MountType, PergolaConfig, PriceSettings, QualityLevel, RoofType, SceneSettings, SideKey } from '@/types/pergola'
import { isSheetLayout } from '@/lib/viewport'
import DemoDevicePanel from '@/components/DemoDevicePanel'
import { useDemoDevice } from '@/lib/demoDevice'
import { TIER_LABEL, detectQualityTier, qualityAboveDevice, type QualityTier } from '@/lib/quality'
import { tr } from '../i18n/locale'

// A lépések sorrendje a döntések természetes rendje: mit → mekkora és hogyan áll → tető és zárás → szín → komfort → felmérés.
// Az azonosítók történeti okból maradtak ('size' = Típus, 'mount' = Elhelyezés és méret, 'roof' = Tető, 'sides' = Oldalak, 'extras' = Komfort).

interface Props {
  /** Bővítés a tulajdonosi oldalról: a méret, rögzítés, szín lépés zárolt, a tetőnél csak az árnyékoló választható. */
  expansion?: boolean
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
  /** Mobil alsó lap állása. */
  sheet: SheetState
  onSheetChange: (sheet: SheetState) => void
  /** A tanácsadó megnyitása (4 kérdés → javasolt konfiguráció). */
  onAdvisor?: () => void
  /** A „Mit építesz?” választó modulház-kártyája (ha a gyártó kínálja). */
  modular?: ModularChoice
  /** Üzemeltetési költség: becsült éves összeg és a részletek megnyitása. */
  energyCost?: number | null
  onEnergy?: () => void
  /** A panel alján, a lépésgombok fölött (asztali nézetben az élő ár és a Részletek gomb). */
  footer?: ReactNode
  /** Telefonos elrendezésben a panel alsó sora (ár + következő lépés). */
  mobileBar?: ReactNode
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
          <input aria-label={`${label} ${tr('értéke', 'Wert in')} ${metric ? tr('centiméterben', 'Zentimetern') : unit}`} type="number" min={min * factor} max={max * factor} step={step * factor} value={draft} onChange={(event) => {
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
    <span><strong>{tr('Nem tudod, hol kezdd?', 'Unsicher, wo Sie anfangen sollen?')}</strong><small>{tr('4 egyszerű kérdés, és összeállítjuk a hozzád illő pergolát', '4 einfache Fragen, und wir stellen Ihre passende Pergola zusammen')}</small></span>
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
      <span><strong>{tr('Napelemes tető', 'Photovoltaik-Dach')}</strong><small>{tr(`A ${fixedName} fix tetőre kérhető`, `Für das feste Dach ${fixedName} erhältlich`)} · {solar.layout.count} {tr('panel', 'Module')}, ≈ {formatNumber(Math.round(solar.production / 100) * 100, 0)} kWh/{tr('év', 'Jahr')}</small><em>{tr('Váltás', 'Wechsel zu')} {fixedName} + {tr('napelem', 'PV')}: {switched >= current ? '+' : '−'}{formatPrice(Math.abs(switched - current))}</em></span>
      <ArrowRight size={16} />
    </button>
  }
  const delta = config.solar ? current - tenantPrice(tenant, { ...config, solar: undefined }, prices).totalGross : tenantPrice(tenant, { ...config, solar: true }, prices).totalGross - current
  return <Toggle label={tr('Napelemes tető', 'Photovoltaik-Dach')} description={`${solar.layout.count} × 430 Wp = ${formatNumber(solar.layout.kwp, 2)} kWp · ≈ ${formatNumber(Math.round(solar.production / 100) * 100, 0)} kWh/${tr('év', 'Jahr')}`} icon={SolarPanel} price={`${config.solar ? '' : '+'}${formatPrice(delta)}`} checked={Boolean(config.solar)} onChange={(solar) => onChange({ solar })} />
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
    <span><small>{tr('A házad', 'Ihr Haus')}</small><strong>{houseSummary(scene)}</strong></span>
    <em>{tr('Módosítás', 'Ändern')}</em>
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
    <div className="side-diagram" aria-label={tr('Oldal- és tetőválasztó felülnézet', 'Draufsicht zur Seiten- und Dachauswahl')}>
      {(['back', 'left', 'right', 'front'] as SideKey[]).map((side) => (
        <button key={side} type="button" className={`diagram-${side} ${selected === side ? 'selected' : ''} type-${config.sides[side]}${config.split?.[side] && !isWallSide(config.mount, side) ? ' is-split' : ''}`} disabled={isWallSide(config.mount, side)} onClick={() => onSelect(side)} aria-label={tr(`${side === 'front' ? tr('Elülső', 'Vorne') : side === 'back' ? tr('Hátsó', 'Hinten') : side === 'left' ? 'Bal' : 'Jobb'} oldal kiválasztása`, `${side === 'front' ? 'Vordere' : side === 'back' ? 'Hintere' : side === 'left' ? 'Linke' : 'Rechte'} Seite auswählen`)} aria-pressed={selected === side}>
          <span>{isWallSide(config.mount, side) ? wallLabel(side) : side === 'front' ? tr('Elülső', 'Vorne') : side === 'back' ? tr('Hátsó', 'Hinten') : side === 'left' ? tr('Bal', 'Links') : tr('Jobb', 'Rechts')}</span>
          {!isWallSide(config.mount, side) && <SideStrip config={config} side={side} />}
        </button>
      ))}
      <button type="button" className={`diagram-core roof-${config.roof} ${selected === 'roof' ? 'selected' : ''}`} onClick={() => onSelect('roof')} aria-pressed={selected === 'roof'} aria-label={tr('Tetőrendszer kiválasztása', 'Dachsystem auswählen')}>
        <span>{tr('Tető', 'Dach')} · {roofName}</span>
        <small>{config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · {tr('koppints a mozgatáshoz', 'zum Bewegen antippen')}</small>
      </button>
    </div>
  )
}

/** A tető mozgatása: lamellaszög (forgatható) vagy nyitottság %-ban (eltolható, behúzható). */
function RoofControl({ config, scene, onChange, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const info = ROOF_INFO[config.roof]
  if (info.motion === 'none') return null
  const smart = !!scene.smartLouver && config.roof === 'louvered' && !scene.mechanism
  const tracked = smart ? smartLouver(sceneSunVector(scene)) : null
  if (info.motion === 'tilt') return <>
    <SliderField label={tr('Lamellaszög', 'Lamellenwinkel')} value={tracked ? tracked.angle : config.louverAngle} min={0} max={90} step={1} unit="°" onChange={(louverAngle) => { onChange({ louverAngle }); if (scene.mechanism || scene.smartLouver) onSceneChange({ mechanism: false, smartLouver: false }) }} />
    {config.roof === 'louvered' && <button type="button" className={`mech-cta smart-cta${smart ? ' selected' : ''}`} aria-pressed={smart} onClick={() => onSceneChange({ smartLouver: !smart, mechanism: false })}><Sun size={16} /><span><strong>{smart ? tr('Okos mód: a lamellák a napot követik', 'Smart-Modus: Lamellen folgen der Sonne') : tr('Okos mód: kövesse a napot', 'Smart-Modus: der Sonne folgen')}</strong><small>{tracked ? SMART_LOUVER_TEXT[tracked.reason] : tr('A legnagyobb nyitás, ami még teljes árnyékot ad — a napszak csúszkával együtt mozog', 'Die größte Öffnung, die noch vollen Schatten gibt — bewegt sich mit dem Tageszeit-Regler')}</small></span></button>}
    {config.roof === 'louvered' && <button type="button" className={`mech-cta${scene.mechanism ? ' selected' : ''}`} aria-pressed={!!scene.mechanism} onClick={() => onSceneChange({ mechanism: !scene.mechanism, sunStudy: false, exploded: false, smartLouver: false })}><Cog size={16} /><span><strong>{scene.mechanism ? tr('Bemutató leállítása', 'Vorführung stoppen') : tr('Nézd meg működés közben', 'In Bewegung ansehen')}</strong><small>{tr('Motor, hajtórúd és lamellák élőben, valós gyári adatokkal', 'Motor, Antriebsstange und Lamellen live, mit realen Herstellerdaten')}</small></span></button>}
  </>
  return <SliderField label={tr('Tetőnyitás', 'Dachöffnung')} value={Math.round(config.louverAngle / 0.9)} min={0} max={100} step={1} unit="%" onChange={(open) => onChange({ louverAngle: Math.round(open * 9) / 10 })} />
}

/** Tetőburkolat-választó (üveg: tiszta / matt / hővisszaverő; polikarbonát: opál / tiszta / hővisszaverő). */
function GlazingPicker({ config, prices, onChange }: { config: PergolaConfig; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void }) {
  const options = glazingOptions(config.roof)
  if (!options.length) return null
  const current = effectiveGlazing(config)
  return <div className="glazing-picker">
    <SectionTitle title={config.roof === 'glass' ? tr('Üveg típusa', 'Glasart') : tr('Polikarbonát típusa', 'Polycarbonat-Art')} hint={tr('Tiszta, matt, opál, hővisszaverő vagy füstös: ez dönti el, mennyi fény és hő jut be. A számok tájékoztató értékek.', 'Klar, matt, opal, wärmereflektierend oder getönt: das bestimmt, wie viel Licht und Wärme hereinkommt. Die Zahlen sind Richtwerte.')} />
    <div className="glazing-chips" role="radiogroup" aria-label={tr('Tetőburkolat', 'Dacheindeckung')}>{options.map((id) => {
      const info = GLAZING_INFO[id]
      const priceKey = glazingPriceKey(config.roof, id)
      const price = priceKey ? prices[priceKey] : 0
      return <button type="button" key={id} role="radio" aria-checked={current === id} className={`glazing-chip glazing-${id}${current === id ? ' selected' : ''}`} onClick={() => onChange({ glazing: id === defaultGlazing(config.roof) ? undefined : id })}>
        <span className="glazing-swatch" aria-hidden="true" /><strong>{info.label}</strong><small>{info.short}</small><small className="lt">Fény {info.light} · hő {info.solar}</small><em>{price > 0 ? `+${formatPrice(price)} / m²` : 'Alapkivitel'}</em>
      </button>
    })}</div>
  </div>
}

/** Tetőrendszer-választó: név, rövid leírás, tulajdonságok és az árkülönbség a jelenlegi tervhez képest. */
function RoofPicker({ config, prices, onChange }: { config: PergolaConfig; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void }) {
  const { tenant } = useTenant()
  const current = tenantPrice(tenant, config, prices).totalGross
  return <div className="roof-picker">
    {enabledRoofs(tenant).filter((roof) => !isClosedBuilding(config.building) || BUILDING_ROOFS[config.building].includes(roof)).map((roof) => {
      const info = ROOF_INFO[roof]
      const brand = tenant.roofs[roof]!
      const delta = roof === config.roof ? 0 : tenantPrice(tenant, { ...config, roof }, prices).totalGross - current
      return <button type="button" key={roof} className={`roof-card roof-${roof}${config.roof === roof ? ' selected' : ''}`} aria-pressed={config.roof === roof} onClick={() => { onChange({ roof }); if (glazingOptions(roof).length && roof !== config.roof) window.setTimeout(() => document.querySelector('.glazing-picker:not(.wall-glazing)')?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 120) }}>
        <span className="roof-card-head"><RoofIcon roof={roof} /><span><strong>{brand.name}</strong><small>{brand.short}</small></span><em>{roof === config.roof ? tr('Kiválasztva', 'Ausgewählt') : `${delta > 0 ? '+' : '−'}${formatPrice(Math.abs(delta))}`}</em></span>
        <span className="roof-card-text">{brand.description}</span>
        <span className="roof-card-props"><span><b>{tr('Árnyék', 'Schatten')}</b>{info.shade}</span><span><b>{tr('Eső', 'Regen')}</b>{info.rain}</span><span><b>{tr('Mozgás', 'Bewegung')}</b>{info.motion === 'tilt' ? tr('Forgatható lamellák', 'Drehbare Lamellen') : info.motion === 'slide' ? tr('Behúzható / nyitható', 'Einfahrbar / öffenbar') : 'Fix'}</span></span>
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
      if (event.pointerType === 'mouse' && !isSheetLayout()) return
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
      else if (!isSheetLayout()) onChange(sheet === 'peek' ? 'half' : 'peek')
    },
  }
}

/** Jelenet és vizualizáció: lebegő „Nézet” panel (nem lépés — a beállítások a 3D-nézeten azonnal látszanak). */
export function SceneSettingsPanel({ config, scene, prices, onChange, onSceneChange, onPhotoUpload }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void; onPhotoUpload: (file: File) => void }) {
  const [detectedTier] = useState(() => detectQualityTier())
  const demoDevice = useDemoDevice()
  const setDayTime = (dayTime: number) => onSceneChange({ dayTime, time: dayTime >= 20 || dayTime < 7 ? 'night' : dayTime >= 17 ? 'sunset' : 'day' })
  const carport = config.building === 'carport'
  const thing = carport ? tr('a carport', 'Carport') : tr('a pergola', 'Pergola')
  return (
          <div className="scene-settings-body">
            <SectionTitle title={tr('Napszak', 'Tageszeit')} hint={tr('Állítsd be az időpontot, és nézd meg, hogyan változik a jelenet megvilágítása.', 'Stellen Sie die Uhrzeit ein und sehen Sie, wie sich die Beleuchtung ändert.')} />
            <div className="time-labels"><span>Reggel</span><strong>{String(Math.floor(scene.dayTime)).padStart(2, '0')}:00</strong><span>{tr('Éjjel', 'Nachts')}</span></div>
            <input aria-label={tr('Napszak', 'Tageszeit')} className="range-input daylight-range" type="range" min={6} max={23} step={0.25} value={scene.dayTime} onChange={(event) => setDayTime(Number(event.target.value))} />
            <div className="scene-options compact">{([[13, tr('Nappal', 'Tag'), Sun], [18, tr('Aranyóra', 'Goldene Stunde'), Sunset], [22, tr('Éjszaka', 'Nacht'), Moon]] as const).map(([time, label, Icon]) => <button type="button" key={label} className={scene.time === (time === 13 ? 'day' : time === 18 ? 'sunset' : 'night') ? 'selected' : ''} onClick={() => setDayTime(time)}><Icon size={17} /><span>{label}</span></button>)}</div>
            {!scene.sunStudy && <div className="inline-setting"><SliderField label={tr('Napirány', 'Sonnenrichtung')} value={scene.sunDirection ?? 0} min={0} max={360} step={5} unit="°" onChange={(sunDirection) => onSceneChange({ sunDirection: sunDirection % 360 })} /><p className="split-note">{carport ? tr('A nap járásának elforgatása a telek körül: az árnyék oda esik, ahova nálad.', 'Den Sonnenlauf um das Grundstück drehen: der Schatten fällt dorthin, wo er bei Ihnen fällt.') : tr('A nap járásának elforgatása a terasz körül: az árnyék oda esik, ahova a te teraszodon.', 'Den Sonnenlauf um die Terrasse drehen: der Schatten fällt dorthin, wo er auf Ihrer Terrasse fällt.')} Pontos helyszín és dátum szerint az Árnyékelemzésben.</p></div>}
            <SectionTitle title={tr('Környezet', 'Umgebung')} hint={carport ? tr('Családi ház előtt, vagy csak a carport semleges háttér előtt – katalógus-bemutatóhoz.', 'Vor einem Einfamilienhaus oder nur der Carport vor neutralem Hintergrund – für die Katalogpräsentation.') : tr('Családi ház teraszán, vagy csak a pergola semleges háttér előtt – vendéglátós, ipari vagy katalógus-bemutatóhoz.', 'Auf der Terrasse eines Einfamilienhauses oder nur die Pergola vor neutralem Hintergrund – für Gastronomie, Gewerbe oder Katalog.')} />
            <div className="scene-options compact two" role="radiogroup" aria-label={tr('Környezet', 'Umgebung')}>
              {([['terrace', tr('Családi ház', 'Einfamilienhaus'), House], ['studio', tr(`Csak ${thing}`, `Nur ${thing}`), Box]] as const).map(([ground, label, Icon]) => { const active = (scene.ground === 'studio') === (ground === 'studio'); return <button type="button" role="radio" aria-checked={active} key={ground} className={active ? 'selected' : ''} onClick={() => onSceneChange({ ground })}><Icon size={17} /><span>{label}</span></button> })}
            </div>
            {/* A ház típusa mindig választható: stúdió háttérből a választás a „Családi ház” környezetre vált (lásd houseStylePatch). */}
            <div className="scene-options compact house-styles" role="radiogroup" aria-label={tr('Ház típusa', 'Haustyp')}>
              {HOUSE_STYLES.map((style) => { const active = scene.ground !== 'studio' && (scene.houseStyle ?? 'classic') === style; return <button type="button" role="radio" aria-checked={active} key={style} className={active ? 'selected' : ''} onClick={() => { const patch = houseStylePatch(scene, style); if (Object.keys(patch).length) onSceneChange(patch) }}><StyleIcon style={style} /><span>{HOUSE_STYLE_INFO[style].label}</span></button> })}
            </div>
            {/* A berendezés a jelenet része (nem a terméké): itt van, a környezet mellett, nem a lépések között. */}
            {!carport && <FurniturePicker config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />}
            <div className="scene-toggle-grid">
              <Toggle label={tr('180 cm-es figura', '180-cm-Figur')} description={tr('A méretek szemléltetéséhez', 'Zur Veranschaulichung der Größe')} checked={scene.showPerson} onChange={(showPerson) => onSceneChange({ showPerson })} />
              <Toggle label={tr('Méretcímkék', 'Maßangaben')} description={tr('Aktuális méretek centiméterben', 'Aktuelle Maße in Zentimetern')} checked={scene.showDimensions} onChange={(showDimensions) => onSceneChange({ showDimensions })} />
              <Toggle label={tr('Műszaki jelölések', 'Technische Markierungen')} description={tr('Részletek a 3D modellen', 'Details am 3D-Modell')} checked={scene.showHotspots} onChange={(showHotspots) => onSceneChange({ showHotspots })} />
              <Toggle label={tr('Feliratok a 3D-ben', 'Beschriftungen in 3D')} description={tr('Kattintási tippek és a Működés címkéi', 'Klick-Tipps und Beschriftungen der Funktionsvorführung')} checked={scene.labels !== false} onChange={(labels) => onSceneChange({ labels })} />
              <Toggle label={tr('Robbantott nézet', 'Explosionsansicht')} description={tr('A szerkezet elemei szétválasztva', 'Die Bauteile auseinandergezogen')} checked={scene.exploded} onChange={(exploded) => onSceneChange({ exploded })} />
              <Toggle label={tr('Automata forgatás', 'Automatisch drehen')} description={tr('Koppintásra megáll', 'Stoppt beim Antippen')} checked={scene.autoRotate} onChange={(autoRotate) => onSceneChange({ autoRotate })} />
              <Toggle label={tr('Követő kamera', 'Mitführende Kamera')} description={carport ? tr('A választáshoz fordul (szín, tető)', 'Dreht sich zur Auswahl (Farbe, Dach)') : tr('A választáshoz fordul (oldal, szín, ventilátor)', 'Dreht sich zur Auswahl (Seite, Farbe, Ventilator)')} checked={scene.autoCamera} onChange={(autoCamera) => onSceneChange({ autoCamera })} />
            </div>
            <label className="select-field"><span>{tr('3D minőség', '3D-Qualität')}</span><select value={demoDevice ? 'ultra' : scene.quality} disabled={demoDevice} aria-describedby={demoDevice ? 'quality-locked' : undefined} onChange={(event) => onSceneChange({ quality: event.target.value as QualityLevel })}><option value="auto">Automatikus ({TIER_LABEL[detectedTier].toLowerCase()} ezen az eszközön)</option><option value="ultra">Ultra</option><option value="high">Magas</option><option value="medium">{tr('Közepes', 'Mittel')}</option><option value="low">Alacsony</option></select></label>
            {demoDevice && <p id="quality-locked" className="field-hint" role="note">{tr('A bemutató eszköz mód rögzíti: Ultra (automatikus visszaléptetés nélkül).', 'Im Vorführgerät-Modus fixiert: Ultra (ohne automatisches Zurückstufen).')}</p>}
            {!demoDevice && qualityAboveDevice(scene.quality, detectedTier) && <p className="field-hint quality-hint" role="note">Ezen az eszközön a(z) {TIER_LABEL[scene.quality as QualityTier].toLowerCase()} szint akadozhat. Az Automatikus a gép teljesítményéhez igazítja a képet.</p>}
            <DemoDevicePanel />
            <div className="photo-mode">
              <div><Image size={18} /><span><strong>{tr('Előnézet saját fotóval', 'Vorschau mit eigenem Foto')}</strong><small>{tr('A kép csak ebben a böngészőben jelenik meg.', 'Das Bild erscheint nur in diesem Browser.')}</small></span></div>
              <label className="upload-button"><Upload size={15} />{tr('Fotó feltöltése', 'Foto hochladen')}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPhotoUpload(file); event.target.value = '' }} /></label>
              {scene.photoUrl && <><Toggle label={tr('Fotós előnézet', 'Fotovorschau')} description={tr('Pergola a saját teraszodon', 'Pergola auf Ihrer eigenen Terrasse')} checked={scene.photoMode} onChange={(photoMode) => onSceneChange({ photoMode })} />{scene.photoMode && <div className="photo-transform"><SliderField label={tr('Vízszintes pozíció', 'Horizontale Position')} value={scene.photoX} min={-8} max={8} step={0.05} unit="m" onChange={(photoX) => onSceneChange({ photoX })} /><SliderField label={tr('Függőleges pozíció', 'Vertikale Position')} value={scene.photoY} min={-5} max={5} step={0.05} unit="m" onChange={(photoY) => onSceneChange({ photoY })} /><SliderField label={tr('Méret a fotón', 'Größe im Foto')} value={scene.photoScale} min={0.15} max={4} step={0.05} unit="×" onChange={(photoScale) => onSceneChange({ photoScale })} /><SliderField label={tr('Elforgatás', 'Drehung')} value={Math.round(scene.photoRotation)} min={-180} max={180} step={1} unit="°" onChange={(photoRotation) => onSceneChange({ photoRotation })} /><SliderField label={tr('Nézőszög', 'Blickwinkel')} value={scene.photoTilt} min={0} max={60} step={1} unit="°" onChange={(photoTilt) => onSceneChange({ photoTilt })} /></div>}</>}
            </div>
          </div>
  )
}

export default function ConfiguratorControls({ expansion = false, mobileBar, config, scene, step, selectedSide, summary, onStepChange, onSideSelect, onChange, onSceneChange, onPreset, prices, sheet, onSheetChange, onAdvisor, energyCost, onEnergy, footer, modular }: Props) {
  const { tenant, product } = useTenant()
  const { limits } = tenant
  // A carport ugyanennek a konfigurátornak egy építménytípusa (a „Mit építesz?” választóból): a pergola-komfort opciók
  // (bútor, fűtés, ventilátor stb.) nem jelennek meg hozzá. A régi /carport útvonal is ide, carport kezdőállapottal érkezik.
  const carport = config.building === 'carport' || product === 'carport'
  const panelRef = useRef<HTMLElement>(null)
  const mobileOpen = sheet !== 'peek'
  const sheetGesture = useSheetGesture(panelRef, sheet, onSheetChange)
  // Lépésváltáskor a lap tetejéről indulunk (ne az előző lépés görgetési helyzetéből).
  const scrollRef = useRef<HTMLDivElement>(null)
  // Szín lépés fülei: a pergola színe és a ház (homlokzat, nyílászárók).
  const [colorTab, setColorTab] = useState<'pergola' | 'house'>('pergola')
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [step, colorTab])
  // Keskeny kijelzőn a lépéssáv vízszintesen görgethető: az aktív lépés mindig látszódjon (ne legyen levágva).
  const tabsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const strip = tabsRef.current
    const active = strip?.querySelector<HTMLElement>('button.active')
    if (!strip || !active || strip.scrollWidth <= strip.clientWidth) return
    const left = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2
    strip.scrollTo({ left: Math.max(0, left), behavior: 'auto' })
  }, [step, sheet])
  const frameInfo = describeColor(tenant, config.frameColor, config.customRal)
  const frameHex = frameInfo.hex
  const frameName = config.roofColor ? `${frameInfo.name} + ${describeColor(tenant, config.roofColor, config.roofRal).name.toLowerCase()}` : `${frameInfo.name}${frameInfo.code && frameInfo.code !== frameInfo.name ? ` · ${frameInfo.code}` : ''}`
  const [half, setHalf] = useState<0 | 1>(0)
  // Másik oldal kiválasztásakor az első féllel kezdünk (render közbeni szinkron, effect nélkül).
  const [halfSide, setHalfSide] = useState(selectedSide)
  if (halfSide !== selectedSide) { setHalfSide(selectedSide); setHalf(0) }
  const sideSettings = (side: SideKey) => isWallSide(config.mount, side)
    ? <div className="selected-side-head"><strong>{sideNames[side]}</strong><span>{wallLabel(side)} · {tr('rögzítési oldal', 'Befestigungsseite')}</span></div>
    : <>
      <SideSettings side={side} sideName={sideNames[side]} config={config} scene={scene} prices={prices} half={half} onHalfChange={setHalf} onChange={onChange} onSceneChange={onSceneChange} />
      {hasZip && <div className="inline-setting"><SliderField label={tr('ZIP screen nyitottsága', 'Öffnung des ZIP-Screens')} value={config.screenOpen} min={0} max={100} step={1} unit="%" onChange={(screenOpen) => onChange({ screenOpen })} /></div>}
      {[config.sides[side], config.split?.[side]].some((type) => type === 'door' || type === 'doorSliding') && <button type="button" className={`mech-cta${config.doorMirror?.[side] ? ' selected' : ''}`} aria-pressed={!!config.doorMirror?.[side]} onClick={() => onChange({ doorMirror: { ...config.doorMirror, [side]: !config.doorMirror?.[side] } })}>
        <ArrowLeftRight size={18} /><span><strong>{tr('Nyitás a másik oldalra', 'Öffnung zur anderen Seite')}</strong><small>{config.sides[side] === 'doorSliding' || config.split?.[side] === 'doorSliding' ? tr('A tolószárny a másik sarokból indul', 'Der Schiebeflügel startet in der anderen Ecke') : tr('A zsanér a másik sarokban – a szárny a másik irányba nyílik', 'Scharnier in der anderen Ecke – der Flügel öffnet in die andere Richtung')}</small></span>
      </button>}
    </>
  const roofLabelsFor = (roof: RoofType) => `${tenant.roofs[roof]?.name ?? ''} · ${tenant.roofs[roof]?.short ?? ''}`
  const touchStart = useRef(0)
  const stepIndex = STEPS.findIndex((item) => item.id === step)
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null)
  const stepLabel = (id: ConfigStep) => STEPS.find((item) => item.id === id)!.label
  const buildingName = config.building === 'conservatory' ? tr('Télikert', 'Wintergarten') : config.building === 'veranda' ? 'Veranda' : config.building === 'carport' ? 'Carport' : 'Pergola'
  const [stepTrack, setStepTrack] = useState({ index: stepIndex, dir: 'fwd' as 'fwd' | 'back' })
  if (stepTrack.index !== stepIndex) setStepTrack({ index: stepIndex, dir: stepIndex > stepTrack.index ? 'fwd' : 'back' })
  const stepDir = stepTrack.dir
  const hasZip = closedSegments(config).some((segment) => segment.type === 'zip')
  const go = (index: number) => onStepChange(STEPS[Math.max(0, Math.min(STEPS.length - 1, index))].id)
  const touchEnd = (event: TouchEvent) => {
    const distance = event.changedTouches[0].clientX - touchStart.current
    if (Math.abs(distance) > 55) go(stepIndex + (distance < 0 ? 1 : -1))
  }
  const sideNames: Record<SideKey, string> = { front: tr('Elülső oldal', 'Vordere Seite'), back: tr('Hátsó oldal', 'Hintere Seite'), left: tr('Bal oldal', 'Linke Seite'), right: tr('Jobb oldal', 'Rechte Seite') }

  return (
    <aside ref={panelRef} className={`controls-panel glass-panel sheet-${sheet} ${mobileOpen ? 'is-mobile-open' : ''}`} aria-label={tr('Pergola beállításai', 'Pergola-Einstellungen')} onTouchStart={(event) => { touchStart.current = event.touches[0].clientX }} onTouchEnd={touchEnd}>
      <button type="button" className="sheet-toggle" aria-expanded={mobileOpen} aria-label={sheet === 'peek' ? tr('Pergola beállításainak megnyitása', 'Pergola-Einstellungen öffnen') : tr('Beállítások összecsukása a 3D nézethez', 'Einstellungen für die 3D-Ansicht einklappen')} {...sheetGesture}><span className="sheet-handle" aria-hidden="true" /><span><SlidersHorizontal size={16} />{sheet === 'peek' ? tr('Beállítások', 'Einstellungen') : sheet === 'half' ? `${stepIndex + 1}/${STEPS.length} · ${stepLabel(step)}` : tr('Vissza a 3D nézethez', 'Zurück zur 3D-Ansicht')}</span><ChevronDown size={16} /></button>
      <div className="config-head">
        <div><span>{tr('Konfiguráció', 'Konfiguration')}</span><strong>{String(stepIndex + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</strong></div>
        <span className="mini-summary">{config.width.toFixed(1).replace('.', ',')} × {config.depth.toFixed(1).replace('.', ',')} m · {MOUNT_SHORT[config.mount]}</span>
      </div>
      <div className="control-tabs" ref={tabsRef} role="tablist" aria-label={tr('Konfigurációs lépések', 'Konfigurationsschritte')}>
        {STEPS.map((item, index) => (
          <button key={item.id} type="button" role="tab" aria-selected={step === item.id} className={`${step === item.id ? 'active' : ''} ${index < stepIndex ? 'complete' : ''}${expansion && LOCKED_STEPS.includes(item.id) ? ' is-locked' : ''}`} disabled={expansion && LOCKED_STEPS.includes(item.id)} onClick={() => onStepChange(item.id)} title={expansion && LOCKED_STEPS.includes(item.id) ? tr('A meglévő szerkezet része, bővítésnél nem változik', 'Teil der bestehenden Konstruktion, bei Erweiterung unverändert') : stepLabel(item.id)}>
            <span className="step-dot">{expansion && LOCKED_STEPS.includes(item.id) ? <Lock size={11} /> : index < stepIndex ? <Check size={11} /> : index + 1}</span><span>{stepLabel(item.id)}</span>
          </button>
        ))}
      </div>
      <div className="controls-scroll" ref={scrollRef}>
        <div className={`panel-content dir-${stepDir}`} role="tabpanel" key={step}>
          <div className="step-heading"><span>0{stepIndex + 1} · {STEPS[stepIndex].short}</span><h2>{step === 'size' ? buildingName : stepLabel(step)}</h2></div>

          {step === 'size' && <>
            {!carport && onAdvisor && <AdvisorCard onOpen={onAdvisor} />}
            <SectionTitle title={tr('Mit építesz?', 'Was bauen Sie?')} hint={tr(`Pergola, veranda, télikert, carport${modular ? ' vagy modulház' : ''}. A választás átállítja a modellt, a lépéseket és az árat; utána minden módosítható.`, `Pergola, Veranda, Wintergarten, Carport${modular ? ' oder Modulhaus' : ''}. Die Wahl stellt Modell, Schritte und Preis um; danach ist alles änderbar.`)} />
            <BuildingPicker config={config} prices={prices} onChange={onChange} modular={modular} />
            <SectionTitle title={tr('Kiinduló csomagok', 'Startpakete')} hint={config.building ? tr(`A kiválasztott típushoz (${config.building === 'conservatory' ? 'télikert' : config.building === 'carport' ? 'carport' : 'veranda'}) illő kiinduló terv. Utána minden szabadon módosítható.`, `Startentwurf passend zum gewählten Typ (${config.building === 'conservatory' ? 'Wintergarten' : config.building === 'carport' ? 'Carport' : 'Veranda'}). Danach ist alles frei änderbar.`) : tr('Egy koppintással indulhatsz, utána minden szabadon módosítható.', 'Mit einem Tippen starten, danach ist alles frei änderbar.')} />
            <div className="preset-list">{(tenant.presets.filter((preset) => (preset.config.building ?? 'pergola') === (config.building ?? 'pergola')).length ? tenant.presets.filter((preset) => (preset.config.building ?? 'pergola') === (config.building ?? 'pergola')) : tenant.presets).map((preset) => <button type="button" key={preset.id} className={[appliedPreset === preset.id ? 'applied' : '', preset.featured ? 'is-featured' : ''].filter(Boolean).join(' ') || undefined} onClick={() => { onPreset(presetConfig(tenant, preset.config)); setAppliedPreset(preset.id); window.setTimeout(() => setAppliedPreset((current) => (current === preset.id ? null : current)), 1400) }}><strong>{preset.name}{preset.featured && <em className="preset-badge">{tr('Legnépszerűbb', 'Am beliebtesten')}</em>}</strong><span>{preset.description}</span>{appliedPreset === preset.id ? <Check size={15} /> : <ArrowRight size={15} />}</button>)}</div>
            <p className="split-note">{tr('A méreteket, a tetőt, az oldalakat és a színt a következő lépésekben állítod be; a bútor és a környezet a 3D feletti ', 'Größe, Dach, Seiten und Farbe stellen Sie in den nächsten Schritten ein; Möbel und Umgebung finden Sie über der 3D-Ansicht unter ')}<strong>{tr('Nézet', 'Ansicht')}</strong>{tr(' gombnál van.', '.')}</p>
          </>}

          {step === 'mount' && <>
            <SectionTitle title={tr('Elhelyezés', 'Montage')} hint={tr('Falhoz rögzítve, sarokban vagy szabadon: ez dönti el, hová kerülnek az oszlopok és a falak. A méret ehhez igazodik.', 'An der Wand, in der Ecke oder freistehend: das bestimmt, wo Steher und Wände sitzen. Die Größe passt sich daran an.')} />
            <div className="roof-options mount-options">{MOUNT_TYPES.filter((mount) => tenant.mounts.includes(mount)).map((mount) => <button type="button" key={mount} className={config.mount === mount ? 'selected' : ''} aria-pressed={config.mount === mount} onClick={() => onChange({ mount })}><MountIcon mount={mount} /><span><strong>{MOUNT_LABELS[mount]}</strong><small>{MOUNT_DESCRIPTIONS[mount]}</small></span><span className="selection-dot">{config.mount === mount && <Check size={12} />}</span></button>)}</div>
            <SectionTitle title={tr('Külső szerkezeti méretek', 'Konstruktions-Außenmaße')} hint={tr('Írd be az értékeket centiméterben, vagy használd a csúszkákat.', 'Werte in Zentimetern eingeben oder die Regler nutzen.')} />
            {(limits.maxModules ?? 1) > 1 && <>
              <SectionTitle title={tr('Modulok', 'Module')} hint={tr('Összekapcsolt mezők közös oszlopokkal – hosszú teraszra, vendéglátó terekre. Az ár és az összterület modulonként számolódik.', 'Gekoppelte Felder mit gemeinsamen Stehern – für lange Terrassen und Gastronomie. Preis und Gesamtfläche werden je Modul berechnet.')} />
              <div className="scene-options compact four" role="radiogroup" aria-label={tr('Modulok száma', 'Anzahl Module')}>
                {Array.from({ length: Math.min(4, limits.maxModules ?? 1) }, (_, index) => index + 1).map((count) => { const active = moduleCount(config) === count; return <button type="button" role="radio" aria-checked={active} key={count} className={active ? 'selected' : ''} onClick={() => onChange({ modules: count > 1 ? count : undefined, width: Math.round(bayWidth(config) * count * 100) / 100 })}><strong>{count}×</strong></button> })}
              </div>
            </>}
            <SliderField label={moduleCount(config) > 1 ? tr('Szélesség modulonként', 'Breite je Modul') : tr('Szélesség', 'Breite')} value={bayWidth(config)} min={limits.width[0]} max={limits.width[1]} step={0.05} unit="m" metric onChange={(bay) => onChange({ width: Math.round(bay * moduleCount(config) * 100) / 100 })} />
            {moduleCount(config) > 1 && <p className="split-note">{modulesLabel(config, (value) => formatNumber(value, 2))} mező · összesen {formatNumber(config.width, 2)} m széles, {moduleCount(config) - 1} közös oszlopsorral.</p>}
            <SliderField label={tr('Mélység', 'Tiefe')} value={config.depth} min={limits.depth[0]} max={limits.depth[1]} step={0.05} unit="m" metric onChange={(depth) => onChange({ depth })} />
            <SliderField label={tr('Oszlopmagasság', 'Steherhöhe')} value={config.height} min={limits.height[0]} max={limits.height[1]} step={0.05} unit="m" metric onChange={(height) => onChange({ height })} />
            {bayWidth(config) > 6 && <div className="smart-warning"><Columns3 size={18} /><p><strong>{tr('Középoszlop javasolt', 'Mittelsteher empfohlen')}</strong>{tr('600 cm feletti mezőnél a műszaki ellenőrzés és egy középoszlop szükséges lehet.', 'Bei Feldern über 600 cm kann eine technische Prüfung und ein Mittelsteher nötig sein.')}</p></div>}
            <div className="smart-helper"><Sparkles size={18} /><p><strong>{getSizeRecommendation(config).split(' · ')[0]}</strong>{getSizeRecommendation(config).split(' · ')[1]}</p></div>
            <BuildingIssues config={config} onFix={onChange} only={issuesForStep('mount')} />
          </>}

          {step === 'color' && <>
            {/* Két, összetartozó döntés: a pergola színe és a ház, amelyhez illenie kell. */}
            <div className="color-tabs" role="tablist" aria-label={tr('Színek', 'Farben')}>
              <button type="button" role="tab" aria-selected={colorTab === 'pergola'} className={colorTab === 'pergola' ? 'active' : ''} onClick={() => setColorTab('pergola')}>
                <span className="color-tab-swatch" style={{ background: frameHex }} aria-hidden="true" />
                <span><strong>{carport ? 'Carport' : 'Pergola'}</strong><small>{frameName}</small></span>
              </button>
              <button type="button" role="tab" aria-selected={colorTab === 'house'} className={colorTab === 'house' ? 'active' : ''} onClick={() => setColorTab('house')}>
                <span className="color-tab-swatch" style={finishPreview(scene.wallFinish, wallColorHex(scene.wallFinish, scene.wallColor))} aria-hidden="true" />
                <span><strong>{tr('A házad', 'Ihr Haus')}</strong><small>{wallColorName(scene.wallFinish, scene.wallColor)} · {findWindowColor(scene.windowColor).name.toLowerCase()} ablak</small></span>
              </button>
            </div>
            {colorTab === 'pergola' ? <div className="color-tab-panel" key="pergola">
              <SectionTitle title={tr('Porszórt alumínium', 'Pulverbeschichtetes Aluminium')} hint={tr('Alapszín felár nélkül, vagy bármely RAL szín. A 3D modell azonnal mutatja.', 'Standardfarbe ohne Aufpreis oder jede RAL-Farbe. Das 3D-Modell zeigt es sofort.')} />
              <div className="house-color-context">
                <HouseContext scene={scene} onEdit={() => setColorTab('house')} />
                <WindowMatch config={config} scene={scene} onChange={onChange} />
              </div>
              <ColorPicker config={config} prices={prices} photoUrl={scene.photoUrl ?? null} onChange={onChange} />
            </div> : <div className="color-tab-panel" key="house">
              <SectionTitle title={tr('A házad', 'Ihr Haus')} hint={tr('Állítsd be, hogy a 3D ház a tiédre hasonlítson — így látod, milyen pergolaszín illik hozzá. Csak látvány, az árat nem módosítja.', 'Passen Sie das 3D-Haus an Ihres an — so sehen Sie, welche Pergolafarbe dazu passt. Nur Optik, ändert den Preis nicht.')} />
              <HouseLook config={config} scene={scene} photoUrl={scene.photoUrl ?? null} onSceneChange={onSceneChange} onChange={onChange} />
              <button type="button" className="color-tab-back" onClick={() => setColorTab('pergola')}>{tr('Tovább a pergola színéhez', 'Weiter zur Pergolafarbe')}</button>
            </div>}
          </>}

          {step === 'roof' && expansion && <>
            <SectionTitle title={tr('Tetőárnyékoló', 'Dachbeschattung')} hint={tr('A tető a meglévő szerkezet része, bővítésnél nem változik. Üveg- vagy polikarbonát tetőhöz motoros árnyékoló adható hozzá.', 'Das Dach ist Teil der bestehenden Konstruktion. Für Glas- oder Polycarbonatdächer kann eine motorisierte Beschattung ergänzt werden.')} />
            <RoofShadeOption config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
            {!config.roofShade && config.roof !== 'glass' && config.roof !== 'polycarbonate' && <p className="split-note">{tr('Ennél a tetőnél nincs hozzáadható elem.', 'Für dieses Dach gibt es keine Ergänzung.')}</p>}
          </>}

          {step === 'roof' && !expansion && <>
            <SectionTitle title={tr('Tetőrendszer', 'Dachsystem')} hint={isClosedBuilding(config.building) ? (config.building === 'conservatory' ? tr('Télikerthez üveg- vagy fix (szigetelt) tető való: a mozgó tető nem zárható megfelelően.', 'Für einen Wintergarten eignet sich ein Glas- oder festes (gedämmtes) Dach: ein bewegliches Dach schließt nicht dicht genug.') : tr('Verandához üveg-, polikarbonát vagy fix tető való.', 'Für eine Veranda eignet sich ein Glas-, Polycarbonat- oder festes Dach.')) : tr('A tető típusa határozza meg az árnyékolást, az esővédelmet és az árat.', 'Der Dachtyp bestimmt Beschattung, Regenschutz und Preis.')} />
            <RoofPicker config={config} prices={prices} onChange={onChange} />
            <GlazingPicker config={config} prices={prices} onChange={onChange} />
            <RoofControl config={config} scene={scene} onChange={onChange} onSceneChange={onSceneChange} />
            {ROOF_INFO[config.roof].motion === 'none' && <p className="split-note">{tr('Fix tető: nincs mozgatható része.', 'Festes Dach: keine beweglichen Teile.')}</p>}
            <SliderField label={tr('Tetődőlés', 'Dachneigung')} value={config.pitch ?? 0} min={PITCH_RANGE[0]} max={PITCH_RANGE[1]} step={1} unit="°" onChange={(pitch) => onChange({ pitch: pitch || undefined })} />
            {(config.pitch ?? 0) > 0 && <p className="split-note">A tető hátsó (fali) éle {roofRise(config).toFixed(2).replace('.', ',')} m-rel magasabb az elülső oszlopmagasságnál, így a csapadék előre folyik le.</p>}
            <RoofShadeOption config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
            <SolarToggle config={config} prices={prices} onChange={onChange} />
            <BuildingIssues config={config} onFix={onChange} only={issuesForStep('roof')} />
          </>}

          {step === 'sides' && <>
            {expansion && <p className="split-note">{tr('Bővítés: csak a nyitott oldalak zárhatók le; a meglévő oldalelemek és a falas oldalak nem változnak.', 'Erweiterung: Nur offene Seiten können geschlossen werden; bestehende Seitenelemente und Wandseiten bleiben.')}</p>}
            <SectionTitle title={tr('Melyik oldalt zárod?', 'Welche Seite schließen Sie?')} hint={tr('Koppints egy oldalra a felülnézeten vagy a 3D modellen. A középső mező a tető.', 'Tippen Sie auf eine Seite in der Draufsicht oder im 3D-Modell. Das mittlere Feld ist das Dach.')} />
            <SideDiagram config={config} selected={selectedSide} roofName={tenant.roofs[config.roof]?.name ?? ''} onSelect={onSideSelect} />
            {selectedSide === 'roof' ? <div className="selected-side-head"><strong>{tr('Tető kijelölve', 'Dach ausgewählt')}</strong><span>{roofLabelsFor(config.roof)} · {tr('a beállításai a ', 'Einstellungen im ')}<button type="button" className="inline-link" onClick={() => onStepChange('roof')}>{tr('Tető lépésben', 'Schritt Dach')}</button>{tr(' vannak. Koppints egy oldalra a záráshoz.', '. Tippen Sie auf eine Seite, um sie zu schließen.')}</span></div> : sideSettings(selectedSide)}
            {isClosedBuilding(config.building) && <WallGlazingPicker config={config} prices={prices} onChange={onChange} />}
            <BuildingIssues config={config} onFix={onChange} only={issuesForStep('sides')} />
            <div className="interaction-hint"><Move size={17} /><p>{tr('A tolóüveg és az oldallamella a 3D-ben kattintásra, illetve a fenti gombbal is mozgatható. Egy oldal két részre is osztható, például fele tolóüveg, fele lécfal.', 'Glasschiebewand und Seitenlamellen lassen sich in 3D per Klick oder mit der Schaltfläche oben bewegen. Eine Seite kann auch geteilt werden, z. B. halb Glasschiebewand, halb Lattenwand.')}</p></div>
          </>}

          {step === 'extras' && <>
            {isClosedBuilding(config.building) && <>
              <SectionTitle title={config.building === 'conservatory' ? tr('Egész éves használat', 'Ganzjährige Nutzung') : tr('Zárt tér', 'Geschlossener Raum')} hint={config.building === 'conservatory' ? tr('Fűtés, hűtés és az alapozott padló teszi lakótérré a télikertet.', 'Heizung, Kühlung und ein fundamentierter Boden machen den Wintergarten zum Wohnraum.') : undefined} />
              <ClimateSection config={config} prices={prices} onChange={onChange} scene={scene} onSceneChange={onSceneChange} />
              <BuildingIssues config={config} onFix={onChange} only={issuesForStep('extras')} />
            </>}
            {carport && <>
              {/* Carportnál csak az ide illő extrák: világítás és napelemes tető. */}
              <SectionTitle title={tr('Világítás', 'Beleuchtung')} hint={tr('Minden opció azonnal megjelenik a modellen és a tételes árban. A napelemes tető a Tető lépésben választható.', 'Jede Option erscheint sofort am Modell und im detaillierten Preis. Das Photovoltaik-Dach wählen Sie im Schritt Dach.')} />
              <div className="extra-grid">
                {tenant.extras.led && <Toggle label={tr('Periméter LED', 'Umlaufende LED')} description={tr('Rejtett világítás a beállóban', 'Indirekte Beleuchtung im Stellplatz')} icon={LampCeiling} price={`${formatPrice(prices.ledPerMeterNet)} / fm`} checked={config.led} onChange={(led) => onChange({ led, ledRgb: undefined })} />}
              </div>
            </>}
            {!carport && <>
            <SectionTitle title={tr('Világítás és hangulat', 'Licht und Stimmung')} hint={tr('Minden opció azonnal megjelenik a modellen és a tételes árban.', 'Jede Option erscheint sofort am Modell und im detaillierten Preis.')} />
            <div className="extra-grid">
              {tenant.extras.led && <Toggle label={tr('Periméter LED', 'Umlaufende LED')} description={tr('Rejtett, beépített világítás', 'Indirekte, integrierte Beleuchtung')} icon={LampCeiling} price={`${formatPrice(prices.ledPerMeterNet)} / fm`} checked={config.led} onChange={(led) => onChange({ led, ...(led ? {} : { ledRgb: undefined }) })} />}
              <RgbOption config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
              {tenant.extras.speakers && <Toggle label={tr('Bluetooth hangrendszer', 'Bluetooth-Soundsystem')} description={tr('Egy pár beépített hangszóró', 'Ein Paar eingebaute Lautsprecher')} icon={Zap} price={formatPrice(prices.speakerPairNet)} checked={config.speakers} onChange={(speakers) => onChange({ speakers })} />}
            </div>
            <SectionTitle title={tr('Hő és légmozgás', 'Wärme und Luftbewegung')} hint={tr('Fűtés a hűvös estékre, ventilátor a nyári hőségre.', 'Heizung für kühle Abende, Ventilator für die Sommerhitze.')} />
            {limits.maxHeaters > 0 && <div className="stepper-row"><span><strong>{tr('Infravörös teraszfűtés', 'Infrarot-Terrassenheizung')}</strong><small>+{formatPrice(tenantPrice(tenant, { ...config, heaters: config.heaters + 1 }, prices).totalGross - tenantPrice(tenant, config, prices).totalGross)} / {tr('db, bruttó', 'Stk., brutto')}</small></span><div className="stepper"><button type="button" aria-label={tr('Fűtőpanel csökkentése', 'Heizstrahler verringern')} disabled={config.heaters === 0} onClick={() => onChange({ heaters: Math.max(0, config.heaters - 1) })}><Minus size={15} /></button><span>{config.heaters} db</span><button type="button" aria-label={tr('Fűtőpanel növelése', 'Heizstrahler erhöhen')} disabled={config.heaters >= limits.maxHeaters} onClick={() => onChange({ heaters: Math.min(limits.maxHeaters, config.heaters + 1) })}><Plus size={15} /></button></div></div>}
            <FanOption config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
            <SectionTitle title={tr('Vezérlés', 'Steuerung')} hint={sensorsApplicable(config) ? tr('Automatika és egy appból irányítható rendszer.', 'Automatik und ein per App steuerbares System.') : tr('Egy appból irányítható rendszer. Eső- és szélszenzor mozgó tetőhöz vagy ZIP-screenhez választható.', 'Ein per App steuerbares System. Regen- und Windsensor für bewegliche Dächer oder ZIP-Screens wählbar.')} />
            <div className="extra-grid">
              {tenant.extras.sensors && sensorsApplicable(config) && <Toggle label={tr('Eső- és szélszenzor', 'Regen- und Windsensor')} description={tr('Automata tetőzárás esőben', 'Automatisches Schließen bei Regen')} icon={CloudRain} price={formatPrice(prices.sensorsNet)} checked={config.sensors} onChange={(sensors) => onChange({ sensors })} />}
              <SmartHomeOption config={config} prices={prices} onChange={onChange} />
            </div>
            </>}
            {onEnergy &&<button type="button" className="energy-trigger" onClick={onEnergy}><Gauge size={16} /><span><strong>{energyCost ? `${tr('Üzemeltetés', 'Betrieb')} ≈ ${formatPrice(energyCost)} / ${tr('év', 'Jahr')}` : tr('Üzemeltetési költség', 'Betriebskosten')}</strong><small>{energyCost ? tr('Áramköltség a valós lakossági tarifával · részletek', 'Stromkosten mit realem Haushaltstarif · Details') : tr('Nincs áramfogyasztó a tervben', 'Kein Stromverbraucher in der Planung')}</small></span><ChevronRight size={15} /></button>}
          </>}

          {step === 'summary' && summary}
        </div>

      </div>
      <div className={`panel-dock${step === 'summary' ? ' is-summary' : ''}`}>{footer}<div className="step-navigation"><button type="button" disabled={stepIndex === 0} onClick={() => go(stepIndex - 1)}><ArrowLeft size={16} />{tr('Vissza', 'Zurück')}</button>{stepIndex === STEPS.length - 1
        ? <button type="button" className="next-step" onClick={() => scrollRef.current?.querySelector('.lead-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{tr('Felmérést kérek', 'Aufmaß anfragen')}<ArrowRight size={16} /></button>
        : <button type="button" className="next-step" onClick={() => go(stepIndex + 1)}>{stepIndex === STEPS.length - 2 ? tr('Összegzés', 'Übersicht') : tr('Következő', 'Weiter')}<ArrowRight size={16} /></button>}</div></div>
      {mobileBar}
    </aside>
  )
}
