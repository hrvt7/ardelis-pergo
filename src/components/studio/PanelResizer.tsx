import { useRef } from 'react'

/** A beállítópanel bal szélén húzható fogantyú: egérrel, ujjal és billentyűzettel (← →) is állítható. */
export default function PanelResizer({ width, min, max, onChange, onReset }: { width: number; min: number; max: number; onChange: (width: number) => void; onReset: () => void }) {
  const drag = useRef<{ x: number; width: number } | null>(null)
  return <div
    className="panel-resizer"
    role="separator"
    aria-orientation="vertical"
    aria-label="Panel szélessége – húzd vagy használd a nyilakat; dupla kattintás: alapméret"
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={width}
    tabIndex={0}
    title="Húzd a panel szélességéhez · dupla kattintás: alapméret"
    onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, width } }}
    onPointerMove={(event) => { if (drag.current) onChange(drag.current.width + (drag.current.x - event.clientX)) }}
    onPointerUp={(event) => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
    onPointerCancel={() => { drag.current = null }}
    onDoubleClick={onReset}
    onKeyDown={(event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); onChange(width + 16) }
      if (event.key === 'ArrowRight') { event.preventDefault(); onChange(width - 16) }
      if (event.key === 'Home' || event.key === 'Enter') { event.preventDefault(); onReset() }
    }}
  ><span aria-hidden="true" /></div>
}
