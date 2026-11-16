import { useEffect, useRef, useState, type FormEvent, useMemo } from 'react'
import { track } from '@/lib/analytics'
import { readEngagement } from '@/lib/engagement'
import { ArrowRight, CalendarCheck, LockKeyhole, MapPin, ShieldCheck } from 'lucide-react'
import { PRODUCT_LABELS, type ProductFamily } from '@contracts/catalog'
import { useTenant } from '@/tenants/TenantContext'
import { bookingLink } from '@/lib/booking'
import { buyerProductName, firstInvalid, validateLead, type LeadFieldName } from '@/lib/leadValidation'
import { localized, tr } from '../i18n/locale'
import { applyRegionSurcharge, regionSurcharge } from '@/tenants/pricingRules'
import { tenantPrice } from '@/tenants/rules'
import { formatPrice } from '@/lib/money'
import type { PergolaConfig } from '@/types/pergola'

interface Props {
  productFamily: ProductFamily | 'garage-door' | 'modular-house'
  config: unknown
  /** Csak tájékoztató; a szerver a gyártói árlistával újraszámol. */
  estimateNet?: number
  estimateGross?: number
  /** A vásárló házának leírása a 3D beállításból (pl. „Vakolt homlokzat (fehér) · antracit nyílászárók”). */
  house?: string
}

type LeadResponse = { ok: true; ref: string } | { ok: false; error: string; field?: string }

/** A szerver által hibásnak jelzett mező olvasható neve. */
const FIELD_NAMES: Record<string, string> = localized(() => ({
  'customer.name': tr('a nevet', 'den Namen'),
  'customer.email': tr('az e-mail-címet', 'die E-Mail-Adresse'),
  'customer.phone': tr('a telefonszámot (csak számjegy, szóköz, +, -, /, zárójel)', 'die Telefonnummer (nur Ziffern, Leerzeichen, +, -, /, Klammern)'),
  'customer.postalCode': tr('az irányítószámot', 'die Postleitzahl'),
  'customer.city': tr('a település nevét', 'den Ort'),
  'customer.region': tr('a megyét', 'das Bundesland'),
  'customer.address': tr('a címet', 'die Adresse'),
  'customer.notes': tr('a megjegyzést', 'die Anmerkung'),
}))

