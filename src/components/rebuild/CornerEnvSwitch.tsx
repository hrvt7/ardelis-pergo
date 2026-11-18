import { useEffect, useRef, useState } from 'react'
import { Box, House } from 'lucide-react'
import type { GroundType } from '@/types/pergola'
import { tr } from '@/i18n/locale'
import { CORNER_TRACK, SLIDE_MS } from '@/lib/cornerTrack'

/**
 * Környezet-kapcsoló a lépéskártya jobb felső sarkában: a gomb belül, a kártya lekerekítésével párhuzamos
 * sínen csúszik. Felül (vízszintesen) = sima háttér, a sarkon átfordulva lent (függőlegesen) = családi ház.
 * A sín a gomb mögött lime színnel telik ki. Csak látvány, az árat nem módosítja.
 */
export default function CornerEnvSwitch({ ground, onChange }: { ground: GroundType; onChange: (ground: GroundType) => void }) {
  const actual = ground !== 'studio'
  // A gomb előbb végigcsúszik a sínen, és a környezet akkor vált, amikor a gomb megérkezik: a ház betöltése
  // (nehéz 3D-render) így nem akasztja meg a csúszás elejét, és a kép a csúszkával együtt vált.
  const [pending, setPending] = useState<boolean | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const on = pending ?? actual
  // Visszakapcsoláskor a korábbi környezet (terasz vagy kert) jön vissza.
  const [last, setLast] = useState<GroundType>('terrace')
  const Icon = on ? House : Box
  return (
    <button type="button" role="switch" aria-checked={on} className={`rb-corner-switch${on ? ' is-on' : ''}`}
      aria-label={tr('Környezet: családi ház a háttérben', 'Umgebung: Haus im Hintergrund')}
      title={on ? tr('Környezet bekapcsolva (családi ház)', 'Umgebung an (Haus)') : tr('Sima háttér', 'Neutraler Hintergrund')}
      onClick={() => {
        if (pending !== null) return
        const next = !actual
        if (!next) setLast(ground)
        setPending(next)
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        timer.current = window.setTimeout(() => { onChange(next ? last : 'studio'); setPending(null) }, reduce ? 0 : SLIDE_MS)
      }}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <path className="rb-corner-groove" d={CORNER_TRACK} />
        <path className="rb-corner-fill" d={CORNER_TRACK} pathLength={100} />
      </svg>
      <span className="rb-corner-knob" aria-hidden="true"><Icon size={13} strokeWidth={2} /></span>
    </button>
  )
}
