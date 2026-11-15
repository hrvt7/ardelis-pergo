// Modulház 3D jelenet: a típusház Blenderben, valós méretben modellezett GLB-je (src/products/modularHouse.ts → glb).
// A hálók neve adja a szerepüket: wall → homlokzat színe, frame → nyílászárók színe, roof → tető színe, glass/interior →
// üveg és belső tér (éjjel meleg fény). A modell homlokzata (bejárati oldal) a z = 0 síkon van, a ház a −z felé áll;
// a jelenet a házat a középpontjára tolja. Megvilágítás és keretezés a garázskapu-jelenet mintájára.
import LamelixLogo from '@/components/LamelixLogo'
import { Component, Suspense, memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Html, Line, OrbitControls, useGLTF, useProgress, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import { assetUrl } from '@/lib/assetUrl'
import { studioLighting, type StudioTime } from '@/lib/studioLighting'
import { MODULAR_COLOR_HEX, MODULAR_MODELS, type ModularHouseConfig } from '@/products/modularHouse'

export type ModularView = 'perspective' | 'front' | 'side' | 'top'
export interface ModularSceneSettings { time: StudioTime; showPerson: boolean; dimensions: boolean; environment: boolean; autoRotate: boolean }
type Vec3 = [number, number, number]

function clonedTexture(source: THREE.Texture, repeat: [number, number], srgb = false) {
  const texture = source.clone()
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(...repeat)
  texture.anisotropy = 4
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/** A bejárati ajtó közepe a modell homlokzatán (x, a ház közepéhez képest) — a járda ide vezet. */
const DOOR_X = -0.445
const ROLES = ['wall', 'frame', 'roof', 'glass', 'interior'] as const

type HouseMats = { wall: THREE.MeshStandardMaterial; frame: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; glass: THREE.MeshPhysicalMaterial; interior: THREE.MeshStandardMaterial }

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
function setExposure(renderer: THREE.WebGLRenderer, exposure: number) { renderer.toneMappingExposure = exposure }

function House({ config, night }: { config: ModularHouseConfig; night: boolean }) {
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
      glass: new THREE.MeshPhysicalMaterial({ name: 'modular-glass', color: '#dcebe8', roughness: 0.05, transparent: true, opacity: 0.42, depthWrite: false, envMapIntensity: 1.25 }),
      interior: new THREE.MeshStandardMaterial({ name: 'modular-interior', color: '#6b6f70', roughness: 0.9 }),
    }
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
      // A GLTF-betöltő a nevekből kiveszi a pontot (wall.001 → wall001), ezért előtag szerint döntünk.
      const role = ROLES.find((item) => child.name.startsWith(item))
      if (role) child.material = mats[role]
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

function Ground({ config }: { config: ModularHouseConfig }) {
  const model = MODULAR_MODELS[config.model]
  const source = useTexture({ grass: assetUrl('/assets/textures/grass_ground/diff.webp'), concrete: assetUrl('/assets/textures/concrete_floor_02/diff.webp') })
  const maps = useMemo(() => ({ grass: clonedTexture(source.grass, [52, 52], true), concrete: clonedTexture(source.concrete, [1, 4], true) }), [source])
  useEffect(() => () => Object.values(maps).forEach((texture) => texture.dispose()), [maps])
  const front = model.footprint.depth / 2
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial map={maps.grass} color="#8fa66a" roughness={0.96} /></mesh>
    {/* Járda a bejárati lépcsőtől */}
    <mesh position={[DOOR_X, 0.01, front + 0.6 + 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[1.3, 6]} /><meshStandardMaterial map={maps.concrete} color="#b4b5ae" roughness={0.88} /></mesh>
    {/* Kavicsos csurgósáv a ház körül */}
    <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[model.footprint.width + 1, model.footprint.depth + 1]} /><meshStandardMaterial color="#9b978c" roughness={1} /></mesh>
  </>
}

function StudioBackdrop({ color }: { color: string }) {
  return <mesh name="studio-backdrop" renderOrder={-1}><sphereGeometry args={[180, 32, 16]} /><meshBasicMaterial color={color} side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} /></mesh>
}

function ScalePerson({ config }: { config: ModularHouseConfig }) {
  const { scene } = useGLTF(assetUrl('/assets/models/scale_person/person.glb'))
  const object = useMemo(() => {
    const clone = scene.clone(true)
    clone.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = 1.8 / size.y
    clone.scale.setScalar(scale)
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = Array.isArray(child.material) ? child.material[0] : child.material
        child.material = new THREE.MeshStandardMaterial({ map: (material as THREE.MeshStandardMaterial).map, color: (material as THREE.MeshStandardMaterial).color, roughness: 0.82, envMapIntensity: 0.35 })
        child.castShadow = true
      }
    })
    return clone
  }, [scene])
  const model = MODULAR_MODELS[config.model]
  return <group position={[DOOR_X + 1.4, 0.02, model.footprint.depth / 2 + 1.6]}><primitive object={object} /></group>
}

function Dimensions({ config }: { config: ModularHouseConfig }) {
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
  for (const panel of document.querySelectorAll<HTMLElement>('.controls-panel, .price-panel')) {
    const rect = panel.getBoundingClientRect()
    if (!rect.width || rect.bottom < box.top + box.height * 0.3 || rect.top > box.top + box.height * 0.7) continue
    const center = rect.left + rect.width / 2 - box.left
    if (center < box.width / 2) left = Math.max(left, rect.right - box.left)
    else right = Math.min(right, rect.left - box.left)
  }
  return right - left < box.width * 0.35 ? { left: 0, right: box.width } : { left, right }
}

