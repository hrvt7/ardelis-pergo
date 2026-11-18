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
import { localized, tr } from '../i18n/locale'

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

export const FIX_RULES: Record<string, FixRule> = localized(() => ({
  'carport-narrow': { label: tr(`Szélesség ${m(CARPORT_SINGLE_MIN)}`, `Breite ${m(CARPORT_SINGLE_MIN)}`), candidates: () => [{ width: CARPORT_SINGLE_MIN }] },
  'carport-double': { label: tr(`Két autóhoz: ${m(CARPORT_DOUBLE_MIN)}`, `Für zwei Autos: ${m(CARPORT_DOUBLE_MIN)}`), candidates: () => [{ width: CARPORT_DOUBLE_MIN }] },
  'carport-depth': { label: tr(`Mélység ${m(5)}`, `Tiefe ${m(5)}`), candidates: () => [{ depth: 5 }] },
  'carport-height': { label: tr(`Magasság ${m(2.3)}`, `Höhe ${m(2.3)}`), candidates: () => [{ height: 2.3 }] },
  'carport-pitch': { label: tr('Dőlés 5°', 'Neigung 5°'), candidates: () => [{ pitch: 5 }] },
  'cons-pitch': { label: tr('Dőlés 5°', 'Neigung 5°'), candidates: () => [{ pitch: 5 }] },
  'roof-heat': { label: tr('Hővisszaverő tetőüveg', 'Wärmereflektierendes Dachglas'), candidates: () => [{ glazing: 'heat' }, { glazing: 'tinted' }] },
  'glass-heat': { label: tr('Tetőárnyékoló hozzáadása', 'Dachbeschattung hinzufügen'), candidates: () => [{ roofShade: 'below' }, { roofShade: 'above' }] },
  'cons-foundation': { label: tr('Alapozott padló', 'Fundamentboden'), candidates: () => [{ foundation: true }] },
  'cons-open': {
    label: tr('Nyitott oldalak lezárása fix üveggel', 'Offene Seiten mit Festverglasung schließen'),
    candidates: (config) => [{ sides: { ...config.sides, ...Object.fromEntries(openSides(config).map((side) => [side, 'glassFixed'])) } }],
  },
  'cons-door': { label: tr('Ajtó az elülső oldalra', 'Tür an die Vorderseite'), candidates: (config) => [withSide(config, doorSide(config), 'door'), withSide(config, doorSide(config), 'doorSliding')] },
  'veranda-access': { label: tr('Tolóüveg az elülső oldalra', 'Glasschiebewand an die Vorderseite'), candidates: (config) => [withSide(config, doorSide(config), 'glass'), withSide(config, doorSide(config), 'door')] },
  'wide-glass': {
    label: tr('Kerettel osztott üveg', 'Gerahmtes, geteiltes Glas'),
    candidates: (config) => [{ sides: { ...config.sides, ...Object.fromEntries(SIDES.filter((side) => config.sides[side] === 'glass').map((side) => [side, 'glassFramed'])) } }],
  },
  'os140-depth': { label: tr('Kinyúlás 6,8 m', 'Ausladung 6,8 m'), candidates: () => [{ depth: 6.8 }] },
  'os140-height': { label: tr('Magasság 2,8 m', 'Höhe 2,8 m'), candidates: () => [{ height: 2.8 }] },
  'rain-sensor': { label: tr('Eső- és szélérzékelő', 'Regen- und Windsensor'), candidates: () => [{ sensors: true }] },
}))

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
