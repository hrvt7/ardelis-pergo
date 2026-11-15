// Veranda- és télikert-vezérlők: épülettípus-kártyák, oldalüvegezés, fűtés/hűtés és alap,
// figyelmeztetések, valamint a hatósági tudnivalók. Az árkülönbség mindig a teljes bruttó irányár változása.
import { Building2, Info, Landmark, TriangleAlert, Wand2 } from 'lucide-react'
import { resolveFix } from '@/lib/issueFixes'
import { availableBuildings, BUILDING_INFO, BUILDING_TYPES, buildingIssues, buildingPatch, CLIMATE_INFO, defaultWallGlazing, effectiveWallGlazing, isClosedBuilding, permitNotes, WALL_GLAZING_INFO, wallGlazingOptions } from '@/lib/buildings'
import { formatPrice } from '@/lib/pricing'
import { signedPrice } from '@/lib/money'
import { enabledRoofs, normalizeConfig, tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { BuildingType, ClimateType, PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'
import { tr } from '../i18n/locale'

type Change = (patch: Partial<PergolaConfig>) => void

const signed = (value: number) => signedPrice(value)

/** Animált jel a kártyán: a falak és az üveg kiválasztáskor „kirajzolódnak". */
function BuildingIcon({ type }: { type: BuildingType }) {
  const common = { width: 52, height: 36, viewBox: '0 0 52 36', 'aria-hidden': true, className: `building-icon building-icon-${type}` } as const
  if (type === 'pergola') return <svg {...common}>
    <path d="M6 12h40" className="bi-roof" pathLength={1} />{[12, 18, 24, 30, 36, 42].map((x) => <path key={x} d={`M${x} 9v6`} className="bi-slat" />)}
    <path d="M8 13v19M44 13v19" className="bi-post" pathLength={1} /><path d="M3 32h46" className="bi-ground" />
  </svg>
  if (type === 'carport') return <svg {...common}>
    <path d="M4 10h44" className="bi-roof" pathLength={1} /><path d="M6 10v3M46 10v3" className="bi-slat" />
    <path d="M9 13v18M43 13v18" className="bi-post" pathLength={1} />
    {/* autó: karosszéria, tető, kerekek */}
    <path d="M15 27v-4l3-3h8l5 3h5v4z" className="bi-car" /><path d="M19 23l2-2h6l3 2" className="bi-car" />
    <circle cx="19" cy="28" r="2" className="bi-wheel" /><circle cx="33" cy="28" r="2" className="bi-wheel" />
    <path d="M2 32h48" className="bi-ground bi-slab" />
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

function ModularIcon() {
  return <svg width={52} height={36} viewBox="0 0 52 36" aria-hidden="true" className="building-icon building-icon-modular">
    <path d="M5 16L26 5l21 11" className="bi-roof" pathLength={1} />
    <path d="M9 14v18M43 14v18" className="bi-post" pathLength={1} />
    <rect x="13" y="20" width="7" height="6" className="bi-pane" /><rect x="31" y="20" width="7" height="6" className="bi-pane" />
    <rect x="23" y="20" width="6" height="12" className="bi-door" />
    <path d="M3 32h46" className="bi-ground bi-slab" />
  </svg>
}

/** A modulház kártyája a választóban: nem keretes építmény, hanem a konfigurátoron belüli külön modell (ModularWorkspace). */
export interface ModularChoice {
  selected: boolean
  onSelect: () => void
  /** A kártyán megjelenő ár-jelzés (pl. „445 000 Ft / m² nettó”). */
  priceNote: string
}

/** „Mit építesz?": pergola / veranda / télikert (és ha a gyártó kínálja, modulház), csak a gyártó kínálatából. */
export function BuildingPicker({ config, prices, onChange, modular }: { config: PergolaConfig; prices: PriceSettings; onChange: Change; modular?: ModularChoice }) {
  const { tenant } = useTenant()
  const roofs = enabledRoofs(tenant)
  // Minden építménytípus ugyanebben a konfigurátorban választható (a carport is): a modell, a lépések és az ár átáll.
  const available: BuildingType[] = availableBuildings(roofs, tenant.sides)
  if (available.length < 2 && !modular) return null
  const current: BuildingType | 'modular' = modular?.selected ? 'modular' : config.building ?? 'pergola'
  const base = tenantPrice(tenant, config, prices).totalGross
  const patchFor = (building: BuildingType) => buildingPatch(config, building, roofs, tenant.sides)
  const delta = (building: BuildingType) => tenantPrice(tenant, normalizeConfig(tenant, { ...config, ...patchFor(building) }), prices).totalGross - base
  return <div className="building-picker" role="radiogroup" aria-label={tr('Építmény típusa', 'Bauwerkstyp')}>
    {BUILDING_TYPES.filter((type) => available.includes(type)).map((type, index) => {
      const info = BUILDING_INFO[type]
      const selected = current === type
      // Modulház nézetből visszaváltva az árkülönbség nem értelmezhető (más termék), ezért ott nem jelenik meg.
      return <button type="button" role="radio" aria-checked={selected} key={type} style={{ ['--i' as string]: index }} className={`building-card building-${type}${selected ? ' selected' : ''}`} onClick={() => !selected && onChange(modular?.selected && type === (config.building ?? 'pergola') ? {} : patchFor(type))}>
        <span className="building-card-head"><BuildingIcon type={type} /><span><strong>{info.label}</strong><small>{info.short}</small></span><em>{selected ? tr('Kiválasztva', 'Ausgewählt') : modular?.selected ? '' : signed(delta(type))}</em></span>
        <span className="building-card-text">{info.description}</span>
        <span className="building-card-traits"><span className="building-season">{info.season}</span>{info.traits.map((trait) => <span key={trait}>{trait}</span>)}</span>
      </button>
    })}
    {modular && <button type="button" role="radio" aria-checked={modular.selected} style={{ ['--i' as string]: available.length }} className={`building-card building-modular${modular.selected ? ' selected' : ''}`} onClick={() => !modular.selected && modular.onSelect()}>
      <span className="building-card-head"><ModularIcon /><span><strong>{tr('Modulház', 'Modulhaus')}</strong><small>{tr('Típusház valós méretben', 'Typenhaus in Originalgröße')}</small></span><em>{modular.selected ? tr('Kiválasztva', 'Ausgewählt') : modular.priceNote}</em></span>
      <span className="building-card-text">{tr('Előregyártott, darus emeléssel telepített családi ház; kívül kulcsrakész, belül emelt szerkezetkész.', 'Vorgefertigtes, per Kran versetztes Einfamilienhaus; außen schlüsselfertig, innen Ausbauhaus.')}</span>
      <span className="building-card-traits"><span className="building-season">{tr('Egész évben', 'Ganzjährig')}</span><span>{tr('Típusház', 'Typenhaus')}</span><span>{tr('Pontalapozással', 'Mit Punktfundamenten')}</span></span>
    </button>}
  </div>
}

/** Oldalüvegezés: edzett / kétrétegű / háromrétegű hőszigetelt üveg (zárt építménynél). */
export function WallGlazingPicker({ config, prices, onChange }: { config: PergolaConfig; prices: PriceSettings; onChange: Change }) {
  const options = wallGlazingOptions(config.building)
  if (!options.length) return null
  const current = effectiveWallGlazing(config)
  return <div className="glazing-picker wall-glazing">
    <div className="section-title"><h3>{tr('Oldalüvegezés', 'Seitenverglasung')}</h3><p>{config.building === 'conservatory' ? tr('A télikert hőszigetelt üvegezést kap: a Low-E bevonat és a gáztöltet csökkenti a hőveszteséget.', 'Der Wintergarten erhält Wärmeschutzglas: Low-E-Beschichtung und Gasfüllung senken den Wärmeverlust.') : tr('Az edzett üveg hideg térhez elég; hőszigetelt üveggel a veranda hűvösebb időben is kellemesebb.', 'ESG reicht für einen Kaltraum; mit Wärmeschutzglas ist die Veranda auch bei kühlerem Wetter angenehmer.')}</p></div>
    <div className="glazing-chips" role="radiogroup" aria-label={tr('Oldalüvegezés', 'Seitenverglasung')}>{options.map((id) => {
      const info = WALL_GLAZING_INFO[id]
      const price = info.priceKey ? prices[info.priceKey] : 0
      return <button type="button" key={id} role="radio" aria-checked={current === id} className={`glazing-chip wall-glazing-${id}${current === id ? ' selected' : ''}`} onClick={() => onChange({ wallGlazing: id === defaultWallGlazing(config.building) ? undefined : id })}>
        <span className="glazing-swatch" aria-hidden="true" /><strong>{info.label}</strong><small>{info.short}</small><small className="ug">{info.ug}</small><em>{price > 0 ? `+${formatPrice(price)} / m²` : 'Alapkivitel'}</em>
      </button>
    })}</div>
    <p className="split-note">{tr('Az Ug-értékek tájékoztató jellegűek; a pontos adat a gyártói adatlapon szerepel.', 'Die Ug-Werte sind Richtwerte; genaue Daten stehen im Herstellerdatenblatt.')}</p>
  </div>
}

const CLIMATES: (ClimateType | 'none')[] = ['none', 'split', 'underfloor', 'both']

/** Télikert: fűtés/hűtés és alap. Veranda: tájékoztatás, hogy a tér nem fűtött. */
export function ClimateSection({ config, prices, onChange, scene, onSceneChange }: { config: PergolaConfig; prices: PriceSettings; onChange: Change; scene: SceneSettings; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const { tenant } = useTenant()
  if (!isClosedBuilding(config.building)) return null
  if (config.building === 'veranda') {
    const conservatory = availableBuildings(enabledRoofs(tenant), tenant.sides).includes('conservatory')
    return <div className="building-note"><Info size={18} /><p><strong>{tr('A veranda nem fűtött tér', 'Die Veranda ist kein beheizter Raum')}</strong>Hideg időben is védett, de egész éves, fűtött használathoz hőszigetelt télikert kell.{conservatory && <> <button type="button" className="link-button" onClick={() => onChange(buildingPatch(config, 'conservatory', enabledRoofs(tenant), tenant.sides))}>{tr('Váltás télikertre', 'Zum Wintergarten wechseln')}</button></>}</p></div>
  }
  const base = tenantPrice(tenant, config, prices).totalGross
  const delta = (climate: ClimateType | 'none') => tenantPrice(tenant, { ...config, climate: climate === 'none' ? undefined : climate }, prices).totalGross - base
  const current = config.climate ?? 'none'
  return <div className="climate-section">
    <div className="glazing-chips climate-chips" role="radiogroup" aria-label={tr('Fűtés és hűtés', 'Heizen und Kühlen')}>{CLIMATES.map((id) => {
      const selected = current === id
      const info = id === 'none' ? { label: tr('Nincs', 'Keine'), short: tr('Később kerül a térbe', 'Kommt später in den Raum') } : CLIMATE_INFO[id]
      return <button type="button" key={id} role="radio" aria-checked={selected} className={`glazing-chip climate-${id}${selected ? ' selected' : ''}`} onClick={() => onChange({ climate: id === 'none' ? undefined : id })}>
        <span className="glazing-swatch" aria-hidden="true" /><strong>{info.label}</strong><small>{info.short}</small><em>{selected ? tr('Kiválasztva', 'Ausgewählt') : signed(delta(id))}</em>
      </button>
    })}</div>
    {config.climate && <div className="climate-run" role="radiogroup" aria-label={tr('Klíma működése a modellen', 'Klimabetrieb am Modell')}>
      <span>{tr('Működés a modellen', 'Funktion am Modell')}</span>
      {(['off', 'cool', 'heat'] as const).filter((mode) => mode !== 'cool' || config.climate !== 'underfloor').map((mode) => <button type="button" key={mode} role="radio" aria-checked={scene.climateRun === mode} className={`climate-run-${mode}${scene.climateRun === mode ? ' on' : ''}`} onClick={() => onSceneChange({ climateRun: mode })}>{mode === 'off' ? 'Ki' : mode === 'cool' ? tr('Hűtés', 'Kühlen') : tr('Fűtés', 'Heizen')}</button>)}
    </div>}
    <button type="button" className={`extra-card${config.foundation ? ' is-on' : ''}`} role="switch" aria-checked={Boolean(config.foundation)} onClick={() => onChange({ foundation: config.foundation ? undefined : true })}>
      <Building2 size={20} strokeWidth={1.5} />
      <span><strong>{tr('Alap és szigetelt padló', 'Fundament und gedämmter Boden')}</strong><small>{tr('Alapozás, vízszigetelés, padlószerkezet', 'Fundament, Abdichtung, Bodenaufbau')}</small><em>{formatPrice(prices.foundationPerM2Net)} / m²</em></span>
      <span className={`switch-track${config.foundation ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
    <p className="split-note">{tr('A fűtés-hűtés teljesítményét és a padló felépítését a felmérés után tervezi a gyártó; az ár irányár.', 'Heiz-/Kühlleistung und Bodenaufbau plant der Hersteller nach dem Aufmaß; der Preis ist ein Richtpreis.')}</p>
  </div>
}

/** Műszaki/logikai észrevételek: nem tiltások, a felhasználó dönt. */
/** Egy kattintásos javítás gombja (csak ha a javítás ennél a gyártónál ténylegesen megszünteti a jelzést). */
export function IssueFixButton({ config, issueId, onFix }: { config: PergolaConfig; issueId: string; onFix?: Change }) {
  const { tenant } = useTenant()
  if (!onFix) return null
  const fix = resolveFix(tenant, config, issueId)
  if (!fix) return null
  return <button type="button" className="issue-fix" onClick={() => onFix(fix.patch)}><Wand2 size={14} />Javítás: {fix.label}</button>
}

/** Jelzések; `only` megadásakor csak azok, amelyek az adott lépésben javíthatók (így mindegyik egyszer, a helyén jelenik meg). */
export function BuildingIssues({ config, onFix, only }: { config: PergolaConfig; onFix?: Change; only?: readonly string[] }) {
  const issues = buildingIssues(config).filter((issue) => !only || only.includes(issue.id))
  if (!issues.length) return null
  return <ul className="building-issues" aria-live="polite">{issues.map((issue, index) => <li key={issue.id} className={`issue-${issue.level}`} style={{ ['--i' as string]: index }}>{issue.level === 'warn' ? <TriangleAlert size={17} /> : <Info size={17} />}<span>{issue.text}<IssueFixButton config={config} issueId={issue.id} onFix={onFix} /></span></li>)}</ul>
}

/** Építéshatósági és energetikai tudnivalók (tájékoztató, nem jogi tanács). */
export function PermitNotice({ building }: { building: PergolaConfig['building'] }) {
  const notes = permitNotes(building)
  if (!notes.length) return null
  return <details className="permit-notice">
    <summary><Landmark size={17} /><span>{tr('Építési hatósági teendők', 'Baubehördliche Schritte')}</span></summary>
    <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
    <p className="permit-disclaimer">{tr('Tájékoztató jellegű, nem jogi tanács. A helyi szabályok megrendelés előtt az illetékes hatóságnál ellenőrizendők.', 'Unverbindlich, keine Rechtsberatung. Die örtlichen Vorschriften sind vor der Bestellung bei der zuständigen Behörde zu prüfen.')}</p>
  </details>
}
