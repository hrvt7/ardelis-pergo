import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, Gauge, Info, Link2, LoaderCircle, Settings2, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { MOUNT_SHORT } from '@/lib/mount'
import { formatHuf, formatNumber } from '@/lib/pricing'
import { useTenant } from '@/tenants/TenantContext'
import type { PergolaConfig, PriceBreakdown } from '@/types/pergola'

interface Props {
  config: PergolaConfig
  price: PriceBreakdown
  exporting: boolean
  delta?: { amount: number; label: string } | null
  compact?: boolean
  /** Csak admin (bemutató) módban adható meg; ilyenkor jelenik meg az árszerkesztő gomb. */
  onEditPrices?: () => void
  onExport: () => void
  onShare: () => void
  /** Költségkeret-varázsló megnyitása. */
  onBudget?: () => void
  /** Asztali nézetben összecsukható, hogy ne takarja a 3D képet. */
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** Becsült éves üzemeltetési (áram)költség; null, ha nincs fogyasztó. */
  energyCost?: number | null
  onEnergy?: () => void
}

function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const previous = useRef(value)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const from = previous.current
    previous.current = value
    if (reduced) return
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 420)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, reduced])
  return <>{formatHuf(reduced ? value : display)}</>
}

export default function PricePanel({ config, price, exporting, delta, compact = false, onEditPrices, onExport, onShare, onBudget, collapsed = false, onToggleCollapse, energyCost, onEnergy }: Props) {
  const { tenant, labels: ROOF_LABELS } = useTenant()
  const [mode, setMode] = useState<'net' | 'vat' | 'gross'>('gross')
  const amount = mode === 'gross' ? price.totalGross : mode === 'net' ? price.totalNet : price.vatNet
  const label = mode === 'gross' ? 'Bruttó irányár' : mode === 'net' ? 'Nettó irányár' : 'ÁFA összege'
  if (collapsed) return (
    <aside className="price-panel glass-panel is-collapsed" aria-label="Árkalkuláció (összecsukva)">
      <button type="button" className="price-expand" onClick={onToggleCollapse} aria-expanded="false" title="Árkalkuláció megnyitása">
        <ChevronLeft size={16} />
        <span><small>Bruttó irányár</small><strong data-value={price.totalGross}><AnimatedPrice value={price.totalGross} /></strong></span>
      </button>
    </aside>
  )
  return (
    <aside className={`price-panel glass-panel ${compact ? 'compact' : ''}`} aria-label="Árkalkuláció">
      <div className="price-topline"><span>Azonnali kalkuláció</span><span className="live-indicator"><i />ÉLŐ</span>{onToggleCollapse && <button type="button" className="price-collapse" onClick={onToggleCollapse} aria-expanded="true" aria-label="Árkalkuláció összecsukása" title="Összecsukás — szabad kilátás a 3D-re"><ChevronRight size={15} /></button>}</div>
      <div className="price-product"><span>{ROOF_LABELS[config.roof].split(' · ')[0]} / {MOUNT_SHORT[config.mount]}</span><strong>{config.width.toFixed(2).replace('.', ',')} × {config.depth.toFixed(2).replace('.', ',')} m</strong><small>{formatNumber(price.area)} m² · {formatHuf(price.totalGross / price.area)} / m²</small></div>
      <div className="price-mode" aria-label="Ár megjelenítése">{(['net', 'vat', 'gross'] as const).map((id) => <button type="button" key={id} className={mode === id ? 'selected' : ''} onClick={() => setMode(id)}>{id === 'net' ? 'Nettó' : id === 'vat' ? 'ÁFA' : 'Bruttó'}</button>)}</div>
      <div className="total-price"><span>{label}</span><strong data-value={amount}><AnimatedPrice value={amount} /></strong><small>Telepítéssel · {price.totalNet > 0 ? Math.round(price.vatNet / price.totalNet * 100) : 0}% ÁFA</small></div>
      {delta && delta.amount !== 0 && <div className={`price-delta ${delta.amount < 0 ? 'negative' : ''}`} role="status">{delta.amount > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}<span>Mi változott?</span><strong>{delta.amount > 0 ? '+' : '−'}{formatHuf(Math.abs(delta.amount))}</strong><small>{delta.label}</small></div>}
      {tenant.installmentMonths > 0 && <div className="monthly-example"><span>{tenant.installmentMonths} havi részre bontva</span><strong>{formatHuf(price.totalGross / tenant.installmentMonths)} / hó</strong><small>A bruttó irányár {tenant.installmentMonths} egyenlő részre osztva; nem hitel- vagy finanszírozási ajánlat.</small></div>}
      {onBudget && <button type="button" className="budget-trigger" onClick={onBudget}><Wallet size={15} /><span><strong>Van keretösszeged?</strong><small>Megmutatjuk, mi fér bele</small></span></button>}
      {onEnergy && energyCost ? <button type="button" className="energy-trigger is-panel" onClick={onEnergy}><Gauge size={15} /><span><strong>Üzemeltetés ≈ {formatHuf(energyCost)} / év</strong><small>Áramköltség valós tarifával · részletek</small></span><ChevronRight size={14} /></button> : null}
      <details className="price-details"><summary><span>Tételes kalkuláció <small>{price.lines.length + 1} tétel</small></span><ChevronDown size={16} /></summary><div className="price-lines">{price.lines.map((line) => <div key={line.id} className="price-line"><div><strong>{line.label}</strong><small>{line.detail}</small></div><span>{formatHuf(line.amountNet)}</span></div>)}<div className="price-line installation"><div><strong>Telepítés és üzembe helyezés</strong><small>{tenant.demo ? 'Mintaarány a teljes nettó összegre' : `${price.subtotalNet ? Math.round(price.installationNet / price.subtotalNet * 100) : 0}% a teljes nettó összegre`}</small></div><span>{formatHuf(price.installationNet)}</span></div><div className="price-line installation"><div><strong>Nettó + ÁFA</strong><small>{formatHuf(price.totalNet)} + {formatHuf(price.vatNet)}</small></div><span>{formatHuf(price.totalGross)}</span></div></div></details>
      <div className="price-actions"><button type="button" className="primary-action" onClick={onExport} disabled={exporting}>{exporting ? <LoaderCircle size={17} className="spin" /> : <Download size={17} />}{exporting ? 'PDF készül…' : 'PDF összefoglaló'}</button><button type="button" className="secondary-action" onClick={onShare}><Link2 size={17} />Megosztás</button></div>
      {onEditPrices && <button type="button" className="tariff-button" onClick={onEditPrices}><Settings2 size={15} />{tenant.demo ? 'Mintaárak szerkesztése' : 'Árak szerkesztése (admin)'}</button>}
      <div className="price-disclaimer"><Info size={15} /><p>Tájékoztató irányár, nem ajánlattétel. A végleges ár helyszíni felmérést és műszaki jóváhagyást igényel.</p></div>
    </aside>
  )
}
