// A modellezett házak (modulház) felületi anyagai: textúrafájlok, valós ismétlési méret és a homlokzathoz igazított UV.
// A GLB-kben nincs UV, ezért a betöltéskor számoljuk: minden lap a saját síkjában kap méterben mért koordinátát
// (vízszintes irány a lap mentén + a lejtés/függőleges irány), így a cserépsorok a gerinccel párhuzamosak,
// a vakolat szemcséje pedig minden falon azonos méretű. React és three-jelenet nélkül tesztelhető.
import * as THREE from 'three'

export type HouseSurface = 'plaster' | 'plinth' | 'roof'

export interface HouseSurfaceInfo {
  /** Egy textúra-ismétlés valós mérete méterben (a Poly Haven-forrás fizikai mérete). */
  size: number
  normalScale: number
  files: { map: string; normal: string; rough: string }
}

/** Forrás (CC0): plastered_wall_04 (3,2 m), concrete_floor_02 (2 m), grey_roof_01 (8 m) – public/assets/CREDITS.md. */
export const HOUSE_SURFACES: Record<HouseSurface, HouseSurfaceInfo> = {
  plaster: { size: 3.2, normalScale: 0.9, files: { map: '/assets/textures/modular/plaster_tint.webp', normal: '/assets/textures/plastered_wall_04/nor_gl.webp', rough: '/assets/textures/plastered_wall_04/rough.webp' } },
  plinth: { size: 2, normalScale: 0.8, files: { map: '/assets/textures/modular/plinth_tint.webp', normal: '/assets/textures/concrete_floor_02/nor_gl.jpg', rough: '/assets/textures/concrete_floor_02/rough.webp' } },
  roof: { size: 8, normalScale: 1.1, files: { map: '/assets/textures/modular/roof_tint.webp', normal: '/assets/textures/modular/roof_nor_gl.webp', rough: '/assets/textures/modular/roof_rough.webp' } },
}

const UP = new THREE.Vector3(0, 1, 0)

/**
 * Homlokzathoz igazított UV (méter / ismétlési méret): u a lap vízszintes iránya mentén, v a lap „felfelé” iránya
 * (falon függőleges, tetőn a lejtés). Vízszintes lapon (lábazat teteje, lépcső) u = x, v = z.
 * A `matrix` a háló helyzete a ház gyökeréhez képest, hogy a csatlakozó lapok mintázata folytonos legyen.
 */
export function assignFacadeUv(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, size: number) {
  const position = geometry.getAttribute('position')
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
  const normal = geometry.getAttribute('normal')
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix)
  const uv = new Float32Array(position.count * 2)
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()
  const along = new THREE.Vector3()
  const upward = new THREE.Vector3()
  for (let index = 0; index < position.count; index += 1) {
    p.fromBufferAttribute(position, index).applyMatrix4(matrix)
    n.fromBufferAttribute(normal, index).applyMatrix3(normalMatrix).normalize()
    along.crossVectors(UP, n)
    if (along.lengthSq() < 1e-4) { uv[index * 2] = p.x / size; uv[index * 2 + 1] = p.z / size; continue }
    along.normalize()
    upward.crossVectors(n, along).normalize()
    uv[index * 2] = p.dot(along) / size
    uv[index * 2 + 1] = p.dot(upward) / size
  }
  const attribute = new THREE.BufferAttribute(uv, 2)
  attribute.name = 'facadeUv'
  geometry.setAttribute('uv', attribute)
  return geometry
}
