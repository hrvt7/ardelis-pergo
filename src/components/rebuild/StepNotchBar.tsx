import { useLayoutEffect, useRef, useState } from 'react'
import { Blinds, ClipboardCheck, Lightbulb, Palette, PanelsLeftRight, Ruler, Warehouse, type LucideIcon } from 'lucide-react'
import type { ConfigStep } from '@/types/pergola'
import { NOTCH_COMPACT, NOTCH_DESKTOP, notchPad, notchPath, REBUILD_STEPS, rebuildStepIndex, slotCenter } from '@/lib/rebuildSteps'
import { tr } from '@/i18n/locale'

const ICONS: Record<ConfigStep, LucideIcon> = { size: Warehouse, mount: Ruler, roof: Blinds, sides: PanelsLeftRight, color: Palette, extras: Lightbulb, summary: ClipboardCheck }

const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } }

/** Lépéssáv bemélyedéssel (Ádám 01-es mintája): az aktív lépés köre a sávba „süllyed”, lépésváltáskor átúszik. */
export default function StepNotchBar({ step, compact, onStep }: { step: ConfigStep; compact: boolean; onStep: (step: ConfigStep) => void }) {
  const geometry = compact ? NOTCH_COMPACT : NOTCH_DESKTOP
  const wrap = useRef<HTMLDivElement>(null)
  const path = useRef<SVGPathElement>(null)
  const knob = useRef<HTMLSpanElement>(null)
  const pos = useRef<{ x: number } | null>(null)
  const [width, setWidth] = useState(0)
  const index = rebuildStepIndex(step)
  const count = REBUILD_STEPS.length
  const pad = width ? notchPad(width, count, geometry) : 0

  useLayoutEffect(() => {
    const element = wrap.current
    if (!element) return
    const update = () => setWidth(Math.round(element.getBoundingClientRect().width))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!width) return
    const target = slotCenter(index, count, width, pad)
    const draw = () => {
      const x = pos.current!.x
      path.current?.setAttribute('d', notchPath(width, x, geometry))
      if (knob.current) knob.current.style.transform = `translate(${x}px, ${geometry.dip}px) translate(-50%, -50%)`
    }
    if (!pos.current || reducedMotion()) { pos.current = { x: target }; draw(); return }
    // Időalapú animáció (lassú képkockáknál sem marad le: mindig a valós idő szerint áll).
    const from = pos.current.x
    const start = performance.now()
    const duration = 550
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
      pos.current!.x = from + (target - from) * eased
      draw()
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [index, width, pad, count, geometry])

  const Active = ICONS[step]
  return (
    <nav className={`lx-stepbar${compact ? ' is-compact' : ''}`} aria-label={tr('Konfigurálás lépései', 'Konfigurationsschritte')}>
      <div className="lx-stepbar-track" ref={wrap} style={{ height: geometry.height }}>
        {width > 0 && <svg className="lx-stepbar-shape" width={width} height={geometry.height} viewBox={`0 0 ${width} ${geometry.height}`} aria-hidden="true"><path ref={path} /></svg>}
        <span className="lx-stepbar-knob" ref={knob} aria-hidden="true" style={{ width: (geometry.notch - 6) * 2, height: (geometry.notch - 6) * 2 }}><Active size={compact ? 19 : 21} strokeWidth={1.8} /></span>
        <ol>
          {REBUILD_STEPS.map((item, i) => {
            const Icon = ICONS[item.id]
            const current = i === index
            return <li key={item.id} style={{ left: width ? slotCenter(i, count, width, pad) : `${((i + 0.5) / count) * 100}%` }}>
              <button type="button" className={current ? 'is-current' : ''} aria-current={current ? 'step' : undefined} aria-label={`${i + 1}. ${item.label}`} title={item.label} onClick={() => onStep(item.id)}>
                <Icon size={compact ? 18 : 20} strokeWidth={1.6} />
              </button>
            </li>
          })}
        </ol>
      </div>
    </nav>
  )
}
