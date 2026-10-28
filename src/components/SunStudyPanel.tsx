// Árnyékelemzés panel: helyszín, tájolás, nap és időpont; eredmény a pergola
// alatti árnyék százalékában és egy napi görbén.
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Compass, LocateFixed, Pause, Play, SunMedium, X } from 'lucide-react'
import type { ShadeResult } from '@/components/ShadeProbe'
import { COMPASS_POINTS, compassLabel, formatClock, sunDay } from '@/lib/sun'
import { DEFAULT_SITE, isoDate, lookupPostalCode, studyDate, studySun } from '@/lib/sunSite'
import type { SceneSettings, TimeOfDay } from '@/types/pergola'

/** Mágneses elhajlás Magyarországon (2026, kb. +5,5°): a telefon iránytűje mágneses északot mutat. */
const DECLINATION = 5.5

const DATE_PRESETS: { label: string; month: number; day: number }[] = [
  { label: 'Jún. 21.', month: 6, day: 21 },
  { label: 'Júl. 15.', month: 7, day: 15 },
  { label: 'Szept. 23.', month: 9, day: 23 },
  { label: 'Dec. 21.', month: 12, day: 21 },
]

function timeOfDayForSun(elevation: number): TimeOfDay {
  return elevation < -4 ? 'night' : elevation < 12 ? 'sunset' : 'day'
}

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number }

/** Telefon iránytűje: a készülék teteje felé eső égtáj (fok, földrajzi észak). 1,5 s átlag. */
async function readCompass(): Promise<number> {
  const Orientation = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
  if (!Orientation) throw new Error('unsupported')
  if (typeof Orientation.requestPermission === 'function' && (await Orientation.requestPermission()) !== 'granted') throw new Error('denied')
  return new Promise((resolve, reject) => {
    const samples: number[] = []
    const handler = (event: Event) => {
      const e = event as OrientationEventWithCompass
      const heading = typeof e.webkitCompassHeading === 'number' ? e.webkitCompassHeading : e.absolute && e.alpha !== null ? 360 - e.alpha : null
      if (heading !== null && Number.isFinite(heading)) samples.push(heading)
    }
    const stop = () => { window.removeEventListener('deviceorientationabsolute', handler); window.removeEventListener('deviceorientation', handler) }
    window.addEventListener('deviceorientationabsolute', handler)
    window.addEventListener('deviceorientation', handler)
    window.setTimeout(() => {
      stop()
      if (!samples.length) { reject(new Error('no-data')); return }
      const x = samples.reduce((sum, value) => sum + Math.cos((value * Math.PI) / 180), 0)
      const y = samples.reduce((sum, value) => sum + Math.sin((value * Math.PI) / 180), 0)
      resolve((((Math.atan2(y, x) * 180) / Math.PI + DECLINATION) % 360 + 360) % 360)
    }, 1500)
  })
}

function ShadeChart({ result, hour, sunrise, sunset, onPick }: { result: ShadeResult | null; hour: number; sunrise: number; sunset: number; onPick: (hour: number) => void }) {
  const width = 280
  const height = 70
  const span = Math.max(sunset - sunrise, 1)
  const x = (value: number) => ((value - sunrise) / span) * width
  const y = (shade: number) => height - (shade / 100) * (height - 6) - 3
  const curve = result?.curve ?? []
  const line = curve.map((point, index) => `${index ? 'L' : 'M'}${x(point.hour).toFixed(1)},${y(point.shade).toFixed(1)}`).join(' ')
  const area = curve.length ? `${line} L${x(curve[curve.length - 1].hour).toFixed(1)},${height} L${x(curve[0].hour).toFixed(1)},${height} Z` : ''
  const ticks = [6, 9, 12, 15, 18, 21].filter((tick) => tick > sunrise && tick < sunset)
  return <div className="shade-chart">
    <svg viewBox={`0 0 ${width} ${height + 14}`} role="img" aria-label="A pergola alatti árnyék aránya a nap folyamán" onClick={(event) => {
      const box = event.currentTarget.getBoundingClientRect()
      onPick(sunrise + ((event.clientX - box.left) / box.width) * span)
    }}>
      {[0, 50, 100].map((level) => <line key={level} x1={0} x2={width} y1={y(level)} y2={y(level)} className="grid" />)}
      {area && <path d={area} className="area" />}
      {line && <path d={line} className="line" />}
      <line x1={x(hour)} x2={x(hour)} y1={0} y2={height} className="marker" />
      {ticks.map((tick) => <text key={tick} x={x(tick)} y={height + 11} textAnchor="middle">{tick}h</text>)}
    </svg>
    <div className="shade-chart-scale"><span>100%</span><span>0%</span></div>
  </div>
}

