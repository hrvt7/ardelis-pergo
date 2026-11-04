// A pergola (ház, kert, falak nélkül) valós méretarányú GLB-be exportálása
// AR-hez. Az origó a pergola alapterületének közepe a talajon, egység: méter.
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js'
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

/**
 * A lekerekített dobozok (drei RoundedBox → letört élű ExtrudeGeometry) egyenként ~3000 csúcspontot adnak;
 * valós méretben (1–2 cm-es lekerekítés) ez az AR-ben nem látszik, a fájlt viszont sokszorosára növeli.
 * Az AR-modellben ugyanakkora sima doboz helyettesíti őket.
 */
function isRoundedBox(geometry: THREE.BufferGeometry) {
  const parameters = (geometry as THREE.BufferGeometry & { parameters?: { options?: { bevelEnabled?: boolean } } }).parameters
  return geometry.type === 'ExtrudeGeometry' && parameters?.options?.bevelEnabled === true
}
function boxFromBounds(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const result = new THREE.BoxGeometry(size.x, size.y, size.z)
  result.translate(center.x, center.y, center.z)
  return result
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
  // Ugyanaz a forrásgeometria (pl. 20 lamella) egyetlen másolatot kap: az exporter így egyszer írja ki → kisebb fájl.
  const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>()
  const portableGeometry = (source: THREE.BufferGeometry) => {
    const existing = geometries.get(source)
    if (existing) return existing
    // Saját másolat UV nélkül (textúra nincs), hogy az élő jelenet érintetlen maradjon.
    const copy = isRoundedBox(source) ? boxFromBounds(source) : source.clone()
    if (copy.getAttribute('uv')) copy.deleteAttribute('uv')
    if (copy.getAttribute('uv1')) copy.deleteAttribute('uv1')
    if (!copy.getAttribute('normal')) copy.computeVertexNormals()
    geometries.set(source, copy)
    return copy
  }
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.geometry = portableGeometry(mesh.geometry)
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

export async function exportPergolaGlb(object: THREE.Object3D = buildArObject()): Promise<Blob> {
  const exporter = new GLTFExporter()
  const result = await exporter.parseAsync(object, { binary: true, onlyVisible: true })
  if (!(result instanceof ArrayBuffer)) throw new Error('A GLB export nem sikerült.')
  return new Blob([result], { type: 'model/gltf-binary' })
}

/**
 * USDZ közvetlenül iPhone/iPad AR Quick Look-hoz (méter egység, Y felfelé, vízszintes síkra horgonyozva).
 * Előre elkészítjük, így a gombnyomás azonnal megnyitja a Quick Look-ot (nincs gombnyomás utáni konverzió,
 * ami iOS-en elveszítheti a felhasználói gesztust és „semmi sem történik”).
 */
export async function exportPergolaUsdz(object: THREE.Object3D = buildArObject()): Promise<Blob> {
  const exporter = new USDZExporter()
  const result = await exporter.parseAsync(object, {
    quickLookCompatible: true,
    includeAnchoringProperties: true,
    ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } },
  })
  return new Blob([result as BlobPart], { type: 'model/vnd.usdz+zip' })
}

/** A legutóbbi export (konfigurációnként): az AR-ablak újranyitásakor nem kell újra exportálni. */
const cache = new Map<string, Promise<Blob>>()
export function cachedExport(kind: 'glb' | 'usdz', key: string): Promise<Blob> {
  const id = `${kind}|${key}`
  const hit = cache.get(id)
  if (hit) return hit
  if (cache.size > 6) cache.clear()
  const job = (kind === 'glb' ? exportPergolaGlb() : exportPergolaUsdz()).catch((error) => { cache.delete(id); throw error })
  cache.set(id, job)
  return job
}

// Hibakereséshez és automatikus teszthez: ?arDebug=1 mellett elérhető a konzolból.
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('arDebug') === '1') {
  (window as Window & { __exportPergolaGlb?: () => Promise<ArrayBuffer> }).__exportPergolaGlb = async () => (await exportPergolaGlb()).arrayBuffer()
  ;(window as Window & { __arStats?: () => unknown }).__arStats = () => {
    const object = buildArObject()
    const geometries = new Map<THREE.BufferGeometry, { vertices: number; uses: number; name: string }>()
    object.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      let name = ''
      for (let node: THREE.Object3D | null = mesh; node; node = node.parent) if (node.name && node.name !== 'Pergola') { name = node.name; break }
      const entry = geometries.get(mesh.geometry) ?? { vertices: mesh.geometry.getAttribute('position').count, uses: 0, name: `${name}:${mesh.geometry.type}:${mesh.geometry.index ? 'idx' : 'noidx'}` }
      entry.uses += 1
      geometries.set(mesh.geometry, entry)
    })
    const list = [...geometries.values()]
    return { meshes: list.reduce((sum, item) => sum + item.uses, 0), uniqueGeometries: list.length, uniqueVertices: list.reduce((sum, item) => sum + item.vertices, 0), top: list.sort((a, b) => b.vertices - a.vertices).slice(0, 12), byType: list.reduce<Record<string, number>>((acc, item) => { const key = item.name.split(':')[1]; acc[key] = (acc[key] ?? 0) + item.uses; return acc }, {}) }
  }
}