function CameraRig({ config, view, autoRotate }: { config: ModularHouseConfig; view: ModularView; autoRotate: boolean }) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const viewport = useThree((state) => state.size)
  const controls = useRef<OrbitControlsType>(null)
  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera
    const { left, right } = freeBand(canvas)
    const free = Math.max(1, right - left) / Math.max(1, viewport.width)
    const shift = Math.round(viewport.width / 2 - (left + right) / 2)
    if (shift) perspectiveCamera.setViewOffset(viewport.width, viewport.height, shift, 0, viewport.width, viewport.height)
    else perspectiveCamera.clearViewOffset()
    const { footprint, estimated } = MODULAR_MODELS[config.model]
    const aspect = viewport.width / Math.max(1, viewport.height)
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov / 2)) * aspect * free
    const fit = (span: number) => span / 0.88 / (2 * halfWidth)
    const along = (direction: Vec3, distance: number): Vec3 => { const length = Math.hypot(...direction); return direction.map((value) => (value / length) * distance) as Vec3 }
    const target: Vec3 = [0, estimated.ridge * 0.4, 0]
    const positions: Record<ModularView, Vec3> = {
      perspective: along([0.75, 0.42, 1], fit(footprint.width + 3.5)),
      front: [0, 1.7, fit(footprint.width + 2.5)],
      side: [fit(footprint.depth + 4.5), 1.7, 0],
      top: [0.01, fit(footprint.width + 3) * 1.15, 0.01],
    }
    const position = positions[view]
    camera.position.set(position[0], position[1] + (view === 'perspective' ? target[1] : 0), position[2])
    camera.lookAt(...target)
    camera.updateProjectionMatrix()
    if (controls.current) { controls.current.target.set(...target); controls.current.update() }
  }, [camera, canvas, config.model, view, viewport.width, viewport.height])
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} autoRotate={autoRotate} autoRotateSpeed={0.6} minDistance={3} maxDistance={60} maxPolarAngle={Math.PI / 2.02} />
}

function SceneContent({ config, scene, view, onReady }: { config: ModularHouseConfig; scene: ModularSceneSettings; view: ModularView; onReady: () => void }) {
  const gl = useThree((state) => state.gl)
  const light = studioLighting(scene.time)
  useEffect(() => { refreshShadow(gl); onReady() }, [config, gl, onReady, scene.environment, scene.time, scene.showPerson])
  useEffect(() => { setExposure(gl, light.exposure) }, [gl, light.exposure])
  return <>
    {!scene.environment && <color attach="background" args={[light.studio]} />}
    <fog attach="fog" args={[scene.environment ? light.fog : light.studio, 50, 130]} />
    <ambientLight intensity={light.ambient} />
    <hemisphereLight args={['#d4e1e8', '#514b3f', light.hemisphere]} />
    <directionalLight position={light.sunPosition.map((value) => value * 1.4) as Vec3} color={light.sun} intensity={light.sunIntensity} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0002} shadow-normalBias={0.02} />
    <Suspense fallback={null}><Environment files={assetUrl(light.hdr)} background={scene.environment} backgroundBlurriness={0} backgroundIntensity={light.background} environmentIntensity={light.environment} /></Suspense>
    {scene.environment ? <Ground config={config} /> : <><StudioBackdrop color={light.studio} /><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow><planeGeometry args={[600, 600]} /><meshStandardMaterial color={light.studioFloor} roughness={0.92} /></mesh></>}
    <House config={config} night={light.night} />
    {scene.showPerson && <Suspense fallback={null}><ScalePerson config={config} /></Suspense>}
    {scene.dimensions && <Dimensions config={config} />}
    <CameraRig config={config} view={view} autoRotate={scene.autoRotate} />
  </>
}

function ScenePoster({ message = 'Modulház betöltése' }: { message?: string }) {
  const { progress } = useProgress()
  return <div className="scene-poster" role="status">
    <div className="poster-skeleton"><span /><span /><span /><span /></div>
    <div className="branded-loader"><div className="loader-brand"><LamelixLogo height={30} title={null} /></div><div className="loader-track"><span style={{ width: `${Math.max(8, progress)}%` }} /></div><div><span>{message}</span><strong>{Math.round(progress)}%</strong></div></div>
  </div>
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <ScenePoster message="A 3D nézet nem érhető el, a kalkulátor tovább használható" /> : this.props.children }
}

export default memo(function ModularHouseScene({ config, scene, view }: { config: ModularHouseConfig; scene: ModularSceneSettings; view: ModularView }) {
  const [ready, setReady] = useState(false)
  const onReady = useMemo(() => () => setReady(true), [])
  return <div className="scene-canvas-wrap" data-scene-ready={ready}>
    {!ready && <ScenePoster />}
    <Boundary><Canvas frameloop={scene.autoRotate ? 'always' : 'demand'} shadows dpr={[1, 1.25]} camera={{ position: [10, 5, 12], fov: 40, near: 0.1, far: 260 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }} onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.toneMappingExposure = studioLighting(scene.time).exposure
      gl.shadowMap.autoUpdate = false
      gl.shadowMap.needsUpdate = true
      gl.domElement.dataset.catalogCanvas = 'true'
      gl.domElement.setAttribute('aria-label', 'Modulház valós méretű 3D modellje. Forgatás egérrel vagy érintéssel.')
      gl.domElement.setAttribute('role', 'img')
    }}><Suspense fallback={null}><SceneContent config={config} scene={scene} view={view} onReady={onReady} /></Suspense></Canvas></Boundary>
  </div>
})
