import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { buildArObject, exportPergolaUsdz } from '../src/lib/arExport'
import { setActiveScene } from '../src/lib/sceneRegistry'

/** Kicsinyített „pergola”: 4 oszlop + 20 lamella egy InstancedMesh-ben + egy méretvonal-szerű segédobjektum. */
function fakeScene() {
  const scene = new THREE.Scene()
  const model = new THREE.Group()
  model.name = 'pergola-model'
  model.position.set(3, 0, 0)
  model.scale.set(1, 0.96, 1)
  const post = new THREE.BoxGeometry(0.15, 2.5, 0.15)
  const coat = new THREE.MeshPhysicalMaterial({ color: '#383e42', metalness: 0.9, roughness: 0.1, clearcoat: 1 })
  ;[[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5]].forEach(([x, z]) => { const mesh = new THREE.Mesh(post, coat); mesh.position.set(x, 1.25, z); model.add(mesh) })
  const blade = new THREE.BoxGeometry(4, 0.03, 0.18)
  const blades = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: '#383e42' }), 20)
  for (let index = 0; index < 20; index++) blades.setMatrixAt(index, new THREE.Matrix4().makeTranslation(0, 2.6, -1.5 + index * 0.16))
  model.add(blades)
  const skip = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
  skip.name = 'ar-skip-person'
  model.add(skip)
  scene.add(model)
  return { scene, blade }
}

describe('AR export', () => {
  afterEach(() => setActiveScene(null))

  it('a példányokat önálló hálókra bontja, de a geometriát egyszer másolja', () => {
    const { scene, blade } = fakeScene()
    setActiveScene(scene)
    const object = buildArObject()
    const meshes: THREE.Mesh[] = []
    object.traverse((child) => { if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh) })
    expect(meshes).toHaveLength(24)
    expect(new Set(meshes.map((mesh) => mesh.geometry)).size).toBe(2)
    expect(meshes.some((mesh) => mesh.geometry === blade)).toBe(false)
    expect(meshes.every((mesh) => (mesh.material as THREE.Material).type === 'MeshStandardMaterial')).toBe(true)
    // Az élő jelenet transzformációja nem kerül az AR-modellbe: origó a talajon, valós (1:1) méret.
    const model = object.children[0]
    expect(model.position.toArray()).toEqual([0, 0, 0])
    expect(model.scale.toArray()).toEqual([1, 1, 1])
    const box = new THREE.Box3().setFromObject(object)
    expect(box.max.x - box.min.x).toBeCloseTo(4.15, 2)
    expect(box.min.y).toBeCloseTo(0, 5)
  })

  it('USDZ: méter egység, Y fel, vízszintes horgony, kis méret', async () => {
    const { scene } = fakeScene()
    setActiveScene(scene)
    const blob = await exportPergolaUsdz()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain('metersPerUnit = 1')
    expect(text).toContain('upAxis = "Y"')
    expect(text).toContain('preliminary:planeAnchoring:alignment = "horizontal"')
    expect(blob.size).toBeLessThan(200_000)
  })
})
