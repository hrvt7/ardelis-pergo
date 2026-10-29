// A PDF betűtípusa (Manrope, SIL OFL) — csak a PDF készítésekor töltődik be, külön csomagban.
// Latin + közép-európai (ő, ű) karakterkészletre szűkítve, súlyonként ~50 KB.
import regular from '@/assets/pdf-fonts/Manrope-400.ttf?inline'
import semi from '@/assets/pdf-fonts/Manrope-600.ttf?inline'
import bold from '@/assets/pdf-fonts/Manrope-700.ttf?inline'
import heavy from '@/assets/pdf-fonts/Manrope-800.ttf?inline'
import { PDF_FONT_FILES } from './pdfDocument'

const DATA: Record<string, string> = {
  [PDF_FONT_FILES.regular]: regular,
  [PDF_FONT_FILES.semi]: semi,
  [PDF_FONT_FILES.bold]: bold,
  [PDF_FONT_FILES.heavy]: heavy,
}
const base64 = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1)

/** pdfmake virtuális fájlrendszer: fájlnév → base64 (a szöveges tartalomhoz). */
export const PDF_VFS: Record<string, string> = Object.fromEntries(Object.entries(DATA).map(([file, url]) => [file, base64(url)]))

type FontDoc = { font: (src: unknown, ...rest: unknown[]) => unknown; registerFont: (name: string, src: Uint8Array) => unknown; _registeredFonts?: Record<string, unknown> }
type PdfMakeLike = { createPdf: (definition: object) => { getStream: () => Promise<object> } }

let patched = false
/**
 * A műszaki rajz (SVG) szövegeihez az SVG-renderelő fájlnévvel kéri a betűt, amit a böngészős
 * PDFKit nem tud megnyitni. Egyszer, egy próbadokumentumon keresztül a PDFKit `font()`
 * metódusát kiegészítjük: a mi fájlneveinket a beágyazott bájtokra regisztrálja.
 */
export async function enableSvgFonts(pdfMake: PdfMakeLike) {
  if (patched) return
  const bytes = Object.fromEntries(Object.entries(PDF_VFS).map(([file, data]) => [file, Uint8Array.from(atob(data), (character) => character.charCodeAt(0))]))
  const probe = await pdfMake.createPdf({ content: [{ text: ' ' }], defaultStyle: { font: 'Manrope' } }).getStream()
  let proto: object | null = Object.getPrototypeOf(probe)
  while (proto && !Object.prototype.hasOwnProperty.call(proto, 'font')) proto = Object.getPrototypeOf(proto)
  if (!proto) return
  const target = proto as FontDoc
  const original = target.font
  target.font = function patchedFont(this: FontDoc, src: unknown, ...rest: unknown[]) {
    if (typeof src === 'string' && bytes[src] && !this._registeredFonts?.[src]) this.registerFont(src, bytes[src])
    return original.call(this, src, ...rest)
  }
  patched = true
}
