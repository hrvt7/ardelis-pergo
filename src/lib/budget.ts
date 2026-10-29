// Költségkeret-tervező: a vásárló megadja, mennyit szán rá (bruttó), a rendszer
// megkeresi, mi fér bele a jelenlegi kívánságaihoz a lehető legközelebb.
// A „veszteség” azt méri, mennyit kell lemondani a kívánt tervből; a terv a
// legkisebb veszteségű, kerethez illő változat. Árazás: a gyártó saját árlistája.
import { furnitureMinimum } from '@/lib/furniture'
import { ROOF_INFO } from '@/lib/roofs'
import { SIDE_INFO, sideSummary } from '@/lib/sides'
import { enabledRoofs, normalizeConfig, roofLabels, tenantPrice } from '@/tenants/rules'
import type { Tenant } from '@/tenants/types'
import type { FurnitureSet, PergolaConfig, PriceSettings, RoofType, SideKey, SideType } from '@/types/pergola'

const ROOF_VALUE = Object.fromEntries(Object.entries(ROOF_INFO).map(([roof, info]) => [roof, info.value])) as Record<RoofType, number>
const SIDE_VALUE = Object.fromEntries(Object.entries(SIDE_INFO).map(([type, info]) => [type, info.value])) as Record<SideType, number>
const SIZE_STEPS = 9
const SIDES: SideKey[] = ['front', 'back', 'left', 'right']
const SIDE_NAMES: Record<SideKey, string> = { front: 'Elülső oldal', back: 'Hátsó oldal', left: 'Bal oldal', right: 'Jobb oldal' }
const EXTRA_LOSS = { led: 1, speakers: 0.7, sensors: 1, heater: 0.8, color: 0.9, solar: 1.1, rgb: 0.4, fan: 0.6, smartHome: 0.5 }

export interface BudgetPlan {
  id: 'balanced' | 'keep-size' | 'keep-equipment'
  title: string
  config: PergolaConfig
  totalGross: number
  changes: string[]
  loss: number
}

export type BudgetResult =
  | { status: 'fits'; totalGross: number; remaining: number }
  | { status: 'plans'; totalGross: number; plans: BudgetPlan[] }
  | { status: 'impossible'; totalGross: number; minimumGross: number }

interface Step { apply: (config: PergolaConfig) => PergolaConfig; loss: number }

/** Oldalanként a funkcionálisan értelmes olcsóbb csere: tolóüveg → ZIP (ha van) → nyitott; minden más fal → nyitott. */
function sideDowngrade(tenant: Tenant, type: SideType): SideType | null {
  if (type === 'glass' || type === 'glassFramed') return tenant.sides.includes('zip') ? 'zip' : 'none'
  if (type === 'none') return null
  return 'none'
}

/** A félbe osztott oldal második felének cseréje; ha egyezik az elsővel, megszűnik az osztás. */
function withSplit(config: PergolaConfig, side: SideKey, type: SideType | undefined): PergolaConfig {
  const split = { ...config.split }
  if (!type || type === config.sides[side]) delete split[side]
  else split[side] = type
  return { ...config, split: Object.keys(split).length ? split : undefined }
}

/** Az első fél cseréje; osztott oldalnál az osztás megmarad (ha a két fél nem lesz azonos). */
function withFirst(config: PergolaConfig, side: SideKey, type: SideType): PergolaConfig {
  const next = { ...config, sides: { ...config.sides, [side]: type } }
  return config.split?.[side] ? withSplit(next, side, config.split[side]) : next
}

