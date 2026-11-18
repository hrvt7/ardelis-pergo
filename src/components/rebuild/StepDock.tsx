import { useLayoutEffect, useRef, useState } from 'react'
import type { ConfigStep } from '@/types/pergola'
import { dockPath, REBUILD_STEPS, rebuildStepIndex } from '@/lib/rebuildSteps'
import { tr } from '@/i18n/locale'
import StepIcon from './StepIcons'

const HEIGHT = 84
const FILLET = 18
const RADIUS = 24
const RING = 2 * Math.PI * 17

/**
 * Lépéssáv a lépéskártya tetején (Ádám 03-as mintája): a kártya felső széléhez homorú ívvel olvadó sötét dokk,
 * lépésenként gyűrű + ikon + rövid név. A gyűrű mutatja a haladást: a kész lépéseké tele, az aktuálisé kiemelt,
 * a hátralévőké üres; lépésváltáskor a gyűrűk simán töltődnek / ürülnek.
 */
export default function StepDock({ step, onStep }: { step: ConfigStep; onStep: (step: ConfigStep) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const index = rebuildStepIndex(step)

  useLayoutEffect(() => {
    const element = wrap.current
    if (!element) return
    const update = () => setWidth(Math.round(element.getBoundingClientRect().width))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="lx-dock" ref={wrap} aria-label={tr('Konfigurálás lépései', 'Konfigurationsschritte')} style={{ height: HEIGHT }}>
      {width > 0 && <svg className="lx-dock-shape" width={width + FILLET * 2} height={HEIGHT} viewBox={`${-FILLET} 0 ${width + FILLET * 2} ${HEIGHT}`} aria-hidden="true"><path d={dockPath(width, HEIGHT, FILLET, RADIUS)} /></svg>}
      <ol>
        {REBUILD_STEPS.map((item, i) => {
          const state = i < index ? 'is-done' : i === index ? 'is-current' : 'is-next'
          return <li key={item.id}>
            <button type="button" className={state} aria-current={i === index ? 'step' : undefined} aria-label={`${i + 1}. ${item.label}`} title={item.label} onClick={() => onStep(item.id)}>
              <span className="lx-dock-ring">
                <svg className="lx-dock-progress" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle className="lx-dock-track" cx="20" cy="20" r="17" /><circle className="lx-dock-fill" cx="20" cy="20" r="17" strokeDasharray={RING} strokeDashoffset={i <= index ? 0 : RING} /></svg>
                <StepIcon step={item.id} size={18} />
              </span>
              <span className="lx-dock-name">{item.short}</span>
            </button>
          </li>
        })}
      </ol>
    </nav>
  )
}
