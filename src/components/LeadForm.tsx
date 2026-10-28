import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, LockKeyhole, MapPin, ShieldCheck } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { PRODUCT_LABELS, SERVICE_REGIONS, type ProductFamily } from '@contracts/catalog'

interface Props {
  productFamily: ProductFamily
  config: unknown
  estimateNet: number
  estimateGross: number
}

export default function LeadForm({ productFamily, config, estimateNet, estimateGross }: Props) {
  const [consent, setConsent] = useState(false)
  const [result, setResult] = useState<{ publicRef: string } | null>(null)
  const [error, setError] = useState('')
  const createLead = trpc.lead.create.useMutation({
    onSuccess: (data) => { setResult(data); setError('') },
    onError: (mutationError) => setError(mutationError.message || 'A kérelem rögzítése nem sikerült. Ellenőrizd az adatokat és próbáld újra.'),
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!consent || createLead.isPending) return
    const form = new FormData(event.currentTarget)
    createLead.mutate({
      productFamily,
      config: config as Record<string, unknown>,
      estimateNet: Math.round(estimateNet),
      estimateGross: Math.round(estimateGross),
      customerName: String(form.get('customerName') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      postalCode: String(form.get('postalCode') ?? ''),
      city: String(form.get('city') ?? ''),
      county: String(form.get('county') ?? '') as (typeof SERVICE_REGIONS)[number],
      address: String(form.get('address') ?? ''),
      notes: String(form.get('notes') ?? ''),
      website: String(form.get('website') ?? ''),
      consent: true,
    })
  }

  if (result) return <div className="thank-you real-lead-success" role="status"><CheckCircle2 size={30} /><div><span>KÉRELEM RÖGZÍTVE</span><h4>A felmérési kérelmedet megkaptuk.</h4><p>Azonosító: <strong>{result.publicRef}</strong></p><p>Az adataid és a konfigurációd alapján felvesszük veled a kapcsolatot a részletek egyeztetéséhez. Az azonosítóval később is nyomon követheted a kérelmed állapotát.</p><small>Az irányár nem minősül kötelező érvényű árajánlatnak. A végleges műszaki tartalom helyszíni felmérés után készül.</small></div></div>

  return <form className="real-lead-form" onSubmit={submit}>
    <div className="lead-form-intro"><span><MapPin size={16} />{PRODUCT_LABELS[productFamily]}</span><p>A konfigurációt és az irányárat a kérelmedhez csatoljuk, hogy a felmérés egyeztetése konkrét műszaki elképzelésből induljon.</p></div>
    <div className="lead-grid">
      <label><span>Név *</span><input name="customerName" autoComplete="name" required minLength={2} maxLength={120} placeholder="Teljes név" /></label>
      <label><span>Telefon *</span><input name="phone" type="tel" autoComplete="tel" required minLength={6} maxLength={40} placeholder="+36 30 123 4567" /></label>
      <label><span>E-mail *</span><input name="email" type="email" autoComplete="email" required maxLength={320} placeholder="nev@email.hu" /></label>
      <label><span>Megye *</span><select name="county" autoComplete="address-level1" required defaultValue="Vas">{SERVICE_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
      <label><span>Település *</span><input name="city" autoComplete="address-level2" required minLength={2} maxLength={120} placeholder="Település" /></label>
      <label><span>Irányítószám *</span><input name="postalCode" autoComplete="postal-code" required minLength={4} maxLength={12} inputMode="numeric" placeholder="9600" /></label>
      <label className="lead-wide"><span>Cím / helyszín</span><input name="address" autoComplete="street-address" maxLength={220} placeholder="Utca, házszám" /></label>
      <label className="lead-wide"><span>Megjegyzés</span><textarea name="notes" rows={3} maxLength={2000} placeholder="Pl. várható kezdés, meglévő szerkezet, megközelítés…" /></label>
    </div>
    <label className="honeypot" aria-hidden="true">Weboldal<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span><ShieldCheck size={16} />Hozzájárulok, hogy a felmérési kérelem egyeztetéséhez az ARDELIS és a kivitelezésben közreműködő partner kezelje a megadott adataimat. A kérelem nem minősül megrendelésnek.</span></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="lead-submit" type="submit" disabled={!consent || createLead.isPending}>{createLead.isPending ? 'Biztonságos rögzítés…' : 'Felmérési kérelem elküldése'}<ArrowRight size={16} /></button>
    <small className="privacy-note"><LockKeyhole size={13} />A fotós helyi előnézet képe nem kerül feltöltésre. Az űrlap csak a fenti, általad megadott adatokat küldi.</small>
  </form>
}
