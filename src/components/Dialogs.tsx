import { useEffect, useRef, type ReactNode } from 'react'
import { ExternalLink, RotateCcw, X } from 'lucide-react'
import { useTenant } from '@/tenants/TenantContext'
import type { PriceSettings } from '@/types/pergola'

export function Modal({ title, eyebrow, onClose, children, className = '' }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; className?: string }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input, a[href], [tabindex="0"]') ?? [])
    focusable()[0]?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key === 'Tab') {
        const items = focusable()
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus() }
  }, [])
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className={`modal-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialogRef}>
        <div className="modal-header"><div>{eyebrow && <span>{eyebrow}</span>}<h2 id="modal-title">{title}</h2></div><button type="button" aria-label="Bezárás" onClick={onClose}><X size={20} /></button></div>
        {children}
      </div>
    </div>
  )
}

const MONEY_FIELDS: { key: keyof PriceSettings; label: string; unit: string }[] = [
  { key: 'freestandingSurchargeNet', label: 'Önálló kivitel felára', unit: 'Ft' },
  { key: 'sideWallAttachPerMeterNet', label: 'Oldalfali rögzítés (sarok, fülke)', unit: 'Ft/fm' },
  { key: 'postNet', label: 'Elmaradó oszlop jóváírása', unit: 'Ft/db' },
  { key: 'zipPerM2Net', label: 'ZIP screen', unit: 'Ft/m²' },
  { key: 'glassPerM2Net', label: 'Tolóüveg oldalfal', unit: 'Ft/m²' },
  { key: 'louverWallPerM2Net', label: 'Fix lamellás oldalfal', unit: 'Ft/m²' },
  { key: 'ledPerMeterNet', label: 'Periméter LED', unit: 'Ft/fm' },
  { key: 'heaterUnitNet', label: 'Teraszfűtés', unit: 'Ft/db' },
  { key: 'speakerPairNet', label: 'Hangrendszer', unit: 'Ft/pár' },
  { key: 'sensorsNet', label: 'Szenzorcsomag', unit: 'Ft' },
]

export function PriceSettingsDialog({ prices, onChange, onReset, onClose }: { prices: PriceSettings; onChange: (prices: PriceSettings) => void; onReset: () => void; onClose: () => void }) {
  const { tenant } = useTenant()
  const roofFields: { key: keyof PriceSettings; label: string; unit: string }[] = [
    ...(tenant.roofs.louvered ? [{ key: 'louveredPerM2Net' as const, label: `${tenant.roofs.louvered.name} ${tenant.roofs.louvered.short} alapár`, unit: 'Ft/m²' }] : []),
    ...(tenant.roofs.retractable ? [{ key: 'retractablePerM2Net' as const, label: `${tenant.roofs.retractable.name} ${tenant.roofs.retractable.short} alapár`, unit: 'Ft/m²' }] : []),
    ...(tenant.roofs.fixed ? [{ key: 'fixedPerM2Net' as const, label: `${tenant.roofs.fixed.name} ${tenant.roofs.fixed.short} alapár`, unit: 'Ft/m²' }] : []),
  ]
  return (
    <Modal title="Mintaárak szerkesztése" eyebrow="SZERKESZTHETŐ MINTAÁRAK" onClose={onClose} className="price-settings-modal">
      <p className="modal-intro">Minden érték nettó forintban értendő, kivéve a százalékos mezőket. A módosítások azonnal újraszámolják a konfigurációt, és csak ebben a böngészőben mentődnek — a beküldött érdeklődőnél a szerver a gyártói árlistával számol.</p>
      <div className="tariff-grid">
        {[...roofFields, ...MONEY_FIELDS].map((field) => (
          <label key={field.key}><span>{field.label}<small>{field.unit}</small></span><input type="number" min="0" step="1000" value={prices[field.key]} onChange={(event) => onChange({ ...prices, [field.key]: Math.max(0, Number(event.target.value) || 0) })} /></label>
        ))}
      </div>
      <div className="rate-grid">
        {([
          ['customColorRate', 'Egyedi RAL felár'], ['installationRate', 'Telepítési arány'], ['vatRate', 'ÁFA kulcs'],
        ] as const).map(([key, label]) => (
          <label key={key}><span>{label}</span><div><input type="number" min="0" max="100" step="1" value={Math.round(prices[key] * 100)} onChange={(event) => onChange({ ...prices, [key]: Math.min(100, Math.max(0, Number(event.target.value) || 0)) / 100 })} /><span>%</span></div></label>
        ))}
      </div>
      <div className="modal-footer"><button type="button" className="text-action" onClick={onReset}><RotateCcw size={15} />Gyártói árlista visszaállítása</button><button type="button" className="primary-action" onClick={onClose}>Kész</button></div>
    </Modal>
  )
}

export function InfoDialog({ onClose }: { onClose: () => void }) {
  const { tenant } = useTenant()
  return (
    <Modal title="A kalkulátorról" eyebrow="ÁTLÁTHATÓ MŰKÖDÉS" onClose={onClose} className="info-modal">
      <div className="info-sections">
        <section><span>01</span><div><h3>Valós idejű paraméteres modell</h3><p>A pergola geometriája a megadott méretekből készül. A konfigurátor nem gyártási terv, statikai számítás vagy helyszíni felmérés helyettesítője.</p></div></section>
        {tenant.demo ? <section><span>02</span><div><h3>Szerkeszthető irányárak</h3><p>A konfigurátor szerkeszthető mintaárakkal számol. Ezek nem egy konkrét gyártó árlistáját jelenítik meg, és nem minősülnek árajánlatnak; minden tétel módosítható.</p><a href="https://www.tudjukki.hu/arak/elotetok/pergola" target="_blank" rel="noreferrer">Tájékozódás nyilvános árakról <ExternalLink size={13} /></a></div></section> : <section><span>02</span><div><h3>Tájékoztató irányárak</h3><p>Az irányár {tenant.brand.name} aktuális árlistája alapján készül, de nem minősül árajánlatnak. A végleges ár helyszíni felmérés után készül.</p></div></section>}
        <section><span>03</span><div><h3>Műszaki és jogi ellenőrzés</h3><p>A bejelentési vagy engedélyezési kötelezettség a kialakítástól és a helyi szabályozástól függ. Kivitelezés előtt építészeti, statikai és hatósági ellenőrzés javasolt.</p><a href="https://njt.hu/jogszabaly/2024-280-20-22" target="_blank" rel="noreferrer">280/2024. Korm. rendelet <ExternalLink size={13} /></a></div></section>
        <section><span>04</span><div><h3>Adatkezelés</h3><p>A piszkozat, a tarifák és a helyi fotó a böngésződben maradnak; megosztáskor a konfiguráció a hivatkozásba kódolódik. Csak a felmérési űrlap tudatos elküldésekor kapja meg {tenant.brand.name} a megadott ügyfél- és projektadatokat.{tenant.brand.privacyUrl && <> <a href={tenant.brand.privacyUrl} target="_blank" rel="noreferrer">Adatkezelési tájékoztató <ExternalLink size={13} /></a></>}</p></div></section>
      </div>
      <div className="modal-footer"><span className="version-label">{[tenant.brand.name, tenant.brand.suffix].filter(Boolean).join(' ').toUpperCase()} / KONFIGURÁTOR</span><button type="button" className="primary-action" onClick={onClose}>Megértettem</button></div>
    </Modal>
  )
}

export function ResetDialog({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title="Visszaállítod a konfigurációt?" eyebrow="ÚJ KEZDET" onClose={onClose} className="confirm-modal">
      <p className="modal-intro">A méretek, oldalfalak és kiegészítők az alapbeállításra állnak vissza.</p>
      <div className="modal-footer"><button type="button" className="secondary-action" onClick={onClose}>Mégse</button><button type="button" className="primary-action" onClick={() => { onConfirm(); onClose() }}>Visszaállítás</button></div>
    </Modal>
  )
}
