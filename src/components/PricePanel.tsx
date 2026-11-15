import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, Gauge, Info, Link2, LoaderCircle, Settings2, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { MOUNT_SHORT } from '@/lib/mount'
import PriceMix from '@/components/PriceMix'
import { formatPrice, formatNumber } from '@/lib/pricing'
import { useTenant } from '@/tenants/TenantContext'
import type { PergolaConfig, PriceBreakdown } from '@/types/pergola'
import { tr } from '../i18n/locale'

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

/** Az ár „pörögve” megy az új értékre (mozgáscsökkentésnél azonnal). */
export function AnimatedPrice({ value, startAt, duration = 420 }: { value: number; startAt?: number; duration?: number }) {
  const [display, setDisplay] = useState(startAt ?? value)
  const previous = useRef(startAt ?? value)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const from = previous.current
    previous.current = value
    if (reduced) return
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, reduced, duration])
  return <>{formatPrice(reduced ? value : display)}</>
}

/** Ármódosításkor 1,8 mp-re felbukkanó „+120 000 Ft” / „−40 000 Ft” jelzés az összeg mellett. */
export function PriceDeltaPop({ value }: { value: number }) {
  const previous = useRef(value)
  const [pop, setPop] = useState<{ amount: number; id: number } | null>(null)
  useEffect(() => {
    const diff = Math.round(value - previous.current)
    previous.current = value
    if (Math.abs(diff) < 1000) return
    setPop((old) => ({ amount: diff, id: (old?.id ?? 0) + 1 }))
    const timer = window.setTimeout(() => setPop(null), 1900)
    return () => window.clearTimeout(timer)
  }, [value])
  if (!pop) return null
  return <span key={pop.id} className={`delta-pop ${pop.amount < 0 ? 'negative' : ''}`} aria-hidden="true">{pop.amount > 0 ? '+' : '−'}{formatPrice(Math.abs(pop.amount))}</span>
}

/** Új vagy megváltozott ártételek rövid kiemelése: látszik, mi tette drágábbá/olcsóbbá a tervet. */
function useLineFlash(lines: PriceBreakdown['lines']) {
  const prev = useRef<Map<string, number> | null>(null)
  const [flash, setFlash] = useState<{ ids: Record<string, 'new' | 'chg'>; added: number; key: number }>({ ids: {}, added: 0, key: 0 })
  const signature = lines.map((line) => `${line.id}:${line.amountNet}`).join('|')
  useEffect(() => {
    const current = new Map(lines.map((line) => [line.id, line.amountNet] as const))
    const before = prev.current
    prev.current = current
    if (!before) return
    const ids: Record<string, 'new' | 'chg'> = {}
    let added = 0
    current.forEach((amount, id) => {
      if (!before.has(id)) { ids[id] = 'new'; added += 1 }
      else if (before.get(id) !== amount) ids[id] = 'chg'
    })
    if (!Object.keys(ids).length) return
    setFlash((old) => ({ ids, added, key: old.key + 1 }))
    const timer = window.setTimeout(() => setFlash((old) => ({ ...old, ids: {}, added: 0 })), 2600)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])
  return flash
}

