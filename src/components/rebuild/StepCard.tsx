import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import type { ConfigStep } from '@/types/pergola'
import { neighbourStep, REBUILD_STEPS, rebuildStepIndex } from '@/lib/rebuildSteps'
import { tr } from '@/i18n/locale'
import LiquidGlass from './LiquidGlass'

/**
 * A lépés lebegő üvegkártyája. Asztalon jobbra lebeg; telefonon alulról nyíló lap (nyitva / összecsukva).
 * Felül a kérdés (a lépés nevét a lépéssáv mutatja), középen a lépés tartalma, alul egy tömbben az ár, az
 * „Ajánlatot kérek” és a Vissza / Tovább. Az utolsó lépésen a fő gomb maga az „Ajánlatot kérek”.
 */
export default function StepCard({ step, compact, open, onOpenChange, onStep, bar, price, onRequest, children }: { step: ConfigStep; compact: boolean; open: boolean; onOpenChange: (open: boolean) => void; onStep: (step: ConfigStep) => void; /** a kártya tetejére tapadó lépéssáv (telefonon) */ bar?: ReactNode; /** ársor a gombok fölött */ price?: ReactNode; /** az utolsó lépésen a fő gomb: ajánlatkérés (az űrlaphoz visz) */ onRequest?: () => void; children?: ReactNode }) {
  const index = rebuildStepIndex(step)
  const current = REBUILD_STEPS[index]
  const prev = neighbourStep(step, -1)
  const next = neighbourStep(step, 1)
  const nextLabel = next ? REBUILD_STEPS[rebuildStepIndex(next)].label : ''
  const drag = useRef<{ y: number } | null>(null)
  const body = useRef<HTMLDivElement>(null)
  // Lépésváltáskor a lépés tetejéről indul (a kérdés és a fő döntés legyen az első, amit lát).
  useEffect(() => { if (body.current) body.current.scrollTop = 0 }, [step])

  return (
    <LiquidGlass as="aside" className={`rb-stepcard${bar ? ' has-dock' : ''}${compact ? ' is-sheet' : ''}${compact && open ? ' is-open' : ''}`} radius={compact ? 26 : 28} bezel={compact ? 14 : 18} blur={compact ? 6 : 14} aria-label={current.label}>
      {bar}
      <header className="rb-stepcard-head"
        onPointerDown={compact ? (event) => { drag.current = { y: event.clientY } } : undefined}
        onPointerUp={compact ? (event) => { const start = drag.current; drag.current = null; if (!start) return; const dy = event.clientY - start.y; if (dy < -24 && !open) onOpenChange(true); else if (dy > 24 && open) onOpenChange(false) } : undefined}>
        <span className="rb-stepcard-count">{index + 1} / {REBUILD_STEPS.length} · {current.label}</span>
        <h2>{current.question}</h2>
        {compact && <button type="button" className="rb-sheet-toggle" aria-expanded={open} aria-label={open ? tr('Lap lecsukása', 'Blatt einklappen') : tr('Lap kinyitása', 'Blatt ausklappen')} onClick={() => onOpenChange(!open)}><ChevronDown size={20} /></button>}
      </header>
      <div className="rb-stepcard-body" ref={body}>{children}</div>
      <footer className="rb-stepcard-foot">
        {next && !compact && price}
        <div className="rb-stepcard-nav">
          <button type="button" className="rb-btn-ghost" disabled={!prev} onClick={() => prev && onStep(prev)} aria-label={tr('Vissza', 'Zurück')}><ArrowLeft size={16} /><span className="rb-btn-back-text">{tr('Vissza', 'Zurück')}</span></button>
          {/* Telefonon az ár a gombsor közepén: egy sor, több hely a lépésnek. */}
          {next && compact && price}
          {!next && onRequest && <button type="button" className="rb-btn-primary" onClick={onRequest}>{tr('Ajánlatot kérek', 'Angebot anfragen')}<ArrowRight size={16} /></button>}
          {next && <button type="button" className="rb-btn-primary" onClick={() => onStep(next)}><span>{tr('Tovább', 'Weiter')}<span className="rb-btn-next">: {nextLabel}</span></span><ArrowRight size={16} /></button>}
        </div>
      </footer>
    </LiquidGlass>
  )
}