function equipmentSteps(tenant: Tenant, config: PergolaConfig, original: PergolaConfig): Step[] {
  const steps: Step[] = []
  for (const side of SIDES) {
    const split = config.split?.[side]
    const factor = split ? 0.5 : 1
    const next = sideDowngrade(tenant, config.sides[side])
    if (next) steps.push({ apply: (c) => withFirst(c, side, next), loss: factor * (SIDE_VALUE[config.sides[side]] - SIDE_VALUE[next]) })
    const nextSplit = split ? sideDowngrade(tenant, split) : null
    if (split && nextSplit) steps.push({ apply: (c) => withSplit(c, side, nextSplit), loss: 0.5 * (SIDE_VALUE[split] - SIDE_VALUE[nextSplit]) })
  }
  if (config.fans) steps.push({ apply: (c) => ({ ...c, fans: c.fans && c.fans > 1 ? c.fans - 1 : undefined }), loss: EXTRA_LOSS.fan })
  if (config.ledRgb) steps.push({ apply: (c) => ({ ...c, ledRgb: undefined }), loss: EXTRA_LOSS.rgb })
  if (config.smartHome) steps.push({ apply: (c) => ({ ...c, smartHome: undefined }), loss: EXTRA_LOSS.smartHome })
  if (config.speakers) steps.push({ apply: (c) => ({ ...c, speakers: false }), loss: EXTRA_LOSS.speakers })
  if (config.heaters > 0) steps.push({ apply: (c) => ({ ...c, heaters: c.heaters - 1 }), loss: EXTRA_LOSS.heater })
  if (config.led) steps.push({ apply: (c) => ({ ...c, led: false, ledRgb: undefined }), loss: EXTRA_LOSS.led + (config.ledRgb ? EXTRA_LOSS.rgb : 0) })
  if (config.sensors) steps.push({ apply: (c) => ({ ...c, sensors: false }), loss: EXTRA_LOSS.sensors })
  if (config.solar) steps.push({ apply: (c) => ({ ...c, solar: undefined }), loss: EXTRA_LOSS.solar })
  if (config.frameColor === 'custom' && original.frameColor === 'custom') steps.push({ apply: (c) => ({ ...c, frameColor: tenant.colors[0]?.id ?? 'anthracite', customRal: undefined }), loss: EXTRA_LOSS.color })
  return steps
}

/** Egy-egy lemondás visszavonása az eredeti terv felé. */
function restoreSteps(config: PergolaConfig, original: PergolaConfig): { config: PergolaConfig; gain: number }[] {
  const steps: { config: PergolaConfig; gain: number }[] = []
  for (const side of SIDES) {
    const factor = original.split?.[side] ? 0.5 : 1
    if (config.sides[side] !== original.sides[side]) {
      steps.push({ config: withFirst(config, side, original.sides[side]), gain: factor * (SIDE_VALUE[original.sides[side]] - SIDE_VALUE[config.sides[side]]) })
      if ((original.sides[side] === 'glass' || original.sides[side] === 'glassFramed') && config.sides[side] === 'none') steps.push({ config: withFirst(config, side, 'zip'), gain: factor * SIDE_VALUE.zip })
    }
    const wanted = original.split?.[side]
    const have = config.split?.[side] ?? config.sides[side]
    if (wanted && have !== wanted) steps.push({ config: withSplit(config, side, wanted), gain: 0.5 * (SIDE_VALUE[wanted] - SIDE_VALUE[have]) })
  }
  if ((original.fans ?? 0) > (config.fans ?? 0)) steps.push({ config: { ...config, fans: (config.fans ?? 0) + 1 }, gain: EXTRA_LOSS.fan })
  if (original.ledRgb && !config.ledRgb && config.led) steps.push({ config: { ...config, ledRgb: true }, gain: EXTRA_LOSS.rgb })
  if (original.smartHome && !config.smartHome) steps.push({ config: { ...config, smartHome: true }, gain: EXTRA_LOSS.smartHome })
  if (original.speakers && !config.speakers) steps.push({ config: { ...config, speakers: true }, gain: EXTRA_LOSS.speakers })
  if (config.heaters < original.heaters) steps.push({ config: { ...config, heaters: config.heaters + 1 }, gain: EXTRA_LOSS.heater })
  if (original.led && !config.led) steps.push({ config: { ...config, led: true }, gain: EXTRA_LOSS.led })
  if (original.sensors && !config.sensors) steps.push({ config: { ...config, sensors: true }, gain: EXTRA_LOSS.sensors })
  if (original.solar && !config.solar && config.roof === 'fixed') steps.push({ config: { ...config, solar: true }, gain: EXTRA_LOSS.solar })
  if (original.frameColor !== config.frameColor) steps.push({ config: { ...config, frameColor: original.frameColor, customRal: original.customRal }, gain: EXTRA_LOSS.color })
  return steps
}

function sizeLoss(config: PergolaConfig, original: PergolaConfig) {
  const ratio = (config.width * config.depth) / (original.width * original.depth)
  return 12 * (1 - ratio) + (config.width !== original.width ? 0.2 : 0) + (config.depth !== original.depth ? 0.2 : 0)
}

