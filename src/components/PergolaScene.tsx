import { Component, Suspense, memo, use, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Html, Line, OrbitControls, RoundedBox, useGLTF, useProgress, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import type { CameraView, PergolaConfig, QualityLevel, SceneSettings, SideKey } from '@/types/pergola'
import { getFrameColorHex } from '@/lib/config'
import { useTenant } from '@/tenants/TenantContext'
import { EMBEDDED_GRASS_RGBA, EMBEDDED_GRASS_SIZE } from '@/lib/grassTexture'
import { log } from '@/lib/logger'

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}
function refreshShadows(renderer: THREE.WebGLRenderer) {
  renderer.shadowMap.needsUpdate = true
}
function configureShadowBudget(renderer: THREE.WebGLRenderer) {
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
}
const HDR_FILES = {
  day: '/assets/hdr/day_clear.hdr',
  golden: '/assets/hdr/evening_museum_courtyard.hdr',
  night: '/assets/hdr/courtyard_night.hdr',
} as const

type TextureMaps = { diff: THREE.Texture; normal: THREE.Texture; rough: THREE.Texture }

type SceneAssetBoundaryProps = { children: ReactNode; name: string }
class SceneAssetBoundary extends Component<SceneAssetBoundaryProps, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    log.warn('Optional 3D asset disabled', {
      asset: this.props.name,
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    })
  }
  render() { return this.state.failed ? null : this.props.children }
}

// Every decorative asset owns its Suspense boundary. A pending tree, HDR or
// texture must never suspend the structurally complete pergola beside it.
function OptionalSceneAsset({ name, children }: SceneAssetBoundaryProps) {
  return <SceneAssetBoundary name={name}><Suspense fallback={null}>{children}</Suspense></SceneAssetBoundary>
}

function usePBR(asset: string, repeat: [number, number]): TextureMaps {
  const [repeatX, repeatY] = repeat
  const textures = useTexture({ diff: `/assets/textures/${asset}/diff.jpg`, normal: `/assets/textures/${asset}/nor_gl.jpg`, rough: `/assets/textures/${asset}/rough.jpg` })
  const maps = useMemo(() => {
    const result = {} as TextureMaps
    ;(['diff', 'normal', 'rough'] as const).forEach((key) => {
      const texture = textures[key].clone()
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(repeatX, repeatY)
      texture.anisotropy = 8
      if (key === 'diff') texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
      result[key] = texture
    })
    return result
  }, [textures, repeatX, repeatY])
  useEffect(() => () => Object.values(maps).forEach((texture) => texture.dispose()), [maps])
  return maps
}

type RealisticAssetProps = { url: string; position: [number, number, number]; height: number; rotation?: number; shadows?: boolean }
function RealisticAssetContent({ url, position, height, rotation = 0, shadows = true }: RealisticAssetProps) {
  const { scene: source } = useGLTF(url)
  const prepared = useMemo(() => {
    const object = source.clone(true)
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = shadows
      child.receiveShadow = true
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return
        material.envMapIntensity = 0.68
        if (/leaves|leaf|grass/i.test(material.name)) {
          material.transparent = false
          material.alphaTest = 0.38
          material.side = THREE.DoubleSide
          material.roughness = 0.88
        }
      })
    })
    object.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    return { object, center, minY: box.min.y, scale: height / Math.max(0.001, box.max.y - box.min.y) }
  }, [source, height, shadows])
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  useEffect(() => { refreshShadows(gl); invalidate() }, [gl, invalidate, prepared])
  return <group position={position} rotation={[0, rotation, 0]} scale={prepared.scale}><primitive object={prepared.object} position={[-prepared.center.x, -prepared.minY, -prepared.center.z]} /></group>
}

function RealisticAsset(props: RealisticAssetProps) {
  return <SceneAssetBoundary name={props.url}><Suspense fallback={null}><RealisticAssetContent {...props} /></Suspense></SceneAssetBoundary>
}

let powderCoatTexture: THREE.DataTexture | null = null
function getPowderCoatTexture() {
  if (powderCoatTexture) return powderCoatTexture
  const size = 64
  const data = new Uint8Array(size * size * 4)
  for (let index = 0; index < size * size; index++) {
    const grain = Math.round(178 + seeded(index, 31) * 68)
    data[index * 4] = grain
    data[index * 4 + 1] = grain
    data[index * 4 + 2] = grain
    data[index * 4 + 3] = 255
  }
  powderCoatTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  powderCoatTexture.wrapS = powderCoatTexture.wrapT = THREE.RepeatWrapping
  powderCoatTexture.repeat.set(10, 10)
  powderCoatTexture.needsUpdate = true
  return powderCoatTexture
}

function PowderCoat({ color, roughness = 0.4 }: { color: string; roughness?: number }) {
  return <meshPhysicalMaterial color={color} metalness={0.12} roughness={roughness} roughnessMap={getPowderCoatTexture()} clearcoat={0.1} clearcoatRoughness={0.48} specularIntensity={0.55} envMapIntensity={0.82} />
}

function Beam({ args, position, color, radius = 0.012 }: { args: [number, number, number]; position: [number, number, number]; color: string; radius?: number }) {
  return <RoundedBox args={args} position={position} radius={Math.min(radius, ...args.map((value) => value / 4))} smoothness={3} castShadow receiveShadow><PowderCoat color={color} /></RoundedBox>
}

function StructuralBeam({ args, position, color }: { args: [number, number, number]; position: [number, number, number]; color: string }) {
  const alongX = args[0] >= args[2]
  const channel: [number, number, number] = alongX ? [args[0] - 0.12, 0.018, args[2] * 0.48] : [args[0] * 0.48, 0.018, args[2] - 0.12]
  return <group position={position}>
    <Beam args={args} position={[0, 0, 0]} color={color} radius={0.008} />
    <mesh position={[0, -args[1] / 2 - 0.001, 0]} receiveShadow><boxGeometry args={channel} /><meshStandardMaterial color="#151b1c" metalness={0.35} roughness={0.58} /></mesh>
    <mesh position={[0, -args[1] / 2 + 0.019, 0]}><boxGeometry args={alongX ? [args[0] - 0.16, 0.012, args[2] * 0.17] : [args[0] * 0.17, 0.012, args[2] - 0.16]} /><meshStandardMaterial color={color} metalness={0.15} roughness={0.48} /></mesh>
  </group>
}

function GutterChannel({ length, position, rotation = 0, color }: { length: number; position: [number, number, number]; rotation?: number; color: string }) {
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh receiveShadow><boxGeometry args={[length, 0.018, 0.11]} /><meshStandardMaterial color="#202728" metalness={0.28} roughness={0.5} /></mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[0, 0.035, side * 0.052]}><boxGeometry args={[length, 0.07, 0.012]} /><PowderCoat color={color} roughness={0.44} /></mesh>)}
  </group>
}

function Bolt({ position }: { position: [number, number, number] }) {
  return <group position={position}><mesh castShadow><cylinderGeometry args={[0.018, 0.018, 0.014, 12]} /><meshStandardMaterial color="#737b7d" metalness={0.88} roughness={0.24} /></mesh><mesh position={[0, 0.008, 0]}><cylinderGeometry args={[0.007, 0.007, 0.002, 6]} /><meshStandardMaterial color="#252a2c" metalness={0.7} roughness={0.36} /></mesh></group>
}

function DetailedPost({ position, height, color }: { position: [number, number]; height: number; color: string }) {
  const [x, z] = position
  return <group position={[x, 0, z]}><Beam args={[0.16, height, 0.16]} position={[0, height / 2, 0]} color={color} /><mesh position={[0, height / 2, 0.081]}><boxGeometry args={[0.018, height - 0.16, 0.003]} /><meshStandardMaterial color="#141a1c" metalness={0.42} roughness={0.5} /></mesh><mesh position={[0.081, height / 2, 0]}><boxGeometry args={[0.003, height - 0.16, 0.018]} /><meshStandardMaterial color="#141a1c" metalness={0.42} roughness={0.5} /></mesh><RoundedBox args={[0.176, 0.028, 0.176]} position={[0, height - 0.035, 0]} radius={0.006} smoothness={3}><PowderCoat color={color} /></RoundedBox><mesh position={[0, 0.008, 0]}><boxGeometry args={[0.285, 0.012, 0.285]} /><meshStandardMaterial color="#111617" roughness={0.94} /></mesh><Beam args={[0.3, 0.035, 0.3]} position={[0, 0.022, 0]} color={color} radius={0.008} /><Beam args={[0.2, 0.055, 0.2]} position={[0, 0.06, 0]} color={color} radius={0.006} />{[[-0.105, -0.105], [0.105, -0.105], [-0.105, 0.105], [0.105, 0.105]].map(([bx, bz]) => <Bolt key={`${bx}-${bz}`} position={[bx, 0.048, bz]} />)}</group>
}

