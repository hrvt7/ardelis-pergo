// Az admin dashboard adatai: az érdeklődők betöltése és a belőlük számolt mutatók (tiszta függvények).
import { useCallback, useEffect, useState } from 'react'
import { scoreLead, TIER_LABELS, type LeadEngagement } from './leadScore'

export interface LeadRow {
  ref: string; customer_name: string; email: string; phone: string; postal_code: string | null; city: string; region: string
  address: string | null; notes: string | null; estimate_gross: number; config_url: string; status: string; source: string
  created_at: string; config?: { roof?: string; width?: number; depth?: number } | null; owner_note?: string | null
  /** Viselkedési jelek a lead-pontozáshoz; régi leadeknél hiányzik. */
  engagement?: LeadEngagement | null
  /** Automatikus utánkövetés: mikor ment ki a vevői emlékeztető, illetve a gyártói jelzés. */
  followup_sent_at?: string | null
  reminder_sent_at?: string | null
}

export const LEAD_STATUSES: [string, string][] = [['new', 'Új'], ['contacted', 'Kapcsolatba léptünk'], ['offered', 'Ajánlat kiment'], ['won', 'Megnyert'], ['lost', 'Elveszett']]
export const STATUS_COLORS: Record<string, string> = { new: '#d8ff72', contacted: '#9fb3a6', offered: '#ffc457', won: '#59d499', lost: '#ff8a80' }

export interface LeadStats {
  total: number
  fresh: number
  last7: number
  last30: number
  prev7: number
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
  let last30 = 0
  let prev7 = 0
  for (const lead of leads) {
    const created = new Date(lead.created_at).getTime()
    const key = dayKey(created)
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1)
    if (now - created < 7 * DAY) last7 += 1
    if (now - created < 30 * DAY) last30 += 1
    if (now - created >= 7 * DAY && now - created < 14 * DAY) prev7 += 1
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
    last30,
    prev7,
    averageGross: leads.length ? Math.round(gross / leads.length) : 0,
    openValue: open,
    winRate: won + lost > 0 ? won / (won + lost) : null,
    daily: [...perDay.entries()].map(([day, count]) => ({ day, count })),
    byStatus: LEAD_STATUSES.map(([key, label]) => ({ key, label, count: leads.filter((lead) => lead.status === key).length })),
    byRoof: top(roofs, 6),
    byPlace: top(places, 5),
  }
}

/** Az értékesítési csatorna szakaszai és a lezárási esély (becslés, nem garancia): ebből jön a súlyozott várható bevétel. */
export const STAGE_ODDS: Record<string, number> = { new: 0.1, contacted: 0.25, offered: 0.55 }

export interface Pipeline { stages: { key: string; label: string; count: number; value: number; odds: number }[]; openValue: number; forecast: number; wonValue: number }

/** Csatorna: szakaszonként darab és érték, a súlyozott várható bevétel és a megnyert érték. */
export function computePipeline(leads: LeadRow[]): Pipeline {
  const stages = LEAD_STATUSES.filter(([key]) => key in STAGE_ODDS).map(([key, label]) => {
    const rows = leads.filter((lead) => lead.status === key)
    return { key, label, count: rows.length, value: rows.reduce((sum, lead) => sum + lead.estimate_gross, 0), odds: STAGE_ODDS[key] }
  })
  return {
    stages,
    openValue: stages.reduce((sum, stage) => sum + stage.value, 0),
    forecast: Math.round(stages.reduce((sum, stage) => sum + stage.value * stage.odds, 0)),
    wonValue: leads.filter((lead) => lead.status === 'won').reduce((sum, lead) => sum + lead.estimate_gross, 0),
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

  const update = useCallback(async (ref: string, patch: { status?: string; ownerNote?: string }) => {
    let previous: LeadRow[] | null = null
    setLeads((rows) => { previous = rows; return rows?.map((row) => (row.ref === ref ? { ...row, ...(patch.status !== undefined && { status: patch.status }), ...(patch.ownerNote !== undefined && { owner_note: patch.ownerNote.trim() || null }) } : row)) ?? null })
    try {
      const response = await fetch('/api/admin-leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ref, ...patch }) })
      if (!response.ok) throw new Error('save')
    } catch { setLeads(previous); setError('A mentés nem sikerült.') }
  }, [token])

  return { leads, error, reload: load, update }
}

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`

/** CSV az érdeklődőkről (Excel-barát: pontosvessző, UTF-8 BOM). */
export function leadsToCsv(leads: LeadRow[]): string {
  const statusLabel = Object.fromEntries(LEAD_STATUSES)
  const header = ['Azonosító', 'Dátum', 'Név', 'Telefon', 'E-mail', 'Irányítószám', 'Település', 'Megye', 'Cím', 'Bruttó irányár', 'Státusz', 'Pontszám', 'Érdeklődés', 'Vevő megjegyzése', 'Belső megjegyzés', 'Konfiguráció']
  const rows = leads.map((lead) => { const score = scoreLead(lead); return [lead.ref, lead.created_at.slice(0, 10), lead.customer_name, lead.phone, lead.email, lead.postal_code, lead.city, lead.region, lead.address, lead.estimate_gross, statusLabel[lead.status] ?? lead.status, score.score, TIER_LABELS[score.tier], lead.notes, lead.owner_note, lead.config_url] })
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}`
}

/** A név monogramja az avatarhoz. */
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'

/** „2 órája”, „tegnap”, „3 napja” — a lista olvashatóságáért. */
export function timeAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'most'
  if (minutes < 60) return `${minutes} perce`
  if (minutes < 1440) return `${Math.round(minutes / 60)} órája`
  const days = Math.round(minutes / 1440)
  return days === 1 ? 'tegnap' : days < 31 ? `${days} napja` : new Date(iso).toLocaleDateString('hu-HU')
}
