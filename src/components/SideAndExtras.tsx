// Oldalzárás-választó (8 típus, félbe osztás) és a komfort-opciók (RGB LED, ventilátor,
// okosotthon) felülete. Az árkülönbség mindig a teljes bruttó irányár változása.
import { DoorOpen, Fan, House, Layers3, Minus, Move, Palette, Plus, Power, SplitSquareHorizontal, Square } from 'lucide-react'
import { formatHuf, formatNumber } from '@/lib/pricing'
import { DEFAULT_SHADE_FABRIC, ROOF_SHADE_INFO, ROOF_SHADES, roofShadeArea, SHADE_FABRICS, supportsRoofShade } from '@/lib/roofShade'
import { HALF_NAMES, SIDE_INFO, sideSegments } from '@/lib/sides'
import { RGB_SWATCHES, smartHomeTargets } from '@/lib/comfort'
import { FAN_MIN_HEIGHT } from '@/lib/fans'
import { hasCenterPost } from '@/lib/modules'
import { CONSERVATORY_SIDE_TYPES } from '@/lib/buildings'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { PergolaConfig, PriceSettings, RoofShade, SceneSettings, SideKey, SideType } from '@/types/pergola'

const signed = (value: number) => (Math.abs(value) < 500 ? '±0 Ft' : `${value > 0 ? '+' : '−'}${formatHuf(Math.abs(value))}`)

export function SideIcon({ type }: { type: SideType }) {
  const common = { width: 30, height: 22, viewBox: '0 0 30 22', 'aria-hidden': true, className: `side-icon side-icon-${type}` } as const
  switch (type) {
    case 'none': return <svg {...common}><rect x="3" y="3" width="24" height="16" rx="1.5" className="outline dashed" /></svg>
    case 'zip': return <svg {...common}><rect x="3" y="2" width="24" height="4" rx="1" className="solid" /><rect x="4.5" y="6" width="21" height="12" className="fabric" /><rect x="4" y="16.5" width="22" height="2" rx="1" className="solid" /></svg>
    case 'glass': return <svg {...common}><rect x="3" y="3" width="13" height="16" className="pane" /><rect x="14" y="3" width="13" height="16" className="pane" /><path d="M6 13l5-6M18 13l5-6" className="glint" /><rect x="3" y="18.2" width="24" height="1.4" className="solid" /></svg>
    case 'glassFramed': return <svg {...common}><rect x="3" y="3" width="12" height="16" className="pane framed" /><rect x="15" y="3" width="12" height="16" className="pane framed" /><path d="M6.5 13l4-5M18.5 13l4-5" className="glint" /></svg>
    case 'glassFixed': return <svg {...common}><rect x="3" y="3" width="24" height="16" className="pane" /><path d="M8 14l7-8M12 15l5-6" className="glint" /><rect x="2.5" y="2" width="25" height="2" className="solid" /><rect x="2.5" y="18" width="25" height="2" className="solid" /></svg>
    case 'door': return <svg {...common}><rect x="3" y="3" width="13" height="16" className="pane" /><rect x="16" y="3" width="11" height="16" className="pane framed" /><path d="M16 3l7 3v13l-7-0" className="glint" /><circle cx="18.2" cy="11.5" r="0.9" className="solid" /></svg>
    case 'doorSliding': return <svg {...common}><rect x="3" y="3" width="13" height="16" className="pane" /><rect x="13" y="3" width="14" height="16" className="pane framed" /><path d="M16 11.5h8M21.5 9.5l2.5 2-2.5 2" className="glint" /></svg>
    case 'louver': return <svg {...common}>{[4, 7.4, 10.8, 14.2, 17.6].map((y) => <rect key={y} x="4" y={y} width="22" height="2" rx="1" className="solid" transform={`rotate(-8 15 ${y + 1})`} />)}</svg>
    case 'slatAlu': return <svg {...common}><rect x="2.5" y="3" width="2" height="16" className="solid" /><rect x="25.5" y="3" width="2" height="16" className="solid" />{[4, 7, 10, 13, 16].map((y) => <rect key={y} x="5" y={y} width="20" height="2.1" className="solid" />)}</svg>
    case 'slatWood': return <svg {...common}><rect x="2.5" y="3" width="2" height="16" className="solid" /><rect x="25.5" y="3" width="2" height="16" className="solid" />{[4, 7, 10, 13, 16].map((y) => <rect key={y} x="5" y={y} width="20" height="2.3" className="wood" />)}</svg>
  }
}

