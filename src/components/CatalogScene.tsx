import LamelixLogo from '@/components/LamelixLogo'
import { Component, Suspense, createContext, memo, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Html, Line, OrbitControls, RoundedBox, useGLTF, useProgress, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import type { OutdoorConfig } from '@/types/catalog'
import { outdoorColor } from '@/lib/catalog'
import FenceModel, { type FenceMaterials } from '@/components/catalog/FenceModel'
import { fenceSystemLength } from '@/components/catalog/fenceLayout'

export type CatalogView = 'perspective' | 'front' | 'top' | 'detail'
/** environment: a ház és a növényzet a háttérben (kikapcsolva csak a kerítés látszik a terepen). */
export interface CatalogSceneSettings { night: boolean; gateOpen: boolean; showPerson: boolean; dimensions: boolean; environment: boolean }
type Vec3 = [number, number, number]
type TextureMaps = { diff: THREE.Texture; normal: THREE.Texture; rough: THREE.Texture }
type MaterialContextValue = { config: OutdoorConfig | null; wood: TextureMaps | null }

const MaterialContext = createContext<MaterialContextValue>({ config: null, wood: null })

function clonedTexture(source: THREE.Texture, repeat: [number, number], srgb = false) {
  const texture = source.clone()
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(...repeat)
  texture.anisotropy = 4
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function refreshShadow(renderer: THREE.WebGLRenderer) {
  renderer.shadowMap.needsUpdate = true
}
function setExposure(renderer: THREE.WebGLRenderer, night: boolean) {
  renderer.toneMappingExposure = night ? 1 : 0.88
}

function MaterialProvider({ config, children }: { config: OutdoorConfig; children: ReactNode }) {
  const source = useTexture({
    diff: '/assets/textures/oak_wood_planks/diff.webp',
    normal: '/assets/textures/oak_wood_planks/nor_gl.webp',
    rough: '/assets/textures/oak_wood_planks/rough.webp',
  })
  const wood = useMemo<TextureMaps>(() => ({
    diff: clonedTexture(source.diff, [1.8, 0.65], true),
    normal: clonedTexture(source.normal, [1.8, 0.65]),
    rough: clonedTexture(source.rough, [1.8, 0.65]),
  }), [source])
  useEffect(() => () => Object.values(wood).forEach((texture) => texture.dispose()), [wood])
  return <MaterialContext.Provider value={{ config, wood }}>{children}</MaterialContext.Provider>
}

function Metal({ color, roughness = 0.34 }: { color: string; roughness?: number }) {
  return <meshPhysicalMaterial color={color} metalness={0.22} roughness={roughness} clearcoat={0.16} clearcoatRoughness={0.42} envMapIntensity={0.85} />
}

function StructureMaterial({ color, roughness = 0.34 }: { color: string; roughness?: number }) {
  const { config, wood } = useContext(MaterialContext)
  if (!config) return <Metal color={color} roughness={roughness} />
  const woodLook = config.frameMaterial === 'wood' || config.frameMaterial === 'glulam' || config.frameMaterial === 'wpc' || config.finish === 'woodlook' || config.finish === 'lazur' || config.color === 'wood'
  if (woodLook && wood) {
    return <meshStandardMaterial
      map={wood.diff}
      normalMap={wood.normal}
      normalScale={[0.32, 0.32]}
      roughnessMap={wood.rough}
      color={config.color === 'wood' ? '#c9b39c' : color}
      roughness={config.finish === 'lazur' ? 0.58 : 0.76}
      metalness={0}
      envMapIntensity={0.55}
    />
  }
  const metalness = config.frameMaterial === 'steel' || config.frameMaterial === 'wrought' ? 0.42 : 0.16
  return <meshPhysicalMaterial
    color={color}
    metalness={metalness}
    roughness={config.finish === 'galvanizedPowder' ? Math.max(roughness, 0.46) : roughness}
    clearcoat={config.finish === 'powder' ? 0.12 : 0.06}
    clearcoatRoughness={0.48}
    envMapIntensity={0.78}
  />
}

function Beam({ args, position, color, rotation = [0, 0, 0] }: { args: Vec3; position: Vec3; color: string; rotation?: Vec3 }) {
  return <RoundedBox args={args} position={position} rotation={rotation} radius={Math.min(0.012, ...args.map((value) => value / 5))} smoothness={2} castShadow receiveShadow>
    <StructureMaterial color={color} />
  </RoundedBox>
}

type InstanceTransform = { position: Vec3; rotation?: Vec3 }
function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, transforms: InstanceTransform[]) {
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    transforms.forEach((transform, index) => {
      dummy.position.set(...transform.position)
      dummy.rotation.set(...(transform.rotation ?? [0, 0, 0]))
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.count = transforms.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [ref, transforms])
}

function RepeatedBoxes({ args, transforms, color }: { args: Vec3; transforms: InstanceTransform[]; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useInstances(ref, transforms)
  return <instancedMesh ref={ref} args={[undefined, undefined, transforms.length]} castShadow receiveShadow>
    <boxGeometry args={args} />
    <StructureMaterial color={color} />
  </instancedMesh>
}

function Post({ x, z, height, color }: { x: number; z: number; height: number; color: string }) {
  return <group position={[x, 0, z]}>
    <Beam args={[0.14, height, 0.14]} position={[0, height / 2, 0]} color={color} />
    <Beam args={[0.28, 0.04, 0.28]} position={[0, 0.025, 0]} color={color} />
    {[-0.09, 0.09].flatMap((bx) => [-0.09, 0.09].map((bz) => <mesh key={`${bx}-${bz}`} position={[bx, 0.052, bz]}>
      <cylinderGeometry args={[0.014, 0.014, 0.012, 10]} />
      <meshStandardMaterial color="#93999a" metalness={0.9} roughness={0.25} />
    </mesh>))}
  </group>
}

function Ground({ config }: { config: OutdoorConfig }) {
  const source = useTexture({ grass: '/assets/textures/grass_ground/diff.webp', concrete: '/assets/textures/concrete_floor_02/diff.webp' })
  const boundary = config.family === 'fence' || config.family === 'gate'
  const groundSize = Math.max(200, config.length * 10)
  const grassRepeat = Math.round(groundSize / 3.8)
  const maps = useMemo(() => ({
    grass: clonedTexture(source.grass, [grassRepeat, grassRepeat], true),
    concrete: clonedTexture(source.concrete, [9, 9], true),
  }), [source, grassRepeat])
  useEffect(() => () => Object.values(maps).forEach((texture) => texture.dispose()), [maps])
  const concreteWidth = boundary ? Math.max(32, config.length + config.gateWidth + 10) : 16
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[groundSize, groundSize]} />
      <meshStandardMaterial map={maps.grass} color="#8fa66a" roughness={0.96} />
    </mesh>
    <mesh position={[0, 0.016, boundary ? 2.5 : 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[concreteWidth, config.family === 'carport' ? 15 : 10]} />
      <meshStandardMaterial map={maps.concrete} color="#a8aaa3" roughness={0.88} />
    </mesh>
  </>
}

function ModernHouse({ position = [0, 0, -5], width = 10, night }: { position?: Vec3; width?: number; night: boolean }) {
  const source = useTexture('/assets/textures/plastered_wall_04/diff.webp')
  const wall = useMemo(() => clonedTexture(source, [4, 4], true), [source])
  useEffect(() => () => wall.dispose(), [wall])
  return <group position={position}>
    <mesh position={[0, 1.65, 0]} castShadow receiveShadow><boxGeometry args={[width, 3.3, 5.5]} /><meshStandardMaterial map={wall} color="#d6d2c8" roughness={0.9} /></mesh>
    <mesh position={[0, 3.42, 0]} castShadow><boxGeometry args={[width + 0.35, 0.24, 5.85]} /><meshStandardMaterial color="#3e4748" roughness={0.58} /></mesh>
    {[-width * 0.28, width * 0.25].map((x) => <group key={x} position={[x, 1.5, 2.77]}>
      <mesh><boxGeometry args={[2.1, 2.25, 0.05]} /><meshPhysicalMaterial color="#70878b" metalness={0.2} roughness={0.08} transparent opacity={0.68} emissive={night ? '#c99b55' : '#000000'} emissiveIntensity={night ? 0.4 : 0} /></mesh>
      {[-1.06, 0, 1.06].map((mx) => <Beam key={mx} args={[0.055, 2.35, 0.08]} position={[mx, 0, 0.03]} color="#282e30" />)}
    </group>)}
  </group>
}

function RoofMaterial({ type, color }: { type: OutdoorConfig['roofMaterial']; color: string }) {
  if (type === 'polycarbonate') return <meshPhysicalMaterial color="#9fb2b2" roughness={0.18} metalness={0.05} transparent opacity={0.62} transmission={0.12} thickness={0.02} side={THREE.DoubleSide} />
  if (type === 'glass') return <meshPhysicalMaterial color="#b6d0d1" roughness={0.045} transparent opacity={0.42} clearcoat={1} envMapIntensity={1.7} depthWrite={false} />
  return <Metal color={type === 'sandwich' ? '#c6c8c2' : color} roughness={type === 'sandwich' ? 0.65 : 0.35} />
}

function RoofSurface({ config, width, color }: { config: OutdoorConfig; width: number; color: string }) {
  const { depth, height, roofMaterial, shape } = config
  if (roofMaterial === 'louvered') {
    const transforms = Array.from({ length: Math.ceil(depth / 0.24) }, (_, index) => ({
      position: [0, height + 0.08, -depth / 2 + 0.15 + index * 0.24] as Vec3,
      rotation: [0.38, 0, 0] as Vec3,
    }))
    return <RepeatedBoxes args={[width - 0.12, 0.075, 0.2]} transforms={transforms} color={color} />
  }
  if (shape === 'curved') {
    const count = 18
    return <group>{Array.from({ length: count }, (_, index) => {
      const z = -depth / 2 + (index + 0.5) * depth / count
      const nz = z / (depth / 2)
      const y = height + 0.12 + (1 - nz * nz) * 0.24
      const slope = -0.48 * nz / depth
      return <mesh key={index} position={[0, y, z]} rotation={[-Math.atan(slope), 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, roofMaterial === 'sandwich' ? 0.09 : 0.026, depth / count + 0.025]} />
        <RoofMaterial type={roofMaterial} color={color} />
      </mesh>
    })}</group>
  }
  if (shape === 'gable') return <group>
    {[-1, 1].map((side) => <mesh key={side} position={[side * width / 4, height + 0.22, 0]} rotation={[0, 0, side * -0.13]} castShadow receiveShadow>
      <boxGeometry args={[width / 2 + 0.12, roofMaterial === 'sandwich' ? 0.1 : 0.035, depth]} />
      <RoofMaterial type={roofMaterial} color={color} />
    </mesh>)}
    <Beam args={[0.09, 0.09, depth + 0.08]} position={[0, height + 0.39, 0]} color={color} />
  </group>
  return <mesh position={[0, height + 0.11, 0]} rotation={[-0.065, 0, 0]} castShadow receiveShadow>
    <boxGeometry args={[width, roofMaterial === 'sandwich' ? 0.1 : 0.035, depth]} />
    <RoofMaterial type={roofMaterial} color={color} />
  </mesh>
}

function LedLine({ width, y, z, night }: { width: number; y: number; z: number; night: boolean }) {
  return <>
    <mesh position={[0, y, z]}><boxGeometry args={[width - 0.18, 0.018, 0.025]} /><meshStandardMaterial color="#ffe5ac" emissive="#ffc66d" emissiveIntensity={night ? 5 : 0.6} /></mesh>
    {night && <pointLight position={[0, y - 0.25, z]} color="#ffd18a" intensity={16} distance={7} decay={2} />}
  </>
}

function CoverModel({ config, color, night }: { config: OutdoorConfig; color: string; night: boolean }) {
  const { width, depth, height, mount } = config
  return <group>
    <ModernHouse position={[0, 0, -depth / 2 - 2.86]} width={Math.max(8, width + 4)} night={night} />
    <RoofSurface config={config} width={width} color={color} />
    <Beam args={[width + 0.12, 0.2, 0.14]} position={[0, height, -depth / 2]} color={color} />
    <Beam args={[width + 0.12, 0.18, 0.14]} position={[0, height - 0.03, depth / 2]} color={color} />
    <Beam args={[width + 0.05, 0.26, 0.035]} position={[0, height + 0.08, -depth / 2 - 0.09]} color={color} />
    {[-width / 2, width / 2].map((x) => <group key={x}>
      <Beam args={[0.12, 0.12, depth]} position={[x, height, 0]} color={color} />
      {mount === 'cantilever' && <Beam args={[0.09, 0.09, Math.hypot(depth * 0.65, height * 0.45)]} position={[x, height * 0.76, -depth * 0.18]} color={color} rotation={[-0.68, 0, 0]} />}
    </group>)}
    {mount === 'posts' && [-width / 2, width / 2].map((x) => <Post key={x} x={x} z={depth / 2} height={height} color={color} />)}
    {config.gutter && <>
      <Beam args={[width + 0.18, 0.12, 0.14]} position={[0, height - 0.12, depth / 2 + 0.08]} color={color} />
      <Beam args={[0.08, height - 0.12, 0.08]} position={[width / 2, (height - 0.12) / 2, depth / 2 + 0.08]} color={color} />
    </>}
    {config.led && <LedLine width={width} y={height - 0.14} z={depth / 2 - 0.12} night={night} />}
    <group position={[0, 0, -depth / 2 - 0.075]}>
      <mesh position={[0, 1.05, 0]}><boxGeometry args={[1.05, 2.1, 0.06]} /><meshStandardMaterial color="#333d3d" roughness={0.5} /></mesh>
      <mesh position={[0.37, 1.02, 0.05]}><sphereGeometry args={[0.035, 12, 8]} /><meshStandardMaterial color="#c5a46c" metalness={0.85} /></mesh>
    </group>
  </group>
}

function Car({ x, z, color = '#394d59' }: { x: number; z: number; color?: string }) {
  return <group position={[x, 0, z]}>
    <RoundedBox args={[1.82, 0.55, 4.25]} position={[0, 0.65, 0]} radius={0.2} smoothness={4} castShadow><meshPhysicalMaterial color={color} metalness={0.65} roughness={0.22} clearcoat={1} clearcoatRoughness={0.08} /></RoundedBox>
    <RoundedBox args={[1.56, 0.67, 2.15]} position={[0, 1.12, -0.2]} radius={0.28} smoothness={4} castShadow><meshPhysicalMaterial color="#52666c" metalness={0.45} roughness={0.1} clearcoat={1} transparent opacity={0.88} /></RoundedBox>
    {[-0.92, 0.92].flatMap((wx) => [-1.35, 1.35].map((wz) => <group key={`${wx}-${wz}`} position={[wx, 0.48, wz]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow><cylinderGeometry args={[0.37, 0.37, 0.22, 28]} /><meshStandardMaterial color="#171a1b" roughness={0.82} /></mesh>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.23, 0.23, 0.025, 20]} /><meshStandardMaterial color="#a2a6a5" metalness={0.9} roughness={0.25} /></mesh>
    </group>))}
    {[-0.58, 0.58].map((lx) => <mesh key={lx} position={[lx, 0.72, 2.13]}><boxGeometry args={[0.45, 0.16, 0.035]} /><meshStandardMaterial color="#eaf2e8" emissive="#dbe7df" emissiveIntensity={1.2} /></mesh>)}
    <mesh position={[0, 0.42, 2.15]}><boxGeometry args={[0.62, 0.18, 0.025]} /><meshStandardMaterial color="#202829" metalness={0.5} /></mesh>
  </group>
}

function SideClosure({ config, width, color }: { config: OutdoorConfig; width: number; color: string }) {
  if (config.sideWalls === 'none') return null
  const height = config.height - 0.2
  return <group position={[width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
    {config.sideWalls === 'glass' && <mesh position={[0, height / 2 + 0.1, 0]}>
      <boxGeometry args={[config.depth - 0.2, height, 0.018]} />
      <meshPhysicalMaterial color="#aac4c7" transparent opacity={0.34} roughness={0.05} depthWrite={false} />
    </mesh>}
    {config.sideWalls === 'privacy' && <Beam args={[config.depth - 0.2, height, 0.055]} position={[0, height / 2 + 0.1, 0]} color={color} />}
    {config.sideWalls === 'louver' && <RepeatedBoxes
      args={[config.depth - 0.2, 0.12, 0.055]}
      transforms={Array.from({ length: Math.floor(height / 0.16) }, (_, index) => ({ position: [0, 0.2 + index * 0.16, 0] as Vec3 }))}
      color={color}
    />}
  </group>
}

function DriveModel({ config, color, night }: { config: OutdoorConfig; color: string; night: boolean }) {
  const width = config.width * config.bays
  const houseDistance = config.mount === 'wall' ? 2.86 : 5.2
  return <group>
    <ModernHouse position={[0, 0, -config.depth / 2 - houseDistance]} width={Math.max(11, width + 5)} night={night} />
    <RoofSurface config={{ ...config, width }} width={width} color={color} />
    {(config.mount === 'wall' ? [config.depth / 2] : [-config.depth / 2, config.depth / 2]).flatMap((z) => Array.from({ length: config.bays + 1 }, (_, index) => -width / 2 + index * config.width).map((x) => <Post key={`${x}-${z}`} x={x} z={z} height={config.height} color={color} />))}
    <Beam args={[width + 0.15, 0.22, 0.16]} position={[0, config.height, config.depth / 2]} color={color} />
    <Beam args={[width + 0.15, 0.22, 0.16]} position={[0, config.height, -config.depth / 2]} color={color} />
    {Array.from({ length: config.bays }, (_, index) => <Car key={index} x={-width / 2 + config.width * (index + 0.5)} z={0.15} color={index ? '#6a6862' : '#394d59'} />)}
    <SideClosure config={config} width={width} color={color} />
    {config.gutter && <>
      <Beam args={[width + 0.18, 0.13, 0.15]} position={[0, config.height - 0.13, config.depth / 2 + 0.08]} color={color} />
      <Beam args={[0.09, config.height, 0.09]} position={[width / 2, config.height / 2, config.depth / 2 + 0.08]} color={color} />
    </>}
    {config.led && <LedLine width={width} y={config.height - 0.16} z={config.depth / 2 - 0.15} night={night} />}
    {config.evReady && <group position={[-width / 2 + 0.25, 0, -config.depth / 2 + 0.25]}>
      <Beam args={[0.24, 1.1, 0.2]} position={[0, 0.55, 0]} color="#3c4546" />
      <mesh position={[0, 0.87, 0.11]}><boxGeometry args={[0.13, 0.18, 0.025]} /><meshStandardMaterial color="#b8d9c6" emissive="#73b68e" emissiveIntensity={0.8} /></mesh>
    </group>}
    {config.storage && <group position={[width / 2 + 0.7, 0, -0.8]}>
      <Beam args={[1.3, config.height, 2.6]} position={[0, config.height / 2, 0]} color={color} />
      <Beam args={[1.05, config.height - 0.25, 0.06]} position={[0, config.height / 2, 1.32]} color="#454e4d" />
    </group>}
  </group>
}

function ScalePerson({ show, config }: { show: boolean; config: OutdoorConfig }) {
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
        child.castShadow = false
        child.receiveShadow = false
        child.frustumCulled = true
        const source = Array.isArray(child.material) ? child.material[0] : child.material
        child.material = new THREE.MeshStandardMaterial({
          map: source.map,
          color: source.color,
          roughness: 0.82,
          metalness: 0,
          envMapIntensity: 0.35,
        })
      }
    })
    return clone
  }, [scene])
  useEffect(() => {
    if (show) invalidate()
  }, [invalidate, object, config, show])
  if (!show) return null
  let position: Vec3
  if (config.family === 'canopy') {
    position = [config.width / 2 - Math.min(0.65, config.width * 0.2), 0.02, config.depth / 2 - Math.min(0.55, config.depth * 0.25)]
  } else if (config.family === 'carport') {
    position = [-config.width * config.bays / 2 + 0.55, 0.02, config.depth / 2 + 0.55]
  } else {
    // Az utcai oldalon, a kiskapu (vagy a kapu) mellett.
    const total = fenceSystemLength(config)
    const split = config.gateType !== 'none' || config.pedestrianGate
    position = [split ? total / 2 - config.length / 2 + 0.7 : 0.6, 0.02, 1.0]
  }
  return <group position={position}>
    <primitive object={object} />
    
  </group>
}

