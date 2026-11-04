import { useEffect, useState } from 'react'
import { getAdvice } from '@/lib/advice'
import { FileDown, MessageCircle, ArrowRight, Camera, Check, ChevronRight, Clipboard, Clock3, Code2, Gauge, GitCompareArrows, LoaderCircle, PackageCheck, PencilLine, Save, Share2, Wallet } from 'lucide-react'
import PriceMix from '@/components/PriceMix'
import { captureScene, renderShareCard, shareOrDownload } from '@/lib/showcase'
import { colorSummary } from '@/lib/colors'
import LeadForm from '@/components/LeadForm'
import { copyShareUrl } from '@/lib/exportPdf'
import { MOUNT_LABELS } from '@/lib/mount'
import { sideSegments } from '@/lib/sides'
import { calculatePrice, formatHuf, formatNumber } from '@/lib/pricing'
import { useTenant } from '@/tenants/TenantContext'
import { createTextSummary, getBom, getDeliveryEstimate, getSpecCode } from '@/lib/specification'
import type { PergolaConfig, PriceBreakdown, PriceSettings, SavedConfiguration } from '@/types/pergola'

interface Props {
  onBudget?: () => void
  energyCost?: number | null
  onEnergy?: () => void
  config: PergolaConfig
  price: PriceBreakdown
  prices: PriceSettings
  saved: SavedConfiguration[]
  onSave: (slot: 'A' | 'B') => void
  onLoad: (config: PergolaConfig) => void
  onNotify: (message: string) => void
  /** A terv neve (pl. „Kovácsék terasza”): a megosztóképen és a PDF-en is megjelenik. */
  projectName: string
  onProjectName: (name: string) => void
  /** A vásárló házának leírása (a 3D beállításból) — a kérelemhez és a PDF-hez. */
  house?: string
  onExport?: () => void
  exporting?: boolean
  shareUrl?: string
}

