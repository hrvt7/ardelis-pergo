// A pergola-jelenet építészeti háza (cedar_zinc_house): közös betöltő, méretek és anyaghangolás.
// A pergola (PergolaScene House) és a többi termék háttérháza (components/models/HouseAsset) is ezt használja.
import * as THREE from 'three'
import { assetUrl } from '@/lib/assetUrl'

export type ArchitecturalAsset = THREE.Group & { dispose: () => Promise<void> }
type ArchitecturalModule = { createAsset: (namespace: typeof THREE, options: { states: 'lazy' }) => Promise<ArchitecturalAsset> }

/** A ház modell saját méretei (modellegységben, a talajszinttől). */
export const HOUSE_RAW = { width: 18.22, depth: 6.79, eave: 2.947, facadeInset: 0.573 }

const houseAssetPath = assetUrl('/assets/models/cedar_zinc_house/asset.mjs')
// Natív böngészős import: az asset és a relatív erőforrásai szándékosan a public/ alatt maradnak.
const importPublicModule = new Function('path', 'return import(path)') as (path: string) => Promise<ArchitecturalModule>
let houseAssetPromise: Promise<ArchitecturalAsset> | null = null
export function getHouseAsset() {
  if (!houseAssetPromise) {
    houseAssetPromise = importPublicModule(houseAssetPath)
      .then((module) => module.createAsset(THREE, { states: 'lazy' }))
      .catch((error) => { houseAssetPromise = null; throw error })
  }
  return houseAssetPromise
}

/** A pergola-jelenet anyaghangolása: horganyzott tető, átlátszó (nem transzmissziós) üveg. */
export function tuneHouseMaterials(object: THREE.Object3D) {
  const seen = new Set<THREE.Material>()
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.castShadow = true
    child.receiveShadow = true
    const list = Array.isArray(child.material) ? child.material : [child.material]
    list.forEach((material) => {
      if (seen.has(material) || !(material instanceof THREE.MeshStandardMaterial)) return
      seen.add(material)
      const isGlass = /glass/i.test(material.name)
      const isRoof = /roof|zinc|standing_seam/i.test(`${child.name} ${material.name}`)
      material.envMapIntensity = isGlass ? 1.2 : isRoof ? 0.66 : 0.72
      if (isRoof) { material.color.set('#697276'); material.metalness = 0.78; material.roughness = 0.42 }
      if (isGlass && material instanceof THREE.MeshPhysicalMaterial) {
        material.transmission = 0
        material.transparent = true
        material.opacity = /privacy/i.test(material.name) ? 0.68 : 0.38
        material.roughness = 0.08
        material.depthWrite = false
      }
    })
  })
}

