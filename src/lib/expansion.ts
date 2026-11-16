// Bővítés a tulajdonosi oldalról: a konfigurátor a felszerelt termékből indul, a meglévő szerkezet zárolt.
// A tokent nem tesszük az URL-be (analitika, előzmények): a böngészőfül munkamenet-tárolójába kerül, 2 óráig él,
// és csak akkor érvényes, ha a konfigurátor ?bovites=1 paraméterrel nyílik meg ugyanannál a gyártónál.
import type { ConfigStep } from '../types/pergola'
import type { PergolaConfig } from '../types/pergola'

const KEY = 'lamelix-expansion'
const TTL_MS = 2 * 60 * 60_000
export const EXPANSION_PARAM = 'bovites'

export interface ExpansionSession { tenantId: string; token: string; config: PergolaConfig; headline: string; at: number }

/** A bővítésben nem állítható lépések (a tető lépésben csak a tetőárnyékoló marad elérhető). */
export const LOCKED_STEPS: ConfigStep[] = ['size', 'mount', 'color']

export function startExpansion(session: Omit<ExpansionSession, 'at'>) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...session, at: Date.now() })) } catch { /* privát mód: a bővítés így nem indul */ }
}

export function readExpansion(tenantId: string, search = typeof window === 'undefined' ? '' : window.location.search, now = Date.now()): ExpansionSession | null {
  if (new URLSearchParams(search).get(EXPANSION_PARAM) !== '1') return null
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as ExpansionSession | null
    if (!raw || raw.tenantId !== tenantId || typeof raw.token !== 'string' || !raw.config || now - raw.at > TTL_MS) return null
    return raw
  } catch { return null }
}

export function clearExpansion() {
  try { sessionStorage.removeItem(KEY) } catch { /* privát mód */ }
}