/** Oldal beállítása: egész oldal vagy két fél, típuskártyák árkülönbséggel. */
export function SideSettings({ side, sideName, config, scene, prices, half, onHalfChange, onChange, onSceneChange }: {
  side: SideKey
  sideName: string
  config: PergolaConfig
  scene: SceneSettings
  prices: PriceSettings
  half: 0 | 1
  onHalfChange: (half: 0 | 1) => void
  onChange: (patch: Partial<PergolaConfig>) => void
  onSceneChange: (patch: Partial<SceneSettings>) => void
}) {
  const { tenant } = useTenant()
  const types: SideType[] = ['none', ...tenant.sides].filter((type) => config.building !== 'conservatory' || CONSERVATORY_SIDE_TYPES.includes(type as SideType)) as SideType[]
  const split = Boolean(config.split?.[side])
  const activeHalf = split ? half : 0
  const typeOf = (index: 0 | 1) => (index === 1 ? config.split?.[side] ?? config.sides[side] : config.sides[side])
  const current = typeOf(activeHalf)
  const patchFor = (type: SideType): Partial<PergolaConfig> => activeHalf === 1
    ? { split: { ...config.split, [side]: type } }
    : { sides: { ...config.sides, [side]: type } }
  const base = tenantPrice(tenant, config, prices).totalGross
  const delta = (type: SideType) => tenantPrice(tenant, { ...config, ...patchFor(type) }, prices).totalGross - base
  const setSplit = (on: boolean) => {
    if (on) {
      // A második fél kiinduló típusa eltér az elsőtől, így rögtön látszik az osztás.
      const second: SideType = config.sides[side] === 'none' ? (tenant.sides[0] ?? 'none') : 'none'
      onChange({ split: { ...config.split, [side]: second } })
      onHalfChange(1)
    } else {
      const next = { ...config.split }
      delete next[side]
      onChange({ split: Object.keys(next).length ? next : undefined })
      onHalfChange(0)
    }
  }
  const segments = sideSegments(config, side)
  const hasType = (...wanted: SideType[]) => segments.some((segment) => wanted.includes(segment.type))
  const midPost = side === 'front' && hasCenterPost(config)

  return <div className="side-settings">
    <div className="selected-side-head"><strong>{sideName}</strong><span>{split ? 'Két részre osztva' : SIDE_INFO[config.sides[side]].label}</span></div>
    <div className="split-mode" role="radiogroup" aria-label={`${sideName} kialakítása`}>
      <button type="button" role="radio" aria-checked={!split} className={!split ? 'selected' : ''} onClick={() => setSplit(false)}><Square size={14} />Egész oldal</button>
      <button type="button" role="radio" aria-checked={split} className={split ? 'selected' : ''} onClick={() => setSplit(true)}><SplitSquareHorizontal size={14} />Két fél</button>
    </div>
    {split && <>
      <div className="half-tabs" role="tablist" aria-label="Melyik felet állítod?">
        {([0, 1] as const).map((index) => <button key={index} type="button" role="tab" aria-selected={activeHalf === index} className={activeHalf === index ? 'selected' : ''} onClick={() => onHalfChange(index)}>
          <span className={`half-mark half-${index}`} aria-hidden="true"><i /><i /></span>
          <span><small>{HALF_NAMES[side][index]}</small><strong>{SIDE_INFO[typeOf(index)].label}</strong></span>
        </button>)}
      </div>
      <p className="split-note">{midPost ? 'A két fél a középoszlopnál találkozik, külön osztóprofil nem kell.' : `A két fél között függőleges osztóprofil fut (${formatHuf(prices.splitProfileNet)} + telepítés).`}</p>
    </>}
    <div className="side-type-grid" role="radiogroup" aria-label={split ? `${HALF_NAMES[side][activeHalf]} típusa` : `${sideName} típusa`}>
      {types.map((type) => {
        const info = SIDE_INFO[type]
        const selected = current === type
        return <button type="button" role="radio" aria-checked={selected} key={type} className={`side-type-card${selected ? ' selected' : ''}`} onClick={() => onChange(patchFor(type))}>
          <SideIcon type={type} />
          <span className="side-type-text"><strong>{info.label}</strong><small>{info.description}</small></span>
          <em>{selected ? 'Kiválasztva' : signed(delta(type))}</em>
        </button>
      })}
    </div>
    {hasType('glass', 'glassFramed') && <button type="button" className="side-motion-control" aria-pressed={scene.glassOpen} onClick={() => onSceneChange({ glassOpen: !scene.glassOpen })}><Move size={17} /><span>{scene.glassOpen ? 'Tolóüveg bezárása' : 'Tolóüveg eltolása'}</span></button>}
    {hasType('door', 'doorSliding') && <button type="button" className="side-motion-control door-toggle" aria-pressed={scene.doorOpen} onClick={() => onSceneChange({ doorOpen: !scene.doorOpen })}><DoorOpen size={17} /><span>{scene.doorOpen ? 'Ajtó bezárása' : 'Ajtó kinyitása'}</span></button>}
    {hasType('louver') && <button type="button" className="side-motion-control" aria-pressed={scene.wallLouverOpen} onClick={() => onSceneChange({ wallLouverOpen: !scene.wallLouverOpen })}><Layers3 size={17} /><span>{scene.wallLouverOpen ? 'Oldallamellák zárása' : 'Oldallamellák döntése'}</span></button>}
  </div>
}

