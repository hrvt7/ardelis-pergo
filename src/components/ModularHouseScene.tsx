// Modulház a konfigurátor 3D jelenetében: a PergolaScene ugyanabban a vásznon, a pergola helyén rajzolja ki
// (nincs új oldal, új vászon vagy újratöltés). A típusház Blenderben, valós méretben modellezett GLB
// (src/products/modularHouse.ts → glb). A hálók neve adja a szerepüket: wall → homlokzat színe, frame → nyílászárók
// színe, roof → tető színe, glass/interior → üveg és belső tér (éjjel meleg fény). A modell homlokzata (bejárati
// oldal) a z = 0 síkon van, a ház a −z felé áll; itt a középpontjára toljuk.
import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Html, Line, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import { assetUrl } from '@/lib/assetUrl'
import { MODULAR_COLOR_HEX, MODULAR_MODELS, type ModularHouseConfig } from '@/products/modularHouse'

export type ModularView = 'perspective' | 'front' | 'side' | 'top'
type Vec3 = [number, number, number]

/** A bejárati ajtó közepe a modell homlokzatán (x, a ház közepéhez képest) — a járda ide vezet. */
const DOOR_X = -0.445
const ROLES = ['wall', 'frame', 'roof', 'glass', 'interior'] as const

type HouseMats = { wall: THREE.MeshStandardMaterial; frame: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; glass: THREE.MeshPhysicalMaterial; interior: THREE.MeshStandardMaterial; trim: THREE.MeshStandardMaterial }

/** A választott színek és az éjszakai fények (a horgokon kívül, hogy a hook-értékek ne módosuljanak közvetlenül). */
function applyLook(mats: HouseMats, config: ModularHouseConfig, night: boolean) {
  mats.wall.color.set(MODULAR_COLOR_HEX.facade[config.facade])
  mats.frame.color.set(MODULAR_COLOR_HEX.joinery[config.joinery])
  mats.roof.color.set(MODULAR_COLOR_HEX.roof[config.roof])
  mats.interior.emissive.set(night ? '#c88a52' : '#000000')
  mats.interior.emissiveIntensity = night ? 0.6 : 0
  mats.glass.emissive.set(night ? '#ffcf8a' : '#000000')
  mats.glass.emissiveIntensity = night ? 0.25 : 0
}
function refreshShadow(renderer: THREE.WebGLRenderer) { renderer.shadowMap.needsUpdate = true }

export function ModularHouseModel({ config, night }: { config: ModularHouseConfig; night: boolean }) {
  const model = MODULAR_MODELS[config.model]
  const { scene: source } = useGLTF(assetUrl(model.glb))
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const prepared = useMemo(() => {
    const object = source.clone(true)
    const mats: HouseMats = {
      wall: new THREE.MeshStandardMaterial({ name: 'modular-wall', roughness: 0.92, envMapIntensity: 0.6 }),
      frame: new THREE.MeshStandardMaterial({ name: 'modular-frame', roughness: 0.42, metalness: 0.25, envMapIntensity: 0.8 }),
      roof: new THREE.MeshStandardMaterial({ name: 'modular-roof', roughness: 0.72, envMapIntensity: 0.55 }),
      // Fényvisszaverő, kevésbé átlátszó üveg: a belső tér üres (nincsenek válaszfalak), ezért ne lehessen átlátni a házon.
      glass: new THREE.MeshPhysicalMaterial({ name: 'modular-glass', color: '#a9bcbd', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.72, depthWrite: false, envMapIntensity: 1.6 }),
      interior: new THREE.MeshStandardMaterial({ name: 'modular-interior', color: '#4a4e50', roughness: 0.9 }),
      // Ereszcsatorna, homlokdeszka, oromszegély, lefolyók, párkányok: matt antracit bádogozás (a GLB fémes anyaga lilásan csillogott).
      trim: new THREE.MeshStandardMaterial({ name: 'modular-trim', color: '#2f3336', roughness: 0.5, metalness: 0.15, envMapIntensity: 0.5 }),
    }
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
      // A GLTF-betöltő a nevekből kiveszi a pontot (wall.001 → wall001), ezért előtag szerint döntünk.
      const role = ROLES.find((item) => child.name.startsWith(item))
      if (role) child.material = mats[role]
      else if (child.name.startsWith('trim')) child.material = mats.trim
      else if (child.material instanceof THREE.MeshStandardMaterial) child.material.envMapIntensity = 0.6
      if (role === 'glass') { child.castShadow = false; child.renderOrder = 2 }
      if (role === 'interior') child.castShadow = false
    })
    return { object, mats }
  }, [source])
  useEffect(() => () => Object.values(prepared.mats).forEach((material) => material.dispose()), [prepared])
  useEffect(() => {
    applyLook(prepared.mats, config, night)
    refreshShadow(gl)
    invalidate()
  }, [prepared, config, night, gl, invalidate])
  return <group name="modular-house" position={[0, 0, model.footprint.depth / 2]}>
    <primitive object={prepared.object} />
    {night && <pointLight position={[DOOR_X, 2.3, 0.6]} color="#ffd09a" intensity={6} distance={7} decay={2} />}
  </group>
}