function WallAttachment({ config, color }: { config: PergolaConfig; color: string }) {
  const { width, depth, height } = config
  const backZ = -depth / 2
  return <group aria-label="Fali szerelőlemez és vízvető">
    <Beam args={[width + 0.06, 0.3, 0.035]} position={[0, height + 0.04, backZ - 0.105]} color={color} radius={0.006} />
    <mesh position={[0, height + 0.225, backZ - 0.015]} rotation={[-0.12, 0, 0]} castShadow>
      <boxGeometry args={[width + 0.08, 0.026, 0.32]} />
      <PowderCoat color={color} roughness={0.4} />
    </mesh>
    <mesh position={[0, height + 0.205, backZ + 0.135]}>
      <boxGeometry args={[width + 0.08, 0.075, 0.025]} />
      <PowderCoat color={color} />
    </mesh>
    {[-1, 1].map((side) => <group key={side} position={[side * (width / 2 - 0.18), height - 0.02, backZ - 0.065]}>
      <Beam args={[0.16, 0.34, 0.035]} position={[0, 0, -0.035]} color={color} radius={0.005} />
      <Beam args={[0.16, 0.035, 0.2]} position={[0, -0.15, 0.045]} color={color} radius={0.005} />
      <mesh position={[0, 0.07, -0.057]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.018, 0.018, 0.014, 12]} /><meshStandardMaterial color="#737b7d" metalness={0.88} roughness={0.24} /></mesh>
    </group>)}
  </group>
}

function ZipScreen({ length, height, open, color, wind }: { length: number; height: number; open: number; color: string; wind: boolean }) {
  const usableHeight = height - 0.32
  const fabric = useRef<THREE.Mesh>(null)
  const bar = useRef<THREE.Group>(null)
  const roll = useRef<THREE.Mesh>(null)
  const group = useRef<THREE.Group>(null)
  const current = useRef(open)
  const lastWindUpdate = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  useFrame(({ clock }, delta) => {
    const previous = current.current
    current.current = REDUCED ? open : THREE.MathUtils.damp(current.current, open, 8, delta)
    const fraction = Math.max(0.012, 1 - current.current / 100)
    const visibleHeight = usableHeight * fraction
    if (fabric.current) { fabric.current.scale.y = fraction; fabric.current.position.y = height - 0.28 - visibleHeight / 2 }
    if (bar.current) bar.current.position.y = height - 0.28 - visibleHeight
    if (roll.current) { const radius = 0.55 + current.current / 100 * 0.65; roll.current.scale.set(radius, 1, radius); roll.current.rotation.x = current.current * 0.12 }
    if (group.current) group.current.rotation.z = wind ? Math.sin(clock.elapsedTime * 1.6) * 0.0025 * fraction : 0
    if (Math.abs(previous - current.current) > 0.001 || Math.abs(current.current - open) > 0.02) { refreshShadows(gl); invalidate() }
    else if (wind && clock.elapsedTime - lastWindUpdate.current >= 1 / 30) { lastWindUpdate.current = clock.elapsedTime; invalidate() }
  })
  return <group ref={group}><Beam args={[length - 0.04, 0.17, 0.16]} position={[0, height - 0.19, 0]} color={color} radius={0.018} /><mesh ref={roll} position={[0, height - 0.19, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.065, 0.065, length - 0.2, 24]} /><meshStandardMaterial color="#616966" roughness={0.95} /></mesh><Beam args={[0.055, usableHeight, 0.095]} position={[-length / 2 + 0.055, usableHeight / 2 + 0.04, 0]} color={color} radius={0.007} /><Beam args={[0.055, usableHeight, 0.095]} position={[length / 2 - 0.055, usableHeight / 2 + 0.04, 0]} color={color} radius={0.007} /><mesh ref={fabric} position={[0, height - 0.28 - usableHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[length - 0.17, usableHeight, 0.009]} /><meshStandardMaterial color="#69716d" roughness={0.96} transparent opacity={0.9} side={THREE.DoubleSide} /></mesh><group ref={bar}><Beam args={[length - 0.11, 0.055, 0.065]} position={[0, 0, 0]} color={color} radius={0.008} /></group></group>
}

function GlassWall({ length, height, color, opened, onToggle }: { length: number; height: number; color: string; opened: boolean; onToggle: () => void }) {
  const usableHeight = height - 0.27
  const panelCount = Math.max(2, Math.round(length / 1.12))
  const panelWidth = (length - 0.12) / panelCount
  const panels = useRef<THREE.Group[]>([])
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  useFrame((_, delta) => {
    let moving = false
    panels.current.forEach((panel, index) => {
      if (!panel) return
      const base = -length / 2 + 0.06 + panelWidth * (index + 0.5)
      const target = base + (opened && index % 2 === 0 ? panelWidth * 0.88 : 0)
      if (Math.abs(panel.position.x - target) > 0.002) moving = true
      panel.position.x = REDUCED ? target : THREE.MathUtils.damp(panel.position.x, target, 7, delta)
    })
    if (moving) { refreshShadows(gl); invalidate() }
  })
  return <group onClick={(event) => { event.stopPropagation(); onToggle(); invalidate() }}>{Array.from({ length: panelCount }, (_, index) => {
    const x = -length / 2 + 0.06 + panelWidth * (index + 0.5)
    return <group key={index} ref={(node) => { if (node) panels.current[index] = node }} position={[x, 0, index % 2 ? 0.025 : 0]}><mesh position={[0, usableHeight / 2 + 0.1, 0]} renderOrder={2}><boxGeometry args={[panelWidth - 0.025, usableHeight - 0.08, 0.012]} /><meshPhysicalMaterial color="#b4cdd0" metalness={0.02} roughness={0.045} transparent opacity={0.3} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={2.1} depthWrite={false} side={THREE.DoubleSide} /></mesh><Beam args={[0.025, usableHeight, 0.045]} position={[-panelWidth / 2, usableHeight / 2 + 0.1, 0]} color={color} radius={0.004} />{index === 0 && <Beam args={[0.025, 0.31, 0.035]} position={[panelWidth / 2 - 0.1, 1.12, 0.065]} color="#8d9597" radius={0.008} />}</group>
  })}<Beam args={[length, 0.055, 0.12]} position={[0, 0.07, 0]} color={color} radius={0.006} /><Beam args={[length, 0.065, 0.11]} position={[0, height - 0.14, 0]} color={color} radius={0.006} /><mesh position={[0, 0.102, 0.035]}><boxGeometry args={[length - 0.08, 0.012, 0.018]} /><meshStandardMaterial color="#8b9293" metalness={0.85} roughness={0.26} /></mesh><Html position={[0, 0.3, 0.08]} center className="interaction-label" zIndexRange={[7, 0]}>{opened ? 'Üveg bezárása' : 'Üveg eltolása'}</Html></group>
}

function LouverWall({ length, height, color, opened, onToggle }: { length: number; height: number; color: string; opened: boolean; onToggle: () => void }) {
  const usableHeight = height - 0.28
  const slatCount = Math.floor(usableHeight / 0.15)
  const slats = useRef<THREE.Group[]>([])
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  useFrame((_, delta) => {
    let moving = false
    slats.current.forEach((slat) => {
      if (!slat) return
      const target = opened ? 1.25 : 0.25
      if (Math.abs(slat.rotation.x - target) > 0.002) moving = true
      slat.rotation.x = REDUCED ? target : THREE.MathUtils.damp(slat.rotation.x, target, 8, delta)
    })
    if (moving) { refreshShadows(gl); invalidate() }
  })
  return <group onClick={(event) => { event.stopPropagation(); onToggle(); invalidate() }}>{Array.from({ length: slatCount }, (_, index) => { const y = 0.16 + index * (usableHeight / slatCount); return <group key={index} ref={(node) => { if (node) slats.current[index] = node }} position={[0, y, 0]} rotation={[0.25, 0, 0]}><Beam args={[length - 0.12, 0.065, 0.105]} position={[0, 0, 0]} color={color} radius={0.02} /></group> })}<Beam args={[0.05, usableHeight, 0.07]} position={[-length / 2 + 0.05, usableHeight / 2 + 0.1, 0]} color={color} /><Beam args={[0.05, usableHeight, 0.07]} position={[length / 2 - 0.05, usableHeight / 2 + 0.1, 0]} color={color} /><Html position={[0, 0.3, 0.08]} center className="interaction-label" zIndexRange={[7, 0]}>{opened ? 'Lamellák zárása' : 'Lamellák döntése'}</Html></group>
}

function SidePlacement({ side, config, scene, color, onSelect, onSceneChange }: { side: SideKey; config: PergolaConfig; scene: SceneSettings; color: string; onSelect?: (side: SideKey) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const { width, depth, height, sides } = config
  if (config.mount === 'wall' && side === 'back') return null
  const isHorizontal = side === 'front' || side === 'back'
  const length = isHorizontal ? width : depth
  const position: [number, number, number] = side === 'front' ? [0, 0, depth / 2] : side === 'back' ? [0, 0, -depth / 2] : side === 'left' ? [-width / 2, 0, 0] : [width / 2, 0, 0]
  const type = sides[side]
  return <group position={position} rotation={[0, isHorizontal ? 0 : Math.PI / 2, 0]} onClick={(event) => { if (type === 'none') { event.stopPropagation(); onSelect?.(side) } }}>{type === 'zip' && <ZipScreen length={length} height={height} open={config.screenOpen} color={color} wind={scene.wind} />}{type === 'glass' && <GlassWall length={length} height={height} color={color} opened={scene.glassOpen} onToggle={() => onSceneChange({ glassOpen: !scene.glassOpen })} />}{type === 'louver' && <LouverWall length={length} height={height} color={color} opened={scene.wallLouverOpen} onToggle={() => onSceneChange({ wallLouverOpen: !scene.wallLouverOpen })} />}</group>
}

function DimensionGuides({ config }: { config: PergolaConfig }) {
  const { width, depth, height } = config
  const color = '#d8ff72'
  const cm = (value: number) => `${Math.round(value * 100)} cm`
  return <group><Line points={[[-width / 2, 0.06, depth / 2 + 0.55], [width / 2, 0.06, depth / 2 + 0.55]]} color={color} lineWidth={1.2} /><Line points={[[-width / 2, 0.06, depth / 2 + 0.42], [-width / 2, 0.06, depth / 2 + 0.68]]} color={color} /><Line points={[[width / 2, 0.06, depth / 2 + 0.42], [width / 2, 0.06, depth / 2 + 0.68]]} color={color} /><Html position={[0, 0.09, depth / 2 + 0.57]} center className="dimension-label" zIndexRange={[8, 0]}>{cm(width)}</Html><Line points={[[width / 2 + 0.55, 0.06, -depth / 2], [width / 2 + 0.55, 0.06, depth / 2]]} color={color} lineWidth={1.2} /><Html position={[width / 2 + 0.56, 0.09, 0]} center className="dimension-label" zIndexRange={[8, 0]}>{cm(depth)}</Html><Line points={[[-width / 2 - 0.35, 0.05, depth / 2], [-width / 2 - 0.35, height + 0.25, depth / 2]]} color={color} lineWidth={1.2} /><Html position={[-width / 2 - 0.35, height / 2, depth / 2]} center className="dimension-label" zIndexRange={[8, 0]}>{cm(height)}</Html></group>
}

function useAerofoilGeometry(width: number) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.095, 0)
    shape.bezierCurveTo(-0.085, 0.042, -0.025, 0.055, 0.055, 0.028)
    shape.bezierCurveTo(0.095, 0.012, 0.1, -0.008, 0.065, -0.024)
    shape.bezierCurveTo(0.005, -0.052, -0.065, -0.035, -0.095, 0)
    const result = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.2, width - 0.18), bevelEnabled: false, curveSegments: 16 })
    result.rotateY(Math.PI / 2)
    result.translate(-(width - 0.18) / 2, 0, 0)
    result.deleteAttribute('normal')
    result.deleteAttribute('uv')
    const smoothed = mergeVertices(result, 0.0001)
    smoothed.computeVertexNormals()
    result.dispose()
    return smoothed
  }, [width])
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

