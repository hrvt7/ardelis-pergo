// „Működés” panel: a forgólamellás tető hajtása élőben, valós gyári adatokkal. A 3D jelenet és a panel
// ugyanabból az órából (demoSeconds) számol, így a számok pontosan a látott lamellaállást mutatják.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Cog, Pause, Play, X } from 'lucide-react'
import { crankPin, demoAngle, demoSeconds, DRIVE, drivePlan, LOUVRE, louvreLayout, louvreMetrics, louvreProfile, motorLength, pauseDemo, startDemoClock } from '@/lib/louvreSystem'
import { SB400 } from '@/lib/sb400'
import type { PergolaConfig } from '@/types/pergola'

const PHASE_LABEL = { closed: 'Zárt · vízzáró', opening: 'Nyílik', open: 'Teljesen nyitva', closing: 'Záródik' } as const
const fmt = (value: number, digits = 0) => value.toFixed(digits).replace('.', ',')

export default function MechanismPanel({ config, onClose }: { config: PergolaConfig; onClose: () => void }) {
  // ugyanaz a váz, mint a jelenetben: SB 400 gerenda, a hajtásoldali tengely 20 mm-rel magasabban
  const beamTop = config.height + SB400.strutH / 2
  const layout = useMemo(() => louvreLayout(config.width, config.depth, SB400.strutW, beamTop, SB400.endGap), [config.width, config.depth, beamTop])
  const driveAxle = layout.axleY + SB400.fall
  const plan = useMemo(() => drivePlan(layout.z, driveAxle, beamTop, (config.depth - SB400.strutW) / 2 - 0.04), [layout, driveAxle, beamTop, config.depth])
  const profilePath = useMemo(() => louvreProfile(10).map(([x, y], i) => `${i ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${(-y * 1000).toFixed(1)}`).join(' ') + 'Z', [])
  const [paused, setPaused] = useState(false)
  const angleRef = useRef<HTMLElement>(null)
  const openRef = useRef<HTMLElement>(null)
  const gapRef = useRef<HTMLElement>(null)
  const motorRef = useRef<HTMLElement>(null)
  const phaseRef = useRef<HTMLElement>(null)
  const bladesRef = useRef<SVGGElement>(null)
  const barRef = useRef<SVGGElement>(null)
  const cranksRef = useRef<SVGGElement>(null)
  const fillRef = useRef<HTMLElement>(null)
  useEffect(() => { startDemoClock() }, [])
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const { angle, phase } = demoAngle(demoSeconds())
      const m = louvreMetrics(angle)
      const len = motorLength(plan, layout.z, driveAxle, angle) * 1000
      if (angleRef.current) angleRef.current.textContent = `${fmt(angle)}°`
      if (openRef.current) openRef.current.textContent = `${fmt(m.open)}%`
      if (gapRef.current) gapRef.current.textContent = m.sealed ? 'átfed' : `${fmt(m.gap)} mm`
      if (motorRef.current) motorRef.current.textContent = `${fmt(len)} mm`
      if (phaseRef.current) phaseRef.current.textContent = PHASE_LABEL[phase]
      if (fillRef.current) fillRef.current.style.width = `${(angle / LOUVRE.maxAngle) * 100}%`
      // vázlat: három lamella oldalnézetben, a hajtókarok és a közös hajtórúd
      const rot = `rotate(${-angle})`
      bladesRef.current?.querySelectorAll('g').forEach((g) => g.setAttribute('transform', `${g.dataset.at} ${rot}`))
      cranksRef.current?.querySelectorAll('g').forEach((g) => g.setAttribute('transform', `${g.dataset.at} ${rot}`))
      const [pz, py] = crankPin(angle)
      barRef.current?.setAttribute('transform', `translate(${(pz * 1000).toFixed(1)} ${(-py * 1000).toFixed(1)})`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [plan, layout, driveAxle])

  const togglePause = () => { pauseDemo(!paused); setPaused(!paused) }

  const count = layout.z.length * layout.modules.length
  const [cx0, cy0] = crankPin(0)
  const xs = [-200, 0, 200]
  return <section className="sun-panel mech-panel" aria-label="A lamellás tető működése">
    <header>
      <div><Cog size={16} /><span><strong>Így működik</strong><small>Valós gyári adatok: profil, osztás, hajtás</small></span></div>
      <button type="button" className="sun-close" aria-label="Működés bemutató bezárása" onClick={onClose}><X size={16} /></button>
    </header>

    <svg className="mech-sketch" viewBox="-330 -175 660 240" role="img" aria-label="Három lamella oldalnézetben a hajtókarokkal és a hajtórúddal">
      <rect x="-320" y="-43" width="640" height="120" className="mech-beam" />
      <g ref={cranksRef}>{xs.map((x) => <g key={x} data-at={`translate(${x} 0)`} transform={`translate(${x} 0)`}><line x1="0" y1="0" x2={cx0 * 1000} y2={-cy0 * 1000} className="mech-crank" /><circle cx={cx0 * 1000} cy={-cy0 * 1000} r="7" className="mech-pin" /></g>)}</g>
      <g ref={bladesRef}>{xs.map((x) => <g key={x} data-at={`translate(${x} 0)`} transform={`translate(${x} 0)`}><path d={profilePath} className="mech-blade" /><circle r="9" className="mech-axle" /></g>)}</g>
      <g ref={barRef}><rect x="-300" y="-22" width="600" height="20" rx="3" className="mech-bar" /></g>
    </svg>

    <div className="mech-progress" aria-hidden="true"><i ref={fillRef} /></div>
    <dl className="mech-readout" aria-live="off">
      <div><dt>Lamellaszög</dt><dd ref={angleRef}>0°</dd></div>
      <div><dt>Nyitott felület</dt><dd ref={openRef}>0%</dd></div>
      <div><dt>Lamellaköz</dt><dd ref={gapRef}>átfed</dd></div>
      <div><dt>Motor hossza</dt><dd ref={motorRef}>{fmt(DRIVE.motorClosed * 1000)} mm</dd></div>
    </dl>
    <div className="mech-state"><span ref={phaseRef}>Zárt · vízzáró</span><button type="button" className="sun-play" aria-label={paused ? 'Lejátszás' : 'Megállítás'} onClick={togglePause}>{paused ? <Play size={15} /> : <Pause size={15} />}</button></div>

    <ul className="mech-specs">
      <li><strong>{count}</strong><span>lamella</span></li>
      <li><strong>200</strong><span>mm osztás</span></li>
      <li><strong>0–110°</strong><span>forgás</span></li>
      <li><strong>{fmt(DRIVE.force)} N</strong><span>lineáris motor</span></li>
    </ul>
    <p className="sun-note">Egy motor tolja a gerendán futó hajtórudat; minden lamella végén egy 115 mm-es kar kapcsolódik rá, így az összes lamella egyszerre, ugyanannyit fordul. Zárt állásban a lamellák pereme a szomszéd vízcsatornájába lóg: {LOUVRE.sealAngle}° alatt a tető vízzáró. Referencia: 215,8 × 39,8 mm-es forgólamellás rendszer gyári műszaki adatai; a partnergyártó saját profiljával pontosítható.</p>
  </section>
}
