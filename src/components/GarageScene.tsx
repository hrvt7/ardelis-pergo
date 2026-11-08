// Garázskapu 3D jelenet: a kapu a ház homlokzatában (környezet), vagy önmagában egy kávarészlettel (környezet nélkül).
// Megvilágítás, terep, kamera a kerítés-jelenet mintájára; a kamera a két oldalpanel közötti szabad sávra keretez.
import LamelixLogo from '@/components/LamelixLogo'
import { Component, Suspense, memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Html, Line, OrbitControls, useGLTF, useProgress, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import { GARAGE_SIDE_DOOR, garageColor, garageSideDoorX as sideDoorX, type GarageConfig } from '@/products/garage'
import { HouseBackdrop } from '@/components/models/HouseAsset'
import { studioLighting, type StudioTime } from '@/lib/studioLighting'
import GarageModel, { DOOR_Z, SideDoor, type GarageMaterials } from '@/components/garage/GarageModel'
import Car from '@/components/models/Car'

export type GarageView = 'perspective' | 'front' | 'detail' | 'interior'
export interface GarageSceneSettings { time: StudioTime; open: boolean; showPerson: boolean; dimensions: boolean; environment: boolean; autoRotate: boolean }
type Vec3 = [number, number, number]

const WALL_T = 0.36
/** A belső garázstér mélysége a homlokzattól. */
const DEPTH = 6.6
const SIDE_DOOR_GAP = GARAGE_SIDE_DOOR.gap
const SIDE_DOOR_W = GARAGE_SIDE_DOOR.width

function clonedTexture(source: THREE.Texture, repeat: [number, number], srgb = false) {
  const texture = source.clone()
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(...repeat)
  texture.anisotropy = 4
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
function refreshShadow(renderer: THREE.WebGLRenderer) { renderer.shadowMap.needsUpdate = true }
function setExposure(renderer: THREE.WebGLRenderer, exposure: number) { renderer.toneMappingExposure = exposure }

/** A homlokzat teljes szélessége — a kamera ehhez keretez. */
const facadeWidth = (config: GarageConfig) => config.width + (config.sideDoor ? SIDE_DOOR_GAP + SIDE_DOOR_W : 0) + 2.4

function useGarageMaterials(config: GarageConfig, night: boolean): GarageMaterials {
  const color = garageColor(config)
  const source = useTexture({ diff: '/assets/textures/oak_wood_planks/diff.webp', rough: '/assets/textures/oak_wood_planks/rough.webp' })
  const wood = useMemo(() => ({ diff: clonedTexture(source.diff, [0.9, 2.2], true), rough: clonedTexture(source.rough, [0.9, 2.2]) }), [source])
  useEffect(() => () => Object.values(wood).forEach((texture) => texture.dispose()), [wood])
  const materials = useMemo<GarageMaterials>(() => {
    const woodLook = config.panel === 'woodgrain' || config.color === 'goldenOak'
    const base = new THREE.Color(color)
    const dark = base.clone().multiplyScalar(0.55)
    const panel = woodLook
      ? new THREE.MeshStandardMaterial({ map: wood.diff, roughnessMap: wood.rough, color: config.color === 'goldenOak' ? '#b98453' : color, roughness: 0.62, metalness: 0.05, envMapIntensity: 0.6 })
      : new THREE.MeshPhysicalMaterial({ color, metalness: 0.32, roughness: config.color === 'white' ? 0.36 : 0.44, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.9 })
    return {
      panel,
      panelDark: new THREE.MeshStandardMaterial({ color: woodLook ? '#4a3220' : dark, metalness: 0.2, roughness: 0.7 }),
      frame: new THREE.MeshStandardMaterial({ color: config.color === 'white' ? '#cfd0cb' : '#2b2f31', metalness: 0.4, roughness: 0.5 }),
      hardware: new THREE.MeshStandardMaterial({ color: '#8b9194', metalness: 0.85, roughness: 0.32 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#8fb0bb', metalness: 0.1, roughness: 0.06, transparent: true, opacity: 0.55, transmission: 0.2, clearcoat: 1, envMapIntensity: 1.4, emissive: night ? '#c99b55' : '#000000', emissiveIntensity: night ? 0.35 : 0 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#141617', roughness: 0.95 }),
      screen: new THREE.MeshStandardMaterial({ color: '#28414f', emissive: '#4f86a6', emissiveIntensity: night ? 1.4 : 0.45, roughness: 0.2 }),
      glow: new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd9a0', emissiveIntensity: night ? 3 : 0.5, toneMapped: false }),
    }
  }, [config.panel, config.color, color, night, wood])
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials])
  return materials
}

/** Semleges stúdió-padló (a pergola „Csak a pergola” nézetével azonos tónus). */
/** Stúdió-háttér gömb: a környezet ki-be kapcsolásakor az Environment a háttérmezőt visszaállíthatja, ezért a semleges háttér
 * egy hálóként is ott van (a pergola „Csak a pergola” háttérszínével). */
function StudioBackdrop({ night }: { night: boolean }) {
  return <mesh name="studio-backdrop" renderOrder={-1}><sphereGeometry args={[180, 32, 16]} /><meshBasicMaterial color={night ? '#1b1f22' : '#e8e5de'} side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} /></mesh>
}

function StudioFloor({ night }: { night: boolean }) {
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow><planeGeometry args={[600, 600]} /><meshStandardMaterial color={night ? '#555851' : '#dad7cf'} roughness={0.92} /></mesh>
}

/** A garázsszárny bal széle (a ház jobb széle ide illeszkedik). */
const wingLeft = (config: GarageConfig) => -config.width / 2 - 1.2

function Ground({ config }: { config: GarageConfig }) {
  const source = useTexture({ grass: '/assets/textures/grass_ground/diff.webp', concrete: '/assets/textures/concrete_floor_02/diff.webp' })
  const maps = useMemo(() => ({ grass: clonedTexture(source.grass, [52, 52], true), concrete: clonedTexture(source.concrete, [4, 5], true) }), [source])
  useEffect(() => () => Object.values(maps).forEach((texture) => texture.dispose()), [maps])
  const apron = Math.max(5.5, config.width + 3)
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial map={maps.grass} color="#8fa66a" roughness={0.96} /></mesh>
    <mesh position={[0, 0.012, 4.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[apron, 9]} /><meshStandardMaterial map={maps.concrete} color="#a8aaa3" roughness={0.88} /></mesh>
    {/* Térkő fugák a kocsibeállón */}
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, 0.016, 0.8 + i * 1.1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[apron, 0.012]} /><meshStandardMaterial color="#8d8f88" roughness={1} /></mesh>)}
  </>
}