function LedStrip({ args, position, night }: { args: [number, number, number]; position: [number, number, number]; night: boolean }) {
  return <group position={position}><mesh><boxGeometry args={[args[0] + 0.018, args[1] + 0.014, args[2] + 0.014]} /><meshStandardMaterial color="#151a1c" metalness={0.5} roughness={0.35} /></mesh><mesh position={[0, -0.012, 0]}><boxGeometry args={args} /><meshStandardMaterial color="#ffe6bd" emissive="#ffc87a" emissiveIntensity={night ? 5 : 0.45} toneMapped={false} /></mesh></group>
}

const HOTSPOTS = {
  motor: { title: 'Csendes, rejtett motor', text: 'A lamellák vezérlése a gerendába integrált motorházban kap helyet.' },
  led: { title: 'Hangulatfény árnyalatokban', text: 'A periméter LED nem vakít, hanem a terasz anyagait emeli ki.' },
  drain: { title: 'Rejtett vízelvezetés az oszlopban', text: 'A víz a tetőpályából a gerendán, majd az oszlopon belül távozik.' },
  sensor: { title: 'Esőben automata védelem', text: 'A szenzorcsomag az eső érzékelésekor zárt lamellapozíciót ad.' },
  post: { title: 'Merev, pontos alapozás', text: 'A talplemez és a látható rögzítéspontok a stabil kivitelezést szolgálják.' },
}

function Hotspots({ config }: { config: PergolaConfig }) {
  const [active, setActive] = useState<keyof typeof HOTSPOTS | null>(null)
  const { width, depth, height } = config
  const points: { id: keyof typeof HOTSPOTS; position: [number, number, number] }[] = [
    { id: 'motor', position: [width / 2, height + 0.18, depth / 2 - 0.25] },
    { id: 'led', position: [-width / 2 + 0.2, height - 0.15, depth / 2 - 0.12] },
    { id: 'drain', position: [width / 2 - 0.09, 0.5, depth / 2 - 0.09] },
    { id: 'sensor', position: [-width / 2 + 0.2, height + 0.35, -depth / 2 + 0.2] },
    { id: 'post', position: [-width / 2 + 0.09, 0.15, depth / 2 - 0.09] },
  ]
  return <group>{points.map((point) => <group key={point.id} position={point.position}><Html center zIndexRange={[12, 0]}><button type="button" className={`hotspot ${active === point.id ? 'active' : ''}`} aria-label={HOTSPOTS[point.id].title} onClick={(event) => { event.stopPropagation(); setActive(active === point.id ? null : point.id) }}><span>+</span></button>{active === point.id && <div className="hotspot-card"><button type="button" aria-label="Előnykártya bezárása" onClick={() => setActive(null)}>×</button><strong>{HOTSPOTS[point.id].title}</strong><p>{HOTSPOTS[point.id].text}</p></div>}</Html></group>)}</group>
}

function Person({ config }: { config: PergolaConfig }) {
  const position: [number, number, number] = [-config.width / 2 + 0.68, 0.035, config.depth * 0.18]
  return <group><RealisticAsset url="/assets/models/scale_person/person.glb" position={position} height={1.8} rotation={0.28} /><Html position={[position[0], 1.94, position[2]]} center className="person-label">180 cm</Html></group>
}

