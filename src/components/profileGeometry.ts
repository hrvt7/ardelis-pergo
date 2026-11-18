// Gyári profilmetszetek (zárt kontúrok) three.js-geometriává: kihúzás vízszintesen (x mentén) vagy függőlegesen.
import * as THREE from 'three'
import type { Loop, ProfileShape } from '@/lib/os140Profiles'

export type Map2 = (p: [number, number]) => [number, number]
export const ident: Map2 = (p) => p

const trace = (loop: Loop, target: THREE.Path, map: Map2) => loop.forEach((p, i) => { const [x, y] = map(p); if (i) target.lineTo(x, y); else target.moveTo(x, y) })

/** profil → Shape-ok (üregekkel, ha `holes`) */
export function toShapes(profile: ProfileShape[], map: Map2 = ident, holes = true) {
  return profile.map(({ outer, holes: hs }) => {
    const shape = new THREE.Shape()
    trace(outer, shape, map)
    shape.closePath()
    if (holes) for (const h of hs) { const hole = new THREE.Path(); trace(h, hole, map); hole.closePath(); shape.holes.push(hole) }
    return shape
  })
}

/** üreg nélküli kontúrok → Shape-ok (minden kontúr külön tömör alak) */
export const loopsToShapes = (loops: Loop[], map: Map2 = ident) => toShapes(loops.map((outer) => ({ outer, holes: [] })), map, false)

/** a szelvény (x → világ z, y → világ y) kihúzása az x tengely mentén, középre igazítva */
export function alongX(shapes: THREE.Shape[], length: number) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth: length, bevelEnabled: false, curveSegments: 1 })
  g.translate(0, 0, -length / 2)
  g.rotateY(-Math.PI / 2)
  g.computeVertexNormals()
  return g
}

/** függőleges kihúzás 0-tól `height`-ig; a szelvény x → világ x, y → világ −z */
export function upward(shapes: THREE.Shape[], height: number) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth: height, bevelEnabled: false, curveSegments: 1 })
  g.rotateX(-Math.PI / 2)
  g.computeVertexNormals()
  return g
}