/**
 * Garázsszárny: a ház jobb oromfalához épített, lapostetős toldalék. Antracit vakolat (a ház cédrus- és téglafelületei
 * mellett semleges, kortárs anyag), a ház tetőjével azonos horganyzott attikafedés és eresz, lábazat, fali lámpa,
 * házszám; belül festett falak, polcok, mennyezeti lámpa. Bal fala a ház oromfalához simul (a háznak nem ér bele).
 */
function Facade({ config, night, materials }: { config: GarageConfig; night: boolean; materials: GarageMaterials }) {
  const source = useTexture('/assets/textures/plastered_wall_04/diff.webp')
  const wall = useMemo(() => clonedTexture(source, [3.5, 2.2], true), [source])
  useEffect(() => () => wall.dispose(), [wall])
  const { width, height } = config
  const W = facadeWidth(config)
  const H = height + 1.05
  const left = wingLeft(config)
  const right = left + W
  const zinc = <meshStandardMaterial color="#697276" metalness={0.78} roughness={0.42} />
  const render = <meshStandardMaterial map={wall} color="#4b5052" roughness={0.9} />
  const seg = (x0: number, x1: number, y0: number, y1: number) => <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, -WALL_T / 2]} castShadow receiveShadow><boxGeometry args={[x1 - x0, y1 - y0, WALL_T]} />{render}</mesh>
  const doorLeft = sideDoorX(config) - SIDE_DOOR_W / 2 - 0.08
  const doorRight = sideDoorX(config) + SIDE_DOOR_W / 2 + 0.08
  return <group name="garage-wing">
    {/* Homlokzati falmezők a nyílások körül */}
    {seg(left, -width / 2 - 0.08, 0, H)}
    {config.sideDoor ? <>{seg(width / 2 + 0.08, doorLeft, 0, H)}{seg(doorRight, right, 0, H)}{seg(doorLeft, doorRight, 2.18, H)}</> : seg(width / 2 + 0.08, right, 0, H)}
    {seg(-width / 2 - 0.08, width / 2 + 0.08, height + 0.08, H)}
    {/* Jobb oldalfal és hátfal kívülről (vakolt), bal oldalon a ház oromfala zár */}
    <mesh position={[right - 0.1, H / 2, -DEPTH / 2 - WALL_T / 2]} castShadow receiveShadow><boxGeometry args={[0.2, H, DEPTH - WALL_T]} />{render}</mesh>
    <mesh position={[(left + right) / 2, H / 2, -DEPTH]} castShadow receiveShadow><boxGeometry args={[W, H, 0.2]} />{render}</mesh>
    {/* Lábazat: sötét lábazati sáv a homlokzaton és a jobb oldalon */}
    <mesh position={[(left + right) / 2, 0.15, 0.012]} receiveShadow><boxGeometry args={[W, 0.3, 0.025]} /><meshStandardMaterial color="#2c3032" roughness={0.85} /></mesh>
    <mesh position={[right + 0.012, 0.15, -DEPTH / 2]} receiveShadow><boxGeometry args={[0.025, 0.3, DEPTH]} /><meshStandardMaterial color="#2c3032" roughness={0.85} /></mesh>
    {/* Lapostető: födém, horganyzott attikafedés körben, előre kinyúló eresz a kapu fölé */}
    <mesh position={[(left + right) / 2, H + 0.12, -DEPTH / 2 + 0.25]} castShadow receiveShadow><boxGeometry args={[W + 0.1, 0.24, DEPTH + 0.5]} /><meshStandardMaterial color="#3a3f41" roughness={0.7} /></mesh>
    <mesh position={[(left + right) / 2, H + 0.27, 0.52]} castShadow>{<boxGeometry args={[W + 0.16, 0.08, 0.06]} />}{zinc}</mesh>
    <mesh position={[right + 0.03, H + 0.27, -DEPTH / 2 + 0.25]} castShadow><boxGeometry args={[0.06, 0.08, DEPTH + 0.5]} />{zinc}</mesh>
    <mesh position={[(left + right) / 2, H + 0.13, 0.5]} castShadow><boxGeometry args={[W + 0.16, 0.26, 0.03]} />{zinc}</mesh>
    {/* Ereszcsatorna és lefolyó a jobb sarkon */}
    <mesh position={[(left + right) / 2, H - 0.02, 0.56]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.06, 0.06, W + 0.1, 14, 1, true, 0, Math.PI]} /><meshStandardMaterial color="#697276" metalness={0.78} roughness={0.42} side={THREE.DoubleSide} /></mesh>
    <mesh position={[right + 0.07, H / 2, -0.12]} castShadow><cylinderGeometry args={[0.045, 0.045, H + 0.2, 12]} />{zinc}</mesh>
    <mesh position={[right + 0.07, H + 0.08, 0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.045, 0.045, 0.7, 12]} />{zinc}</mesh>
    {/* Fali lámpa a kapu fölött (lefelé világító, keskeny) */}
    <group position={[0, height + 0.5, 0.06]}>
      <mesh castShadow><boxGeometry args={[0.42, 0.06, 0.12]} /><meshStandardMaterial color="#202426" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0, -0.032, 0.01]} material={materials.glow}><boxGeometry args={[0.38, 0.006, 0.08]} /></mesh>
      {night && <spotLight position={[0, -0.08, 0.1]} target-position={[0, 0, 1.4]} angle={1.05} penumbra={0.7} intensity={38} distance={9} decay={2} color="#ffd9a0" castShadow={false} />}
    </group>
    {/* Házszám a kapu mellett */}
    <group position={[-width / 2 - 0.45, height * 0.72, 0.012]}>
      <mesh><boxGeometry args={[0.2, 0.28, 0.012]} /><meshStandardMaterial color="#d8d5cc" roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.008]}><boxGeometry args={[0.04, 0.18, 0.006]} /><meshStandardMaterial color="#202426" /></mesh>
    </group>
    {/* Belső garázstér: festett falak, padló, mennyezet, polcok, lámpa */}
    <group name="garage-interior">
      <mesh position={[(left + right) / 2, 0.005, -DEPTH / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[W, DEPTH]} /><meshStandardMaterial color="#7a7c77" roughness={0.9} /></mesh>
      <mesh position={[(left + right) / 2, H / 2, -DEPTH + 0.11]} receiveShadow><boxGeometry args={[W - 0.2, H, 0.02]} /><meshStandardMaterial color="#e2dfd6" roughness={0.95} /></mesh>
      {[left + 0.11, right - 0.21].map((x) => <mesh key={x} position={[x, H / 2, -DEPTH / 2 - 0.05]} receiveShadow><boxGeometry args={[0.02, H, DEPTH - 0.4]} /><meshStandardMaterial color="#e6e3da" roughness={0.95} /></mesh>)}
      <mesh position={[(left + right) / 2, H - 0.01, -DEPTH / 2]} receiveShadow><boxGeometry args={[W, 0.02, DEPTH]} /><meshStandardMaterial color="#ecebe6" roughness={0.95} /></mesh>
      {[0.9, 1.45, 2.0].map((y) => <mesh key={y} position={[right - 0.45, y, -DEPTH + 0.9]} castShadow><boxGeometry args={[0.4, 0.035, 1.4]} /><meshStandardMaterial color="#8c8f8a" metalness={0.4} roughness={0.5} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={s} position={[right - 0.45, 1.05, -DEPTH + 0.9 + s * 0.68]}><boxGeometry args={[0.4, 2.1, 0.03]} /><meshStandardMaterial color="#6f726e" metalness={0.5} roughness={0.5} /></mesh>)}
      <mesh position={[(left + right) / 2, H - 0.04, -DEPTH / 2]} material={materials.glow}><boxGeometry args={[1.2, 0.03, 0.12]} /></mesh>
      {night && <pointLight position={[(left + right) / 2, H - 0.3, -DEPTH / 2]} intensity={25} distance={10} decay={2} color="#ffe8c8" />}
    </group>
  </group>
}

