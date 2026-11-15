// Látogatottsági tölcsér a dashboardhoz: névtelen napi számlálókból.
import { useEffect, useState } from 'react'

export { computeFunnel, FUNNEL_STEPS, type EventRow, type Funnel } from './statsFunnel'
import type { EventRow } from './statsFunnel'

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
