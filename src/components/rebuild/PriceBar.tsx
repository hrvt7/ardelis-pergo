import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronUp, Info, X } from 'lucide-react'
import type { PriceBreakdown } from '@/types/pergola'
import { formatPrice } from '@/lib/pricing'
import { useTenant } from '@/tenants/TenantContext'
import { AnimatedPrice, PriceDeltaPop } from '@/components/PricePanel'
import { tr } from '@/i18n/locale'
import LiquidGlass from './LiquidGlass'

/**
 * Ársor (M05, D4–D6) a lépéskártya alján, a lépésgombok fölött (Polestar-minta: ár + gombok egy tömbben, nincs
 * külön lebegő ár-sziget a 3D fölött). Bal oldalt a becsült bruttó ár a változás jelzésével – rákoppintva a tételes
 * kalkuláció nyílik –, jobb oldalt az „Ajánlatot kérek” bármelyik lépésből.
 * A tételes kalkuláció a kártyán kívül, a jelenet fölött nyílik (a kártya üvegrétege nem vágja le).
 */
export default function PriceBar({ price, compact, onRequest }: { price: PriceBreakdown; compact: boolean; /** „Ajánlatot kérek” (D6): az összegzés űrlapjához visz */ onRequest?: () => void }) {
  const { tenant } = useTenant()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) { if (event.key === 'Escape') setOpen(false); return }
      const target = event.target as Node
      if (!root.current?.contains(target) && !sheet.current?.contains(target)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', close) }
  }, [open])
  const months = tenant.installmentMonths
  const vatFactor = price.totalNet > 0 ? price.totalGross / price.totalNet : 1
  // Bruttó tétel ezresre kerekítve, mint a végösszeg.
  const gross = (net: number) => Math.round((net * vatFactor) / 1000) * 1000

  const host = open ? document.querySelector('.rebuild-shell') ?? document.body : null
  const details = open && host ? createPortal(<div ref={sheet} className={`rb-price-sheet${compact ? ' is-compact' : ''}`}>
    <LiquidGlass className="rb-price-details" radius={24} bezel={12} strength={22}>
      <div id="rb-price-details" role="dialog" aria-label={tr('Tételes kalkuláció', 'Detaillierte Kalkulation')}>
        <header className="rb-price-details-head"><strong>{tr('Tételes kalkuláció', 'Detaillierte Kalkulation')}</strong><button type="button" aria-label={tr('Bezárás', 'Schließen')} onClick={() => setOpen(false)}><X size={16} /></button></header>
        <div className="rb-price-details-scroll">
          <p className="rb-price-basis">{tr('Bruttó tételek, ÁFA-val. A lépésekben látott felár ennél kicsit több: a szerelés arányos részét is tartalmazza.', 'Bruttopositionen inkl. USt. Die Aufpreise in den Schritten sind etwas höher: sie enthalten den anteiligen Montagepreis.')}</p>
          <ul>
            {price.lines.map((line) => <li key={line.id}><span>{line.label}<small>{line.detail}</small></span><b>{formatPrice(gross(line.amountNet))}</b></li>)}
            {price.installationNet > 0 && <li><span>{tr('Szerelés', 'Montage')}</span><b>{formatPrice(gross(price.installationNet))}</b></li>}
          </ul>
          {months > 0 && <p className="rb-price-monthly">{tr(`${months} havi részre bontva`, `Auf ${months} Monate verteilt`)} <b>{formatPrice(price.totalGross / months)} / {tr('hó', 'Monat')}</b><small>{tr('Az ár egyenlő részekre osztva; nem hitel- vagy finanszírozási ajánlat.', 'Preis in gleiche Teile geteilt; kein Kredit- oder Finanzierungsangebot.')}</small></p>}
        </div>
        {/* Az összeg és a fő gomb mindig látszik; csak a tételek görögnek. */}
        <dl className="rb-price-sum">
          <div className="is-total"><dt>{tr('Becsült bruttó ár', 'Geschätzter Bruttopreis')}</dt><dd>{formatPrice(price.totalGross)}</dd></div>
          <div><dt>{tr('ebből ÁFA', 'davon USt.')}</dt><dd>{formatPrice(price.vatNet)}</dd></div>
        </dl>
        {onRequest && <button type="button" className="rb-price-sheet-request" onClick={() => { setOpen(false); onRequest() }}>{tr('Ajánlatot kérek', 'Angebot anfragen')}</button>}
        <p className="rb-price-note"><Info size={14} />{tr('Tájékoztató, becsült ár, nem ajánlattétel. A végleges ár helyszíni felmérést és műszaki jóváhagyást igényel.', 'Unverbindlicher Schätzpreis, kein Angebot. Der Endpreis erfordert ein Aufmaß vor Ort und eine technische Freigabe.')}</p>
      </div>
    </LiquidGlass>
  </div>, host) : null

  return (
    <div className={`rb-price${compact ? ' is-compact' : ''}${open ? ' is-open' : ''}`} ref={root}>
      <button type="button" className="rb-price-main" aria-expanded={open} aria-controls="rb-price-details" onClick={() => setOpen((value) => !value)}>
        <span className="rb-price-label">{tr('Becsült ár, bruttó', 'Geschätzt, brutto')}</span>
        <strong data-value={price.totalGross}><AnimatedPrice value={price.totalGross} /><ChevronUp size={16} className="rb-price-chevron" aria-hidden="true" /></strong>
        <PriceDeltaPop value={price.totalGross} />
      </button>
      {/* Telefonon a sor szűk: ott az „Ajánlatot kérek” a kinyíló kalkuláció alján van; asztalon csendes szöveglink, a fő gomb a Tovább. */}
      {onRequest && !compact && <button type="button" className="rb-price-request" onClick={onRequest}>{tr('Ajánlatot kérek', 'Angebot anfragen')}</button>}
      {details}
    </div>
  )
}