/** Kerítés anyagai: a betét a WPC-nél fa, a vázszín porfestett fém; a vasalat horganyzott acél. */
function useFenceMaterials(config: OutdoorConfig, color: string, night: boolean): FenceMaterials {
  const { wood } = useContext(MaterialContext)
  const materials = useMemo<FenceMaterials>(() => {
    const woodAll = config.frameMaterial === 'wood' || config.finish === 'woodlook' || config.finish === 'lazur' || config.color === 'wood'
    const woodInfill = woodAll || config.frameMaterial === 'wpc'
    const steel = config.frameMaterial === 'steel' || config.frameMaterial === 'wrought'
    const metal = (hex: string) => new THREE.MeshPhysicalMaterial({
      color: hex,
      metalness: steel ? 0.45 : 0.25,
      roughness: config.finish === 'galvanizedPowder' ? 0.5 : 0.42,
      clearcoat: 0.25,
      clearcoatRoughness: 0.45,
      envMapIntensity: 0.9,
    })
    const woodMaterial = () => new THREE.MeshStandardMaterial({
      map: wood?.diff ?? null,
      normalMap: wood?.normal ?? null,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: wood?.rough ?? null,
      color: config.color === 'wood' || config.frameMaterial === 'wpc' ? '#c9a888' : color,
      roughness: config.finish === 'lazur' ? 0.6 : 0.78,
      metalness: 0,
      envMapIntensity: 0.55,
    })
    // WPC-nél a váz antracit fém, ha a választott szín fahatású; különben a választott szín.
    const frameHex = woodAll && config.frameMaterial !== 'wood' ? '#3a3f42' : color
    return {
      frame: config.frameMaterial === 'wood' ? woodMaterial() : metal(frameHex),
      infill: woodInfill ? woodMaterial() : metal(color),
      hardware: new THREE.MeshStandardMaterial({ color: '#8b9194', metalness: 0.85, roughness: 0.32 }),
      dark: new THREE.MeshStandardMaterial({ color: '#202628', metalness: 0.3, roughness: 0.55 }),
      concrete: new THREE.MeshStandardMaterial({ color: '#a9a9a1', roughness: 0.94 }),
      glow: new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd9a0', emissiveIntensity: night ? 3.2 : 0.5, toneMapped: false }),
      amber: new THREE.MeshStandardMaterial({ color: '#e08a1e', emissive: '#e07a10', emissiveIntensity: night ? 1.6 : 0.35, transparent: true, opacity: 0.92 }),
      screen: new THREE.MeshStandardMaterial({ color: '#28414f', emissive: '#4f86a6', emissiveIntensity: night ? 1.4 : 0.4, roughness: 0.2 }),
    }
  }, [config.frameMaterial, config.finish, config.color, color, night, wood])
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials])
  return materials
}