export default function SummaryPanel({ config, price, prices, saved, onSave, onLoad, onNotify, onBudget, energyCost, onEnergy, projectName, onProjectName, house, onExport, exporting, shareUrl }: Props) {
  const { tenant, labels: ROOF_LABELS } = useTenant()
  const [thumbnail, setThumbnail] = useState('')
  const bom = getBom(config)
  const [sharing, setSharing] = useState(false)
  const capture = () => {
    const image = captureScene(1400)
    if (image) setThumbnail(image)
    else onNotify('A 3D kép most nem készíthető el.')
    return image
  }
  // A bemutató-körbeforgás közepén automatikusan elkészül a kép (és a konfiguráció változásakor frissül).
  const configKey = JSON.stringify(config)
  useEffect(() => {
    const timer = window.setTimeout(() => { const image = captureScene(1400); if (image) setThumbnail(image) }, 2600)
    return () => window.clearTimeout(timer)
  }, [configKey])
  const title = projectName.trim() || 'A teraszom új pergolája'
  const share = async () => {
    setSharing(true)
    try {
      const image = capture()
      if (!image) return
      const blob = await renderShareCard({
        image,
        brand: tenant.brand.name,
        title,
        facts: [`${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} m · ${ROOF_LABELS[config.roof]}`, colorSummary(tenant, config), MOUNT_LABELS[config.mount]],
        price: formatHuf(price.totalGross),
        priceNote: 'bruttó irányár, telepítéssel',
        footer: window.location.host,
        accent: getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#d8ff72',
      })
      const result = await shareOrDownload(blob, `${(projectName.trim() || 'pergola').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.png`, title)
      if (result === 'downloaded') onNotify('A megosztható kép letöltve — küldd el a családnak.')
    } catch { onNotify('A megosztható kép most nem készült el.') }
    finally { setSharing(false) }
  }
  const copy = async () => {
    try { await copyShareUrl(createTextSummary(config, price, ROOF_LABELS, tenant.brand.name, tenant)); onNotify('Az összefoglaló a vágólapra másolva.') }
    catch { onNotify('A másolás nem sikerült ebben a böngészőben.') }
  }
  const advice = getAdvice(config)
  const goLead = () => document.querySelector('.lead-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${projectName.trim() || 'Pergola tervem'} – ${formatHuf(price.totalGross)} bruttó irányár\n${shareUrl ?? window.location.href}`)}`
  return (
    <div className="summary-panel">
      <div className="summary-cta">
        <button type="button" className="cta-primary" onClick={goLead}><PackageCheck size={18} />Felmérést kérek</button>
        {onExport && <button type="button" onClick={onExport} disabled={exporting}>{exporting ? <LoaderCircle className="spin" size={18} /> : <FileDown size={18} />}PDF letöltése</button>}
        <a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />WhatsApp</a>
      </div>
      {advice.length > 0 && <ul className="advice-list" aria-label="Szakértői megjegyzések">{advice.map((item) => <li key={item.id} className={item.level}>{item.text}</li>)}</ul>}
      <section className="showroom">
        <div className="showroom-image">
          {thumbnail ? <img src={thumbnail} alt="A konfigurált pergola képe" /> : <div className="showroom-skeleton"><LoaderCircle size={22} className="spin" /><span>A kép a körbeforgás közben elkészül…</span></div>}
          <button type="button" className="showroom-refresh" onClick={capture} title="Új kép a mostani nézetből"><Camera size={15} /><span>Új kép</span></button>
        </div>
        <label className="showroom-name"><PencilLine size={15} /><input value={projectName} maxLength={48} placeholder="Adj nevet a tervnek, pl. Kovácsék terasza" onChange={(event) => onProjectName(event.target.value)} aria-label="A terv neve" /></label>
        <div className="showroom-facts">
          <span>{ROOF_LABELS[config.roof]}</span>
          <h3>{formatNumber(config.width, 2)} × {formatNumber(config.depth, 2)} m</h3>
          <p>{formatNumber(price.area)} m² · {MOUNT_LABELS[config.mount]} · {colorSummary(tenant, config)}</p>
          <strong>{formatHuf(price.totalGross)}</strong><small>bruttó irányár, telepítéssel</small>
        </div>
        <button type="button" className="showroom-share" onClick={share} disabled={sharing}>{sharing ? <LoaderCircle size={17} className="spin" /> : <Share2 size={17} />}<span><strong>Kép küldése a családnak</strong><small>Márkázott kép a tervvel és az árral · WhatsApp, Messenger, e-mail</small></span></button>
        <PriceMix price={price} />
      </section>
      {onBudget && <button type="button" className="budget-trigger is-summary" onClick={onBudget}><Wallet size={15} /><span><strong>Van keretösszeged?</strong><small>Megmutatjuk, mi fér bele</small></span></button>}
      {onEnergy && energyCost ? <button type="button" className="energy-trigger is-summary" onClick={onEnergy}><Gauge size={15} /><span><strong>Üzemeltetés ≈ {formatHuf(energyCost)} / év</strong><small>Áramköltség valós tarifával · részletek</small></span><ChevronRight size={14} /></button> : null}
      <div className="summary-actions"><button type="button" onClick={copy}><Clipboard size={15} />Összefoglaló másolása</button><button type="button" onClick={() => onSave('A')}><Save size={15} />Mentés A</button><button type="button" onClick={() => onSave('B')}><Save size={15} />Mentés B</button></div>

      <section className="summary-section"><div className="summary-section-title"><Code2 size={17} /><h3>Specifikáció</h3></div><div className="spec-code"><span>Konfigurációs kód</span><strong>{getSpecCode(config)}</strong></div><dl className="bom-list">{bom.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{line.value}</dd></div>)}</dl><div className="delivery-estimate"><Clock3 size={18} /><span><strong>Tájékoztató átfutási idő</strong>{getDeliveryEstimate(config)}</span></div></section>

      <section className="summary-section"><div className="summary-section-title"><GitCompareArrows size={17} /><h3>Két konfiguráció összehasonlítása</h3></div>{saved.length < 2 ? <p className="empty-copy">Ments el két változatot az A és B mentési helyre. A két konfiguráció itt jelenik meg egymás mellett.</p> : <>{saved[0].image && saved[1].image && <CompareSlider a={saved[0].image} b={saved[1].image} />}<div className="comparison-grid">{saved.slice(0, 2).map((item, index) => { const savedPrice = calculatePrice(item.config, prices, ROOF_LABELS); return <div key={item.id}><span>Konfiguráció {index === 0 ? 'A' : 'B'}</span><strong>{formatNumber(item.config.width)} × {formatNumber(item.config.depth)} m</strong><small>{ROOF_LABELS[item.config.roof]}<br />{formatNumber(savedPrice.area)} m² · {(['front', 'back', 'left', 'right'] as const).filter((side) => sideSegments(item.config, side).some((segment) => segment.type !== 'none')).length} zárt oldal</small><b>{formatHuf(savedPrice.totalGross)}</b><button type="button" onClick={() => onLoad(item.config)}>Betöltés<ArrowRight size={13} /></button></div>})}</div></>}</section>

      <section className="summary-section lead-section"><div className="summary-section-title"><PackageCheck size={17} /><h3>Kérj helyszíni felmérést</h3></div><LeadForm productFamily="pergola" config={config} estimateNet={price.totalNet} estimateGross={price.totalGross} house={house} /></section>
      <div className="summary-footnote"><Check size={14} />A piszkozat ebben a böngészőben marad; az elküldött felmérési kérelmet a csatolt konfigurációval együtt közvetlenül {tenant.brand.name} kapja meg.</div>
    </div>
  )
}

/** Előtte–utána csúszka a két mentett változat képéből. */
function CompareSlider({ a, b }: { a: string; b: string }) {
  const [split, setSplit] = useState(50)
  return <div className="compare-slider">
    <img src={b} alt="B változat" />
    <div className="compare-a" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}><img src={a} alt="A változat" /></div>
    <span className="compare-label is-a">A</span><span className="compare-label is-b">B</span>
    <i className="compare-handle" style={{ left: `${split}%` }} />
    <input type="range" min={0} max={100} value={split} onChange={(event) => setSplit(Number(event.target.value))} aria-label="A és B változat összehasonlítása" />
  </div>
}