function range(from: number, min: number) {
  const values: number[] = []
  for (let value = from; value >= min - 1e-9 && values.length < SIZE_STEPS; value = Math.round((value - 0.25) * 100) / 100) values.push(value)
  if (values[values.length - 1] > min + 1e-9 && values.length < SIZE_STEPS) values.push(min)
  return values
}

export function describeChanges(tenant: Tenant, original: PergolaConfig, next: PergolaConfig): string[] {
  const labels = roofLabels(tenant)
  const m = (value: number) => value.toFixed(2).replace(/0$/, '').replace('.', ',')
  const changes: string[] = []
  if (next.width !== original.width || next.depth !== original.depth) changes.push(`Méret: ${m(original.width)} × ${m(original.depth)} → ${m(next.width)} × ${m(next.depth)} m`)
  if (next.roof !== original.roof) changes.push(`Tető: ${labels[original.roof].split(' · ')[0]} → ${labels[next.roof]}`)
  for (const side of SIDES) {
    const before = sideSummary(original, side)
    const after = sideSummary(next, side)
    if (before !== after) changes.push(`${SIDE_NAMES[side]}: ${before} → ${after === 'Nyitott' ? 'nyitott' : after}`)
  }
  if (original.heaters !== next.heaters) changes.push(next.heaters === 0 ? 'Teraszfűtés nélkül' : `Teraszfűtés: ${original.heaters} → ${next.heaters} db`)
  if (original.speakers && !next.speakers) changes.push('Hangrendszer nélkül')
  if (original.led && !next.led) changes.push('LED-világítás nélkül')
  if (original.sensors && !next.sensors) changes.push('Eső- és szélszenzor nélkül')
  if (original.solar && !next.solar) changes.push('Napelemes tető nélkül')
  if (original.ledRgb && next.led && !next.ledRgb) changes.push('Színváltós LED helyett fehér LED')
  if ((original.fans ?? 0) !== (next.fans ?? 0)) changes.push(next.fans ? `Mennyezeti ventilátor: ${original.fans} → ${next.fans} db` : 'Mennyezeti ventilátor nélkül')
  if (original.smartHome && !next.smartHome) changes.push('Okosotthon-vezérlés nélkül')
  if (original.frameColor !== next.frameColor) changes.push('Egyedi RAL szín helyett antracit')
  return changes
}

