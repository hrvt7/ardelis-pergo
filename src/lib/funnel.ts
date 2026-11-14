// Gyártói tölcsér mérése (Vercel Web Analytics egyedi események). Süti és személyes adat nélkül.
// A megkereső e-mailek linkjeibe tett ?utm_source=…&utm_campaign=<cég> az első látogatáskor elmentődik a munkamenetre,
// és minden eseményhez hozzáadódik, így látszik, melyik e-mail hozta a látogatót, a demókattintást és a demókérést.
import { track } from '@vercel/analytics'

const KEY = 'lamelix-utm'
const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
export type FunnelEvent = 'demo_click' | 'live_demo_open' | 'demo_form_start' | 'demo_form_submit' | 'login_click' | 'hero_3d_use' | 'plan_select'

/** A munkamenet UTM-forrása (az első landoláskor rögzítve). */
export function funnelSource(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = sessionStorage.getItem(KEY)
    if (stored) return JSON.parse(stored) as Record<string, string>
    const params = new URLSearchParams(window.location.search)
    const source: Record<string, string> = {}
    for (const field of FIELDS) { const value = params.get(field); if (value) source[field] = value.slice(0, 80) }
    if (!source.utm_source && document.referrer && !document.referrer.startsWith(window.location.origin)) source.referrer = new URL(document.referrer).hostname
    sessionStorage.setItem(KEY, JSON.stringify(source))
    return source
  } catch { return {} }
}

/** Rövid, ember által olvasható forrás a demókérő e-mailhez (pl. „email / deltapergola”). */
export function funnelSourceLabel() {
  const s = funnelSource()
  return [s.utm_source ?? s.referrer, s.utm_campaign].filter(Boolean).join(' / ')
}

export function funnel(name: FunnelEvent, props: Record<string, string | number | boolean> = {}) {
  if (import.meta.env.DEV || import.meta.env.VITE_PREVIEW_MODE) return
  try { track(name, { ...funnelSource(), ...props }) } catch { /* a mérés sosem zavarja a látogatót */ }
}