function PergolaModel({ config, scene, onSideSelect, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; onSideSelect?: (side: SideKey) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const { width, depth, height, roof, mount } = config
  const { tenant } = useTenant()
  const color = getFrameColorHex(config, tenant.colors)
  const roofColor = config.frameColor === 'white' ? '#d4d6d1' : color
  const louverGroup = useRef<THREE.Group>(null)
  const model = useRef<THREE.Group>(null)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const geometry = useAerofoilGeometry(width)
  const postPositions: [number, number][] = mount === 'freestanding' ? [[-width / 2 + 0.09, -depth / 2 + 0.09], [width / 2 - 0.09, -depth / 2 + 0.09], [-width / 2 + 0.09, depth / 2 - 0.09], [width / 2 - 0.09, depth / 2 - 0.09]] : [[-width / 2 + 0.09, depth / 2 - 0.09], [width / 2 - 0.09, depth / 2 - 0.09]]
  if (width > 6) postPositions.push([0, depth / 2 - 0.09])
  const louverCount = Math.max(10, Math.floor(depth / 0.22))
  const rainProtection = scene.rain && config.sensors && roof !== 'fixed'
  const effectiveAngle = rainProtection ? 0 : config.louverAngle
  const openness = effectiveAngle / 90
  const fixedSeamCount = Math.max(2, Math.floor(depth / 0.65))
  const introStart = useRef(0)
  useFrame(({ clock }, delta) => {
    if (!introStart.current) introStart.current = clock.elapsedTime
    if (model.current) {
      model.current.scale.y = REDUCED ? 1 : THREE.MathUtils.damp(model.current.scale.y, 1, 6, delta)
      if (Math.abs(model.current.scale.y - 1) > 0.001) { refreshShadows(gl); invalidate() }
    }
    if (!louverGroup.current || roof === 'fixed') return
    const target = THREE.MathUtils.degToRad(roof === 'retractable' ? effectiveAngle * 0.18 : effectiveAngle)
    let moving = false
    louverGroup.current.children.forEach((child, index) => {
      const wave = REDUCED ? 1 : THREE.MathUtils.clamp((clock.elapsedTime - introStart.current - index * 0.045) / 1.25, 0, 1)
      const waveTarget = target * (wave * wave * (3 - 2 * wave))
      if (Math.abs(child.rotation.x + waveTarget) > 0.001 || wave < 1) moving = true
      const nextRotation = REDUCED ? -waveTarget : THREE.MathUtils.damp(child.rotation.x, -waveTarget, 8, delta)
      child.rotation.x = nextRotation
      if (roof === 'retractable') {
        const spacing = ((depth - 0.3) / louverCount) * (1 - openness * 0.84)
        const targetZ = -depth / 2 + 0.2 + index * spacing
        if (Math.abs(child.position.z - targetZ) > 0.001) moving = true
        const nextZ = REDUCED ? targetZ : THREE.MathUtils.damp(child.position.z, targetZ, 8, delta)
        child.position.z = nextZ
      }
    })
    if (moving) { refreshShadows(gl); invalidate() }
  })
  const night = scene.time === 'night'
  return <group ref={model} scale={[1, REDUCED ? 1 : 0.96, 1]}>{postPositions.map(([x, z], index) => <DetailedPost key={index} position={[x, z]} height={height} color={color} />)}<StructuralBeam args={[width + 0.1, 0.23, 0.19]} position={[0, height, depth / 2]} color={color} /><StructuralBeam args={[width + 0.1, 0.23, 0.19]} position={[0, height, -depth / 2]} color={color} /><StructuralBeam args={[0.19, 0.23, depth]} position={[-width / 2, height, 0]} color={color} /><StructuralBeam args={[0.19, 0.23, depth]} position={[width / 2, height, 0]} color={color} />
    <GutterChannel length={width - 0.18} position={[0, height + 0.04, depth / 2 - 0.105]} color={color} />
    <GutterChannel length={width - 0.18} position={[0, height + 0.04, -depth / 2 + 0.105]} color={color} />
    <GutterChannel length={depth - 0.2} position={[-width / 2 + 0.105, height + 0.04, 0]} rotation={Math.PI / 2} color={color} />
    <GutterChannel length={depth - 0.2} position={[width / 2 - 0.105, height + 0.04, 0]} rotation={Math.PI / 2} color={color} />
    {mount === 'wall' && <WallAttachment config={config} color={color} />}
    <group position={[0, height + 0.02, depth / 2 + 0.105]}><mesh><boxGeometry args={[width - 0.05, 0.12, 0.045]} /><PowderCoat color={color} /></mesh><mesh position={[0, -0.065, 0.025]}><boxGeometry args={[width - 0.08, 0.014, 0.075]} /><meshStandardMaterial color="#1c2426" metalness={0.5} roughness={0.4} /></mesh></group>
    <mesh position={[width / 2 - 0.09, 0.14, depth / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.08, 0.025, 8, 20, Math.PI / 2]} /><PowderCoat color={color} /></mesh>
    <RoundedBox args={[0.28, 0.19, 0.34]} position={[width / 2 - 0.02, height + 0.12, depth / 2 - 0.25]} radius={0.035} smoothness={4} castShadow><PowderCoat color={color} /></RoundedBox>
    <group position={[-width / 2 + 0.2, height + 0.32, -depth / 2 + 0.2]}><mesh><cylinderGeometry args={[0.045, 0.055, 0.12, 16]} /><meshStandardMaterial color="#31383a" metalness={0.5} roughness={0.35} /></mesh><mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.034, 16]} /><meshPhysicalMaterial color="#8aa0a4" roughness={0.1} clearcoat={1} /></mesh></group>
    <group ref={louverGroup}>{roof !== 'fixed' && Array.from({ length: louverCount }, (_, index) => { const z = -depth / 2 + 0.2 + index * ((depth - 0.3) / louverCount); return <group key={index} position={[0, height + 0.15, z]}><mesh geometry={geometry} castShadow receiveShadow><PowderCoat color={roofColor} roughness={0.38} /></mesh><mesh position={[0, -0.026, 0.078]}><boxGeometry args={[width - 0.22, 0.012, 0.014]} /><meshStandardMaterial color="#111718" roughness={0.92} /></mesh>{[-1, 1].map((side) => <mesh key={side} position={[side * (width / 2 - 0.085), 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.034, 0.034, 0.014, 12]} /><meshStandardMaterial color={roofColor} metalness={0.35} roughness={0.4} /></mesh>)}</group> })}</group>
    {roof === 'fixed' && <group><mesh position={[0, height + 0.14, 0]} castShadow receiveShadow><boxGeometry args={[width - 0.12, 0.09, depth - 0.12]} /><PowderCoat color={roofColor} /></mesh>{Array.from({ length: fixedSeamCount }, (_, index) => { const z = -depth / 2 + (index + 1) * depth / (fixedSeamCount + 1); return <Beam key={index} args={[width - 0.16, 0.018, 0.025]} position={[0, height + 0.192, z]} color={roofColor} radius={0.003} /> })}</group>}
    {(['front', 'back', 'left', 'right'] as SideKey[]).map((side) => <SidePlacement key={side} side={side} config={config} scene={scene} color={color} onSelect={onSideSelect} onSceneChange={onSceneChange} />)}
    {config.led && <group><LedStrip args={[width - 0.3, 0.018, 0.018]} position={[0, height - 0.15, depth / 2 - 0.12]} night={night} /><LedStrip args={[width - 0.3, 0.018, 0.018]} position={[0, height - 0.15, -depth / 2 + 0.12]} night={night} /><LedStrip args={[0.018, 0.018, depth - 0.3]} position={[-width / 2 + 0.12, height - 0.15, 0]} night={night} /><LedStrip args={[0.018, 0.018, depth - 0.3]} position={[width / 2 - 0.12, height - 0.15, 0]} night={night} />{night && <><pointLight position={[-width * 0.28, height - 0.4, 0]} color="#ffd099" intensity={20} distance={7} decay={2} /><pointLight position={[width * 0.28, height - 0.4, 0]} color="#ffd099" intensity={20} distance={7} decay={2} /></>}</group>}
    {Array.from({ length: config.heaters }, (_, index) => { const x = (index - (config.heaters - 1) / 2) * Math.min(1.4, width / Math.max(config.heaters, 1)); return <group key={index} position={[x, height - 0.3, -depth / 2 + 0.3]} rotation={[-0.25, 0, 0]}><RoundedBox args={[0.72, 0.1, 0.15]} radius={0.035} smoothness={4} castShadow><meshPhysicalMaterial color="#24292b" metalness={0.7} roughness={0.3} /></RoundedBox><mesh position={[0, -0.052, 0.015]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[0.6, 0.065]} /><meshStandardMaterial color="#f08b49" emissive="#f06f32" emissiveIntensity={night ? 3 : 0.15} toneMapped={false} /></mesh></group> })}
    {config.speakers && [-1, 1].map((direction) => <group key={direction} position={[direction * (width / 2 - 0.17), height - 0.38, depth / 2 - 0.17]} rotation={[Math.PI / 2, 0, 0]}><mesh><cylinderGeometry args={[0.082, 0.082, 0.065, 24]} /><meshStandardMaterial color="#1b2022" metalness={0.48} roughness={0.38} /></mesh><mesh position={[0, 0.035, 0]}><cylinderGeometry args={[0.065, 0.065, 0.004, 24]} /><meshStandardMaterial color="#080b0c" roughness={0.85} /></mesh></group>)}
    {scene.showDimensions && <DimensionGuides config={config} />}{scene.showPerson && <OptionalSceneAsset name="180 cm reference person"><Person config={config} /></OptionalSceneAsset>}{scene.showHotspots && <Hotspots config={config} />}
  </group>
}

