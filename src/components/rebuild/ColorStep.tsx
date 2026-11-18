import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { FrameColor, PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'
import { describeColor, findColor, normalizeColorCode, pickCatalogColor, roofPartName, supportsTwoTone } from '@/lib/colors'
import { quickColors } from '@/lib/rebuildColors'
import { formatPrice } from '@/lib/pricing'
import { tenantPrice } from '@/tenants/rules'
import { useTenant } from '@/tenants/TenantContext'
import { WindowMatch } from '@/components/HouseLook'
import { tr } from '@/i18n/locale'

/** Világos-e a szín (a kéttónusú kivitel kiinduló kontrasztjához). */
const isLight = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.5 }

/** 5. lépés – Szín (Ádám: 5–6 gyakori szín + egyedi RAL kód, kéttónusú kivitel); további: ablakhoz igazítás. */
export default function ColorStep({ config, scene, prices, onChange }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void }) {
  const { tenant } = useTenant()
  const twoToneAvailable = Boolean(tenant.twoTone && supportsTwoTone(config.roof))
  const twoTone = twoToneAvailable && Boolean(config.roofColor)
  const [target, setTarget] = useState<'frame' | 'roof'>('frame')
  const active = twoTone ? target : 'frame'
  const part = roofPartName(config.roof)
  const frame = describeColor(tenant, config.frameColor, config.customRal)
  const roof = config.roofColor ? describeColor(tenant, config.roofColor, config.roofRal) : frame
  // A választók mindig a kijelölt részre (váz vagy tető/lamellák) vonatkoznak.
  const currentColor = active === 'frame' ? config.frameColor : config.roofColor ?? config.frameColor
  const currentCustom = active === 'frame' ? config.customRal : config.roofColor ? config.roofRal : config.customRal
  const patch = (color: FrameColor, custom?: string): Partial<PergolaConfig> => (active === 'frame' ? { frameColor: color, customRal: custom } : { roofColor: color, roofRal: custom })
  const options = quickColors(tenant)
  const base = tenantPrice(tenant, config, prices).totalGross
  const selectedKey = currentColor === 'custom' ? normalizeColorCode(currentCustom) : currentColor
  const inList = options.some((item) => item.key === selectedKey)
  const [code, setCode] = useState(currentColor === 'custom' && !inList ? currentCustom ?? '' : '')
  const typed = findColor(code)
  const normalized = normalizeColorCode(code)
  const applyCode = (text: string) => { const pick = pickCatalogColor(tenant, text); if (pick) onChange(patch(pick.color, pick.custom)) }
  const setTwoTone = (on: boolean) => {
    if (!on) { onChange({ roofColor: undefined, roofRal: undefined }); setTarget('frame'); return }
    // Kiinduló kontraszt: sötét váz mellé fehér tető, világos mellé antracit (mint a meglévő színválasztóban).
    const fallback = tenant.colors.find((item) => item.id === (isLight(frame.hex) ? 'anthracite' : 'white'))?.id ?? tenant.colors.find((item) => item.id !== config.frameColor)?.id
    if (fallback) { onChange({ roofColor: fallback, roofRal: undefined }); setTarget('roof') }
  }

  return <div className="rb-step rb-step-color">
    <div className="rb-color-now">
      <span className="rb-color-swatch" style={{ background: twoTone ? `linear-gradient(135deg, ${frame.hex} 50%, ${roof.hex} 50%)` : frame.hex }} aria-hidden="true" />
      <span><small>{tr('Jelenlegi szín', 'Aktuelle Farbe')}</small><strong>{twoTone ? `${frame.name} + ${roof.name.toLowerCase()}` : frame.name}</strong>{!twoTone && frame.code && frame.code !== frame.name && <em>{frame.code}</em>}</span>
    </div>

    {twoToneAvailable && <section className="rb-section">
      <div className="rb-modules">
        <span>{tr('Kivitel', 'Ausführung')}</span>
        <div className="rb-segmented" role="radiogroup" aria-label={tr('Színkialakítás', 'Farbgestaltung')}>
          <button type="button" role="radio" aria-checked={!twoTone} className={!twoTone ? 'is-selected' : ''} onClick={() => setTwoTone(false)}>{tr('Egyszínű', 'Einfarbig')}</button>
          <button type="button" role="radio" aria-checked={twoTone} className={twoTone ? 'is-selected' : ''} onClick={() => setTwoTone(true)}>{tr('Kéttónusú', 'Zweifarbig')}</button>
        </div>
      </div>
      {twoTone && <div className="rb-targets" role="tablist" aria-label={tr('Melyik részt színezed?', 'Welchen Teil färben Sie?')}>
        {(['frame', 'roof'] as const).map((id) => { const info = id === 'frame' ? frame : roof; return <button type="button" role="tab" aria-selected={active === id} key={id} className={`rb-option rb-target${active === id ? ' is-selected' : ''}`} onClick={() => setTarget(id)}>
          <span className="rb-target-ball" style={{ background: info.hex }} aria-hidden="true" /><span><small>{id === 'frame' ? tr('Váz, oszlopok', 'Rahmen, Steher') : part}</small><strong>{info.name}</strong></span>
        </button> })}
      </div>}
    </section>}

    <section className="rb-section">
      <h3>{twoTone ? `${active === 'frame' ? tr('Váz', 'Rahmen') : part}: ${tr('gyakori színek', 'häufige Farben')}` : tr('Gyakori színek', 'Häufige Farben')}</h3>
      <div className="rb-swatches" role="radiogroup" aria-label={tr('Szerkezet színe', 'Farbe der Konstruktion')}>
        {options.map((item) => {
          const isOn = item.key === selectedKey
          const delta = isOn ? 0 : tenantPrice(tenant, { ...config, ...patch(item.color, item.custom) }, prices).totalGross - base
          return <button type="button" role="radio" aria-checked={isOn} key={item.key} className={`rb-option rb-swatch${isOn ? ' is-selected' : ''}`} onClick={() => onChange(patch(item.color, item.custom))}>
            {isOn && <span className="rb-option-check"><Check size={12} strokeWidth={3} /></span>}<span className="rb-swatch-ball" style={{ ['--rb-swatch' as string]: item.hex }} />
            <strong>{item.name}</strong>
            <small>{item.detail}</small>
            <em>{delta === 0 ? (item.standard ? tr('felár nélkül', 'ohne Aufpreis') : tr('azonos ár', 'gleicher Preis')) : `${delta > 0 ? '+' : '−'}${formatPrice(Math.abs(delta))}`}</em>
          </button>
        })}
      </div>
    </section>

    {tenant.customRal && <section className="rb-section">
      <h3>{tr('Egyedi RAL szín', 'Eigene RAL-Farbe')}</h3>
      <label className={`rb-ral${currentColor === 'custom' && !inList ? ' is-selected' : ''}`}>
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
