import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import type { PergolaConfig, PriceSettings } from '@/types/pergola'
import { presetConfig, tenantPrice } from '@/tenants/rules'
import { formatPrice } from '@/lib/pricing'
import { useTenant } from '@/tenants/TenantContext'
import { BuildingPicker } from '@/components/BuildingControls'
import { tr } from '@/i18n/locale'

/** 1. lépés – Termék (STEP_ARCHITECTURE.md): mit építesz, és egy kattintásos kiinduló csomagok (Porsche „javasolt konfiguráció”-mintája). */
export default function ProductStep({ config, prices, onChange, onPreset }: { config: PergolaConfig; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onPreset: (config: PergolaConfig) => void }) {
  const { tenant } = useTenant()
  const [applied, setApplied] = useState<string | null>(null)
  const building = config.building ?? 'pergola'
  const matching = tenant.presets.filter((preset) => (preset.config.building ?? 'pergola') === building)
  const presets = matching.length ? matching : tenant.presets

  return <div className="rb-step rb-step-product">
    <section className="rb-section rb-legacy">
      <h3>{tr('Építmény típusa', 'Bautyp')}</h3>
      <BuildingPicker config={config} prices={prices} onChange={onChange} />
    </section>
    {presets.length > 0 && <section className="rb-section">
      <h3>{tr('Kiindulás egy kattintással', 'Start mit einem Klick')}</h3>
      <p className="rb-note">{tr('Kész csomagok a gyártótól; utána minden lépésben tovább alakíthatod.', 'Fertige Pakete vom Hersteller; danach in jedem Schritt anpassbar.')}</p>
      <div className="rb-presets">
        {presets.map((preset) => {
          const next = presetConfig(tenant, preset.config)
          const total = tenantPrice(tenant, next, prices).totalGross
          return <button type="button" key={preset.id} className={`rb-option rb-preset${applied === preset.id ? ' is-selected' : ''}${preset.featured ? ' is-featured' : ''}`} onClick={() => { onPreset(next); setApplied(preset.id) }}>
            <span className="rb-switch-text"><strong>{preset.name}{preset.featured && <i className="rb-badge">{tr('Legnépszerűbb', 'Am beliebtesten')}</i>}</strong><small>{preset.description}</small><em>{tr('kb.', 'ca.')} {formatPrice(total)}</em></span>
            {applied === preset.id ? <Check size={17} /> : <ArrowRight size={17} />}
          </button>
        })}
      </div>
    </section>}
  </div>
}