/** Kicsi felülnézeti jel az oldalválasztó gombjába: egy vagy két szakasz, típus szerinti mintával. */
export function SideStrip({ config, side }: { config: PergolaConfig; side: SideKey }) {
  const segments = sideSegments(config, side)
  if (!segments.length) return null
  // Bal/jobb oldalon az első fél az elülső, ami a felülnézeti ábrán lent van.
  const ordered = side === 'left' || side === 'right' ? [...segments].reverse() : segments
  return <span className={`side-strip ${segments.length > 1 ? 'is-split' : ''}`} aria-hidden="true">{ordered.map((segment, index) => <i key={index} className={`strip-${segment.type}`} />)}</span>
}

type ComfortProps = { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }

/** Színváltós LED: a LED-kapcsoló alatti al-opció, színes előnézettel. */
export function RgbOption({ config, scene, prices, onChange, onSceneChange }: ComfortProps) {
  const { tenant } = useTenant()
  const showColor = (hex: string) => onSceneChange({ ledColor: hex, ...(scene.time !== 'night' ? { dayTime: 21.5, time: 'night' as const } : {}) })
  return <>
    {tenant.extras.rgb && config.led && <div className={`sub-option${config.ledRgb ? ' is-on' : ''}`}>
      <button type="button" className="sub-option-head" role="switch" aria-checked={Boolean(config.ledRgb)} onClick={() => onChange({ ledRgb: config.ledRgb ? undefined : true })}>
        <Palette size={17} strokeWidth={1.6} />
        <span><strong>Színváltós RGB+W LED</strong><small>Fehér és bármilyen szín, jelenetek appból</small></span>
        <em>+{formatHuf(prices.ledRgbPerMeterNet)} / fm</em>
        <span className={`switch-track ${config.ledRgb ? 'is-on' : ''}`} aria-hidden="true"><span /></span>
      </button>
      {config.ledRgb && <div className="rgb-preview">
        <small>Nézd meg este — koppints egy színre</small>
        <div className="rgb-swatches" role="radiogroup" aria-label="LED színe">
          <button type="button" role="radio" aria-checked={!scene.ledColor} className={`rgb-white${!scene.ledColor ? ' selected' : ''}`} title="Meleg fehér" aria-label="Meleg fehér" onClick={() => onSceneChange({ ledColor: null })} />
          {RGB_SWATCHES.map((swatch) => <button type="button" role="radio" aria-checked={scene.ledColor === swatch.hex} key={swatch.hex} className={scene.ledColor === swatch.hex ? 'selected' : ''} style={{ '--swatch': swatch.hex } as React.CSSProperties} title={swatch.name} aria-label={swatch.name} onClick={() => showColor(swatch.hex)} />)}
        </div>
      </div>}
    </div>}
  </>
}

