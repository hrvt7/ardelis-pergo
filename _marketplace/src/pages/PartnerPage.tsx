import { useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, BriefcaseBusiness, Check, CheckCircle2, Clock3, FileText, HandCoins, LogOut, MapPin, ShieldCheck, Wrench } from 'lucide-react'
import SiteHeader from '@/components/SiteChrome'
import { useAuth } from '@/hooks/useAuth'
import { formatHuf } from '@/lib/pricing'
import { trpc } from '@/providers/trpc'
import { LEAD_STATUS_LABELS, PRODUCT_FAMILIES, PRODUCT_LABELS, SERVICE_REGIONS, type ProductFamily } from '@contracts/catalog'
import { usePageSeo } from '@/lib/usePageSeo'

const partnerStatus = { pending: 'Jóváhagyásra vár', approved: 'Aktív partner', suspended: 'Felfüggesztve' }
const commissionStatus = { due: 'Elszámolandó', invoiced: 'Számlázva', settled: 'Rendezve' }

type Job = {
  id: number; publicRef: string; productFamily: ProductFamily; configJson: string; estimateNet: number; estimateGross: number
  customerName: string; email: string; phone: string; postalCode: string; city: string; county: string; address: string | null; notes: string | null
  status: keyof typeof LEAD_STATUS_LABELS; actualNet: number | null; actualGross: number | null; createdAt: Date
}

function ConfigBrief({ json }: { json: string }) {
  const config = useMemo(() => { try { return JSON.parse(json) as Record<string, unknown> } catch { return {} } }, [json])
  return <code className="config-brief">{Object.entries(config).filter(([key]) => !['customRal'].includes(key)).slice(0, 9).map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · ')}</code>
}

function Registration({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const utils = trpc.useUtils()
  const [counties, setCounties] = useState<string[]>(['Vas'])
  const [trades, setTrades] = useState<ProductFamily[]>(['pergola'])
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const register = trpc.partner.register.useMutation({ onSuccess: async () => { await utils.partner.me.invalidate() }, onError: (err) => setError(err.message) })
  const toggleCounty = (county: string) => setCounties((current) => current.includes(county) ? current.filter((item) => item !== county) : [...current, county])
  const toggleTrade = (trade: ProductFamily) => setTrades((current) => current.includes(trade) ? current.filter((item) => item !== trade) : [...current, trade])
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    if (!counties.length || !trades.length || !consent) { setError('Válassz legalább egy megyét és szakmát, majd fogadd el az adatkezelést.'); return }
    const form = new FormData(event.currentTarget)
    register.mutate({ companyName: String(form.get('companyName')), contactName: String(form.get('contactName')), email: String(form.get('email')), phone: String(form.get('phone')), taxNumber: String(form.get('taxNumber')), website: String(form.get('website')), headquarters: String(form.get('headquarters')), baseCounty: String(form.get('baseCounty')) as (typeof SERVICE_REGIONS)[number], counties: counties as (typeof SERVICE_REGIONS)[number][], trades, introduction: String(form.get('introduction')), consent: true })
  }
  return <main className="registration-layout"><section className="registration-copy"><span>PARTNERI FELÜLET / REGISZTRÁCIÓ</span><h1>Projektek ott,<br />ahol dolgozol.</h1><p>A profilod alapján csak az általad lefedett megyék és szakmák projektjeit kapod. A jóváhagyásig az ajánlatok és munkák zárolva maradnak.</p><div className="registration-rules"><span><ShieldCheck />Adminisztrátori jóváhagyás</span><span><MapPin />Megye + szakma egyezés</span><span><CheckCircle2 />Első elfogadó kiosztás</span></div></section><form className="partner-form" onSubmit={submit}><div className="dashboard-form-grid"><label><span>Cégnév *</span><input name="companyName" required minLength={2} /></label><label><span>Kapcsolattartó *</span><input name="contactName" required defaultValue={defaultName} /></label><label><span>E-mail *</span><input name="email" type="email" required defaultValue={defaultEmail} /></label><label><span>Telefon *</span><input name="phone" type="tel" required /></label><label><span>Adószám</span><input name="taxNumber" /></label><label><span>Weboldal</span><input name="website" type="url" placeholder="https://" /></label><label><span>Székhely *</span><input name="headquarters" required /></label><label><span>Székhely megyéje *</span><select name="baseCounty" defaultValue="Vas">{SERVICE_REGIONS.map((county) => <option key={county}>{county}</option>)}</select></label></div><fieldset><legend>Szakmák *</legend><div className="check-chip-grid">{PRODUCT_FAMILIES.map((family) => <label key={family} className={trades.includes(family) ? 'selected' : ''}><input type="checkbox" checked={trades.includes(family)} onChange={() => toggleTrade(family)} />{PRODUCT_LABELS[family]}<Check size={14} /></label>)}</div></fieldset><fieldset><legend>Lefedett megyék *</legend><div className="check-chip-grid counties">{SERVICE_REGIONS.map((county) => <label key={county} className={counties.includes(county) ? 'selected' : ''}><input type="checkbox" checked={counties.includes(county)} onChange={() => toggleCounty(county)} />{county}<Check size={14} /></label>)}</div></fieldset><label className="full-field"><span>Bemutatkozás, referencia</span><textarea name="introduction" rows={4} maxLength={3000} placeholder="Röviden a csapat, a rendszerek és a kivitelezési tapasztalat…" /></label><label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>A partneri adatok rögzítéséhez és a projektkiosztáshoz szükséges kezeléséhez hozzájárulok.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button-primary" disabled={register.isPending}>{register.isPending ? 'Regisztráció…' : 'Partnerprofil elküldése'}<ArrowRight size={16} /></button></form></main>
}

function JobCard({ job, onUpdated }: { job: Job; onUpdated: () => void }) {
  const [status, setStatus] = useState<'surveyed' | 'quoted' | 'won'>(job.status === 'won' ? 'won' : job.status === 'quoted' ? 'quoted' : 'surveyed')
  const [net, setNet] = useState(String(job.actualNet ?? job.estimateNet))
  const [gross, setGross] = useState(String(job.actualGross ?? job.estimateGross))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const update = trpc.partner.updateJob.useMutation({ onSuccess: () => { setError(''); onUpdated() }, onError: (err) => setError(err.message) })
  const save = () => update.mutate({ leadId: job.id, status, actualNet: Number(net) || undefined, actualGross: Number(gross) || undefined, note: note || undefined })
  const locked = ['completed', 'cancelled'].includes(job.status)
  return <article className="job-card"><div className="job-card-head"><div><span>{job.publicRef}</span><h3>{PRODUCT_LABELS[job.productFamily]}</h3></div><b className={`status status-${job.status}`}>{LEAD_STATUS_LABELS[job.status]}</b></div><ConfigBrief json={job.configJson} /><div className="customer-grid"><div><span>Ügyfél</span><strong>{job.customerName}</strong><a href={`tel:${job.phone}`}>{job.phone}</a><a href={`mailto:${job.email}`}>{job.email}</a></div><div><span>Helyszín</span><strong>{job.postalCode} {job.city}</strong><p>{job.county}{job.address ? ` · ${job.address}` : ''}</p><p>{job.notes}</p></div></div>{!locked && <div className="job-update"><label><span>Új állapot</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="surveyed">Felmérve</option><option value="quoted">Árajánlat adva</option><option value="won">Megrendelve</option></select></label><label><span>Tényleges nettó</span><input type="number" min="1" value={net} onChange={(event) => setNet(event.target.value)} /></label><label><span>Tényleges bruttó</span><input type="number" min="1" value={gross} onChange={(event) => setGross(event.target.value)} /></label><label className="job-note"><span>Megjegyzés az auditnaplóhoz</span><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} /></label><button className="button-primary" onClick={save} disabled={update.isPending}>{update.isPending ? 'Mentés…' : 'Munka frissítése'}</button></div>}{error && <p className="form-error">{error}</p>}</article>
}

