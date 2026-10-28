// Rögzítési módok: melyik oldalon van fal, hány oszlop kell, mi a neve.
// Egyetlen igazságforrás a 3D-modellhez, az árhoz, az anyaglistához, a PDF-hez
// és a szerveroldali e-mailhez. Tiszta TypeScript, böngészőben és szerveren is fut.
import type { MountType, PergolaConfig, SideKey } from '../types/pergola'

export const MOUNT_TYPES: MountType[] = ['wall', 'corner-left', 'corner-right', 'niche', 'freestanding']

export const MOUNT_LABELS: Record<MountType, string> = {
  wall: 'Falhoz csatlakozó',
  'corner-left': 'Sarokba, bal oldali fallal',
  'corner-right': 'Sarokba, jobb oldali fallal',
  niche: 'Fülkébe, három fal közé',
  freestanding: 'Önálló',
}

/** Rövid címke a fejlécekhez és az árpanelhez. */
export const MOUNT_SHORT: Record<MountType, string> = {
  wall: 'Fal menti',
  'corner-left': 'Sarok · bal',
  'corner-right': 'Sarok · jobb',
  niche: 'Fülke',
  freestanding: 'Önálló',
}

export const MOUNT_DESCRIPTIONS: Record<MountType, string> = {
  wall: 'A házfalra rögzítve, két elülső oszloppal',
  'corner-left': 'Házfal és bal oldali fal sarkában, egy oszloppal',
  'corner-right': 'Házfal és jobb oldali fal sarkában, egy oszloppal',
  niche: 'Három fal között, elülső oszlop nélkül',
  freestanding: 'Négy oszlopon, bárhol a kertben',
}

/** A spec-kódban használt egybetűs jel (régi kódok: W és F változatlan). */
export const MOUNT_CODES: Record<MountType, string> = { wall: 'W', 'corner-left': 'L', 'corner-right': 'R', niche: 'N', freestanding: 'F' }

export function wallSides(mount: MountType): SideKey[] {
  switch (mount) {
    case 'wall': return ['back']
    case 'corner-left': return ['back', 'left']
    case 'corner-right': return ['back', 'right']
    case 'niche': return ['back', 'left', 'right']
    default: return []
  }
}

export const isWallSide = (mount: MountType, side: SideKey) => wallSides(mount).includes(side)

/** Oldalsó (nem házfal) falak — ezek kerülnek a 3D-be és az árba külön. */
export const sideWalls = (mount: MountType) => wallSides(mount).filter((side): side is 'left' | 'right' => side !== 'back')

export const hasBackWall = (mount: MountType) => mount !== 'freestanding'

/** Az oszlopok középpontjai (x, z) méterben, a pergola közepéhez képest. */
export function postPositions(config: Pick<PergolaConfig, 'width' | 'depth' | 'mount'>): [number, number][] {
  const { width, depth, mount } = config
  const left = -width / 2 + 0.09
  const right = width / 2 - 0.09
  const front = depth / 2 - 0.09
  const back = -depth / 2 + 0.09
  const walls = wallSides(mount)
  const positions: [number, number][] = []
  if (!walls.includes('back')) positions.push([left, back], [right, back])
  if (!walls.includes('left')) positions.push([left, front])
  if (!walls.includes('right')) positions.push([right, front])
  // Hosszú fesztávnál középoszlop az elülső gerenda alá (fülkében is, mert az oldalfalak csak a végeket tartják).
  if (width > 6) positions.push([0, front])
  return positions
}

/** A falhoz csatlakozó alapeset (2 elülső oszlop) óta elmaradó oszlopok száma. */
export function omittedPosts(mount: MountType) {
  return mount === 'niche' ? 2 : mount === 'corner-left' || mount === 'corner-right' ? 1 : 0
}

export function wallLabel(side: SideKey) {
  return side === 'back' ? 'Házfal' : 'Oldalfal'
}

/** Az oldalak, amelyekre oldalzárás tehető (nem fal). */
export function openSides(mount: MountType): SideKey[] {
  return (['front', 'back', 'left', 'right'] as SideKey[]).filter((side) => !isWallSide(mount, side))
}
