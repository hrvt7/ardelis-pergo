import { useState } from 'react'
import { ArrowLeftRight, Check, MousePointerClick } from 'lucide-react'
import type { PergolaConfig, PriceSettings, SceneSettings, SideKey } from '@/types/pergola'
import { isWallSide, wallLabel } from '@/lib/mount'
import { closedSegments, SIDE_INFO, SIDE_LABELS } from '@/lib/sides'
import { issuesForStep } from '@/lib/configSteps'
import { isClosedBuilding } from '@/lib/buildings'
import { BuildingIssues, WallGlazingPicker } from '@/components/BuildingControls'
import { SideIcon, SideSettings, type SideTypePicker } from '@/components/SideAndExtras'
import { signedPrice } from '@/lib/money'
import { tr } from '@/i18n/locale'
import LiquidSlider from './LiquidSlider'

const ORDER: SideKey[] = ['back', 'left', 'right', 'front']

/**
 * Az oldaltípusok teljes kontrasztú listában (kritikus kör, 2026-11-18): minden sorban ikon, név, rövid leírás és felár,
 * hogy a döntéshez szükséges adat mindig olvasható legyen (az íves választón a szélső elemek elhalványultak).
 */
const listTypes: SideTypePicker = ({ types, current, label, delta, select }) => <div className="rb-type-list" role="radiogroup" aria-label={label}>
  {types.map((type) => {
    const active = type === current
    return <button type="button" role="radio" aria-checked={active} key={type} className={`rb-option rb-roof rb-type${active ? ' is-selected' : ''}`} onClick={() => !active && select(type)}>
      <span className="rb-roof-icon"><SideIcon type={type} /></span>
      <span className="rb-roof-text"><strong>{SIDE_INFO[type].label}</strong><small>{SIDE_INFO[type].description}</small></span>
      {active && <span className="rb-option-check"><Check size={12} strokeWidth={3} /></span>}<em>{active ? '' : signedPrice(delta(type))}</em>
    </button>
  })}
</div>

/** 4. lépés – Oldalak: oldal kijelölése a felülnézeten (vagy a 3D-ben), majd a típusa és a beállításai. */
export default function SidesStep({ config, scene, prices, selected, onSelect, onChange, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; selected: SideKey | 'roof'; onSelect: (side: SideKey) => void; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const [half, setHalf] = useState<0 | 1>(0)
  const names: Record<SideKey, string> = { front: tr('Elülső', 'Vorne'), back: tr('Hátsó', 'Hinten'), left: tr('Bal', 'Links'), right: tr('Jobb', 'Rechts') }
  const side: SideKey | null = selected !== 'roof' && !isWallSide(config.mount, selected) ? selected : null
  const typeText = (key: SideKey) => isWallSide(config.mount, key) ? wallLabel(key) : config.split?.[key] ? `${SIDE_LABELS[config.sides[key]]} + ${SIDE_LABELS[config.split[key]!]}` : SIDE_LABELS[config.sides[key]]
  const hasZip = closedSegments(config).some((segment) => segment.type === 'zip')
  const types = side ? [config.sides[side], config.split?.[side]] : []

  return <div className="rb-step rb-step-sides">
    <section className="rb-section">
      <h3>{tr('Melyik oldal?', 'Welche Seite?')}</h3>
      <div className="rb-sides" role="group" aria-label={tr('Oldalválasztó felülnézet', 'Seitenauswahl in der Draufsicht')}>
        {ORDER.map((key) => {
          const wall = isWallSide(config.mount, key)
          const active = side === key
          return <button type="button" key={key} className={`rb-side rb-side-${key}${active ? ' is-selected' : ''}${wall ? ' is-wall' : ''}${config.sides[key] !== 'none' && !wall ? ' is-closed' : ''}`} disabled={wall} aria-pressed={active} onClick={() => onSelect(key)}>
            <strong>{names[key]}</strong><small>{typeText(key)}</small>
          </button>
        })}
        <span className="rb-sides-roof" aria-hidden="true">{tr('Tető', 'Dach')}</span>
      </div>
      <p className="rb-note rb-hint"><MousePointerClick size={15} />{tr('A 3D modellen is rákattinthatsz egy oldalra.', 'Sie können auch im 3D-Modell auf eine Seite klicken.')}</p>
    </section>

    {side && <section className="rb-section rb-legacy">
      <h3>{names[side]} {tr('oldal', 'Seite')}</h3>
      <SideSettings side={side} sideName={`${names[side]} ${tr('oldal', 'Seite')}`} config={config} scene={scene} prices={prices} half={half} onHalfChange={setHalf} onChange={onChange} onSceneChange={onSceneChange} typePicker={listTypes} />
      {hasZip && types.includes('zip') && <LiquidSlider label={tr('ZIP screen nyitottsága', 'Öffnung des ZIP-Screens')} unit="%" step={1} value={config.screenOpen} min={0} max={100} onChange={(screenOpen) => onChange({ screenOpen })} />}
      {types.some((type) => type === 'door' || type === 'doorSliding') && <button type="button" className={`rb-option rb-toggle${config.doorMirror?.[side] ? ' is-selected' : ''}`} aria-pressed={!!config.doorMirror?.[side]} onClick={() => onChange({ doorMirror: { ...config.doorMirror, [side]: !config.doorMirror?.[side] } })}>
        <ArrowLeftRight size={18} /><span><strong>{tr('Nyitás a másik oldalra', 'Öffnung zur anderen Seite')}</strong><small>{types.includes('doorSliding') ? tr('A tolószárny a másik sarokból indul', 'Der Schiebeflügel startet in der anderen Ecke') : tr('A zsanér a másik sarokban', 'Scharnier in der anderen Ecke')}</small></span>
      </button>}
    </section>}

    {isClosedBuilding(config.building) && <section className="rb-section rb-legacy"><WallGlazingPicker config={config} prices={prices} onChange={onChange} /></section>}
    <BuildingIssues config={config} onFix={onChange} only={issuesForStep('sides')} />
  </div>
}
