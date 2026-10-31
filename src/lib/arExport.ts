// A pergola (ház, kert, falak nélkül) valós méretarányú GLB-be exportálása
// AR-hez. Az origó a pergola alapterületének közepe a talajon, egység: méter.
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { getActiveScene } from '@/lib/sceneRegistry'

/** Ami nem a termék része: méretvonalak, 180 cm-es figura, súgópontok, fények, címkék. */
function isAuxiliary(object: THREE.Object3D) {
  const type = (object as THREE.Object3D & { isLine2?: boolean; isLineSegments2?: boolean })
  return object.name.startsWith('ar-skip')
    || type.isLine2 === true
    || type.isLineSegments2 === true
    || (object as THREE.Light).isLight === true
    || (object as THREE.Points).isPoints === true
}

/** Egyszerű, minden AR-nézőben (Quick Look, Scene Viewer, WebXR) azonosan megjelenő anyag. */
function toPortableMaterial(source: THREE.Material): THREE.MeshStandardMaterial {
  const standard = source as THREE.MeshStandardMaterial
  const material = new THREE.MeshStandardMaterial({
    name: source.name || 'pergola',
    color: standard.color ? standard.color.clone() : new THREE.Color('#888888'),
    metalness: typeof standard.metalness === 'number' ? Math.min(standard.metalness, 0.6) : 0.2,
    roughness: typeof standard.roughness === 'number' ? Math.max(standard.roughness, 0.3) : 0.6,
    transparent: source.transparent,
    opacity: source.opacity,
    side: source.side,
  })
  if (standard.emissive && standard.emissiveIntensity > 0.3) {
    material.emissive = standard.emissive.clone()
    material.emissiveIntensity = 1
  }
  return material
}

/** Az AR-nézők (Quick Look, Scene Viewer) nem ismerik az EXT_mesh_gpu_instancing kiterjesztést: a példányokat önálló hálókra bontjuk. */
function expandInstances(root: THREE.Object3D) {
  const instanced: THREE.InstancedMesh[] = []
  root.traverse((child) => { if ((child as THREE.InstancedMesh).isInstancedMesh) instanced.push(child as THREE.InstancedMesh) })
  const matrix = new THREE.Matrix4()
  instanced.forEach((source) => {
    const parent = source.parent
    if (!parent) return
    for (let index = 0; index < source.count; index++) {
      source.getMatrixAt(index, matrix)
      const mesh = new THREE.Mesh(source.geometry, source.material)
      mesh.name = source.name
      mesh.castShadow = source.castShadow
      mesh.matrix.copy(source.matrix).multiply(matrix)
      mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale)
      parent.add(mesh)
    }
    source.removeFromParent()
  })
}

export function buildArObject(): THREE.Object3D {
  const scene = getActiveScene()
  const source = scene?.getObjectByName('pergola-model')
  if (!source) throw new Error('A 3D modell még nem töltődött be.')
  const clone = source.clone(true)
  clone.position.set(0, 0, 0)
  clone.rotation.set(0, 0, 0)
  clone.scale.set(1, 1, 1)
  expandInstances(clone)
  const remove: THREE.Object3D[] = []
  clone.traverse((child) => { if (child !== clone && isAuxiliary(child)) remove.push(child) })
  remove.forEach((child) => child.removeFromParent())
  // Azonos megjelenésű anyagok összevonása: kisebb fájl, kevesebb rajzolási hívás az AR-nézőben.
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    // Saját geometriamásolat UV nélkül (textúra nincs), hogy az élő jelenet érintetlen maradjon.
    mesh.geometry = mesh.geometry.clone()
    if (mesh.geometry.getAttribute('uv')) mesh.geometry.deleteAttribute('uv')
    const convert = (material: THREE.Material) => {
      const portable = toPortableMaterial(material)
      const key = [portable.color.getHexString(), portable.metalness.toFixed(2), portable.roughness.toFixed(2), portable.opacity.toFixed(2), portable.transparent, portable.emissive.getHexString(), portable.side].join('|')
      const existing = materials.get(key)
      if (existing) { portable.dispose(); return existing }
      materials.set(key, portable)
      return portable
    }
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material)
  })
  const root = new THREE.Group()
  root.name = 'Pergola'
  root.add(clone)
  root.updateMatrixWorld(true)
  return root
}

export async function exportPergolaGlb(): Promise<Blob> {
  const object = buildArObject()
  const exporter = new GLTFExporter()
  const result = await exporter.parseAsync(object, { binary: true, onlyVisible: true })
  if (!(result instanceof ArrayBuffer)) throw new Error('A GLB export nem sikerült.')
  return new Blob([result], { type: 'model/gltf-binary' })
}

// Hibakereséshez és automatikus teszthez: ?arDebug=1 mellett elérhető a konzolból.
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('arDebug') === '1') {
  (window as Window & { __exportPergolaGlb?: () => Promise<ArrayBuffer> }).__exportPergolaGlb = async () => (await exportPergolaGlb()).arrayBuffer()
}