type ArchitecturalAsset = THREE.Group & { dispose: () => Promise<void> }
type ArchitecturalModule = { createAsset: (namespace: typeof THREE, options: { states: 'lazy' }) => Promise<ArchitecturalAsset> }

const houseAssetPath = '/assets/models/cedar_zinc_house/asset.mjs'
// Native browser import: the asset and its relative resources intentionally stay
// in public/. Vite must not rewrite this runtime module request in dev mode.
const importPublicModule = new Function('path', 'return import(path)') as (path: string) => Promise<ArchitecturalModule>
let houseAssetPromise: Promise<ArchitecturalAsset> | null = null
function getHouseAsset() {
  if (!houseAssetPromise) {
    houseAssetPromise = importPublicModule(houseAssetPath)
      .then((module) => module.createAsset(THREE, { states: 'lazy' }))
      .catch((error) => { houseAssetPromise = null; throw error })
  }
  return houseAssetPromise
}

function getHouseLayout(config: PergolaConfig) {
  const frontZ = config.mount === 'wall' ? -config.depth / 2 - 0.095 : -config.depth / 2 - 4.6
  const width = Math.max(17, config.width + 6)
  const scale = width / 18.22
  return { frontZ, width, scale, depth: 6.79 * scale }
}

function House({ config, night }: { config: PergolaConfig; night: boolean }) {
  const source = use(getHouseAsset())
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const layout = getHouseLayout(config)
  const prepared = useMemo(() => {
    const object = source.clone(true)
    const materials = new Set<THREE.Material>()
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material]
      meshMaterials.forEach((material) => {
        if (materials.has(material) || !(material instanceof THREE.MeshStandardMaterial)) return
        materials.add(material)
        const isGlass = /glass/i.test(material.name)
        const isRoof = /roof|zinc|standing_seam/i.test(`${child.name} ${material.name}`)
        material.envMapIntensity = isGlass ? 1.2 : isRoof ? 0.66 : 0.72
        if (isRoof) {
          material.color.set('#697276')
          material.metalness = 0.78
          material.roughness = 0.42
        }
        if (isGlass && material instanceof THREE.MeshPhysicalMaterial) {
          material.transmission = 0
          material.transparent = true
          material.opacity = /privacy/i.test(material.name) ? 0.68 : 0.38
          material.roughness = 0.08
          material.depthWrite = false
        }
      })
    })
    object.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    return { object, center, minY: box.min.y, front: box.max.z }
  }, [source])
  useEffect(() => {
    const materials = new Set<THREE.Material>()
    prepared.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material]
      meshMaterials.forEach((material) => {
        if (materials.has(material) || !(material instanceof THREE.MeshStandardMaterial) || !/glass/i.test(material.name)) return
        materials.add(material)
        material.emissive.set(night ? '#b8733f' : '#000000')
        material.emissiveIntensity = night ? 0.48 : 0
      })
    })
    refreshShadows(gl)
    invalidate()
  }, [night, prepared, invalidate, gl])
  const baseZ = layout.frontZ - (prepared.front - prepared.center.z) * layout.scale
  return <group>
    <group position={[0, 0, baseZ]} scale={layout.scale}>
      <primitive object={prepared.object} position={[-prepared.center.x, -prepared.minY, -prepared.center.z]} />
      <group position={[-5.2 - prepared.center.x, 6.15 - prepared.minY, -0.48 - prepared.center.z]}>
        <mesh castShadow receiveShadow><boxGeometry args={[0.62, 1.65, 0.68]} /><meshStandardMaterial color="#64645f" roughness={0.9} /></mesh>
        <mesh position={[0, 0.88, 0]} castShadow><boxGeometry args={[0.78, 0.12, 0.84]} /><meshStandardMaterial color="#333b3e" metalness={0.62} roughness={0.38} /></mesh>
        <mesh position={[0, 0.96, 0]}><boxGeometry args={[0.42, 0.035, 0.46]} /><meshStandardMaterial color="#13191b" roughness={0.8} /></mesh>
      </group>
    </group>
    {night && <><pointLight position={[0, 1.9, layout.frontZ + 0.7]} color="#ffd09a" intensity={7} distance={5.5} decay={2} /><pointLight position={[layout.width * 0.32, 1.7, layout.frontZ + 0.45]} color="#ffc382" intensity={4} distance={4} decay={2} /></>}
  </group>
}

