// Vevői ajánlatoldal: /ajanlat/:token — a titkos link a hitelesítés. Megtekintés, elfogadás (név + nyilatkozat), elutasítás.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Check, Clock, Printer, ShieldCheck, X } from 'lucide-react'
import { formatHuf } from '@/lib/pricing'
import { usePageSeo } from '@/lib/usePageSeo'
import { QUOTE_STATE_LABEL, type PublicQuote } from '@/lib/quotes'

const dateOnly = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'long' })
const dateTime = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'long', timeStyle: 'short' })

type Load = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ok'; quote: PublicQuote; newerToken: string | null }

export default function QuotePage() {
  const { token = '' } = useParams()
  usePageSeo('/ajanlat', { noindex: true, title: 'Árajánlat' })
  const [state, setState] = useState<Load>({ kind: 'loading' })
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    let alive = true
    fetch(`/api/quote?t=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json() as { ok: boolean; quote?: PublicQuote; newerToken?: string | null; error?: string }
        if (!alive) return
        setState(response.ok && data.ok && data.quote ? { kind: 'ok', quote: data.quote, newerToken: data.newerToken ?? null } : { kind: 'error', message: data.error ?? 'Az ajánlat nem található.' })
      })
      .catch(() => { if (alive) setState({ kind: 'error', message: 'A szerver nem érhető el. Próbáld újra később.' }) })
    return () => { alive = false }
  }, [token])

  const submit = async (action: 'accept' | 'decline', event?: FormEvent) => {
    event?.preventDefault()
    if (state.kind !== 'ok') return
    setFormError('')
    if (action === 'accept' && (name.trim().length < 2 || !consent)) { setFormError('Add meg a teljes nevedet, és jelöld be a nyilatkozatot.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'accept' ? { action, t: token, name: name.trim(), consent: true } : { action, t: token, reason: reason.trim() }) })
      const data = await response.json() as { ok: boolean; error?: string; acceptedAt?: string }
      if (!response.ok || !data.ok) { setFormError(data.error ?? 'A művelet nem sikerült.'); return }
      setState({ kind: 'ok', newerToken: null, quote: action === 'accept'
        ? { ...state.quote, status: 'accepted', acceptedAt: data.acceptedAt ?? new Date().toISOString(), signerName: name.trim() }
        : { ...state.quote, status: 'declined', declinedAt: new Date().toISOString() } })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch { setFormError('A szerver nem érhető el. Próbáld újra.') } finally { setBusy(false) }
  }

  if (state.kind === 'loading') return <div className="quote-shell"><p className="quote-note" role="status">Ajánlat betöltése…</p></div>
  if (state.kind === 'error') return <div className="quote-shell"><div className="quote-paper quote-empty"><h1>Az ajánlat nem érhető el</h1><p>{state.message}</p><p>Ha a levélben kapott linket használtad, kérj újat a kivitelezőtől.</p></div></div>

  const { quote, newerToken } = state
  const open = quote.status === 'sent'
  const vat = quote.totalGross - quote.totalNet
  return <div className="quote-shell">
    <article className="quote-paper" aria-label={`Árajánlat ${quote.label}`}>
      <header className="quote-head">
        <div>
          {quote.brand.logoUrl ? <img src={quote.brand.logoUrl} alt={quote.brand.name} height={34} /> : <strong className="quote-brand">{quote.brand.name}</strong>}
          <p>{quote.brand.legalName}{quote.brand.address ? ` · ${quote.brand.address}` : ''}</p>
          <p>{[quote.brand.phone, quote.brand.email, quote.brand.website].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="quote-meta">
          <span className="quote-label">ÁRAJÁNLAT</span>
          <strong>{quote.label}</strong>
          <small>Kelt: {dateOnly.format(new Date(quote.createdAt))}</small>
          <span className={`quote-badge is-${quote.status}`}>{QUOTE_STATE_LABEL[quote.status]}</span>
        </div>
      </header>

      {newerToken && <p className="quote-banner" role="status">Ennek az ajánlatnak van újabb változata. <Link to={`/ajanlat/${newerToken}`} reloadDocument>Megnyitás →</Link></p>}
      {quote.status === 'expired' && <p className="quote-banner is-warn" role="status">Ez az ajánlat {dateOnly.format(new Date(quote.validUntil))} napján lejárt. Kérj újat a kivitelezőtől.</p>}
      {quote.status === 'withdrawn' && <p className="quote-banner is-warn" role="status">Ezt az ajánlatot a kivitelező visszavonta.</p>}
      {quote.status === 'declined' && <p className="quote-banner" role="status">Az ajánlatot elutasítottad{quote.declinedAt ? ` (${dateTime.format(new Date(quote.declinedAt))})` : ''}.</p>}

      <section className="quote-grid">
        <div><span className="quote-label">Megrendelő</span><strong>{quote.customer.name}</strong>{quote.customer.address && <p>{quote.customer.address}</p>}</div>
        <div><span className="quote-label">Érvényesség</span><strong><Clock size={14} /> {dateOnly.format(new Date(quote.validUntil))}-ig</strong></div>
      </section>

      {quote.note && <p className="quote-notebox">{quote.note}</p>}

      <h2>A megrendelt pergola</h2>
      <dl className="quote-spec">{quote.spec.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>

      <h2>Árak</h2>
      <table className="quote-table">
        <thead><tr><th>Tétel</th><th className="num">Nettó</th></tr></thead>
        <tbody>
          {quote.lines.map((line, index) => <tr key={`${line.label}-${index}`}><td><b>{line.label}</b>{line.detail && <small>{line.detail}</small>}</td><td className="num">{formatHuf(line.amountNet)}</td></tr>)}
          <tr><td>Telepítés</td><td className="num">{formatHuf(quote.installationNet)}</td></tr>
          {quote.discountNet > 0 && <tr className="is-discount"><td>Engedmény</td><td className="num">−{formatHuf(quote.discountNet)}</td></tr>}
        </tbody>
        <tfoot>
          <tr><td>Nettó végösszeg</td><td className="num">{formatHuf(quote.totalNet)}</td></tr>
          <tr><td>ÁFA ({Math.round(quote.vatRate * 100)}%)</td><td className="num">{formatHuf(vat)}</td></tr>
          <tr className="is-total"><td>Bruttó végösszeg</td><td className="num">{formatHuf(quote.totalGross)}</td></tr>
        </tfoot>
      </table>

      <section className="quote-deposit">
        <div><span className="quote-label">Foglaló ({quote.depositPercent}%)</span><strong>{formatHuf(quote.depositGross)}</strong><small>Fennmaradó összeg: {formatHuf(quote.totalGross - quote.depositGross)}</small></div>
        {quote.paymentInfo && <p>{quote.paymentInfo}</p>}
      </section>

      {quote.terms && <><h2>Feltételek</h2><p className="quote-terms">{quote.terms}</p></>}

      {quote.status === 'accepted' && <section className="quote-signed" aria-live="polite">
        <ShieldCheck size={22} />
        <div><strong>Elfogadva</strong>
          <p>{quote.signerName} · {quote.acceptedAt ? dateTime.format(new Date(quote.acceptedAt)) : ''}</p>
          <small>Egyszerű elektronikus aláírás · dokumentum-ujjlenyomat (SHA-256): {quote.hash.slice(0, 16)}…</small></div>
      </section>}

      {open && <form className="quote-sign" onSubmit={(event) => void submit('accept', event)} noValidate>
        <h2>Elfogadás</h2>
        <label>Teljes neved (ez az aláírásod)<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={120} placeholder="pl. Minta Katalin" /></label>
        <label className="quote-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Elfogadom a(z) {quote.label} számú ajánlatot ({formatHuf(quote.totalGross)} bruttó), és tudomásul veszem, hogy a foglaló {formatHuf(quote.depositGross)}.</span></label>
        {formError && <p className="quote-error" role="alert">{formError}</p>}
        <div className="quote-actions">
          <button type="submit" className="quote-btn primary" disabled={busy}><Check size={16} />{busy ? 'Mentés…' : 'Elfogadom az ajánlatot'}</button>
          <button type="button" className="quote-btn" onClick={() => window.print()}><Printer size={16} />Nyomtatás / PDF</button>
          <button type="button" className="quote-btn ghost" onClick={() => setDeclining((value) => !value)}><X size={16} />Elutasítom</button>
        </div>
        {declining && <div className="quote-decline">
          <label>Miért utasítod el? (nem kötelező)<textarea rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <button type="button" className="quote-btn danger" disabled={busy} onClick={() => void submit('decline')}>Elutasítás megerősítése</button>
        </div>}
        <small className="quote-fine">Az elfogadás egyszerű elektronikus aláírásnak minősül (név, időpont, IP-cím és a dokumentum ujjlenyomata rögzül); nem minősített eIDAS-aláírás.</small>
      </form>}
      {!open && <div className="quote-actions"><button type="button" className="quote-btn" onClick={() => window.print()}><Printer size={16} />Nyomtatás / PDF</button></div>}
    </article>
    {quote.platformCredit && <p className="quote-note">Az ajánlat a Lamelix konfigurátorral készült.</p>}
  </div>
}
