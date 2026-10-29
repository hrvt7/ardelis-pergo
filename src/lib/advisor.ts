// Tanácsadó: négy egyszerű kérdésből javasolt pergola, indoklással.
// Csak a gyártó kínálatából választ (tető, rögzítés, oldalzárás, extrák, méretkorlát),
// a méretet a választott bútor helyigényéből számolja. Tiszta függvény, tesztelhető.
import { FURNITURE_SETS, furnitureFit } from './furniture'
import { wallSides } from './mount'
import { ROOF_INFO } from './roofs'
import { enabledRoofs, normalizeConfig, tenantPrice } from '../tenants/rules'
import type { Tenant } from '../tenants/types'
import type { FurnitureSet, MountType, PergolaConfig, PriceSettings, RoofType, SideKey, SideType } from '../types/pergola'

export type AdvisorUse = 'lounge' | 'dining' | 'party'
export type AdvisorWeather = 'sun' | 'rain' | 'season'
export type AdvisorLight = 'adjustable' | 'bright' | 'shade' | 'sky'
export type AdvisorPlace = 'wall' | 'corner' | 'garden'

export interface AdvisorAnswers { use: AdvisorUse; weather: AdvisorWeather; light: AdvisorLight; place: AdvisorPlace }

export interface AdvisorOption<T extends string> { id: T; title: string; text: string }

export const ADVISOR_QUESTIONS = {
  use: {
    title: 'Mire használnád leginkább?',
    options: [
      { id: 'lounge', title: 'Pihenésre', text: 'Kanapé, kávé, olvasás' },
      { id: 'dining', title: 'Közös étkezésre', text: 'Asztal 6 főre' },
      { id: 'party', title: 'Vendégvárásra', text: 'Pihenő és étkező együtt' },
    ] as AdvisorOption<AdvisorUse>[],
  },
  weather: {
    title: 'Mikor szeretnéd használni?',
    options: [
      { id: 'sun', title: 'Napos napokon', text: 'Elég, ha árnyékot ad' },
      { id: 'rain', title: 'Esőben is', text: 'Ne kelljen beszaladni' },
      { id: 'season', title: 'Tavasztól őszig', text: 'Szélben, hűvös estéken is' },
    ] as AdvisorOption<AdvisorWeather>[],
  },
  light: {
    title: 'Mennyi fényt szeretnél alatta?',
    options: [
      { id: 'adjustable', title: 'Állíthatót', text: 'Hol árnyék, hol napfény' },
      { id: 'bright', title: 'Sok fényt', text: 'Világos, a ház se sötétedjen' },
      { id: 'shade', title: 'Teljes árnyékot', text: 'Hűvös, zárt tető' },
      { id: 'sky', title: 'Nyitható tetőt', text: 'Néha a csillagos ég' },
    ] as AdvisorOption<AdvisorLight>[],
  },
  place: {
    title: 'Hová kerül?',
    options: [
      { id: 'wall', title: 'A ház falához', text: 'Teraszra, ajtó elé' },
      { id: 'corner', title: 'A ház sarkába', text: 'L alakú házrésznél' },
      { id: 'garden', title: 'Szabadon a kertbe', text: 'Medence, kerti sarok' },
    ] as AdvisorOption<AdvisorPlace>[],
  },
} as const

export const ADVISOR_ORDER = ['use', 'weather', 'light', 'place'] as const

export interface AdvisorResult {
  config: PergolaConfig
  furniture: FurnitureSet
  totalGross: number
  reasons: string[]
  alternative: { config: PergolaConfig; totalGross: number; title: string; text: string } | null
}

/** Tetőpreferencia a fény és az időjárás szerint (az első elérhető nyer). */
function roofPreference({ light, weather }: AdvisorAnswers): RoofType[] {
  if (light === 'bright') return ['glass', 'polycarbonate', 'louvered', 'fixed']
  if (light === 'shade') return ['fixed', 'louvered', 'polycarbonate']
  if (light === 'sky') return weather === 'sun' ? ['fabric', 'retractable', 'louvered'] : ['retractable', 'louvered', 'fabric']
  return weather === 'sun' ? ['louvered', 'fabric', 'retractable', 'fixed'] : ['louvered', 'retractable', 'fixed']
}

/** Olcsóbb, de még értelmes alternatíva a javasolt tetőhöz. */
const CHEAPER: Partial<Record<RoofType, RoofType[]>> = {
  retractable: ['louvered', 'fabric'],
  louvered: ['fabric', 'fixed'],
  glass: ['polycarbonate'],
  fabric: ['fixed'],
}

const FURNITURE: Record<AdvisorUse, FurnitureSet> = { lounge: 'lounge', dining: 'dining6', party: 'combo' }

/** A legkisebb, kényelmes méret a bútorhoz, fél méterre kerekítve felfelé, a gyártói határokon belül. */
function sizeFor(tenant: Tenant, furniture: FurnitureSet): { width: number; depth: number } {
  const { width: [wMin, wMax], depth: [dMin, dMax] } = tenant.limits
  const start = { width: Math.max(wMin, 3), depth: Math.max(dMin, 3) }
  const fit = furnitureFit(furniture, start, tenant.limits)
  const target = fit?.suggestion ?? start
  const half = (value: number) => Math.ceil(value * 2 - 1e-9) / 2
  // A bútor minimumánál kicsit tágasabb, gyakori méretek (4 × 3 m alatt szűkösnek érződik).
  const floor = furniture === 'combo' ? { width: 6, depth: 3.5 } : { width: 4, depth: 3 }
  return { width: Math.min(wMax, Math.max(wMin, floor.width, half(target.width))), depth: Math.min(dMax, Math.max(dMin, floor.depth, half(target.depth))) }
}

