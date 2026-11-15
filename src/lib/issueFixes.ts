// Egy kattintásos javítás a figyelmeztetésekhez (buildingIssues, getAdvice). A rendszer nem vág és nem ír át
// semmit magától: jelez, és ha van érvényes javítás, gombot kínál. A javítás ugyanazon az úton fut, mint
// bármely módosítás (normalizálás, ár, visszavonás), így a vevő látja az árváltozást, és vissza is vonhatja.
//
// Gomb csak akkor jelenik meg, ha a javítás ennél a gyártónál ténylegesen működik: a gyártó kínálatához
// igazított (normalizeConfig) eredményben a figyelmeztetés eltűnik, és nem jelenik meg helyette új figyelmeztetés.
import { getAdvice } from './advice'
import { buildingIssues, CARPORT_DOUBLE_MIN, CARPORT_SINGLE_MIN } from './buildings'
import { isWallSide } from './mount'
import { formatNumber } from './pricing'
import { normalizeConfig } from '../tenants/rules'
import type { Tenant } from '../tenants/types'
import type { PergolaConfig, SideKey, SideType } from '../types/pergola'

const SIDES: SideKey[] = ['front', 'back', 'left', 'right']
const m = (value: number) => `${formatNumber(value, 2)} m`

interface FixRule {
  label: string
  /** Javítási jelöltek sorrendben; az első érvényes nyer. */
  candidates: (config: PergolaConfig) => Partial<PergolaConfig>[]
}

const openSides = (config: PergolaConfig) => SIDES.filter((side) => !isWallSide(config.mount, side) && config.sides[side] === 'none')
const doorSide = (config: PergolaConfig) => SIDES.find((side) => side === 'front' && !isWallSide(config.mount, side)) ?? SIDES.find((side) => !isWallSide(config.mount, side))
const withSide = (config: PergolaConfig, side: SideKey | undefined, type: SideType): Partial<PergolaConfig> => (side ? { sides: { ...config.sides, [side]: type } } : {})

export const FIX_RULES: Record<string, FixRule> = {
  'carport-narrow': { label: `Szélesség ${m(CARPORT_SINGLE_MIN)}`, candidates: () => [{ width: CARPORT_SINGLE_MIN }] },
  'carport-double': { label: `Két autóhoz: ${m(CARPORT_DOUBLE_MIN)}`, candidates: () => [{ width: CARPORT_DOUBLE_MIN }] },
  'carport-depth': { label: `Mélység ${m(5)}`, candidates: () => [{ depth: 5 }] },
  'carport-height': { label: `Magasság ${m(2.3)}`, candidates: () => [{ height: 2.3 }] },
  'carport-pitch': { label: 'Dőlés 5°', candidates: () => [{ pitch: 5 }] },
  'cons-pitch': { label: 'Dőlés 5°', candidates: () => [{ pitch: 5 }] },
  'roof-heat': { label: 'Hővisszaverő tetőüveg', candidates: () => [{ glazing: 'heat' }, { glazing: 'tinted' }] },
  'glass-heat': { label: 'Tetőárnyékoló hozzáadása', candidates: () => [{ roofShade: 'below' }, { roofShade: 'above' }] },
  'cons-foundation': { label: 'Alapozott padló', candidates: () => [{ foundation: true }] },
  'cons-open': {
    label: 'Nyitott oldalak lezárása fix üveggel',
    candidates: (config) => [{ sides: { ...config.sides, ...Object.fromEntries(openSides(config).map((side) => [side, 'glassFixed'])) } }],
  },
  'cons-door': { label: 'Ajtó az elülső oldalra', candidates: (config) => [withSide(config, doorSide(config), 'door'), withSide(config, doorSide(config), 'doorSliding')] },
  'veranda-access': { label: 'Tolóüveg az elülső oldalra', candidates: (config) => [withSide(config, doorSide(config), 'glass'), withSide(config, doorSide(config), 'door')] },
  'wide-glass': {
    label: 'Kerettel osztott üveg',
    candidates: (config) => [{ sides: { ...config.sides, ...Object.fromEntries(SIDES.filter((side) => config.sides[side] === 'glass').map((side) => [side, 'glassFramed'])) } }],
  },
  'rain-sensor': { label: 'Eső- és szélérzékelő', candidates: () => [{ sensors: true }] },
}

/** Az összes figyelmeztetés (építmény + szakértői megjegyzés) azonosítóval és szinttel. */
export function allIssues(config: PergolaConfig): { id: string; level: 'warn' | 'info' }[] {
  return [...buildingIssues(config), ...getAdvice(config)].map(({ id, level }) => ({ id, level }))
}

export interface ResolvedFix { label: string; patch: Partial<PergolaConfig> }

/** Az adott figyelmeztetés javítása ennél a gyártónál — vagy null, ha nincs érvényes javítás. */
export function resolveFix(tenant: Tenant, config: PergolaConfig, issueId: string): ResolvedFix | null {
  const rule = FIX_RULES[issueId]
  if (!rule) return null
  const before = allIssues(config)
  if (!before.some((issue) => issue.id === issueId)) return null
  const warnsBefore = new Set(before.filter((issue) => issue.level === 'warn').map((issue) => issue.id))
  for (const patch of rule.candidates(config)) {
    if (!Object.keys(patch).length) continue
    const next = normalizeConfig(tenant, { ...config, ...patch })
    if (JSON.stringify(next) === JSON.stringify(config)) continue
    const after = allIssues(next)
    if (after.some((issue) => issue.id === issueId)) continue
    if (after.some((issue) => issue.level === 'warn' && !warnsBefore.has(issue.id))) continue
    return { label: rule.label, patch }
  }
  return null
}
