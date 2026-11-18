import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { arcAngle } from '@/lib/rebuildSlider'
import { tr } from '@/i18n/locale'

const W = 300
const H = 150
const PX = 46
const PY = 132
const R = 108

const point = (deg: number, radius = R) => [PX + Math.cos((deg * Math.PI) / 180) * radius, PY - Math.sin((deg * Math.PI) / 180) * radius] as const
const arc = (from: number, to: number) => { const [x1, y1] = point(from); const [x2, y2] = point(to); return `M ${x1} ${y1} A ${R} ${R} 0 0 0 ${x2} ${y2}` }

/**
 * Lamellaszög íves üveggombbal (Ádám videós mintája): a gomb negyedkörön fut 0° (zárt) és 90° (nyitott) között,
 * és a forgásponton a lamella metszete ugyanazzal a szöggel fordul. Húzással, kattintással és billentyűvel is állítható.
 */
export default function LouvreArc({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const angle = Math.round(Math.min(90, Math.max(0, value)))
  const [kx, ky] = point(angle)
  const fromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = svg.current!.getBoundingClientRect()
    const x = ((event.clientX - box.left) / box.width) * W
    const y = ((event.clientY - box.top) / box.height) * H
    onChange(Math.round(arcAngle(x - PX, y - PY)))
  }
  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    const steps: Record<string, number> = { ArrowRight: -1, ArrowDown: -1, ArrowLeft: 1, ArrowUp: 1, PageUp: 10, PageDown: -10 }
    if (event.key === 'Home') { event.preventDefault(); onChange(0); return }
    if (event.key === 'End') { event.preventDefault(); onChange(90); return }
    if (event.key in steps) { event.preventDefault(); onChange(Math.min(90, Math.max(0, angle + steps[event.key]))) }
  }
  // A lamella metszete: lekerekített hasáb a forgásponton.
  const blade = `rotate(${-angle} ${PX} ${PY})`

  return (
    <div className="rb-arc">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="slider" tabIndex={0} aria-label={tr('Lamellaszög', 'Lamellenwinkel')} aria-valuemin={0} aria-valuemax={90} aria-valuenow={angle} aria-valuetext={`${angle}°`}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); fromPointer(event) }}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) fromPointer(event) }}
        onKeyDown={onKey}>
        <path d={arc(0, 90)} className="rb-arc-track" />
        {angle > 0 && <path d={arc(0, angle)} className="rb-arc-fill" />}
        {[0, 30, 60, 90].map((tick) => { const [x1, y1] = point(tick, R + 10); const [x2, y2] = point(tick, R + 16); return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} className="rb-arc-tick" /> })}
        <g transform={blade}><rect x={PX - 4} y={PY - 9} width={62} height={18} rx={9} className="rb-arc-blade" /></g>
        <circle cx={PX} cy={PY} r={4} className="rb-arc-pivot" />
        <g className="rb-arc-knob" transform={`translate(${kx} ${ky})`}>
          <circle r={19} className="rb-arc-knob-glass" />
          <circle r={19} className="rb-arc-knob-rim" />
        </g>
        <text x={W - 12} y={56} textAnchor="end" className="rb-arc-value">{angle}°</text>
        <text x={W - 12} y={78} textAnchor="end" className="rb-arc-caption">{angle === 0 ? tr('zárva', 'geschlossen') : angle >= 85 ? tr('teljesen nyitva', 'ganz offen') : tr('nyitva', 'offen')}</text>
      </svg>
    </div>
  )
}