/** Családi ház környezetben a ház körüli kavicssáv és a bejárathoz vezető járda (a fű a konfigurátor saját talaja). */
export function ModularGroundExtras({ config }: { config: ModularHouseConfig }) {
  const { footprint } = MODULAR_MODELS[config.model]
  return <group name="modular-ground">
    <mesh position={[DOOR_X, 0.012, footprint.depth / 2 + 0.6 + 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[1.3, 6]} /><meshStandardMaterial color="#b4b5ae" roughness={0.9} /></mesh>
    <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[footprint.width + 1, footprint.depth + 1]} /><meshStandardMaterial color="#9b978c" roughness={1} /></mesh>
  </group>
}

export function ModularDimensions({ config }: { config: ModularHouseConfig }) {
  const { footprint, estimated } = MODULAR_MODELS[config.model]
  const w = footprint.width / 2
  const d = footprint.depth / 2
  const cm = (value: number) => `${Math.round(value * 100)} cm`
  return <group>
    <Line points={[[-w, 0.05, d + 1.1], [w, 0.05, d + 1.1]]} color="#d8ff72" lineWidth={1.2} />
    <Html position={[0, 0.1, d + 1.12]} center className="dimension-label">{cm(footprint.width)}</Html>
    <Line points={[[w + 1.1, 0.05, -d], [w + 1.1, 0.05, d]]} color="#d8ff72" lineWidth={1.2} />
    <Html position={[w + 1.12, 0.1, 0]} center className="dimension-label">{cm(footprint.depth)}</Html>
    <Line points={[[-w - 0.9, 0.05, 0], [-w - 0.9, estimated.ridge, 0]]} color="#d8ff72" lineWidth={1.2} />
    <Html position={[-w - 0.9, estimated.ridge / 2, 0]} center className="dimension-label">≈ {cm(estimated.ridge)} (becsült)</Html>
  </group>
}

/** A vászon szabad, panelek által nem takart vízszintes sávja (képpontban). */
function freeBand(canvas: HTMLCanvasElement) {
  const box = canvas.getBoundingClientRect()
  let left = 0
  let right = box.width
  for (const panel of document.querySelectorAll<HTMLElement>('.controls-panel, .price-panel:not(.is-collapsed)')) {
    const rect = panel.getBoundingClientRect()
    if (!rect.width || rect.right <= box.left || rect.left >= box.right || rect.bottom < box.top + box.height * 0.3 || rect.top > box.top + box.height * 0.7) continue
    const center = rect.left + rect.width / 2 - box.left
    if (center < box.width / 2) left = Math.max(left, rect.right - box.left)
    else right = Math.min(right, rect.left - box.left)
  }
  return right - left < box.width * 0.35 ? { left: 0, right: box.width } : { left, right }
}

/** Kamera a házhoz: nézetenként a teljes ház a szabad sávba keretezve; forgatható, nagyítható. */
export function ModularCameraRig({ config, view, autoRotate }: { config: ModularHouseConfig; view: ModularView; autoRotate: boolean }) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const viewport = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const controls = useRef<OrbitControlsType>(null)
  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera
    const { left, right } = freeBand(canvas)
    const free = Math.max(1, right - left) / Math.max(1, viewport.width)
    const { footprint, estimated } = MODULAR_MODELS[config.model]
    const aspect = viewport.width / Math.max(1, viewport.height)
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov / 2)) * aspect * free
    const fit = (span: number) => span / 0.86 / (2 * halfWidth)
    const along = (direction: Vec3, distance: number): Vec3 => { const length = Math.hypot(...direction); return direction.map((value) => (value / length) * distance) as Vec3 }
    const target: Vec3 = [0, estimated.ridge * 0.38, 0]
    const positions: Record<ModularView, Vec3> = {
      perspective: along([0.75, 0.45, 1], fit(footprint.width + 6.5)),
      front: [0, 1.7, fit(footprint.width + 4.5)],
      side: [fit(footprint.depth + 7), 1.7, 0],
      top: [0.01, fit(footprint.width + 3) * 1.15, 0.01],
    }
    const position = positions[view]
    camera.position.set(position[0], position[1] + (view === 'perspective' ? target[1] : 0), position[2])
    camera.lookAt(...target)
    camera.updateProjectionMatrix()
    if (controls.current) { controls.current.target.set(...target); controls.current.update() }
    invalidate()
  }, [camera, canvas, config.model, view, viewport.width, viewport.height, invalidate])
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} autoRotate={autoRotate} autoRotateSpeed={0.6} minDistance={3} maxDistance={60} maxPolarAngle={Math.PI / 2.02} />
}