/** Környezet nélkül: csak a kapu egy kávarészletben, hogy a beépítés arányai látszódjanak. */
function Reveal({ config }: { config: GarageConfig }) {
  const { width, height } = config
  const frame = <meshStandardMaterial color="#cfccc3" roughness={0.92} />
  return <group>
    {[-1, 1].map((s) => <mesh key={s} position={[s * (width / 2 + 0.32), (height + 0.45) / 2, -WALL_T / 2]} castShadow receiveShadow><boxGeometry args={[0.48, height + 0.45, WALL_T]} />{frame}</mesh>)}
    <mesh position={[0, height + 0.26, -WALL_T / 2]} castShadow receiveShadow><boxGeometry args={[width + 1.12, 0.36, WALL_T]} />{frame}</mesh>
    <mesh position={[0, 0.005, -2.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[width + 1.2, 4.4]} /><meshStandardMaterial color="#6d6f6a" roughness={0.95} /></mesh>
  </group>
}

function ScalePerson({ show, config }: { show: boolean; config: GarageConfig }) {
  const { scene } = useGLTF('/assets/models/scale_person/person.glb')
  const invalidate = useThree((state) => state.invalidate)
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
        const source = Array.isArray(child.material) ? child.material[0] : child.material
        child.material = new THREE.MeshStandardMaterial({ map: source.map, color: source.color, roughness: 0.82, metalness: 0, envMapIntensity: 0.35 })
      }
    })
    return clone
  }, [scene])
  useEffect(() => { if (show) invalidate() }, [invalidate, object, config, show])
  if (!show) return null
  return <group position={[config.width / 2 + 0.75, 0.02, 0.7]}><primitive object={object} /></group>
}

