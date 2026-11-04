// Névtelen konverziómérés a konfigurátorban: süti és azonosító nélkül, munkamenetenként egy-egy jelzés eseményenként.
// A "Do Not Track" beállítást tiszteletben tartja; hiba esetén csendben nem csinál semmit.
export type TrackName = 'open' | 'configure' | 'lead_view' | 'lead_start'

const sent = new Set<string>()

export function track(tenantId: string, name: TrackName) {
  if (import.meta.env.DEV || import.meta.env.VITE_PREVIEW_MODE) return
  try {
    if (navigator.doNotTrack === '1') return
    const key = `track:${tenantId}:${name}`
    if (sent.has(key) || sessionStorage.getItem(key)) return
    sent.add(key)
    sessionStorage.setItem(key, '1')
    void fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, name }), keepalive: true }).catch(() => undefined)
  } catch { /* privát mód: nincs mérés, nincs gond */ }
}
