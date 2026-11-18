import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Info, X } from 'lucide-react'
import type { PriceBreakdown } from '@/types/pergola'
import { formatPrice } from '@/lib/pricing'
import { useTenant } from '@/tenants/TenantContext'
import { AnimatedPrice, PriceDeltaPop } from '@/components/PricePanel'
import { tr } from '@/i18n/locale'
import LiquidGlass from './LiquidGlass'

/**
 * Ársáv (M05, D4–D5): mindig látható, felül jobbra lebegő üvegelem a becsült bruttó árral és a változás
 * jelzésével; a „Részletek” alatta nyitja a tételes kalkulációt (nettó, szerelés, ÁFA, bruttó).
 */
export default function PriceBar({ price, compact, onRequest }: { price: PriceBreakdown; compact: boolean; /** „Ajánlatot kérek” (D6): az összegzés felmérési űrlapjához visz, bármelyik lépésből */ onRequest?: () => void }) {
  const { tenant } = useTenant()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', close) }
  }, [open])
  const months = tenant.installmentMonths

  return (
    <div className={`rb-price${compact ? ' is-compact' : ''}${open ? ' is-open' : ''}`} ref={root}>
      <LiquidGlass className="rb-price-pill" radius={22} bezel={12} strength={22}>
        <button type="button" className="rb-price-main" aria-expanded={open} aria-controls="rb-price-details" onClick={() => setOpen((value) => !value)}>
          <span className="rb-price-label">{tr('Becsült ár', 'Geschätzter Preis')}<small>{tr('bruttó, szereléssel', 'brutto, inkl. Montage')}</small></span>
          <strong data-value={price.totalGross}><AnimatedPrice value={price.totalGross} /></strong>
          <PriceDeltaPop value={price.totalGross} />
          <span className="rb-price-more">{tr('Részletek', 'Details')}<ChevronDown size={15} /></span>
        </button>
      </LiquidGlass>
      {onRequest && <button type="button" className="rb-price-request" onClick={onRequest}>{tr('Ajánlatot kérek', 'Angebot anfragen')}</button>}
      {open && <LiquidGlass className="rb-price-details" radius={22} bezel={12} strength={22}>
        <div id="rb-price-details" role="region" aria-label={tr('Tételes kalkuláció', 'Detaillierte Kalkulation')}>
          <header className="rb-price-details-head"><strong>{tr('Tételes kalkuláció', 'Detaillierte Kalkulation')}</strong><button type="button" aria-label={tr('Bezárás', 'Schließen')} onClick={() => setOpen(false)}><X size={16} /></button></header>
          <ul>
            {price.lines.map((line) => <li key={line.id}><span>{line.label}<small>{line.detail}</small></span><b>{formatPrice(line.amountNet)}</b></li>)}
            {price.installationNet > 0 && <li><span>{tr('Szerelés', 'Montage')}</span><b>{formatPrice(price.installationNet)}</b></li>}
          </ul>
          <dl>
            <div><dt>{tr('Nettó', 'Netto')}</dt><dd>{formatPrice(price.totalNet)}</dd></div>
            <div><dt>{tr('ÁFA', 'USt.')}</dt><dd>{formatPrice(price.vatNet)}</dd></div>
            <div className="is-total"><dt>{tr('Becsült bruttó ár', 'Geschätzter Bruttopreis')}</dt><dd>{formatPrice(price.totalGross)}</dd></div>
          </dl>
          {months > 0 && <p className="rb-price-monthly">{tr(`${months} havi részre bontva`, `Auf ${months} Monate verteilt`)} <b>{formatPrice(price.totalGross / months)} / {tr('hó', 'Monat')}</b><small>{tr('Az ár egyenlő részekre osztva; nem hitel- vagy finanszírozási ajánlat.', 'Preis in gleiche Teile geteilt; kein Kredit- oder Finanzierungsangebot.')}</small></p>}
          <p className="rb-price-note"><Info size={14} />{tr('Tájékoztató, becsült ár, nem ajánlattétel. A végleges ár helyszíni felmérést és műszaki jóváhagyást igényel.', 'Unverbindlicher Schätzpreis, kein Angebot. Der Endpreis erfordert ein Aufmaß vor Ort und eine technische Freigabe.')}</p>
        </div>
      </LiquidGlass>}
    </div>
  )
}