function PlantPot({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <RealisticAsset url="/assets/models/potted_plant_02/model.gltf" position={position} height={0.92 * scale} rotation={position[0] * 0.7} />
}

function Furniture({ config }: { config: PergolaConfig }) {
  if (config.width < 3.2 || config.depth < 3) return null
  const sofaWidth = Math.min(2.65, config.width * 0.56)
  const cushionWidth = (sofaWidth - 0.24) / 3
  return <group position={[0, 0, -config.depth * 0.17]}><RoundedBox args={[sofaWidth + 0.85, 0.018, 2.35]} position={[0, 0.018, 0.48]} radius={0.025} smoothness={2} receiveShadow><meshStandardMaterial color="#8c887d" roughness={1} /></RoundedBox><group position={[0, 0, -0.28]}><RoundedBox args={[sofaWidth, 0.22, 0.83]} position={[0, 0.29, 0]} radius={0.065} smoothness={4} castShadow receiveShadow><meshStandardMaterial color="#5c5b55" roughness={0.96} /></RoundedBox>{[-1, 0, 1].map((index) => <group key={index}><RoundedBox args={[cushionWidth - 0.025, 0.18, 0.71]} position={[index * cushionWidth, 0.48, 0.035]} radius={0.075} smoothness={5} castShadow><meshStandardMaterial color={index === 0 ? '#aaa397' : '#b8b1a5'} roughness={0.98} /></RoundedBox><RoundedBox args={[cushionWidth - 0.035, 0.48, 0.2]} position={[index * cushionWidth, 0.77, -0.33]} rotation={[-0.13, 0, 0]} radius={0.075} smoothness={5} castShadow><meshStandardMaterial color={index === 1 ? '#9e998f' : '#b5afa4'} roughness={0.98} /></RoundedBox></group>)}{[-1, 1].map((side) => <RoundedBox key={side} args={[0.16, 0.38, 0.84]} position={[side * (sofaWidth / 2 - 0.06), 0.49, 0]} radius={0.055} smoothness={4} castShadow><meshStandardMaterial color="#66645d" roughness={0.96} /></RoundedBox>)}</group><RealisticAsset url="/assets/models/modern_coffee_table_01/model.gltf" position={[0, 0.03, 0.98]} height={0.46} rotation={Math.PI / 2} /><PlantPot position={[sofaWidth / 2 + 0.55, 0.02, -0.25]} scale={0.85} /></group>
}

function Deck({ config }: { config: PergolaConfig }) {
  const wood = usePBR('oak_wood_planks', [3.5, 0.7])
  const width = config.width + (config.mount === 'wall' ? 2.2 : 1.1)
  const depth = config.depth + 1.2
  const planks = Math.ceil(depth / 0.145)
  return <group position={[0, -0.035, 0.2]}>{Array.from({ length: planks }, (_, index) => { const z = -depth / 2 + (index + 0.5) * depth / planks; return <mesh key={index} position={[0, 0, z]} receiveShadow castShadow><boxGeometry args={[width, 0.065, depth / planks - 0.009]} /><meshStandardMaterial map={wood.diff} normalMap={wood.normal} normalScale={[0.38, 0.38]} roughnessMap={wood.rough} color={index % 4 === 0 ? '#bbb1a3' : '#d0c6b8'} roughness={0.78} /></mesh> })}</group>
}

function Tree({ position, scale = 1, wind }: { position: [number, number, number]; scale?: number; wind: boolean }) {
  const group = useRef<THREE.Group>(null)
  const lastUpdate = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  useFrame(({ clock }) => { if (group.current) { group.current.rotation.z = wind ? Math.sin(clock.elapsedTime * 0.65 + position[0]) * 0.004 : 0; if (wind && clock.elapsedTime - lastUpdate.current >= 1 / 30) { lastUpdate.current = clock.elapsedTime; invalidate() } } })
  return <group ref={group}><RealisticAsset url="/assets/models/tree_small_02/optimized.gltf" position={position} height={4.8 * scale} rotation={position[0] * 0.43} shadows={false} /></group>
}

function Garden({ config, scene, quality }: { config: PergolaConfig; scene: SceneSettings; quality: QualityLevel }) {
  const house = getHouseLayout(config)
  const sideX = house.width / 2 + 2.1
  const rearZ = house.frontZ - house.depth - 0.85
  return <group>
    <Tree position={[-sideX, -0.05, house.frontZ - 1.5]} scale={1.12} wind={scene.wind} />
    <Tree position={[sideX, -0.05, house.frontZ - 2.1]} scale={1.28} wind={scene.wind} />
    {quality !== 'mobile' && <Tree position={[sideX + 1.4, -0.05, 4.6]} scale={0.86} wind={scene.wind} />}
    {[-0.32, 0, 0.32].map((fraction, index) => <RealisticAsset key={fraction} url="/assets/models/shrub_04/model.gltf" position={[house.width * fraction, -0.04, rearZ]} height={0.95 + index * 0.08} rotation={index * 0.8} shadows={false} />)}
    <PlantPot position={[-config.width / 2 - 0.75, 0.01, config.depth / 2]} scale={1.25} />
    <PlantPot position={[config.width / 2 + 0.8, 0.01, -config.depth / 2]} scale={1.05} />
  </group>
}

function FenceLine({ x, fromZ, toZ }: { x: number; fromZ: number; toZ: number }) {
  const geometry = useMemo(() => {
    const count = Math.max(2, Math.floor(Math.abs(toZ - fromZ) / 0.24))
    const parts: THREE.BoxGeometry[] = []
    for (let index = 0; index < count; index++) {
      const z = fromZ + (toZ - fromZ) * (index / Math.max(1, count - 1))
      const part = new THREE.BoxGeometry(0.075, 1.06, 0.075)
      part.translate(0, 0.53, z)
      parts.push(part)
    }
    const merged = mergeGeometries(parts, false)
    parts.forEach((part) => part.dispose())
    if (!merged) throw new Error('A kerítésgeometria nem hozható létre.')
    return merged
  }, [fromZ, toZ])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group><mesh geometry={geometry} position={[x, 0, 0]} castShadow receiveShadow><meshStandardMaterial color="#8c8575" roughness={0.9} /></mesh>{[0.35, 0.82].map((y) => <mesh key={y} position={[x, y, (fromZ + toZ) / 2]} castShadow><boxGeometry args={[0.065, 0.075, Math.abs(toZ - fromZ) + 0.1]} /><meshStandardMaterial color="#777264" roughness={0.9} /></mesh>)}</group>
}

function Neighborhood({ config, scene }: { config: PergolaConfig; scene: SceneSettings }) {
  const house = getHouseLayout(config)
  const boundary = house.width / 2 + 1.05
  const night = scene.time === 'night'
  return <group>
    <mesh position={[0, -0.045, 12.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[46, 5.4]} /><meshStandardMaterial color="#3f4648" roughness={0.94} /></mesh>
    <mesh position={[0, -0.005, 9.25]} receiveShadow><boxGeometry args={[46, 0.09, 1.25]} /><meshStandardMaterial color="#aaa99f" roughness={0.96} /></mesh>
    <mesh position={[0, 0.025, 9.92]} receiveShadow><boxGeometry args={[46, 0.14, 0.16]} /><meshStandardMaterial color="#c2c0b4" roughness={0.9} /></mesh>
    {Array.from({ length: 7 }, (_, index) => <mesh key={index} position={[0, 0.005, 3.2 + index * 0.82]} receiveShadow><boxGeometry args={[1.15, 0.055, 0.68]} /><meshStandardMaterial color={index % 2 ? '#b8b3a6' : '#c4bfb2'} roughness={0.94} /></mesh>)}
    <FenceLine x={-boundary} fromZ={house.frontZ - house.depth + 0.4} toZ={8.55} />
    <FenceLine x={boundary} fromZ={house.frontZ - house.depth + 0.4} toZ={8.55} />
    {[-12.2, 12.2].map((x) => <group key={x} position={[x, 0, 9.05]}><mesh position={[0, 1.65, 0]} castShadow><cylinderGeometry args={[0.045, 0.065, 3.3, 10]} /><meshStandardMaterial color="#303a3d" metalness={0.55} roughness={0.42} /></mesh><mesh position={[0, 3.28, 0]}><boxGeometry args={[0.34, 0.12, 0.34]} /><meshStandardMaterial color="#ffe0aa" emissive="#ffc576" emissiveIntensity={night ? 3.2 : 0.08} /></mesh>{night && <pointLight position={[0, 3.05, 0]} color="#ffd09a" intensity={5} distance={5} decay={2} />}</group>)}
  </group>
}

function Ground({ scene }: { scene: SceneSettings }) {
  const grass = useMemo(() => {
    const binary = window.atob(EMBEDDED_GRASS_RGBA)
    const pixels = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) pixels[index] = binary.charCodeAt(index)
    const texture = new THREE.DataTexture(pixels, EMBEDDED_GRASS_SIZE, EMBEDDED_GRASS_SIZE, THREE.RGBAFormat)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(14, 14)
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 8
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }, [])
  useEffect(() => () => grass.dispose(), [grass])
  return <mesh name="essential-grass-ground" rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.075, 0]} receiveShadow>
    <planeGeometry args={[46, 46]} />
    <meshStandardMaterial map={grass} roughness={0.96} color={scene.time === 'night' ? '#7d887b' : '#c2c9b7'} />
  </mesh>
}

function Stars() {
  const positions = useMemo(() => { const array = new Float32Array(360 * 3); for (let i = 0; i < 360; i++) { const angle = i * 2.399; const radius = 18 + (i % 17); array[i * 3] = Math.sin(angle) * radius; array[i * 3 + 1] = 8 + (i % 13) * 0.8; array[i * 3 + 2] = Math.cos(angle) * radius } return array }, [])
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#dce8ef" size={0.07} transparent opacity={0.8} sizeAttenuation depthWrite={false} /></points>
}

