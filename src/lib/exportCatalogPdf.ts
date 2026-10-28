import type { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces'
import { FAMILY_META, LABELS, outdoorSpecCode } from '@/lib/catalog'
import { formatHuf, formatNumber } from '@/lib/pricing'
import type { OutdoorConfig } from '@/types/catalog'
import type { PriceBreakdown } from '@/types/pergola'

export async function exportCatalogPdf(config: OutdoorConfig, price: PriceBreakdown) {
  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
  pdfMake.addVirtualFileSystem(pdfFonts as unknown as Record<string, string>)
  let image: string | undefined
  try { image = document.querySelector<HTMLCanvasElement>('canvas[data-catalog-canvas="true"]')?.toDataURL('image/jpeg', 0.86) } catch { /* GPU readback optional */ }
  const roofFamily = config.family === 'canopy' || config.family === 'carport'
  const rows = roofFamily ? [
    ['Külső méret', `${formatNumber(config.width * (config.family === 'carport' ? config.bays : 1), 2)} × ${formatNumber(config.depth, 2)} × ${formatNumber(config.height, 2)} m`],
    ['Szerkezet', LABELS.frame[config.frameMaterial]], ['Fedés', LABELS.roof[config.roofMaterial]],
    ['Tetőforma', config.shape === 'mono' ? 'Egyenes / félnyereg' : config.shape === 'curved' ? 'Íves' : 'Nyereg'],
    ['Rögzítés', config.mount], ['Oldalzárás', config.sideWalls],
  ] : [
    ['Kerítéshossz', `${formatNumber(config.length, 2)} fm`], ['Magasság', `${formatNumber(config.height, 2)} m`],
    ['Anyag', LABELS.frame[config.frameMaterial]], ['Mintázat', LABELS.style[config.style]],
    ['Gépkocsikapu', LABELS.gate[config.gateType]], ['Kapuszélesség', config.gateType === 'none' ? '—' : `${formatNumber(config.gateWidth, 2)} m`],
    ['Automatika', config.gateAutomation ? 'Igen' : 'Nem'], ['Biztonsági csomag', config.safetyKit ? 'Igen' : 'Nem'],
  ]
  const body: TableCell[][] = [[{ text: 'Tétel', style: 'tableHeader' }, { text: 'Nettó', style: 'tableHeader', alignment: 'right' }], ...price.lines.map((line) => [{ text: line.label, style: 'tableCell' }, { text: formatHuf(line.amountNet), alignment: 'right' as const, style: 'tableCell' }]), [{ text: 'Telepítési mintatétel' }, { text: formatHuf(price.installationNet), alignment: 'right' }]]
  const content: TDocumentDefinitions['content'] = [
    { text: `ARDELIS / ${FAMILY_META[config.family].name.toUpperCase()}`, style: 'brand' },
    { text: `${FAMILY_META[config.family].title} · műszaki és árösszefoglaló`, style: 'title' },
    { text: outdoorSpecCode(config), style: 'subtitle' },
  ]
  if (image) content.push({ image, width: 500, margin: [0, 18, 0, 18] })
  content.push(
    { text: 'Konfiguráció', style: 'sectionTitle' },
    { table: { widths: [150, '*'], body: [...rows, ['Spec-kód', outdoorSpecCode(config)]].map(([a, b]) => [{ text: a, color: '#64706c' }, { text: b, bold: true }]) }, layout: 'noBorders' },
    { text: 'Tájékoztató árkalkuláció', style: 'sectionTitle', pageBreak: image ? 'before' : undefined },
    { table: { headerRows: 1, widths: ['*', 110], body }, layout: { fillColor: (i: number) => i === 0 ? '#17211e' : i % 2 === 0 ? '#eef0eb' : null, hLineWidth: () => 0, vLineWidth: () => 0 } },
    { text: `Nettó: ${formatHuf(price.totalNet)}  ·  ÁFA: ${formatHuf(price.vatNet)}  ·  Bruttó irányár: ${formatHuf(price.totalGross)}`, style: 'total' },
    { text: 'Tudnivalók', style: 'sectionTitle' },
    { ul: ['Tájékoztató kalkuláció, nem ajánlattétel és nem kiviteli terv.', 'A végleges ár felmérés, statika, alapozás, gyártói rendszer és műszaki tartalom alapján változhat.', 'Engedélyezési és bejelentési kötelezettség helyi és műszaki ellenőrzést igényel.', 'Az EV- és napelem-előkészítés nem tartalmaz töltőt, napelemrendszert vagy villamos tervezést.'], style: 'disclaimer' },
  )
  const definition: TDocumentDefinitions = {
    pageSize: 'A4', pageMargins: [42, 42, 42, 42], defaultStyle: { font: 'Roboto', fontSize: 10, color: '#25302c' }, content,
    styles: { brand: { fontSize: 15, bold: true, characterSpacing: 1 }, title: { fontSize: 23, bold: true, margin: [0, 20, 0, 4] }, subtitle: { fontSize: 10, color: '#64706c' }, sectionTitle: { fontSize: 14, bold: true, margin: [0, 20, 0, 10] }, tableHeader: { bold: true, color: '#ffffff' }, tableCell: { fontSize: 9, margin: [0, 5, 0, 5] }, total: { fontSize: 12, bold: true, margin: [0, 18, 0, 0] }, disclaimer: { fontSize: 8.5, color: '#64706c' } },
  }
  const url = URL.createObjectURL(await pdfMake.createPdf(definition).getBlob())
  const link = document.createElement('a'); link.href = url; link.download = `ARDELIS-${FAMILY_META[config.family].name}-${outdoorSpecCode(config)}.pdf`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
