// Funkciók „bemutató-asztal” formában: balra egy nagy, rögzített színpad, amin a kiválasztott funkció élő
// vonalrajz-jelenete fut; jobbra a nyolc funkció listája. Görgetésre (vagy kattintásra) a színpad jelenete vált.
// Telefonon vízszintesen lapozható sín, kártyánként saját jelenettel. Nem rács: egy jelenet, egy fókusz.
import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useCopy } from '@/i18n/useCopy'
import { SCENES, type Labels } from './featureArt'

const ORDER = ['ar', 'photo', 'sun', 'budget', 'advisor', 'night', 'energy', 'pdf'] as const

export default function FeatureScenes() {
  const { c } = useCopy()
  const f = c.features
  const labels: Labels = f.visual
  const list = useRef<HTMLOListElement>(null)
  const [active, setActive] = useState(0)

  // Görgetésre az a funkció lesz aktív, amelyik a képernyő közepén jár.
  useEffect(() => {
    const items = list.current?.querySelectorAll<HTMLElement>('[data-feature]')
    if (!items || !window.matchMedia('(min-width: 1081px)').matches) return
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.feature))
    }, { rootMargin: '-45% 0px -45% 0px' })
    items.forEach((item) => io.observe(item))
    return () => io.disconnect()
  }, [])

  const id = ORDER[active]
  return <div className="lx-tour">
    <div className={`lx-tour-stage ${id === 'night' ? 'is-ink' : ''}`} aria-hidden="true">
      <div className="lx-tour-art is-live" key={id}>{SCENES[id](labels)}</div>
      <span className="lx-tour-count">{String(active + 1).padStart(2, '0')} / {String(ORDER.length).padStart(2, '0')}</span>
    </div>
    <ol className="lx-tour-list" ref={list}>
      {ORDER.map((key, index) => {
        const item = f.items[key]
        return <li key={key} data-feature={index} className={index === active ? 'is-on' : ''}>
          <button type="button" aria-pressed={index === active} onClick={() => setActive(index)}>
            <span className="lx-tour-num">{String(index + 1).padStart(2, '0')}</span>
            <span className="lx-tour-text"><strong>{item.title}</strong><span>{item.text}</span></span>
          </button>
          <div className={`lx-tour-mini is-live ${key === 'night' ? 'is-ink' : ''}`} aria-hidden="true">{SCENES[key](labels)}</div>
        </li>
      })}
      <li className="lx-tour-cta"><a className="lx-btn lx-btn-ink" href="#demo" data-track="ajanlatkeres">{c.nav.requestDemo} <ArrowRight size={18} /></a></li>
    </ol>
  </div>
}
