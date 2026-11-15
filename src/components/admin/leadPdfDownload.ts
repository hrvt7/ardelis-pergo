// Az admin lead-PDF letöltése a böngészőben (pdfmake + betűk csak itt töltődnek be). A bemenetet a leadPdf adja.
import type { LeadRow } from '@/lib/adminLeads'
import { leadPdfFileName, type LeadPdfInput } from '@/lib/leadPdf'
import type { Tenant } from '@/tenants/types'

/** A PDF elkészítése és letöltése a böngészőben (a pdfmake csak itt töltődik be). */
export async function downloadLeadPdf(tenant: Tenant, lead: LeadRow, input: LeadPdfInput) {
  const [{ default: pdfMake }, { buildPdfDefinition, PDF_FONTS }, { PDF_VFS, enableSvgFonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('@/lib/pdfDocument'),
    import('@/lib/pdfFonts'),
  ])
  pdfMake.addVirtualFileSystem(PDF_VFS)
  pdfMake.setFonts(PDF_FONTS)
  await enableSvgFonts(pdfMake as never)
  const definition = buildPdfDefinition({ config: input.config, price: input.price, tenant, shareUrl: lead.config_url, projectName: lead.customer_name, house: input.house })
  const blob = await pdfMake.createPdf(definition).getBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = leadPdfFileName(tenant, lead, input.config)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A terv műszaki rajza DXF-ként (valós mm, rétegekkel), ugyanabból a rajzlapból, ami a PDF-ben van. */
export async function downloadLeadDxf(tenant: Tenant, lead: LeadRow, input: LeadPdfInput) {
  const [{ sheetDrawing }, { drawingToDxfBytes }] = await Promise.all([import('@/lib/pdfDocument'), import('@/lib/dxf')])
  const bytes = drawingToDxfBytes(sheetDrawing(input.config, tenant))
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/dxf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = leadPdfFileName(tenant, lead, input.config).replace(/\.pdf$/, '.dxf')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Tájékoztató anyaglista és árkalkuláció CSV-ben (Excel-barát), a PDF-fel azonos tartalommal. */
export async function downloadLeadBom(tenant: Tenant, lead: LeadRow, input: LeadPdfInput) {
  const { bomCsv } = await import('@/lib/bomCsv')
  const url = URL.createObjectURL(new Blob([bomCsv(tenant, lead, input.config, input.price)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = leadPdfFileName(tenant, lead, input.config).replace(/\.pdf$/, '-anyaglista.csv')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
