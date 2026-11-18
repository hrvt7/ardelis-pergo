import { Check, ChevronDown, Columns3, Sparkles } from 'lucide-react'
import type { PergolaConfig, PriceSettings, SceneSettings } from '@/types/pergola'
import { MOUNT_DESCRIPTIONS, MOUNT_LABELS, MOUNT_TYPES } from '@/lib/mount'
import { bayWidth, moduleCount, modulesLabel } from '@/lib/modules'
import { formatNumber } from '@/lib/pricing'
import { getSizeRecommendation } from '@/lib/specification'
import { issuesForStep } from '@/lib/configSteps'
import { useTenant } from '@/tenants/TenantContext'
import { BuildingIssues } from '@/components/BuildingControls'
import FurniturePicker from '@/components/FurniturePicker'
import { FURNITURE_SETS } from '@/lib/furniture'
import { tr } from '@/i18n/locale'
import LiquidSlider from './LiquidSlider'
import MountPlan from './MountPlan'

/** 2. lépés – Hely és méret (docs/rebuild/STEP_ARCHITECTURE.md): rögzítés, méretek, modulok, javaslat, berendezés. */
export default function MountStep({ config, scene, prices, onChange, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; prices: PriceSettings; onChange: (patch: Partial<PergolaConfig>) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const { tenant } = useTenant()
  const { limits } = tenant
  const modules = moduleCount(config)
  const maxModules = Math.min(4, limits.maxModules ?? 1)
  const [fitTitle, fitText] = getSizeRecommendation(config).split(' · ')
  const carport = config.building === 'carport'

  return <div className="lx-step lx-step-mount">
    <section className="lx-section">
      <h3>{tr('Rögzítés', 'Montage')}</h3>
      <div className="lx-mount-grid">
        {MOUNT_TYPES.filter((mount) => tenant.mounts.includes(mount)).map((mount) => {
          const active = config.mount === mount
          return <button type="button" key={mount} className={`lx-option${active ? ' is-selected' : ''}`} aria-pressed={active} title={MOUNT_DESCRIPTIONS[mount]} onClick={() => onChange({ mount })}>
            <MountPlan mount={mount} />
            <strong>{MOUNT_LABELS[mount]}</strong>
            {active && <span className="lx-option-check"><Check size={12} strokeWidth={3} /></span>}
          </button>
        })}
      </div>
      <p className="lx-note">{MOUNT_DESCRIPTIONS[config.mount]}</p>
    </section>

    <section className="lx-section">
      <h3>{tr('Méretek', 'Maße')}</h3>
      <LiquidSlider label={modules > 1 ? tr('Szélesség modulonként', 'Breite je Modul') : tr('Szélesség', 'Breite')} value={bayWidth(config)} min={limits.width[0]} max={limits.width[1]} onChange={(bay) => onChange({ width: Math.round(bay * modules * 100) / 100 })} />
      <LiquidSlider label={tr('Mélység', 'Tiefe')} value={config.depth} min={limits.depth[0]} max={limits.depth[1]} onChange={(depth) => onChange({ depth })} />
      <LiquidSlider label={tr('Oszlopmagasság', 'Steherhöhe')} value={config.height} min={limits.height[0]} max={limits.height[1]} onChange={(height) => onChange({ height })} />
      {maxModules > 1 && <div className="lx-modules">
        <span>{tr('Modulok száma', 'Anzahl Module')}</span>
        <div className="lx-segmented" role="radiogroup" aria-label={tr('Modulok száma', 'Anzahl Module')}>
          {Array.from({ length: maxModules }, (_, index) => index + 1).map((count) => { const active = modules === count; return <button type="button" role="radio" aria-checked={active} key={count} className={active ? 'is-selected' : ''} onClick={() => onChange({ modules: count > 1 ? count : undefined, width: Math.round(bayWidth(config) * count * 100) / 100 })}>{count}×</button> })}
        </div>
      </div>}
      {modules > 1 && <p className="lx-note">{modulesLabel(config, (value) => formatNumber(value, 2))} {tr('mező · összesen', 'Felder · insgesamt')} {formatNumber(config.width, 2)} m {tr('széles', 'breit')}, {modules - 1} {tr('közös oszlopsorral.', 'gemeinsamen Steherreihen.')}</p>}
      {bayWidth(config) > 6 && <div className="lx-callout is-warning"><Columns3 size={18} /><p><strong>{tr('Középoszlop javasolt', 'Mittelsteher empfohlen')}</strong>{tr('600 cm feletti mezőnél a műszaki ellenőrzés és egy középoszlop szükséges lehet.', 'Bei Feldern über 600 cm kann eine technische Prüfung und ein Mittelsteher nötig sein.')}</p></div>}
      <div className="lx-callout"><Sparkles size={18} /><p><strong>{fitTitle}</strong>{fitText}</p></div>
      <BuildingIssues config={config} onFix={onChange} only={issuesForStep('mount')} />
    </section>

    {!carport && <details className="lx-section lx-disclosure">
      <summary><span><strong>{tr('Mire használod?', 'Wofür nutzen Sie es?')}</strong><small>{scene.furniture === 'none' ? tr('Bútor és helyigény-ellenőrzés', 'Möbel und Platzprüfung') : FURNITURE_SETS[scene.furniture].label}</small></span><ChevronDown size={18} /></summary>
      <FurniturePicker config={config} scene={scene} prices={prices} onChange={onChange} onSceneChange={onSceneChange} />
    </details>}
  </div>
}
