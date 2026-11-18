import type { ConfigStep } from '@/types/pergola'
import { REBUILD_STEPS, rebuildStepIndex } from '@/lib/rebuildSteps'
import { tr } from '@/i18n/locale'
import StepIcon from './StepIcons'

/**
 * Lépéssáv a lépéskártya tetején (Ádám mintája): világos, folyékony üveg „pirula”, rajta a hét lépés ikonja;
 * az aktuális lépés egy kiemelkedő, enyhén lime üveggombban ül, amely lépésváltáskor átcsúszik
 * (egyetlen GPU-áttűnés). A kész lépések alatt kis lime pont jelzi a haladást.
 */
export default function StepDock({ step, onStep }: { step: ConfigStep; onStep: (step: ConfigStep) => void }) {
  const index = rebuildStepIndex(step)
  const count = REBUILD_STEPS.length
  return (
    <nav className="rb-dock" aria-label={tr('Konfigurálás lépései', 'Konfigurationsschritte')} style={{ ['--rb-count' as string]: count }}>
      <span className="rb-dock-slot" aria-hidden="true" style={{ transform: `translate3d(${index * 100}%, 0, 0)` }}><span className="rb-dock-knob" /></span>
      <ol>
        {REBUILD_STEPS.map((item, i) => <li key={item.id}>
          <button type="button" className={i < index ? 'is-done' : i === index ? 'is-current' : 'is-next'} aria-current={i === index ? 'step' : undefined} aria-label={`${i + 1}. ${item.label}`} title={item.label} onClick={() => onStep(item.id)}>
            <StepIcon step={item.id} size={21} />
          </button>
        </li>)}
      </ol>
    </nav>
  )
}
