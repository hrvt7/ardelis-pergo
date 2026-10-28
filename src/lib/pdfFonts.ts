// A PDF betűtípusa (Manrope, SIL OFL) — csak a PDF készítésekor töltődik be, külön csomagban.
// Latin + közép-európai (ő, ű) karakterkészletre szűkítve, súlyonként ~50 KB.
import regular from '@/assets/pdf-fonts/Manrope-400.ttf?inline'
import semi from '@/assets/pdf-fonts/Manrope-600.ttf?inline'
import bold from '@/assets/pdf-fonts/Manrope-700.ttf?inline'
import heavy from '@/assets/pdf-fonts/Manrope-800.ttf?inline'
import { PDF_FONT_FILES } from './pdfDocument'

const base64 = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1)

export const PDF_VFS: Record<string, string> = {
  [PDF_FONT_FILES.regular]: base64(regular),
  [PDF_FONT_FILES.semi]: base64(semi),
  [PDF_FONT_FILES.bold]: base64(bold),
  [PDF_FONT_FILES.heavy]: base64(heavy),
}
