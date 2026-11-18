import { useId, useLayoutEffect, useRef, useState } from 'react'
import { parseCentimetres, sliderFraction } from '@/lib/rebuildSlider'
import { tr } from '@/i18n/locale'

/**
 * Folyékony üveg csúszka (Ádám mintája): vékony sáv lime kitöltéssel, a fogantyú átlátszó üveglencse, amely
 * kissé felnagyítja az alatta futó sávot. Alatta valódi `input range` van (billentyű, képernyőolvasó, érintés).
 * Értékek méterben; a mező centiméterben.
 */
export default function LiquidSlider({ label, value, min, max, step = 0.05, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  const id = useId()
  const rail = useRef<HTMLDivElement>(null)
  const [railWidth, setRailWidth] = useState(300)
  useLayoutEffect(() => {
    const element = rail.current
    if (!element) return
    const update = () => setRailWidth(Math.round(element.getBoundingClientRect().width) || 300)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const cm = Math.round(value * 100)
  const [draft, setDraft] = useState(String(cm))
  const [synced, setSynced] = useState(cm)
  if (synced !== cm) { setSynced(cm); setDraft(String(cm)) }
  const fraction = sliderFraction(value, min, max)
  const commit = () => { const next = parseCentimetres(draft, min, max, step); if (next === null) { setDraft(String(cm)); return } setDraft(String(Math.round(next * 100))); if (next !== value) onChange(next) }

  return (
    <div className="lx-slider" style={{ ['--lx-f' as string]: fraction }}>
      <div className="lx-slider-head">
        <label htmlFor={id}>{label}</label>
        <span className="lx-slider-value">
          <input aria-label={`${label} ${tr('centiméterben', 'in Zentimetern')}`} inputMode="numeric" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
          <span>cm</span>
        </span>
      </div>
      <div className="lx-slider-rail" ref={rail} style={{ ['--lx-rail-w' as string]: `${railWidth}px` }}>
        <div className="lx-slider-track"><i /></div>
        <div className="lx-slider-knob" aria-hidden="true"><div className="lx-slider-lens"><div className="lx-slider-track"><i /></div></div></div>
        <input id={id} type="range" min={Math.round(min * 100)} max={Math.round(max * 100)} step={Math.round(step * 100)} value={cm} onChange={(event) => onChange(Math.round(Number(event.target.value)) / 100)} aria-valuetext={`${cm} cm`} />
      </div>
      <div className="lx-slider-limits"><span>{Math.round(min * 100)} cm</span><span>{Math.round(max * 100)} cm</span></div>
    </div>
  )
}