function Fence({ config, color, scene }: { config: OutdoorConfig; color: string; scene: CatalogSceneSettings }) {
  const materials = useFenceMaterials(config, color, scene.night)
  return <FenceModel config={config} materials={materials} open={scene.gateOpen} />
}

/** Növényzet a telken belül, a kerítés mögött (csak bekapcsolt környezettel). */
function Greenery({ config }: { config: OutdoorConfig }) {
  const shrub = useGLTF('/assets/models/shrub_04/model.gltf').scene
  const tree = useGLTF('/assets/models/tree_small_02/optimized-512.gltf').scene
  const invalidate = useThree((state) => state.invalidate)
  const items = useMemo(() => {
    const total = fenceSystemLength(config)
    const fit = (source: THREE.Object3D, height: number) => {
      const clone = source.clone(true)
      const box = new THREE.Box3().setFromObject(clone)
      const scale = height / Math.max(0.01, box.getSize(new THREE.Vector3()).y)
      clone.scale.setScalar(scale)
      clone.position.y = -box.min.y * scale
      clone.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true } })
      return clone
    }
    const left = -total / 2
    return [
      { object: fit(shrub, 1.1), position: [left + 1.2, 0, -1.3] as Vec3, rotation: 0.4 },
      { object: fit(shrub, 0.9), position: [left + 2.6, 0, -1.6] as Vec3, rotation: 1.9 },
      { object: fit(shrub, 1.2), position: [total / 2 - 1.4, 0, -1.4] as Vec3, rotation: 2.6 },
      { object: fit(tree, 4.2), position: [total / 2 - 3.2, 0, -3.4] as Vec3, rotation: 0.8 },
    ]
  }, [shrub, tree, config])
  useEffect(() => { invalidate() }, [items, invalidate])
  return <>{items.map((item, index) => <primitive key={index} object={item.object} position={item.position} rotation={[0, item.rotation, 0]} />)}</>
}

