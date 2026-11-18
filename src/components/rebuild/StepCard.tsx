import { useRef, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { ConfigStep } from '@/types/pergola'
import { neighbourStep, REBUILD_STEPS, rebuildStepIndex } from '@/lib/rebuildSteps'
import { tr } from '@/i18n/locale'
import LiquidGlass from './LiquidGlass'

/**
 * A lépés lebegő üvegkártyája. Asztalon jobbra lebeg; telefonon alulról felhúzható lap (két állás).
 * A lépés tartalma (`children`) a modulokkal érkezik.
 */
export default function StepCard({ step, compact, open, onOpenChange, onStep, bar, onRequest, children }: { step: ConfigStep; compact: boolean; open: boolean; onOpenChange: (open: boolean) => void; onStep: (step: ConfigStep) => void; /** a kártya tetejére tapadó lépéssáv (asztalon) */ bar?: ReactNode; /** az utolsó lépésen a fő gomb: felmérés/ajánlat kérése */ onRequest?: () => void; children?: ReactNode }) {
  const index = rebuildStepIndex(step)
  const current = REBUILD_STEPS[index]
  const prev = neighbourStep(step, -1)
  const next = neighbourStep(step, 1)
  const nextLabel = next ? REBUILD_STEPS[rebuildStepIndex(next)].label : ''
  const drag = useRef<{ y: number; id: number } | null>(null)

  return (
    <LiquidGlass as="aside" className={`rb-stepcard${bar ? ' has-dock' : ''}${compact ? ' is-sheet' : ''}${compact && open ? ' is-open' : ''}`} radius={compact ? 26 : 28} bezel={compact ? 14 : 18} blur={compact ? 6 : 14} aria-label={current.label}>
      {bar}
      {compact && <button type="button" className="rb-sheet-handle" aria-expanded={open} aria-label={open ? tr('Lap lecsukása', 'Blatt einklappen') : tr('Lap kinyitása', 'Blatt ausklappen')}
        onClick={() => onOpenChange(!open)}
        onPointerDown={(event) => { drag.current = { y: event.clientY, id: event.pointerId } }}
        onPointerUp={(event) => { const start = drag.current; drag.current = null; if (!start) return; const dy = event.clientY - start.y; if (dy < -24 && !open) { event.preventDefault(); onOpenChange(true) } else if (dy > 24 && open) { event.preventDefault(); onOpenChange(false) } }}><i /></button>}
      <header className="rb-stepcard-head">
        <span className="rb-stepcard-count">{index + 1} / {REBUILD_STEPS.length} · {current.label}</span>
        <h2>{current.question}</h2>
      </header>
      <div className="rb-stepcard-body">{children}</div>
      <footer className="rb-stepcard-nav">
        <button type="button" className="rb-btn-ghost" disabled={!prev} onClick={() => prev && onStep(prev)}><ArrowLeft size={16} />{tr('Vissza', 'Zurück')}</button>
        {!next && onRequest && <button type="button" className="rb-btn-primary" onClick={onRequest}>{tr('Felmérést kérek', 'Aufmaß anfragen')}<ArrowRight size={16} /></button>}
        {next && <button type="button" className="rb-btn-primary" onClick={() => onStep(next)}><span>{tr('Tovább', 'Weiter')}<span className="rb-btn-next">: {nextLabel}</span></span><ArrowRight size={16} /></button>}
      </footer>
    </LiquidGlass>
  )
}
