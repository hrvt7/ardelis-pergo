// Tájékoztató anyaglista és árkalkuláció CSV-ben egy érdeklődő tervéből (gyártói admin). Ugyanaz a tartalom,
// mint a PDF „Anyaglista” és „Árkalkuláció” része, táblázatkezelőbe (Excel: pontosvessző, UTF-8 BOM).
// Nem gyártási anyagszükséglet: a fejléc és az első sor is ezt mondja ki.
import { colorSummary } from './colors'
import { getBom, getSpecCode } from './specification'
import { formatNumber } from './pricing'
import { ROOF_INFO } from './roofs'
import type { Tenant } from '../tenants/types'
import type { PergolaConfig, PriceBreakdown } from '../types/pergola'

export const BOM_DISCLAIMER = 'Tájékoztató anyaglista, nem gyártási anyagszükséglet. A helyszíni felmérés és a gyártói típusstatika után véglegesítendő.'

const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`

export function bomCsv(tenant: Tenant, lead: { ref: string; customer_name: string }, config: PergolaConfig, price: PriceBreakdown): string {
  const roof = tenant.roofs[config.roof]?.name ?? ROOF_INFO[config.roof].name
  const rows: (string | number)[][] = [
    [BOM_DISCLAIMER],
    [],
    ['Azonosító', lead.ref],
    ['Vevő', lead.customer_name],
    ['Konfigurációs kód', getSpecCode(config)],
    ['Méret (sz × m × m)', `${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} × ${formatNumber(config.height, 2)} m`],
    ['Tetőrendszer', roof],
    ['Szín', colorSummary(tenant, config)],
    [],
    ['ANYAGLISTA (tájékoztató)', 'Mennyiség / méret'],
    ...getBom(config).filter((line) => !/^0 db\b/.test(line.value)).map((line) => [line.label, line.value]),
    [],
    ['ÁRKALKULÁCIÓ (nettó, Ft)', 'Részlet', 'Nettó Ft'],
    ...price.lines.map((line) => [line.label, line.detail, Math.round(line.amountNet)]),
    ['Telepítés és üzembe helyezés', '', Math.round(price.installationNet)],
    ['Nettó összesen', '', Math.round(price.totalNet)],
    ['ÁFA', '', Math.round(price.vatNet)],
    ['Bruttó irányár', '', Math.round(price.totalGross)],
  ]
  return `\uFEFF${rows.map((row) => row.map(cell).join(';')).join('\r\n')}\r\n`
}