function Dimensions({ config }: { config: GarageConfig }) {
  const { width, height } = config
  const cm = (value: number) => `${Math.round(value * 100)} cm`
  return <group>
    <Line points={[[-width / 2, 0.06, 0.75], [width / 2, 0.06, 0.75]]} color="#d8ff72" lineWidth={1.2} />
    <Html position={[0, 0.1, 0.78]} center className="dimension-label">{cm(width)}</Html>
    <Line points={[[-width / 2 - 0.3, 0.05, 0.3], [-width / 2 - 0.3, height, 0.3]]} color="#d8ff72" lineWidth={1.2} />
    <Html position={[-width / 2 - 0.3, height / 2, 0.3]} center className="dimension-label">{cm(height)}</Html>
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

function CameraRig({ config, view, environment, autoRotate }: { config: GarageConfig; view: GarageView; environment: boolean; autoRotate: boolean }) {
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
    const aspect = viewport.width / Math.max(1, viewport.height)
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov / 2)) * aspect * free
    const span = environment ? Math.max(config.width + 4.2, config.height * 2.6) : Math.max(config.width + 1.6, config.height * 1.5)
    const fit = span / 0.9 / (2 * halfWidth)
    const along = (direction: Vec3, distance: number): Vec3 => { const length = Math.hypot(...direction); return direction.map((value) => (value / length) * distance) as Vec3 }
    const targetY = config.height * 0.5
    const positions: Record<GarageView, { position: Vec3; target: Vec3 }> = {
      perspective: { position: along([0.85, 0.42, 1], fit * 0.98), target: [0, targetY, 0] },
      front: { position: [0, targetY + 0.3, fit], target: [0, targetY, 0] },
      detail: { position: [config.width / 2 + 1.1, 1.25, 2.1], target: [config.width / 2 - 0.5, 0.95, DOOR_Z] },
      // Belülről: az autó melletti szabad sávból, szemmagasságban a kapura (környezet nélkül a káva mögül).
      interior: environment
        ? { position: [Math.max(wingLeft(config) + 0.5, -config.width / 2 - 0.6), 1.95, -5.3], target: [0.25, config.height * 0.42, DOOR_Z] }
        : { position: [0.6, 1.6, -3.4], target: [0, config.height * 0.5, DOOR_Z] },
    }
    const { position, target } = positions[view]
    camera.position.set(position[0], position[1] + (view === 'perspective' || view === 'front' ? targetY : 0), position[2])
    camera.lookAt(...target)
    camera.updateProjectionMatrix()
    if (controls.current) { controls.current.target.set(...target); controls.current.update() }
  }, [camera, canvas, config, view, environment, viewport.width, viewport.height])
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} autoRotate={autoRotate} autoRotateSpeed={0.6} minDistance={1.2} maxDistance={40} maxPolarAngle={Math.PI / 2.02} />
}

