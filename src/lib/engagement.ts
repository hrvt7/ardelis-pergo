// Viselkedési jelek gyűjtése a konfigurátorban a lead-pontozáshoz (lásd leadScore.ts).
// Semmi nem megy ki a böngészőből: a jelek a munkamenet-tárban gyűlnek, és csak a felmérési kérelemmel
// együtt, a vevő hozzájárulásával kerülnek elküldésre. A látogatásszám a helyi tárban él (gyártónként).
import type { LeadEngagement } from './leadScore'

export type EngagementFlag = 'pdf' | 'ar' | 'share' | 'saved'

const sessionKey = (tenantId: string) => `pergo-engagement:${tenantId}`
const visitsKey = (tenantId: string) => `pergo-visits:${tenantId}`

interface Stored { flags: EngagementFlag[]; steps: string[]; startedAt: number }

function read(tenantId: string): Stored {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(sessionKey(tenantId)) ?? 'null')
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Stored).flags)) return parsed as Stored
  } catch { /* privát mód vagy sérült adat */ }
  return { flags: [], steps: [], startedAt: Date.now() }
}

function write(tenantId: string, data: Stored) {
  try { sessionStorage.setItem(sessionKey(tenantId), JSON.stringify(data)) } catch { /* privát mód */ }
}

/** Munkamenet kezdete: első megnyitáskor számolja a látogatást és indítja az órát. */
export function startEngagement(tenantId: string) {
  const current = read(tenantId)
  let started = false
  try { started = sessionStorage.getItem(sessionKey(tenantId)) !== null } catch { /* privát mód */ }
  if (!started) {
    write(tenantId, { ...current, startedAt: Date.now() })
    try { localStorage.setItem(visitsKey(tenantId), String((Number(localStorage.getItem(visitsKey(tenantId))) || 0) + 1)) } catch { /* privát mód */ }
  }
}

/** Egy jel bekapcsolása (PDF, AR, megosztás, mentés). */
export function noteEngagement(tenantId: string, flag: EngagementFlag) {
  const current = read(tenantId)
  if (current.flags.includes(flag)) return
  write(tenantId, { ...current, flags: [...current.flags, flag] })
}

/** Egy lépés bejárása. */
export function noteStep(tenantId: string, step: string) {
  const current = read(tenantId)
  if (current.steps.includes(step)) return
  write(tenantId, { ...current, steps: [...current.steps, step] })
}

/** A kérelemhez csatolandó jelek. */
export function readEngagement(tenantId: string, now = Date.now()): LeadEngagement {
  const current = read(tenantId)
  let visits = 1
  try { visits = Math.max(1, Number(localStorage.getItem(visitsKey(tenantId))) || 1) } catch { /* privát mód */ }
  return {
    pdf: current.flags.includes('pdf'),
    ar: current.flags.includes('ar'),
    share: current.flags.includes('share'),
    saved: current.flags.includes('saved'),
    steps: current.steps.length,
    visits: Math.min(99, visits),
    minutes: Math.min(600, Math.max(0, Math.round((now - current.startedAt) / 60_000))),
  }
}
