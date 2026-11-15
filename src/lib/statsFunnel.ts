// Látogatottsági tölcsér névtelen napi számlálókból. React nélkül: a gyártói admin és a havi riport (Edge) is használja.

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


/** Lépésenkénti elérés (hány munkamenet jutott el az adott lépésig) és a 3D betöltési idő sávjai, az eseményszámokból. */
export const STEP_REACH: [string, string][] = [['open', 'Típus'], ['step_mount', 'Méret'], ['step_roof', 'Tető'], ['step_sides', 'Oldalak'], ['step_color', 'Szín'], ['step_extras', 'Komfort'], ['step_summary', 'Összegzés']]
export const SCENE_SPEED: [string, string][] = [['scene_fast', '4 mp alatt'], ['scene_mid', '4–10 mp'], ['scene_slow', '10 mp felett']]

export function eventTotals(events: EventRow[], keys: [string, string][]): { key: string; label: string; count: number }[] {
  const totals = new Map<string, number>()
  for (const event of events) totals.set(event.name, (totals.get(event.name) ?? 0) + event.count)
  return keys.map(([key, label]) => ({ key, label, count: totals.get(key) ?? 0 }))
}
