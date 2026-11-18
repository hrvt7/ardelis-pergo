import type { ConfigStep } from '@/types/pergola'
import { REBUILD_STEPS, rebuildStepIndex } from '@/lib/rebuildSteps'
import { tr } from '@/i18n/locale'
import StepIcon from './StepIcons'
import LiquidGlass from './LiquidGlass'

/**
 * Lépéssáv asztalon és tableten (Ádám kérése): a bal oldali sín testvére, alul lebegő folyékony üveg sáv (a jobb oldali kártyával egy anyagból).
 * Egy sorban a hét lépés ikonnal és rövid névvel; az aktuális lépést lime pirula jelöli, amely lépésváltáskor
 * átcsúszik (egy GPU-áttűnés). A kész lépéseket kis lime pont jelzi. Telefonon helyette a lap tetején lévő StepDock marad.
 */
export default function StepBar({ step, onStep }: { step: ConfigStep; onStep: (step: ConfigStep) => void }) {
  const index = rebuildStepIndex(step)
  return (
    <LiquidGlass as="nav" className="rb-stepbar" radius={24} bezel={12} blur={12} style={{ ['--rb-count' as string]: REBUILD_STEPS.length }} aria-label={tr('Konfigurálás lépései', 'Konfigurationsschritte')}>
      <ol>
        <span className="rb-stepbar-pill" aria-hidden="true" style={{ transform: `translate3d(${index * 100}%, 0, 0)` }} />
        {REBUILD_STEPS.map((item, i) => <li key={item.id}>
          <button type="button" className={i < index ? 'is-done' : i === index ? 'is-current' : undefined} aria-current={i === index ? 'step' : undefined} aria-label={`${i + 1}. ${item.label}`} title={item.label} onClick={() => onStep(item.id)}>
            <StepIcon step={item.id} size={20} />
            <span>{item.short}</span>
          </button>
        </li>)}
      </ol>
    </LiquidGlass>
  )
}
