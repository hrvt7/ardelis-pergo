import { useLayoutEffect, useRef, useState } from 'react'
import type { ConfigStep } from '@/types/pergola'
import { NOTCH_COMPACT, NOTCH_DESKTOP, notchPad, notchPath, REBUILD_STEPS, rebuildStepIndex, slotCenter } from '@/lib/rebuildSteps'
import { tr } from '@/i18n/locale'
import StepIcon from './StepIcons'

/**
 * Lépéssáv bemélyedéssel (Ádám 01-es mintája): az aktív lépés köre a sávba „süllyed”, lépésváltáskor átúszik.
 * A sima mozgáshoz semmi nem számolódik képkockánként: a sáv egy kétszer olyan széles, középen bemélyedéses
 * csík, amelyet a kör és a felirat a GPU-n, ugyanazzal az áttűnéssel tol el (a 3D terhelése mellett sem akad).
 */
export default function StepNotchBar({ step, compact, onStep }: { step: ConfigStep; compact: boolean; onStep: (step: ConfigStep) => void }) {
  const geometry = compact ? NOTCH_COMPACT : NOTCH_DESKTOP
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [ready, setReady] = useState(false)
  const index = rebuildStepIndex(step)
  const count = REBUILD_STEPS.length
  const pad = width ? notchPad(width, count, geometry) : 0
  const x = width ? slotCenter(index, count, width, pad) : 0

  useLayoutEffect(() => {
    const element = wrap.current
    if (!element) return
    const update = () => setWidth(Math.round(element.getBoundingClientRect().width))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  // Az első elhelyezés áttűnés nélkül (ne ússzon be a bal szélről).
  useLayoutEffect(() => { if (width && !ready) { const frame = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(frame) } }, [width, ready])

  const knob = (geometry.notch - 6) * 2
  const label = REBUILD_STEPS[index].label
  const t = geometry.height
  return (
    <nav className={`lx-stepbar${compact ? ' is-compact' : ''}${ready ? ' is-ready' : ''}`} aria-label={tr('Konfigurálás lépései', 'Konfigurationsschritte')}>
      <div className="lx-stepbar-track" ref={wrap} style={{ height: t, ['--lx-r' as string]: `${geometry.corner}px` }}>
        <div className="lx-stepbar-clip" aria-hidden="true">
          {width > 0 && <svg className="lx-stepbar-strip" width={width * 2} height={t} viewBox={`0 0 ${width * 2} ${t}`} style={{ transform: `translate3d(${x - width}px, 0, 0)` }}><path d={notchPath(width * 2, width, geometry)} /></svg>}
        </div>
        <span className="lx-stepbar-knob" aria-hidden="true" style={{ width: knob, height: knob, transform: `translate3d(${x - knob / 2}px, ${geometry.dip - knob / 2}px, 0)` }}><span key={step} className="lx-stepbar-knob-icon"><StepIcon step={step} size={geometry === NOTCH_COMPACT ? 20 : 22} /></span></span>
        <span className="lx-stepbar-label" aria-hidden="true" style={{ transform: `translate3d(${x}px, 0, 0) translateX(-50%)` }}><span key={step}>{label}</span></span>
        <ol>
          {REBUILD_STEPS.map((item, i) => {
            const current = i === index
            return <li key={item.id} style={{ left: width ? slotCenter(i, count, width, pad) : `${((i + 0.5) / count) * 100}%` }}>
              <button type="button" className={current ? 'is-current' : ''} aria-current={current ? 'step' : undefined} aria-label={`${i + 1}. ${item.label}`} title={item.label} onClick={() => onStep(item.id)}>
                <StepIcon step={item.id} size={geometry === NOTCH_COMPACT ? 20 : 22} />
              </button>
            </li>
          })}
        </ol>
      </div>
    </nav>
  )
}
