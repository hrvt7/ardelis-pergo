import { useState } from 'react'
import { ChevronDown, Download, Info, Link2, LoaderCircle, Settings2, TrendingDown, TrendingUp } from 'lucide-react'
import { FAMILY_META } from '@/lib/catalog'
import { formatHuf, formatNumber } from '@/lib/pricing'
import type { OutdoorConfig } from '@/types/catalog'
import type { PriceBreakdown } from '@/types/pergola'

interface Props {
  config: OutdoorConfig
  price: PriceBreakdown
  exporting: boolean
  delta: { amount: number; label: string } | null
  onEditPrices: () => void
  onExport: () => void
  onShare: () => void
}

export default function CatalogPricePanel({ config, price, exporting, delta, onEditPrices, onExport, onShare }: Props) {
  const [mode, setMode] = useState<'net' | 'vat' | 'gross'>('gross')
  const amount = mode === 'gross' ? price.totalGross : mode === 'net' ? price.totalNet : price.vatNet
  const roof = config.family === 'canopy' || config.family === 'carport'
  const measure = roof ? `${formatNumber(price.area)} m²` : `${formatNumber(config.length)} fm`
  return <aside className="price-panel glass-panel compact" aria-label="Árkalkuláció">
    <div className="price-topline"><span>Azonnali kalkuláció</span><span className="live-indicator"><i />ÉLŐ</span></div>
    <div className="price-product"><span>{FAMILY_META[config.family].series}</span><strong>{roof ? `${formatNumber(config.width * (config.family === 'carport' ? config.bays : 1))} × ${formatNumber(config.depth)} m` : `${formatNumber(config.height)} m magas rendszer`}</strong><small>{measure} · paraméteres modell</small></div>
    <div className="price-mode" aria-label="Ár megjelenítése">{(['net', 'vat', 'gross'] as const).map((id) => <button type="button" key={id} className={mode === id ? 'selected' : ''} onClick={() => setMode(id)}>{id === 'net' ? 'Nettó' : id === 'vat' ? 'ÁFA' : 'Bruttó'}</button>)}</div>
    <div className="total-price"><span>{mode === 'gross' ? 'Bruttó irányár' : mode === 'net' ? 'Nettó irányár' : 'ÁFA összege'}</span><strong>{formatHuf(amount)}</strong><small>Telepítési mintatétellel · nem ajánlattétel</small></div>
    {delta && delta.amount !== 0 && <div className={`price-delta ${delta.amount < 0 ? 'negative' : ''}`} role="status">{delta.amount > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}<span>Árváltozás</span><strong>{delta.amount > 0 ? '+' : '−'}{formatHuf(Math.abs(delta.amount))}</strong><small>{delta.label}</small></div>}
    <details className="price-details"><summary><span>Tételes kalkuláció <small>{price.lines.length + 1} tétel</small></span><ChevronDown size={16} /></summary><div className="price-lines">{price.lines.map((line) => <div key={line.id} className="price-line"><div><strong>{line.label}</strong><small>{line.detail}</small></div><span>{formatHuf(line.amountNet)}</span></div>)}<div className="price-line installation"><div><strong>Telepítési mintatétel</strong><small>Felmérés után pontosítandó</small></div><span>{formatHuf(price.installationNet)}</span></div><div className="price-line installation"><div><strong>Nettó + ÁFA</strong><small>{formatHuf(price.totalNet)} + {formatHuf(price.vatNet)}</small></div><span>{formatHuf(price.totalGross)}</span></div></div></details>
    <div className="price-actions"><button type="button" className="primary-action" onClick={onExport} disabled={exporting}>{exporting ? <LoaderCircle size={17} className="spin" /> : <Download size={17} />}{exporting ? 'PDF készül…' : 'PDF összefoglaló'}</button><button type="button" className="secondary-action" onClick={onShare}><Link2 size={17} />Megosztás</button></div>
    <button type="button" className="tariff-button" onClick={onEditPrices}><Settings2 size={15} />Mintaárak szerkesztése</button>
    <div className="price-disclaimer"><Info size={15} /><p>Tájékoztató irányár. Statika, alapozás, villamos munka és végleges műszaki tartalom felmérést igényel.</p></div>
  </aside>
}
