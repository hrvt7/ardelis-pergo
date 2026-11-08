import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, Info, Link2, LoaderCircle, Settings2, TrendingDown, TrendingUp } from 'lucide-react'
import { formatHuf } from '@/lib/pricing'
import { AnimatedPrice, PriceDeltaPop } from '@/components/PricePanel'
import type { PriceBreakdown } from '@/types/pergola'

interface Props {
  /** A termék fejléce: kivitel (szemöldök), méret (cím), mérőszám (alcím). */
  heading: { eyebrow: string; title: string; measure: string }
  price: PriceBreakdown
  exporting: boolean
  delta: { amount: number; label: string } | null
  onEditPrices?: () => void
  onExport: () => void
  onShare: () => void
  /** Összecsukható, mint a pergola árpanelje: összecsukva csak a bruttó irányár látszik a sarokban. */
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function CatalogPricePanel({ heading, price, exporting, delta, onEditPrices, onExport, onShare, collapsed = false, onToggleCollapse }: Props) {
  const [mode, setMode] = useState<'net' | 'vat' | 'gross'>('gross')
  const amount = mode === 'gross' ? price.totalGross : mode === 'net' ? price.totalNet : price.vatNet
  if (collapsed) return <aside className="price-panel glass-panel is-collapsed" aria-label="Árkalkuláció (összecsukva)">
    <button type="button" className="price-expand" onClick={onToggleCollapse} aria-expanded="false" title="Árkalkuláció megnyitása"><ChevronLeft size={16} /><span><small>Bruttó irányár</small><strong data-value={price.totalGross}><AnimatedPrice value={price.totalGross} /></strong></span></button>
  </aside>
  return <aside className="price-panel glass-panel compact" aria-label="Árkalkuláció">
    <div className="price-topline"><span>Azonnali kalkuláció</span><span className="live-indicator"><i />ÉLŐ</span>{onToggleCollapse && <button type="button" className="price-collapse" onClick={onToggleCollapse} aria-expanded="true" aria-label="Árkalkuláció összecsukása" title="Összecsukás — szabad kilátás a 3D-re"><ChevronRight size={15} /></button>}</div>
    <div className="price-product"><span>{heading.eyebrow}</span><strong>{heading.title}</strong><small>{heading.measure}</small></div>
    <div className="price-mode" aria-label="Ár megjelenítése">{(['net', 'vat', 'gross'] as const).map((id) => <button type="button" key={id} className={mode === id ? 'selected' : ''} onClick={() => setMode(id)}>{id === 'net' ? 'Nettó' : id === 'vat' ? 'ÁFA' : 'Bruttó'}</button>)}</div>
    <div className="total-price"><span>{mode === 'gross' ? 'Bruttó irányár' : mode === 'net' ? 'Nettó irányár' : 'ÁFA összege'}</span><strong data-value={amount}><AnimatedPrice value={amount} /></strong><PriceDeltaPop value={amount} /><small>Telepítési mintatétellel · nem ajánlattétel</small></div>
    {delta && delta.amount !== 0 && <div className={`price-delta ${delta.amount < 0 ? 'negative' : ''}`} role="status">{delta.amount > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}<span>Árváltozás</span><strong>{delta.amount > 0 ? '+' : '−'}{formatHuf(Math.abs(delta.amount))}</strong><small>{delta.label}</small></div>}
    <details className="price-details"><summary><span>Tételes kalkuláció <small>{price.lines.length + 1} tétel</small></span><ChevronDown size={16} /></summary><div className="price-lines">{price.lines.map((line) => <div key={line.id} className="price-line"><div><strong>{line.label}</strong><small>{line.detail}</small></div><span>{formatHuf(line.amountNet)}</span></div>)}<div className="price-line installation"><div><strong>Telepítési mintatétel</strong><small>Felmérés után pontosítandó</small></div><span>{formatHuf(price.installationNet)}</span></div><div className="price-line installation"><div><strong>Nettó + ÁFA</strong><small>{formatHuf(price.totalNet)} + {formatHuf(price.vatNet)}</small></div><span>{formatHuf(price.totalGross)}</span></div></div></details>
    <div className="price-actions"><button type="button" className="primary-action" onClick={onExport} disabled={exporting}>{exporting ? <LoaderCircle size={17} className="spin" /> : <Download size={17} />}{exporting ? 'PDF készül…' : 'PDF összefoglaló'}</button><button type="button" className="secondary-action" onClick={onShare}><Link2 size={17} />Megosztás</button></div>
    {onEditPrices && <button type="button" className="tariff-button" onClick={onEditPrices}><Settings2 size={15} />Mintaárak szerkesztése</button>}
    <div className="price-disclaimer"><Info size={15} /><p>Tájékoztató irányár. Statika, alapozás, villamos munka és végleges műszaki tartalom felmérést igényel.</p></div>
  </aside>
}
