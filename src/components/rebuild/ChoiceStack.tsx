import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { signedPrice } from '@/lib/money'
import { tr } from '@/i18n/locale'
import { usePriceDisplay } from './usePriceDisplay'

export interface ChoiceItem<T extends string> {
  id: T
  title: string
  /** egy sor előny (a kompakt soron is) */
  line: string
  /** a saját 3D-nkből renderelt bélyegkép */
  thumb: string
  /** csoport címe (pl. „Üveg”) */
  group: string
  /** a kiválasztott nagy kártyán megjelenő részletek */
  details?: ReactNode
}

/**
 * „Egy kérdés = egy döntés” választó: a kiválasztott opció nagy kártya (renderelt kép, név, előny, részletek),
 * alatta a többi kompakt, csoportosított sor (kis kép, név, egy sor, halk felár). Koppintásra a sor lesz a kiválasztott,
 * és a nagy kártyán nyílik ki a részlete. A felár a többi soron halk; a változást a lábléc ára mutatja.
 */
export default function ChoiceStack<T extends string>({ items, current, delta, onSelect, label, groups }: { items: ChoiceItem<T>[]; current: T; delta: (id: T) => number; onSelect: (id: T) => void; label: string; groups: string[] }) {
  const { prices: showPrices } = usePriceDisplay()
  const selected = items.find((item) => item.id === current) ?? items[0]
  const rest = items.filter((item) => item.id !== selected.id)
  return <div className="rb-choice" role="radiogroup" aria-label={label}>
    <div key={selected.id} className="rb-choice-hero" role="radio" aria-checked="true" tabIndex={0}>
      <img src={selected.thumb} alt="" width={360} height={240} decoding="async" />
      <span className="rb-option-check"><Check size={12} strokeWidth={3} /></span>
      <div className="rb-choice-hero-text">
        <strong>{selected.title}</strong>
        <span>{selected.line}</span>
        {selected.details}
      </div>
    </div>
    {rest.length > 0 && <div className="rb-choice-more">
      <h4>{tr('További lehetőségek', 'Weitere Möglichkeiten')}</h4>
      {groups.map((group) => {
        const rows = rest.filter((item) => item.group === group)
        if (!rows.length) return null
        return <div className="rb-choice-group" key={group}>
          <h5>{group}</h5>
          {rows.map((item) => <button type="button" role="radio" aria-checked="false" key={item.id} className="rb-choice-row" onClick={() => onSelect(item.id)}>
            <img src={item.thumb} alt="" width={72} height={48} loading="lazy" decoding="async" />
            <span className="rb-choice-row-text"><strong>{item.title}</strong><small>{item.line}</small></span>
            {showPrices && <em>{signedPrice(delta(item.id))}</em>}
          </button>)}
        </div>
      })}
    </div>}
  </div>
}
