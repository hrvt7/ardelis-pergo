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
export default function StepNotchBar({ step, compact, placement = 'top', onStep }: { step: ConfigStep; compact: boolean; /** asztalon: a kártya tetején, alul középen vagy felül */ placement?: 'card' | 'bottom' | 'top' | 'rail'; onStep: (step: ConfigStep) => void }) {
  const vertical = !compact && placement === 'rail'
  const geometry = compact || placement === 'card' || vertical ? NOTCH_COMPACT : NOTCH_DESKTOP
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
    const update = () => { const box = element.getBoundingClientRect(); setWidth(Math.round(vertical ? box.height : box.width)) }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [vertical])
  // Az első elhelyezés áttűnés nélkül (ne ússzon be a bal szélről).
  useLayoutEffect(() => { if (width && !ready) { const frame = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(frame) } }, [width, ready])

  const knob = (geometry.notch - 6) * 2
  const label = REBUILD_STEPS[index].label
  const t = geometry.height
  const f = 16
  return (
    <nav className={`lx-stepbar${compact ? ' is-compact' : ` is-${placement}`}${ready ? ' is-ready' : ''}`} aria-label={tr('Konfigurálás lépései', 'Konfigurationsschritte')}>
      <div className="lx-stepbar-track" ref={wrap} style={{ ...(vertical ? { width: t } : { height: t }), ['--lx-r' as string]: `${geometry.corner}px` }}>
        {vertical && <>
          <svg className="lx-rail-fillet is-top" width={f} height={f} viewBox={`0 0 ${f} ${f}`} aria-hidden="true"><path d={`M 0 ${f} L ${f} ${f} L ${f} 0 A ${f} ${f} 0 0 1 0 ${f} Z`} /></svg>
          <svg className="lx-rail-fillet is-bottom" width={f} height={f} viewBox={`0 0 ${f} ${f}`} aria-hidden="true"><path d={`M 0 0 L ${f} 0 L ${f} ${f} A ${f} ${f} 0 0 0 0 0 Z`} /></svg>
        </>}
        <div className="lx-stepbar-clip" aria-hidden="true">
          {width > 0 && (vertical
            ? <svg className="lx-stepbar-strip" width={t} height={width * 2} viewBox={`0 0 ${t} ${width * 2}`} style={{ transform: `translate3d(0, ${x - width}px, 0)` }}><path d={notchPath(width * 2, width, geometry, true)} /></svg>
            : <svg className="lx-stepbar-strip" width={width * 2} height={t} viewBox={`0 0 ${width * 2} ${t}`} style={{ transform: `translate3d(${x - width}px, 0, 0)` }}><path d={notchPath(width * 2, width, geometry)} /></svg>)}
        </div>
        <span className="lx-stepbar-knob" aria-hidden="true" style={{ width: knob, height: knob, transform: vertical ? `translate3d(${geometry.dip - knob / 2}px, ${x - knob / 2}px, 0)` : `translate3d(${x - knob / 2}px, ${geometry.dip - knob / 2}px, 0)` }}><span key={step} className="lx-stepbar-knob-icon"><StepIcon step={step} size={geometry === NOTCH_COMPACT ? 20 : 22} /></span></span>
        {!vertical && <span className="lx-stepbar-label" aria-hidden="true" style={{ transform: `translate3d(${x}px, 0, 0) translateX(-50%)` }}><span key={step}>{label}</span></span>}
        <ol>
          {REBUILD_STEPS.map((item, i) => {
            const current = i === index
            const at = width ? slotCenter(i, count, width, pad) : `${((i + 0.5) / count) * 100}%`
            return <li key={item.id} style={vertical ? { top: at } : { left: at }}>
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
