// Lamelix (B2B) árazás – egy helyen, hogy az oldal, a strukturált adat és a tesztek ugyanazt mutassák.
// Nettó árak, +27% áfa. Piaci viszonyítás (2026): Configurix pergola-konfigurátor ~499 USD/hó,
// középkategóriás 3D konfigurátor SaaS 500–2000 EUR/hó + 2–8 ezer EUR bevezetés, egyedi fejlesztés 30–60 ezer USD.
//
// Felépítés: a vevői élmény (3D, irányár, AR, fotóba helyezés, PDF, QR) MINDEN csomagban azonos, a csomagok
// a gyártó üzleti igényeiben különböznek (statisztika, beágyazások száma, márkák, white-label, támogatás).

import type { Lang } from '../i18n/lang'

export type PlanId = 'start' | 'pro' | 'partner'

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  /** Havi nettó díj havi fizetésnél (Ft); null = egyedi ajánlat. */
  monthly: number | null
  featured?: boolean
  features: string[]
}

export const SETUP_FEE = 490_000
/** Éves fizetésnél 2 hónap ingyenes. */
export const ANNUAL_MONTHS_PAID = 10

export const SETUP_INCLUDES = [
  'Saját arculat: logó, színek, cégadatok',
  'A termékek, méretkorlátok, opciók és árak feltöltése (ármátrixszal együtt)',
  'Beépítés a weboldalába (link vagy beágyazás)',
  'Betanítás az adminfelület használatára',
]

/** Ami minden csomagban benne van (a vevő szemszögéből). */
export const EVERY_PLAN = ['3D konfigurátor saját arculattal', 'Azonnali irányár az Ön áraival', 'AR-nézet és fotóba helyezés', 'Árnyékelemzés és költségkeret-tervező', 'PDF-összefoglaló és QR-kódos terv']

export const PLANS: Plan[] = [
  {
    id: 'start',
    name: 'Start',
    tagline: 'Egy termékcsalád, gyors indulás',
    monthly: 59_000,
    features: [
      'Teljes 3D konfigurátor egy termékcsaládra',
      'Árazás m²-ár vagy ármátrix alapján',
      'Felmérési kérelmek e-mailben, PDF-összefoglalóval',
      'Gyártói admin: érdeklődők, státuszok, megjegyzések',
      'Beépítés egy weboldalba',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'A teljes értékesítési csatorna',
    monthly: 119_000,
    featured: true,
    features: [
      'Minden, ami a Start csomagban',
      'Látogatói tölcsér és konverziós statisztika',
      'CSV-export és több értesítési címzett',
      'Beépítés korlátlan számú weboldalba és kampányoldalba',
      'Elsőbbségi támogatás, válasz 1 munkanapon belül',
    ],
  },
  {
    id: 'partner',
    name: 'Partnerhálózat',
    tagline: 'Több márka, viszonteladói hálózat',
    monthly: null,
    features: [
      'Minden, ami a Pro csomagban',
      'Több márka és termékcsalád: külön konfigurátor márkánként (egyedi megállapodás szerint)',
      'Viszonteladói változatok saját arculattal, egyedi kiépítéssel',
      'Teljes white-label, Lamelix-jelzés nélkül',
      'Egyedi 3D profil, termékszabályok és integráció (CRM, ERP): egyedi fejlesztés, külön ajánlat alapján',
    ],
  },
]

const huf = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 })
const hufEn = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
export const formatFt = (value: number) => `${huf.format(value)} Ft`
/** Összeg az oldal nyelvén: „5 648 000 Ft” / „HUF 5,648,000”. */
export const formatMoney = (value: number, lang: Lang = 'hu') => (lang === 'en' ? `HUF ${hufEn.format(value)}` : formatFt(value))
/** Rövid összeg a kalkulátorhoz: „5,6 M Ft” / „HUF 5.6M”. */
export function compactMoney(value: number, lang: Lang = 'hu') {
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000
    return lang === 'en' ? `HUF ${millions.toLocaleString('en-US', { maximumFractionDigits: 1 })}M` : `${millions.toLocaleString('hu-HU', { maximumFractionDigits: 1 })} M Ft`
  }
  return formatMoney(Math.round(value / 1000) * 1000, lang)
}

/** Havi díj a választott fizetési ütem szerint (éves: 10 hónap ára 12 hónapra elosztva, ezresre kerekítve). */
export function monthlyPrice(plan: Plan, annual: boolean): number | null {
  if (plan.monthly === null) return null
  return annual ? Math.round((plan.monthly * ANNUAL_MONTHS_PAID) / 12 / 1000) * 1000 : plan.monthly
}

export const VAT = 0.27

export interface RoiInput {
  /** Átlagos projektérték (Ft, bruttó). */
  projectValue: number
  /** Fedezet a nettó árbevételen (%). */
  marginPct: number
  /** A konfigurátornak köszönhető plusz megrendelések száma évente. */
  extraOrders: number
}

/** Megtérülés az első évre: bevezetési díj + 12 havi díj, szemben a plusz megrendelések fedezetével. */
export function estimateRoi(input: RoiInput, plan: Plan, annual: boolean) {
  const monthly = monthlyPrice(plan, annual) ?? 0
  const firstYearCost = SETUP_FEE + monthly * 12
  const marginPerOrder = (input.projectValue / (1 + VAT)) * (input.marginPct / 100)
  const gain = marginPerOrder * input.extraOrders
  return {
    firstYearCost,
    marginPerOrder,
    gain,
    net: gain - firstYearCost,
    /** Ennyi plusz megrendelés fedezi az első év teljes költségét. */
    breakEvenOrders: marginPerOrder > 0 ? firstYearCost / marginPerOrder : Number.POSITIVE_INFINITY,
  }
}
