// Esti hangulat: éjszakai nézetben a LED fényereje és színe, a fűtés be/ki.
// Ha még nincs LED vagy fűtés a tervben, itt egy kattintással kipróbálható (árral).
import { Fan, Flame, Lightbulb, Moon, Palette, Plus, X } from 'lucide-react'
import { RGB_SWATCHES } from '@/lib/comfort'
import { kelvinToHex } from '@/lib/color'
import { formatPrice } from '@/lib/pricing'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import type { PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'
import { localized, tr } from '../i18n/locale'

const TONES = localized(() => ([
  { kelvin: 2200, label: tr('Gyertyafény', 'Kerzenlicht') },
  { kelvin: 2700, label: tr('Meleg', 'Warm') },
  { kelvin: 3500, label: tr('Natúr', 'Natur') },
  { kelvin: 4000, label: tr('Hideg', 'Kalt') },
]))

export default function MoodPanel({ config, scene, prices, onChange, onSceneChange, onClose }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void; onClose: () => void }) {
  const { tenant } = useTenant()
  const current = tenantPrice(tenant, config, prices).totalGross
  const ledPrice = tenantPrice(tenant, { ...config, led: true }, prices).totalGross - current
  const heaterPrice = tenantPrice(tenant, { ...config, heaters: Math.max(1, config.heaters) }, prices).totalGross - current
  const rgbPrice = tenantPrice(tenant, { ...config, led: true, ledRgb: true }, prices).totalGross - tenantPrice(tenant, { ...config, led: true }, prices).totalGross
  // Carportnál csak a világítás értelmezhető: fűtés és színes LED nem tartozik a termékhez.
  const carport = config.building === 'carport'
  const canLed = tenant.extras.led
  const canHeat = tenant.limits.maxHeaters > 0 && !carport
  const canRgb = tenant.extras.rgb && !carport

  return <section className="mood-panel" aria-label={tr('Esti hangulat', 'Abendstimmung')}>
    <header>
      <div><Moon size={16} /><span><strong>{tr('Esti hangulat', 'Abendstimmung')}</strong><small>{carport ? tr('Így néz ki a beállód este', 'So sieht Ihr Stellplatz abends aus') : tr('Így néz ki a teraszod este', 'So sieht Ihre Terrasse abends aus')}</small></span></div>
      <button type="button" className="sun-close" aria-label={tr('Esti hangulat bezárása', 'Abendstimmung schließen')} onClick={onClose}><X size={16} /></button>
    </header>

    {canLed && (config.led ? <>
      <div className="mood-row">
        <span><Lightbulb size={14} />{tr('LED fényerő', 'LED-Helligkeit')}</span>
        <strong>{scene.ledLevel}%</strong>
      </div>
      <input id="mood-level" aria-label={tr('LED fényerő', 'LED-Helligkeit')} className="range-input" type="range" min={0} max={100} step={5} value={scene.ledLevel} onChange={(event) => onSceneChange({ ledLevel: Number(event.target.value) })} />
      <div className="mood-tones" role="radiogroup" aria-label={tr('Fény színe', 'Lichtfarbe')}>
        {TONES.map((tone) => <button type="button" role="radio" aria-checked={scene.ledKelvin === tone.kelvin && !scene.ledColor} key={tone.kelvin} className={scene.ledKelvin === tone.kelvin && !scene.ledColor ? 'selected' : ''} onClick={() => onSceneChange({ ledKelvin: tone.kelvin, ledColor: null })}>
          <i style={{ background: kelvinToHex(tone.kelvin) }} /><span>{tone.label}</span><small>{tone.kelvin} K</small>
        </button>)}
      </div>
      {config.ledRgb ? <>
        <div className="mood-row"><span><Palette size={14} />{tr('Színes jelenet', 'Farbszene')}</span><strong>{RGB_SWATCHES.find((swatch) => swatch.hex === scene.ledColor)?.name ?? tr('Fehér', 'Weiß')}</strong></div>
        <div className="rgb-swatches mood-rgb" role="radiogroup" aria-label={tr('LED színe', 'LED-Farbe')}>
          {RGB_SWATCHES.map((swatch) => <button type="button" role="radio" aria-checked={scene.ledColor === swatch.hex} key={swatch.hex} className={scene.ledColor === swatch.hex ? 'selected' : ''} style={{ '--swatch': swatch.hex } as React.CSSProperties} title={swatch.name} aria-label={swatch.name} onClick={() => onSceneChange({ ledColor: swatch.hex })} />)}
        </div>
      </> : canRgb && <button type="button" className="mood-add" onClick={() => onChange({ ledRgb: true })}><Plus size={14} /><span><strong>{tr('Színes fények is kellenek?', 'Auch farbiges Licht gewünscht?')}</strong><small>Színváltós RGB+W LED · +{formatPrice(rgbPrice)}</small></span></button>}
    </> : <button type="button" className="mood-add" onClick={() => onChange({ led: true })}><Plus size={14} /><span><strong>{tr('Próbáld ki LED-világítással', 'Mit LED-Beleuchtung ausprobieren')}</strong><small>Rejtett periméter LED · +{formatPrice(ledPrice)}</small></span></button>)}

    {canHeat && (config.heaters > 0
      ? <button type="button" className={`mood-heat${scene.heatersOn ? ' is-on' : ''}`} aria-pressed={scene.heatersOn} onClick={() => onSceneChange({ heatersOn: !scene.heatersOn })}><Flame size={15} /><span><strong>Teraszfűtés {scene.heatersOn ? 'bekapcsolva' : 'kikapcsolva'}</strong><small>{config.heaters} db infrapanel</small></span></button>
      : <button type="button" className="mood-add" onClick={() => onChange({ heaters: 1 })}><Plus size={14} /><span><strong>{tr('Hűvös estékre: teraszfűtés', 'Für kühle Abende: Terrassenheizung')}</strong><small>1 db infrapanel · +{formatPrice(heaterPrice)} {tr('bruttó', 'brutto')}</small></span></button>)}

    {(config.fans ?? 0) > 0 && <button type="button" className={`mood-heat mood-fan${scene.fanOn ? ' is-on' : ''}`} aria-pressed={scene.fanOn} onClick={() => onSceneChange({ fanOn: !scene.fanOn })}><Fan size={15} /><span><strong>Ventilátor {scene.fanOn ? 'bekapcsolva' : 'kikapcsolva'}</strong><small>{config.fans} db mennyezeti ventilátor</small></span></button>}
  </section>
}
