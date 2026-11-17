// Szervizjegy-munkalap és hibastatisztika: tiszta TypeScript (böngésző és szerver közös része).
// A statisztika leíró: darabszámok és arányok a rögzített adatokból. Okot nem állapít meg; kis mintánál ezt jelzi.
import type { InstallationComponent } from './installations'

export const SERVICE_STATUSES = ['new', 'in_progress', 'closed'] as const
export type ServiceStatus = typeof SERVICE_STATUSES[number]
export const SERVICE_OUTCOMES = ['fixed', 'temporary', 'not_fixed', 'no_fault'] as const
export type ServiceOutcome = typeof SERVICE_OUTCOMES[number]
export const SERVICE_OUTCOME_LABEL: Record<ServiceOutcome, string> = { fixed: 'Megjavítva', temporary: 'Ideiglenes megoldás', not_fixed: 'Nem javítható / csere kell', no_fault: 'Nem volt hiba' }

/** A szervizjegy munkalap-mezői (mind opcionális; a gyártó tölti ki). */
export interface ServiceWork {
  assignee: string | null
  /** határidő, ÉÉÉÉ-HH-NN */
  dueDate: string | null
  diagnosis: string | null
  workDone: string | null
  partsUsed: string | null
  laborMinutes: number | null
  warrantyCase: boolean | null
  /** nettó költség, egész Ft (vagy a gyártó pénznemében) */
  costNet: number | null
  outcome: ServiceOutcome | null
  closedAt: string | null
}

export interface StatsRequest extends Partial<ServiceWork> { id: number; installationId: number; component: string; status: ServiceStatus; createdAt: string }
export interface StatsInstallation { id: number; product: string; headline: string; components: InstallationComponent[] }

/** Késésben van-e: nincs lezárva, és a határidő a mai nap előtt volt. */
export const isOverdue = (request: Pick<StatsRequest, 'status' | 'dueDate'>, today: string) => request.status !== 'closed' && Boolean(request.dueDate) && request.dueDate! < today

/** Helyi dátum ÉÉÉÉ-HH-NN formában (a határidő a gyártó napja szerint jár le). */
export const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Az összevonási kulcs: az oldalzárások (side-front, side-left …) egy sorba kerülnek. */
const statKey = (key: string) => (key.startsWith('side-') ? 'side' : key)
/** Általános címke: „Tető: Aero” → „Tető”, „Fűtőpanel (2 db)” → „Fűtőpanel”. */
const genericLabel = (key: string, label: string) => (key === 'side' ? 'Oldalzárás' : label.split(':')[0].replace(/\s*\(.*\)\s*$/, '').trim())
/** A modell: a tetőrendszer neve a fejlécből (pl. „Aero · 4 × 3 m” → „Aero”). */
export const installationModel = (installation: Pick<StatsInstallation, 'headline' | 'product'>) => installation.headline.split(' · ')[0]?.trim() || installation.product

export interface StatRow { key: string; label: string; count: number; installed: number; /** bejelentés / telepített darab */ rate: number | null }

export interface ServiceStats {
  total: number
  open: number
  overdue: number
  closed: number
  /** a lezárt jegyek megoldási idejének mediánja, napban (lezárás ideje nélkül nincs) */
  medianDays: number | null
  byComponent: StatRow[]
  byModel: StatRow[]
  /** telepítés + komponens párok, ahol legalább két bejelentés érkezett */
  repeats: { installationId: number; component: string; label: string; count: number }[]
  costs: { warranty: number; paid: number; laborHours: number; withCost: number }
  outcomes: Record<ServiceOutcome, number>
  /** az utolsó 6 hónap bejelentései (a legrégebbitől) */
  months: { month: string; count: number }[]
  installations: number
  /** elég adat van-e ahhoz, hogy az arányokból következtetni lehessen */
  reliable: boolean
}

export const MIN_RELIABLE = { installations: 20, requests: 10 } as const

