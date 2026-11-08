// A pergola-jelenet építészeti háza háttérként a többi termékcsalád (kerítés, garázskapu) jelenetében:
// ugyanaz a modell és anyaghangolás, mint a pergolánál (src/lib/houseAsset.ts).
import { use, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getHouseAsset, HOUSE_RAW, tuneHouseMaterials } from '@/lib/houseAsset'

function refreshShadow(renderer: THREE.WebGLRenderer) { renderer.shadowMap.needsUpdate = true }

/**
 * A ház a háttérben: a homlokzat síkja `frontZ`-n, a ház közepe `x`-en, `width` méter széles (az arányok megmaradnak).
 * `hidePorch`: a homlokzat előtti terasz-lemez elrejtése (pl. ha a ház elé más építmény kerül).
 */
export function HouseBackdrop({ x = 0, frontZ, width = 17, hidePorch = false }: { x?: number; frontZ: number; width?: number; hidePorch?: boolean }) {
  const source = use(getHouseAsset())
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const prepared = useMemo(() => {
    const object = source.clone(true)
    tuneHouseMaterials(object)
    object.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const siding = object.getObjectByName('Horizontal_front_and_rear_siding')
    const facade = siding ? new THREE.Box3().setFromObject(siding).max.z : box.max.z - HOUSE_RAW.facadeInset
    const porch = ['Terrace_projection', 'Terrace_nosing'].map((name) => object.getObjectByName(name)).filter((item): item is THREE.Object3D => Boolean(item))
    return { object, center, minY: box.min.y, facade, porch }
  }, [source])
  useEffect(() => { prepared.porch.forEach((item) => { item.visible = !hidePorch }) }, [prepared, hidePorch])
  useEffect(() => { refreshShadow(gl); invalidate() }, [prepared, gl, invalidate, x, frontZ, width])
  const scale = width / HOUSE_RAW.width
  return <group name="architectural-house" position={[x - prepared.center.x * scale, -prepared.minY * scale, frontZ - prepared.facade * scale]} scale={scale}>
    <primitive object={prepared.object} />
  </group>
}
