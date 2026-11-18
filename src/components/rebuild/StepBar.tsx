import type { ConfigStep } from '@/types/pergola'
import { REBUILD_STEPS, rebuildStepIndex } from '@/lib/rebuildSteps'
import { tr } from '@/i18n/locale'
import StepIcon from './StepIcons'

/**
 * Lépéssáv asztalon és tableten (Ádám kérése): a bal oldali Nézet és Környezet sín testvére, az alsó szélhez olvadva.
 * Egy sorban a hét lépés ikonnal és rövid névvel; az aktuális lépést lime pirula jelöli, amely lépésváltáskor
 * átcsúszik (egy GPU-áttűnés). A kész lépéseket kis lime pont jelzi. Telefonon helyette a lap tetején lévő StepDock marad.
 */
export default function StepBar({ step, onStep }: { step: ConfigStep; onStep: (step: ConfigStep) => void }) {
  const index = rebuildStepIndex(step)
  return (
    <nav className="rb-stepbar" aria-label={tr('Konfigurálás lépései', 'Konfigurationsschritte')} style={{ ['--rb-count' as string]: REBUILD_STEPS.length }}>
      <svg className="rb-stepbar-fillet is-left" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M 0 16 L 16 16 L 16 0 A 16 16 0 0 1 0 16 Z" /></svg>
      <ol>
        <span className="rb-stepbar-pill" aria-hidden="true" style={{ transform: `translate3d(${index * 100}%, 0, 0)` }} />
        {REBUILD_STEPS.map((item, i) => <li key={item.id}>
          <button type="button" className={i < index ? 'is-done' : i === index ? 'is-current' : undefined} aria-current={i === index ? 'step' : undefined} aria-label={`${i + 1}. ${item.label}`} title={item.label} onClick={() => onStep(item.id)}>
            <StepIcon step={item.id} size={20} />
            <span>{item.short}</span>
          </button>
        </li>)}
      </ol>
      <svg className="rb-stepbar-fillet is-right" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M 16 16 L 0 16 L 0 0 A 16 16 0 0 0 16 16 Z" /></svg>
    </nav>
  )
}
