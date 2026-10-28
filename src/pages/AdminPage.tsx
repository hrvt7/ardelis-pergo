import { useState } from 'react'
import { Activity, CheckCircle2, ChevronDown, CircleDollarSign, FileClock, HandCoins, LogOut, ShieldCheck, UsersRound, XCircle } from 'lucide-react'
import SiteHeader from '@/components/SiteChrome'
import { useAuth } from '@/hooks/useAuth'
import { formatHuf } from '@/lib/pricing'
import { trpc } from '@/providers/trpc'
import { LEAD_STATUS_LABELS, PRODUCT_LABELS, type LeadStatus, type ProductFamily } from '@contracts/catalog'
import { usePageSeo } from '@/lib/usePageSeo'

const commissionLabels = { due: 'Elszámolandó', invoiced: 'Számlázva', settled: 'Rendezve' }
type AdminLead = {
  id: number; publicRef: string; productFamily: ProductFamily; configJson: string; estimateNet: number; estimateGross: number
  customerName: string; email: string; phone: string; postalCode: string; city: string; county: string; address: string | null; notes: string | null
  status: LeadStatus; acceptedPartnerId: number | null; actualNet: number | null; actualGross: number | null; createdAt: Date
}

function AuditTrail({ leadId }: { leadId: number }) {
  const events = trpc.admin.leadEvents.useQuery({ leadId })
  return <div className="audit-trail"><h4><FileClock size={15} />Auditnapló</h4>{events.isLoading ? <p>Események betöltése…</p> : events.data?.map((event) => <div key={event.id}><i /><time>{new Date(event.createdAt).toLocaleString('hu-HU')}</time><strong>{event.event}</strong><span>{event.fromStatus ?? '—'} → {event.toStatus ?? '—'}</span><p>{event.note}</p></div>)}</div>
}

function LeadRow({ lead, onChanged }: { lead: AdminLead; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [net, setNet] = useState(String(lead.actualNet ?? lead.estimateNet))
  const [gross, setGross] = useState(String(lead.actualGross ?? lead.estimateGross))
  const [cancelNote, setCancelNote] = useState('')
  const [message, setMessage] = useState('')
  const complete = trpc.admin.completeLead.useMutation({ onSuccess: (data) => { setMessage(`Munka lezárva. Jutalék: ${formatHuf(data.amount)}.`); onChanged() }, onError: (err) => setMessage(err.message) })
  const cancel = trpc.admin.cancelLead.useMutation({ onSuccess: () => { setMessage('A projekt lezárult, az ajánlatok visszavonva.'); onChanged() }, onError: (err) => setMessage(err.message) })
  const locked = ['completed', 'cancelled'].includes(lead.status)
  return <><tr><td><button className="lead-ref-button" onClick={() => setOpen(!open)}>{lead.publicRef}<ChevronDown className={open ? 'rotated' : ''} size={15} /></button><small>{new Date(lead.createdAt).toLocaleString('hu-HU')}</small></td><td>{PRODUCT_LABELS[lead.productFamily]}</td><td>{lead.county}<small>{lead.city}</small></td><td><span className={`status status-${lead.status}`}>{LEAD_STATUS_LABELS[lead.status]}</span><small>{lead.acceptedPartnerId ? `Partner #${lead.acceptedPartnerId}` : 'Nincs elfogadó'}</small></td><td>{formatHuf(lead.estimateGross)}<small>nettó {formatHuf(lead.estimateNet)}</small></td></tr>{open && <tr className="admin-lead-detail"><td colSpan={5}><div className="admin-lead-columns"><section><h3>Ügyfél és helyszín</h3><p><strong>{lead.customerName}</strong><br />{lead.email}<br />{lead.phone}</p><p>{lead.postalCode} {lead.city}, {lead.county}<br />{lead.address}</p><p>{lead.notes}</p></section><section><h3>Konfiguráció</h3><pre>{JSON.stringify(JSON.parse(lead.configJson), null, 2)}</pre></section><section><h3>Munkazárás</h3>{locked ? <p>A projekt {LEAD_STATUS_LABELS[lead.status].toLowerCase()} állapotban van.</p> : <><label><span>Tényleges nettó</span><input type="number" min="1" value={net} onChange={(event) => setNet(event.target.value)} /></label><label><span>Tényleges bruttó</span><input type="number" min="1" value={gross} onChange={(event) => setGross(event.target.value)} /></label><button className="button-primary" disabled={complete.isPending || !lead.acceptedPartnerId} onClick={() => complete.mutate({ leadId: lead.id, actualNet: Number(net), actualGross: Number(gross) })}><CheckCircle2 size={15} />Megvalósult + jutalék</button><label><span>Megszakítás indoka</span><input value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} placeholder="Kötelező indoklás" /></label><button className="danger-button" disabled={cancel.isPending || cancelNote.trim().length < 3} onClick={() => cancel.mutate({ leadId: lead.id, note: cancelNote })}><XCircle size={15} />Projekt megszakítása</button></>}{message && <p className="admin-action-message">{message}</p>}</section></div><AuditTrail leadId={lead.id} /></td></tr>}</>
}

