import type { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces'
import { isWallSide, MOUNT_LABELS, wallLabel } from '@/lib/mount'
import { formatHuf, formatNumber } from '@/lib/pricing'
import { getSpecCode } from '@/lib/specification'
import type { Tenant } from '@/tenants/types'
import type { PergolaConfig, PriceBreakdown, RoofType } from '@/types/pergola'
const SIDE_NAMES = { front: 'Elülső', back: 'Hátsó', left: 'Bal', right: 'Jobb' }
const SIDE_TYPES = { none: 'Nyitott', zip: 'ZIP screen', glass: 'Tolóüveg', louver: 'Fix lamella' }

export async function exportPergolaPdf(config: PergolaConfig, price: PriceBreakdown, tenant: Tenant, ROOF_LABELS: Record<RoofType, string>) {
  const brandLine = [tenant.brand.name, tenant.brand.suffix].filter(Boolean).join(' ')
  const colorName = (() => {
    if (config.frameColor === 'custom') return config.customRal || 'Egyedi RAL'
    const color = tenant.colors.find((item) => item.id === config.frameColor)
    return color ? `${color.name} · ${color.detail}` : config.frameColor
  })()
  const contact = [tenant.brand.legalName, tenant.brand.address, tenant.brand.phone, tenant.brand.email, tenant.brand.website].filter(Boolean).join(' · ')
  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  pdfMake.addVirtualFileSystem(pdfFonts as unknown as Record<string, string>)

  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-pergola-canvas="true"]')
  let image: string | undefined
  try {
    if (canvas && canvas.width > 0) image = canvas.toDataURL('image/jpeg', 0.88)
  } catch {
    // A PDF képernyőkép nélkül is elkészül, ha a GPU nem engedi a kiolvasást.
  }

  const configuration = [
    ['Kialakítás', MOUNT_LABELS[config.mount]],
    ['Tetőrendszer', ROOF_LABELS[config.roof]],
    ['Külső méretek', `${config.width.toFixed(2)} × ${config.depth.toFixed(2)} × ${config.height.toFixed(2)} m`],
    ['Lefedett terület', `${formatNumber(price.area)} m²`],
    ['Szerkezetszín', colorName],
    ['Spec-kód', getSpecCode(config)],
    ...(['front', 'back', 'left', 'right'] as const).map((side) => [`${SIDE_NAMES[side]} oldal`, isWallSide(config.mount, side) ? wallLabel(side) : SIDE_TYPES[config.sides[side]]]),
    ...(config.roof !== 'fixed' ? [[config.roof === 'retractable' ? 'Tetőnyitás' : 'Lamellaszög', `${config.louverAngle}°`]] : []),
    ['LED világítás', config.led ? 'Igen' : 'Nem'],
    ['Teraszfűtés', `${config.heaters} db`],
    ['Hangrendszer', config.speakers ? 'Igen' : 'Nem'],
    ['Eső- és szélérzékelő', config.sensors ? 'Igen' : 'Nem'],
  ]

  const priceBody: TableCell[][] = [
    [{ text: 'Tétel', style: 'tableHeader' }, { text: 'Nettó összeg', style: 'tableHeader', alignment: 'right' as const }],
    ...price.lines.map((line): TableCell[] => [
      { text: line.label, style: 'tableCell' },
      { text: formatHuf(line.amountNet), alignment: 'right' as const, style: 'tableCell' },
    ]),
    [{ text: 'Telepítés és üzembe helyezés', style: 'tableCell' }, { text: formatHuf(price.installationNet), alignment: 'right' as const, style: 'tableCell' }],
  ]
  const totalsBody: TableCell[][] = [
    [{ text: 'Nettó összesen' }, { text: formatHuf(price.totalNet), alignment: 'right' as const }],
    [{ text: 'ÁFA' }, { text: formatHuf(price.vatNet), alignment: 'right' as const }],
    [{ text: 'Bruttó irányár', bold: true, fontSize: 13, color: '#007fae', margin: [0, 8, 0, 0] }, { text: formatHuf(price.totalGross), bold: true, fontSize: 13, color: '#007fae', alignment: 'right' as const, margin: [0, 8, 0, 0] }],
  ]

  const content: TDocumentDefinitions['content'] = [
    { columns: [{ text: brandLine.toUpperCase(), style: 'brand' }, { text: '3D KONFIGURÁCIÓS ÖSSZEFOGLALÓ', style: 'documentType', alignment: 'right' }] },
    { text: `${ROOF_LABELS[config.roof].split(' · ')[0]} pergola`, style: 'title' },
    { text: `${config.width.toFixed(2).replace('.', ',')} × ${config.depth.toFixed(2).replace('.', ',')} m · ${formatNumber(price.area)} m²`, style: 'subtitle' },
  ]
  if (image) content.push({ image, width: 500, margin: [0, 18, 0, 18] })
  content.push(
    { text: 'Konfiguráció', style: 'sectionTitle' },
    // Két hasábban, hogy a képpel együtt is kiférjen az első oldalra
    // (korábban 6 sor átcsúszott egy szinte üres második oldalra).
    { columns: [configuration.slice(0, Math.ceil(configuration.length / 2)), configuration.slice(Math.ceil(configuration.length / 2))].map((half) => ({ width: '*', table: { widths: [92, '*'], body: half.map(([label, value]) => [{ text: label, color: '#626b70', margin: [0, 4, 0, 4] }, { text: value, bold: true, margin: [0, 4, 0, 4] }]) }, layout: 'noBorders' })), columnGap: 18 },
    { text: 'Árkalkuláció', style: 'sectionTitle', pageBreak: image ? 'before' : undefined },
    { table: { headerRows: 1, widths: ['*', 110], body: priceBody }, layout: { fillColor: (rowIndex: number) => rowIndex === 0 ? '#15232c' : rowIndex % 2 === 0 ? '#f1f4f4' : null, hLineWidth: () => 0, vLineWidth: () => 0, paddingTop: () => 7, paddingBottom: () => 7, paddingLeft: () => 7, paddingRight: () => 7 } },
    { columns: [{ width: '*', text: '' }, { width: 'auto', table: { widths: [120, 100], body: totalsBody }, layout: 'noBorders' }], margin: [0, 14, 0, 20] },
    { text: 'Fontos tudnivalók', style: 'sectionTitle' },
    { ul: [
      'Ez a dokumentum tájékoztató jellegű kalkuláció, nem minősül ajánlattételnek vagy műszaki tervnek.',
      'A végleges ár helyszíni felmérés, statikai ellenőrzés, rögzítési mód, gyártói árlista és egyedi műszaki igények alapján változhat.',
      'Az építési bejelentési vagy engedélyezési kötelezettség az adott kialakítástól és a helyi szabályozástól függ; kivitelezés előtt szakértői ellenőrzés szükséges.',
    ], style: 'disclaimer' },
    ...(tenant.demo ? [] : [{ text: 'Kapcsolat', style: 'sectionTitle' }, { text: contact, style: 'disclaimer' }]),
  )

  const definition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [42, 42, 42, 48],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#233039', lineHeight: 1.25 },
    content,
    footer: (page, pages) => ({ columns: [{ text: `${brandLine} · ${new Date().toLocaleDateString('hu-HU')}`, fontSize: 8, color: '#78848a' }, { text: `${page} / ${pages}`, alignment: 'right', fontSize: 8, color: '#78848a' }], margin: [42, 12, 42, 0] }),
    styles: {
      brand: { fontSize: 15, bold: true, color: '#12232d', characterSpacing: 1 },
      documentType: { fontSize: 8, color: '#62727a', characterSpacing: 1 },
      title: { fontSize: 28, bold: true, margin: [0, 26, 0, 2], color: '#12232d' },
      subtitle: { fontSize: 13, color: '#62727a' },
      sectionTitle: { fontSize: 14, bold: true, margin: [0, 20, 0, 10], color: '#12232d' },
      tableHeader: { bold: true, color: '#ffffff', fontSize: 9 },
      tableCell: { fontSize: 9, margin: [0, 2, 0, 2] },
      disclaimer: { fontSize: 8.5, color: '#65727a', lineHeight: 1.35 },
    },
  }
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
