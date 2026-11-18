import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface ArcItem { id: string; label: string; sub?: string; note?: string; icon: ReactNode }

import { arcOffset } from '@/lib/rebuildSlider'

const STEP = 76
const LEFT = 36
const LINE_X = LEFT + 170 + 12 + 52 + 22

/**
 * Íves, görgethető választó (Ádám mintája): az elemek egy íven sorakoznak, középen a kiválasztott (felirat
 * kiemelve, ikon lime kerettel). Görgővel, húzással, kattintással és nyilakkal is választható; elengedéskor
 * a legközelebbi elemre pattan.
 */
export default function ArcPicker({ items, value, label, onChange, height = 360 }: { items: ArcItem[]; value: string; label: string; onChange: (id: string) => void; height?: number }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value))
  const [pos, setPos] = useState(index)
  const [moving, setMoving] = useState(false)
  const drag = useRef<{ y: number; pos: number; moved: boolean; id: number } | null>(null)
  const wheelTimer = useRef(0)
  const box = useRef<HTMLDivElement>(null)
  const clamp = (value: number) => Math.min(items.length - 1, Math.max(0, value))
  // Külső változásnál (visszavonás, másik oldal) a kerék a kiválasztotthoz áll.
  const [synced, setSynced] = useState(index)
  if (synced !== index) { setSynced(index); setPos(index) }

  const commit = (next: number) => {
    const snapped = clamp(Math.round(next))
    setMoving(false)
    setPos(snapped)
    if (items[snapped] && items[snapped].id !== value) onChange(items[snapped].id)
  }

  // A görgő-figyelő egyszer kerül fel; a legfrissebb állapotot refeken át éri el (újrarajzoláskor nem törlődik az időzítő).
  const latest = useRef({ commit, clamp })
  useEffect(() => { latest.current = { commit, clamp } })
  useEffect(() => {
    const element = box.current
    if (!element) return
    let target: number | null = null
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      setMoving(true)
      setPos((current) => {
        const next = latest.current.clamp((target ?? current) + event.deltaY / 110)
        target = next
        return next
      })
      window.clearTimeout(wheelTimer.current)
      wheelTimer.current = window.setTimeout(() => { if (target !== null) latest.current.commit(target); target = null }, 160)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => { element.removeEventListener('wheel', onWheel); window.clearTimeout(wheelTimer.current) }
  }, [])

  return (
    <div className={`rb-arcpick${moving ? ' is-moving' : ''}`} ref={box} style={{ height }} role="listbox" tabIndex={0} aria-label={label} aria-activedescendant={`rb-arc-${items[index]?.id}`}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); commit(index + 1) }
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); commit(index - 1) }
      }}
      onPointerDown={(event) => { drag.current = { y: event.clientY, pos, moved: false, id: event.pointerId } }}
      onPointerMove={(event) => {
        const start = drag.current
        if (!start) return
        const dy = event.clientY - start.y
        if (!start.moved && Math.abs(dy) < 5) return
        if (!start.moved) { start.moved = true; event.currentTarget.setPointerCapture(start.id); setMoving(true) }
        setPos(clamp(start.pos - dy / STEP))
      }}
      onPointerUp={() => { const start = drag.current; drag.current = null; if (start?.moved) commit(pos) }}
      onPointerCancel={() => { drag.current = null; commit(pos) }}>
      <svg className="rb-arcpick-line" width="100%" height={height} aria-hidden="true"><polyline points={Array.from({ length: 21 }, (_, k) => { const y = (k / 20) * height; return `${LINE_X + arcOffset(y - height / 2)},${y}` }).join(' ')} /></svg>
      {items.map((item, i) => {
        const d = i - pos
        if (Math.abs(d) > 3.2) return null
        const y = d * STEP
        const x = arcOffset(y)
        const near = Math.abs(d)
        const current = i === index
        return <button type="button" role="option" id={`rb-arc-${item.id}`} aria-selected={current} tabIndex={-1} key={item.id} className={`rb-arcpick-item${current ? ' is-current' : ''}`}
          style={{ transform: `translate3d(${LEFT + x}px, ${height / 2 + y}px, 0) translateY(-50%) rotate(${d * 6}deg)`, opacity: Math.max(0, 1 - near * 0.3) }}
          onClick={() => { if (!drag.current?.moved) commit(i) }}>
          <span className="rb-arcpick-text"><strong>{item.label}</strong>{item.sub && <small>{item.sub}</small>}</span>
          <span className="rb-arcpick-icon">{item.icon}</span>
          {item.note && <em>{item.note}</em>}
        </button>
      })}
    </div>
  )
}
