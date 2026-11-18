import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ConfigStep, PergolaConfig, PriceBreakdown } from '@/types/pergola'
import { summaryRows } from '@/lib/rebuildSummary'
import { formatPrice } from '@/lib/pricing'
import { useTenant } from '@/tenants/TenantContext'
import { tr } from '@/i18n/locale'
import StepIcon from './StepIcons'

/** 7. lépés – Összegzés: mit választottál (lépésenként módosítható), becsült ár, és a meglévő összegző panel (felmérési űrlap, megosztás, változatok). */
export default function SummaryStep({ config, price, onStep, children }: { config: PergolaConfig; price: PriceBreakdown; onStep: (step: ConfigStep) => void; children: ReactNode }) {
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
      <div className="rb-summary-total"><span>{tr('Becsült bruttó ár', 'Geschätzter Bruttopreis')}<small>{tr('szereléssel, ÁFA-val', 'inkl. Montage und USt.')}</small></span><strong>{formatPrice(price.totalGross)}</strong></div>
    </section>
    <section className="rb-section rb-legacy rb-summary-legacy">{children}</section>
  </div>
}
