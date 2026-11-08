import { useEffect, useRef, useState, type FormEvent } from 'react'
import { track } from '@/lib/analytics'
import { readEngagement } from '@/lib/engagement'
import { ArrowRight, LockKeyhole, MapPin, ShieldCheck } from 'lucide-react'
import { PRODUCT_LABELS, type ProductFamily } from '@contracts/catalog'
import { useTenant } from '@/tenants/TenantContext'

interface Props {
  productFamily: ProductFamily | 'garage-door'
  config: unknown
  /** Csak tájékoztató; a szerver a gyártói árlistával újraszámol. */
  estimateNet?: number
  estimateGross?: number
  /** A vásárló házának leírása a 3D beállításból (pl. „Vakolt homlokzat (fehér) · antracit nyílászárók”). */
  house?: string
}

type LeadResponse = { ok: true; ref: string } | { ok: false; error: string; field?: string }

/** A szerver által hibásnak jelzett mező olvasható neve. */
const FIELD_NAMES: Record<string, string> = {
  'customer.name': 'a nevet',
  'customer.email': 'az e-mail-címet',
  'customer.phone': 'a telefonszámot (csak számjegy, szóköz, +, -, /, zárójel)',
  'customer.postalCode': 'az irányítószámot',
  'customer.city': 'a település nevét',
  'customer.region': 'a megyét',
  'customer.address': 'a címet',
  'customer.notes': 'a megjegyzést',
}

export default function LeadForm({ productFamily, config, house }: Props) {
  const { tenant, embed, product } = useTenant()
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!consent || pending) return
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '')
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
          product,
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
          pageUrl: embed && document.referrer ? document.referrer : window.location.origin + window.location.pathname,
          engagement: readEngagement(tenant.id),
        }),
      })
      const data = await response.json().catch(() => null) as LeadResponse | null
      if (!response.ok || !data || !data.ok) {
        const fieldName = data && !data.ok && data.field ? FIELD_NAMES[data.field] : undefined
        setError(fieldName ? `Kérlek, ellenőrizd ${fieldName}.` : data && !data.ok ? data.error : 'A kérelem elküldése nem sikerült. Ellenőrizd a kapcsolatot, és próbáld újra.')
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

  if (result) return <div className="thank-you real-lead-success" role="status"><span className="success-burst" aria-hidden="true"><svg viewBox="0 0 52 52" width="44" height="44"><circle className="success-ring" cx="26" cy="26" r="23" fill="none" strokeWidth="3" /><path className="success-tick" d="M15 27.5l8 8 15-17" fill="none" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg><i /><i /><i /><i /><i /><i /></span><div><span>KÉRELEM RÖGZÍTVE</span><h4>A felmérési kérelmedet megkaptuk.</h4><p>Azonosító: <strong>{result.publicRef}</strong></p><p>Az adataid és a konfigurációd alapján {tenant.brand.name} felveszi veled a kapcsolatot a részletek egyeztetéséhez. Érdemes megőrizni az azonosítót.</p>{import.meta.env.VITE_PREVIEW_MODE === '1' && <p><strong>Előnézeti mód:</strong> a kérelem nem lett elküldve, csak a folyamatot mutatja.</p>}<small>Az irányár nem minősül kötelező érvényű árajánlatnak. A végleges műszaki tartalom helyszíni felmérés után készül.</small></div></div>

  return <form ref={formRef} className="real-lead-form" onSubmit={submit} onFocus={() => track(tenant.id, 'lead_start')}>
    <div className="lead-form-intro"><span><MapPin size={16} />{productFamily === 'garage-door' ? 'Garage · garázskapu' : PRODUCT_LABELS[productFamily]}</span><p>A konfigurációt és az irányárat a kérelmedhez csatoljuk, hogy a felmérés egyeztetése konkrét műszaki elképzelésből induljon.</p></div>
    <div className="lead-grid">
      <label><span>Név *</span><input name="customerName" autoComplete="name" required minLength={2} maxLength={120} placeholder="Teljes név" /></label>
      <label><span>Telefon *</span><input name="phone" type="tel" autoComplete="tel" required minLength={6} maxLength={40} pattern="[+0-9 \(\)\/\-]{6,40}" title="Csak számjegy, szóköz és + - / ( ) karakter" placeholder="+36 30 123 4567" /></label>
      <label><span>E-mail *</span><input name="email" type="email" autoComplete="email" required maxLength={320} pattern="[^@\s]+@[^@\s]+\.[^@\s]+" title="Pl. nev@email.hu" placeholder="nev@email.hu" /></label>
      <label><span>Település *</span><input name="city" autoComplete="address-level2" required minLength={2} maxLength={120} placeholder="Település" /></label>
    </div>
    <details className="lead-more"><summary>További adatok (nem kötelező)</summary><div className="lead-grid">
      <label><span>Megye *</span><select name="county" autoComplete="address-level1" required defaultValue={tenant.regions.includes('Vas') ? 'Vas' : tenant.regions[0]}>{tenant.regions.map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
      <label><span>Irányítószám</span><input name="postalCode" autoComplete="postal-code" maxLength={12} inputMode="numeric" placeholder="9600" /></label>
      <label className="lead-wide"><span>Cím / helyszín</span><input name="address" autoComplete="street-address" maxLength={220} placeholder="Utca, házszám" /></label>
      <label className="lead-wide"><span>Megjegyzés</span><textarea name="notes" rows={3} maxLength={2000} placeholder="Pl. várható kezdés, meglévő szerkezet, megközelítés…" /></label>
    </div></details>
    <label className="honeypot" aria-hidden="true">Weboldal<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span><ShieldCheck size={16} />Hozzájárulok, hogy a felmérési kérelem egyeztetéséhez {tenant.brand.legalName} kezelje a megadott adataimat.{tenant.brand.privacyUrl && <> <a href={tenant.brand.privacyUrl} target="_blank" rel="noreferrer">Adatkezelési tájékoztató</a>.</>} A kérelem nem minősül megrendelésnek.</span></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className={`lead-submit${pending ? ' is-pending' : ''}`} type="submit" disabled={!consent || pending}>{pending ? 'Küldés…' : 'Felmérési kérelem elküldése'}{pending ? <span className="lead-spinner" aria-hidden="true" /> : <ArrowRight size={16} />}</button>
    <small className="privacy-note"><LockKeyhole size={13} />A fotós helyi előnézet képe nem kerül feltöltésre. Az űrlap csak a fenti, általad megadott adatokat küldi.</small>
  </form>
}
