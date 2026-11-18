// „Működés” panel: a forgólamellás tető (Aluprof MB-OpenSky 140) lamellái élőben, gyári adatokkal. A 3D jelenet és
// a panel ugyanabból az órából (demoSeconds) számol, így a számok pontosan a látott lamellaállást mutatják.
// A hajtás rejtett (a gerendában), ezért a vázlat csak a lamellákat és a gerendát mutatja.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Cog, Pause, Play, X } from 'lucide-react'
import { demoAngle, demoSeconds, LOUVRE, pauseDemo, startDemoClock } from '@/lib/louvreSystem'
import { OS140, os140Count, os140Metrics } from '@/lib/os140'
import { OS140_SLAT } from '@/lib/os140Profiles'
import { bayWidth, moduleCount } from '@/lib/modules'
import type { PergolaConfig } from '@/types/pergola'
import { localized, tr } from '../i18n/locale'

const PHASE_LABEL = localized(() => ({ closed: tr('Zárt · vízzáró', 'Geschlossen · wasserdicht'), opening: tr('Nyílik', 'Öffnet'), open: 'Teljesen nyitva', closing: tr('Záródik', 'Schließt') } as const))
const fmt = (value: number, digits = 0) => value.toFixed(digits).replace('.', ',')

export default function MechanismPanel({ config, onClose }: { config: PergolaConfig; onClose: () => void }) {
  const count = useMemo(() => os140Count(bayWidth(config), config.depth, moduleCount(config)), [config])
  // a lamella gyári metszete (külső kontúr és üregek), mm-ben, SVG-koordinátában (y lefelé)
  const profilePath = useMemo(() => OS140_SLAT.flatMap((s) => [s.outer, ...s.holes]).map((loop) => loop.map(([u, v], i) => `${i ? 'L' : 'M'}${(u * 1000).toFixed(1)} ${(-v * 1000).toFixed(1)}`).join(' ') + 'Z').join(' '), [])
  const [paused, setPaused] = useState(false)
  const angleRef = useRef<HTMLElement>(null)
  const openRef = useRef<HTMLElement>(null)
  const gapRef = useRef<HTMLElement>(null)
  const phaseRef = useRef<HTMLElement>(null)
  const bladesRef = useRef<SVGGElement>(null)
  const fillRef = useRef<HTMLElement>(null)
  useEffect(() => { startDemoClock() }, [])
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const { angle, phase } = demoAngle(demoSeconds())
      const m = os140Metrics(angle)
      if (angleRef.current) angleRef.current.textContent = `${fmt(angle)}°`
      if (openRef.current) openRef.current.textContent = `${fmt(m.open)}%`
      if (gapRef.current) gapRef.current.textContent = m.sealed ? tr('átfed', 'überlappt') : `${fmt(m.gap)} mm`
      if (phaseRef.current) phaseRef.current.textContent = PHASE_LABEL[phase]
      if (fillRef.current) fillRef.current.style.width = `${(angle / LOUVRE.maxAngle) * 100}%`
      bladesRef.current?.querySelectorAll('g').forEach((g) => g.setAttribute('transform', `${g.dataset.at} rotate(${-angle})`))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const togglePause = () => { pauseDemo(!paused); setPaused(!paused) }
  const xs = [-200, 0, 200]
  const axle = Math.round(OS140.axleDown * 1000)
  return <section className="sun-panel mech-panel" aria-label={tr('A lamellás tető működése', 'So funktioniert das Lamellendach')}>
    <header>
      <div><Cog size={16} /><span><strong>{tr('Így működik', 'So funktioniert es')}</strong><small>{tr('Gyári adatok: profil, osztás, forgás', 'Herstellerdaten: Profil, Teilung, Drehung')}</small></span></div>
      <button type="button" className="sun-close" aria-label={tr('Működés bemutató bezárása', 'Funktionsvorführung schließen')} onClick={onClose}><X size={16} /></button>
    </header>

    <svg className="mech-sketch" viewBox="-330 -175 660 240" role="img" aria-label={tr('Három lamella oldalnézetben', 'Drei Lamellen in Seitenansicht')}>
      {/* a gerenda teteje a tengely felett 58 mm-rel */}<rect x="-320" y={-axle} width="640" height="130" className="mech-beam" opacity="0.35" />
      <g ref={bladesRef}>{xs.map((x) => <g key={x} data-at={`translate(${x} 0)`} transform={`translate(${x} 0)`}><path d={profilePath} className="mech-blade" fillRule="evenodd" /><circle r="7" className="mech-axle" /></g>)}</g>
    </svg>

    <div className="mech-progress" aria-hidden="true"><i ref={fillRef} /></div>
    <dl className="mech-readout" aria-live="off">
      <div><dt>{tr('Lamellaszög', 'Lamellenwinkel')}</dt><dd ref={angleRef}>0°</dd></div>
      <div><dt>{tr('Nyitott felület', 'Offene Fläche')}</dt><dd ref={openRef}>0%</dd></div>
      <div><dt>{tr('Lamellaköz', 'Lamellenabstand')}</dt><dd ref={gapRef}>{tr('átfed', 'überlappt')}</dd></div>
    </dl>
    <div className="mech-state"><span ref={phaseRef}>{tr('Zárt · vízzáró', 'Geschlossen · wasserdicht')}</span><button type="button" className="sun-play" aria-label={paused ? tr('Lejátszás', 'Abspielen') : tr('Megállítás', 'Anhalten')} onClick={togglePause}>{paused ? <Play size={15} /> : <Pause size={15} />}</button></div>

    <ul className="mech-specs">
      <li><strong>{count.total}</strong><span>lamella</span></li>
      <li><strong>{Math.round(OS140.pitch * 1000)}</strong><span>{tr('mm osztás', 'mm Teilung')}</span></li>
      <li><strong>0–{OS140.maxAngle}°</strong><span>{tr('forgás', 'Drehung')}</span></li>
      <li><strong>{tr('rejtett', 'verdeckt')}</strong><span>{tr('motor', 'Motor')}</span></li>
    </ul>
    <p className="sun-note">{tr(
      `A lamellák a tengelyük körül, egyszerre fordulnak; a motor a gerendában rejtve van. Zárt állásban a 223 mm széles lamellák 200 mm-es osztásnál átfednek. A bemutató 0–${LOUVRE.maxAngle}° között jár, a rendszer gyárilag ${OS140.maxAngle}°-ig nyit. Referencia: Aluprof MB-OpenSky 140 gyári CAD-rajzai; a partnergyártó saját adataival pontosítható.`,
      `Die Lamellen drehen sich gemeinsam um ihre Achse; der Motor ist im Träger verdeckt. Geschlossen überlappen die 223 mm breiten Lamellen bei 200 mm Teilung. Die Vorführung läuft von 0 bis ${LOUVRE.maxAngle}°, das System öffnet werkseitig bis ${OS140.maxAngle}°. Referenz: Aluprof MB-OpenSky 140 CAD-Zeichnungen; mit den Daten des Partnerherstellers präzisierbar.`,
    )}</p>
  </section>
}
