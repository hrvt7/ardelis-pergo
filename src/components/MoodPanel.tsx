// Esti hangulat: éjszakai nézetben a LED fényereje és színe, a fűtés be/ki.
// Ha még nincs LED vagy fűtés a tervben, itt egy kattintással kipróbálható (árral).
import { Flame, Lightbulb, Moon, Plus, X } from 'lucide-react'
import { kelvinToHex } from '@/lib/color'
import { formatHuf } from '@/lib/pricing'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'

const TONES = [
  { kelvin: 2200, label: 'Gyertyafény' },
  { kelvin: 2700, label: 'Meleg' },
  { kelvin: 3500, label: 'Natúr' },
  { kelvin: 4000, label: 'Hideg' },
]

export default function MoodPanel({ config, scene, prices, onChange, onSceneChange, onClose }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void; onClose: () => void }) {
  const { tenant } = useTenant()
  const current = tenantPrice(tenant, config, prices).totalGross
  const ledPrice = tenantPrice(tenant, { ...config, led: true }, prices).totalGross - current
  const heaterPrice = tenantPrice(tenant, { ...config, heaters: Math.max(1, config.heaters) }, prices).totalGross - current
  const canLed = tenant.extras.led
  const canHeat = tenant.limits.maxHeaters > 0

  return <section className="mood-panel" aria-label="Esti hangulat">
    <header>
      <div><Moon size={16} /><span><strong>Esti hangulat</strong><small>Így néz ki a teraszod este</small></span></div>
      <button type="button" className="sun-close" aria-label="Esti hangulat bezárása" onClick={onClose}><X size={16} /></button>
    </header>

    {canLed && (config.led ? <>
      <div className="mood-row">
        <span><Lightbulb size={14} />LED fényerő</span>
        <strong>{scene.ledLevel}%</strong>
      </div>
      <input id="mood-level" aria-label="LED fényerő" className="range-input" type="range" min={0} max={100} step={5} value={scene.ledLevel} onChange={(event) => onSceneChange({ ledLevel: Number(event.target.value) })} />
      <div className="mood-tones" role="radiogroup" aria-label="Fény színe">
        {TONES.map((tone) => <button type="button" role="radio" aria-checked={scene.ledKelvin === tone.kelvin} key={tone.kelvin} className={scene.ledKelvin === tone.kelvin ? 'selected' : ''} onClick={() => onSceneChange({ ledKelvin: tone.kelvin })}>
          <i style={{ background: kelvinToHex(tone.kelvin) }} /><span>{tone.label}</span><small>{tone.kelvin} K</small>
        </button>)}
      </div>
    </> : <button type="button" className="mood-add" onClick={() => onChange({ led: true })}><Plus size={14} /><span><strong>Próbáld ki LED-világítással</strong><small>Rejtett periméter LED · +{formatHuf(ledPrice)}</small></span></button>)}

    {canHeat && (config.heaters > 0
      ? <button type="button" className={`mood-heat${scene.heatersOn ? ' is-on' : ''}`} aria-pressed={scene.heatersOn} onClick={() => onSceneChange({ heatersOn: !scene.heatersOn })}><Flame size={15} /><span><strong>Teraszfűtés {scene.heatersOn ? 'bekapcsolva' : 'kikapcsolva'}</strong><small>{config.heaters} db infrapanel</small></span></button>
      : <button type="button" className="mood-add" onClick={() => onChange({ heaters: 1 })}><Plus size={14} /><span><strong>Hűvös estékre: teraszfűtés</strong><small>1 db infrapanel · +{formatHuf(heaterPrice)}</small></span></button>)}
  </section>
}
