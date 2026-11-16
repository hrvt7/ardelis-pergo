// A QR-matrica letöltése a böngészőben (vászon → PNG, pdfmake → PDF). A leírást a src/lib/qrSticker.ts adja.
import { loadLogo, qrDataUrl, stickerDefinition, stickerFileName, stickerHost, STICKER_TEXT, type StickerInput } from '@/lib/qrSticker'

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = reject
  image.src = src
})

/** PNG-matrica: 1000 × 1250 px (80 × 100 mm ≈ 318 dpi). */
export async function downloadStickerPng(input: StickerInput) {
  const [qr, logo] = await Promise.all([qrDataUrl(input.url, 640), loadLogo(input.logoUrl)])
  await document.fonts?.ready
  const canvas = document.createElement('canvas')
  canvas.width = 1000
  canvas.height = 1250
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#dfe3de'
  context.lineWidth = 4
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)
  context.textAlign = 'center'
  context.fillStyle = '#141a19'
  const font = (weight: number, size: number) => `${weight} ${size}px Urbanist, "Urbanist Variable", Manrope, system-ui, sans-serif`
  let y = 70
  if (logo) {
    const image = await loadImage(logo)
    const scale = Math.min(460 / image.width, 110 / image.height)
    context.drawImage(image, (canvas.width - image.width * scale) / 2, y, image.width * scale, image.height * scale)
    y += image.height * scale + 50
  } else {
    context.font = font(800, 64)
    context.fillText(input.brandName, canvas.width / 2, y + 60, 900)
    y += 110
  }
  context.font = font(800, 54)
  context.fillText(STICKER_TEXT.title, canvas.width / 2, y + 40, 900)
  context.font = font(500, 34)
  context.fillStyle = '#6a7470'
  context.fillText(STICKER_TEXT.subtitle, canvas.width / 2, y + 92, 900)
  const qrImage = await loadImage(qr)
  context.drawImage(qrImage, (canvas.width - 640) / 2, y + 120, 640, 640)
  context.fillStyle = '#141a19'
  context.font = font(500, 34)
  context.fillText(STICKER_TEXT.scan, canvas.width / 2, y + 805, 900)
  context.font = font(700, 34)
  context.fillText(input.headline, canvas.width / 2, y + 860, 900)
  context.font = font(500, 28)
  context.fillStyle = '#6a7470'
  context.fillText(stickerHost(input.url), canvas.width / 2, y + 902, 900)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('A PNG nem készült el.')
  download(blob, stickerFileName(input.headline, 'png'))
}

export async function downloadStickerPdf(input: StickerInput) {
  const [{ default: pdfMake }, { PDF_FONTS }, { PDF_VFS }, qr, logo] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('@/lib/pdfDocument'),
    import('@/lib/pdfFonts'),
    qrDataUrl(input.url),
    loadLogo(input.logoUrl),
  ])
  pdfMake.addVirtualFileSystem(PDF_VFS)
  pdfMake.setFonts(PDF_FONTS)
  const blob = await pdfMake.createPdf(stickerDefinition(input, { qrDataUrl: qr, logoDataUrl: logo })).getBlob()
  download(blob, stickerFileName(input.headline, 'pdf'))
}