function Rain({ config, quality }: { config: PergolaConfig; quality: QualityLevel }) {
  const count = quality === 'mobile' ? 180 : quality === 'ultra' ? 650 : 320
  const points = useRef<THREE.Points>(null)
  const splashes = useRef<THREE.Group>(null)
  const resetCycle = useRef(0)
  const lastUpdate = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  const positions = useMemo(() => { const array = new Float32Array(count * 3); for (let i = 0; i < count; i++) { array[i * 3] = (seeded(i, 11) - 0.5) * 16; array[i * 3 + 1] = seeded(i, 12) * 9; array[i * 3 + 2] = (seeded(i, 13) - 0.5) * 14 } return array }, [count])
  useFrame(({ clock }) => {
    if (REDUCED) return
    const elapsed = clock.elapsedTime
    if (elapsed - lastUpdate.current < 1 / 30) return
    const delta = Math.min(0.1, elapsed - lastUpdate.current)
    lastUpdate.current = elapsed
    if (points.current) {
      const attribute = points.current.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < count; i++) {
        let x = attribute.getX(i); let y = attribute.getY(i) - delta * 8.5; const z = attribute.getZ(i)
        const underRoof = Math.abs(x) < config.width / 2 && Math.abs(z) < config.depth / 2
        const floor = underRoof ? config.height + 0.25 : 0.03
        if (y < floor) { y = 7 + seeded(i + resetCycle.current * count, 14) * 3; x = (seeded(i + resetCycle.current * count, 15) - 0.5) * 16; attribute.setX(i, x) }
        attribute.setY(i, y)
      }
      attribute.needsUpdate = true
      resetCycle.current += 1
    }
    if (splashes.current) splashes.current.children.forEach((child, index) => { const phase = (performance.now() * 0.0018 + index * 0.17) % 1; child.scale.setScalar(0.25 + phase * 1.8); child.position.y = 0.025; const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial; material.opacity = (1 - phase) * 0.32 })
    invalidate()
  })
  return <group><points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#c3d7df" size={0.038} transparent opacity={0.72} depthWrite={false} /></points><group ref={splashes}>{Array.from({ length: 18 }, (_, index) => <mesh key={index} position={[((index * 1.73) % 8) - 4, 0.025, ((index * 2.37) % 6) - 3]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.025, 0.038, 12]} /><meshBasicMaterial color="#d5e5e9" transparent opacity={0.3} depthWrite={false} /></mesh>)}</group><mesh position={[config.width / 2 - 0.02, 0.25, config.depth / 2 + 0.04]}><sphereGeometry args={[0.018, 8, 6]} /><meshPhysicalMaterial color="#b7d2dc" transmission={0.6} roughness={0.05} /></mesh></group>
}

function CameraController({ view, config, autoRotate }: { view: CameraView; config: PergolaConfig; autoRotate: boolean }) {
  const { camera, gl, invalidate } = useThree()
  const controls = useRef<OrbitControlsType>(null)
  const destination = useRef(new THREE.Vector3(12, 7, 14))
  const target = useRef(new THREE.Vector3())
  const transitioning = useRef(true)
  const idle = useRef(0)
  const autoFrame = useRef(0)
  const yaw = useRef(0)
  const pitch = useRef(0)

  useEffect(() => {
    const size = Math.max(config.width, config.depth)
    const eyeZ = -config.depth * 0.17 - 0.195
    const positions: Record<CameraView, [number, number, number]> = {
      perspective: [config.width * 1.3 + 3.4, config.height * 1.7 + 1.4, config.depth * 1.5 + config.width * 0.75 + 3],
      front: [0, config.height * 1.15, size * 2.65],
      top: [0.01, size * 2.2, 0.01],
      interior: [0, 0.72, config.depth * 0.18],
      detail: [config.width / 2 + 0.75, config.height + 0.45, config.depth / 2 + 0.85],
      sofa: [0, 1.18, eyeZ],
    }
    destination.current.set(...positions[view])
    if (view === 'sofa') target.current.set(0, 1.22, config.depth / 2 + 6)
    else if (view === 'detail') target.current.set(config.width / 2, config.height, config.depth / 2)
    else if (view === 'interior') target.current.set(0, config.height + 0.1, -config.depth / 2)
    else target.current.set(0, view === 'top' ? 0 : config.height * 0.42, 0)

    const perspectiveCamera = camera as THREE.PerspectiveCamera
    Object.assign(perspectiveCamera, { fov: view === 'sofa' ? (window.innerWidth < 820 ? 70 : 64) : (window.innerWidth < 820 ? 48 : 38) })
    perspectiveCamera.updateProjectionMatrix()
    if (view === 'sofa') {
      camera.position.copy(destination.current)
      camera.lookAt(target.current)
      camera.rotation.reorder('YXZ')
      yaw.current = camera.rotation.y
      pitch.current = camera.rotation.x
      controls.current?.target.copy(target.current)
      transitioning.current = false
    } else {
      if (window.innerWidth < 820 && view !== 'interior') destination.current.sub(target.current).multiplyScalar(1.45).add(target.current)
      transitioning.current = true
    }
    invalidate()
  }, [view, config.width, config.depth, config.height, camera, invalidate])

  useEffect(() => {
    if (view !== 'sofa') return
    const element = gl.domElement
    let dragging = false
    let previousX = 0
    let previousY = 0
    const renderLook = () => {
      pitch.current = THREE.MathUtils.clamp(pitch.current, -1.05, 1.05)
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
      invalidate()
    }
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      dragging = true
      previousX = event.clientX
      previousY = event.clientY
      element.setPointerCapture(event.pointerId)
      element.style.setProperty('cursor', 'grabbing')
      event.preventDefault()
    }
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return
      yaw.current -= (event.clientX - previousX) * 0.004
      pitch.current -= (event.clientY - previousY) * 0.003
      previousX = event.clientX
      previousY = event.clientY
      renderLook()
    }
    const pointerUp = (event: PointerEvent) => {
      dragging = false
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
      element.style.setProperty('cursor', 'grab')
    }
    const keyDown = (event: KeyboardEvent) => {
      const elementTarget = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(elementTarget.tagName)) return
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      event.preventDefault()
      if (event.key === 'ArrowLeft') yaw.current += 0.08
      if (event.key === 'ArrowRight') yaw.current -= 0.08
      if (event.key === 'ArrowUp') pitch.current += 0.06
      if (event.key === 'ArrowDown') pitch.current -= 0.06
      renderLook()
    }
    element.style.setProperty('cursor', 'grab')
    element.addEventListener('pointerdown', pointerDown)
    element.addEventListener('pointermove', pointerMove)
    element.addEventListener('pointerup', pointerUp)
    element.addEventListener('pointercancel', pointerUp)
    window.addEventListener('keydown', keyDown)
    return () => {
      element.style.removeProperty('cursor')
      element.removeEventListener('pointerdown', pointerDown)
      element.removeEventListener('pointermove', pointerMove)
      element.removeEventListener('pointerup', pointerUp)
      element.removeEventListener('pointercancel', pointerUp)
      window.removeEventListener('keydown', keyDown)
    }
  }, [view, camera, gl, invalidate])

  useFrame((_, delta) => {
    if (!controls.current || view === 'sofa') return
    idle.current += delta
    autoFrame.current += delta
    if (transitioning.current) {
      if (REDUCED) { camera.position.copy(destination.current); controls.current.target.copy(target.current); transitioning.current = false }
      else { const alpha = 1 - Math.exp(-delta * 3.7); camera.position.lerp(destination.current, alpha); controls.current.target.lerp(target.current, alpha); if (camera.position.distanceTo(destination.current) < 0.025) transitioning.current = false }
      camera.position.set(camera.position.x, Math.max(0.28, camera.position.y), camera.position.z)
      controls.current.update(); invalidate()
    } else if (autoRotate && idle.current > 2 && autoFrame.current >= 1 / 30) { autoFrame.current = 0; invalidate() }
  })
  return <OrbitControls ref={controls} makeDefault enabled={view !== 'sofa'} enableDamping dampingFactor={0.07} minDistance={1.1} maxDistance={24} maxPolarAngle={Math.PI / 1.98} autoRotate={autoRotate && view !== 'sofa'} autoRotateSpeed={0.4} onStart={() => { transitioning.current = false; idle.current = 0 }} />
}

function getLighting(scene: SceneSettings) {
  const t = scene.dayTime
  const night = t >= 20 || t < 7
  const golden = t >= 17 && t < 20
  const daylight = THREE.MathUtils.clamp(Math.sin(((t - 6) / 14) * Math.PI), 0, 1)
  const sunAngle = ((t - 6) / 14) * Math.PI
  return {
    night,
    hdr: night ? HDR_FILES.night : golden ? HDR_FILES.golden : HDR_FILES.day,
    fog: night ? '#17252e' : golden ? '#a69a90' : '#c3cdce',
    sun: night ? '#b5cff2' : golden ? '#ffe0bd' : '#ffffff',
    intensity: night ? 0.52 : 0.34 + daylight * 1.05,
    ambient: night ? 0.25 : 0.36 + daylight * 0.2,
    environment: night ? 0.68 : golden ? 0.9 : 1.02,
    exposure: night ? 0.96 : golden ? 0.9 : 0.92,
    position: [Math.cos(sunAngle) * 9, Math.max(0.8, Math.sin(sunAngle) * 10), 4] as [number, number, number],
  }
}

