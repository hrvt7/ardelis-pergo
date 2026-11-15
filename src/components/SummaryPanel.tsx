import '@/legal.css'
import { useEffect, useState } from 'react'
import { getAdvice } from '@/lib/advice'
import { MessageCircle, ArrowRight, Camera, Clapperboard, Check, ChevronRight, Clipboard, Clock3, Code2, FileDown, Gauge, GitCompareArrows, LoaderCircle, PackageCheck, PencilLine, Save, Share2, Wallet } from 'lucide-react'
import PriceMix from '@/components/PriceMix'
import { captureScene, renderShareCard, shareOrDownload } from '@/lib/showcase'
import { recordTurntable, videoRecordingSupported } from '@/lib/turntableVideo'
import { colorSummary } from '@/lib/colors'
import LeadForm from '@/components/LeadForm'
import { copyShareUrl } from '@/lib/exportPdf'
import { noteEngagement } from '@/lib/engagement'
import { MOUNT_LABELS } from '@/lib/mount'
import { sideSegments } from '@/lib/sides'
import { calculatePrice, formatPrice, formatNumber } from '@/lib/pricing'
import { getDisplayCurrency } from '@/lib/money'
import { useTenant } from '@/tenants/TenantContext'
import { BuildingIssues, IssueFixButton, PermitNotice } from '@/components/BuildingControls'
import { isClosedBuilding } from '@/lib/buildings'
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
  shareUrl?: string
  /** PDF-összefoglaló letöltése (ugyanaz, mint az árpanelen; itt is elérhető, mert az árpanel összecsukható). */
  onExport?: () => void
  exporting?: boolean
  /** Egy kattintásos javítás a figyelmeztetésekhez (ugyanaz az út, mint bármely módosítás: ár, visszavonás). */
  onFix?: (patch: Partial<PergolaConfig>) => void
}