function SceneContent({ config, scene, view, onReady }: { config: GarageConfig; scene: GarageSceneSettings; view: GarageView; onReady: () => void }) {
  const gl = useThree((state) => state.gl)
  const light = studioLighting(scene.time)
  const night = light.night
  const materials = useGarageMaterials(config, night)
  useEffect(() => { refreshShadow(gl); onReady() }, [config, gl, onReady, scene.environment, scene.time])
  useEffect(() => { setExposure(gl, light.exposure) }, [gl, light.exposure])
  return <>
    {!scene.environment && <color attach="background" args={[light.studio]} />}
    <fog attach="fog" args={[scene.environment ? light.fog : light.studio, 45, 120]} />
    <ambientLight intensity={light.ambient} />
    <hemisphereLight args={['#d4e1e8', '#514b3f', light.hemisphere]} />
    <directionalLight position={light.sunPosition} color={light.sun} intensity={light.sunIntensity} castShadow shadow-mapSize={[1536, 1536]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0002} shadow-normalBias={0.02} />
    {night && <pointLight position={[0, 4, 6]} color="#c5ddff" intensity={40} distance={25} decay={2} />}
    <Suspense fallback={null}><Environment files={light.hdr} background={scene.environment} backgroundBlurriness={0.18} backgroundIntensity={light.background} environmentIntensity={light.environment} /></Suspense>
    {scene.environment ? <Ground config={config} /> : <><StudioBackdrop night={night} /><StudioFloor night={night} /></>}
    {scene.environment ? <>
      <Facade config={config} night={night} materials={materials} />
      <Suspense fallback={null}><HouseBackdrop rightEdge={wingLeft(config) + 0.02} frontZ={-0.9} width={17} /></Suspense>
      <Car color="#1f3248" position={[Math.min(0.35, Math.max(0, config.width / 2 - 1.05)), 0, -3.75]} />
    </> : <Reveal config={config} />}
    <GarageModel config={config} materials={materials} open={scene.open} />
    {config.sideDoor && <SideDoor config={config} m={materials} x={sideDoorX(config)} />}
    <Suspense fallback={null}><ScalePerson key={scene.showPerson ? 'on' : 'off'} show={scene.showPerson} config={config} /></Suspense>
    {scene.dimensions && <Dimensions config={config} />}
    <CameraRig config={config} view={view} environment={scene.environment} autoRotate={scene.autoRotate} />
  </>
}

function ScenePoster({ message = 'Garázskapu a homlokzatban' }: { message?: string }) {
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

export default memo(function GarageScene({ config, scene, view }: { config: GarageConfig; scene: GarageSceneSettings; view: GarageView }) {
  const [ready, setReady] = useState(false)
  const onReady = useMemo(() => () => setReady(true), [])
  return <div className="scene-canvas-wrap" data-scene-ready={ready}>
    {!ready && <ScenePoster />}
    <Boundary><Canvas frameloop={scene.autoRotate ? 'always' : 'demand'} shadows dpr={[1, 1.25]} camera={{ position: [6, 3, 8], fov: 40, near: 0.1, far: 220 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.toneMappingExposure = studioLighting(scene.time).exposure
      gl.shadowMap.autoUpdate = false
      gl.shadowMap.needsUpdate = true
      gl.domElement.dataset.catalogCanvas = 'true'
      gl.domElement.setAttribute('aria-label', 'Paraméteres 3D garázskapu. Forgatás egérrel vagy érintéssel.')
      gl.domElement.setAttribute('role', 'img')
    }}><Suspense fallback={null}><SceneContent config={config} scene={scene} view={view} onReady={onReady} /></Suspense></Canvas></Boundary>
  </div>
})
