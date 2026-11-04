// Lamelix (B2B) árazás — egy helyen, hogy az oldal, a strukturált adat és a tesztek ugyanazt mutassák.
// Nettó árak, +27% ÁFA. Piaci viszonyítás (2026): Configurix pergola-konfigurátor ~499 USD/hó,
// középkategóriás 3D konfigurátor SaaS 500–2000 EUR/hó + 2–8 ezer EUR bevezetés, egyedi fejlesztés 30–60 ezer USD.

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
  'Termékek, méretkorlátok, opciók és árak feltöltése (ármátrixszal is)',
  'Beépítés a weboldalába (link vagy beágyazás)',
  'Betanítás az admin felülethez',
]

export const PLANS: Plan[] = [
  {
    id: 'start',
    name: 'Start',
    tagline: 'Egy termékcsalád, gyors indulás',
    monthly: 59_000,
    features: [
      '3D pergola-konfigurátor saját arculattal',
      'Azonnali irányár m²-ár alapon',
      'Felmérési kérelem e-mailben, PDF összefoglalóval',
      'QR-kódos, megosztható terv',
      'Gyártói admin: érdeklődők, státuszok',
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
      'Minden, ami a Startban',
      'Ármátrix tetőtípusonként (méretpár → nettó ár)',
      'Látogatói tölcsér és konverziós statisztika',
      'Belső megjegyzések, CSV export',
      'Több értesítési címzett',
      'Korlátlan beágyazás (weboldal, kampányoldal)',
      'Elsőbbségi támogatás, 1 munkanapon belül',
    ],
  },
  {
    id: 'partner',
    name: 'Partnerhálózat',
    tagline: 'Több márka, viszonteladók',
    monthly: null,
    features: [
      'Minden, ami a Próban',
      'Több termékcsalád és márka egy fiókban',
      'Viszonteladói változatok saját arculattal',
      'Egyedi 3D profil és termékszabályok',
      'Igény szerinti integráció (CRM / ERP export)',
    ],
  },
]

const huf = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 })
export const formatFt = (value: number) => `${huf.format(value)} Ft`

/** Havi díj a választott fizetési ütem szerint (éves: 10 hónap ára 12 hónapra elosztva, ezresre kerekítve). */
export function monthlyPrice(plan: Plan, annual: boolean): number | null {
  if (plan.monthly === null) return null
  return annual ? Math.round((plan.monthly * ANNUAL_MONTHS_PAID) / 12 / 1000) * 1000 : plan.monthly
}
