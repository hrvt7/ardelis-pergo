import { useId, useLayoutEffect, useRef, useState } from 'react'
import { parseCentimetres, parsePlain, sliderFraction } from '@/lib/rebuildSlider'
import { tr } from '@/i18n/locale'

/**
 * Folyékony üveg csúszka (Ádám mintája): vékony sáv lime kitöltéssel, a fogantyú átlátszó üveglencse, amely
 * kissé felnagyítja az alatta futó sávot. Alatta valódi `input range` van (billentyű, képernyőolvasó, érintés).
 * `cm`: az érték méterben, a mező centiméterben; `°` és `%`: az érték maga.
 */
export default function LiquidSlider({ label, value, min, max, step = 0.05, unit = 'cm', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: 'cm' | '°' | '%'; onChange: (value: number) => void }) {
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
  // A kijelzett (és a csúszkán futó) egész érték: cm-nél centiméter, egyébként maga az érték.
  const factor = unit === 'cm' ? 100 : 1
  const shown = Math.round(value * factor)
  const [draft, setDraft] = useState(String(shown))
  const [synced, setSynced] = useState(shown)
  if (synced !== shown) { setSynced(shown); setDraft(String(shown)) }
  const fraction = sliderFraction(value, min, max)
  const commit = () => { const next = unit === 'cm' ? parseCentimetres(draft, min, max, step) : parsePlain(draft, min, max, step); if (next === null) { setDraft(String(shown)); return } setDraft(String(Math.round(next * factor))); if (next !== value) onChange(next) }
  const unitWord = unit === 'cm' ? tr('centiméterben', 'in Zentimetern') : unit === '%' ? tr('százalékban', 'in Prozent') : tr('fokban', 'in Grad')

  return (
    <div className="rb-slider" style={{ ['--rb-f' as string]: fraction }}>
      <div className="rb-slider-head">
        <label htmlFor={id}>{label}</label>
        <span className="rb-slider-value">
          <input aria-label={`${label} ${unitWord}`} inputMode="numeric" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
          <span>{unit}</span>
        </span>
      </div>
      <div className="rb-slider-rail" ref={rail} style={{ ['--rb-rail-w' as string]: `${railWidth}px` }}>
        <div className="rb-slider-track"><i /></div>
        <div className="rb-slider-knob" aria-hidden="true"><div className="rb-slider-lens"><div className="rb-slider-track"><i /></div></div></div>
        <input id={id} type="range" min={Math.round(min * factor)} max={Math.round(max * factor)} step={Math.max(1, Math.round(step * factor))} value={shown} onChange={(event) => onChange(Math.round(Number(event.target.value)) / factor)} aria-valuetext={`${shown} ${unit}`} />
      </div>
      <div className="rb-slider-limits"><span>{Math.round(min * factor)} {unit}</span><span>{Math.round(max * factor)} {unit}</span></div>
    </div>
  )
}