/** Mennyezeti ventilátor 0–2 db, belmagasság-figyelmeztetéssel és 3D bekapcsolással. */
export function FanOption({ config, scene, prices, onChange, onSceneChange }: ComfortProps) {
  const { tenant } = useTenant()
  const fans = config.fans ?? 0
  return <>
    {tenant.extras.fans && <div className="stepper-row fan-row">
      <span><strong><Fan size={15} strokeWidth={1.6} />Mennyezeti ventilátor</strong><small>Kültéri DC motor, Ø132 cm · {formatHuf(prices.fanUnitNet)} / db</small></span>
      <div className="stepper"><button type="button" aria-label="Ventilátor csökkentése" disabled={fans === 0} onClick={() => onChange({ fans: fans > 1 ? fans - 1 : undefined })}><Minus size={15} /></button><span>{fans} db</span><button type="button" aria-label="Ventilátor növelése" disabled={fans >= 2} onClick={() => onChange({ fans: fans + 1 })}><Plus size={15} /></button></div>
    </div>}
    {fans > 0 && <>
      {config.height < FAN_MIN_HEIGHT && <p className="fan-warning">{`Alacsony belmagasság: ${String(FAN_MIN_HEIGHT).replace('.', ',')} m oszlopmagasság alatt a lapátok 2,1 m alá kerülhetnek. Felméréskor ellenőrizzük, vagy válassz magasabb oszlopot.`}</p>}
      <button type="button" className="side-motion-control" aria-pressed={scene.fanOn} onClick={() => onSceneChange({ fanOn: !scene.fanOn })}><Power size={16} /><span>{scene.fanOn ? 'Ventilátor kikapcsolása' : 'Ventilátor bekapcsolása a 3D-ben'}</span></button>
    </>}
  </>
}