function systemLength(config: OutdoorConfig) {
  if (config.family === 'canopy') return config.width
  if (config.family === 'carport') return config.width * config.bays
  return fenceSystemLength(config)
}

function Dimensions({ config }: { config: OutdoorConfig }) {
  const roof = config.family === 'canopy' || config.family === 'carport'
  const width = systemLength(config)
  const depth = roof ? config.depth : 0
  const frontZ = roof ? depth / 2 + 0.55 : 0.65
  const cm = (value: number) => `${Math.round(value * 100)} cm`
  return <group>
    <Line points={[[-width / 2, 0.06, frontZ], [width / 2, 0.06, frontZ]]} color="#d8ff72" lineWidth={1.2} />
    <Html position={[0, 0.1, frontZ + 0.03]} center className="dimension-label">{cm(width)}</Html>
    {roof && <>
      <Line points={[[width / 2 + 0.5, 0.06, -depth / 2], [width / 2 + 0.5, 0.06, depth / 2]]} color="#d8ff72" lineWidth={1.2} />
      <Html position={[width / 2 + 0.52, 0.1, 0]} center className="dimension-label">{cm(depth)}</Html>
    </>}
    <Line points={[[-width / 2 - 0.35, 0.05, roof ? depth / 2 : 0], [-width / 2 - 0.35, config.height + 0.2, roof ? depth / 2 : 0]]} color="#d8ff72" lineWidth={1.2} />
    <Html position={[-width / 2 - 0.35, config.height / 2, roof ? depth / 2 : 0]} center className="dimension-label">{cm(config.height)}</Html>
  </group>
}

