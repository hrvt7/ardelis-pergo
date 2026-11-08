// Építmény-típusok: nyitott pergola, zárt veranda (üvegezett terasz) és egész éves télikert.
// Egyetlen igazságforrás a választóhoz, a szabályokhoz, az árhoz, a linkhez és a tájékoztatókhoz.
// Tiszta TypeScript — böngészőben és szerveren is fut.
import { isWallSide } from './mount'
import { closedSegments } from './sides'
import type { BuildingType, ClimateType, PergolaConfig, PriceSettings, RoofType, SideKey, SideType, WallGlazing } from '../types/pergola'

export type ClosedBuilding = Exclude<BuildingType, 'pergola'>

export interface BuildingInfo {
  label: string
  /** Egy sor a kártyára. */
  short: string
  description: string
  /** Mire jó, mennyi ideig használható. */
  season: string
  /** Rövid tulajdonságok a kártyán. */
  traits: string[]
}

export const BUILDING_TYPES: BuildingType[] = ['pergola', 'veranda', 'conservatory']

export const BUILDING_INFO: Record<BuildingType, BuildingInfo> = {
  pergola: {
    label: 'Pergola', short: 'Nyitott, szellős terasz', season: 'Tavasztól őszig',
    description: 'Árnyékolt, nyitott vagy részben zárt terasz állítható lamellákkal vagy fix tetővel.',
    traits: ['Nyitott oldalak', 'Mozgatható tető', 'Gyors telepítés'],
  },
  veranda: {
    label: 'Veranda', short: 'Zárt üvegezett terasz', season: 'Tavasztól késő őszig',
    description: 'Üvegfalakkal zárt, nem fűtött (hideg) tér: szél, eső és hűvös estén is használható, de nem egész éves lakótér.',
    traits: ['Üveg- vagy fix tető', 'Üvegfal ajtóval', 'Nem hőszigetelt'],
  },
  conservatory: {
    label: 'Télikert', short: 'Egész éves, fűtött tér', season: 'Egész évben',
    description: 'Hőszigetelt üvegezésű, hőhídmentes profilú, fűtött és hűthető helyiség, alapozott padlóval és ajtóval.',
    traits: ['Hőszigetelt üveg és profil', 'Fűtés / hűtés', 'Alapozott padló'],
  },
}

/** Zárt építményhez választható tetők (mozgó tető nem szigetelhető/zárható megfelelően). */
export const BUILDING_ROOFS: Record<ClosedBuilding, RoofType[]> = {
  veranda: ['glass', 'polycarbonate', 'fixed'],
  conservatory: ['glass', 'fixed'],
}

export const isClosedBuilding = (building: BuildingType | undefined): building is ClosedBuilding => building === 'veranda' || building === 'conservatory'

export const DOOR_TYPES: SideType[] = ['door', 'doorSliding']
export const isDoorType = (type: SideType) => type === 'door' || type === 'doorSliding'
/** Az üvegfal-típusok (az oldalfal-üvegezés felára ezekre vonatkozik). */
export const GLASS_WALL_TYPES: SideType[] = ['glass', 'glassFramed', 'glassFixed', 'door', 'doorSliding']
/** Télikertben csak üveg és ajtó engedett (a zip, lamella és lécfal nem hőszigetelő). */
export const CONSERVATORY_SIDE_TYPES: SideType[] = ['none', ...GLASS_WALL_TYPES]

export const WALL_GLAZING_INFO: Record<WallGlazing, { label: string; short: string; share: string; priceKey: keyof Pick<PriceSettings, 'wallGlazingDoublePerM2Net' | 'wallGlazingTriplePerM2Net'> | null; ug: string }> = {
  single: { label: 'Edzett üveg', short: '8–10 mm egyrétegű, hideg használatra', share: 's', priceKey: null, ug: 'Ug ≈ 5,8 W/m²K' },
  double: { label: 'Kétrétegű hőszigetelt', short: 'Low-E bevonat, argon töltet', share: 'd', priceKey: 'wallGlazingDoublePerM2Net', ug: 'Ug ≈ 1,1 W/m²K' },
  triple: { label: 'Háromrétegű hőszigetelt', short: 'Két Low-E réteg, legjobb hőtartás', share: 't', priceKey: 'wallGlazingTriplePerM2Net', ug: 'Ug ≈ 0,6 W/m²K' },
}
export const WALL_GLAZINGS: WallGlazing[] = ['single', 'double', 'triple']