function ShadowBudget({ config }: { config: PergolaConfig }) {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    configureShadowBudget(gl)
  }, [gl, config])
  return null
}

function SceneContent({ config, scene, view, quality, coreOnly, onSideSelect, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; view: CameraView; quality: QualityLevel; coreOnly: boolean; onSideSelect?: (side: SideKey) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const lighting = getLighting(scene)
  useFrame(({ gl }) => { if (gl.toneMappingExposure !== lighting.exposure) gl.toneMappingExposure = lighting.exposure })
  const pergola = <group position={scene.photoMode ? [scene.photoX, scene.photoY, 0] : [0, 0, 0]} scale={scene.photoMode ? scene.photoScale : 1}><PergolaModel config={config} scene={scene} onSideSelect={onSideSelect} onSceneChange={onSceneChange} />{!scene.photoMode && !coreOnly && <OptionalSceneAsset name="terrace furniture"><Furniture config={config} /></OptionalSceneAsset>}</group>
  return <>
    <ShadowBudget config={config} />
    {!scene.photoMode && <fog attach="fog" args={[lighting.fog, 20, 43]} />}
    <ambientLight intensity={lighting.ambient} /><hemisphereLight args={['#c8d8e2', '#51483e', lighting.night ? 0.3 : 0.34]} /><directionalLight position={lighting.position} color={lighting.sun} intensity={lighting.intensity} castShadow shadow-mapSize={quality === 'mobile' ? [1024, 1024] : [2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-bias={-0.0001} shadow-normalBias={0.009} />
    {lighting.night && <><directionalLight position={[5, 6, 8]} color="#b7d5f2" intensity={1.05} /><directionalLight position={[-6, 4, -3]} color="#8fb5dc" intensity={0.62} /></>}
    {!coreOnly && <OptionalSceneAsset name={`${scene.time} HDR environment`}><Environment files={lighting.hdr} background={!scene.photoMode} backgroundBlurriness={0.1} backgroundIntensity={lighting.night ? 0.42 : 0.68} environmentIntensity={lighting.environment} environmentRotation={[0, Math.PI * 0.35, 0]} /></OptionalSceneAsset>}
    {!scene.photoMode && <Ground scene={scene} />}
    {!scene.photoMode && !coreOnly && <><OptionalSceneAsset name="terrace decking"><Deck config={config} /></OptionalSceneAsset><Neighborhood config={config} scene={scene} /><OptionalSceneAsset name="garden planting"><Garden config={config} scene={scene} quality={quality} /></OptionalSceneAsset><OptionalSceneAsset name="architectural house"><House config={config} night={lighting.night} /></OptionalSceneAsset>{lighting.night && <Stars />}</>}
    {pergola}
    {!scene.photoMode && <ContactShadows key={`${config.width}-${config.depth}-${config.height}-${config.mount}`} position={[0, 0.018, 0]} opacity={lighting.night ? 0.25 : 0.38} scale={Math.max(config.width, config.depth) + 3} blur={2.2} far={5} resolution={quality === 'mobile' ? 256 : 512} frames={1} color="#10171d" />}
    {scene.rain && <Rain config={config} quality={quality} />}
    <CameraController view={view} config={config} autoRotate={scene.autoRotate} />
  </>
}

function ScenePoster({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { progress } = useProgress()
  const failed = Boolean(onRetry)
  return <div className={`scene-poster${failed ? ' is-error' : ''}`} role={failed ? 'alert' : 'status'} aria-live="polite">
    {failed ? <img className="scene-poster-image" src="/assets/pergo-hero.webp" alt="Az ARDELIS PERGO pergola statikus előnézete" /> : <div className="poster-skeleton"><span /><span /><span /><span /></div>}
    <div className="branded-loader"><div className="loader-brand">ARDELIS <small>/ PERGO</small></div>{!failed && <div className="loader-track"><span style={{ width: `${Math.max(8, progress)}%` }} /></div>}<div className="loader-status"><span>{message ?? 'Építészeti jelenet előkészítése'}</span>{!failed && <strong>{Math.round(progress)}%</strong>}</div>{onRetry && <button type="button" className="scene-retry" onClick={onRetry}>3D újraindítása</button>}</div>
  </div>
}

class SceneErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void; onFatal: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    log.error('Pergola 3D render failed', { error: error.message, stack: error.stack, componentStack: info.componentStack })
    this.props.onFatal()
  }
  render() {
    if (this.state.failed) return <ScenePoster message="A 3D nézet nem indult el. A konfigurációd megmaradt." onRetry={this.props.onRetry} />
    return this.props.children
  }
}

function WebGLContextGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => {
      event.preventDefault()
      log.error('Pergola WebGL context lost')
      onLost()
    }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [gl, onLost])
  return null
}

function FirstFrameReady({ onReady }: { onReady: () => void }) {
  const reported = useRef(false)
  useFrame(() => {
    if (reported.current) return
    reported.current = true
    // useFrame runs before the renderer; the microtask runs after that frame.
    queueMicrotask(onReady)
  })
  return null
}

export default memo(function PergolaScene({ config, scene, view, onSideSelect, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; view: CameraView; onSideSelect?: (side: SideKey) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const [ready, setReady] = useState(false)
  const [decorativeReady, setDecorativeReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [contextLost, setContextLost] = useState(false)
  const [coreOnly, setCoreOnly] = useState(false)
  const automaticQuality: QualityLevel = window.innerWidth < 760 || /Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'high'
  const quality = scene.quality === 'auto' ? automaticQuality : scene.quality
  const onReady = useMemo(() => () => setReady(true), [])
  const onContextLost = useMemo(() => () => { setReady(false); setContextLost(true) }, [])
  const onFatal = useMemo(() => () => {
    if (coreOnly) return
    setCoreOnly(true)
    setReady(false)
    setDecorativeReady(false)
    setAttempt((value) => value + 1)
  }, [coreOnly])
  const retry = useMemo(() => () => {
    setCoreOnly(false)
    setReady(false)
    setDecorativeReady(false)
    setContextLost(false)
    setAttempt((value) => value + 1)
  }, [])
  useEffect(() => {
    if (!ready || decorativeReady || contextLost) return
    const timer = window.setTimeout(() => setDecorativeReady(true), 180)
    return () => window.clearTimeout(timer)
  }, [ready, decorativeReady, contextLost])
  const coreScene = coreOnly || !decorativeReady
  return <div className="scene-canvas-wrap" data-scene-ready={ready}>
    {!ready && !contextLost && <ScenePoster />}
    {contextLost && <ScenePoster message="A grafikai kapcsolat megszakadt. A konfigurációd megmaradt." onRetry={retry} />}
    <SceneErrorBoundary key={`boundary-${attempt}`} onRetry={retry} onFatal={onFatal}>
      <Canvas
        key={`canvas-${attempt}`}
        frameloop="demand"
        shadows
        dpr={quality === 'mobile' ? [1, 1.25] : quality === 'ultra' ? [1, 1.8] : [1, 1.5]}
        camera={{ position: [12, 7, 14], fov: window.innerWidth < 820 ? 48 : 38, near: 0.1, far: 90 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        performance={{ min: 0.55 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 0.88
          gl.shadowMap.autoUpdate = false
          refreshShadows(gl)
          gl.domElement.dataset.pergolaCanvas = 'true'
          gl.domElement.setAttribute('aria-label', 'Interaktív, valósághű 3D pergola. Forgatás egérrel vagy érintéssel.')
          gl.domElement.setAttribute('role', 'img')
        }}
      >
        <WebGLContextGuard onLost={onContextLost} />
        <Suspense fallback={null}>
          <SceneContent
            config={config}
            scene={coreScene ? { ...scene, showPerson: false } : scene}
            view={view}
            quality={quality}
            coreOnly={coreScene}
            onSideSelect={onSideSelect}
            onSceneChange={onSceneChange}
          />
        </Suspense>
        <FirstFrameReady onReady={onReady} />
      </Canvas>
    </SceneErrorBoundary>
  </div>
})