/** A vászon szabad, panelek által nem takart vízszintes sávja (képpontban, a vászon bal szélétől). */
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
  // Mobilon a panelek lapként takarnak, ott a teljes vászon a keret.
  return right - left < box.width * 0.35 ? { left: 0, right: box.width } : { left, right }
}

function CameraRig({ config, view }: { config: OutdoorConfig; view: CatalogView }) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const viewport = useThree((state) => state.size)
  const controls = useRef<OrbitControlsType>(null)
  const size = systemLength(config)
  useEffect(() => {
    const depth = config.family === 'canopy' || config.family === 'carport' ? config.depth : 2
    const perspectiveCamera = camera as THREE.PerspectiveCamera
    const { left, right } = freeBand(canvas)
    const free = Math.max(1, right - left) / Math.max(1, viewport.width)
    // A szabad sáv közepére toljuk a képet, és akkorára állítjuk a távolságot, hogy a teljes rendszer beleférjen.
    const shift = Math.round(viewport.width / 2 - (left + right) / 2)
    if (shift) perspectiveCamera.setViewOffset(viewport.width, viewport.height, shift, 0, viewport.width, viewport.height)
    else perspectiveCamera.clearViewOffset()
    const aspect = viewport.width / Math.max(1, viewport.height)
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov / 2)) * aspect * free
    const fit = Math.max(size, depth * 1.4, 4) / 0.86 / (2 * halfWidth)
    const along = (direction: Vec3, distance: number): Vec3 => {
      const length = Math.hypot(...direction)
      return direction.map((value) => value / length * distance) as Vec3
    }
    const target = config.height * 0.45
    const positions: Record<CatalogView, Vec3> = {
      perspective: along([0.62, 0.3, 1], fit * 0.92),
      front: [0, config.height * 0.6 + 0.6, fit],
      top: [0.01, Math.max(14, fit * 1.1), 0.01],
      detail: [size * 0.22 + 2, config.height + 1.2, Math.max(4.5, depth + 2.5)],
    }
    const [x, y, z] = positions[view]
    camera.position.set(x, y + (view === 'top' ? 0 : target), z)
    camera.lookAt(0, target, 0)
    camera.updateProjectionMatrix()
    if (controls.current) {
      controls.current.target.set(0, target, 0)
      controls.current.update()
    }
  }, [camera, canvas, config, view, viewport.width, viewport.height, size])
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} minDistance={2.5} maxDistance={Math.max(60, size * 4)} maxPolarAngle={Math.PI / 2.02} />
}

