// Az érdeklődő részletező paneljének „Ajánlat” blokkja: kiadott ajánlatok állapota + új ajánlat / új változat.
import { useState, type FormEvent } from 'react'
import { Check, Copy, Eye, FilePlus2, Send } from 'lucide-react'
import { EmptyArt } from '@/pages/AdminLeads'
import { formatHuf } from '@/lib/pricing'
import { QUOTE_STATE_COLOR, QUOTE_STATE_LABEL, type AdminQuote, type QuoteDraft } from '@/lib/quotes'

const dateFormat = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium' })
const dateTime = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })
const PAYMENT_KEY = 'lamelix.quote.paymentInfo'

const readStored = () => { try { return window.localStorage.getItem(PAYMENT_KEY) ?? '' } catch { return '' } }
const writeStored = (value: string) => { try { window.localStorage.setItem(PAYMENT_KEY, value) } catch { /* nincs tárhely */ } }

export interface QuoteApi {
  quotes: AdminQuote[]
  create: (draft: QuoteDraft) => Promise<{ ok: true; quote: AdminQuote; emailed: boolean; superseded: string | null } | { ok: false; error: string }>
  withdraw: (quote: AdminQuote) => Promise<boolean>
}

export default function QuoteSection({ leadRef, api }: { leadRef: string; api: QuoteApi }) {
  const mine = api.quotes
  const locked = mine.some((quote) => quote.status === 'accepted')
  const hasPending = mine.some((quote) => quote.status === 'sent')
  const [open, setOpen] = useState(false)
  const [validDays, setValidDays] = useState(30)
  const [depositPercent, setDepositPercent] = useState(30)
  const [discountNet, setDiscountNet] = useState(0)
  const [note, setNote] = useState('')
  const [paymentInfo, setPaymentInfo] = useState(readStored)
  const [sendEmail, setSendEmail] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setResult(null)
    const response = await api.create({ leadRef, validDays, depositPercent, discountNet, note, paymentInfo, sendEmail })
    setBusy(false)
    if (!response.ok) { setResult({ tone: 'error', text: response.error }); return }
    writeStored(paymentInfo)
    setOpen(false)
    setResult({ tone: 'ok', text: `${response.quote.label} kiadva${response.emailed ? ' és elküldve a vevőnek' : ' (e-mail nincs beállítva — másold ki a linket)'}${response.superseded ? `; a(z) ${response.superseded} felülírva` : ''}.` })
  }
  const copy = (quote: AdminQuote) => {
    void navigator.clipboard?.writeText(quote.url).then(() => { setCopied(quote.label); window.setTimeout(() => setCopied(''), 1400) }).catch(() => undefined)
  }

  return <section className="quote-admin" aria-label="Ajánlatok">
    <div className="field-label">Árajánlat</div>
    {mine.length === 0 && <div className="quote-admin-blank"><EmptyArt /><p className="quote-admin-empty">Még nem adtál ki ajánlatot ennek az érdeklődőnek.</p></div>}
    {mine.map((quote) => <div className="quote-row" key={`${quote.number}-${quote.version}`}>
      <div className="quote-row-main">
        <b>{quote.label}</b>
        <span className="pill" style={{ ['--pill' as string]: QUOTE_STATE_COLOR[quote.status] }}>{QUOTE_STATE_LABEL[quote.status]}</span>
        <strong>{formatHuf(quote.totalGross)}</strong>
      </div>
      <small>
        Kiadva: {dateFormat.format(new Date(quote.createdAt))} · érvényes: {dateFormat.format(new Date(quote.validUntil))}
        {quote.viewCount > 0 ? <> · <Eye size={11} /> {quote.viewCount}× megnyitva (utoljára {dateTime.format(new Date(quote.lastViewedAt ?? quote.firstViewedAt ?? quote.createdAt))})</> : ' · még nem nyitotta meg'}
        {quote.status === 'accepted' && quote.acceptedAt ? ` · aláírta: ${quote.signerName}, ${dateTime.format(new Date(quote.acceptedAt))} · foglaló: ${formatHuf(quote.depositGross)}` : ''}
        {quote.status === 'declined' && quote.declineReason ? ` · indok: ${quote.declineReason}` : ''}
      </small>
      <div className="quote-row-actions">
        <button type="button" className="btn" onClick={() => copy(quote)}>{copied === quote.label ? <Check size={14} /> : <Copy size={14} />}Link másolása</button>
        <a className="btn" href={quote.url} target="_blank" rel="noopener noreferrer">Megnyitás</a>
        {quote.status === 'sent' && <button type="button" className="btn ghost" onClick={() => void api.withdraw(quote)}>Visszavonás</button>}
      </div>
    </div>)}
    {result && <p className={`admin-message${result.tone === 'error' ? ' is-error' : ''}`} role={result.tone === 'error' ? 'alert' : 'status'}>{result.text}</p>}
    {!locked && !open && <button type="button" className="btn primary" onClick={() => setOpen(true)}><FilePlus2 size={15} />{mine.length === 0 ? 'Ajánlat készítése' : hasPending ? 'Új változat kiadása' : 'Új ajánlat kiadása'}</button>}
    {locked && <p className="quote-admin-empty">Elfogadott ajánlat van — új ajánlat nem adható ki.</p>}
    {open && <form className="quote-admin-form" onSubmit={(event) => void submit(event)}>
      <div className="quote-admin-fields">
        <label>Érvényesség (nap)<input type="number" min={1} max={180} value={validDays} onChange={(event) => setValidDays(Math.max(1, Math.min(180, Number(event.target.value) || 1)))} /></label>
        <label>Foglaló (%)<input type="number" min={0} max={100} value={depositPercent} onChange={(event) => setDepositPercent(Math.max(0, Math.min(100, Number(event.target.value) || 0)))} /></label>
        <label>Nettó engedmény (Ft)<input type="number" min={0} step={1000} value={discountNet} onChange={(event) => setDiscountNet(Math.max(0, Math.round(Number(event.target.value) || 0)))} /></label>
      </div>
      <label>Üzenet a vevőnek <small>(az ajánlaton látszik)</small><textarea rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="pl. A kivitelezés a foglaló beérkezése után 6–8 héten belül." /></label>
      <label>Fizetési tudnivalók <small>(számlaszám, kedvezményezett — megjegyzi a böngésző)</small><textarea rows={2} maxLength={600} value={paymentInfo} onChange={(event) => setPaymentInfo(event.target.value)} placeholder="Kedvezményezett: …, Számlaszám: …, Közlemény: az ajánlat száma" /></label>
      <label className="quote-admin-check"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} />E-mail küldése a vevőnek a linkkel</label>
      {hasPending && <p className="quote-admin-empty">A korábbi függő változat felülíródik, a vevő linkje jelzi az újabb változatot.</p>}
      <div className="quote-row-actions">
        <button type="submit" className="btn primary" disabled={busy}><Send size={14} />{busy ? 'Kiadás…' : 'Kiadás'}</button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Mégse</button>
      </div>
    </form>}
  </section>
}
