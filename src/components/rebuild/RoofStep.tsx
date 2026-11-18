import { Check, ChevronDown } from 'lucide-react'
import type { PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'
import { enabledRoofs, tenantPrice } from '@/tenants/rules'
import { BUILDING_ROOFS, isClosedBuilding } from '@/lib/buildings'
import { defaultGlazing, effectiveGlazing, GLAZING_INFO, glazingOptions, glazingPriceKey, PITCH_RANGE, ROOF_INFO, roofRise } from '@/lib/roofs'
import { formatPrice } from '@/lib/pricing'
import { issuesForStep } from '@/lib/configSteps'
import { useTenant } from '@/tenants/TenantContext'
import { BuildingIssues } from '@/components/BuildingControls'
import { RoofShadeOption } from '@/components/SideAndExtras'
import { RoofIcon, SolarToggle } from '@/components/ConfiguratorControls'
import { tr } from '@/i18n/locale'
import LiquidSlider from './LiquidSlider'
import LouvreArc from './LouvreArc'

/** 3. lépés – Tető (docs/rebuild/STEP_ARCHITECTURE.md): rendszer, burkolat, mozgatás, dőlés; további: árnyékoló, napelem. */
export default function RoofStep({ config, scene, prices, onChange, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const { tenant } = useTenant()
  const current = tenantPrice(tenant, config, prices).totalGross
  const roofs = enabledRoofs(tenant).filter((roof) => !isClosedBuilding(config.building) || BUILDING_ROOFS[config.building].includes(roof))
  const info = ROOF_INFO[config.roof]
  const glazings = glazingOptions(config.roof)
  const glazing = effectiveGlazing(config)
  const pitch = config.pitch ?? 0

  return <div className="rb-step rb-step-roof">
    <section className="rb-section">
      <h3>{tr('Tetőrendszer', 'Dachsystem')}</h3>
      <div className="rb-roof-list">
        {roofs.map((roof) => {
          const brand = tenant.roofs[roof]!
          const active = roof === config.roof
          const delta = active ? 0 : tenantPrice(tenant, { ...config, roof }, prices).totalGross - current
          const roofInfo = ROOF_INFO[roof]
          return <button type="button" key={roof} className={`rb-option rb-roof${active ? ' is-selected' : ''}`} aria-pressed={active} onClick={() => onChange({ roof })}>
            <span className="rb-roof-icon"><RoofIcon roof={roof} /></span>
            <span className="rb-roof-text"><strong>{brand.name}</strong><small>{brand.short}</small>
              <span className="rb-roof-props"><span>{tr('Árnyék', 'Schatten')}: {roofInfo.shade}</span><span>{tr('Eső', 'Regen')}: {roofInfo.rain}</span></span>
            </span>
            <em>{active ? <span className="rb-option-check"><Check size={12} strokeWidth={3} /></span> : `${delta > 0 ? '+' : '−'}${formatPrice(Math.abs(delta))}`}</em>
          </button>
        })}
      </div>
      {isClosedBuilding(config.building) && <p className="rb-note">{config.building === 'conservatory' ? tr('Télikerthez üveg- vagy fix (szigetelt) tető való.', 'Für einen Wintergarten eignet sich ein Glas- oder festes (gedämmtes) Dach.') : tr('Verandához zárt tető való.', 'Für eine Veranda eignet sich ein geschlossenes Dach.')}</p>}
    </section>

    {glazings.length > 0 && <section className="rb-section">
      <h3>{config.roof === 'glass' ? tr('Üveg típusa', 'Glasart') : tr('Polikarbonát típusa', 'Polycarbonat-Art')}</h3>
      <div className="rb-mount-grid">
        {glazings.map((id) => {
          const g = GLAZING_INFO[id]
          const key = glazingPriceKey(config.roof, id)
          const extra = key ? prices[key] : 0
          const active = glazing === id
          return <button type="button" key={id} className={`rb-option rb-glazing${active ? ' is-selected' : ''}`} aria-pressed={active} onClick={() => onChange({ glazing: id === defaultGlazing(config.roof) ? undefined : id })}>
            <strong>{g.label}</strong><small>{tr('Fény', 'Licht')} {g.light} · {tr('hő', 'Wärme')} {g.solar}</small><em>{extra > 0 ? `+${formatPrice(extra)} / m²` : tr('Alapkivitel', 'Standard')}</em>
            {active && <span className="rb-option-check"><Check size={12} strokeWidth={3} /></span>}
          </button>
        })}
      </div>
      <p className="rb-note">{tr('A fény- és hőértékek tájékoztató adatok.', 'Licht- und Wärmewerte sind Richtwerte.')}</p>
    </section>}

    {info.motion !== 'none' && <section className="rb-section">
      <h3>{info.motion === 'tilt' ? tr('Próbáld ki: lamellaszög', 'Ausprobieren: Lamellenwinkel') : tr('Próbáld ki: tetőnyitás', 'Ausprobieren: Dachöffnung')}</h3>
      {info.motion === 'tilt'
        ? <LouvreArc value={config.louverAngle} onChange={(louverAngle) => { onChange({ louverAngle }); if (scene.mechanism || scene.smartLouver) onSceneChange({ mechanism: false, smartLouver: false }) }} />
        : <LiquidSlider label={tr('Tetőnyitás', 'Dachöffnung')} unit="%" step={1} value={Math.round(config.louverAngle / 0.9)} min={0} max={100} onChange={(open) => onChange({ louverAngle: Math.round(open * 9) / 10 })} />}
      <p className="rb-note">{tr('Bemutató: az árat nem befolyásolja.', 'Vorführung: ohne Einfluss auf den Preis.')}</p>
    </section>}

    <section className="rb-section">
      <h3>{tr('Dőlés', 'Neigung')}</h3>
      <LiquidSlider label={tr('Tetődőlés', 'Dachneigung')} unit="°" step={1} value={pitch} min={PITCH_RANGE[0]} max={PITCH_RANGE[1]} onChange={(next) => onChange({ pitch: next || undefined })} />
      {pitch > 0 && <p className="rb-note">{tr(`A tető hátsó (fali) éle ${roofRise(config).toFixed(2).replace('.', ',')} m-rel magasabb az elülső oszlopmagasságnál, így a csapadék előre folyik le.`, `Die hintere (wandseitige) Dachkante liegt ${roofRise(config).toFixed(2).replace('.', ',')} m höher als die vordere Steherhöhe; Niederschlag läuft nach vorne ab.`)}</p>}
      <BuildingIssues config={config} onFix={onChange} only={issuesForStep('roof')} />
    </section>

    <details className="rb-section rb-disclosure">
      <summary><span><strong>{tr('További beállítások', 'Weitere Einstellungen')}</strong><small>{tr('Tetőárnyékoló, napelem', 'Dachbeschattung, Photovoltaik')}</small></span><ChevronDown size={18} /></summary>
      <div className="rb-legacy">
        <RoofShadeOption config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
        <SolarToggle config={config} prices={prices} onChange={onChange} />
      </div>
    </details>
  </div>
}
