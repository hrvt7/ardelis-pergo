// A terasz-burkolat kiterjedése (méterben, a pergola közepéhez képest) — a 3D-burkolat
// és a téli hóréteg ugyanebből számol, hogy pontosan illeszkedjenek.
import { hasBackWall, sideWalls } from './mount'
import type { PergolaConfig } from '../types/pergola'

export function deckBounds(config: Pick<PergolaConfig, 'width' | 'depth' | 'mount'>) {
  const walls = sideWalls(config.mount)
  const overhang = hasBackWall(config.mount) ? 1.1 : 0.55
  const left = walls.includes('left') ? config.width / 2 + 0.125 : config.width / 2 + overhang
  const right = walls.includes('right') ? config.width / 2 + 0.125 : config.width / 2 + overhang
  const depth = config.depth + 1.2
  const centerZ = 0.2
  return { minX: -left, maxX: right, minZ: centerZ - depth / 2, maxZ: centerZ + depth / 2, width: left + right, depth, centerX: (right - left) / 2, centerZ }
}
