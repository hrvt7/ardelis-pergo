import type { CameraView } from '@/types/pergola'

/** A kameranézetek sorrendben (a jelenet „Nézet” menüje ebből épül). */
export const CAMERA_VIEW_LIST: { id: CameraView; label: string }[] = [
  { id: 'perspective', label: 'Kívülről' },
  { id: 'interior', label: 'Alulról' },
  { id: 'top', label: 'Felülről' },
  { id: 'detail', label: 'Részlet' },
  { id: 'sofa', label: 'Kanapé' },
]

/** A termékhez illő nézetek: a carportnál nincs kanapé-panoráma. */
export function cameraViewsFor(product: string | undefined): { id: CameraView; label: string }[] {
  return CAMERA_VIEW_LIST.filter(({ id }) => !(product === 'carport' && id === 'sofa'))
}