export function planBudget(tenant: Tenant, original: PergolaConfig, prices: PriceSettings, budgetGross: number, furniture: FurnitureSet = 'none'): BudgetResult {
  const price = (config: PergolaConfig) => tenantPrice(tenant, config, prices).totalGross
  const current = price(original)
  if (current <= budgetGross) return { status: 'fits', totalGross: current, remaining: budgetGross - current }

  const roofs = enabledRoofs(tenant).filter((roof) => ROOF_VALUE[roof] <= ROOF_VALUE[original.roof])
  const minimums = furnitureMinimum(furniture)
  const fitsFurniture = (w: number, d: number) => !minimums.length || minimums.some((item) => w >= item.width - 1e-9 && d >= item.depth - 1e-9)
  const widths = range(original.width, tenant.limits.width[0])
  const depths = range(original.depth, tenant.limits.depth[0])

  type Candidate = { config: PergolaConfig; total: number; loss: number; sizeKept: boolean; equipmentKept: boolean }
  const candidates: Candidate[] = []
  let minimumGross = Infinity
  let bestLoss = Infinity

  // A méret–tető párokat a lemondás szerint növekvő sorrendben vizsgáljuk: így hamar lesz egy jó
  // terv, és a nála eleve rosszabb párokat (lásd lent) ki lehet hagyni.
  const combos: { width: number; depth: number; roof: RoofType; base: number }[] = []
  for (const width of widths) for (const depth of depths) {
    if (!fitsFurniture(width, depth)) continue
    for (const roof of roofs) combos.push({ width, depth, roof, base: sizeLoss({ ...original, width, depth }, original) + (ROOF_VALUE[original.roof] - ROOF_VALUE[roof]) })
  }
  combos.sort((a, b) => a.base - b.base)
  for (const { width, depth, roof } of combos) {
    {
      let config = normalizeConfig(tenant, { ...original, width, depth, roof })
      let loss = sizeLoss(config, original) + (ROOF_VALUE[original.roof] - ROOF_VALUE[roof])
      let total = price(config)
      const sizeAndRoofOnly = total
      const sizeKept = width === original.width && depth === original.depth
      // Ha már a méret- és tetőcsere többe „kerül”, mint az eddigi legjobb terv, és nem a
      // méretmegtartó változat, ebből nem lehet jobb javaslat (a mohó lépések csak rontanak).
      if (total > budgetGross && !sizeKept && loss >= bestLoss) continue
      // Alsó korlát: ha minden kiegészítő és oldalfal nélkül sem fér bele, a mohó lépések fölöslegesek.
      if (total > budgetGross) {
        const bare = price(normalizeConfig(tenant, { ...config, sides: { front: 'none', back: 'none', left: 'none', right: 'none' }, split: undefined, led: false, ledRgb: undefined, heaters: 0, speakers: false, sensors: false, solar: undefined, fans: undefined, smartHome: undefined, frameColor: original.frameColor === 'custom' ? tenant.colors[0]?.id ?? 'anthracite' : config.frameColor, customRal: original.frameColor === 'custom' ? undefined : config.customRal }))
        if (bare > budgetGross) { minimumGross = Math.min(minimumGross, bare); continue }
      }
      // Mohó lépések: mindig az, amelyik a legtöbbet spórol egységnyi lemondásra.
      for (let guard = 0; total > budgetGross && guard < 24; guard++) {
        const steps = equipmentSteps(tenant, config, original)
        if (!steps.length) break
        let best: { config: PergolaConfig; total: number; loss: number; score: number } | null = null
        for (const step of steps) {
          const next = step.apply(config)
          const nextTotal = price(next)
          const saving = total - nextTotal
          if (saving <= 0) continue
          const score = saving / step.loss
          if (!best || score > best.score) best = { config: next, total: nextTotal, loss: step.loss, score }
        }
        if (!best) break
        config = best.config
        total = best.total
        loss += best.loss
      }
      // Visszaadás: ha a mohó lépések túllőttek, amit lehet, visszakap (a legnagyobb értékűt először).
      for (let guard = 0; total <= budgetGross && guard < 12; guard++) {
        let best: { config: PergolaConfig; total: number; gain: number } | null = null
        for (const candidate of restoreSteps(config, original)) {
          const nextTotal = price(candidate.config)
          if (nextTotal <= budgetGross && (!best || candidate.gain > best.gain)) best = { config: candidate.config, total: nextTotal, gain: candidate.gain }
        }
        if (!best) break
        config = best.config
        total = best.total
        loss -= best.gain
      }
      minimumGross = Math.min(minimumGross, total)
      if (total <= budgetGross) {
        candidates.push({ config, total, loss, sizeKept, equipmentKept: total === sizeAndRoofOnly && roof === original.roof })
        bestLoss = Math.min(bestLoss, loss)
      }
    }
  }

  if (!candidates.length) return { status: 'impossible', totalGross: current, minimumGross: Number.isFinite(minimumGross) ? minimumGross : current }

  const byLoss = (a: Candidate, b: Candidate) => a.loss - b.loss || b.total - a.total
  const picks: { id: BudgetPlan['id']; title: string; candidate: Candidate | undefined }[] = [
    { id: 'balanced', title: 'Legjobb egyensúly', candidate: [...candidates].sort(byLoss)[0] },
    { id: 'keep-size', title: 'Méret megtartva', candidate: candidates.filter((item) => item.sizeKept).sort(byLoss)[0] },
    { id: 'keep-equipment', title: 'Felszereltség megtartva', candidate: candidates.filter((item) => item.equipmentKept).sort(byLoss)[0] },
  ]
  const seen = new Set<string>()
  const plans: BudgetPlan[] = []
  for (const pick of picks) {
    if (!pick.candidate) continue
    const key = JSON.stringify(pick.candidate.config)
    if (seen.has(key)) continue
    seen.add(key)
    plans.push({ id: pick.id, title: pick.title, config: pick.candidate.config, totalGross: pick.candidate.total, changes: describeChanges(tenant, original, pick.candidate.config), loss: Math.round(pick.candidate.loss * 10) / 10 })
  }
  return { status: 'plans', totalGross: current, plans }
}