export default function SunStudyPanel({ scene, shade, onChange, onClose }: { scene: SceneSettings; shade: ShadeResult | null; onChange: (patch: Partial<SceneSettings>) => void; onClose: () => void }) {
  const site = scene.site ?? DEFAULT_SITE
  const date = studyDate(scene, site.timeZone)
  const day = sunDay(date[0], date[1], date[2], site.lat, site.lon, site.timeZone)
  const sunrise = day.sunrise ?? 5
  const sunset = day.sunset ?? 21
  const sun = studySun(scene)
  const [postal, setPostal] = useState(scene.site?.postalCode ?? '')
  const [postalState, setPostalState] = useState<'idle' | 'loading' | 'missing' | 'error'>('idle')
  const [compassState, setCompassState] = useState<'idle' | 'reading' | 'failed'>('idle')
  const [playing, setPlaying] = useState(false)
  // Mobilon a beállítások összecsukva indulnak, hogy a 3D-ben látszódjon az árnyék.
  const [showSettings, setShowSettings] = useState(() => typeof window === 'undefined' || window.innerWidth > 820)
  const monthNames = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.']
  const hourRef = useRef(scene.sunHour)
  useEffect(() => { hourRef.current = scene.sunHour }, [scene.sunHour])

  const setHour = (hour: number) => {
    const clamped = Math.min(Math.max(hour, Math.floor(sunrise * 4) / 4), Math.ceil(sunset * 4) / 4)
    onChange({ sunHour: clamped, time: timeOfDayForSun(studySun(scene, clamped).elevation) })
  }

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const next = hourRef.current + 0.25
      if (next > sunset) { setPlaying(false); return }
      hourRef.current = next
      onChange({ sunHour: next, time: timeOfDayForSun(studySun(scene, next).elevation) })
    }, 280)
    return () => window.clearInterval(timer)
  }, [playing, sunset, scene.site, scene.sunDate, onChange]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitPostal = async (value: string) => {
    setPostal(value)
    if (!/^\d{4}$/.test(value)) { setPostalState('idle'); return }
    setPostalState('loading')
    try {
      const found = await lookupPostalCode(value)
      if (!found) { setPostalState('missing'); return }
      setPostalState('idle')
      onChange({ site: found })
    } catch {
      setPostalState('error')
    }
  }

  const setDate = (month: number, dayOfMonth: number) => {
    const year = date[0]
    onChange({ sunDate: isoDate([year, month, dayOfMonth]) })
  }

  const measureCompass = async () => {
    setCompassState('reading')
    try {
      const heading = await readCompass()
      onChange({ facing: Math.round(heading) })
      setCompassState('idle')
    } catch {
      setCompassState('failed')
    }
  }

  const canUseCompass = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && navigator.maxTouchPoints > 0
  const sunUp = sun.elevation > 0
  const shadeNow = shade?.now ?? null
  const sunnyQuarters = shade?.curve.length ?? 0
  const shadedQuarters = shade?.curve.filter((point) => point.shade >= 70).length ?? 0

  return <section className="sun-panel" aria-label="Árnyékelemzés">
    <header>
      <div><SunMedium size={16} /><span><strong>Árnyékelemzés</strong><small>Valós napállás a megadott helyen</small></span></div>
      <button type="button" className="sun-close" aria-label="Árnyékelemzés bezárása" onClick={onClose}><X size={16} /></button>
    </header>

    <div className="sun-result" aria-live="polite">
      <div>
        <span>Árnyék a pergola alatt</span>
        <strong>{!sunUp ? 'Nincs napsütés' : shadeNow === null ? 'Számítás…' : `${shadeNow}%`}</strong>
      </div>
      <div className="sun-meta">
        <span>{formatClock(scene.sunHour)} · nap {Math.round(sun.azimuth)}° {compassLabel(sun.azimuth)}, {Math.max(0, sun.elevation).toFixed(0)}° magasan</span>
        <span>Napkelte {day.sunrise !== null ? formatClock(day.sunrise) : '–'} · Napnyugta {day.sunset !== null ? formatClock(day.sunset) : '–'}</span>
      </div>
    </div>

    <ShadeChart result={shade} hour={scene.sunHour} sunrise={sunrise} sunset={sunset} onPick={setHour} />
    {shade && sunnyQuarters > 0 && <p className="sun-summary">Aznap {(sunnyQuarters / 4).toFixed(1).replace('.', ',')} napos órából {(shadedQuarters / 4).toFixed(1).replace('.', ',')} órán át legalább 70% árnyék a pergola alatt.</p>}

    <div className="sun-time">
      <button type="button" className="sun-play" aria-label={playing ? 'Lejátszás megállítása' : 'A nap lejátszása'} onClick={() => { if (!playing && scene.sunHour >= sunset - 0.25) setHour(sunrise); setPlaying(!playing) }}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
      <input id="sun-hour" aria-label="Időpont" className="range-input" type="range" min={Math.floor(sunrise * 4) / 4} max={Math.ceil(sunset * 4) / 4} step={1 / 12} value={scene.sunHour} onChange={(event) => setHour(Number(event.target.value))} />
      <strong>{formatClock(scene.sunHour)}</strong>
    </div>

    <button type="button" className="sun-settings-toggle" aria-expanded={showSettings} onClick={() => setShowSettings(!showSettings)}>
      <span>{site.name} · {monthNames[date[1] - 1]} {date[2]}. · eleje {compassLabel(scene.facing)} felé</span>
      <ChevronDown size={15} />
    </button>

    {showSettings && <>
    <div className="sun-field">
      <span>Nap</span>
      <div className="sun-chips">
        {DATE_PRESETS.map((preset) => <button type="button" key={preset.label} className={date[1] === preset.month && date[2] === preset.day ? 'selected' : ''} onClick={() => setDate(preset.month, preset.day)}>{preset.label}</button>)}
        <input id="sun-date" aria-label="Dátum" type="date" value={isoDate(date)} onChange={(event) => { if (event.target.value) onChange({ sunDate: event.target.value }) }} />
      </div>
    </div>

    <div className="sun-field">
      <span>Helyszín</span>
      <div className="sun-location">
        <input id="sun-postal" inputMode="numeric" autoComplete="postal-code" maxLength={4} placeholder="Irányítószám" value={postal} onChange={(event) => { void submitPostal(event.target.value.replace(/\D/g, '').slice(0, 4)) }} />
        <small>{postalState === 'loading' ? 'Keresés…' : postalState === 'missing' ? 'Nincs ilyen irányítószám' : postalState === 'error' ? 'A lista nem tölthető be' : `${site.name}${site.region && site.region !== site.name ? `, ${site.region}` : ''}${scene.site ? '' : ' (alapértelmezett)'}`}</small>
      </div>
    </div>

    <div className="sun-field">
      <span>Tájolás <small>— merre néz a pergola kert felőli eleje?</small></span>
      <div className="sun-facing">
        {COMPASS_POINTS.map((label, index) => <button type="button" key={label} className={Math.round(scene.facing / 45) % 8 === index && scene.facing % 45 === 0 ? 'selected' : ''} onClick={() => onChange({ facing: index * 45 })}>{label}</button>)}
      </div>
      <div className="sun-facing-fine">
        <input id="sun-facing" aria-label="Tájolás fokban" className="range-input" type="range" min={0} max={359} step={1} value={scene.facing} onChange={(event) => onChange({ facing: Number(event.target.value) })} />
        <strong>{scene.facing}° {compassLabel(scene.facing)}</strong>
      </div>
      {canUseCompass && <button type="button" className="sun-compass" onClick={() => { void measureCompass() }} disabled={compassState === 'reading'}>
        {compassState === 'reading' ? <LocateFixed size={14} /> : <Compass size={14} />}
        {compassState === 'reading' ? 'Mérés… tartsd mozdulatlanul' : 'Mérés a telefon iránytűjével'}
      </button>}
      {compassState === 'failed' && <small className="sun-hint">Az iránytű itt nem érhető el. Állítsd be kézzel, vagy nyisd meg az oldalt közvetlenül a telefon böngészőjében.</small>}
      <small className="sun-hint">Állj háttal a házfalnak: amerre nézel, az a pergola eleje. Iránytűs mérésnél a telefon vízszintesen, a teteje a kert felé.</small>
    </div>
    </>}

    <p className="sun-note">Napállás csillagászati számítással (±0,02°). Számít a pergola szerkezete, a ZIP-roló és a ház; az üveg átengedi a fényt. A szomszéd fái, épületei nincsenek a modellben.</p>
  </section>
}
