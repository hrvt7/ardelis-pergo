import type { ReactNode } from 'react'
import { ChevronRight, Wallet } from 'lucide-react'
import type { ConfigStep, PergolaConfig, PriceBreakdown } from '@/types/pergola'
import { summaryRows } from '@/lib/rebuildSummary'
import { useTenant } from '@/tenants/TenantContext'
import { tr } from '@/i18n/locale'
import StepIcon from './StepIcons'
import { usePriceDisplay } from './usePriceDisplay'

/** 7. lépés – Összegzés: mit választottál (lépésenként módosítható), becsült ár, és a meglévő összegző panel (felmérési űrlap, megosztás, változatok). */
export default function SummaryStep({ config, price, onStep, onBudget, children }: { config: PergolaConfig; price: PriceBreakdown; onStep: (step: ConfigStep) => void; /** Költségkeret-tervező (M17) */ onBudget?: () => void; children: ReactNode }) {
  const { mode: priceMode, prices: showPrices, total: priceText } = usePriceDisplay()
  const { tenant } = useTenant()
  return <div className="rb-step rb-step-summary">
    <section className="rb-section">
      <h3>{tr('A terved', 'Ihr Entwurf')}</h3>
      <ul className="rb-summary">
        {summaryRows(config, tenant).map((row) => <li key={row.step}>
          <button type="button" onClick={() => onStep(row.step)} aria-label={`${row.title}: ${row.value} – ${tr('módosítás', 'ändern')}`}>
            <span className="rb-summary-icon"><StepIcon step={row.step} size={18} /></span>
            <span className="rb-summary-text"><small>{row.title}</small><strong>{row.value}</strong></span>
            <span className="rb-summary-edit">{tr('Módosítás', 'Ändern')}<ChevronRight size={14} /></span>
          </button>
        </li>)}
      </ul>
      {showPrices && <div className="rb-summary-total"><span>{priceMode === 'from' ? tr('Irányár, bruttó', 'Richtpreis, brutto') : tr('Becsült bruttó ár', 'Geschätzter Bruttopreis')}<small>{tr('szereléssel, ÁFA-val', 'inkl. Montage und USt.')}</small></span><strong>{priceText(price.totalGross)}</strong></div>}
      {onBudget && showPrices && <button type="button" className="rb-helper is-flat" onClick={onBudget}>
        <span className="rb-helper-icon"><Wallet size={17} strokeWidth={1.7} /></span>
        <span className="rb-helper-text"><strong>{tr('Keretösszeghez igazítanád?', 'An ein Budget anpassen?')}</strong><small>{tr('Költségkeret-tervező: mi fér bele, és mit érdemes cserélni', 'Budgetplaner: was hineinpasst und was sich zu tauschen lohnt')}</small></span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>}
    </section>
    <section className="rb-section rb-legacy rb-summary-legacy">{children}</section>
  </div>
}