export default function PricePanel({ config, price, exporting, delta, compact = false, onEditPrices, onExport, onShare, onBudget, collapsed = false, onToggleCollapse, energyCost, onEnergy }: Props) {
  const { tenant, labels: ROOF_LABELS } = useTenant()
  const [mode, setMode] = useState<'net' | 'vat' | 'gross'>('gross')
  const flash = useLineFlash(price.lines)
  const amount = mode === 'gross' ? price.totalGross : mode === 'net' ? price.totalNet : price.vatNet
  const label = mode === 'gross' ? tr('Bruttó irányár', 'Richtpreis brutto') : mode === 'net' ? tr('Nettó irányár', 'Richtpreis netto') : tr('ÁFA összege', 'USt.-Betrag')
  if (collapsed) return (
    <aside className="price-panel glass-panel is-collapsed" aria-label={tr('Árkalkuláció (összecsukva)', 'Preiskalkulation (eingeklappt)')}>
      <button type="button" className="price-expand" onClick={onToggleCollapse} aria-expanded="false" title={tr('Árkalkuláció megnyitása', 'Preiskalkulation öffnen')}>
        <ChevronLeft size={16} />
        <span><small>{tr('Bruttó irányár', 'Richtpreis brutto')}</small><strong data-value={price.totalGross}><AnimatedPrice value={price.totalGross} /></strong></span>
      </button>
    </aside>
  )
  return (
    <aside id="price-details-panel" className={`price-panel glass-panel ${compact ? 'compact' : ''}`} aria-label={tr('Árkalkuláció', 'Preiskalkulation')}>
      <div className="price-topline"><span>{tr('Azonnali kalkuláció', 'Sofortkalkulation')}</span><span className="live-indicator"><i />{tr('ÉLŐ', 'LIVE')}</span>{onToggleCollapse && <button type="button" className="price-collapse" onClick={onToggleCollapse} aria-expanded="true" aria-label={tr('Árkalkuláció összecsukása', 'Preiskalkulation einklappen')} title={tr('Összecsukás — szabad kilátás a 3D-re', 'Einklappen — freie Sicht auf die 3D-Ansicht')}><ChevronRight size={15} /></button>}</div>
      <div className="price-product"><span>{ROOF_LABELS[config.roof].split(' · ')[0]} / {MOUNT_SHORT[config.mount]}</span><strong>{config.width.toFixed(2).replace('.', ',')} × {config.depth.toFixed(2).replace('.', ',')} m</strong><small>{formatNumber(price.area)} m² · {formatPrice(price.totalGross / price.area)} / m²</small></div>
      <div className="price-mode" aria-label={tr('Ár megjelenítése', 'Preis anzeigen')}>{(['net', 'vat', 'gross'] as const).map((id) => <button type="button" key={id} className={mode === id ? 'selected' : ''} onClick={() => setMode(id)}>{id === 'net' ? tr('Nettó', 'Netto') : id === 'vat' ? tr('ÁFA', 'USt.') : tr('Bruttó', 'Brutto')}</button>)}</div>
      <div className="total-price"><span>{label}</span><strong data-value={amount}><AnimatedPrice value={amount} /></strong><PriceDeltaPop value={amount} /><small>Telepítéssel · {price.totalNet > 0 ? Math.round(price.vatNet / price.totalNet * 100) : 0}% ÁFA</small></div>
      {delta && delta.amount !== 0 && <div className={`price-delta ${delta.amount < 0 ? 'negative' : ''}`} role="status">{delta.amount > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}<span>{tr('Mi változott?', 'Was hat sich geändert?')}</span><strong>{delta.amount > 0 ? '+' : '−'}{formatPrice(Math.abs(delta.amount))}</strong><small>{delta.label}</small></div>}
      {tenant.installmentMonths > 0 && <div className="monthly-example"><span>{tenant.installmentMonths} havi részre bontva</span><strong>{formatPrice(price.totalGross / tenant.installmentMonths)} / hó</strong><small>A bruttó irányár {tenant.installmentMonths} egyenlő részre osztva; nem hitel- vagy finanszírozási ajánlat.</small></div>}
      {onBudget && <button type="button" className="budget-trigger" onClick={onBudget}><Wallet size={15} /><span><strong>{tr('Van keretösszeged?', 'Haben Sie ein Budget?')}</strong><small>{tr('Megmutatjuk, mi fér bele', 'Wir zeigen, was hineinpasst')}</small></span></button>}
      {onEnergy && energyCost ? <button type="button" className="energy-trigger is-panel" onClick={onEnergy}><Gauge size={15} /><span><strong>Üzemeltetés ≈ {formatPrice(energyCost)} / év</strong><small>{tr('Áramköltség valós tarifával · részletek', 'Stromkosten mit realem Tarif · Details')}</small></span><ChevronRight size={14} /></button> : null}
      <PriceMix price={price} compact />
      <details className="price-details"><summary className={flash.added > 0 ? 'has-new' : undefined}><span>{tr('Tételes kalkuláció', 'Detaillierte Kalkulation')} <small>{price.lines.length + 1} tétel</small>{flash.added > 0 && <em key={flash.key} className="lines-added">+{flash.added} új tétel</em>}</span><ChevronDown size={16} /></summary><div className="price-lines">{price.lines.map((line) => <div key={line.id} className={`price-line${flash.ids[line.id] ? ` is-${flash.ids[line.id]}` : ''}`}><div><strong>{line.label}</strong><small>{line.detail}</small></div><span>{formatPrice(line.amountNet)}</span></div>)}<div className="price-line installation"><div><strong>{tr('Telepítés és üzembe helyezés', 'Montage und Inbetriebnahme')}</strong><small>{tenant.demo ? tr('Mintaarány a teljes nettó összegre', 'Musteranteil an der gesamten Nettosumme') : tr(`${price.subtotalNet ? Math.round(price.installationNet / price.subtotalNet * 100) : 0}% a teljes nettó összegre`, `${price.subtotalNet ? Math.round(price.installationNet / price.subtotalNet * 100) : 0}% der gesamten Nettosumme`)}</small></div><span>{formatPrice(price.installationNet)}</span></div><div className="price-line installation"><div><strong>{tr('Nettó + ÁFA', 'Netto + USt.')}</strong><small>{formatPrice(price.totalNet)} + {formatPrice(price.vatNet)}</small></div><span>{formatPrice(price.totalGross)}</span></div></div></details>
      <div className="price-actions"><button type="button" className="primary-action" onClick={onExport} disabled={exporting}>{exporting ? <LoaderCircle size={17} className="spin" /> : <Download size={17} />}{exporting ? tr('PDF készül…', 'PDF wird erstellt…') : tr('PDF összefoglaló', 'PDF-Zusammenfassung')}</button><button type="button" className="secondary-action" onClick={onShare}><Link2 size={17} />{tr('Megosztás', 'Teilen')}</button></div>
      {onEditPrices && <button type="button" className="tariff-button" onClick={onEditPrices}><Settings2 size={15} />{tenant.demo ? tr('Mintaárak szerkesztése', 'Musterpreise bearbeiten') : tr('Árak szerkesztése (admin)', 'Preise bearbeiten (Admin)')}</button>}
      <div className="price-disclaimer"><Info size={15} /><p>{tr('Tájékoztató irányár, nem ajánlattétel. A végleges ár helyszíni felmérést és műszaki jóváhagyást igényel.', 'Unverbindlicher Richtpreis, kein Angebot. Der Endpreis erfordert ein Aufmaß vor Ort und eine technische Freigabe.')}</p></div>
    </aside>
  )
}
