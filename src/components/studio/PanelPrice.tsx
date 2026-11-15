import { ChevronUp } from 'lucide-react'
import { AnimatedPrice, PriceDeltaPop } from '@/components/PricePanel'

/**
 * A beállítópanel alján ülő élő ár (asztali nézet): egy fő szám, a részletes kalkuláció (nettó/ÁFA, tételek,
 * havi bontás, üzemeltetés, PDF, megosztás) a „Részletek” gombra nyílik.
 */
export default function PanelPrice({ gross, detailsOpen, onToggleDetails }: { gross: number; detailsOpen: boolean; onToggleDetails: () => void }) {
  return <div className="panel-price">
    <div className="panel-price-value">
      <span>Bruttó irányár</span>
      <strong data-value={gross}><AnimatedPrice value={gross} /></strong>
      <PriceDeltaPop value={gross} />
    </div>
    <button type="button" className={`panel-price-details${detailsOpen ? ' is-open' : ''}`} aria-expanded={detailsOpen} aria-controls="price-details-panel" onClick={onToggleDetails}>
      Részletek<ChevronUp size={15} aria-hidden="true" />
    </button>
  </div>
}
