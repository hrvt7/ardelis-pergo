import type { EnergyUsage } from '@/lib/energy'
import { snapshotViewerHiRes } from '@/lib/showcase'
import type { Tenant } from '@/tenants/types'
import type { PergolaConfig, PriceBreakdown, RoofType } from '@/types/pergola'

/** A PDF-összefoglaló elkészítése és letöltése (borító, részletek, ár, méretarányos műszaki rajz). */
export async function exportPergolaPdf(config: PergolaConfig, price: PriceBreakdown, tenant: Tenant, roofLabels: Record<RoofType, string>, shareUrl?: string, energyUsage?: EnergyUsage, projectName?: string, house?: string) {
  const [{ default: pdfMake }, { buildPdfDefinition, PDF_FONTS }, { PDF_VFS, enableSvgFonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('@/lib/pdfDocument'),
    import('@/lib/pdfFonts'),
  ])
  pdfMake.addVirtualFileSystem(PDF_VFS)
  pdfMake.setFonts(PDF_FONTS)
  await enableSvgFonts(pdfMake as never)

  // Fotó módban a háttérfotó + 3D együtt kerül a PDF-be (snapshotViewer).
  const snapshot = await snapshotViewerHiRes(2400)
  let image: string | undefined
  let imageAspect: number | undefined
  try {
    if (snapshot && snapshot.width > 0) { image = snapshot.toDataURL('image/jpeg', 0.9); imageAspect = snapshot.width / snapshot.height }
  } catch {
    // A PDF képernyőkép nélkül is elkészül, ha a GPU nem engedi a kiolvasást.
  }

  const definition = buildPdfDefinition({ config, price, tenant, roofLabels, image, imageAspect, shareUrl, energyUsage, projectName, house })
  const blob = await pdfMake.createPdf(definition).getBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${tenant.brand.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-')}-pergola-${config.width.toFixed(2)}x${config.depth.toFixed(2)}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyShareUrl(url: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(url)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = url
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const successful = document.execCommand('copy')
  textarea.remove()
  if (!successful) throw new Error('A másolás nem sikerült')
}
