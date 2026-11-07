// Rögzítési módok: melyik oldalon van fal, hány oszlop kell, mi a neve.
// Egyetlen igazságforrás a 3D-modellhez, az árhoz, az anyaglistához, a PDF-hez
// és a szerveroldali e-mailhez. Tiszta TypeScript, böngészőben és szerveren is fut.
import type { MountType, PergolaConfig, SideKey } from '../types/pergola'
import { bayBoundaries, bayCenter, bayWidth, moduleCount } from './modules'

export const MOUNT_TYPES: MountType[] = ['wall', 'corner-left', 'corner-right', 'niche', 'freestanding']

export const MOUNT_LABELS: Record<MountType, string> = {
  wall: 'Falhoz csatlakozó',
  'corner-left': 'L-alakú ház sarkába, balra',
  'corner-right': 'L-alakú ház sarkába, jobbra',
  niche: 'U-alakú ház két szárnya közé',
  freestanding: 'Önálló',
}

/** Rövid címke a fejlécekhez és az árpanelhez. */
export const MOUNT_SHORT: Record<MountType, string> = {
  wall: 'Fal menti',
  'corner-left': 'L-sarok · bal',
  'corner-right': 'L-sarok · jobb',
  niche: 'U-fülke',
  freestanding: 'Önálló',
}

export const MOUNT_DESCRIPTIONS: Record<MountType, string> = {
  wall: 'A házfalra rögzítve, két elülső oszloppal',
  'corner-left': 'A ház és a bal oldali szárny sarkában, egy oszloppal',
  'corner-right': 'A ház és a jobb oldali szárny sarkában, egy oszloppal',
  niche: 'A ház két szárnya között, elülső oszlop nélkül',
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
export function postPositions(config: Pick<PergolaConfig, 'width' | 'depth' | 'mount' | 'modules'>): [number, number][] {
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
  // Modulhatárokon közös oszlopsor: elöl mindig, hátul csak ha nincs házfal.
  for (const x of bayBoundaries(config)) { positions.push([x, front]); if (!walls.includes('back')) positions.push([x, back]) }
  // Hosszú fesztávú mezőnél középoszlop az elülső gerenda alá (fülkében is, mert az oldalfalak csak a végeket tartják).
  if (bayWidth(config) > 6) for (let index = 0; index < moduleCount(config); index++) positions.push([bayCenter(config, index), front])
  return positions
}

/** A falhoz csatlakozó alapeset (2 elülső oszlop) óta elmaradó oszlopok száma. */
export function omittedPosts(mount: MountType) {
  return mount === 'niche' ? 2 : mount === 'corner-left' || mount === 'corner-right' ? 1 : 0
}

export function wallLabel(side: SideKey) {
  return side === 'back' ? 'Házfal' : 'Házszárny'
}

/** Az oldalak, amelyekre oldalzárás tehető (nem fal). */
export function openSides(mount: MountType): SideKey[] {
  return (['front', 'back', 'left', 'right'] as SideKey[]).filter((side) => !isWallSide(mount, side))
}
