// Nyomtatható QR-matrica a felszerelt termékre: a tulajdonosi oldalra (/t/:token) visz, a gyártó logójával.
// PNG (vászon) és PDF (80 × 100 mm, pdfmake) is készül, mindkettő a böngészőben. A token szövegként nem kerül rá,
// csak a QR-kódba; a matricán a gyártó neve, a termék és a weboldal címe (domain) olvasható.
import type { TDocumentDefinitions } from 'pdfmake/interfaces'

export interface StickerInput { url: string; brandName: string; headline: string; logoUrl?: string | null }
export interface StickerAssets { qrDataUrl: string; logoDataUrl: string | null }

export const STICKER_MM = { width: 80, height: 100 }
const MM = 72 / 25.4
export const STICKER_TEXT = {
  title: 'Digitális termékkönyv',
  subtitle: 'Garancia · hibabejelentés · bővítés',
  scan: 'Olvasd be a telefonod kamerájával',
}

export const stickerHost = (url: string) => { try { return new URL(url).host } catch { return '' } }
export const stickerFileName = (headline: string, ext: 'png' | 'pdf') => `qr-matrica-${headline.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'termek'}.${ext}`

/** A logó letöltése adat-URL-ként (csak PNG/JPEG; CORS-hiba vagy más formátum esetén a gyártó neve kerül a helyére). */
export async function loadLogo(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!response.ok) return null
    const blob = await response.blob()
    if (!/^image\/(png|jpeg)$/.test(blob.type) || blob.size > 2_000_000) return null
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

export async function qrDataUrl(url: string, width = 1024) {
  const { toDataURL } = await import('qrcode')
  return toDataURL(url, { width, margin: 2, errorCorrectionLevel: 'Q', color: { dark: '#111111', light: '#ffffff' } })
}

/** A PDF-matrica leírása (tiszta függvény, tesztelhető). */
export function stickerDefinition(input: StickerInput, assets: StickerAssets): TDocumentDefinitions {
  const width = STICKER_MM.width * MM
  const height = STICKER_MM.height * MM
  const qrSize = 50 * MM
  return {
    pageSize: { width, height },
    pageMargins: [8 * MM, 7 * MM, 8 * MM, 6 * MM],
    info: { title: `QR-matrica – ${input.headline}`, author: input.brandName },
    defaultStyle: { font: 'Manrope', fontSize: 8, color: '#141a19' },
    content: [
      assets.logoDataUrl ? { image: assets.logoDataUrl, fit: [40 * MM, 9 * MM], alignment: 'center', margin: [0, 0, 0, 3 * MM] } : { text: input.brandName, font: 'ManropeHeavy', fontSize: 13, alignment: 'center', margin: [0, 0, 0, 3 * MM] },
      { text: STICKER_TEXT.title, font: 'ManropeHeavy', fontSize: 11, alignment: 'center' },
      { text: STICKER_TEXT.subtitle, fontSize: 7.5, color: '#6a7470', alignment: 'center', margin: [0, 1 * MM, 0, 2 * MM] },
      { image: assets.qrDataUrl, width: qrSize, alignment: 'center' },
      { text: STICKER_TEXT.scan, fontSize: 7.5, alignment: 'center', margin: [0, 1.5 * MM, 0, 0] },
      { text: input.headline, font: 'ManropeSemi', fontSize: 7.5, alignment: 'center', margin: [0, 2 * MM, 0, 0] },
      { text: stickerHost(input.url), fontSize: 6.5, color: '#6a7470', alignment: 'center', margin: [0, 0.5 * MM, 0, 0] },
    ],
  }
}