export const CLIMATE_INFO: Record<ClimateType, { label: string; short: string; share: string }> = {
  split: { label: 'Split klíma', short: 'Fűtés és hűtés egy készülékkel (inverteres)', share: 's' },
  underfloor: { label: 'Padlófűtés', short: 'Egyenletes, csendes alapfűtés', share: 'u' },
  both: { label: 'Padlófűtés + split klíma', short: 'Egész éves komfort, nyáron hűtés', share: 'b' },
}

export const hasSplitUnit = (climate: ClimateType | undefined) => climate === 'split' || climate === 'both'
export const hasUnderfloor = (climate: ClimateType | undefined) => climate === 'underfloor' || climate === 'both'

export const defaultWallGlazing = (building: BuildingType | undefined): WallGlazing | undefined => building === 'conservatory' ? 'double' : building === 'veranda' ? 'single' : undefined
export const wallGlazingOptions = (building: BuildingType | undefined): WallGlazing[] => building === 'conservatory' ? ['double', 'triple'] : building === 'veranda' ? ['single', 'double', 'triple'] : []
export const effectiveWallGlazing = (config: Pick<PergolaConfig, 'building' | 'wallGlazing'>): WallGlazing | undefined =>
  config.wallGlazing && wallGlazingOptions(config.building).includes(config.wallGlazing) ? config.wallGlazing : defaultWallGlazing(config.building)

/** Mely építmény-típusok kínálhatók a gyártó tetői és oldalfalai alapján. A pergola mindig. */
export function availableBuildings(roofs: RoofType[], sides: SideType[]): BuildingType[] {
  const hasGlassWall = sides.some((type) => GLASS_WALL_TYPES.includes(type))
  const hasDoor = sides.some(isDoorType)
  const result: BuildingType[] = ['pergola']
  if (hasGlassWall && BUILDING_ROOFS.veranda.some((roof) => roofs.includes(roof))) result.push('veranda')
  if (hasGlassWall && hasDoor && sides.includes('glassFixed') && BUILDING_ROOFS.conservatory.some((roof) => roofs.includes(roof))) result.push('conservatory')
  return result
}

/** Üvegfal-felület m² (a felárhoz): az üveg- és ajtós szegmensek hossza × oldalmagasság. */
export function glassWallArea(config: Pick<PergolaConfig, 'sides' | 'split' | 'mount' | 'width' | 'depth' | 'height'>) {
  return closedSegments(config).filter((segment) => GLASS_WALL_TYPES.includes(segment.type)).reduce((sum, segment) => sum + segment.length * config.height, 0)
}

export function doorCount(config: Pick<PergolaConfig, 'sides' | 'split' | 'mount' | 'width' | 'depth'>) {
  const segments = closedSegments(config)
  return { hinged: segments.filter((segment) => segment.type === 'door').length, sliding: segments.filter((segment) => segment.type === 'doorSliding').length }
}

export interface BuildingIssue { level: 'warn' | 'info'; text: string }