const MOUNT_FOR: Record<AdvisorPlace, MountType[]> = { wall: ['wall'], corner: ['corner-left', 'corner-right', 'wall'], garden: ['freestanding'] }

export function adviseConfig(tenant: Tenant, answers: AdvisorAnswers, prices: PriceSettings = tenant.prices): AdvisorResult {
  const roofs = enabledRoofs(tenant)
  const roof = roofPreference(answers).find((item) => roofs.includes(item)) ?? roofs[0]
  const mount = MOUNT_FOR[answers.place].find((item) => tenant.mounts.includes(item)) ?? tenant.mounts[0]
  const furniture = FURNITURE[answers.use]
  const size = sizeFor(tenant, furniture)
  const has = (type: Exclude<SideType, 'none'>) => tenant.sides.includes(type)

  // Oldalak: napos használathoz nyitott; esőhöz a szél felőli oldalakra ZIP; szezonhoz elöl üveg, oldalt ZIP.
  const sides: Record<SideKey, SideType> = { front: 'none', back: 'none', left: 'none', right: 'none' }
  if (answers.weather === 'rain' && has('zip')) { sides.left = 'zip'; sides.right = 'zip' }
  if (answers.weather === 'season') {
    sides.front = has('glass') ? 'glass' : has('zip') ? 'zip' : 'none'
    sides.left = has('zip') ? 'zip' : has('glass') ? 'glass' : 'none'
    sides.right = sides.left
    if (mount === 'freestanding') sides.back = sides.left
  }
  for (const side of wallSides(mount)) sides[side] = 'none'
  const area = size.width * size.depth
  const heaters = answers.weather === 'season' ? Math.min(tenant.limits.maxHeaters, Math.max(1, Math.round(area / 12))) : 0
  const movable = ROOF_INFO[roof].motion !== 'none'
  const draft: PergolaConfig = {
    ...tenant.defaultConfig,
    ...size,
    mount,
    roof,
    sides,
    louverAngle: roof === 'louvered' ? 35 : 0,
    screenOpen: 65,
    led: tenant.extras.led,
    heaters,
    speakers: false,
    sensors: tenant.extras.sensors && movable && answers.weather !== 'sun',
    solar: undefined,
  }
  const config = normalizeConfig(tenant, draft)
  const total = tenantPrice(tenant, config, prices).totalGross

  const name = tenant.roofs[config.roof]?.name ?? ROOF_INFO[config.roof].name
  const short = tenant.roofs[config.roof]?.short ?? ROOF_INFO[config.roof].short
  const reasons: string[] = []
  reasons.push(`${name} · ${short}: ${{
    adjustable: 'a lamellák szögével percre pontosan állítod, mennyi nap jusson be.',
    bright: 'átengedi a fényt, így a ház helyiségei sem sötétednek el.',
    shade: 'zárt, teljes árnyékot ad, nyáron is hűvös marad alatta.',
    sky: 'szép időben nyitható, esőben egy gombnyomással zárható.',
  }[answers.light]}`)
  const furnitureSpec = furniture !== 'none' ? FURNITURE_SETS[furniture] : null
  if (furnitureSpec) reasons.push(`${config.width.toFixed(1).replace('.', ',')} × ${config.depth.toFixed(1).replace('.', ',')} m — ${furnitureSpec.label.toLowerCase()} (${furnitureSpec.people}) kényelmesen elfér alatta, körbe lehet járni.`)
  const sideText = (Object.values(config.sides) as SideType[]).some((type) => type === 'glass') ? 'Elöl tolóüveg, oldalt ZIP screen: szélben, hűvösebb estéken is kint maradhatsz.'
    : (Object.values(config.sides) as SideType[]).some((type) => type === 'zip') ? 'Oldalt ZIP screen: a ferde eső és a szél ellen leengeded, utána eltűnik a kazettában.'
    : 'Nyitott oldalak: szellős marad, és ez a legkedvezőbb ár.'
  reasons.push(sideText)
  if (config.heaters > 0) reasons.push(`${config.heaters} db infrapanel a hűvös tavaszi és őszi estékre.`)
  if (config.sensors) reasons.push('Eső- és szélérzékelő: ha elered, a tető magától bezár.')

  let alternative: AdvisorResult['alternative'] = null
  const cheaper = (CHEAPER[config.roof] ?? []).find((item) => roofs.includes(item))
  if (cheaper) {
    const altConfig = normalizeConfig(tenant, { ...config, roof: cheaper, sensors: config.sensors && ROOF_INFO[cheaper].motion !== 'none', louverAngle: cheaper === 'louvered' ? 35 : 0 })
    const altTotal = tenantPrice(tenant, altConfig, prices).totalGross
    if (altTotal < total) {
      const altName = tenant.roofs[cheaper]?.name ?? ROOF_INFO[cheaper].name
      const altShort = tenant.roofs[cheaper]?.short ?? ROOF_INFO[cheaper].short
      alternative = { config: altConfig, totalGross: altTotal, title: `${altName} ${altShort}`, text: `${ROOF_INFO[cheaper].shade.charAt(0).toUpperCase()}${ROOF_INFO[cheaper].shade.slice(1)} · ${ROOF_INFO[cheaper].rain.toLowerCase()}` }
    }
  }
  return { config, furniture, totalGross: total, reasons, alternative }
}
