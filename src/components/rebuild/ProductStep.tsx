import { ArrowRight, Check } from 'lucide-react'
import type { PergolaConfig, PriceSettings } from '@/types/pergola'
import { presetConfig, tenantPrice } from '@/tenants/rules'
import { signedPrice } from '@/lib/money'
import { useTenant } from '@/tenants/TenantContext'
import { BuildingPicker } from '@/components/BuildingControls'
import { tr } from '@/i18n/locale'

/** 1. lépés – Termék (STEP_ARCHITECTURE.md): mit építesz, és egy kattintásos kiinduló csomagok (Porsche „javasolt konfiguráció”-mintája). */
export default function ProductStep({ config, prices, onChange, onPreset }: { config: PergolaConfig; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onPreset: (config: PergolaConfig) => void }) {
  const { tenant } = useTenant()
  const building = config.building ?? 'pergola'
  const matching = tenant.presets.filter((preset) => (preset.config.building ?? 'pergola') === building)
  const presets = matching.length ? matching : tenant.presets
  const current = tenantPrice(tenant, config, prices).totalGross
  const same = (next: PergolaConfig) => JSON.stringify(next) === JSON.stringify(config)

  return <div className="rb-step rb-step-product">
    <section className="rb-section rb-legacy">
      <h3>{tr('Építmény típusa', 'Bautyp')}</h3>
      <BuildingPicker config={config} prices={prices} onChange={onChange} />
    </section>
    {presets.length > 0 && <section className="rb-section">
      <h3>{tr('Kiindulás egy kattintással', 'Start mit einem Klick')}</h3>
      <p className="rb-note">{tr('A csomag után minden lépésben tovább alakíthatod.', 'Danach in jedem Schritt anpassbar.')}</p>
      <div className="rb-presets">
        {presets.map((preset) => {
          const next = presetConfig(tenant, preset.config)
          const active = same(next)
          // Ugyanaz a jelölés, mint a típuskártyákon: az árkülönbség a mostani tervhez képest.
          const delta = tenantPrice(tenant, next, prices).totalGross - current
          return <button type="button" key={preset.id} className={`rb-option rb-preset${active ? ' is-selected' : ''}`} aria-pressed={active} onClick={() => !active && onPreset(next)}>
            <span className="rb-switch-text"><strong>{preset.name}{preset.featured && <i className="rb-badge">{tr('Legnépszerűbb', 'Am beliebtesten')}</i>}</strong><small>{preset.description}</small></span>
            <em className="rb-preset-price">{active ? <span className="rb-option-check"><Check size={12} strokeWidth={3} /></span> : signedPrice(delta)}</em>{!active && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        })}
      </div>
    </section>}
  </div>
}