/** Okosotthon-vezérlés: megmutatja, mit kapcsol az app ebben a tervben. */
export function SmartHomeOption({ config, prices, onChange }: Omit<ComfortProps, 'scene' | 'onSceneChange'>) {
  const { tenant } = useTenant()
  const targets = smartHomeTargets(config)
  return <>
    {tenant.extras.smartHome && <button type="button" className={`extra-card smart-home-card ${config.smartHome ? 'is-on' : ''}`} role="switch" aria-checked={Boolean(config.smartHome)} onClick={() => onChange({ smartHome: config.smartHome ? undefined : true })}>
      <House size={20} strokeWidth={1.5} />
      <span><strong>Okosotthon-vezérlés</strong><small>{targets.length ? `Egy appból: ${targets.join(' · ')}` : 'A később hozzáadott elektromos opciókat is kezeli'} — időzítés, jelenetek, Google / Alexa / Siri</small><em>{formatHuf(prices.smartHomeNet)}</em></span>
      <span className={`switch-track ${config.smartHome ? 'is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>}
  </>
}


/** Kis oldalnézeti jel: üvegtető bordázattal, felette vagy alatta a ponyva. */
function ShadeIcon({ kind }: { kind: RoofShade | 'none' }) {
  return <svg viewBox="0 0 40 28" width="40" height="28" aria-hidden="true" className="shade-icon">
    <path d="M4 22V12M36 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".55" />
    <path d="M3 12h34" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M6 14.5h28" stroke="#9fd0dc" strokeWidth="1.6" strokeLinecap="round" opacity=".9" />
    {kind === 'above' && <path d="M5 7.5h30" stroke="var(--accent-primary)" strokeWidth="2.6" strokeLinecap="round" />}
    {kind === 'below' && <path d="M7 18h26" stroke="var(--accent-primary)" strokeWidth="2.6" strokeLinecap="round" />}
    {kind !== 'none' && <rect x={kind === 'above' ? 2 : 4} y={kind === 'above' ? 5 : 15.6} width="4" height="5" rx="1" fill="currentColor" opacity=".8" />}
  </svg>
}

/** Motoros tetőárnyékoló üveg- és polikarbonát tetőhöz: nincs / tető feletti / tető alatti, ponyvaszín, mozgatás. */
export function RoofShadeOption({ config, scene, prices, onChange, onSceneChange }: ComfortProps) {
  const { tenant } = useTenant()
  if (!tenant.extras.roofShade || !supportsRoofShade(config.roof)) return null
  const current = tenantPrice(tenant, config, prices).totalGross
  const delta = (kind: RoofShade | undefined) => tenantPrice(tenant, { ...config, roofShade: kind, shadeFabric: kind ? config.shadeFabric ?? DEFAULT_SHADE_FABRIC : undefined }, prices).totalGross - current
  const glass = config.roof === 'glass'
  const options: { id: RoofShade | 'none'; label: string; description: string }[] = [
    { id: 'none', label: 'Árnyékoló nélkül', description: glass ? 'Teljes napfény — nyáron délben meleg lehet alatta' : 'Opál, szórt fény, árnyékoló nélkül' },
    ...ROOF_SHADES.map((kind) => ({ id: kind, label: ROOF_SHADE_INFO[kind].label, description: ROOF_SHADE_INFO[kind].benefit })),
  ]
  const selected = config.roofShade ?? 'none'
  return <div className="roof-shade-option">
    <div className="roof-shade-head"><strong>Motoros árnyékoló</strong><small>{glass ? 'Üvegtető alatt nyáron gyorsan meleg lesz: a ponyva a napot megfogja, esőben az üveg véd.' : 'A polikarbonát szórt fényt ad; a ponyvával teljes árnyékot kapsz, amikor kell.'}</small></div>
    <div className="side-type-grid roof-shade-grid" role="radiogroup" aria-label="Tetőárnyékoló">
      {options.map((option) => {
        const on = selected === option.id
        const kind = option.id === 'none' ? undefined : option.id
        return <button type="button" role="radio" aria-checked={on} key={option.id} className={`side-type-card${on ? ' selected' : ''}`} onClick={() => onChange({ roofShade: kind, shadeFabric: kind ? config.shadeFabric ?? DEFAULT_SHADE_FABRIC : undefined })}>
          <ShadeIcon kind={option.id} />
          <span className="side-type-text"><strong>{option.label}</strong><small>{option.description}</small></span>
          <em>{on ? 'Kiválasztva' : signed(delta(kind))}</em>
        </button>
      })}
    </div>
    {config.roofShade && <>
      <div className="roof-shade-fabrics" role="radiogroup" aria-label="Ponyva színe">
        <span>Ponyva</span>
        {SHADE_FABRICS.map((fabric) => <button type="button" role="radio" aria-checked={config.shadeFabric === fabric.id} key={fabric.id} className={config.shadeFabric === fabric.id ? 'selected' : ''} title={fabric.name} onClick={() => onChange({ shadeFabric: fabric.id })}><i style={{ background: fabric.hex }} /><small>{fabric.name}</small></button>)}
      </div>
      <button type="button" className="side-motion-control" aria-pressed={scene.shadeOut > 50} onClick={() => onSceneChange({ shadeOut: scene.shadeOut > 50 ? 0 : 100 })}><Move size={17} /><span>{scene.shadeOut > 50 ? 'Árnyékoló behúzása' : 'Árnyékoló kihúzása'}</span></button>
      <p className="split-note">{formatHuf(prices[ROOF_SHADE_INFO[config.roofShade].priceKey])} / m² nettó · {formatNumber(roofShadeArea(config), 2)} m² · távirányítóval{config.smartHome ? ', az okosotthon-appból is' : ''}{config.sensors ? '; a szélérzékelő erős szélben automatikusan behúzza' : ''}.</p>
    </>}
  </div>
}