const median = (values: number[]) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function serviceStats(requests: StatsRequest[], installations: StatsInstallation[], now: Date): ServiceStats {
  const today = localDay(now)
  const byInstallation = new Map(installations.map((item) => [item.id, item]))

  // Telepített darab komponensenként és modellenként (a hibaarány nevezője).
  const installedByKey = new Map<string, number>()
  const labels = new Map<string, string>()
  const installedByModel = new Map<string, number>()
  for (const installation of installations) {
    const keys = new Set<string>()
    for (const component of installation.components) {
      if (component.key === 'other') continue
      const key = statKey(component.key)
      keys.add(key)
      if (!labels.has(key)) labels.set(key, genericLabel(key, component.label))
    }
    for (const key of keys) installedByKey.set(key, (installedByKey.get(key) ?? 0) + 1)
    const model = installationModel(installation)
    installedByModel.set(model, (installedByModel.get(model) ?? 0) + 1)
  }

  const componentCount = new Map<string, number>()
  const modelCount = new Map<string, number>()
  const pairs = new Map<string, { installationId: number; component: string; label: string; count: number }>()
  const outcomes = Object.fromEntries(SERVICE_OUTCOMES.map((key) => [key, 0])) as Record<ServiceOutcome, number>
  const costs = { warranty: 0, paid: 0, laborHours: 0, withCost: 0 }
  const durations: number[] = []
  for (const request of requests) {
    const installation = byInstallation.get(request.installationId)
    const key = statKey(request.component)
    if (!labels.has(key)) {
      const component = installation?.components.find((item) => item.key === request.component)
      labels.set(key, key === 'other' ? 'Egyéb / nem tudom' : genericLabel(key, component?.label ?? request.component))
    }
    componentCount.set(key, (componentCount.get(key) ?? 0) + 1)
    if (installation) {
      const model = installationModel(installation)
      modelCount.set(model, (modelCount.get(model) ?? 0) + 1)
    }
    const pairKey = `${request.installationId}|${request.component}`
    const pair = pairs.get(pairKey) ?? { installationId: request.installationId, component: request.component, label: installation?.components.find((item) => item.key === request.component)?.label ?? request.component, count: 0 }
    pair.count += 1
    pairs.set(pairKey, pair)
    if (request.outcome) outcomes[request.outcome] += 1
    if (typeof request.costNet === 'number') {
      costs.withCost += 1
      if (request.warrantyCase) costs.warranty += request.costNet
      else costs.paid += request.costNet
    }
    if (typeof request.laborMinutes === 'number') costs.laborHours += request.laborMinutes / 60
    if (request.status === 'closed' && request.closedAt) {
      const days = (Date.parse(request.closedAt) - Date.parse(request.createdAt)) / 86_400_000
      if (Number.isFinite(days) && days >= 0) durations.push(days)
    }
  }

  const rows = (counts: Map<string, number>, installed: Map<string, number>, label: (key: string) => string): StatRow[] =>
    [...counts.entries()]
      .map(([key, count]) => { const base = installed.get(key) ?? 0; return { key, label: label(key), count, installed: base, rate: base > 0 ? count / base : null } })
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'hu'))

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { month, count: requests.filter((request) => localDay(new Date(request.createdAt)).startsWith(month)).length }
  })

  costs.laborHours = Math.round(costs.laborHours * 10) / 10
  const medianDays = median(durations)
  return {
    total: requests.length,
    open: requests.filter((request) => request.status !== 'closed').length,
    overdue: requests.filter((request) => isOverdue(request, today)).length,
    closed: requests.filter((request) => request.status === 'closed').length,
    medianDays: medianDays === null ? null : Math.round(medianDays * 10) / 10,
    byComponent: rows(componentCount, installedByKey, (key) => labels.get(key) ?? key),
    byModel: rows(modelCount, installedByModel, (key) => key),
    repeats: [...pairs.values()].filter((pair) => pair.count >= 2).sort((a, b) => b.count - a.count),
    costs,
    outcomes,
    months,
    installations: installations.length,
    reliable: installations.length >= MIN_RELIABLE.installations && requests.length >= MIN_RELIABLE.requests,
  }
}