function CommissionSettingsForm({ current, onChanged, onMessage }: {
  current: { commissionRateBp: number; commissionBasis: 'net' | 'gross' }
  onChanged: () => Promise<void>
  onMessage: (message: string) => void
}) {
  const [rate, setRate] = useState(String(current.commissionRateBp / 100))
  const [basis, setBasis] = useState<'net' | 'gross'>(current.commissionBasis)
  const save = trpc.admin.setCommissionSettings.useMutation({
    onSuccess: async () => { onMessage('Jutalékbeállítás mentve.'); await onChanged() },
    onError: (error) => onMessage(error.message),
  })
  return <form className="commission-settings" onSubmit={(event) => {
    event.preventDefault()
    save.mutate({ commissionRateBp: Math.round(Number(rate) * 100), commissionBasis: basis })
  }}><div><CircleDollarSign /><span>GLOBÁLIS JUTALÉKSZABÁLY</span><h2>Megvalósult munka utáni elszámolás</h2><p>A beállítás az ezután lezárt munkákra érvényes. A már létrehozott jutaléktételek megőrzik saját kulcsukat és alapjukat.</p></div><label><span>Jutalékkulcs</span><div><input type="number" min="0" max="50" step="0.1" required value={rate} onChange={(event) => setRate(event.target.value)} /><span>%</span></div></label><label><span>Jutalékalap</span><select value={basis} onChange={(event) => setBasis(event.target.value as 'net' | 'gross')}><option value="net">Nettó munkaérték</option><option value="gross">Bruttó munkaérték</option></select></label><button className="button-primary" disabled={save.isPending}>Beállítás mentése</button><small>Aktuális: {current.commissionRateBp / 100}% · {current.commissionBasis === 'gross' ? 'bruttó' : 'nettó'} alap</small></form>
}

