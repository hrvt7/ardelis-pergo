// Hibabejelentési fotó előkészítése a böngészőben: újrakódolás vásznon keresztül JPEG-be.
// - A vászon nem visz át metaadatot: az EXIF (GPS-hely, eszköz, időpont) a feltöltés előtt eltűnik.
// - A tájolást a böngésző a dekódoláskor alkalmazza, így a kép nem fordul el.
// - HEIC/HEIF: ahol a böngésző dekódolni tudja (Safari), JPEG lesz belőle; ahol nem, hibaüzenet kér JPEG-et.
// - A hosszabbik oldal legfeljebb 2560 px, a fájl legfeljebb 4 MB (Edge-kérés korlát); az eredeti legfeljebb 8 MB lehet.

export const MAX_ORIGINAL_BYTES = 8 * 1024 * 1024
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
export const MAX_EDGE_PX = 2560

export type PhotoError = 'too-large' | 'unsupported' | 'failed'

/** Arányos kicsinyítés úgy, hogy a hosszabbik oldal legfeljebb `max` legyen (nagyítás nincs). */
export function fitWithin(width: number, height: number, max = MAX_EDGE_PX) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch { /* tartalék: <img> */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))

export async function preparePhoto(file: File): Promise<{ ok: true; blob: Blob } | { ok: false; error: PhotoError }> {
  if (file.size > MAX_ORIGINAL_BYTES) return { ok: false, error: 'too-large' }
  let image: Awaited<ReturnType<typeof decode>>
  try { image = await decode(file) } catch { return { ok: false, error: 'unsupported' } }
  try {
    let max = MAX_EDGE_PX
    for (let attempt = 0; attempt < 5; attempt++) {
      const size = fitWithin(image.width, image.height, max)
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height
      const context = canvas.getContext('2d')
      if (!context) return { ok: false, error: 'failed' }
      context.fillStyle = '#fff'
      context.fillRect(0, 0, size.width, size.height)
      context.drawImage(image.source, 0, 0, size.width, size.height)
      const blob = await toBlob(canvas, attempt === 0 ? 0.86 : 0.78)
      canvas.width = 0
      canvas.height = 0
      if (!blob) return { ok: false, error: 'failed' }
      if (blob.size <= MAX_UPLOAD_BYTES) return { ok: true, blob }
      max = Math.round(max * 0.8)
    }
    return { ok: false, error: 'too-large' }
  } finally {
    image.close()
  }
}