export default function SummaryPanel({ config, price, prices, saved, onSave, onLoad, onNotify, onBudget, energyCost, onEnergy, onExport, exporting = false, onFix, projectName, onProjectName, house, shareUrl }: Props) {
  const { tenant, labels: ROOF_LABELS } = useTenant()
  const [thumbnail, setThumbnail] = useState('')
  const bom = getBom(config)
  const [sharing, setSharing] = useState(false)
  const [canRecord] = useState(() => videoRecordingSupported())
  const [recording, setRecording] = useState<number | null>(null)
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
        price: formatPrice(price.totalGross),
        priceNote: 'bruttó irányár, telepítéssel',
        footer: window.location.host,
        qrUrl: shareUrl,
        accent: getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#d8ff72',
      })
      const result = await shareOrDownload(blob, `${(projectName.trim() || 'pergola').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.png`, title)
      if (result === 'downloaded') onNotify('A megosztható kép letöltve — küldd el a családnak.')
      noteEngagement(tenant.id, 'share')
    } catch { onNotify('A megosztható kép most nem készült el.') }
    finally { setSharing(false) }
  }
  // Körbejáró videó (kb. 10 mp) márkázott sávval: telefonon a megosztó menübe (WhatsApp), asztalon letöltésként.
  const video = async () => {
    if (recording !== null) return
    setRecording(0)
    try {
      const title = `${ROOF_LABELS[config.roof]} · ${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} m`
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#d8ff72'
      const { blob, extension } = await recordTurntable({ brand: tenant.brand.name, title, price: formatPrice(price.totalGross), accent }, (progress) => setRecording(progress))
      const result = await shareOrDownload(blob, `${(projectName.trim() || 'pergola').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-video.${extension}`, projectName.trim() || title)
      if (result === 'downloaded') onNotify(extension === 'mp4' ? 'A videó letöltve — küldd el a családnak.' : 'A videó letöltve (WebM). Ha a telefon nem játssza le, küldd a terv linkjét.')
      noteEngagement(tenant.id, 'share')
    } catch { onNotify('A videó most nem készült el. Fotó módban és néhány böngészőben nem érhető el.') }
    finally { setRecording(null) }
  }
  const copy = async () => {
    try { await copyShareUrl(createTextSummary(config, price, ROOF_LABELS, tenant.brand.name, tenant)); onNotify('Az összefoglaló a vágólapra másolva.'); noteEngagement(tenant.id, 'share') }
    catch { onNotify('A másolás nem sikerült ebben a böngészőben.') }
  }
  const advice = getAdvice(config)
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${projectName.trim() || 'Pergola tervem'} – ${formatPrice(price.totalGross)} bruttó irányár\n${shareUrl ?? window.location.href}`)}`
  return (
    <div className="summary-panel summary-animated">
      {advice.length > 0 && <ul className="advice-list" aria-label="Szakértői megjegyzések">{advice.map((item) => <li key={item.id} className={item.level}>{item.text}<IssueFixButton config={config} issueId={item.id} onFix={onFix} /></li>)}</ul>}
      <section className="showroom">
        <div className="showroom-image">
          {thumbnail ? <img src={thumbnail} onLoad={(event) => event.currentTarget.classList.toggle('is-portrait', event.currentTarget.naturalHeight > event.currentTarget.naturalWidth)} alt={`A konfigurált ${config.building === 'conservatory' ? 'télikert' : config.building === 'veranda' ? 'veranda' : config.building === 'carport' ? 'carport' : 'pergola'} képe`} /> : <div className="showroom-skeleton"><LoaderCircle size={22} className="spin" /><span>A kép a körbeforgás közben elkészül…</span></div>}
          <button type="button" className="showroom-refresh" onClick={capture} title="Új kép a mostani nézetből"><Camera size={15} /><span>Új kép</span></button>
        </div>
        <label className="showroom-name"><PencilLine size={15} /><input value={projectName} maxLength={48} placeholder="Adj nevet a tervnek, pl. Kovácsék terasza" onChange={(event) => onProjectName(event.target.value)} aria-label="A terv neve" /></label>
        <div className="showroom-facts">
          <span>{ROOF_LABELS[config.roof]}</span>
          <h3>{formatNumber(config.width, 2)} × {formatNumber(config.depth, 2)} m</h3>
          <p>{formatNumber(price.area)} m² · {MOUNT_LABELS[config.mount]} · {colorSummary(tenant, config)}</p>
          <strong>{formatPrice(price.totalGross)}</strong><small>bruttó irányár, telepítéssel</small>
        </div>
      </section>
      {isClosedBuilding(config.building) && <section className="summary-section building-summary"><BuildingIssues config={config} onFix={onFix} /><PermitNotice building={config.building} /></section>}

      <section className="summary-section lead-section"><div className="summary-section-title"><PackageCheck size={17} /><h3>Kérj helyszíni felmérést</h3></div><LeadForm productFamily="pergola" config={config} estimateNet={price.totalNet} estimateGross={price.totalGross} house={house} /></section>

      <details className="summary-more"><summary><Share2 size={16} /><span><strong>Megosztás és mentés</strong><small>PDF, kép, videó, WhatsApp, két változat összehasonlítása</small></span><ChevronRight size={15} className="summary-more-chevron" /></summary><div className="summary-more-body">
        {onExport && <button type="button" className="showroom-share is-pdf" onClick={onExport} disabled={exporting}>{exporting ? <LoaderCircle size={17} className="spin" /> : <FileDown size={17} />}<span><strong>{exporting ? 'PDF készül…' : 'PDF összefoglaló letöltése'}</strong><small>Méretek, anyaglista, irányár és a 3D-link egy dokumentumban</small></span></button>}
        <button type="button" className="showroom-share" onClick={share} disabled={sharing}>{sharing ? <LoaderCircle size={17} className="spin" /> : <Share2 size={17} />}<span><strong>Kép küldése a családnak</strong><small>Márkázott kép a tervvel és az árral · WhatsApp, Messenger, e-mail</small></span></button>
        {canRecord && <button type="button" className="showroom-share is-video" onClick={() => void video()} disabled={recording !== null}>{recording !== null ? <LoaderCircle size={17} className="spin" /> : <Clapperboard size={17} />}<span><strong>{recording !== null ? `Videó készül… ${Math.round(recording * 100)}%` : 'Videó a tervről'}</strong><small>{recording !== null ? 'Ne zárd be az oldalt, a kamera körbejárja a tervet' : 'Kb. 10 mp-es körbejárás, WhatsAppon is küldhető'}</small></span></button>}
      <div className="summary-actions"><button type="button" onClick={copy}><Clipboard size={15} />Szöveg másolása</button><a className="summary-action-link" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />WhatsApp</a></div>
      <section className="summary-section"><div className="summary-section-title"><GitCompareArrows size={17} /><h3>Két változat összehasonlítása</h3></div><div className="summary-actions is-variants"><button type="button" onClick={() => onSave('A')}><Save size={15} />Mentés „A” változatként</button><button type="button" onClick={() => onSave('B')}><Save size={15} />Mentés „B” változatként</button></div>{saved.length < 2 ? <p className="empty-copy">Mentsd el a mostani tervet „A” változatként, módosíts rajta, majd mentsd „B”-ként: a kettő itt jelenik meg egymás mellett, árral.</p> : <>{saved[0].image && saved[1].image && <CompareSlider a={saved[0].image} b={saved[1].image} />}<div className="comparison-grid">{saved.slice(0, 2).map((item, index) => { const savedPrice = calculatePrice(item.config, prices, ROOF_LABELS, getDisplayCurrency()); return <div key={item.id}><span>Konfiguráció {index === 0 ? 'A' : 'B'}</span><strong>{formatNumber(item.config.width)} × {formatNumber(item.config.depth)} m</strong><small>{ROOF_LABELS[item.config.roof]}<br />{formatNumber(savedPrice.area)} m² · {(['front', 'back', 'left', 'right'] as const).filter((side) => sideSegments(item.config, side).some((segment) => segment.type !== 'none')).length} zárt oldal</small><b>{formatPrice(savedPrice.totalGross)}</b><button type="button" onClick={() => onLoad(item.config)}>Betöltés<ArrowRight size={13} /></button></div>})}</div></>}</section>
      </div></details>
      <details className="summary-more"><summary><Wallet size={16} /><span><strong>Költségek és specifikáció</strong><small>Árbontás, keretösszeg, üzemeltetés, anyaglista</small></span><ChevronRight size={15} className="summary-more-chevron" /></summary><div className="summary-more-body">
        <PriceMix price={price} />
      {onBudget && <button type="button" className="budget-trigger is-summary" onClick={onBudget}><Wallet size={15} /><span><strong>Van keretösszeged?</strong><small>Megmutatjuk, mi fér bele</small></span></button>}
      {onEnergy && energyCost ? <button type="button" className="energy-trigger is-summary" onClick={onEnergy}><Gauge size={15} /><span><strong>Üzemeltetés ≈ {formatPrice(energyCost)} / év</strong><small>Áramköltség valós tarifával · részletek</small></span><ChevronRight size={14} /></button> : null}
      <section className="summary-section"><div className="summary-section-title"><Code2 size={17} /><h3>Specifikáció</h3></div><div className="spec-code"><span>Konfigurációs kód</span><strong>{getSpecCode(config)}</strong></div><dl className="bom-list">{bom.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{line.value}</dd></div>)}</dl><p className="bom-note">Tájékoztató anyaglista: szabályalapú becslés, nem gyártási dokumentáció. A végleges méreteket és darabszámokat a felmérés után a gyártó határozza meg.</p><div className="delivery-estimate"><Clock3 size={18} /><span><strong>Tájékoztató átfutási idő</strong>{getDeliveryEstimate(config)}</span></div></section>
      </div></details>
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