export default function PartnerPage() {
  usePageSeo('/partnerek')
  const { user, isAuthenticated, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true })
  const [tab, setTab] = useState<'offers' | 'jobs' | 'commissions'>('offers')
  const [claimError, setClaimError] = useState('')
  const utils = trpc.useUtils()
  const me = trpc.partner.me.useQuery(undefined, { enabled: isAuthenticated, retry: false })
  const partner = me.data?.partner
  const approved = partner?.status === 'approved'
  const offers = trpc.partner.available.useQuery(undefined, { enabled: approved, refetchInterval: 30000 })
  const jobs = trpc.partner.jobs.useQuery(undefined, { enabled: approved })
  const commissions = trpc.partner.commissions.useQuery(undefined, { enabled: approved })
  const refresh = async () => { await Promise.all([utils.partner.available.invalidate(), utils.partner.jobs.invalidate(), utils.partner.commissions.invalidate()]) }
  const claim = trpc.partner.claim.useMutation({ onSuccess: async () => { setClaimError(''); await refresh(); setTab('jobs') }, onError: async (err) => { setClaimError(err.message); await utils.partner.available.invalidate() } })

  if (isLoading || !isAuthenticated || !user) return <div className="page-loading"><span>ARDELIS</span><p>Partneri fiók betöltése…</p></div>
  if (me.isLoading) return <div className="page-loading"><span>ARDELIS</span><p>Partnerprofil betöltése…</p></div>
  return <div className="marketing-page dashboard-page"><SiteHeader action={<button className="header-partner-link" onClick={logout}><LogOut size={15} />Kijelentkezés</button>} />
    {!partner ? <Registration defaultName={user.name ?? ''} defaultEmail={user.email ?? ''} /> : <>
      <main className="partner-dashboard"><section className="dashboard-welcome"><div><span>PARTNERI MUNKATÉR</span><h1>{partner.companyName}</h1><p>{partner.contactName} · {partner.baseCounty} · {partner.trades.map((trade) => PRODUCT_LABELS[trade as ProductFamily]).join(' / ')}</p></div><b className={`partner-status ${partner.status}`}><i />{partnerStatus[partner.status]}</b></section>
        {partner.status !== 'approved' ? <section className="approval-state"><Clock3 size={34} /><h2>{partner.status === 'pending' ? 'A profilod jóváhagyásra vár.' : 'A partneri hozzáférés fel van függesztve.'}</h2><p>{partner.status === 'pending' ? 'Az adminisztrátor ellenőrzi a céges profilt. Jóváhagyáskor a profilodnak megfelelő, még kiosztatlan projektek is bekerülnek az ajánlataid közé.' : 'Amíg a fiók nem aktív, új projektajánlatot nem kapsz és a munkafolyamat nem módosítható.'}</p></section> : <>
          <div className="dashboard-stats"><article><BriefcaseBusiness /><span>Elérhető projekt</span><strong>{offers.data?.length ?? 0}</strong></article><article><Wrench /><span>Saját munka</span><strong>{jobs.data?.length ?? 0}</strong></article><article><HandCoins /><span>Aktuális jutalékkulcs</span><strong>{(me.data?.settings.commissionRateBp ?? 800) / 100}%</strong><small>{me.data?.settings.commissionBasis === 'gross' ? 'bruttó' : 'nettó'} munkaérték alapján</small></article></div>
          <nav className="dashboard-tabs"><button className={tab === 'offers' ? 'active' : ''} onClick={() => setTab('offers')}>Projektajánlatok <span>{offers.data?.length ?? 0}</span></button><button className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}>Saját munkák <span>{jobs.data?.length ?? 0}</span></button><button className={tab === 'commissions' ? 'active' : ''} onClick={() => setTab('commissions')}>Jutalékelszámolás <span>{commissions.data?.length ?? 0}</span></button></nav>
          {claimError && <p className="form-error dashboard-error" role="alert">{claimError}</p>}
          {tab === 'offers' && <section className="offer-list">{offers.isLoading ? <p>Ajánlatok betöltése…</p> : offers.data?.length ? offers.data.map((offer) => <article className="offer-card" key={offer.offerId}><div className="offer-index"><span>{offer.publicRef}</span><small>{new Date(offer.offeredAt).toLocaleString('hu-HU')}</small></div><div><h2>{PRODUCT_LABELS[offer.productFamily]}</h2><p><MapPin size={14} />{offer.county} · {offer.city} · {offer.postalCode}</p><ConfigBrief json={offer.configJson} />{offer.notes && <p className="offer-note">„{offer.notes}”</p>}</div><div className="offer-value"><span>Bruttó irányár</span><strong>{formatHuf(offer.estimateGross)}</strong><small>Nettó {formatHuf(offer.estimateNet)}</small><button className="button-primary" disabled={claim.isPending} onClick={() => claim.mutate({ leadId: offer.leadId })}>{claim.isPending ? 'Elfogadás…' : 'Elfogadom'}<ArrowRight size={16} /></button><small>Az ügyfél elérhetősége csak a sikeres elfogadás után válik láthatóvá.</small></div></article>) : <div className="empty-state"><FileText /><h2>Jelenleg nincs nyitott ajánlat.</h2><p>A lista 30 másodpercenként frissül. Csak a profilod megyéihez és szakmáihoz illő, még el nem fogadott projektek jelennek meg.</p></div>}</section>}
          {tab === 'jobs' && <section className="job-list">{jobs.data?.length ? (jobs.data as Job[]).map((job) => <JobCard key={job.id} job={job} onUpdated={refresh} />) : <div className="empty-state"><BriefcaseBusiness /><h2>Még nincs elfogadott munkád.</h2><p>A Projektajánlatok fülön az első sikeres elfogadás után itt jelenik meg az ügyfél és a munka.</p></div>}</section>}
          {tab === 'commissions' && <section className="commission-panel"><div className="commission-note"><HandCoins /><p>A jutalék csak az admin által megvalósultnak zárt munka után keletkezik. Ez offline elszámolási nyilvántartás, nem online bankkártyás fizetés.</p></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Projekt / munka ID</th><th>Alap</th><th>Kulcs</th><th>Jutalék</th><th>Állapot</th><th>Létrehozva</th></tr></thead><tbody>{commissions.data?.map((item) => <tr key={item.id}><td>#{item.leadId}</td><td>{formatHuf(item.baseAmount)} · {item.basis === 'net' ? 'nettó' : 'bruttó'}</td><td>{item.rateBp / 100}%</td><td><strong>{formatHuf(item.amount)}</strong></td><td>{commissionStatus[item.status]}</td><td>{new Date(item.createdAt).toLocaleDateString('hu-HU')}</td></tr>)}</tbody></table>{!commissions.data?.length && <div className="empty-state"><HandCoins /><h2>Még nincs jutaléktétel.</h2></div>}</div></section>}
        </>}
      </main>
    </>}
  </div>
}