export default function AdminPage() {
  usePageSeo('/admin')
  const { user, isAuthenticated, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true })
  const [tab, setTab] = useState<'partners' | 'leads' | 'commissions'>('partners')
  const [message, setMessage] = useState('')
  const overview = trpc.admin.overview.useQuery(undefined, { enabled: isAuthenticated && user?.role === 'admin', retry: false })
  const utils = trpc.useUtils()
  const refresh = async () => { await utils.admin.overview.invalidate() }
  const partnerStatus = trpc.admin.setPartnerStatus.useMutation({ onSuccess: async (data) => { setMessage(`Partnerállapot mentve. Új ajánlat: ${data.offersCreated}.`); await refresh() }, onError: (err) => setMessage(err.message) })
  const commission = trpc.admin.setCommissionStatus.useMutation({ onSuccess: refresh, onError: (err) => setMessage(err.message) })

  if (isLoading || !isAuthenticated || !user) return <div className="page-loading"><span>ARDELIS</span><p>Adminisztráció betöltése…</p></div>
  if (user.role !== 'admin') return <div className="marketing-page dashboard-page"><SiteHeader /><main className="access-denied"><ShieldCheck size={42} /><span>403 / ADMIN</span><h1>Ehhez a felülethez adminisztrátori jogosultság szükséges.</h1><p>A partneri fiókod nem látja a többi partner vagy ügyfél adatait.</p></main></div>
  return <div className="marketing-page dashboard-page admin-page"><SiteHeader action={<button className="header-partner-link" onClick={logout}><LogOut size={15} />Kijelentkezés</button>} /><main className="partner-dashboard"><section className="dashboard-welcome"><div><span>PLATFORM CONTROL / ADMIN</span><h1>Projekt- és partnerfelügyelet</h1><p>{user.name ?? user.email} · teljes jogosultságú adminisztrátor</p></div><b className="partner-status approved"><i />Admin</b></section>
    <div className="dashboard-stats"><article><UsersRound /><span>Partnerprofil</span><strong>{overview.data?.partners.length ?? 0}</strong></article><article><Activity /><span>Összes projekt</span><strong>{overview.data?.leads.length ?? 0}</strong></article><article><HandCoins /><span>Nyitott jutalék</span><strong>{formatHuf(overview.data?.commissions.filter((item) => item.status !== 'settled').reduce((sum, item) => sum + item.amount, 0) ?? 0)}</strong></article></div>
    {overview.error && <p className="form-error dashboard-error">{overview.error.message}</p>}
    <nav className="dashboard-tabs"><button className={tab === 'partners' ? 'active' : ''} onClick={() => setTab('partners')}>Partnerek <span>{overview.data?.partners.length ?? 0}</span></button><button className={tab === 'leads' ? 'active' : ''} onClick={() => setTab('leads')}>Projektek <span>{overview.data?.leads.length ?? 0}</span></button><button className={tab === 'commissions' ? 'active' : ''} onClick={() => setTab('commissions')}>Jutalék és beállítások <span>{overview.data?.commissions.length ?? 0}</span></button></nav>
    {message && <div className="admin-toast" role="status">{message}<button onClick={() => setMessage('')}>Bezárás</button></div>}
    {overview.isLoading ? <div className="empty-state">Adminadatok betöltése…</div> : <>
      {tab === 'partners' && <section className="admin-partner-list">{overview.data?.partners.length ? overview.data.partners.map((partner) => <article key={partner.id}><div><span>PARTNER #{partner.id} · {partner.baseCounty}</span><h2>{partner.companyName}</h2><p>{partner.contactName} · {partner.email} · {partner.phone}</p><p>{partner.headquarters}{partner.taxNumber ? ` · ${partner.taxNumber}` : ''}</p></div><div><strong>Szakmák</strong><p>{partner.trades.map((trade) => PRODUCT_LABELS[trade as ProductFamily]).join(' / ')}</p><strong>Megyék</strong><p>{partner.counties.join(', ')}</p>{partner.introduction && <p>{partner.introduction}</p>}</div><label><span>Jogosultság</span><select value={partner.status} disabled={partnerStatus.isPending} onChange={(event) => partnerStatus.mutate({ partnerId: partner.id, status: event.target.value as 'pending' | 'approved' | 'suspended' })}><option value="pending">Jóváhagyásra vár</option><option value="approved">Jóváhagyott</option><option value="suspended">Felfüggesztett</option></select><small>Jóváhagyáskor a várakozó, illeszkedő projektek automatikusan kiosztásra kerülnek.</small></label></article>) : <div className="empty-state"><UsersRound /><h2>Még nincs partnerregisztráció.</h2></div>}</section>}
      {tab === 'leads' && <section className="data-table-wrap"><table className="data-table admin-leads"><thead><tr><th>Projekt</th><th>Termék</th><th>Helyszín</th><th>Állapot / partner</th><th>Irányár</th></tr></thead><tbody>{overview.data?.leads.map((lead) => <LeadRow key={lead.id} lead={lead as AdminLead} onChanged={refresh} />)}</tbody></table>{!overview.data?.leads.length && <div className="empty-state"><Activity /><h2>Még nincs rögzített projekt.</h2></div>}</section>}
      {tab === 'commissions' && <section className="commission-panel"><CommissionSettingsForm key={`${overview.data?.settings.commissionRateBp ?? 800}-${overview.data?.settings.commissionBasis ?? 'net'}`} current={overview.data?.settings ?? { commissionRateBp: 800, commissionBasis: 'net' }} onChanged={refresh} onMessage={setMessage} /><div className="commission-note"><HandCoins /><p>Offline számlázási nyilvántartás: due → invoiced → settled. Nincs online bankkártyás behajtás.</p></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Munka / partner</th><th>Elszámolási alap</th><th>Kulcs</th><th>Jutalék</th><th>Állapot</th></tr></thead><tbody>{overview.data?.commissions.map((item) => <tr key={item.id}><td>#{item.leadId} / #{item.partnerId}</td><td>{formatHuf(item.baseAmount)} · {item.basis}</td><td>{item.rateBp / 100}%</td><td><strong>{formatHuf(item.amount)}</strong></td><td><select value={item.status} onChange={(event) => commission.mutate({ commissionId: item.id, status: event.target.value as 'due' | 'invoiced' | 'settled' })}><option value="due">{commissionLabels.due}</option><option value="invoiced">{commissionLabels.invoiced}</option><option value="settled">{commissionLabels.settled}</option></select></td></tr>)}</tbody></table>{!overview.data?.commissions.length && <div className="empty-state"><HandCoins /><h2>Még nincs jutaléktétel.</h2></div>}</div></section>}
    </>}
  </main></div>
}
