// Az admin dashboard adatai: az érdeklődők betöltése és a belőlük számolt mutatók (tiszta függvények).
import { useCallback, useEffect, useState } from 'react'

export interface LeadRow {
  ref: string; customer_name: string; email: string; phone: string; postal_code: string | null; city: string; region: string
  address: string | null; notes: string | null; estimate_gross: number; config_url: string; status: string; source: string
  created_at: string; config?: { roof?: string } | null
}

export const LEAD_STATUSES: [string, string][] = [['new', 'Új'], ['contacted', 'Kapcsolatba léptünk'], ['offered', 'Ajánlat kiment'], ['won', 'Megnyert'], ['lost', 'Elveszett']]
export const STATUS_COLORS: Record<string, string> = { new: '#d8ff72', contacted: '#9fb3a6', offered: '#ffc457', won: '#59d499', lost: '#ff8a80' }

export interface LeadStats {
  total: number
  fresh: number
  last7: number
  averageGross: number
  openValue: number
  winRate: number | null
  daily: { day: string; count: number }[]
  byStatus: { key: string; label: string; count: number }[]
  byRoof: { key: string; count: number }[]
  byPlace: { key: string; count: number }[]
}

const DAY = 86_400_000
const dayKey = (time: number) => new Date(time).toISOString().slice(0, 10)

const top = (counts: Map<string, number>, limit: number) => [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count }))

/** Mutatók az érdeklődőkből; `now` paraméter a tesztelhetőségért. */
export function computeLeadStats(leads: LeadRow[], now = Date.now(), days = 30): LeadStats {
  const perDay = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) perDay.set(dayKey(now - i * DAY), 0)
  const roofs = new Map<string, number>()
  const places = new Map<string, number>()
  let gross = 0
  let open = 0
  let last7 = 0
  for (const lead of leads) {
    const created = new Date(lead.created_at).getTime()
    const key = dayKey(created)
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1)
    if (now - created < 7 * DAY) last7 += 1
    gross += lead.estimate_gross
    if (['new', 'contacted', 'offered'].includes(lead.status)) open += lead.estimate_gross
    const roof = lead.config?.roof
    if (roof) roofs.set(roof, (roofs.get(roof) ?? 0) + 1)
    places.set(lead.city, (places.get(lead.city) ?? 0) + 1)
  }
  const won = leads.filter((lead) => lead.status === 'won').length
  const lost = leads.filter((lead) => lead.status === 'lost').length
  return {
    total: leads.length,
    fresh: leads.filter((lead) => lead.status === 'new').length,
    last7,
    averageGross: leads.length ? Math.round(gross / leads.length) : 0,
    openValue: open,
    winRate: won + lost > 0 ? won / (won + lost) : null,
    daily: [...perDay.entries()].map(([day, count]) => ({ day, count })),
    byStatus: LEAD_STATUSES.map(([key, label]) => ({ key, label, count: leads.filter((lead) => lead.status === key).length })),
    byRoof: top(roofs, 6),
    byPlace: top(places, 5),
  }
}

/** Az érdeklődők betöltése és státusz-módosítása (optimista frissítéssel). */
export function useLeads(token: string, onExpired: () => void) {
  const [leads, setLeads] = useState<LeadRow[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const response = await fetch('/api/admin-leads', { headers: { Authorization: `Bearer ${token}` } })
      if (response.status === 401) { onExpired(); return }
      const data = await response.json() as { ok: boolean; leads?: LeadRow[]; error?: string }
      if (!response.ok || !data.ok) { setError(data.error ?? 'Az érdeklődők betöltése nem sikerült.'); setLeads([]); return }
      setLeads(data.leads ?? [])
    } catch { setError('A szerver nem érhető el. Próbáld újra.'); setLeads([]) }
  }, [token, onExpired])
  useEffect(() => { void load() }, [load])

  const setStatus = useCallback(async (ref: string, status: string) => {
    let previous: LeadRow[] | null = null
    setLeads((rows) => { previous = rows; return rows?.map((row) => (row.ref === ref ? { ...row, status } : row)) ?? null })
    try {
      const response = await fetch('/api/admin-leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ref, status }) })
      if (!response.ok) throw new Error('save')
    } catch { setLeads(previous); setError('A státusz mentése nem sikerült.') }
  }, [token])

  return { leads, error, reload: load, setStatus }
}