function SceneContent({ config, scene, view, onReady }: { config: OutdoorConfig; scene: CatalogSceneSettings; view: CatalogView; onReady: () => void }) {
  const color = outdoorColor(config)
  const gl = useThree((state) => state.gl)
  const size = systemLength(config)
  useEffect(() => {
    refreshShadow(gl)
    onReady()
  }, [config, gl, onReady])
  useEffect(() => {
    setExposure(gl, scene.night)
  }, [gl, scene.night])
  return <>
    <fog attach="fog" args={[scene.night ? '#172331' : '#b5c2bd', Math.max(40, size * 2.2), Math.max(85, size * 4.5)]} />
    <ambientLight intensity={scene.night ? 0.65 : 0.55} />
    <hemisphereLight args={['#d4e1e8', '#514b3f', scene.night ? 0.4 : 0.55]} />
    <directionalLight position={[7, 12, 8]} color={scene.night ? '#b7d5f2' : '#fff0d2'} intensity={scene.night ? 1.3 : 3.1} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-Math.max(16, size * 0.65)} shadow-camera-right={Math.max(16, size * 0.65)} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-bias={-0.0002} shadow-normalBias={0.02} />
    {scene.night && <>
      <directionalLight position={[-8, 5, 4]} color="#b7d5f2" intensity={1.8} />
      <pointLight position={[0, 5, 7]} color="#c5ddff" intensity={65} distance={30} decay={2} />
    </>}
    <Suspense fallback={null}><Environment files={scene.night ? '/assets/hdr/courtyard_night.hdr' : '/assets/hdr/day_clear.hdr'} background backgroundBlurriness={0.18} backgroundIntensity={scene.night ? 0.4 : 0.65} environmentIntensity={scene.night ? 0.55 : 0.8} /></Suspense>
    <Ground config={config} />
    <MaterialProvider config={config}>
      {config.family === 'canopy' && <CoverModel config={config} color={color} night={scene.night} />}
      {config.family === 'carport' && <DriveModel config={config} color={color} night={scene.night} />}
      {(config.family === 'fence' || config.family === 'gate') && <>
        {scene.environment && <>
          <ModernHouse position={[0, 0, -9]} width={12} night={scene.night} />
          <Suspense fallback={null}><Greenery config={config} /></Suspense>
        </>}
        <Fence config={config} color={color} scene={scene} />
      </>}
    </MaterialProvider>
    <Suspense fallback={null}><ScalePerson key={scene.showPerson ? 'person-on' : 'person-off'} show={scene.showPerson} config={config} /></Suspense>
    {scene.dimensions && <Dimensions config={config} />}
    <CameraRig config={config} view={view} />
  </>
}

function ScenePoster({ message = 'Paraméteres építészeti jelenet' }: { message?: string }) {
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

export default memo(function CatalogScene({ config, scene, view }: { config: OutdoorConfig; scene: CatalogSceneSettings; view: CatalogView }) {
  const [ready, setReady] = useState(false)
  const onReady = useMemo(() => () => setReady(true), [])
  return <div className="scene-canvas-wrap" data-scene-ready={ready}>
    {!ready && <ScenePoster />}
    <Boundary><Canvas frameloop="demand" shadows dpr={[1, 1.25]} camera={{ position: [10, 7, 12], fov: 40, near: 0.1, far: 260 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.toneMappingExposure = scene.night ? 1 : 0.88
      gl.shadowMap.autoUpdate = false
      gl.shadowMap.needsUpdate = true
      gl.domElement.dataset.catalogCanvas = 'true'
      gl.domElement.setAttribute('aria-label', 'Paraméteres 3D kerti építmény. Forgatás egérrel vagy érintéssel.')
      gl.domElement.setAttribute('role', 'img')
    }}><Suspense fallback={null}><SceneContent config={config} scene={scene} view={view} onReady={onReady} /></Suspense></Canvas></Boundary>
  </div>
})
