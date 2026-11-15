import type { CameraView } from '@/types/pergola'
import { tr } from '../i18n/locale'

/** A kameranézetek sorrendben (a jelenet „Nézet” menüje ebből épül). */
export const CAMERA_VIEW_LIST: { id: CameraView; label: string }[] = [
  { id: 'perspective', label: tr('Kívülről', 'Von außen') },
  { id: 'interior', label: tr('Alulról', 'Von unten') },
  { id: 'top', label: tr('Felülről', 'Von oben') },
  { id: 'detail', label: tr('Részlet', 'Detail') },
  { id: 'sofa', label: tr('Kanapé', 'Sofa') },
]

/** A termékhez illő nézetek: a carportnál nincs kanapé-panoráma. */
export function cameraViewsFor(product: string | undefined): { id: CameraView; label: string }[] {
  return CAMERA_VIEW_LIST.filter(({ id }) => !(product === 'carport' && id === 'sofa'))
}
