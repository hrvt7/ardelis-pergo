// Látogatottsági tölcsér a dashboardhoz: névtelen napi számlálókból.
import { useEffect, useState } from 'react'

export interface EventRow { day: string; name: string; count: number }

export const FUNNEL_STEPS: [string, string][] = [['open', 'Megnyitották'], ['configure', 'Módosították a tervet'], ['lead_view', 'Látták a felmérési űrlapot'], ['lead_start', 'Elkezdték kitölteni']]

export interface Funnel { steps: { key: string; label: string; count: number; rate: number | null }[]; leads: number; conversion: number | null }

/** Tölcsér: lépésenkénti darabszám, az előző lépéshez mért arány, és a végső konverzió (érdeklődő / megnyitás). */
export function computeFunnel(events: EventRow[], leads: number): Funnel {
  const totals = new Map<string, number>()
  for (const event of events) totals.set(event.name, (totals.get(event.name) ?? 0) + event.count)
  const counts = [...FUNNEL_STEPS.map(([key]) => totals.get(key) ?? 0), leads]
  const labels = [...FUNNEL_STEPS, ['lead', 'Felmérést kértek']] as [string, string][]
  const steps = labels.map(([key, label], index) => ({ key, label, count: counts[index], rate: index === 0 || counts[index - 1] === 0 ? null : Math.min(1, counts[index] / counts[index - 1]) }))
  return { steps, leads, conversion: counts[0] > 0 ? Math.min(1, leads / counts[0]) : null }
}

/** Az elmúlt 30 nap eseményei; null = tölt, hiba esetén üres lista (a dashboard enélkül is működik). */
export function useStats(token: string) {
  const [events, setEvents] = useState<EventRow[] | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/admin-stats?days=30', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => (response.ok ? ((await response.json()) as { events: EventRow[] }).events : []))
      .catch(() => [] as EventRow[])
      .then((rows) => { if (alive) setEvents(rows) })
    return () => { alive = false }
  }, [token])
  return events
}
