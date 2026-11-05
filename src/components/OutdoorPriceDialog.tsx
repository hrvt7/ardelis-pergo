import { useEffect, useRef } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { OUTDOOR_PRICE_DEFAULTS } from '@/lib/catalog'
import type { OutdoorPriceSettings } from '@/types/catalog'

type NumericKey = Exclude<keyof OutdoorPriceSettings, 'canopyPerM2' | 'carportPerM2' | 'fencePerM2'>
const units: Partial<Record<NumericKey, string>> = { postPerMeter: 'Ft/fm', ledPerMeter: 'Ft/fm', gutterPerMeter: 'Ft/fm', foundationPerM2: 'Ft/m²', sideLouverPerM2: 'Ft/m²', sideGlassPerM2: 'Ft/m²', sidePrivacyPerM2: 'Ft/m²', gatePerM2: 'Ft/m²' }
const labels: Record<NumericKey, string> = {
  postPerMeter: 'Kerítésoszlop és rögzítés', pedestrianGate: 'Kiskapu komplett', gatePerM2: 'Kapubetét', swingMechanism: 'Nyílókapu-mechanika', slidingMechanism: 'Tolókapu-mechanika', cantileverMechanism: 'Úszókapu-mechanika', gateMotor: 'Kapumotor és vezérlés', safetyKit: 'Biztonsági fényfüggöny', intercom: 'Kaputelefon', ledPerMeter: 'LED világítás', gutterPerMeter: 'Eresz és lefolyó', storageUnit: 'Tárolómodul', evPreparation: 'EV-előkészítés', solarPreparation: 'Napelem-előkészítés', foundationPerM2: 'Alapozási iránytétel', sideLouverPerM2: 'Lamellás oldalzárás', sideGlassPerM2: 'Üveg oldalzárás', sidePrivacyPerM2: 'Zárt oldalzárás', customColorRate: 'Egyedi RAL felár', installationRate: 'Telepítési arány', vatRate: 'ÁFA-kulcs',
}
const scalarFields = Object.keys(labels) as NumericKey[]

interface Props { prices: OutdoorPriceSettings; onChange: (prices: OutdoorPriceSettings) => void; onClose: () => void }
export default function OutdoorPriceDialog({ prices, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [onClose])
  const setScalar = (key: NumericKey, value: number) => onChange({ ...prices, [key]: Math.max(0, value) })
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="modal-dialog price-settings-modal" role="dialog" aria-modal="true" aria-labelledby="outdoor-price-title" ref={ref}>
    <div className="modal-header"><div><span>LAMELIX / DEMÓ TARIFÁK</span><h2 id="outdoor-price-title">Mintaárak és tarifák</h2></div><button type="button" aria-label="Bezárás" onClick={onClose}><X size={20} /></button></div>
    <p className="modal-intro">Az értékek nettó forintban értendők, kivéve a százalékos mezőket. A módosítások azonnal újraszámolják mind az öt termékcsaládot, és csak ebben a böngészőben maradnak.</p>
    {([['canopyPerM2', 'Cover · előtető alapárak'], ['carportPerM2', 'Drive · autóbeálló alapárak'], ['fencePerM2', 'Fence és Gate · anyagárak']] as const).map(([group, title]) => <section className="outdoor-tariff-section" key={group}><h3>{title}</h3><div className="tariff-grid">{Object.entries(prices[group]).map(([key, value]) => <label key={key}><span>{key}<small>Ft/m²</small></span><input type="number" min="0" step="1000" value={value} onChange={(event) => onChange({ ...prices, [group]: { ...prices[group], [key]: Math.max(0, Number(event.target.value) || 0) } })} /></label>)}</div></section>)}
    <section className="outdoor-tariff-section"><h3>Kiegészítők és arányok</h3><div className="tariff-grid">{scalarFields.filter((key) => !['customColorRate', 'installationRate', 'vatRate'].includes(key)).map((key) => <label key={key}><span>{labels[key]}<small>{units[key] ?? 'Ft/tétel'}</small></span><input type="number" min="0" step="1000" value={prices[key]} onChange={(event) => setScalar(key, Number(event.target.value) || 0)} /></label>)}</div><div className="rate-grid">{(['customColorRate', 'installationRate', 'vatRate'] as const).map((key) => <label key={key}><span>{labels[key]}</span><div><input type="number" min="0" max="100" value={Math.round(prices[key] * 100)} onChange={(event) => setScalar(key, Math.min(100, Math.max(0, Number(event.target.value) || 0)) / 100)} /><span>%</span></div></label>)}</div></section>
    <div className="modal-footer"><button type="button" className="text-action" onClick={() => onChange(OUTDOOR_PRICE_DEFAULTS)}><RotateCcw size={15} />Alapértelmezett tarifák</button><button type="button" className="primary-action" onClick={onClose}>Kész</button></div>
  </div></div>
}
