import { Component, Suspense, createContext, memo, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Line, OrbitControls, RoundedBox, useGLTF, useProgress, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import type { OutdoorConfig } from '@/types/catalog'
import { outdoorColor } from '@/lib/catalog'

export type CatalogView = 'perspective' | 'front' | 'top' | 'detail'
export interface CatalogSceneSettings { night: boolean; gateOpen: boolean; showPerson: boolean; dimensions: boolean }
type Vec3 = [number, number, number]
type TextureMaps = { diff: THREE.Texture; normal: THREE.Texture; rough: THREE.Texture }
type MaterialContextValue = { config: OutdoorConfig | null; wood: TextureMaps | null }

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
    diff: '/assets/textures/oak_wood_planks/diff.jpg',
    normal: '/assets/textures/oak_wood_planks/nor_gl.jpg',
    rough: '/assets/textures/oak_wood_planks/rough.jpg',
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

function RepeatedCones({ transforms, color }: { transforms: InstanceTransform[]; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useInstances(ref, transforms)
  return <instancedMesh ref={ref} args={[undefined, undefined, transforms.length]} castShadow>
    <coneGeometry args={[0.065, 0.14, 4]} />
    <StructureMaterial color={color} />
  </instancedMesh>
}

function RepeatedOrnaments({ transforms, color }: { transforms: InstanceTransform[]; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useInstances(ref, transforms)
  return <instancedMesh ref={ref} args={[undefined, undefined, transforms.length]} castShadow>
    <torusGeometry args={[0.19, 0.018, 8, 24]} />
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
  const source = useTexture({ grass: '/assets/textures/grass_ground/diff.jpg', concrete: '/assets/textures/concrete_floor_02/diff.jpg' })
  const maps = useMemo(() => ({
    grass: clonedTexture(source.grass, [18, 18], true),
    concrete: clonedTexture(source.concrete, [9, 9], true),
  }), [source])
  useEffect(() => () => Object.values(maps).forEach((texture) => texture.dispose()), [maps])
  const boundary = config.family === 'fence' || config.family === 'gate'
  const groundSize = Math.max(70, config.length + 28)
  const concreteWidth = boundary ? Math.max(32, config.length + config.gateWidth + 10) : 16
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[groundSize, groundSize]} />
      <meshStandardMaterial map={maps.grass} color="#859071" roughness={0.96} />
    </mesh>
    <mesh position={[0, 0.016, boundary ? 2.5 : 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[concreteWidth, config.family === 'carport' ? 15 : 10]} />
      <meshStandardMaterial map={maps.concrete} color="#a8aaa3" roughness={0.88} />
    </mesh>
  </>
}

function ModernHouse({ position = [0, 0, -5], width = 10, night }: { position?: Vec3; width?: number; night: boolean }) {
  const source = useTexture('/assets/textures/plastered_wall_04/diff.jpg')
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

function Infill({ length, height, style, color }: { length: number; height: number; style: OutdoorConfig['style']; color: string }) {
  if (style === 'privacy') return <Beam args={[length, height - 0.15, 0.055]} position={[0, height / 2, 0]} color={color} />
  if (style === 'horizontal') {
    const count = Math.max(3, Math.floor(height / 0.17))
    const transforms = Array.from({ length: count }, (_, index) => ({ position: [0, 0.16 + index * (height - 0.24) / Math.max(2, count - 1), 0] as Vec3 }))
    return <RepeatedBoxes args={[length - 0.08, 0.105, 0.045]} transforms={transforms} color={color} />
  }
  if (style === 'diagonal') {
    const count = Math.ceil(length / 0.18)
    const transforms = Array.from({ length: count }, (_, index) => ({
      position: [-length / 2 + 0.1 + index * 0.18, height / 2, 0] as Vec3,
      rotation: [0, 0, -0.36] as Vec3,
    }))
    return <RepeatedBoxes args={[0.07, height * 1.14, 0.045]} transforms={transforms} color={color} />
  }
  const count = Math.max(2, Math.ceil(length / (style === 'ornamental' ? 0.19 : 0.14)))
  const transforms = Array.from({ length: count }, (_, index) => ({ position: [-length / 2 + (index + 0.5) * length / count, height / 2, 0] as Vec3 }))
  return <>
    <RepeatedBoxes args={[style === 'ornamental' ? 0.035 : 0.045, height - 0.12, 0.035]} transforms={transforms} color={color} />
    {(style === 'picket' || style === 'ornamental') && <RepeatedCones transforms={transforms.map(({ position }) => ({ position: [position[0], height - 0.035, position[2]] as Vec3 }))} color={color} />}
    {style === 'ornamental' && <RepeatedOrnaments
      color={color}
      transforms={[-0.25, 0.25].flatMap((y) => Array.from({ length: Math.max(1, Math.floor(length / 0.7)) }, (_, index) => ({
        position: [-length / 2 + 0.4 + index * 0.7, height / 2 + y * height, 0] as Vec3,
      })))}
    />}
  </>
}

function FenceSegment({ length, height, style, color, position = [0, 0, 0] }: { length: number; height: number; style: OutdoorConfig['style']; color: string; position?: Vec3 }) {
  if (length <= 0.05) return null
  return <group position={position}>
    <Infill length={length} height={height} style={style} color={color} />
    <Beam args={[length + 0.08, 0.065, 0.075]} position={[0, 0.09, 0]} color={color} />
    <Beam args={[length + 0.08, 0.065, 0.075]} position={[0, height - 0.08, 0]} color={color} />
    {[-length / 2, length / 2].map((x) => <Post key={x} x={x} z={0} height={height + 0.12} color={color} />)}
  </group>
}

function DriveGate({ config, color, open }: { config: OutdoorConfig; color: string; open: boolean }) {
  const sliding = useRef<THREE.Group>(null)
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const lastShadow = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  useFrame(({ clock }, delta) => {
    let moving = false
    if (sliding.current) {
      const target = open ? config.gateWidth * 0.9 : 0
      const next = REDUCED ? target : THREE.MathUtils.damp(sliding.current.position.x, target, 6, delta)
      if (Math.abs(next - sliding.current.position.x) > 0.0005) moving = true
      sliding.current.position.x = next
    }
    if (left.current && right.current) {
      const target = open ? 1.25 : 0
      const next = REDUCED ? target : THREE.MathUtils.damp(left.current.rotation.y, target, 6, delta)
      if (Math.abs(next - left.current.rotation.y) > 0.0005) moving = true
      left.current.rotation.y = next
      right.current.rotation.y = -next
    }
    if (moving) {
      if (clock.elapsedTime - lastShadow.current > 0.12) { refreshShadow(gl); lastShadow.current = clock.elapsedTime }
      invalidate()
    }
  })
  const leaf = (width: number) => <group>
    <Infill length={width} height={config.height} style={config.style} color={color} />
    <Beam args={[width + 0.05, 0.07, 0.08]} position={[0, 0.08, 0]} color={color} />
    <Beam args={[width + 0.05, 0.07, 0.08]} position={[0, config.height - 0.06, 0]} color={color} />
  </group>
  if (config.gateType === 'swing') return <group>
    <group ref={left} position={[-config.gateWidth / 2, 0, 0]}><group position={[config.gateWidth / 4, 0, 0]}>{leaf(config.gateWidth / 2)}</group></group>
    <group ref={right} position={[config.gateWidth / 2, 0, 0]}><group position={[-config.gateWidth / 4, 0, 0]}>{leaf(config.gateWidth / 2)}</group></group>
  </group>
  return <group ref={sliding}>
    {leaf(config.gateWidth)}
    {config.gateType === 'cantilever' && <Beam args={[config.gateWidth * 0.35, 0.12, 0.12]} position={[-config.gateWidth * 0.64, 0.16, 0]} color={color} />}
  </group>
}

function FenceModel({ config, color, open }: { config: OutdoorConfig; color: string; open: boolean }) {
  const gateWidth = config.gateType === 'none' ? 0 : config.gateWidth
  const each = Math.max(0.6, (config.length - (config.pedestrianGate ? 1 : 0)) / 2)
  const leftCenter = -gateWidth / 2 - each / 2
  const rightCenter = gateWidth / 2 + each / 2 + (config.pedestrianGate ? 1 : 0)
  return <group>
    <FenceSegment length={each} height={config.height} style={config.style} color={color} position={[leftCenter, 0, 0]} />
    <FenceSegment length={each} height={config.height} style={config.style} color={color} position={[rightCenter, 0, 0]} />
    {config.gateType !== 'none' && <>
      <DriveGate config={config} color={color} open={open} />
      {[-gateWidth / 2, gateWidth / 2].map((x) => <Post key={x} x={x} z={0} height={config.height + 0.2} color={color} />)}
      {config.gateAutomation && <group position={[gateWidth / 2 + 0.35, 0, -0.35]}>
        <Beam args={[0.32, 0.48, 0.55]} position={[0, 0.25, 0]} color="#343c3d" />
        {config.safetyKit && <mesh position={[-0.1, Math.min(0.9, config.height * 0.65), 0.2]}><boxGeometry args={[0.06, 0.12, 0.06]} /><meshStandardMaterial color="#26302f" emissive="#5fc99b" emissiveIntensity={0.7} /></mesh>}
      </group>}
    </>}
    {config.pedestrianGate && <group position={[gateWidth / 2 + 0.5, 0, 0]}>
      <Infill length={0.95} height={config.height} style={config.style} color={color} />
      <Beam args={[0.04, 0.25, 0.07]} position={[0.34, Math.min(1.02, config.height * 0.62), 0.06]} color="#a3a8a5" />
    </group>}
    {config.intercom && <group position={[gateWidth / 2 + 0.18, 0, 0.55]}>
      <Beam args={[0.1, 1.25, 0.1]} position={[0, 0.625, 0]} color={color} />
      <mesh position={[0, 1.25, 0.03]}><boxGeometry args={[0.18, 0.27, 0.08]} /><meshStandardMaterial color="#242c2d" metalness={0.4} /></mesh>
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
    position = [Math.min(config.length / 2, config.gateWidth / 2 + 1.1), 0.02, 1.1]
  }
  return <group position={position}>
    <primitive object={object} />
    <Html position={[0, 1.94, 0]} center className="person-label">180 cm</Html>
  </group>
}

function systemLength(config: OutdoorConfig) {
  if (config.family === 'canopy') return config.width
  if (config.family === 'carport') return config.width * config.bays
  return config.length + (config.gateType === 'none' ? 0 : config.gateWidth) + (config.pedestrianGate ? 1 : 0)
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

function CameraRig({ config, view }: { config: OutdoorConfig; view: CatalogView }) {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.size)
  const controls = useRef<OrbitControlsType>(null)
  const size = systemLength(config)
  useEffect(() => {
    const depth = config.family === 'canopy' || config.family === 'carport' ? config.depth : 2
    const positions: Record<CatalogView, Vec3> = {
      perspective: [size * 0.7 + 4, config.height * 2 + 3, Math.max(10, depth * 1.25 + size * 0.38)],
      front: [0, config.height * 0.85 + 1, 10 + size * 0.65],
      top: [0.01, 14 + size * 0.45, 0.01],
      detail: [size * 0.22 + 2, config.height + 1.2, Math.max(4.5, depth + 2.5)],
    }
    const aspect = viewport.width / Math.max(1, viewport.height)
    const narrowFit = view === 'perspective' && aspect < 0.85 ? Math.min(2.1, 0.85 / aspect) : 1
    const [x, y, z] = positions[view]
    camera.position.set(x * narrowFit, y + (narrowFit - 1) * 2, z * narrowFit)
    camera.lookAt(0, config.height * 0.45, 0)
    camera.updateProjectionMatrix()
    if (controls.current) {
      controls.current.target.set(0, config.height * 0.45, 0)
      controls.current.maxDistance = Math.max(32, size * 2.2)
      controls.current.update()
    }
  }, [camera, config, view, viewport.width, viewport.height, size])
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} minDistance={2.5} maxDistance={Math.max(32, size * 2.2)} maxPolarAngle={Math.PI / 2.02} />
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
    <fog attach="fog" args={[scene.night ? '#172331' : '#b5c2bd', Math.max(24, size * 0.8), Math.max(55, size * 2.2)]} />
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
        <ModernHouse position={[0, 0, -8]} width={12} night={scene.night} />
        <FenceModel config={config} color={color} open={scene.gateOpen} />
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
    <div className="branded-loader"><div className="loader-brand">ARDELIS <small>/ ATELIER</small></div><div className="loader-track"><span style={{ width: `${Math.max(8, progress)}%` }} /></div><div><span>{message}</span><strong>{Math.round(progress)}%</strong></div></div>
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
    <Boundary><Canvas frameloop="demand" shadows dpr={[1, 1.25]} camera={{ position: [10, 7, 12], fov: 40, near: 0.1, far: 120 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
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
