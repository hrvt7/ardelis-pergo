// Ajánlatok kliensoldali típusai és hookjai (gyártói admin + vevői oldal).
import { useCallback, useEffect, useState } from 'react'

export type QuoteState = 'sent' | 'accepted' | 'declined' | 'superseded' | 'withdrawn' | 'expired'

export const QUOTE_STATE_LABEL: Record<QuoteState, string> = {
  sent: 'Kiküldve', accepted: 'Elfogadva', declined: 'Elutasítva', superseded: 'Felülírva', withdrawn: 'Visszavonva', expired: 'Lejárt',
}
export const QUOTE_STATE_COLOR: Record<QuoteState, string> = {
  sent: '#e0a526', accepted: '#2fa46b', declined: '#d1564f', superseded: '#8a979d', withdrawn: '#8a979d', expired: '#8a979d',
}

export interface AdminQuote {
  number: string
  version: number
  label: string
  leadRef: string
  status: QuoteState
  customerName: string
  totalGross: number
  depositGross: number
  depositPercent: number
  validUntil: string
  createdAt: string
  viewCount: number
  firstViewedAt: string | null
  lastViewedAt: string | null
  acceptedAt: string | null
  signerName: string | null
  declinedAt: string | null
  declineReason: string | null
  url: string
}

export interface PublicQuote {
  number: string
  version: number
  label: string
  status: QuoteState
  createdAt: string
  validUntil: string
  brand: { name: string; legalName: string; phone: string | null; email: string | null; address: string | null; website: string | null; logoUrl: string | null }
  customer: { name: string; address: string | null }
  spec: [string, string][]
  lines: { label: string; detail: string; amountNet: number }[]
  subtotalNet: number
  installationNet: number
  discountNet: number
  totalNet: number
  totalGross: number
  vatRate: number
  depositPercent: number
  depositGross: number
  note: string | null
  paymentInfo: string | null
  terms: string | null
  hash: string
  acceptedAt: string | null
  signerName: string | null
  declinedAt: string | null
  platformCredit: boolean
}

export interface QuoteDraft {
  leadRef: string
  validDays: number
  depositPercent: number
  discountNet: number
  note: string
  paymentInfo: string
  sendEmail: boolean
}

export function useQuotes(token: string, onExpired: () => void) {
  const [quotes, setQuotes] = useState<AdminQuote[] | null>(null)
  const [error, setError] = useState('')
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin-quotes', { headers: { Authorization: `Bearer ${token}` } })
      if (response.status === 401) { onExpired(); return }
      const data = await response.json() as { ok: boolean; quotes?: AdminQuote[]; error?: string }
      if (!response.ok || !data.ok) { setQuotes([]); if (response.status !== 503) setError(data.error ?? 'Az ajánlatok betöltése nem sikerült.'); return }
      setQuotes(data.quotes ?? [])
    } catch { setQuotes([]) }
  }, [token, onExpired])
  useEffect(() => { void load() }, [load])

  const create = useCallback(async (draft: QuoteDraft): Promise<{ ok: true; quote: AdminQuote; emailed: boolean; superseded: string | null } | { ok: false; error: string }> => {
    try {
      const response = await fetch('/api/admin-quotes', { method: 'POST', headers, body: JSON.stringify(draft) })
      if (response.status === 401) { onExpired(); return { ok: false, error: 'A munkamenet lejárt.' } }
      const data = await response.json() as { ok: boolean; quote?: AdminQuote; emailed?: boolean; superseded?: string | null; error?: string }
      if (!response.ok || !data.ok || !data.quote) return { ok: false, error: data.error ?? 'Az ajánlat kiadása nem sikerült.' }
      void load()
      return { ok: true, quote: data.quote, emailed: Boolean(data.emailed), superseded: data.superseded ?? null }
    } catch { return { ok: false, error: 'A szerver nem érhető el. Próbáld újra.' } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, load, onExpired])

  const withdraw = useCallback(async (quote: AdminQuote) => {
    try {
      const response = await fetch('/api/admin-quotes', { method: 'PATCH', headers, body: JSON.stringify({ number: quote.number, version: quote.version, action: 'withdraw' }) })
      if (!response.ok) throw new Error('withdraw')
      await load()
      return true
    } catch { setError('A visszavonás nem sikerült.'); return false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, load])

  return { quotes, error, reload: load, create, withdraw }
}

/** Egy érdeklődő ajánlatai (legújabb elöl). */
export const quotesForLead = (quotes: AdminQuote[] | null, ref: string) => (quotes ?? []).filter((quote) => quote.leadRef === ref)
