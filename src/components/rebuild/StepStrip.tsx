import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { ConfigStep } from '@/types/pergola'
import { REBUILD_STEPS, rebuildStepIndex } from '@/lib/rebuildSteps'
import { tr } from '@/i18n/locale'
import StepIcon from './StepIcons'

/**
 * Telefonos lépésjelző (az ikonsor helyett, hogy a 3D-nek több hely maradjon): vékony, hét szegmensből álló haladássáv
 * és alatta „2/7 · Hely és méret”. A sorra koppintva lenyílik a lépések listája, bármelyikre ugorhatsz.
 * Reflektoros jelölés (Ádám mintája): az aktuális szegmens lime fényben izzik, alatta halvány fénykúp, ami lépésváltáskor
 * átcsúszik (egy GPU-áttűnés); a lenyíló listában ugyanez a fénycsík jelöli a mostani lépést.
 */
export default function StepStrip({ step, onStep }: { step: ConfigStep; onStep: (step: ConfigStep) => void }) {
  const index = rebuildStepIndex(step)
  const count = REBUILD_STEPS.length
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key) }
  }, [open])
  return (
    <nav ref={root} className={`rb-strip${open ? ' is-open' : ''}`} aria-label={tr('Konfigurálás lépései', 'Konfigurationsschritte')}>
      <button type="button" className="rb-strip-toggle" aria-expanded={open} aria-controls="rb-strip-menu" onClick={() => setOpen((value) => !value)}>
        <span className="rb-strip-bars" aria-hidden="true">
          {REBUILD_STEPS.map((item, i) => <i key={item.id} className={i < index ? 'is-done' : i === index ? 'is-current' : undefined} />)}
          <span className="rb-strip-beam" style={{ transform: `translate3d(calc(${index} * (100% + 4px)), 0, 0)` }} />
        </span>
        <span className="rb-strip-label"><b>{index + 1}/{count}</b> · {REBUILD_STEPS[index].label}<ChevronDown size={16} className="rb-strip-chevron" /></span>
      </button>
      {open && <ol id="rb-strip-menu" className="rb-strip-menu">
        {REBUILD_STEPS.map((item, i) => <li key={item.id}>
          <button type="button" aria-current={i === index ? 'step' : undefined} className={i === index ? 'is-current' : i < index ? 'is-done' : undefined} onClick={() => { setOpen(false); onStep(item.id) }}>
            <StepIcon step={item.id} size={18} />
            <span>{i + 1}. {item.label}</span>
            {i < index && <Check size={15} strokeWidth={2.6} className="rb-strip-done" />}
          </button>
        </li>)}
      </ol>}
    </nav>
  )
}
