// Veranda- és télikert-vezérlők: épülettípus-kártyák, oldalüvegezés, fűtés/hűtés és alap,
// figyelmeztetések, valamint a hatósági tudnivalók. Az árkülönbség mindig a teljes bruttó irányár változása.
import { Building2, Info, Landmark, TriangleAlert } from 'lucide-react'
import { availableBuildings, BUILDING_INFO, BUILDING_TYPES, buildingIssues, buildingPatch, CLIMATE_INFO, defaultWallGlazing, effectiveWallGlazing, isClosedBuilding, permitNotes, WALL_GLAZING_INFO, wallGlazingOptions } from '@/lib/buildings'
import { formatHuf } from '@/lib/pricing'
import { enabledRoofs, normalizeConfig, tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { BuildingType, ClimateType, PergolaConfig, PriceSettings } from '@/types/pergola'

type Change = (patch: Partial<PergolaConfig>) => void

const signed = (value: number) => (Math.abs(value) < 500 ? '±0 Ft' : `${value > 0 ? '+' : '−'}${formatHuf(Math.abs(value))}`)

/** Animált jel a kártyán: a falak és az üveg kiválasztáskor „kirajzolódnak". */
function BuildingIcon({ type }: { type: BuildingType }) {
  const common = { width: 52, height: 36, viewBox: '0 0 52 36', 'aria-hidden': true, className: `building-icon building-icon-${type}` } as const
  if (type === 'pergola') return <svg {...common}>
    <path d="M6 12h40" className="bi-roof" pathLength={1} />{[12, 18, 24, 30, 36, 42].map((x) => <path key={x} d={`M${x} 9v6`} className="bi-slat" />)}
    <path d="M8 13v19M44 13v19" className="bi-post" pathLength={1} /><path d="M3 32h46" className="bi-ground" />
  </svg>
  if (type === 'veranda') return <svg {...common}>
    <path d="M5 13L26 5l21 8z" className="bi-roof" pathLength={1} />
    <rect x="8" y="14" width="12" height="17" className="bi-pane" /><rect x="20" y="14" width="12" height="17" className="bi-pane" /><rect x="32" y="14" width="12" height="17" className="bi-pane" />
    <path d="M8 14v17M44 14v17" className="bi-post" pathLength={1} /><path d="M3 32h46" className="bi-ground" />
  </svg>
  return <svg {...common}>
    <path d="M4 14L26 3l22 11z" className="bi-roof" pathLength={1} />
    <rect x="7" y="14" width="19" height="17" className="bi-pane" /><rect x="26" y="14" width="19" height="17" className="bi-pane" />
    <rect x="32" y="17" width="9" height="14" className="bi-door" />
    <path d="M13 28c1.6-2 1.6-3.4 0-5.4M18 28c1.6-2 1.6-3.4 0-5.4" className="bi-heat" />
    <path d="M7 14v17M45 14v17" className="bi-post" pathLength={1} /><path d="M2 32h48" className="bi-ground bi-slab" />
  </svg>
}

/** „Mit építesz?": pergola / veranda / télikert, csak a gyártó kínálatából. */
export function BuildingPicker({ config, prices, onChange }: { config: PergolaConfig; prices: PriceSettings; onChange: Change }) {
  const { tenant } = useTenant()
  const roofs = enabledRoofs(tenant)
  const available = availableBuildings(roofs, tenant.sides)
  if (available.length < 2) return null
  const current: BuildingType = config.building ?? 'pergola'
  const base = tenantPrice(tenant, config, prices).totalGross
  const patchFor = (building: BuildingType) => buildingPatch(config, building, roofs, tenant.sides)
  const delta = (building: BuildingType) => tenantPrice(tenant, normalizeConfig(tenant, { ...config, ...patchFor(building) }), prices).totalGross - base
  return <div className="building-picker" role="radiogroup" aria-label="Építmény típusa">
    {BUILDING_TYPES.filter((type) => available.includes(type)).map((type, index) => {
      const info = BUILDING_INFO[type]
      const selected = current === type
      return <button type="button" role="radio" aria-checked={selected} key={type} style={{ ['--i' as string]: index }} className={`building-card building-${type}${selected ? ' selected' : ''}`} onClick={() => !selected && onChange(patchFor(type))}>
        <span className="building-card-head"><BuildingIcon type={type} /><span><strong>{info.label}</strong><small>{info.short}</small></span><em>{selected ? 'Kiválasztva' : signed(delta(type))}</em></span>
        <span className="building-card-text">{info.description}</span>
        <span className="building-card-traits"><span className="building-season">{info.season}</span>{info.traits.map((trait) => <span key={trait}>{trait}</span>)}</span>
      </button>
    })}
  </div>
}

/** Oldalüvegezés: edzett / kétrétegű / háromrétegű hőszigetelt üveg (zárt építménynél). */
export function WallGlazingPicker({ config, prices, onChange }: { config: PergolaConfig; prices: PriceSettings; onChange: Change }) {
  const options = wallGlazingOptions(config.building)
  if (!options.length) return null
  const current = effectiveWallGlazing(config)
  return <div className="glazing-picker wall-glazing">
    <div className="section-title"><h3>Oldalüvegezés</h3><p>{config.building === 'conservatory' ? 'A télikert hőszigetelt üvegezést kap: a Low-E bevonat és a gáztöltet csökkenti a hőveszteséget.' : 'Az edzett üveg hideg térhez elég; hőszigetelt üveggel a veranda hűvösebb időben is kellemesebb.'}</p></div>
    <div className="glazing-chips" role="radiogroup" aria-label="Oldalüvegezés">{options.map((id) => {
      const info = WALL_GLAZING_INFO[id]
      const price = info.priceKey ? prices[info.priceKey] : 0
      return <button type="button" key={id} role="radio" aria-checked={current === id} className={`glazing-chip wall-glazing-${id}${current === id ? ' selected' : ''}`} onClick={() => onChange({ wallGlazing: id === defaultWallGlazing(config.building) ? undefined : id })}>
        <span className="glazing-swatch" aria-hidden="true" /><strong>{info.label}</strong><small>{info.short}</small><small className="ug">{info.ug}</small><em>{price > 0 ? `+${formatHuf(price)} / m²` : 'Alapkivitel'}</em>
      </button>
    })}</div>
    <p className="split-note">Az Ug-értékek tájékoztató jellegűek; a pontos adat a gyártói adatlapon szerepel.</p>
  </div>
}

const CLIMATES: (ClimateType | 'none')[] = ['none', 'split', 'underfloor', 'both']

/** Télikert: fűtés/hűtés és alap. Veranda: tájékoztatás, hogy a tér nem fűtött. */
export function ClimateSection({ config, prices, onChange }: { config: PergolaConfig; prices: PriceSettings; onChange: Change }) {
  const { tenant } = useTenant()
  if (!isClosedBuilding(config.building)) return null
  if (config.building === 'veranda') {
    const conservatory = availableBuildings(enabledRoofs(tenant), tenant.sides).includes('conservatory')
    return <div className="building-note"><Info size={18} /><p><strong>A veranda nem fűtött tér</strong>Hideg időben is védett, de egész éves, fűtött használathoz hőszigetelt télikert kell.{conservatory && <> <button type="button" className="link-button" onClick={() => onChange(buildingPatch(config, 'conservatory', enabledRoofs(tenant), tenant.sides))}>Váltás télikertre</button></>}</p></div>
  }
  const base = tenantPrice(tenant, config, prices).totalGross
  const delta = (climate: ClimateType | 'none') => tenantPrice(tenant, { ...config, climate: climate === 'none' ? undefined : climate }, prices).totalGross - base
  const current = config.climate ?? 'none'
  return <div className="climate-section">
    <div className="glazing-chips climate-chips" role="radiogroup" aria-label="Fűtés és hűtés">{CLIMATES.map((id) => {
      const selected = current === id
      const info = id === 'none' ? { label: 'Nincs', short: 'Később kerül a térbe' } : CLIMATE_INFO[id]
      return <button type="button" key={id} role="radio" aria-checked={selected} className={`glazing-chip climate-${id}${selected ? ' selected' : ''}`} onClick={() => onChange({ climate: id === 'none' ? undefined : id })}>
        <span className="glazing-swatch" aria-hidden="true" /><strong>{info.label}</strong><small>{info.short}</small><em>{selected ? 'Kiválasztva' : signed(delta(id))}</em>
      </button>
    })}</div>
    <button type="button" className={`extra-card${config.foundation ? ' is-on' : ''}`} role="switch" aria-checked={Boolean(config.foundation)} onClick={() => onChange({ foundation: config.foundation ? undefined : true })}>
      <Building2 size={20} strokeWidth={1.5} />
      <span><strong>Alap és szigetelt padló</strong><small>Alapozás, vízszigetelés, padlószerkezet</small><em>{formatHuf(prices.foundationPerM2Net)} / m²</em></span>
      <span className={`switch-track${config.foundation ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
    <p className="split-note">A fűtés-hűtés teljesítményét és a padló felépítését a felmérés után tervezi a gyártó; az ár irányár.</p>
  </div>
}

/** Műszaki/logikai észrevételek: nem tiltások, a felhasználó dönt. */
export function BuildingIssues({ config }: { config: PergolaConfig }) {
  const issues = buildingIssues(config)
  if (!issues.length) return null
  return <ul className="building-issues" aria-live="polite">{issues.map((issue, index) => <li key={issue.text} className={`issue-${issue.level}`} style={{ ['--i' as string]: index }}>{issue.level === 'warn' ? <TriangleAlert size={17} /> : <Info size={17} />}<span>{issue.text}</span></li>)}</ul>
}

/** Építéshatósági és energetikai tudnivalók (tájékoztató, nem jogi tanács). */
export function PermitNotice({ building }: { building: PergolaConfig['building'] }) {
  const notes = permitNotes(building)
  if (!notes.length) return null
  return <details className="permit-notice">
    <summary><Landmark size={17} /><span>Építési hatósági teendők</span></summary>
    <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
    <p className="permit-disclaimer">Tájékoztató jellegű, nem jogi tanács. A helyi szabályok megrendelés előtt az illetékes hatóságnál ellenőrizendők.</p>
  </details>
}
