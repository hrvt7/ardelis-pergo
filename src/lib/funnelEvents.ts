// Mérési események a lépésenkénti lemorzsolódáshoz és a betöltési időhöz (audit: mérőszámok).
// Csak névtelen, napi összesített számlálók: időbélyeg, azonosító vagy pontos ms-érték nem kerül tárolásra,
// a betöltési idő három sávba sorolva megy (gyors / közepes / lassú).
// FIGYELEM: a szerver (api/track) is importálja, ezért itt csak relatív/nem-alias import lehet.

/** A konfigurátor lépései, amelyekre belépést mérünk (a „Típus” az „open” eseménnyel azonos). */
export const STEP_EVENTS = ['step_mount', 'step_roof', 'step_sides', 'step_color', 'step_extras', 'step_summary'] as const
/** Az első használható 3D kép ideje sávokban: < 4 s, 4–10 s, > 10 s. */
export const SCENE_EVENTS = ['scene_fast', 'scene_mid', 'scene_slow'] as const
/** Sikertelen beküldési kísérlet az ajánlatkérő űrlapon (kliens- vagy szerveroldali hiba). */
export const FORM_EVENTS = ['lead_error'] as const

export const FUNNEL_EVENTS = [...STEP_EVENTS, ...SCENE_EVENTS, ...FORM_EVENTS] as const
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]

export function stepEvent(step: string): FunnelEvent | null {
  const name = `step_${step}`
  return (STEP_EVENTS as readonly string[]).includes(name) ? (name as FunnelEvent) : null
}

export function sceneEvent(ms: number): FunnelEvent {
  return ms < 4000 ? 'scene_fast' : ms <= 10000 ? 'scene_mid' : 'scene_slow'
}

/** A 3D jelenet ezt az eseményt küldi a window-ra, amikor először látható (detail: ms a lap betöltése óta). */
export const SCENE_READY_EVENT = 'lamelix:scene-ready'
