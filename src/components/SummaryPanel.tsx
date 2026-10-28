import { useState } from 'react'
import { ArrowRight, Camera, Check, Clipboard, Clock3, Code2, GitCompareArrows, PackageCheck, Save } from 'lucide-react'
import LeadForm from '@/components/LeadForm'
import { copyShareUrl } from '@/lib/exportPdf'
import { isWallSide, MOUNT_LABELS } from '@/lib/mount'
import { calculatePrice, formatHuf, formatNumber } from '@/lib/pricing'
import { useTenant } from '@/tenants/TenantContext'
import { createTextSummary, getBom, getDeliveryEstimate, getSpecCode } from '@/lib/specification'
import type { PergolaConfig, PriceBreakdown, PriceSettings, SavedConfiguration } from '@/types/pergola'

interface Props {
  config: PergolaConfig
  price: PriceBreakdown
  prices: PriceSettings
  saved: SavedConfiguration[]
  onSave: (slot: 'A' | 'B') => void
  onLoad: (config: PergolaConfig) => void
  onNotify: (message: string) => void
}

export default function SummaryPanel({ config, price, prices, saved, onSave, onLoad, onNotify }: Props) {
  const { tenant, labels: ROOF_LABELS } = useTenant()
  const [thumbnail, setThumbnail] = useState('')
  const bom = getBom(config)
  const capture = () => {
    try {
      const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-pergola-canvas="true"]')
      if (!canvas) throw new Error('no canvas')
      setThumbnail(canvas.toDataURL('image/jpeg', 0.78))
    } catch { onNotify('A 3D bélyegkép most nem készíthető el.') }
  }
  const copy = async () => {
    try { await copyShareUrl(createTextSummary(config, price, ROOF_LABELS, tenant.brand.name)); onNotify('Az összefoglaló a vágólapra másolva.') }
    catch { onNotify('A másolás nem sikerült ebben a böngészőben.') }
  }
  return (
    <div className="summary-panel">
      <section className="summary-hero">
        <div className="summary-thumbnail">{thumbnail ? <img src={thumbnail} alt="A konfigurált pergola 3D bélyegképe" /> : <div className="thumbnail-placeholder"><Camera size={26} /><span>3D bélyegkép</span></div>}<button type="button" onClick={capture}><Camera size={14} />{thumbnail ? 'Frissítés' : 'Bélyegkép készítése'}</button></div>
        <div><span>{ROOF_LABELS[config.roof]}</span><h3>{formatNumber(config.width, 2)} × {formatNumber(config.depth, 2)} m</h3><p>{formatNumber(price.area)} m² · {MOUNT_LABELS[config.mount]} · {config.heaters} db fűtés</p><strong>{formatHuf(price.totalGross)}</strong><small>bruttó irányár, telepítéssel</small></div>
      </section>
      <div className="summary-actions"><button type="button" onClick={copy}><Clipboard size={15} />Összefoglaló másolása</button><button type="button" onClick={() => onSave('A')}><Save size={15} />Mentés A</button><button type="button" onClick={() => onSave('B')}><Save size={15} />Mentés B</button></div>

      <section className="summary-section"><div className="summary-section-title"><Code2 size={17} /><h3>Specifikáció</h3></div><div className="spec-code"><span>Konfigurációs kód</span><strong>{getSpecCode(config)}</strong></div><dl className="bom-list">{bom.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{line.value}</dd></div>)}</dl><div className="delivery-estimate"><Clock3 size={18} /><span><strong>Tájékoztató átfutási idő</strong>{getDeliveryEstimate(config)}</span></div></section>

      <section className="summary-section"><div className="summary-section-title"><GitCompareArrows size={17} /><h3>Két konfiguráció összehasonlítása</h3></div>{saved.length < 2 ? <p className="empty-copy">Ments el két változatot az A és B mentési helyre. A két konfiguráció itt jelenik meg egymás mellett.</p> : <div className="comparison-grid">{saved.slice(0, 2).map((item, index) => { const savedPrice = calculatePrice(item.config, prices, ROOF_LABELS); return <div key={item.id}><span>Konfiguráció {index === 0 ? 'A' : 'B'}</span><strong>{formatNumber(item.config.width)} × {formatNumber(item.config.depth)} m</strong><small>{ROOF_LABELS[item.config.roof]}<br />{formatNumber(savedPrice.area)} m² · {(['front', 'back', 'left', 'right'] as const).filter((side) => item.config.sides[side] !== 'none' && !isWallSide(item.config.mount, side)).length} zárt oldal</small><b>{formatHuf(savedPrice.totalGross)}</b><button type="button" onClick={() => onLoad(item.config)}>Betöltés<ArrowRight size={13} /></button></div>})}</div>}</section>

      <section className="summary-section lead-section"><div className="summary-section-title"><PackageCheck size={17} /><h3>Kérj helyszíni felmérést</h3></div><LeadForm productFamily="pergola" config={config} estimateNet={price.totalNet} estimateGross={price.totalGross} /></section>
      <div className="summary-footnote"><Check size={14} />A piszkozat ebben a böngészőben marad; az elküldött felmérési kérelmet a csatolt konfigurációval együtt közvetlenül {tenant.brand.name} kapja meg.</div>
    </div>
  )
}
