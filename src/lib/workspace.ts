// A gyártói munkaterület (src/components/admin/Workspace.tsx) tiszta segédfüggvényei: tesztelhetők, nem renderelnek.
import { getDisplayCurrency } from './money'
import { formatPrice } from './pricing'
import { ROOF_INFO } from './roofs'
import type { LeadRow } from './adminLeads'
import type { RoofType } from '../types/pergola'

export const DAY = 86_400_000
export const OPEN_STATUSES = new Set(['new', 'contacted', 'offered'])
export const compactMoney = (value: number) => (getDisplayCurrency() === 'HUF' && value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString('hu-HU', { maximumFractionDigits: 1 })} M Ft` : formatPrice(value))
export const roofName = (lead: LeadRow) => (lead.config?.roof ? ROOF_INFO[lead.config.roof as RoofType]?.name ?? lead.config.roof : null)
export const leadSize = (lead: LeadRow) => (lead.config?.width && lead.config?.depth ? `${lead.config.width.toLocaleString('hu-HU')} × ${lead.config.depth.toLocaleString('hu-HU')} m` : null)

/** Az érdeklődés 5 pöttye a lead-pontszámból (0–100); a kitöltött pöttyök a referenciához hasonló meleg→zöld skálán. */
export function interestDots(score: number) {
  return Math.max(score > 0 ? 1 : 0, Math.min(5, Math.ceil(score / 20)))
}

/** A konfigurátorban gyűjtött jelekből olvasható chipek (csak ami valóban megtörtént). */
export function engagementChips(lead: LeadRow): string[] {
  const e = lead.engagement ?? null
  const chips = [lead.source === 'konfigurator' ? 'Konfigurátor' : lead.source || 'Konfigurátor']
  if (e?.pdf) chips.push('PDF')
  if (e?.ar) chips.push('AR')
  if (e?.share) chips.push('Megosztás')
  if ((e?.visits ?? 0) >= 2) chips.push('Visszatérő')
  return chips
}

export interface Task { lead: LeadRow; title: string; why: string; overdue: boolean; weight: number }

/**
 * Mai teendők a státusz és a kor alapján: új → első hívás; kapcsolatban 3 nap után → utánkövetés;
 * ajánlat 5 nap után → nyomon követés. Lejárt, ha a határidő után még 2 napja nem mozdult.
 */
export function todayTasks(leads: LeadRow[], now: number): Task[] {
  // Az „új” a beérkezéstől számít; a többi a legutóbbi státuszváltástól (4.91). Régi soroknál, ahol ez még nincs
  // rögzítve, nem tudjuk, mióta áll az érdeklődő ebben az állapotban: ilyenkor nem jelöljük lejártnak, és nem állítunk
  // konkrét napszámot („X napja kiment”), mert az a beérkezés napja lenne.
  const since = (iso: string) => (now - new Date(iso).getTime()) / DAY
  return leads.flatMap((lead): Task[] => {
    if (lead.status === 'new') { const days = since(lead.created_at); return [{ lead, title: 'Első hívás', why: days < 1 ? 'Ma érkezett' : `${Math.floor(days)} napja vár`, overdue: days >= 2, weight: 3 + days }] }
    const changed = lead.status_changed_at ? since(lead.status_changed_at) : null
    const days = changed ?? since(lead.created_at)
    if (lead.status === 'contacted' && days > 3) return [{ lead, title: 'Utánkövetés', why: changed === null ? 'Még nincs ajánlat' : `${Math.floor(changed)} napja hívtuk, még nincs ajánlat`, overdue: changed !== null && changed > 5, weight: 2 }]
    if (lead.status === 'offered' && days > 5) return [{ lead, title: 'Ajánlat követése', why: changed === null ? 'Ajánlat kiment, válasz még nincs' : `${Math.floor(changed)} napja kiment`, overdue: changed !== null && changed > 7, weight: 2.5 }]
    return []
  }).sort((a, b) => b.weight - a.weight)
}