/** Műszaki/logikai észrevételek a zárt építményhez (nem tiltások: a felhasználó dönt). */
export function buildingIssues(config: PergolaConfig): BuildingIssue[] {
  if (!isClosedBuilding(config.building)) return []
  const issues: BuildingIssue[] = []
  const sides = (['front', 'back', 'left', 'right'] as const)
  const segments = sides.flatMap((side) => {
    const wall = config.mount === 'wall' ? side === 'back' : config.mount === 'corner-left' ? side === 'back' || side === 'left' : config.mount === 'corner-right' ? side === 'back' || side === 'right' : config.mount === 'niche' ? side !== 'front' : false
    if (wall) return []
    const second = config.split?.[side]
    return [config.sides[side], ...(second ? [second] : [])]
  })
  const open = segments.filter((type) => type === 'none').length
  const doors = doorCount(config)
  const hasDoor = doors.hinged + doors.sliding > 0
  const hasSlidingGlass = segments.some((type) => type === 'glass' || type === 'glassFramed')
  // Túl rövid falszakasz ajtónak (nyíló szárny ~0,95 m, toló ~0,6–1,3 m).
  const shortDoor = closedSegments(config).find((segment) => isDoorType(segment.type) && segment.length < 1.2)
  if (shortDoor) issues.push({ level: 'warn', text: `Az ajtós falszakasz csak ${shortDoor.length.toFixed(1).replace('.', ',')} m hosszú, ez szűk a bejárathoz. Válassz hosszabb oldalt, vagy ne ossz fel.` })
  // Üveg- és polikarbonát tető alatti túlmelegedés: tiszta/matt/opál burkolat tetőárnyékoló nélkül.
  if ((config.roof === 'glass' || config.roof === 'polycarbonate') && !config.roofShade) {
    const g = config.glazing ?? (config.roof === 'glass' ? 'clear' : 'opal')
    if (g === 'clear' || g === 'satin' || g === 'opal') issues.push({ level: 'info', text: 'Nyáron az üvegtető alatt erősen felmelegedhet a tér. Hővisszaverő vagy füstös burkolat, illetve tetőárnyékoló (Extrák) sokat javít rajta.' })
  }
  if (config.building === 'conservatory') {
    if (!config.foundation) issues.push({ level: 'warn', text: 'Alapozás nélkül a télikert nem használható egész évben: kapcsold be az alapozott padlót (Extrák).' })
    if (open > 0) issues.push({ level: 'warn', text: `${open === 1 ? 'Egy oldal' : `${open} oldal`} nyitott. A télikert zárt, fűtött tér: zárd le üveggel vagy ajtóval.` })
    if (!hasDoor) issues.push({ level: 'warn', text: 'Nincs ajtó. A télikertbe legalább egy bejárati ajtó kell (nyíló vagy toló).' })
    if (!config.climate) issues.push({ level: 'info', text: 'Egész éves használathoz válassz fűtést/hűtést az Extrák lépésben.' })
    if (!config.pitch) issues.push({ level: 'info', text: 'Üvegtetőnél pár fokos dőlés javasolt a vízelfolyáshoz és a tisztán tartáshoz (Típus lépés).' })
  } else {
    if (open >= 2) issues.push({ level: 'info', text: `${open} oldal nyitott. A veranda általában legalább három oldalról zárt.` })
    if (!hasDoor && !hasSlidingGlass) issues.push({ level: 'info', text: 'Nincs sem ajtó, sem tolóüveg: nehezen lesz bejárható a zárt tér.' })
  }
  return issues
}

/** Tájékoztató az építéshatósági és energetikai teendőkről (nem jogi tanács). */
export function permitNotes(building: BuildingType | undefined): string[] {
  if (building === 'veranda') return [
    'A zárt, tartósan álló szerkezet (veranda) a település helyi építési szabályzata és a telek adatai (beépítettség, telekhatár-távolság) alapján bejelentés- vagy engedélykötelessé válhat.',
    'Kérj tájékoztatást az illetékes építési hatóságtól (jegyző/főépítész) a megrendelés előtt. A településképi bejelentés helyi rendelettől függhet.',
  ]
  if (building === 'conservatory') return [
    'A télikert zárt, fűtött helyiség, ezért jellemzően építéshatósági eljárás (egyszerű bejelentés vagy építési engedély) tárgya. Ez a telek adatai és a helyi építési szabályzat szerint dől el, ezért a tervezés előtt egyeztess az illetékes hatósággal vagy jogosult tervezővel.',
    'Egész éves használatnál az épületenergetikai követelmények (hőátbocsátás, tüzelő- és hűtőberendezés) is érintettek lehetnek.',
    'Az irányár nem tartalmazza az engedélyezési tervet, a tervezői és eljárási díjakat.',
  ]
  return []
}

