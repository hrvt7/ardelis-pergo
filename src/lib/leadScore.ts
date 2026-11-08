// Lead-pontozás: mennyire „forró” egy érdeklődő a beküldéskor csatolt viselkedési jelek és az űrlap alapján.
// Tiszta függvények (szerver és admin is használja); a jelek csak a vevő hozzájárulásával, a kérelemmel együtt érkeznek.

/** A konfigurátorban gyűjtött, névtelen viselkedési jelek — a kérelemhez csatolva. */
export interface LeadEngagement {
  /** Letöltötte a PDF-összefoglalót. */
  pdf?: boolean
  /** Megnyitotta az AR-nézetet (vagy a QR-kódját). */
  ar?: boolean
  /** Megosztható hivatkozást vagy szöveges összefoglalót másolt. */
  share?: boolean
  /** Elmentett legalább egy tervváltozatot. */
  saved?: boolean
  /** Hány különböző lépést járt be a hatból. */
  steps?: number
  /** Hányszor nyitotta meg a konfigurátort (külön munkamenetben) a beküldésig. */
  visits?: number
  /** Percek a konfigurátorban a beküldésig (ebben a munkamenetben). */
  minutes?: number
}

export type LeadTier = 'hot' | 'warm' | 'cold'

export interface LeadScore {
  /** 0–100. */
  score: number
  tier: LeadTier
  /** Rövid, olvasható indokok a gyártónak („Letöltötte a PDF-et”). */
  reasons: string[]
  /** Nincs viselkedési adat (régi vagy külső lead): a pont csak az űrlapból jön. */
  blind: boolean
}

export const TIER_LABELS: Record<LeadTier, string> = { hot: 'Forró', warm: 'Meleg', cold: 'Hideg' }
export const TIER_COLORS: Record<LeadTier, string> = { hot: '#ff8a65', warm: '#ffc457', cold: '#9fb3a6' }

export interface ScoreInput {
  estimate_gross: number
  notes?: string | null
  address?: string | null
  engagement?: LeadEngagement | null
}

const HOT = 55
const WARM = 30

/**
 * Pontszám: viselkedés (max ~80) + űrlap (max ~15) + tervérték (max 10), 100-ra vágva.
 * A súlyok tapasztalati becslések: a PDF és a visszatérés a legerősebb vásárlási jel, a nagy tervérték önmagában gyenge.
 */
export function scoreLead(lead: ScoreInput): LeadScore {
  const e = lead.engagement ?? null
  const reasons: string[] = []
  let score = 0
  const add = (points: number, reason: string) => { score += points; reasons.push(reason) }

  if (e) {
    if (e.pdf) add(20, 'Letöltötte a PDF-összefoglalót')
    if ((e.visits ?? 0) >= 2) add(15, `${e.visits}. alkalommal járt a konfigurátorban`)
    if (e.ar) add(15, 'Megnézte AR-ban, a saját kertjében')
    if (e.share) add(10, 'Megosztotta a tervet')
    if ((e.steps ?? 0) >= 6) add(10, 'Minden lépést végigjárt')
    else if ((e.steps ?? 0) >= 4) add(5, 'A lépések többségét bejárta')
    if (e.saved) add(5, 'Elmentett tervváltozatot')
    if ((e.minutes ?? 0) >= 5) add(5, `${Math.round(e.minutes!)} percet tervezett`)
  }
  const notes = lead.notes?.trim() ?? ''
  if (notes.length >= 20) add(10, 'Részletes megjegyzést írt')
  else if (notes.length > 0) add(5, 'Írt megjegyzést')
  if (lead.address?.trim()) add(5, 'Megadta a pontos címet')
  if (lead.estimate_gross >= 4_000_000) add(10, 'Nagy értékű terv')
  else if (lead.estimate_gross >= 2_000_000) add(5, 'Közepes értékű terv')

  score = Math.min(100, score)
  return { score, tier: score >= HOT ? 'hot' : score >= WARM ? 'warm' : 'cold', reasons, blind: !e }
}

/** Rendezés: forró elöl, azon belül pontszám, majd a hívó oldalon dátum. */
export const byScore = <T extends ScoreInput>(a: T, b: T) => scoreLead(b).score - scoreLead(a).score
