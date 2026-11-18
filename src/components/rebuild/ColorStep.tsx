import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'
import { describeColor, findColor, normalizeColorCode, pickCatalogColor } from '@/lib/colors'
import { quickColors } from '@/lib/rebuildColors'
import { formatPrice } from '@/lib/pricing'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import { WindowMatch } from '@/components/HouseLook'
import { tr } from '@/i18n/locale'

/** 5. lépés – Szín (Ádám: 5–6 gyakori szín + egyedi RAL kód); további: ablakhoz igazítás. */
export default function ColorStep({ config, scene, prices, onChange }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void }) {
  const { tenant } = useTenant()
  const frame = describeColor(tenant, config.frameColor, config.customRal)
  const options = quickColors(tenant)
  const base = tenantPrice(tenant, config, prices).totalGross
  const selectedKey = config.frameColor === 'custom' ? normalizeColorCode(config.customRal) : config.frameColor
  const inList = options.some((item) => item.key === selectedKey)
  const [code, setCode] = useState(config.frameColor === 'custom' && !inList ? config.customRal ?? '' : '')
  const typed = findColor(code)
  const normalized = normalizeColorCode(code)
  const applyCode = (text: string) => { const pick = pickCatalogColor(tenant, text); if (pick) onChange({ frameColor: pick.color, customRal: pick.custom }) }

  return <div className="rb-step rb-step-color">
    <div className="rb-color-now">
      <span className="rb-color-swatch" style={{ background: frame.hex }} aria-hidden="true" />
      <span><small>{tr('Jelenlegi szín', 'Aktuelle Farbe')}</small><strong>{frame.name}</strong>{frame.code && frame.code !== frame.name && <em>{frame.code}</em>}</span>
    </div>

    <section className="rb-section">
      <h3>{tr('Gyakori színek', 'Häufige Farben')}</h3>
      <div className="rb-swatches" role="radiogroup" aria-label={tr('Szerkezet színe', 'Farbe der Konstruktion')}>
        {options.map((item) => {
          const active = item.key === selectedKey
          const delta = active ? 0 : tenantPrice(tenant, { ...config, frameColor: item.color, customRal: item.custom }, prices).totalGross - base
          return <button type="button" role="radio" aria-checked={active} key={item.key} className={`rb-option rb-swatch${active ? ' is-selected' : ''}`} onClick={() => onChange({ frameColor: item.color, customRal: item.custom })}>
            <span className="rb-swatch-ball" style={{ ['--rb-swatch' as string]: item.hex }}>{active && <Check size={15} strokeWidth={3} />}</span>
            <strong>{item.name}</strong>
            <small>{item.detail}</small>
            <em>{active ? tr('Kiválasztva', 'Ausgewählt') : delta === 0 ? (item.standard ? tr('felár nélkül', 'ohne Aufpreis') : tr('azonos ár', 'gleicher Preis')) : `${delta > 0 ? '+' : '−'}${formatPrice(Math.abs(delta))}`}</em>
          </button>
        })}
      </div>
    </section>

    {tenant.customRal && <section className="rb-section">
      <h3>{tr('Egyedi RAL szín', 'Eigene RAL-Farbe')}</h3>
      <label className={`rb-ral${config.frameColor === 'custom' && !inList ? ' is-selected' : ''}`}>
        <span className="rb-ral-ball" style={{ background: typed?.hex ?? 'transparent' }} aria-hidden="true" />
        <input value={code} maxLength={24} inputMode="text" placeholder={tr('pl. RAL 7035', 'z. B. RAL 7035')} aria-label={tr('RAL kód', 'RAL-Code')}
          onChange={(event) => { setCode(event.target.value); if (normalizeColorCode(event.target.value)) applyCode(event.target.value) }}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
      </label>
      <p className="rb-note">{typed ? `${typed.name} · ${typed.code}` : normalized ? tr('Nincs a listánkban — a gyártó egyezteti a pontos árnyalatot.', 'Nicht in unserer Liste — der Hersteller stimmt den genauen Farbton ab.') : tr('Bármely RAL szín rendelhető; az egyedi szín felára a kalkulációban látszik.', 'Jede RAL-Farbe ist bestellbar; der Aufpreis erscheint in der Kalkulation.')}</p>
    </section>}

    <details className="rb-section rb-disclosure">
      <summary><span><strong>{tr('Illeszd a házadhoz', 'An Ihr Haus anpassen')}</strong><small>{tr('Javaslat a nyílászárók színe alapján', 'Vorschlag nach der Fensterfarbe')}</small></span><ChevronDown size={18} /></summary>
      <div className="rb-legacy">
        <WindowMatch config={config} scene={scene} onChange={onChange} />
        <p className="rb-note">{tr('A ház kinézetét (homlokzat, ablakszín) a Környezet beállításaiban adhatod meg.', 'Das Aussehen des Hauses (Fassade, Fensterfarbe) stellen Sie in der Umgebung ein.')}</p>
      </div>
    </details>
  </div>
}