/** A zárt építmény sorai a specifikációhoz, a PDF-hez és a lead-e-mailhez. */
export function buildingSpecRows(config: PergolaConfig): [string, string][] {
  if (!isClosedBuilding(config.building)) return []
  const rows: [string, string][] = [['Építmény típusa', `${BUILDING_INFO[config.building].label} · ${BUILDING_INFO[config.building].season.toLowerCase()}`]]
  const glazing = effectiveWallGlazing(config)
  if (glazing) rows.push(['Oldalüvegezés', `${WALL_GLAZING_INFO[glazing].label} · ${WALL_GLAZING_INFO[glazing].ug}`])
  const doors = doorCount(config)
  if (doors.hinged + doors.sliding > 0) rows.push(['Ajtó', [doors.hinged ? `${doors.hinged} db nyíló` : '', doors.sliding ? `${doors.sliding} db toló` : ''].filter(Boolean).join(' + ')])
  if (config.climate) rows.push(['Fűtés / hűtés', CLIMATE_INFO[config.climate].label])
  if (config.foundation) rows.push(['Alap és padló', 'Alapozott, szigetelt padlószerkezet'])
  if (config.building === 'conservatory') rows.push(['Profilrendszer', 'Hőhídmentes alumínium'])
  return rows
}

const SIDE_ORDER: SideKey[] = ['front', 'left', 'right', 'back']

/**
 * Épülettípus-váltás okos alapértékekkel: megfelelő tető, nyitott oldalak lezárva, egy bejárati ajtó,
 * télikertnél enyhe tetődőlés, alap és klíma. A kliens ezt alkalmazza; a végső szabályokat a normalizáció adja.
 */
export function buildingPatch(config: PergolaConfig, building: BuildingType, roofs: RoofType[], sides: SideType[]): Partial<PergolaConfig> {
  // Vissza pergolára: a zárt építmény előtti oldalak (pl. zip-árnyékoló) visszakerülnek, nem marad üvegfal.
  if (building === 'pergola') return { building: undefined, wallGlazing: undefined, climate: undefined, foundation: undefined, ...(config.openSides ? { sides: { ...config.openSides } } : {}), openSides: undefined }
  const allowed = BUILDING_ROOFS[building].filter((roof) => roofs.includes(roof))
  const roof = allowed.includes(config.roof) ? config.roof : (allowed[0] ?? config.roof)
  const has = (type: SideType) => sides.includes(type)
  const closing: SideType = has('glassFixed') ? 'glassFixed' : has('glass') ? 'glass' : 'none'
  const door: SideType = has('doorSliding') ? 'doorSliding' : has('door') ? 'door' : 'none'
  const open = SIDE_ORDER.filter((side) => !isWallSide(config.mount, side))
  const next = { ...config.sides }
  // Zárt építményben minden nyitott oldal üvegfal (vagy ajtó) lesz: a zip, a lamella és a lécfal is cserélődik, nem csak az üres oldal.
  open.forEach((side) => { if (!GLASS_WALL_TYPES.includes(next[side])) next[side] = closing })
  const hasDoor = open.some((side) => isDoorType(next[side]) || isDoorType(config.split?.[side] ?? 'none'))
  if (!hasDoor && door !== 'none') {
    const entrance = open.find((side) => next[side] === 'glassFixed' || next[side] === 'glass' || next[side] === 'none')
    if (entrance) next[entrance] = door
  }
  return {
    building,
    roof,
    sides: next,
    // Az eredeti (nyitott) oldalak megőrzése, hogy pergolára visszaváltva helyreálljanak.
    openSides: config.openSides ?? (isClosedBuilding(config.building) ? undefined : { ...config.sides }),
    wallGlazing: undefined,
    pitch: building === 'conservatory' && !config.pitch && roof === 'glass' ? 3 : config.pitch,
    climate: building === 'conservatory' ? (config.climate ?? 'split') : undefined,
    foundation: building === 'conservatory' ? true : undefined,
  }
}
