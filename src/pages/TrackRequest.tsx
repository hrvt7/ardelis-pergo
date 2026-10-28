import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Search } from 'lucide-react'
import SiteHeader, { SiteFooter } from '@/components/SiteChrome'
import { trpc } from '@/providers/trpc'
import { PRODUCT_LABELS, type LeadStatus } from '@contracts/catalog'
import { usePageSeo } from '@/lib/usePageSeo'

const CUSTOMER_STATUS_LABELS: Record<LeadStatus, string> = {
  submitted: 'Kérelem rögzítve',
  offered: 'Feldolgozás alatt',
  accepted: 'Egyeztetés alatt',
  surveyed: 'Felmérés megtörtént',
  quoted: 'Árajánlat készült',
  won: 'Megrendelve',
  completed: 'Megvalósult',
  cancelled: 'Kérelem lezárva',
}

export default function TrackRequest() {
  usePageSeo('/keresett')
  const [lookup, setLookup] = useState({ publicRef: '', email: '' })
  const [searched, setSearched] = useState(false)
  const query = trpc.lead.track.useQuery(lookup, { enabled: false, retry: false })
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSearched(true); await query.refetch()
  }
  return <div className="marketing-page track-page"><SiteHeader /><main className="track-layout"><section><div className="eyebrow"><span>PROJEKTKÖVETÉS</span><i />BIZTONSÁGOS LEKÉRDEZÉS</div><h1>Hol tart a<br /><em>kérelmed?</em></h1><p>Add meg a felmérési kérelem elküldésekor kapott AR-azonosítót és az űrlapon megadott e-mail-címet. Az azonosítás után a kérelem állapotát és a projekt településadatait jelenítjük meg.</p></section><section className="track-card"><form onSubmit={submit}><label><span>Projektazonosító</span><input required value={lookup.publicRef} onChange={(event) => setLookup({ ...lookup, publicRef: event.target.value.toUpperCase() })} placeholder="AR-2026-XXXXXXXX" /></label><label><span>E-mail-cím</span><input required type="email" value={lookup.email} onChange={(event) => setLookup({ ...lookup, email: event.target.value })} placeholder="nev@email.hu" /></label><button className="button-primary" disabled={query.isFetching}>{query.isFetching ? 'Lekérdezés…' : 'Állapot lekérdezése'}<Search size={16} /></button></form>{query.error && <p className="form-error" role="alert">A lekérdezés nem sikerült. Próbáld újra.</p>}{searched && !query.isFetching && query.data === null && <p className="track-empty" role="status">Ezzel az azonosítóval és e-mail-címmel nem találtunk projektet.</p>}{query.data && <div className="track-result" role="status"><CheckCircle2 size={28} /><span>{query.data.publicRef}</span><h2>{CUSTOMER_STATUS_LABELS[query.data.status]}</h2><dl><div><dt>Termék</dt><dd>{PRODUCT_LABELS[query.data.productFamily]}</dd></div><div><dt>Helyszín</dt><dd>{query.data.county} · {query.data.city}</dd></div><div><dt>Rögzítve</dt><dd>{new Date(query.data.createdAt).toLocaleDateString('hu-HU')}</dd></div></dl><small>A feltüntetett állapot nem minősül árajánlatnak vagy megrendelés-visszaigazolásnak.</small></div>}<a className="button-text" href="/studio/pergola">Új konfiguráció <ArrowRight size={16} /></a></section></main><SiteFooter /></div>
}