export default function LeadForm({ productFamily, config, house }: Props) {
  const { tenant, embed, product, dealer } = useTenant()
  const hasRegionRules = productFamily === 'pergola' && Object.keys(tenant.pricingRules?.regionSurcharges ?? {}).length > 0
  // Regionális felárnál nincs előre kiválasztott régió: a vevő maga választ (a rossz alapérték csendben rossz árat adna).
  const [region, setRegion] = useState(() => (hasRegionRules ? '' : tenant.regions.includes('Vas') ? 'Vas' : tenant.regions[0]))
  // Regionális felár (ha a gyártó beállította): a régió kiválasztása után azonnal látszik, és a szerver ugyanígy számol.
  const surcharge = useMemo(() => {
    if (productFamily !== 'pergola' || !regionSurcharge(tenant.pricingRules, region)) return null
    const base = tenantPrice(tenant, config as PergolaConfig)
    const withRegion = applyRegionSurcharge(base, tenant.pricingRules, region, tenant.prices, tenant.currency)
    return { amountNet: withRegion.totalNet - base.totalNet, totalGross: withRegion.totalGross }
  }, [productFamily, tenant, config, region])
  const booking = bookingLink(tenant)
  const startedAt = useRef(Date.now())
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const node = formRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { track(tenant.id, 'lead_view'); observer.disconnect() } }, { threshold: 0.4 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [tenant.id])
  const [consent, setConsent] = useState(false)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<{ publicRef: string } | null>(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LeadFieldName, string>>>({})
  const clearField = (name: LeadFieldName) => setFieldErrors((current) => (current[name] ? { ...current, [name]: undefined } : current))
  const fieldProps = (name: Exclude<LeadFieldName, 'consent'>) => ({ name, 'aria-invalid': fieldErrors[name] ? true : undefined, 'aria-describedby': fieldErrors[name] ? `lead-err-${name}` : undefined, onInput: () => clearField(name) })
  const fieldError = (name: LeadFieldName) => fieldErrors[name] ? <small className="field-error" id={`lead-err-${name}`}>{fieldErrors[name]}</small> : null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '')
    const errors = validateLead({ customerName: field('customerName'), phone: field('phone'), email: field('email'), city: field('city'), consent })
    const first = firstInvalid(errors)
    if (!first && hasRegionRules && !region) {
      setError(tr('Kérlek, válaszd ki a megyét: ettől függ a regionális felár.', 'Bitte wählen Sie Ihr Bundesland – davon hängt der Regionalzuschlag ab.'))
      event.currentTarget.querySelector<HTMLElement>('select[name=county]')?.focus()
      return
    }
    setFieldErrors(errors)
    if (first) {
      track(tenant.id, 'lead_error')
      setError('')
      const target = event.currentTarget.querySelector<HTMLElement>(first === 'consent' ? 'input[name=consent]' : `[name=${first}]`)
      target?.focus()
      return
    }
    setPending(true)
    setError('')
    if (import.meta.env.VITE_PREVIEW_MODE === '1') {
      // Előnézeti build: nincs szerver, a beküldést csak szimuláljuk (semmi nem megy ki).
      await new Promise((resolve) => window.setTimeout(resolve, 700))
      setResult({ publicRef: `ELONEZET-${Date.now().toString(36).toUpperCase()}` })
      setPending(false)
      return
    }
    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          product: productFamily === 'modular-house' ? productFamily : product,
          config,
          customer: {
            name: field('customerName'),
            email: field('email'),
            phone: field('phone'),
            postalCode: field('postalCode'),
            city: field('city'),
            region: field('county'),
            address: field('address'),
            notes: field('notes'),
          },
          ...(house ? { house } : {}),
          consent: true,
          website: field('website'),
          elapsedMs: Date.now() - startedAt.current,
          source: embed ? 'embed' : tenant.demo ? 'demo' : 'standalone',
          ...(dealer ? { dealer: dealer.id } : {}),
          pageUrl: embed && document.referrer ? document.referrer : window.location.origin + window.location.pathname,
          engagement: readEngagement(tenant.id),
        }),
      })
      const data = await response.json().catch(() => null) as LeadResponse | null
      if (!response.ok || !data || !data.ok) {
        const fieldName = data && !data.ok && data.field ? FIELD_NAMES[data.field] : undefined
        track(tenant.id, 'lead_error')
        setError(fieldName ? tr(`Kérlek, ellenőrizd ${fieldName}.`, `Bitte prüfen Sie ${fieldName}.`) : data && !data.ok ? data.error : tr('A kérelem elküldése nem sikerült. Ellenőrizd a kapcsolatot, és próbáld újra.', 'Die Anfrage konnte nicht gesendet werden. Bitte Verbindung prüfen und erneut versuchen.'))
        return
      }
      setResult({ publicRef: data.ref })
      if (embed && window.parent !== window) {
        // A gyártó weboldala ebből mérheti a konverziót (személyes adat nélkül).
        window.parent.postMessage({ type: 'pergola:lead', tenant: tenant.id, ref: data.ref }, '*')
      }
    } catch {
      setError('A kérelem elküldése nem sikerült. Ellenőrizd a kapcsolatot, és próbáld újra.')
    } finally {
      setPending(false)
    }
  }

  if (result) return <div className="thank-you real-lead-success" role="status"><span className="success-burst" aria-hidden="true"><svg viewBox="0 0 52 52" width="44" height="44"><circle className="success-ring" cx="26" cy="26" r="23" fill="none" strokeWidth="3" /><path className="success-tick" d="M15 27.5l8 8 15-17" fill="none" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg><i /><i /><i /><i /><i /><i /></span><div><span>{tr('KÉRELEM RÖGZÍTVE', 'ANFRAGE ERFASST')}</span><h4>{tr('A felmérési kérelmedet megkaptuk.', 'Wir haben Ihre Aufmaß-Anfrage erhalten.')}</h4><p>{tr('Azonosító', 'Kennung')}: <strong>{result.publicRef}</strong></p><p>{tr(`Az adataid és a konfigurációd alapján ${tenant.brand.name} felveszi veled a kapcsolatot a részletek egyeztetéséhez. Érdemes megőrizni az azonosítót.`, `Auf Basis Ihrer Daten und Konfiguration meldet sich ${tenant.brand.name} bei Ihnen, um die Details abzustimmen. Bitte bewahren Sie die Kennung auf.`)}</p>{booking && <a className="booking-cta" href={booking} target="_blank" rel="noopener noreferrer"><CalendarCheck size={17} />{tr('Foglalj most felmérési időpontot', 'Jetzt Aufmaß-Termin buchen')}</a>}{import.meta.env.VITE_PREVIEW_MODE === '1' && <p><strong>{tr('Előnézeti mód:', 'Vorschaumodus:')}</strong> {tr('a kérelem nem lett elküldve, csak a folyamatot mutatja.', 'die Anfrage wurde nicht gesendet, nur der Ablauf wird gezeigt.')}</p>}<small>{tr('Az irányár nem minősül kötelező érvényű árajánlatnak. A végleges műszaki tartalom helyszíni felmérés után készül.', 'Der Richtpreis ist kein verbindliches Angebot. Der endgültige technische Inhalt wird nach dem Aufmaß vor Ort erstellt.')}</small></div></div>

  return <form ref={formRef} className="real-lead-form" noValidate onSubmit={submit} onFocus={() => track(tenant.id, 'lead_start')}>
    <div className="lead-form-intro"><span><MapPin size={16} />{productFamily === 'garage-door' ? tr('Garázskapu', 'Garagentor') : productFamily === 'modular-house' ? tr('Modulház', 'Modulhaus') : buyerProductName(PRODUCT_LABELS[productFamily])}</span><p>{tr('A konfigurációt és az irányárat a kérelmedhez csatoljuk, hogy a felmérés egyeztetése konkrét műszaki elképzelésből induljon.', 'Konfiguration und Richtpreis werden Ihrer Anfrage beigefügt, damit die Aufmaß-Abstimmung von einem konkreten technischen Entwurf ausgeht.')}</p></div>
    <div className="lead-grid">
      <label><span>{tr('Név *', 'Name *')}</span><input {...fieldProps('customerName')} autoComplete="name" required minLength={2} maxLength={120} placeholder={tr('Teljes név', 'Vollständiger Name')} />{fieldError('customerName')}</label>
      <label><span>{tr('Telefon', 'Telefon')} *</span><input {...fieldProps('phone')} type="tel" autoComplete="tel" required minLength={6} maxLength={40} pattern="[+0-9 \(\)\/\-]{6,40}" title={tr('Csak számjegy, szóköz és + - / ( ) karakter', 'Nur Ziffern, Leerzeichen und + - / ( )')} placeholder={tr('+36 30 123 4567', '+43 664 1234567')} />{fieldError('phone')}</label>
      <label><span>E-mail *</span><input {...fieldProps('email')} type="email" autoComplete="email" required maxLength={320} pattern="[^@\s]+@[^@\s]+\.[^@\s]+" title={tr('Pl. nev@email.hu', 'z. B. name@beispiel.at')} placeholder={tr('nev@email.hu', 'name@beispiel.at')} />{fieldError('email')}</label>
      <label><span>{tr('Település *', 'Ort *')}</span><input {...fieldProps('city')} autoComplete="address-level2" required minLength={2} maxLength={120} placeholder={tr('Település', 'Ort')} />{fieldError('city')}</label>
      {/* Ha a gyártónak van regionális felára, a régió a kötelező mezők között van: a felár ettől függ, ne a rejtett alapértékből jöjjön. */}
      {hasRegionRules && <label><span>{tr('Megye', 'Bundesland')} *</span><select name="county" autoComplete="address-level1" required value={region} onChange={(event) => setRegion(event.target.value)}><option value="" disabled>{tr('Válassz…', 'Bitte wählen…')}</option>{tenant.regions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
      {hasRegionRules && surcharge && <p className="lead-surcharge" role="status">{tr(`Regionális felár (${region}): +${formatPrice(surcharge.amountNet)} nettó · bruttó irányár ezzel: ${formatPrice(surcharge.totalGross)}`, `Regionalzuschlag (${region}): +${formatPrice(surcharge.amountNet)} netto · Richtpreis brutto damit: ${formatPrice(surcharge.totalGross)}`)}</p>}
    </div>
    <details className="lead-more"><summary>{tr('További adatok (nem kötelező)', 'Weitere Angaben (optional)')}</summary><div className="lead-grid">
      {!hasRegionRules && <label><span>{tr('Megye', 'Bundesland')} *</span><select name="county" autoComplete="address-level1" required value={region} onChange={(event) => setRegion(event.target.value)}>{tenant.regions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
      <label><span>{tr('Irányítószám', 'Postleitzahl')}</span><input name="postalCode" autoComplete="postal-code" maxLength={12} inputMode="numeric" placeholder="9600" /></label>
      <label className="lead-wide"><span>{tr('Cím / helyszín', 'Adresse / Standort')}</span><input name="address" autoComplete="street-address" maxLength={220} placeholder={tr('Utca, házszám', 'Straße, Hausnummer')} /></label>
      <label className="lead-wide"><span>{tr('Megjegyzés', 'Anmerkung')}</span><textarea name="notes" rows={3} maxLength={2000} placeholder={tr('Pl. várható kezdés, meglévő szerkezet, megközelítés…', 'z. B. geplanter Beginn, bestehende Konstruktion, Zufahrt…')} /></label>
    </div></details>
    <label className="honeypot" aria-hidden="true">Weboldal<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className={`consent-row${fieldErrors.consent ? ' is-invalid' : ''}`}><input type="checkbox" name="consent" checked={consent} onChange={(event) => { setConsent(event.target.checked); clearField('consent') }} aria-invalid={fieldErrors.consent ? true : undefined} aria-describedby={fieldErrors.consent ? 'lead-err-consent' : undefined} /><span><ShieldCheck size={15} aria-hidden="true" />{tr(`Hozzájárulok, hogy a felmérési kérelem egyeztetéséhez ${tenant.brand.legalName} kezelje a megadott adataimat.`, `Ich willige ein, dass ${tenant.brand.legalName} meine angegebenen Daten zur Abstimmung der Aufmaß-Anfrage verarbeitet.`)}{tenant.brand.privacyUrl && <> <a href={tenant.brand.privacyUrl} target="_blank" rel="noreferrer">{tr('Adatkezelési tájékoztató', 'Datenschutzerklärung')}</a>.</>} {tr('A kérelem nem minősül megrendelésnek.', 'Die Anfrage ist keine Bestellung.')}</span></label>
    {fieldError('consent')}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className={`lead-submit${pending ? ' is-pending' : ''}`} type="submit" disabled={pending} aria-disabled={pending || undefined}>{pending ? tr('Küldés…', 'Wird gesendet…') : tr('Felmérési kérelem elküldése', 'Aufmaß-Anfrage senden')}{pending ? <span className="lead-spinner" aria-hidden="true" /> : <ArrowRight size={16} />}</button>
    <small className="privacy-note"><LockKeyhole size={13} />{tr('A fotós helyi előnézet képe nem kerül feltöltésre. Az űrlap csak a fenti, általad megadott adatokat küldi.', 'Das Bild der lokalen Fotovorschau wird nicht hochgeladen. Das Formular sendet nur die oben von Ihnen eingegebenen Daten.')}</small>
  </form>
}
