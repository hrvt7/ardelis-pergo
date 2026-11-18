import { useState } from 'react'
import { Box, House } from 'lucide-react'
import type { GroundType } from '@/types/pergola'
import { tr } from '@/i18n/locale'
import { CORNER_TRACK } from '@/lib/cornerTrack'

/**
 * Környezet-kapcsoló a lépéskártya jobb felső sarkában: a gomb belül, a kártya lekerekítésével párhuzamos
 * sínen csúszik. Felül (vízszintesen) = sima háttér, a sarkon átfordulva lent (függőlegesen) = családi ház.
 * A sín a gomb mögött lime színnel telik ki. Csak látvány, az árat nem módosítja.
 */
export default function CornerEnvSwitch({ ground, onChange }: { ground: GroundType; onChange: (ground: GroundType) => void }) {
  const on = ground !== 'studio'
  // Visszakapcsoláskor a korábbi környezet (terasz vagy kert) jön vissza.
  const [last, setLast] = useState<GroundType>('terrace')
  const Icon = on ? House : Box
  return (
    <button type="button" role="switch" aria-checked={on} className={`rb-corner-switch${on ? ' is-on' : ''}`}
      aria-label={tr('Környezet: családi ház a háttérben', 'Umgebung: Haus im Hintergrund')}
      title={on ? tr('Környezet bekapcsolva (családi ház)', 'Umgebung an (Haus)') : tr('Sima háttér', 'Neutraler Hintergrund')}
      onClick={() => { if (on) { setLast(ground); onChange('studio') } else onChange(last) }}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <path className="rb-corner-groove" d={CORNER_TRACK} />
        <path className="rb-corner-fill" d={CORNER_TRACK} pathLength={100} />
      </svg>
      <span className="rb-corner-knob" aria-hidden="true"><Icon size={13} strokeWidth={2} /></span>
    </button>
  )
}
