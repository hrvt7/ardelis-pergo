// Bemutató-kép: a 3D jelenet pillanatképe és a megosztható, márkázott kép (1080 × 1350,
// Instagram/WhatsApp-barát álló formátum) a terv nevével, méretével, színével és árával.

/** A 3D vászon aktuális képe (a jelenet `preserveDrawingBuffer`-rel fut, így olvasható). */
export function captureScene(maxWidth = 1600, quality = 0.86): string | null {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-pergola-canvas="true"]')
  if (!canvas || !canvas.width) return null
  const scale = Math.min(1, maxWidth / canvas.width)
  if (scale === 1) return canvas.toDataURL('image/jpeg', quality)
  const copy = document.createElement('canvas')
  copy.width = Math.round(canvas.width * scale)
  copy.height = Math.round(canvas.height * scale)
  const context = copy.getContext('2d')
  if (!context) return null
  context.drawImage(canvas, 0, 0, copy.width, copy.height)
  return copy.toDataURL('image/jpeg', quality)
}

export interface ShareCardInput {
  image: string
  brand: string
  title: string
  facts: string[]
  price: string
  priceNote: string
  footer: string
  accent: string
}

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = reject
  image.src = src
})

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text
  let value = text
  while (value.length > 4 && context.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1)
  return `${value.trimEnd()}…`
}

/** Márkázott megosztókép PNG blobként. */
export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  const width = 1080
  const height = 1350
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas')
  await document.fonts?.ready
  const image = await loadImage(input.image)

  // Kép felül, „cover” illesztéssel.
  const photoHeight = 900
  const ratio = Math.max(width / image.width, photoHeight / image.height)
  const drawWidth = image.width * ratio
  const drawHeight = image.height * ratio
  context.fillStyle = '#0f1412'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, (width - drawWidth) / 2, (photoHeight - drawHeight) / 2, drawWidth, drawHeight)
  const fade = context.createLinearGradient(0, photoHeight - 260, 0, photoHeight + 2)
  fade.addColorStop(0, 'rgba(15,20,18,0)')
  fade.addColorStop(1, 'rgba(15,20,18,1)')
  context.fillStyle = fade
  context.fillRect(0, photoHeight - 260, width, 262)

  const left = 72
  const font = (weight: number, size: number) => `${weight} ${size}px "Instrument Sans", "Manrope", system-ui, sans-serif`
  // Márka felül.
  context.font = font(700, 26)
  context.fillStyle = 'rgba(10,14,12,.55)'
  context.beginPath()
  context.roundRect(left - 24, 52, Math.min(width - 96, context.measureText(input.brand.toUpperCase()).width + 74), 64, 32)
  context.fill()
  context.fillStyle = input.accent
  context.beginPath()
  context.arc(left + 6, 84, 7, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f4f5f0'
  context.font = font(700, 26)
  context.fillText(input.brand.toUpperCase(), left + 26, 93)

  // Cím és tények.
  let y = photoHeight + 8
  context.fillStyle = '#f4f5f0'
  context.font = font(600, 64)
  context.fillText(fitText(context, input.title, width - left * 2), left, y)
  y += 58
  context.fillStyle = 'rgba(232,236,226,.72)'
  context.font = font(500, 30)
  for (const fact of input.facts.slice(0, 3)) {
    context.fillText(fitText(context, fact, width - left * 2), left, y)
    y += 44
  }

  // Ár.
  const priceY = height - 150
  context.strokeStyle = 'rgba(232,236,226,.16)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(left, priceY - 62)
  context.lineTo(width - left, priceY - 62)
  context.stroke()
  context.fillStyle = input.accent
  context.font = font(600, 72)
  context.fillText(input.price, left, priceY + 10)
  context.fillStyle = 'rgba(232,236,226,.6)'
  context.font = font(500, 26)
  context.fillText(input.priceNote, left, priceY + 54)
  context.textAlign = 'right'
  context.fillText(fitText(context, input.footer, 420), width - left, priceY + 54)
  context.textAlign = 'left'

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('blob'))), 'image/png'))
}

/** Megosztás a telefon megosztó menüjével (WhatsApp, Messenger…), különben letöltés. */
export async function shareOrDownload(blob: Blob, fileName: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: blob.type })
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  // A rendszer megosztó menüje telefonon/tableten természetes; asztali gépen a letöltés a várt viselkedés.
  const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  if (touch && nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title }); return 'shared' }
    catch (error) { if ((error as DOMException)?.name === 'AbortError') return 'cancelled' }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'downloaded'
}
