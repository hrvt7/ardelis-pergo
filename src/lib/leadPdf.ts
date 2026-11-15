// PDF-összefoglaló egy beérkezett érdeklődő tervéből, az adminból letöltve. Ugyanaz a dokumentum, amit a vevő
// a konfigurátorban kap (pdfDocument), ugyanazzal az érvényesítéssel és árazással, mint a lead-végpont
// (pergolaEngine) — csak a 3D-kép nélkül, mert az adminban nincs megnyitott 3D-nézet.
import { getEngine } from '../products/engines'
import type { Tenant } from '../tenants/types'
import type { PergolaConfig, PriceBreakdown } from '../types/pergola'
import type { LeadRow } from './adminLeads'

export interface LeadPdfInput {
  config: PergolaConfig
  price: PriceBreakdown
  /** A vevő házának leírása a lead megjegyzéséből („Ház (3D): …” sor), ha van. */
  house?: string
  /** Igaz, ha a mai árlistával számolt bruttó ár eltér attól, amit a vevő a kérés pillanatában látott. */
  priceChanged: boolean
}

const HOUSE_PREFIX = 'Ház (3D): '

/** A lead tervéből a PDF bemenete; null, ha nem pergola, vagy a tárolt konfiguráció már nem érvényes. */
export function leadPdfInput(tenant: Tenant, lead: Pick<LeadRow, 'config' | 'product' | 'notes' | 'estimate_gross'>): LeadPdfInput | null {
  if (lead.product && lead.product !== 'pergola') return null
  const engine = getEngine('pergola')
  if (!engine || !lead.config) return null
  const config = engine.parse(tenant, lead.config) as PergolaConfig | null
  if (!config) return null
  const price = engine.price(tenant, config)
  const house = lead.notes?.split('\n').find((line) => line.startsWith(HOUSE_PREFIX))?.slice(HOUSE_PREFIX.length).trim() || undefined
  return { config, price, house, priceChanged: Math.abs(price.totalGross - lead.estimate_gross) >= 1 }
}

export const leadPdfFileName = (tenant: Tenant, lead: Pick<LeadRow, 'ref'>, config: PergolaConfig) =>
  `${tenant.brand.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${lead.ref.replace(/[^A-Za-z0-9-]+/g, '')}-${config.width.toFixed(2)}x${config.depth.toFixed(2)}.pdf`
