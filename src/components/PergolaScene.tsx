import LamelixLogo from '@/components/LamelixLogo'
import { Component, Suspense, lazy, memo, use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { assetUrl } from '@/lib/assetUrl'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Html, Line, OrbitControls, RoundedBox, useEnvironment, useGLTF, useProgress, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import type { CameraFocus, CameraView, PergolaConfig, RoofGlazing, SceneSettings, SideKey, SideType } from '@/types/pergola'
import PhotoRig, { ShadowCatcher } from '@/components/PhotoRig'
import { PHOTO_GROUP } from '@/lib/photoScene'
import { QualityContext, detectQualityTier, lowerTier, readTierCap, tierRank, useQuality, qualitySettings, resolveQualityTier, writeTierCap, type QualitySettings, type QualityTier } from '@/lib/quality'
import { hasBackWall, isWallSide, postPositions as getPostPositions, sideWalls } from '@/lib/mount'
import { getFrameColorHex } from '@/lib/config'
import { setActiveScene, setHiResRenderer } from '@/lib/sceneRegistry'
import { useTenant } from '@/tenants/TenantContext'
import { EMBEDDED_GRASS_RGBA, EMBEDDED_GRASS_SIZE } from '@/lib/grassTexture'
import { log } from '@/lib/logger'
import { pbrPath } from '@/lib/textures'
import { sunVectorInScene } from '@/lib/sun'
import { studySun } from '@/lib/sunSite'
import type { ShadeResult } from '@/components/ShadeProbe'
import type { FurnitureSet } from '@/types/pergola'
import { kelvinToHex } from '@/lib/color'
import { glassPanels } from '@/lib/glass'
import { WOOD_HEXES } from '@/lib/colors'
import { boxProjectedGeometry, getBoardMaterial, getFacadeFinish, getFrameMaterial, type FacadeFinish } from '@/components/houseMaterials'
import { isOriginalCedar, wallColorHex } from '@/lib/house'
import { findShadeFabric } from '@/lib/roofShade'
import { sideSegments } from '@/lib/sides'
import { FAN_DIAMETER, FAN_DROP, fanLayout } from '@/lib/fans'
import { FURNITURE_SETS, furnitureFit } from '@/lib/furniture'
import HotTub from '@/components/HotTub'
import { getSpecCode } from '@/lib/specification'
import { effectiveGlazing, isGlazedRoof, isMovableRoof, roofRise } from '@/lib/roofs'
import { deckBounds } from '@/lib/deck'
import { SolarPanels } from '@/components/SceneExtras'

const SceneEffects = lazy(() => import('@/components/SceneEffects'))
const ShadeProbe = lazy(() => import('@/components/ShadeProbe'))
// ?effects=0 → utófeldolgozás kikapcsolva (hibakereséshez, gyenge géphez).
const EFFECTS_DISABLED = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('effects') === '0'

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
  day: assetUrl('/assets/hdr/day_clear.hdr'),
  golden: assetUrl('/assets/hdr/evening_museum_courtyard.hdr'),
  night: assetUrl('/assets/hdr/courtyard_night.hdr'),
} as const
/** Alacsony és közepes szinten (mobil) a 512×256-os égbolt elég a fényhez, és kb. negyedannyi letöltés. */
const smallHdr = (file: string) => file.replace(/\.hdr$/, '-512.hdr')
const wantsSmallHdr = (tier: string) => tier === 'low' || tier === 'medium'

type TextureMaps = { diff: THREE.Texture; normal: THREE.Texture; rough: THREE.Texture }

type SceneAssetBoundaryProps = { children: ReactNode; name: string; fallback?: ReactNode }
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
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children }
}

// Every decorative asset owns its Suspense boundary. A pending tree, HDR or
// texture must never suspend the structurally complete pergola beside it.
function OptionalSceneAsset({ name, children }: SceneAssetBoundaryProps) {
  return <SceneAssetBoundary name={name}><Suspense fallback={null}>{children}</Suspense></SceneAssetBoundary>
}

function usePBR(asset: string, repeat: [number, number], rotation = 0): TextureMaps {
  const [repeatX, repeatY] = repeat
  const { maxAnisotropy } = useQuality()
  const textures = useTexture({ diff: assetUrl(pbrPath(asset, 'diff')), normal: assetUrl(pbrPath(asset, 'nor_gl')), rough: assetUrl(pbrPath(asset, 'rough')) })
  const maps = useMemo(() => {
    const result = {} as TextureMaps
    ;(['diff', 'normal', 'rough'] as const).forEach((key) => {
      const texture = textures[key].clone()
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(repeatX, repeatY)
      if (rotation) { texture.center.set(0.5, 0.5); texture.rotation = rotation }
      texture.anisotropy = maxAnisotropy
      if (key === 'diff') texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
      result[key] = texture
    })
    return result
  }, [textures, repeatX, repeatY, rotation, maxAnisotropy])
  useEffect(() => () => Object.values(maps).forEach((texture) => texture.dispose()), [maps])
  return maps
}

type RealisticAssetProps = { url: string; position: [number, number, number]; height: number; rotation?: number; shadows?: boolean; bare?: boolean }
function RealisticAssetContent({ url, position, height, rotation = 0, shadows = true, bare = false }: RealisticAssetProps) {
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
  // Téli nézetben a lombhullató fa kopasz: a levél-hálók rejtve.
  useEffect(() => {
    prepared.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      if (materials.some((material) => /leaves|leaf/i.test(material.name))) child.visible = !bare
    })
    invalidate()
  }, [prepared, bare, invalidate])
  return <group position={position} rotation={[0, rotation, 0]} scale={prepared.scale}><primitive object={prepared.object} position={[-prepared.center.x, -prepared.minY, -prepared.center.z]} /></group>
}

function RealisticAsset(props: RealisticAssetProps) {
  return <SceneAssetBoundary name={props.url}><Suspense fallback={null}><RealisticAssetContent {...props} /></Suspense></SceneAssetBoundary>
}

let powderCoatTexture: THREE.DataTexture | null = null
/** A textúra átlagosan ~0,8-as világosságú: a fa színét ennyivel világosítjuk (kissé), hogy a minta tónusa stimmeljen. */
const lightenForWood = (hex: string) => `#${new THREE.Color(hex).multiplyScalar(1.1).getHexString()}`

function getPowderCoatTexture() {
  if (powderCoatTexture) return powderCoatTexture
  const size = 64
  const data = new Uint8Array(size * size * 4)
  for (let index = 0; index < size * size; index++) {
    const grain = Math.round(214 + seeded(index, 31) * 41)
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

/** Porszórt felület finom szemcséjű normáltérképe (128 px, procedurális): a csillanás megtörik, nem tükörsima. Megosztott, élethosszig tart. */
let grainNormal: THREE.DataTexture | null = null
function getGrainNormal() {
  if (grainNormal) return grainNormal
  const size = 128
  const height = new Float32Array(size * size)
  for (let index = 0; index < height.length; index++) height[index] = seeded(index, 57)
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (px: number, py: number) => height[((py + size) % size) * size + ((px + size) % size)]
    const dx = (at(x + 1, y) - at(x - 1, y)) * 0.9
    const dy = (at(x, y + 1) - at(x, y - 1)) * 0.9
    const length = Math.hypot(dx, dy, 1)
    const i = (y * size + x) * 4
    data[i] = Math.round((-dx / length * 0.5 + 0.5) * 255)
    data[i + 1] = Math.round((-dy / length * 0.5 + 0.5) * 255)
    data[i + 2] = Math.round((1 / length * 0.5 + 0.5) * 255)
    data[i + 3] = 255
  }
  grainNormal = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  grainNormal.wrapS = grainNormal.wrapT = THREE.RepeatWrapping
  grainNormal.repeat.set(14, 14)
  grainNormal.generateMipmaps = true
  grainNormal.minFilter = THREE.LinearMipmapLinearFilter
  grainNormal.anisotropy = 4
  grainNormal.needsUpdate = true
  return grainNormal
}

/** Fa hatású (szublimációs) bevonat: hosszanti erezet, a szín a textúrát tónusozza. */
let woodTexture: THREE.DataTexture | null = null
function getWoodTexture() {
  if (woodTexture) return woodTexture
  const width = 256
  const height = 64
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    // Évgyűrű-sávok: lassan hullámzó, eltérő vastagságú csíkok.
    const band = Math.sin(y * 0.55 + Math.sin(y * 0.13) * 2.2) * 0.5 + 0.5
    for (let x = 0; x < width; x++) {
      const wave = Math.sin((y + Math.sin(x * 0.045 + y * 0.2) * 3.5) * 0.9) * 0.5 + 0.5
      const fleck = seeded(y * width + x, 47)
      const value = Math.round(150 + band * 55 + wave * 35 + fleck * 15)
      const index = (y * width + x) * 4
      data[index] = Math.min(255, value + 8)
      data[index + 1] = value
      data[index + 2] = Math.max(0, value - 10)
      data[index + 3] = 255
    }
  }
  woodTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  woodTexture.colorSpace = THREE.SRGBColorSpace
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping
  woodTexture.repeat.set(2, 3)
  woodTexture.magFilter = THREE.LinearFilter
  woodTexture.needsUpdate = true
  return woodTexture
}

/** Közös, gyorsítótárazott anyagok: színenként és érdességenként egy példány (kevesebb anyag, egy helyen hangolható). */
const coatCache = new Map<string, THREE.MeshStandardMaterial>()
type MaterialDetail = 'basic' | 'enhanced' | 'ultra'
function getCoat(color: string, roughness: number, detail: MaterialDetail) {
  const key = `${color}|${roughness}|${detail}`
  let material = coatCache.get(key)
  if (!material) {
    const wood = WOOD_HEXES.has(color)
    // Gyengébb eszközön (low/medium) sima Standard anyag: gyorsabb shader-fordítás, kisebb GPU-terhelés.
    if (detail === 'basic') material = wood
      ? new THREE.MeshStandardMaterial({ color: lightenForWood(color), map: getWoodTexture(), metalness: 0.02, roughness: 0.6, envMapIntensity: 0.7 })
      : new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness, roughnessMap: getPowderCoatTexture(), envMapIntensity: 0.9 })
    else if (wood) material = new THREE.MeshPhysicalMaterial({ color: lightenForWood(color), map: getWoodTexture(), metalness: 0.02, roughness: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.7 })
    // Festett (porszórt) alumínium: fémes alap, vékony lakkréteg és finom szemcse — az éleken éles, valódi csillanás.
    else {
      const ultra = detail === 'ultra'
      material = new THREE.MeshPhysicalMaterial({
        color, metalness: ultra ? 0.62 : 0.5, roughness: Math.max(0.26, roughness * (ultra ? 0.82 : 0.9)), roughnessMap: getPowderCoatTexture(),
        normalMap: getGrainNormal(), normalScale: new THREE.Vector2(ultra ? 0.22 : 0.14, ultra ? 0.22 : 0.14),
        clearcoat: ultra ? 0.3 : 0.22, clearcoatRoughness: 0.24, specularIntensity: 1, envMapIntensity: ultra ? 1.1 : 1,
      })
    }
    coatCache.set(key, material)
  }
  return material
}

/**
 * Üveg: low/medium/high-on átlátszó (opacity) fizikai anyag ior 1.5-tel és vékony lakkal — olcsó és nem lassítja a jelenetet;
 * ultra szinten valódi transzmisszió (fénytörés a mögötte lévő jeleneten, vékony lemez: thickness 0.02).
 */
function GlassMaterial({ tint, opacity, envMapIntensity, doubleSided = false }: { tint: string; opacity: number; envMapIntensity: number; doubleSided?: boolean }) {
  const { materialDetail } = useQuality()
  const side = doubleSided ? THREE.DoubleSide : THREE.FrontSide
  if (materialDetail === 'ultra') return <meshPhysicalMaterial color={tint} metalness={0} roughness={0.08} transmission={0.92} thickness={0.02} ior={1.5} attenuationColor={tint} attenuationDistance={1.2} specularIntensity={1} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={envMapIntensity} side={side} />
  return <meshPhysicalMaterial color={tint} metalness={0.02} roughness={materialDetail === 'enhanced' ? 0.06 : 0.04} transparent opacity={opacity} ior={1.5} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={envMapIntensity} depthWrite={false} side={side} />
}

function PowderCoat({ color, roughness = 0.4 }: { color: string; roughness?: number }) {
  const { materialDetail } = useQuality()
  return <primitive object={getCoat(color, roughness, materialDetail)} attach="material" dispose={null} />
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

/** Oldalfali csatlakozó profil, vízvető és konzolok — a hátsó fali rögzítés tükörképe. */
function SideWallAttachment({ config, side, color }: { config: PergolaConfig; side: 'left' | 'right'; color: string }) {
  const { width, depth, height } = config
  const sx = side === 'left' ? -1 : 1
  return <group name={`side-wall-attachment-${side}`}>
    <Beam args={[0.035, 0.3, depth + 0.06]} position={[sx * (width / 2 + 0.105), height + 0.04, 0]} color={color} radius={0.006} />
    <mesh position={[sx * (width / 2 + 0.015), height + 0.225, 0]} rotation={[0, 0, -sx * 0.12]} castShadow>
      <boxGeometry args={[0.32, 0.026, depth + 0.08]} />
      <PowderCoat color={color} roughness={0.4} />
    </mesh>
    <mesh position={[sx * (width / 2 - 0.135), height + 0.205, 0]}>
      <boxGeometry args={[0.025, 0.075, depth + 0.08]} />
      <PowderCoat color={color} />
    </mesh>
    {[-1, 1].map((end) => <group key={end} position={[sx * (width / 2 + 0.065), height - 0.02, end * (depth / 2 - 0.18)]}>
      <Beam args={[0.035, 0.34, 0.16]} position={[sx * 0.035, 0, 0]} color={color} radius={0.005} />
      <Beam args={[0.2, 0.035, 0.16]} position={[-sx * 0.045, -0.15, 0]} color={color} radius={0.005} />
      <mesh position={[sx * 0.057, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.018, 0.018, 0.014, 12]} /><meshStandardMaterial color="#737b7d" metalness={0.88} roughness={0.24} /></mesh>
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

function GlassWall({ length, height, color, opened, onToggle, framed = false, label = true }: { length: number; height: number; color: string; opened: boolean; onToggle: () => void; framed?: boolean; label?: boolean }) {
  const usableHeight = height - 0.27
  const layout = glassPanels(length)
  const panelCount = layout.count
  const panelWidth = layout.width
  const panels = useRef<THREE.Group[]>([])
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  useFrame((_, delta) => {
    let moving = false
    panels.current.slice(0, panelCount).forEach((panel, index) => {
      if (!panel) return
      const target = layout.position(index, opened)
      if (Math.abs(panel.position.x - target) > 0.002) moving = true
      panel.position.x = REDUCED ? target : THREE.MathUtils.damp(panel.position.x, target, 7, delta)
    })
    if (moving) { refreshShadows(gl); invalidate() }
  })
  return <group onClick={(event) => { event.stopPropagation(); onToggle(); invalidate() }}>{Array.from({ length: panelCount }, (_, index) => {
    const x = -length / 2 + 0.06 + panelWidth * (index + 0.5)
    return <group key={index} ref={(node) => { if (node) panels.current[index] = node }} position={[x, 0, index % 2 ? 0.025 : 0]}><mesh position={[0, usableHeight / 2 + 0.1, 0]} renderOrder={2}><boxGeometry args={[panelWidth - 0.025, usableHeight - 0.08, 0.012]} /><meshPhysicalMaterial color="#b4cdd0" metalness={0.02} roughness={0.045} transparent opacity={0.3} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={2.1} depthWrite={false} side={THREE.DoubleSide} /></mesh>{framed ? <>
        {/* Keretes elem: körbefutó alumínium tok, középen vízszintes osztó. */}
        <Beam args={[0.05, usableHeight - 0.04, 0.05]} position={[-panelWidth / 2 + 0.025, usableHeight / 2 + 0.1, 0]} color={color} radius={0.006} />
        <Beam args={[0.05, usableHeight - 0.04, 0.05]} position={[panelWidth / 2 - 0.025, usableHeight / 2 + 0.1, 0]} color={color} radius={0.006} />
        <Beam args={[panelWidth - 0.03, 0.06, 0.05]} position={[0, 0.13, 0]} color={color} radius={0.006} />
        <Beam args={[panelWidth - 0.03, 0.05, 0.05]} position={[0, usableHeight + 0.07, 0]} color={color} radius={0.006} />
      </> : <Beam args={[0.025, usableHeight, 0.045]} position={[-panelWidth / 2, usableHeight / 2 + 0.1, 0]} color={color} radius={0.004} />}{index === 0 && <Beam args={[0.025, 0.31, 0.035]} position={[panelWidth / 2 - 0.1, 1.12, 0.065]} color="#8d9597" radius={0.008} />}</group>
  })}<Beam args={[length, 0.055, 0.12]} position={[0, 0.07, 0]} color={color} radius={0.006} /><Beam args={[length, 0.065, 0.11]} position={[0, height - 0.14, 0]} color={color} radius={0.006} /><mesh position={[0, 0.102, 0.035]}><boxGeometry args={[length - 0.08, 0.012, 0.018]} /><meshStandardMaterial color="#8b9293" metalness={0.85} roughness={0.26} /></mesh>{label && <Html position={[0, 0.3, 0.08]} center className="interaction-label" zIndexRange={[7, 0]}>{opened ? 'Üveg bezárása' : 'Üveg eltolása'}</Html>}</group>
}

function LouverWall({ length, height, color, opened, onToggle, label = true }: { length: number; height: number; color: string; opened: boolean; onToggle: () => void; label?: boolean }) {
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
  return <group onClick={(event) => { event.stopPropagation(); onToggle(); invalidate() }}>{Array.from({ length: slatCount }, (_, index) => { const y = 0.16 + index * (usableHeight / slatCount); return <group key={index} ref={(node) => { if (node) slats.current[index] = node }} position={[0, y, 0]} rotation={[0.25, 0, 0]}><Beam args={[length - 0.12, 0.065, 0.105]} position={[0, 0, 0]} color={color} radius={0.02} /></group> })}<Beam args={[0.05, usableHeight, 0.07]} position={[-length / 2 + 0.05, usableHeight / 2 + 0.1, 0]} color={color} /><Beam args={[0.05, usableHeight, 0.07]} position={[length / 2 - 0.05, usableHeight / 2 + 0.1, 0]} color={color} />{label && <Html position={[0, 0.3, 0.08]} center className="interaction-label" zIndexRange={[7, 0]}>{opened ? 'Lamellák zárása' : 'Lamellák döntése'}</Html>}</group>
}

/** Fix (nem nyitható) üvegfal: kb. 1,5 m-es táblák U-profilban, keskeny illesztéssel. */
function FixedGlassWall({ length, height, color }: { length: number; height: number; color: string }) {
  const usableHeight = height - 0.27
  const count = Math.max(1, Math.round((length - 0.1) / 1.5))
  const paneWidth = (length - 0.1) / count
  return <group>
    {Array.from({ length: count }, (_, index) => <mesh key={index} position={[-length / 2 + 0.05 + paneWidth * (index + 0.5), usableHeight / 2 + 0.1, 0]} renderOrder={2}><boxGeometry args={[paneWidth - 0.012, usableHeight - 0.04, 0.01]} /><GlassMaterial tint="#b9d0d2" opacity={0.26} envMapIntensity={2.1} doubleSided /></mesh>)}
    {Array.from({ length: count - 1 }, (_, index) => <mesh key={index} position={[-length / 2 + 0.05 + paneWidth * (index + 1), usableHeight / 2 + 0.1, 0]}><boxGeometry args={[0.008, usableHeight - 0.06, 0.016]} /><meshStandardMaterial color="#20282a" roughness={0.6} /></mesh>)}
    <Beam args={[length, 0.07, 0.07]} position={[0, 0.075, 0]} color={color} radius={0.006} />
    <Beam args={[length, 0.06, 0.07]} position={[0, height - 0.14, 0]} color={color} radius={0.006} />
    <Beam args={[0.04, usableHeight, 0.06]} position={[-length / 2 + 0.02, usableHeight / 2 + 0.1, 0]} color={color} radius={0.005} />
    <Beam args={[0.04, usableHeight, 0.06]} position={[length / 2 - 0.02, usableHeight / 2 + 0.1, 0]} color={color} radius={0.005} />
  </group>
}

const WOOD_TONES = ['#8d5b36', '#94613a', '#87552f', '#9a663e']

/** Fix lécfal: vízszintes alumínium vagy hőkezelt fa lécek, oldalt tartóprofil. */
function SlatWall({ length, height, color, wood }: { length: number; height: number; color: string; wood: boolean }) {
  const usableHeight = height - 0.3
  const pitch = wood ? 0.115 : 0.105
  const slatHeight = wood ? 0.095 : 0.08
  const count = Math.floor((usableHeight - 0.04) / pitch)
  const slatLength = length - 0.1
  return <group>
    {Array.from({ length: count }, (_, index) => <mesh key={index} position={[0, 0.12 + index * pitch + slatHeight / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[slatLength, slatHeight, wood ? 0.024 : 0.02]} />
      {wood ? <meshStandardMaterial color={WOOD_TONES[index % WOOD_TONES.length]} roughness={0.82} /> : <PowderCoat color={color} roughness={0.42} />}
    </mesh>)}
    <Beam args={[0.045, usableHeight, 0.05]} position={[-length / 2 + 0.03, usableHeight / 2 + 0.06, -0.025]} color={color} radius={0.005} />
    <Beam args={[0.045, usableHeight, 0.05]} position={[length / 2 - 0.03, usableHeight / 2 + 0.06, -0.025]} color={color} radius={0.005} />
  </group>
}

/** Félbe osztott oldal közepén függőleges osztóprofil (ahol nincs középoszlop). */
const MULLION = 0.06

function SideSegmentWall({ type, length, height, color, config, scene, onSceneChange, label }: { type: SideType; length: number; height: number; color: string; config: PergolaConfig; scene: SceneSettings; onSceneChange: (patch: Partial<SceneSettings>) => void; label: boolean }) {
  if (type === 'zip') return <ZipScreen length={length} height={height} open={config.screenOpen} color={color} wind={scene.wind} />
  if (type === 'glass' || type === 'glassFramed') return <GlassWall length={length} height={height} color={color} framed={type === 'glassFramed'} label={label} opened={scene.glassOpen} onToggle={() => onSceneChange({ glassOpen: !scene.glassOpen })} />
  if (type === 'glassFixed') return <FixedGlassWall length={length} height={height} color={color} />
  if (type === 'louver') return <LouverWall length={length} height={height} color={color} label={label} opened={scene.wallLouverOpen} onToggle={() => onSceneChange({ wallLouverOpen: !scene.wallLouverOpen })} />
  if (type === 'slatAlu' || type === 'slatWood') return <SlatWall length={length} height={height} color={color} wood={type === 'slatWood'} />
  return null
}

/** Új oldalelem felépülése: fentről lefelé „leereszkedik" (0,8 s, ease-out). Csak a kapcsolás pillanatában fut, közben nincs újrarenderelés. */
function BuildIn({ height, settled, children }: { height: number; settled: { current: boolean }; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const [animate] = useState(() => settled.current && !REDUCED)
  const t = useRef(animate ? 0 : 1)
  const { gl, invalidate } = useThree((state) => ({ gl: state.gl, invalidate: state.invalidate }))
  useFrame((_, delta) => {
    if (t.current >= 1 || !ref.current) return
    t.current = Math.min(1, t.current + Math.min(delta, 0.05) / 0.8)
    const eased = 1 - Math.pow(1 - t.current, 3)
    const scale = 0.02 + 0.98 * eased
    ref.current.scale.y = scale
    ref.current.position.y = height * (1 - scale)
    refreshShadows(gl)
    invalidate()
  })
  const start = animate ? 0.02 : 1
  return <group ref={ref} scale={[1, start, 1]} position={[0, height * (1 - start), 0]}>{children}</group>
}

/** Utólag felkerülő kiegészítő (fűtés, hangfal, ventilátor): felülről „beugrik” kis túllendüléssel. Első betöltéskor nem animál. */
function DropIn({ settled, dy = 0.45, children }: { settled: { current: boolean }; dy?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const [animate] = useState(() => settled.current && !REDUCED)
  const t = useRef(animate ? 0 : 1)
  const invalidate = useThree((state) => state.invalidate)
  useFrame((_, delta) => {
    if (t.current >= 1 || !ref.current) return
    t.current = Math.min(1, t.current + Math.min(delta, 0.05) / 0.75)
    const x = t.current - 1
    const back = 1 + 2.4 * x * x * x + 1.4 * x * x // easeOutBack
    ref.current.scale.setScalar(Math.max(0.01, back))
    ref.current.position.y = dy * (1 - back)
    invalidate()
  })
  return <group ref={ref} scale={animate ? 0.01 : 1} position={[0, animate ? dy : 0, 0]}>{children}</group>
}

/** LED-fény felkapcsolása: két gyors villanás, majd lágy felfutás (csak utólagos bekapcsoláskor). */
function LedRamp({ settled, children }: { settled: { current: boolean }; children: (factor: number) => ReactNode }) {
  const [animate] = useState(() => settled.current && !REDUCED)
  const [factor, setFactor] = useState(animate ? 0 : 1)
  const t = useRef(animate ? 0 : 1)
  const invalidate = useThree((state) => state.invalidate)
  useFrame((_, delta) => {
    if (t.current >= 1) return
    t.current = Math.min(1, t.current + Math.min(delta, 0.05) / 1.3)
    const u = t.current
    const flicker = u < 0.3 ? (Math.sin(u * 62) > 0.2 ? 0.7 : 0.05) : 1
    const ramp = u < 0.3 ? 1 : (u - 0.3) / 0.7
    setFactor(u >= 1 ? 1 : flicker * (u < 0.3 ? 0.5 : 0.5 + 0.5 * (1 - Math.pow(1 - ramp, 2))))
    invalidate()
  })
  return <>{children(factor)}</>
}

/** Dőlt tetőnél a zárt oldalfal fölött rögzített háromszög-kitöltés: az elülső magasságtól a ferde gerendáig. */
function GableInfill({ depth, height, rise, glassy, color }: { depth: number; height: number; rise: number; glassy: boolean; color: string }) {
  const geometry = useMemo(() => {
    const half = depth / 2 - 0.1
    const shape = new THREE.Shape()
    shape.moveTo(-half, 0); shape.lineTo(half, 0); shape.lineTo(half, rise * (2 * half) / depth + 0.02); shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false })
    geo.translate(0, 0, -0.0175)
    return geo
  }, [depth, rise])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={[0, height - 0.02, 0]} castShadow receiveShadow renderOrder={glassy ? 2 : 0}>
    {glassy ? <GlassMaterial tint="#cfe2e4" opacity={0.28} envMapIntensity={1.2} doubleSided /> : <PowderCoat color={color} />}
  </mesh>
}

function SidePlacement({ side, config, scene, color, onSelect, onSceneChange, labelled, settled }: { side: SideKey; settled: { current: boolean }; config: PergolaConfig; scene: SceneSettings; color: string; onSelect?: (side: SideKey) => void; onSceneChange: (patch: Partial<SceneSettings>) => void; labelled: Set<string> }) {
  const { width, depth } = config
  // Dőlt tetőnél a hátsó oldal magasabb (a tető hátsó éléig ér).
  const height = side === 'back' ? config.height + roofRise(config) : config.height
  if (isWallSide(config.mount, side)) return null
  const isHorizontal = side === 'front' || side === 'back'
  const length = isHorizontal ? width : depth
  const position: [number, number, number] = side === 'front' ? [0, 0, depth / 2] : side === 'back' ? [0, 0, -depth / 2] : side === 'left' ? [-width / 2, 0, 0] : [width / 2, 0, 0]
  const segments = sideSegments(config, side)
  const split = segments.length > 1
  // Elöl 6 m felett középoszlop áll: ott a fél-mezők az oszlophoz futnak, nincs külön osztóprofil.
  const midPost = side === 'front' && width > 6
  const gap = split ? (midPost ? 0.09 : MULLION / 2 + 0.005) : 0
  const allOpen = segments.every((segment) => segment.type === 'none')
  return <group position={position} rotation={[0, isHorizontal ? 0 : Math.PI / 2, 0]} onClick={(event) => { if (allOpen) { event.stopPropagation(); onSelect?.(side) } }}>
    {segments.map((segment, index) => {
      if (segment.type === 'none') return null
      const center = ((segment.from + segment.to) / 2) * length
      const segmentLength = length * (segment.to - segment.from) - gap
      const x = split ? center + Math.sign(center) * (gap / 2) : center
      // Mozgatható elemtípusonként csak az első kap feliratot (két egyforma félnél ne duplázódjon).
      const key = segment.type === 'glassFramed' ? 'glass' : segment.type
      const label = !labelled.has(key)
      if (label) labelled.add(key)
      return <group key={`${index}-${segment.type}`} position={[x, 0, 0]}><BuildIn height={height} settled={settled}><SideSegmentWall type={segment.type} length={segmentLength} height={height} color={color} config={config} scene={scene} onSceneChange={onSceneChange} label={label} /></BuildIn></group>
    })}
    {!isHorizontal && !allOpen && roofRise(config) > 0 && <GableInfill depth={depth} height={height} rise={roofRise(config)} glassy={segments.some((segment) => segment.type === 'glass' || segment.type === 'glassFramed' || segment.type === 'glassFixed')} color={color} />}
    {split && !midPost && <Beam args={[MULLION, height - 0.1, 0.09]} position={[0, (height - 0.1) / 2, 0]} color={color} radius={0.008} />}
  </group>
}

/** Mennyezeti ventilátor tartógerendával; bekapcsolva forog. */
function CeilingFans({ config, color, spinning }: { config: PergolaConfig; color: string; spinning: boolean }) {
  const layout = fanLayout(config)
  const rotors = useRef<(THREE.Group | null)[]>([])
  const speed = useRef(0)
  const pending = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  useFrame((_, delta) => {
    const target = spinning ? (REDUCED ? 2 : 9) : 0
    speed.current = THREE.MathUtils.damp(speed.current, target, 1.6, delta)
    if (speed.current < 0.01 && !spinning) { speed.current = 0; return }
    rotors.current.forEach((rotor) => { if (rotor) rotor.rotation.y += Math.min(delta, 0.1) * speed.current })
    // Legfeljebb ~30 képkocka/s: a forgás így is folyamatos, de nem terheli a GPU-t (mobil, akku).
    if (!pending.current) pending.current = window.setTimeout(() => { pending.current = 0; invalidate() }, 33)
  })
  useEffect(() => () => window.clearTimeout(pending.current), [])
  useEffect(() => { invalidate() }, [spinning, invalidate])
  const { width, depth, height } = config
  const beamBottom = height - 0.115
  const bladeY = beamBottom - FAN_DROP
  const radius = FAN_DIAMETER / 2
  return <group name="ceiling-fans">
    {layout.bars.map((bar, index) => <Beam key={index} args={bar.along === 'x' ? [width - 0.2, 0.1, 0.07] : [0.07, 0.1, depth - 0.2]} position={bar.along === 'x' ? [0, height - 0.06, bar.at] : [bar.at, height - 0.06, 0]} color={color} radius={0.008} />)}
    {layout.positions.map(([x, z], index) => <group key={index} position={[x, 0, z]}>
      <mesh position={[0, (beamBottom + 0.01 + bladeY) / 2 + 0.06, 0]}><cylinderGeometry args={[0.013, 0.013, beamBottom - bladeY - 0.1, 10]} /><PowderCoat color={color} /></mesh>
      <mesh position={[0, beamBottom - 0.02, 0]}><cylinderGeometry args={[0.05, 0.06, 0.05, 20]} /><PowderCoat color={color} /></mesh>
      <group ref={(node) => { rotors.current[index] = node }} position={[0, bladeY, 0]}>
        <mesh castShadow><cylinderGeometry args={[0.1, 0.085, 0.11, 28]} /><PowderCoat color={color} roughness={0.35} /></mesh>
        <mesh position={[0, -0.07, 0]}><sphereGeometry args={[0.07, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color="#efe9df" roughness={0.6} /></mesh>
        {[0, 1, 2].map((blade) => <group key={blade} rotation={[0, (blade * Math.PI * 2) / 3, 0]}>
          <mesh position={[radius / 2 + 0.06, -0.01, 0]} rotation={[0.12, 0, 0]} castShadow><boxGeometry args={[radius - 0.08, 0.012, 0.15]} /><meshStandardMaterial color="#6f4a2f" roughness={0.7} /></mesh>
        </group>)}
      </group>
    </group>)}
  </group>
}

function DimensionGuides({ config }: { config: PergolaConfig }) {
  const { width, depth, height } = config
  const color = '#d8ff72'
  const cm = (value: number) => `${Math.round(value * 100)} cm`
  const leftWall = isWallSide(config.mount, 'left')
  const rightWall = isWallSide(config.mount, 'right')
  // A mélységvonal a falmentes oldalra kerül; fülkében a pergola alá.
  const depthX = !rightWall ? width / 2 + 0.55 : !leftWall ? -width / 2 - 0.55 : width / 2 - 0.45
  // A magasságvonal az elülső, falmentes sarokhoz kerül.
  const heightX = !leftWall ? -width / 2 - 0.35 : !rightWall ? width / 2 + 0.35 : -width / 2 + 0.35
  const heightZ = leftWall && rightWall ? depth / 2 + 0.3 : depth / 2
  return <group><Line points={[[-width / 2, 0.06, depth / 2 + 0.55], [width / 2, 0.06, depth / 2 + 0.55]]} color={color} lineWidth={1.2} /><Line points={[[-width / 2, 0.06, depth / 2 + 0.42], [-width / 2, 0.06, depth / 2 + 0.68]]} color={color} /><Line points={[[width / 2, 0.06, depth / 2 + 0.42], [width / 2, 0.06, depth / 2 + 0.68]]} color={color} /><Html position={[0, 0.09, depth / 2 + 0.57]} center className="dimension-label" zIndexRange={[8, 0]}>{cm(width)}</Html><Line points={[[depthX, 0.06, -depth / 2], [depthX, 0.06, depth / 2]]} color={color} lineWidth={1.2} /><Html position={[depthX + Math.sign(depthX) * 0.01, 0.09, 0]} center className="dimension-label" zIndexRange={[8, 0]}>{cm(depth)}</Html><Line points={[[heightX, 0.05, heightZ], [heightX, height + 0.25, heightZ]]} color={color} lineWidth={1.2} /><Html position={[heightX, height / 2, heightZ]} center className="dimension-label" zIndexRange={[8, 0]}>{cm(height)}</Html></group>
}

/**
 * A lamellák egyetlen InstancedMesh-ként: a penge, az alsó tömítősáv és a két végi csapágybetét 1-1 draw call
 * (korábban lamellánként 4 külön mesh és anyag). A forgás és az eltolódás a korábbi csillapított animációt követi.
 */
const LOUVER_STRIP = new THREE.Matrix4().makeTranslation(0, -0.026, 0.078)
function LouverBlades({ geometry, width, depth, height, count, retractable, angle, color }: { geometry: THREE.BufferGeometry; width: number; depth: number; height: number; count: number; retractable: boolean; angle: number; color: string }) {
  const { louvreSegments } = useQuality()
  const blades = useRef<THREE.InstancedMesh>(null)
  const strips = useRef<THREE.InstancedMesh>(null)
  const caps = useRef<THREE.InstancedMesh>(null)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const introStart = useRef(0)
  const state = useMemo(() => ({ rotation: new Float32Array(count), z: Float32Array.from({ length: count }, (_, index) => -depth / 2 + 0.2 + index * ((depth - 0.3) / count)) }), [count, depth])
  const tools = useMemo(() => ({ base: new THREE.Matrix4(), part: new THREE.Matrix4(), position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: new THREE.Vector3(1, 1, 1), axisX: new THREE.Vector3(1, 0, 0), caps: [-1, 1].map((side) => new THREE.Matrix4().makeTranslation(side * (width / 2 - 0.085), 0, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2))) }), [width])
  const write = useCallback(() => {
    if (!blades.current || !strips.current || !caps.current) return
    const { base, part, position, quaternion, scale, axisX } = tools
    for (let index = 0; index < count; index++) {
      position.set(0, height + 0.15, state.z[index])
      quaternion.setFromAxisAngle(axisX, state.rotation[index])
      base.compose(position, quaternion, scale)
      blades.current.setMatrixAt(index, base)
      strips.current.setMatrixAt(index, part.multiplyMatrices(base, LOUVER_STRIP))
      tools.caps.forEach((cap, side) => caps.current!.setMatrixAt(index * 2 + side, part.multiplyMatrices(base, cap)))
    }
    blades.current.instanceMatrix.needsUpdate = true
    strips.current.instanceMatrix.needsUpdate = true
    caps.current.instanceMatrix.needsUpdate = true
  }, [count, height, state, tools])
  // A geometria cseréje (szélesség/minőség) NEM építi újra a példányokat (primitive attach), a mátrixok megmaradnak; a write() így is lefut minden méretváltásnál.
  useLayoutEffect(() => { write(); refreshShadows(gl); invalidate() }, [write, geometry, gl, invalidate])
  useFrame(({ clock }, delta) => {
    if (!introStart.current) introStart.current = clock.elapsedTime
    const openness = angle / 90
    const target = THREE.MathUtils.degToRad(retractable ? angle * 0.18 : angle)
    // A fix lamellás tetőn a lamellák mindig a teljes felületet fedik (csak forognak); az eltolhatónál összetolódnak.
    const spacing = ((depth - 0.3) / count) * (retractable ? 1 - openness * 0.84 : 1)
    let moving = false
    for (let index = 0; index < count; index++) {
      const wave = REDUCED ? 1 : THREE.MathUtils.clamp((clock.elapsedTime - introStart.current - index * 0.045) / 1.25, 0, 1)
      const waveTarget = target * (wave * wave * (3 - 2 * wave))
      if (Math.abs(state.rotation[index] + waveTarget) > 0.001 || wave < 1) moving = true
      state.rotation[index] = REDUCED ? -waveTarget : THREE.MathUtils.damp(state.rotation[index], -waveTarget, 8, delta)
      const targetZ = -depth / 2 + 0.2 + index * spacing
      if (Math.abs(state.z[index] - targetZ) > 0.001) moving = true
      state.z[index] = REDUCED ? targetZ : THREE.MathUtils.damp(state.z[index], targetZ, 8, delta)
    }
    if (moving) { write(); refreshShadows(gl); invalidate() }
  })
  const radial = Math.max(6, Math.min(12, louvreSegments))
  return <group>
    <instancedMesh ref={blades} args={[undefined, undefined, count]} frustumCulled={false} castShadow receiveShadow><primitive object={geometry} attach="geometry" /><PowderCoat color={color} roughness={0.38} /></instancedMesh>
    <instancedMesh ref={strips} args={[undefined, undefined, count]} frustumCulled={false}><boxGeometry args={[width - 0.22, 0.012, 0.014]} /><meshStandardMaterial color="#111718" roughness={0.92} /></instancedMesh>
    <instancedMesh ref={caps} args={[undefined, undefined, count * 2]} frustumCulled={false}><cylinderGeometry args={[0.034, 0.034, 0.014, radial]} /><meshStandardMaterial color={color} metalness={0.35} roughness={0.4} /></instancedMesh>
  </group>
}

function useAerofoilGeometry(width: number) {
  const { louvreSegments } = useQuality()
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.095, 0)
    shape.bezierCurveTo(-0.085, 0.042, -0.025, 0.055, 0.055, 0.028)
    shape.bezierCurveTo(0.095, 0.012, 0.1, -0.008, 0.065, -0.024)
    shape.bezierCurveTo(0.005, -0.052, -0.065, -0.035, -0.095, 0)
    const result = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.2, width - 0.18), bevelEnabled: false, curveSegments: louvreSegments })
    result.rotateY(Math.PI / 2)
    result.translate(-(width - 0.18) / 2, 0, 0)
    result.deleteAttribute('normal')
    result.deleteAttribute('uv')
    const smoothed = mergeVertices(result, 0.0001)
    smoothed.computeVertexNormals()
    result.dispose()
    return smoothed
  }, [width, louvreSegments])
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

function LedStrip({ args, position, night, color = '#ffc87a', level = 0.8 }: { args: [number, number, number]; position: [number, number, number]; night: boolean; color?: string; level?: number }) {
  return <group position={position}><mesh><boxGeometry args={[args[0] + 0.018, args[1] + 0.014, args[2] + 0.014]} /><meshStandardMaterial color="#151a1c" metalness={0.5} roughness={0.35} /></mesh><mesh position={[0, -0.012, 0]}><boxGeometry args={args} /><meshStandardMaterial color="#ffe6bd" emissive={color} emissiveIntensity={night ? 6.25 * level : 0.45} toneMapped={false} /></mesh></group>
}

const HOTSPOTS = {
  motor: { title: 'Csendes, rejtett motor', text: 'A lamellák vezérlése a gerendába integrált motorházban kap helyet.' },
  led: { title: 'Hangulatfény árnyalatokban', text: 'A periméter LED nem vakít, hanem a terasz anyagait emeli ki.' },
  drain: { title: 'Rejtett vízelvezetés az oszlopban', text: 'A víz a tetőpályából a gerendán, majd az oszlopon belül távozik.' },
  sensor: { title: 'Esőben automata védelem', text: 'A szenzorcsomag az eső érzékelésekor zárt lamellapozíciót ad.' },
  post: { title: 'Merev, pontos alapozás', text: 'A talplemez és a látható rögzítéspontok a stabil kivitelezést szolgálják.' },
}

function Hotspots({ config, posts }: { config: PergolaConfig; posts: [number, number][] }) {
  const [active, setActive] = useState<keyof typeof HOTSPOTS | null>(null)
  const { width, depth, height } = config
  const front = posts.filter(([, z]) => z > 0).sort((a, b) => b[0] - a[0])
  const drain = front[0]
  const post = front[front.length - 1]
  const points: { id: keyof typeof HOTSPOTS; position: [number, number, number] }[] = [
    { id: 'motor', position: [width / 2, height + 0.18, depth / 2 - 0.25] },
    { id: 'led', position: [-width / 2 + 0.2, height - 0.15, depth / 2 - 0.12] },
    ...(drain ? [{ id: 'drain' as const, position: [drain[0], 0.5, drain[1]] as [number, number, number] }] : []),
    { id: 'sensor', position: [-width / 2 + 0.2, height + 0.35, -depth / 2 + 0.2] },
    ...(post && post !== drain ? [{ id: 'post' as const, position: [post[0], 0.15, post[1]] as [number, number, number] }] : []),
  ]
  return <group>{points.map((point) => <group key={point.id} position={point.position}><Html center zIndexRange={[12, 0]}><button type="button" className={`hotspot ${active === point.id ? 'active' : ''}`} aria-label={HOTSPOTS[point.id].title} onClick={(event) => { event.stopPropagation(); setActive(active === point.id ? null : point.id) }}><span>+</span></button>{active === point.id && <div className="hotspot-card"><button type="button" aria-label="Előnykártya bezárása" onClick={() => setActive(null)}>×</button><strong>{HOTSPOTS[point.id].title}</strong><p>{HOTSPOTS[point.id].text}</p></div>}</Html></group>)}</group>
}

function Person({ config }: { config: PergolaConfig }) {
  const position: [number, number, number] = [-config.width / 2 + 0.68, 0.035, config.depth * 0.18]
  return <group><RealisticAsset url={assetUrl('/assets/models/scale_person/person.glb')} position={position} height={1.8} rotation={0.28} /></group>
}

/**
 * Üveg- vagy polikarbonát tető: hosszanti alumínium bordák (kb. 95 cm-enként),
 * köztük a táblák, a bordákon szorítóléc. Az üveg átengedi a napot (nem vet árnyékot),
 * az opál polikarbonát szórt fényt ad (árnyékot vet).
 */
function GlazedRoof({ width, depth, height, color, kind, glazing }: { width: number; depth: number; height: number; color: string; kind: 'glass' | 'polycarbonate'; glazing: RoofGlazing }) {
  const bays = Math.max(2, Math.ceil(width / 0.95))
  const span = width - 0.14
  const bay = span / bays
  const length = depth - 0.12
  const glass = kind === 'glass'
  // Tiszta üveg/polikarbonát átlátszó (nem vet árnyékot); matt, opál és hővisszaverő burkolat szórja vagy tompítja a fényt.
  const clearPane = glazing === 'clear'
  return <group name={`roof-${kind}`}>
    {Array.from({ length: bays + 1 }, (_, index) => {
      const x = -span / 2 + index * bay
      return <group key={index}>
        <Beam args={[0.055, 0.075, length]} position={[x, height + 0.165, 0]} color={color} radius={0.006} />
        <Beam args={[0.062, 0.018, length]} position={[x, height + 0.227, 0]} color={color} radius={0.004} />
      </group>
    })}
    {Array.from({ length: bays }, (_, index) => {
      const x = -span / 2 + (index + 0.5) * bay
      return <mesh key={index} position={[x, height + 0.211, 0]} castShadow={!clearPane} receiveShadow renderOrder={clearPane ? 2 : 0}>
        <boxGeometry args={[bay - 0.05, glass ? 0.012 : 0.016, length - 0.02]} />
        {glazing === 'heat'
          ? <GlassMaterial tint={glass ? '#7fa6b8' : '#b9c4c4'} opacity={glass ? 0.52 : 0.62} envMapIntensity={2.4} />
          : glazing === 'satin'
            ? <meshPhysicalMaterial color="#e6eeee" roughness={0.62} transmission={0} transparent opacity={0.7} side={THREE.DoubleSide} />
            : glazing === 'opal'
              ? <meshPhysicalMaterial color="#f3f1ea" roughness={0.55} transmission={0} transparent opacity={0.78} sheen={0.2} side={THREE.DoubleSide} />
              : glass
                ? <GlassMaterial tint="#cfe2e4" opacity={0.24} envMapIntensity={1.2} />
                : <GlassMaterial tint="#e3f0f2" opacity={0.3} envMapIntensity={1.1} doubleSided />}
      </mesh>
    })}
    {/* Elülső vízvető profil */}
    <Beam args={[width - 0.1, 0.04, 0.05]} position={[0, height + 0.215, depth / 2 - 0.06]} color={color} radius={0.004} />
  </group>
}

/**
 * Motoros tetőárnyékoló üveg- vagy polikarbonát tetőhöz. Tető feletti: kazetta a fal felőli végen,
 * oldalsó vezetősínek a bordák fölött tartókon, a ponyva az üveg felett fut. Tető alatti: a bordázat alatt,
 * a keretgerendákon belül. A ponyva árnyékot vet (az üveg nem), így az árnyékelemzés is mutatja a hatását.
 */
function RoofShadeModel({ width, depth, height, kind, fabric, color, out, night, onToggle }: { width: number; depth: number; height: number; kind: 'above' | 'below'; fabric: string; color: string; out: number; night: boolean; onToggle: () => void }) {
  const above = kind === 'above'
  const y = above ? height + 0.33 : height + 0.105
  const railX = width / 2 - (above ? 0.09 : 0.2)
  const fabricWidth = railX * 2 - 0.05
  const start = -depth / 2 + (above ? 0.24 : 0.3)
  const end = depth / 2 - (above ? 0.1 : 0.22)
  const fabricRef = useRef<THREE.Mesh>(null)
  const barRef = useRef<THREE.Group>(null)
  const current = useRef(out / 100)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const apply = useCallback((t: number) => {
    const length = Math.max(0.002, (end - start) * t)
    if (fabricRef.current) { fabricRef.current.scale.z = length; fabricRef.current.position.z = start + length / 2; fabricRef.current.visible = t > 0.01 }
    if (barRef.current) barRef.current.position.z = start + length
  }, [start, end])
  useLayoutEffect(() => { apply(current.current) }, [apply])
  useFrame((_, delta) => {
    const target = out / 100
    if (Math.abs(current.current - target) < 0.0015) return
    current.current = REDUCED ? target : THREE.MathUtils.damp(current.current, target, 2.6, delta)
    if (Math.abs(current.current - target) < 0.0015) current.current = target
    apply(current.current)
    refreshShadows(gl)
    invalidate()
  })
  const railLength = end - start + 0.12
  const strutCount = above ? Math.max(2, Math.ceil(depth / 1.3) + 1) : 0
  return <group name={`roof-shade-${kind}`} onClick={(event) => { event.stopPropagation(); onToggle(); invalidate() }}>
    {/* Kazetta (motor és feltekert ponyva) */}
    <RoundedBox args={[railX * 2 + 0.06, above ? 0.13 : 0.1, above ? 0.16 : 0.12]} position={[0, y + (above ? 0.02 : -0.012), start - (above ? 0.085 : 0.065)]} radius={0.02} smoothness={3} castShadow><PowderCoat color={color} /></RoundedBox>
    {/* Vezetősínek */}
    {[-1, 1].map((side) => <Beam key={side} args={[0.045, 0.05, railLength]} position={[side * railX, y - 0.01, (start + end) / 2]} color={color} radius={0.005} />)}
    {/* Tető feletti változatnál tartók a bordázatról a sínekig */}
    {Array.from({ length: strutCount }, (_, index) => {
      const z = start + (index / (strutCount - 1)) * (end - start)
      return [-1, 1].map((side) => <mesh key={`${index}-${side}`} position={[side * railX, height + 0.275, z]} castShadow><boxGeometry args={[0.03, 0.09, 0.03]} /><PowderCoat color={color} /></mesh>)
    })}
    {/* Ponyva: 1 m mély doboz, a kihúzottság szerint nyújtva */}
    <mesh ref={fabricRef} position={[0, y, start + 0.5]} castShadow receiveShadow>
      <boxGeometry args={[fabricWidth, 0.006, 1]} />
      {/* Nappal a ponyva áttetszik: alulról nézve a rajta átszűrődő fény világosítja (emisszív közelítés). */}
      <meshStandardMaterial color={fabric} roughness={0.93} metalness={0} side={THREE.DoubleSide} envMapIntensity={0.45} emissive={fabric} emissiveIntensity={night ? 0 : 0.42} />
    </mesh>
    {/* Végprofil */}
    <group ref={barRef} position={[0, y, end]}>
      <RoundedBox args={[fabricWidth + 0.03, 0.036, 0.055]} radius={0.01} smoothness={3} castShadow><PowderCoat color={color} /></RoundedBox>
    </group>
  </group>
}

/**
 * Behúzható textiltető: a futósínek között harmonikaszerűen redőzött, vízzáró ponyva.
 * A ponyvatartó profilok behúzáskor a hátsó (fal felőli) végre gyűlnek össze;
 * a ponyva a profilok között a távolságtól függően belóg.
 */
function FabricRoof({ width, depth, height, color, openness }: { width: number; depth: number; height: number; color: string; openness: number }) {
  const count = Math.max(4, Math.ceil(depth / 0.5))
  const pitch = (depth - 0.24) / count
  // Kifeszítve enyhe hullám (2,5% ráhagyás), behúzva mély redők.
  const slack = pitch * 1.025
  const steps = 14
  const profiles = useRef<THREE.Group[]>([])
  const fabric = useMemo(() => Array.from({ length: count }, () => {
    const geometry = new THREE.PlaneGeometry(width - 0.2, 1, 1, steps)
    geometry.rotateX(-Math.PI / 2)
    return geometry
  }), [count, width])
  useEffect(() => () => fabric.forEach((geometry) => geometry.dispose()), [fabric])
  const current = useRef(openness)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const layout = (open: number) => Array.from({ length: count + 1 }, (_, index) => {
    const extended = -depth / 2 + 0.12 + index * pitch
    const packed = -depth / 2 + 0.12 + index * 0.055
    return THREE.MathUtils.lerp(extended, packed, open)
  })
  const apply = (open: number) => {
    const zs = layout(open)
    profiles.current.slice(0, count + 1).forEach((profile, index) => { if (profile) profile.position.z = zs[index] })
    fabric.forEach((geometry, index) => {
      const a = zs[index]
      const b = zs[index + 1]
      const gap = Math.max(0.001, b - a)
      // Parabolikus belógás: a ponyva hossza állandó, a profilok közelebb kerülve mélyebben lóg.
      const sag = Math.min(slack * 0.45, Math.sqrt(Math.max(0, (3 * gap * (slack - gap)) / 8)) + 0.012)
      const position = geometry.attributes.position as THREE.BufferAttribute
      for (let row = 0; row <= steps; row++) {
        const t = row / steps
        const z = a + (b - a) * t
        const y = -sag * 4 * t * (1 - t)
        for (let column = 0; column < 2; column++) position.setXYZ(row * 2 + column, column === 0 ? -(width - 0.2) / 2 : (width - 0.2) / 2, y, z)
      }
      position.needsUpdate = true
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()
      geometry.computeBoundingBox()
    })
  }
  useEffect(() => { apply(current.current); invalidate() })
  useFrame((_, delta) => {
    const target = openness
    if (Math.abs(current.current - target) < 0.001) return
    current.current = REDUCED ? target : THREE.MathUtils.damp(current.current, target, 4, delta)
    apply(current.current)
    refreshShadows(gl)
    invalidate()
  })
  return <group name="roof-fabric" position={[0, height + 0.2, 0]}>
    {/* Futósínek a két oldalon */}
    {[-1, 1].map((side) => <Beam key={side} args={[0.07, 0.05, depth - 0.1]} position={[side * (width / 2 - 0.09), -0.02, 0]} color={color} radius={0.006} />)}
    {Array.from({ length: count + 1 }, (_, index) => <group key={index} ref={(node) => { if (node) profiles.current[index] = node }}>
      <Beam args={[width - 0.16, 0.028, 0.034]} position={[0, 0.004, 0]} color={color} radius={0.004} />
    </group>)}
    {fabric.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow receiveShadow position={[0, -0.005, 0]}>
      <meshStandardMaterial color="#ece8df" roughness={0.95} side={THREE.DoubleSide} />
    </mesh>)}
  </group>
}

/** Periméter LED: a fényerő és a színhőmérséklet a vásárló „esti hangulat” beállítása. */
function LedLighting({ width, depth, height, night, kelvin, level, rgb = null }: { width: number; depth: number; height: number; night: boolean; kelvin: number; level: number; rgb?: string | null }) {
  const color = rgb ?? kelvinToHex(kelvin)
  return <group>
    <LedStrip args={[width - 0.3, 0.018, 0.018]} position={[0, height - 0.15, depth / 2 - 0.12]} night={night} color={color} level={level} />
    <LedStrip args={[width - 0.3, 0.018, 0.018]} position={[0, height - 0.15, -depth / 2 + 0.12]} night={night} color={color} level={level} />
    <LedStrip args={[0.018, 0.018, depth - 0.3]} position={[-width / 2 + 0.12, height - 0.15, 0]} night={night} color={color} level={level} />
    <LedStrip args={[0.018, 0.018, depth - 0.3]} position={[width / 2 - 0.12, height - 0.15, 0]} night={night} color={color} level={level} />
    {/* A fények éjjel mindig jelen vannak (0 fényerőnél 0 intenzitással): a fényforrások számának
        változása az összes anyag újrafordítását okozná, ami mobilon akadást jelent. */}
    {/* A fények mindig a jelenetben maradnak (nappal 0 intenzitással): a fényszám változása újrafordítaná az összes anyag shaderét. */}<pointLight position={[-width * 0.28, height - 0.4, 0]} color={color} intensity={night ? 25 * level : 0} distance={7} decay={2} /><pointLight position={[width * 0.28, height - 0.4, 0]} color={color} intensity={night ? 25 * level : 0} distance={7} decay={2} />
  </group>
}

/** Robbantott nézet: az alkatrész a közös `ex` (0–1) értékkel arányosan elmozdul; a címke csak szétszedve látszik. */
function ExplodePart({ ex, dx = 0, dy = 0, dz = 0, label, labelAt, show = false, children }: { ex: { current: number }; dx?: number; dy?: number; dz?: number; label?: string; labelAt?: [number, number, number]; show?: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { if (ref.current) { const e = ex.current * ex.current * (3 - 2 * ex.current); ref.current.position.set(dx * e, dy * e, dz * e) } })
  return <group ref={ref}>{children}{label && show && <Html center position={labelAt ?? [0, dy > 0 ? 0.35 : 0.1, 0]} zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}><span className="explode-label">{label}</span></Html>}</group>
}

/** Tetődőlés: a tetőszintű elemek az elülső él körül elfordulnak, a hátsó (fali) oldal emelkedik. */
function Tilt({ pitch, height, depth, children }: { pitch: number; height: number; depth: number; children: ReactNode }) {
  if (!pitch) return <>{children}</>
  return <group position={[0, height, depth / 2]} rotation={[pitch * Math.PI / 180, 0, 0]}><group position={[0, -height, -depth / 2]}>{children}</group></group>
}

function PergolaModel({ config, scene, onSideSelect, onSceneChange }: { config: PergolaConfig; scene: SceneSettings; onSideSelect?: (side: SideKey) => void; onSceneChange: (patch: Partial<SceneSettings>) => void }) {
  const { width, depth, height, roof, mount } = config
  const { tenant } = useTenant()
  const color = getFrameColorHex(config, tenant.colors)
  // Kéttónusú kivitelnél a tető/lamellák saját színe; fehér tetőnél kicsit tompítva (ne égjen ki).
  const roofBase = config.roofColor ? getFrameColorHex({ frameColor: config.roofColor, customRal: config.roofRal }, tenant.colors) : color
  const roofIsWhite = (config.roofColor ?? config.frameColor) === 'white'
  const roofColor = roofIsWhite ? '#d4d6d1' : roofBase
  const model = useRef<THREE.Group>(null)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const geometry = useAerofoilGeometry(width)
  const postPositions = getPostPositions(config)
  const pitch = config.pitch ?? 0
  const rise = roofRise(config)
  const tilt = (node: ReactNode) => <Tilt pitch={pitch} height={height} depth={depth}>{node}</Tilt>
  // A lefolyó kifolyója az elülső sarokoszlopnál; ha ott fal van, a másik elülső sarkon.
  const drainPost = postPositions.find(([x, z]) => z > 0 && x > 0.5) ?? postPositions.find(([x, z]) => z > 0 && x < -0.5)
  const sideWallList = sideWalls(mount)
  const louverCount = Math.max(10, Math.floor(depth / 0.22))
  const rainProtection = scene.rain && config.sensors && isMovableRoof(roof)
  // Télen a lamellás tetők zárva (vízzáró állás), a textiltető behúzva (nem hóteherre készül).
  const effectiveAngle = rainProtection ? 0 : config.louverAngle
  const openness = effectiveAngle / 90
  const fixedSeamCount = Math.max(2, Math.floor(depth / 0.65))
  const introStart = useRef(0)
  const ex = useRef(scene.exploded && REDUCED ? 1 : 0)
  // Az első betöltéskor nem animálunk: csak a későbbi kapcsolásoknál épül fel látványosan az oldalelem.
  const settled = useRef(false)
  useEffect(() => { const id = window.setTimeout(() => { settled.current = true }, 2500); return () => window.clearTimeout(id) }, [])
  useFrame(({ clock }, delta) => {
    if (!introStart.current) introStart.current = clock.elapsedTime
    const target = scene.exploded ? 1 : 0
    if (Math.abs(ex.current - target) > 0.0005) { ex.current = REDUCED ? target : THREE.MathUtils.damp(ex.current, target, 4.5, delta); if (Math.abs(ex.current - target) < 0.0005) ex.current = target; refreshShadows(gl); invalidate() }
    if (model.current) {
      model.current.scale.y = REDUCED ? 1 : THREE.MathUtils.damp(model.current.scale.y, 1, 6, delta)
      if (Math.abs(model.current.scale.y - 1) > 0.001) { refreshShadows(gl); invalidate() }
    }
  })
  const night = scene.time === 'night'
  const x = scene.exploded
  return <group ref={model} name="pergola-model" scale={[1, REDUCED ? 1 : 0.96, 1]}>{postPositions.map(([x, z], index) => <DetailedPost key={index} position={[x, z]} height={z < 0 ? height + rise : height} color={color} />)}{x && postPositions[0] && <Html position={[postPositions[0][0], height / 2, postPositions[0][1]]} center zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}><span className="explode-label">Oszlopok</span></Html>}<ExplodePart ex={ex} dy={0.55} label="Gerendák" labelAt={[width / 2 - 0.2, height + 0.3, depth / 2]} show={x}><StructuralBeam args={[width + 0.1, 0.23, 0.19]} position={[0, height, depth / 2]} color={color} /><StructuralBeam args={[width + 0.1, 0.23, 0.19]} position={[0, height, -depth / 2]} color={color} /><StructuralBeam args={[0.19, 0.23, depth]} position={[-width / 2, height, 0]} color={color} /><StructuralBeam args={[0.19, 0.23, depth]} position={[width / 2, height, 0]} color={color} /></ExplodePart>
    <ExplodePart ex={ex} dy={1.0} label="Vízelvezetés" labelAt={[-width / 2 + 0.4, height + 0.3, depth / 2]} show={x}>
    {tilt(<>
    <GutterChannel length={width - 0.18} position={[0, height + 0.04, depth / 2 - 0.105]} color={color} />
    <GutterChannel length={width - 0.18} position={[0, height + 0.04, -depth / 2 + 0.105]} color={color} />
    <GutterChannel length={depth - 0.2} position={[-width / 2 + 0.105, height + 0.04, 0]} rotation={Math.PI / 2} color={color} />
    <GutterChannel length={depth - 0.2} position={[width / 2 - 0.105, height + 0.04, 0]} rotation={Math.PI / 2} color={color} />
    </>)}
    </ExplodePart>
    {tilt(<>{hasBackWall(mount) && <WallAttachment config={config} color={color} />}
    {sideWallList.map((side) => <SideWallAttachment key={side} config={config} side={side} color={color} />)}</>)}
    {!drainPost && <group name="wall-downpipe" position={[width / 2 + 0.05, 0, depth / 2 - 0.06]}><mesh position={[0, height / 2 + 0.05, 0]} castShadow><cylinderGeometry args={[0.04, 0.04, height + 0.1, 18]} /><PowderCoat color={color} /></mesh><mesh position={[-0.02, 0.06, 0.04]} rotation={[0.9, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.14, 18]} /><PowderCoat color={color} /></mesh></group>}
    <group position={[0, height + 0.02, depth / 2 + 0.105]}><mesh><boxGeometry args={[width - 0.05, 0.12, 0.045]} /><PowderCoat color={color} /></mesh><mesh position={[0, -0.065, 0.025]}><boxGeometry args={[width - 0.08, 0.014, 0.075]} /><meshStandardMaterial color="#1c2426" metalness={0.5} roughness={0.4} /></mesh></group>
    {drainPost && <mesh position={[drainPost[0], 0.14, drainPost[1] + 0.095]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.08, 0.025, 8, 20, Math.PI / 2]} /><PowderCoat color={color} /></mesh>}
    <RoundedBox args={[0.28, 0.19, 0.34]} position={[width / 2 - 0.02, height + 0.12, depth / 2 - 0.25]} radius={0.035} smoothness={4} castShadow><PowderCoat color={color} /></RoundedBox>
    <group position={[-width / 2 + 0.2, height + 0.32 + rise, -depth / 2 + 0.2]}><mesh><cylinderGeometry args={[0.045, 0.055, 0.12, 16]} /><meshStandardMaterial color="#31383a" metalness={0.5} roughness={0.35} /></mesh><mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.034, 16]} /><meshPhysicalMaterial color="#8aa0a4" roughness={0.1} clearcoat={1} /></mesh></group>
    <ExplodePart ex={ex} dy={1.6} label={roof === 'fabric' ? 'Textiltető' : isGlazedRoof(roof) ? 'Üvegtető' : roof === 'fixed' ? 'Fix tető' : 'Tetőlamellák'} labelAt={[0, height + 0.5 + rise / 2, -depth / 4]} show={x}>
    {tilt(<>
    {(roof === 'louvered' || roof === 'retractable') && <LouverBlades key={louverCount} geometry={geometry} width={width} depth={depth} height={height} count={louverCount} retractable={roof === 'retractable'} angle={effectiveAngle} color={roofColor} />}
    {roof === 'fixed' && <group><mesh position={[0, height + 0.14, 0]} castShadow receiveShadow><boxGeometry args={[width - 0.12, 0.09, depth - 0.12]} /><PowderCoat color={roofColor} /></mesh>{Array.from({ length: fixedSeamCount }, (_, index) => { const z = -depth / 2 + (index + 1) * depth / (fixedSeamCount + 1); return <Beam key={index} args={[width - 0.16, 0.018, 0.025]} position={[0, height + 0.192, z]} color={roofColor} radius={0.003} /> })}</group>}
    {isGlazedRoof(roof) && <GlazedRoof width={width} depth={depth} height={height} color={roofColor} kind={roof === 'glass' ? 'glass' : 'polycarbonate'} glazing={effectiveGlazing(config) ?? 'clear'} />}
    {isGlazedRoof(roof) && config.roofShade && <RoofShadeModel width={width} depth={depth} height={height} kind={config.roofShade} fabric={findShadeFabric(config.shadeFabric).hex} color={color} out={scene.shadeOut} night={night} onToggle={() => onSceneChange({ shadeOut: scene.shadeOut > 50 ? 0 : 100 })} />}
    {roof === 'fabric' && <FabricRoof width={width} depth={depth} height={height} color={roofColor} openness={openness} />}
    {roof === 'fixed' && config.solar && <SolarPanels config={config} />}
    </>)}
    </ExplodePart>
    {(() => { const labelled = new Set<string>(); return (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => <ExplodePart key={side} ex={ex} dx={side === 'left' ? -1.1 : side === 'right' ? 1.1 : 0} dz={side === 'front' ? 1.1 : side === 'back' ? -1.1 : 0}><SidePlacement side={side} config={config} scene={scene} color={color} onSelect={onSideSelect} onSceneChange={onSceneChange} labelled={labelled} settled={settled} /></ExplodePart>) })()}
    {config.led && tilt(<LedRamp settled={settled}>{(factor) => <LedLighting width={width} depth={depth} height={height} night={night} kelvin={scene.ledKelvin} level={(scene.ledLevel / 100) * factor} rgb={config.ledRgb ? scene.ledColor : null} />}</LedRamp>)}
    {(config.fans ?? 0) > 0 && <DropIn settled={settled}><CeilingFans config={rise ? { ...config, height: height + rise / 2 } : config} color={color} spinning={scene.fanOn} /></DropIn>}
    {Array.from({ length: config.heaters }, (_, index) => { const x = (index - (config.heaters - 1) / 2) * Math.min(1.4, width / Math.max(config.heaters, 1)); return <DropIn key={index} settled={settled}><group position={[x, height - 0.3, -depth / 2 + 0.3]} rotation={[-0.25, 0, 0]}><RoundedBox args={[0.72, 0.1, 0.15]} radius={0.035} smoothness={4} castShadow><meshPhysicalMaterial color="#24292b" metalness={0.7} roughness={0.3} /></RoundedBox><mesh position={[0, -0.052, 0.015]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[0.6, 0.065]} /><meshStandardMaterial color="#f08b49" emissive="#f06f32" emissiveIntensity={scene.heatersOn ? (night ? 3 : 0.15) : 0} toneMapped={false} /></mesh>{night && <pointLight position={[0, -0.25, 0.25]} color="#ff8a4a" intensity={scene.heatersOn ? 3.2 : 0} distance={3.2} decay={2} />}</group></DropIn> })}
    {config.speakers && [-1, 1].map((direction) => <DropIn key={direction} settled={settled}><group position={[direction * (width / 2 - 0.17), height - 0.38, depth / 2 - 0.17]} rotation={[Math.PI / 2, 0, 0]}><mesh><cylinderGeometry args={[0.082, 0.082, 0.065, 24]} /><meshStandardMaterial color="#1b2022" metalness={0.48} roughness={0.38} /></mesh><mesh position={[0, 0.035, 0]}><cylinderGeometry args={[0.065, 0.065, 0.004, 24]} /><meshStandardMaterial color="#080b0c" roughness={0.85} /></mesh></group></DropIn>)}
    <group name="ar-skip-overlays">{scene.showDimensions && <DimensionGuides config={config} />}{scene.showPerson && <OptionalSceneAsset name="180 cm reference person"><Person config={config} /></OptionalSceneAsset>}{scene.showHotspots && <Hotspots config={config} posts={postPositions} />}</group>
  </group>
}

type ArchitecturalAsset = THREE.Group & { dispose: () => Promise<void> }
type ArchitecturalModule = { createAsset: (namespace: typeof THREE, options: { states: 'lazy' }) => Promise<ArchitecturalAsset> }

const houseAssetPath = assetUrl('/assets/models/cedar_zinc_house/asset.mjs')
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

/** Telefonon a fa 512 px-es textúrákkal töltődik (kb. 2,2 MB → 0,3 MB), a megjelenés alig változik. */
const MOBILE_VIEW = typeof window !== 'undefined' && window.innerWidth < 760
const TREE_MODEL = assetUrl(`/assets/models/tree_small_02/${MOBILE_VIEW ? 'optimized-512' : 'optimized'}.gltf`)
const DECOR_MODELS = [TREE_MODEL, ...['shrub_04/model.gltf', 'potted_plant_02/model.gltf', 'modern_coffee_table_01/model.gltf'].map((path) => assetUrl(`/assets/models/${path}`))]
let prefetchedHdr = ''
/**
 * Előtöltés: amíg a böngésző az első képkockát (shadereket) készíti, a háttér
 * nagy fájljai — ház, égbolt, terasz, növények, bútor — már párhuzamosan töltődnek.
 * A betöltők gyorsítótárát tölti, így a későbbi megjelenítés azonnal kész.
 */
function prefetchSceneAssets(scene: SceneSettings) {
  const small = wantsSmallHdr(detectQualityTier())
  const pick = (file: string) => (small ? smallHdr(file) : file)
  const hdr = pick(getLighting(scene).hdr)
  if (scene.photoMode || prefetchedHdr === hdr) return
  prefetchedHdr = hdr
  try {
    getHouseAsset().catch(() => undefined)
    useEnvironment.preload({ files: hdr })
    // A másik két napszak HDR-je tétlen időben töltődik, így a nappal/éjszaka váltás nem vár hálózatra.
    const others = Object.values(HDR_FILES).map(pick).filter((file) => file !== hdr)
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2500))
    // Telefonon a másik két égbolt csak váltáskor töltődik (kb. 0,65 MB megtakarítás).
    if (!small) idle(() => { try { others.forEach((file) => useEnvironment.preload({ files: file })) } catch { /* nem kritikus */ } }, { timeout: 6000 })
    useTexture.preload((['diff', 'nor_gl', 'rough'] as const).map((map) => assetUrl(pbrPath('oak_wood_planks', map))))
    DECOR_MODELS.forEach((url) => useGLTF.preload(url))
  } catch (error) {
    log.warn('Scene prefetch skipped', { error: error instanceof Error ? error.message : String(error) })
  }
}

type HouseLook = Pick<SceneSettings, 'wallFinish' | 'wallColor' | 'windowColor'>

// A ház modell saját méretei (modellegységben, a talajszinttől).
const HOUSE_RAW = { width: 18.22, depth: 6.79, eave: 2.947, facadeInset: 0.573 }

/**
 * frontZ a ház homlokzatának síkja. Falhoz rögzítve a pergola 18 cm-es fali
 * profilja közvetlenül a homlokzaton ül. A ház úgy méreteződik, hogy az eresz
 * mindig a pergola fölé essen (magas pergolánál arányosan nagyobb a ház).
 */
function getHouseLayout(config: PergolaConfig) {
  const attached = hasBackWall(config.mount)
  const scale = Math.max(Math.max(17, config.width + 6) / HOUSE_RAW.width, (config.height + roofRise(config) + 0.32) / HOUSE_RAW.eave)
  const frontZ = attached ? -config.depth / 2 - 0.185 : -config.depth / 2 - 4.6 - HOUSE_RAW.facadeInset * scale
  return { frontZ, attached, width: HOUSE_RAW.width * scale, scale, depth: HOUSE_RAW.depth * scale }
}

// A ház modelljének részei a homlokzat- és nyílászáró-színezéshez.
// Deszkák: valódi (profilos) geometria — vakolt vagy tégla háznál elrejtjük, mögöttük a sima falsíkok kapják az anyagot.
const HOUSE_BOARDS = /^(Horizontal_front_and_rear_siding|Left_gable_siding|Right_gable_siding|Left_front_pier|Right_front_pier|Porch_back_cedar|Raised_rear_cedar_courses|Entry_left_reveal|Entry_right_reveal|Dormer_cheek_boards_-?1)$/
const HOUSE_WALLS = /^(story0|gable1|gable2|gable1_raised_rear_infill|gable2_raised_rear_infill|Recessed_wall_returns|Dormer_front_carcass|Dormer_tapered_cheeks)$/
const HOUSE_FRAMES = /(_frames|^Porch_return_midrails|^Dormer_four_lights_inset_sash_profiles|^doorf|^door)$/
// Fa szegélyek (eresz, tetőablak-keret): fa homlokzatnál a fa színét, vakolt/tégla háznál a nyílászárók színét kapják.
const HOUSE_TRIMS = /^(Cedar_eave_fascias|Porch_corner_fascia_return|Dormer_header_cedar|Dormer_left_jamb_cedar|Dormer_right_jamb_cedar|Dormer_sill_cedar)$/
// Alsó fa felületek (ereszalj, terasz-mennyezet): csak átszínezett fa homlokzatnál változnak.
const HOUSE_SOFFITS = /^(Sheltered_eave_soffit|Porch_ceiling|Entry_ceiling)$/

type HousePart = { mesh: THREE.Mesh; material: THREE.Material | THREE.Material[]; geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }

function House({ config, look, night }: { config: PergolaConfig; look: HouseLook; night: boolean }) {
  const source = use(getHouseAsset())
  const plaster = useTexture({ diff: assetUrl(pbrPath('plastered_wall_04', 'diff')), normal: assetUrl(pbrPath('plastered_wall_04', 'nor_gl')), rough: assetUrl(pbrPath('plastered_wall_04', 'rough')) })
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
    // A homlokzat síkja (a burkolat eleje) és az előtte lévő terasz-lemez, amelyet
    // falhoz rögzített pergolánál elrejtünk — a pergola terasza veszi át a helyét.
    const siding = object.getObjectByName('Horizontal_front_and_rear_siding')
    const facade = siding ? new THREE.Box3().setFromObject(siding).max.z : box.max.z - HOUSE_RAW.facadeInset
    const porch = ['Terrace_projection', 'Terrace_nosing'].map((name) => object.getObjectByName(name)).filter((item): item is THREE.Object3D => Boolean(item))
    const parts = { boards: [] as HousePart[], walls: [] as HousePart[], frames: [] as HousePart[], trims: [] as HousePart[], soffits: [] as HousePart[] }
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const part = { mesh: child, material: child.material, geometry: child.geometry, matrix: child.matrixWorld.clone() }
      if (HOUSE_BOARDS.test(child.name)) parts.boards.push(part)
      else if (HOUSE_WALLS.test(child.name)) parts.walls.push(part)
      else if (HOUSE_FRAMES.test(child.name)) parts.frames.push(part)
      else if (HOUSE_TRIMS.test(child.name)) parts.trims.push(part)
      else if (HOUSE_SOFFITS.test(child.name)) parts.soffits.push(part)
    })
    return { object, center, minY: box.min.y, facade, porch, parts }
  }, [source])
  // Homlokzat: eredeti cédrus (a modell saját anyaga), átszínezett fa, vagy vakolt/tégla fal a deszkák helyén.
  const facadeHex = wallColorHex(look.wallFinish, look.wallColor)
  useLayoutEffect(() => {
    const created: THREE.BufferGeometry[] = []
    const project = (part: HousePart, uPerM: number, vPerM: number) => {
      const geometry = boxProjectedGeometry(part.geometry, part.matrix, layout.scale, uPerM, vPerM)
      created.push(geometry)
      return geometry
    }
    const restore = (part: HousePart) => { part.mesh.material = part.material; part.mesh.geometry = part.geometry; part.mesh.visible = true }
    if (isOriginalCedar(look.wallFinish, facadeHex)) {
      ;[...prepared.parts.boards, ...prepared.parts.walls, ...prepared.parts.trims, ...prepared.parts.soffits].forEach(restore)
    } else if (look.wallFinish === 'cedar') {
      const board = getBoardMaterial(facadeHex)
      ;[...prepared.parts.boards, ...prepared.parts.walls, ...prepared.parts.trims, ...prepared.parts.soffits].forEach((part) => { part.mesh.visible = true; part.mesh.material = board; part.mesh.geometry = project(part, 1 / 1.0, 1 / 0.25) })
    } else {
      const finish = getFacadeFinish(look.wallFinish, facadeHex, plaster)
      const trim = getFrameMaterial(look.windowColor)
      prepared.parts.boards.forEach((part) => { part.mesh.visible = false })
      prepared.parts.walls.forEach((part) => { part.mesh.visible = true; part.mesh.material = finish.material; part.mesh.geometry = project(part, finish.uPerM, finish.vPerM) })
      prepared.parts.trims.forEach((part) => { part.mesh.visible = true; part.mesh.material = trim; part.mesh.geometry = part.geometry })
      prepared.parts.soffits.forEach(restore)
    }
    refreshShadows(gl)
    invalidate()
    return () => { created.forEach((geometry) => geometry.dispose()) }
  }, [prepared, look.wallFinish, facadeHex, look.windowColor, layout.scale, plaster, gl, invalidate])
  // Nyílászárók: ablak- és ajtókeretek, bejárati ajtó.
  useLayoutEffect(() => {
    const material = getFrameMaterial(look.windowColor)
    prepared.parts.frames.forEach((part) => { part.mesh.material = material })
    invalidate()
  }, [prepared, look.windowColor, invalidate])
  useLayoutEffect(() => {
    prepared.porch.forEach((item) => { item.visible = !layout.attached })
    refreshShadows(gl)
    invalidate()
  }, [prepared, layout.attached, gl, invalidate])
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
  const baseZ = layout.frontZ - (prepared.facade - prepared.center.z) * layout.scale
  return <group name="house">
    <group position={[0, 0, baseZ]} scale={layout.scale}>
      <primitive object={prepared.object} position={[-prepared.center.x, -prepared.minY, -prepared.center.z]} />
      <group position={[-5.2 - prepared.center.x, 6.15 - prepared.minY, -0.48 - prepared.center.z]}>
        <mesh castShadow receiveShadow><boxGeometry args={[0.62, 1.65, 0.68]} /><meshStandardMaterial color="#64645f" roughness={0.9} /></mesh>
        <mesh position={[0, 0.88, 0]} castShadow><boxGeometry args={[0.78, 0.12, 0.84]} /><meshStandardMaterial color="#333b3e" metalness={0.62} roughness={0.38} /></mesh>
        <mesh position={[0, 0.96, 0]}><boxGeometry args={[0.42, 0.035, 0.46]} /><meshStandardMaterial color="#13191b" roughness={0.8} /></mesh>
      </group>
    </group>
    <pointLight position={[0, 1.9, layout.frontZ + 0.7]} color="#ffd09a" intensity={night ? 7 : 0} distance={5.5} decay={2} /><pointLight position={[layout.width * 0.32, 1.7, layout.frontZ + 0.45]} color="#ffc382" intensity={night ? 4 : 0} distance={4} decay={2} />
  </group>
}

// ── Oldalfalak (sarok- és fülkerögzítés) ──────────────────────────────────
// ── Ház-oldalszárny (L- és U-alakú ház) ──────────────────────────────────
// A sarok- és fülkerögzítésnél nem szabadon álló fal, hanem a ház földszinti
// szárnya áll a pergola mellett: ugyanazzal a cédrusburkolattal, kőlábazattal,
// cinkfedéssel, ablakkeretekkel és üveggel, mint a főépület.
const WING_DEPTH = 4.4 // a szárny szélessége (x irányban), méter
const RAW_STOREY = 2.9 // a ház földszintje a modell saját egységében

type WingSpec = { side: 'left' | 'right'; sx: number; inner: number; outer: number; zBack: number; zFront: number; height: number; scale: number }

function getWingSpecs(config: PergolaConfig): WingSpec[] {
  const layout = getHouseLayout(config)
  const zBack = layout.frontZ - 0.9
  const zFront = layout.frontZ + Math.max(config.depth + 1.5, 5.2)
  const height = Math.max(RAW_STOREY * layout.scale + 0.42, config.height + roofRise(config) + 0.66)
  return sideWalls(config.mount).map((side) => {
    const sx = side === 'left' ? -1 : 1
    const inner = sx * (config.width / 2 + 0.125)
    return { side, sx, inner, outer: inner + sx * WING_DEPTH, zBack, zFront, height, scale: layout.scale }
  })
}

/** Homlokzati sík méterarányos UV-val, hogy a burkolat sűrűsége bármekkora szárnyon azonos legyen. */
function useFacadePlane(width: number, height: number, uPerM: number, vPerM: number, uOffset = 0) {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(width, height, 1, 1)
    const position = plane.getAttribute('position')
    const uv = plane.getAttribute('uv')
    for (let index = 0; index < position.count; index += 1) {
      uv.setXY(index, (position.getX(index) + width / 2 + uOffset) * uPerM, (position.getY(index) + height / 2) * vPerM)
    }
    uv.needsUpdate = true
    return plane
  }, [width, height, uPerM, vPerM, uOffset])
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

function FacadePlane({ width, height, finish, position, rotationY, uOffset = 0 }: { width: number; height: number; finish: FacadeFinish; position: [number, number, number]; rotationY: number; uOffset?: number }) {
  const geometry = useFacadePlane(width, height, finish.uPerM, finish.vPerM, uOffset)
  return <mesh geometry={geometry} material={finish.material} position={position} rotation={[0, rotationY, 0]} castShadow receiveShadow />
}

type HouseKit = { trim: THREE.Material; glass: THREE.Material; stone: THREE.Material; zinc: THREE.Material; interior: THREE.MeshStandardMaterial }

/**
 * Ablak a homlokzat előtt: keret (a ház sötét alumínium profilja), sötét belső tér
 * (éjjel meleg fénnyel), az ablak üvege és cink kávaborítás. A homlokzat síkja
 * mentén x a vízszintes, y a függőleges tengely; +z a homlokzatból kifelé mutat.
 */
function WingWindow({ kit, width, height, sill, x, panels = 2 }: { kit: HouseKit; width: number; height: number; sill: number; x: number; panels?: number }) {
  const frame = 0.065
  const y = sill + height / 2
  return <group position={[x, y, 0]}>
    <mesh position={[0, 0, 0.004]} material={kit.interior}><planeGeometry args={[width - frame, height - frame]} /></mesh>
    <mesh position={[0, 0, 0.03]} material={kit.glass} renderOrder={2}><planeGeometry args={[width - frame, height - frame]} /></mesh>
    {[-1, 1].map((edge) => <mesh key={`v${edge}`} position={[edge * (width / 2 - frame / 2), 0, 0.035]} material={kit.trim} castShadow><boxGeometry args={[frame, height, 0.07]} /></mesh>)}
    {[-1, 1].map((edge) => <mesh key={`h${edge}`} position={[0, edge * (height / 2 - frame / 2), 0.035]} material={kit.trim} castShadow><boxGeometry args={[width, frame, 0.07]} /></mesh>)}
    {Array.from({ length: panels - 1 }, (_, index) => <mesh key={`m${index}`} position={[-width / 2 + (index + 1) * width / panels, 0, 0.04]} material={kit.trim}><boxGeometry args={[0.05, height - frame, 0.06]} /></mesh>)}
    {/* cink káva körbe */}
    {[-1, 1].map((edge) => <mesh key={`r${edge}`} position={[edge * (width / 2 + 0.025), 0, 0.045]} material={kit.zinc}><boxGeometry args={[0.05, height + 0.1, 0.09]} /></mesh>)}
    <mesh position={[0, height / 2 + 0.025, 0.045]} material={kit.zinc}><boxGeometry args={[width + 0.1, 0.05, 0.09]} /></mesh>
    <mesh position={[0, -height / 2 - 0.02, 0.06]} material={kit.zinc} castShadow><boxGeometry args={[width + 0.14, 0.04, 0.13]} /></mesh>
  </group>
}

function HouseWing({ spec, config, finish, kit }: { spec: WingSpec; config: PergolaConfig; finish: FacadeFinish; kit: HouseKit }) {
  const { sx, inner, outer, zBack, zFront, height } = spec
  const length = zFront - zBack
  const centerX = (inner + outer) / 2
  const centerZ = (zBack + zFront) / 2
  const plinth = 0.26 * spec.scale
  const wallHeight = height - plinth
  // Belső homlokzat (a pergola felé): nagy tolóajtó a pergola alatt, ablak előtte, ha elfér.
  const sliderWidth = Math.min(Math.max(config.depth - 0.7, 1.6), 3.8)
  // A tolóajtó teteje a pergola oldalsó szerelősínje alatt marad.
  const sliderHeight = Math.min(2.4, config.height - 0.32)
  const sliderZ = 0
  const freeFront = zFront - (config.depth / 2 + 0.35)
  // A homlokzati síkon a lokális x tengely a z mentén fut; bal szárnynál +z, jobbnál −z irányba.
  const innerRot = sx < 0 ? Math.PI / 2 : -Math.PI / 2
  const outerRot = -innerRot
  // Forgatás után a sík lokális x tengelye bal szárnynál −z, jobbnál +z irányba mutat.
  const along = (z: number) => (sx < 0 ? centerZ - z : z - centerZ)
  return <group name={`house-wing-${spec.side}`}>
    {/* Lábazat */}
    <mesh position={[centerX, plinth / 2, centerZ]} material={kit.stone} castShadow receiveShadow><boxGeometry args={[WING_DEPTH + 0.04, plinth, length + 0.04]} /></mesh>
    {/* Homlokzatok */}
    <FacadePlane width={length} height={wallHeight} finish={finish} position={[inner, plinth + wallHeight / 2, centerZ]} rotationY={innerRot} />
    <FacadePlane width={length} height={wallHeight} finish={finish} position={[outer, plinth + wallHeight / 2, centerZ]} rotationY={outerRot} uOffset={1.3} />
    <FacadePlane width={WING_DEPTH} height={wallHeight} finish={finish} position={[centerX, plinth + wallHeight / 2, zFront]} rotationY={0} uOffset={2.1} />
    {/* Belső tömeg (takarás és árnyék) */}
    <mesh position={[centerX, height / 2, centerZ]} castShadow><boxGeometry args={[WING_DEPTH - 0.02, height - 0.02, length - 0.02]} /><meshStandardMaterial color="#3a3f40" roughness={1} colorWrite={false} depthWrite={false} /></mesh>
    {/* Lapostető cinkfedéssel, attikával és vízorral */}
    <mesh position={[centerX, height + 0.07, centerZ + 0.04]} material={kit.zinc} castShadow receiveShadow><boxGeometry args={[WING_DEPTH + 0.16, 0.14, length + 0.16]} /></mesh>
    <mesh position={[centerX, height + 0.005, zFront + 0.12]} material={kit.trim}><boxGeometry args={[WING_DEPTH + 0.18, 0.03, 0.03]} /></mesh>
    <mesh position={[inner - sx * 0.08, height + 0.005, centerZ + 0.04]} material={kit.trim}><boxGeometry args={[0.03, 0.03, length + 0.18]} /></mesh>
    {/* Belső homlokzat nyílásai */}
    <group position={[inner, plinth, centerZ]} rotation={[0, innerRot, 0]}>
      <WingWindow kit={kit} width={sliderWidth} height={sliderHeight - plinth + 0.06} sill={0.02} x={along(sliderZ)} panels={sliderWidth > 2.4 ? 3 : 2} />
      {freeFront >= 1.5 && <WingWindow kit={kit} width={Math.min(1.3, freeFront - 0.6)} height={1.35} sill={0.95 - plinth} x={along(config.depth / 2 + 0.35 + freeFront / 2)} panels={1} />}
    </group>
    {/* Utcai (elülső) homlokzat ablaka */}
    <group position={[centerX, plinth, zFront]}>
      <WingWindow kit={kit} width={WING_DEPTH - 1.5} height={1.55} sill={0.8 - plinth} x={0} panels={2} />
    </group>
    {/* Külső homlokzat: álló ablak */}
    <group position={[outer, plinth, centerZ]} rotation={[0, outerRot, 0]}>
      <WingWindow kit={kit} width={0.75} height={1.8} sill={0.55} x={0.6} panels={1} />
    </group>
  </group>
}

function useHouseKit(night: boolean): HouseKit {
  const source = use(getHouseAsset())
  const kit = useMemo(() => {
    const byMesh = (pattern: RegExp, fallback: THREE.Material) => {
      let found: THREE.Material | null = null
      source.traverse((child) => {
        if (found || !(child instanceof THREE.Mesh) || !pattern.test(child.name)) return
        found = Array.isArray(child.material) ? child.material[0] : child.material
      })
      return found ?? fallback
    }
    const zinc = new THREE.MeshStandardMaterial({ name: 'wing-zinc', color: '#697276', metalness: 0.78, roughness: 0.42, envMapIntensity: 0.66 })
    return {
      trim: byMesh(/^Main_two_panel_slider_frames$/, new THREE.MeshStandardMaterial({ color: '#0c0f10', roughness: 0.34, metalness: 0.4 })),
      glass: byMesh(/^Main_two_panel_slider_glass$/, new THREE.MeshPhysicalMaterial({ color: '#e6f2ee', roughness: 0.03, transparent: true, opacity: 0.38, depthWrite: false })),
      stone: byMesh(/^step$/, new THREE.MeshStandardMaterial({ color: '#bcc0c7', roughness: 0.8 })),
      zinc,
      // Világos belső tér az üveg mögött (függöny/belső fal hatás); éjjel meleg fény.
      interiorDay: new THREE.MeshStandardMaterial({ name: 'wing-interior-day', color: '#7d8589', roughness: 0.85 }),
      interiorNight: new THREE.MeshStandardMaterial({ name: 'wing-interior-night', color: '#2a2620', roughness: 0.85, emissive: '#c88a52', emissiveIntensity: 0.55 }),
    }
  }, [source])
  useEffect(() => () => { kit.zinc.dispose(); kit.interiorDay.dispose(); kit.interiorNight.dispose() }, [kit])
  return useMemo(() => ({ trim: kit.trim, glass: kit.glass, stone: kit.stone, zinc: kit.zinc, interior: night ? kit.interiorNight : kit.interiorDay }), [kit, night])
}

/** A homlokzat anyaga a ház kinézete szerint (a vakolat PBR-textúrája mindig betöltődik, kicsi). */
function useFacadeFinish(look: HouseLook): FacadeFinish {
  const textures = useTexture({ diff: assetUrl(pbrPath('plastered_wall_04', 'diff')), normal: assetUrl(pbrPath('plastered_wall_04', 'nor_gl')), rough: assetUrl(pbrPath('plastered_wall_04', 'rough')) })
  return useMemo(() => getFacadeFinish(look.wallFinish, look.wallColor, textures), [look.wallFinish, look.wallColor, textures])
}

function HouseWingsContent({ config, look, night }: { config: PergolaConfig; look: HouseLook; night: boolean }) {
  const baseKit = useHouseKit(night)
  const finish = useFacadeFinish(look)
  const kit = useMemo(() => ({ ...baseKit, trim: getFrameMaterial(look.windowColor) }), [baseKit, look.windowColor])
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const specs = useMemo(() => getWingSpecs(config), [config])
  useEffect(() => { refreshShadows(gl); invalidate() }, [gl, invalidate, finish, kit, specs, night])
  return <>{specs.map((spec) => <HouseWing key={spec.side} spec={spec} config={config} finish={finish} kit={kit} />)}</>
}

/** Ideiglenes tömeg, amíg a ház anyagai betöltődnek — a pergola sosem „lóg a levegőben”. */
function WingPlaceholder({ config }: { config: PergolaConfig }) {
  return <>{getWingSpecs(config).map((spec) => <mesh key={spec.side} position={[(spec.inner + spec.outer) / 2, spec.height / 2, (spec.zBack + spec.zFront) / 2]} castShadow receiveShadow><boxGeometry args={[WING_DEPTH, spec.height, spec.zFront - spec.zBack]} /><meshStandardMaterial color="#8d6a52" roughness={0.85} /></mesh>)}</>
}

function HouseWings({ config, look, night }: { config: PergolaConfig; look: HouseLook; night: boolean }) {
  const placeholder = <WingPlaceholder config={config} />
  return <group name="house-wings">
    <SceneAssetBoundary name="house wings" fallback={placeholder}>
      <Suspense fallback={placeholder}><HouseWingsContent config={config} look={look} night={night} /></Suspense>
    </SceneAssetBoundary>
  </group>
}

function PlantPot({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <RealisticAsset url={assetUrl('/assets/models/potted_plant_02/model.gltf')} position={position} height={0.92 * scale} rotation={position[0] * 0.7} />
}

const FABRIC = ['#aaa397', '#b8b1a5', '#9e998f']

function Sofa({ width = 2.2 }: { width?: number }) {
  const cushionWidth = (width - 0.24) / 3
  return <group>
    <RoundedBox args={[width, 0.22, 0.83]} position={[0, 0.29, 0]} radius={0.065} smoothness={4} castShadow receiveShadow><meshStandardMaterial color="#5c5b55" roughness={0.96} /></RoundedBox>
    {[-1, 0, 1].map((index) => <group key={index}>
      <RoundedBox args={[cushionWidth - 0.025, 0.18, 0.71]} position={[index * cushionWidth, 0.48, 0.035]} radius={0.075} smoothness={5} castShadow><meshStandardMaterial color={FABRIC[index === 0 ? 0 : 1]} roughness={0.98} /></RoundedBox>
      <RoundedBox args={[cushionWidth - 0.035, 0.48, 0.2]} position={[index * cushionWidth, 0.77, -0.33]} rotation={[-0.13, 0, 0]} radius={0.075} smoothness={5} castShadow><meshStandardMaterial color={FABRIC[index === 1 ? 2 : 1]} roughness={0.98} /></RoundedBox>
    </group>)}
    {[-1, 1].map((side) => <RoundedBox key={side} args={[0.16, 0.38, 0.84]} position={[side * (width / 2 - 0.06), 0.49, 0]} radius={0.055} smoothness={4} castShadow><meshStandardMaterial color="#66645d" roughness={0.96} /></RoundedBox>)}
  </group>
}

/** Pihenősarok a zóna (3,0 × 2,6 m) közepén: kanapé, szőnyeg, dohányzóasztal, növény. */
function LoungeSet() {
  return <group>
    <RoundedBox args={[2.75, 0.018, 2.1]} position={[0, 0.018, -0.05]} radius={0.025} smoothness={2} receiveShadow><meshStandardMaterial color="#8c887d" roughness={1} /></RoundedBox>
    <group position={[0, 0, -0.78]}><Sofa /></group>
    <RealisticAsset url={assetUrl('/assets/models/modern_coffee_table_01/model.gltf')} position={[0, 0.03, 0.32]} height={0.46} rotation={Math.PI / 2} />
    <PlantPot position={[1.32, 0.02, -0.95]} scale={0.8} />
  </group>
}

function DiningChair({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return <group position={position} rotation={[0, rotation, 0]}>
    <RoundedBox args={[0.46, 0.05, 0.46]} position={[0, 0.45, 0]} radius={0.02} smoothness={3} castShadow receiveShadow><meshStandardMaterial color="#b7b0a3" roughness={0.95} /></RoundedBox>
    <RoundedBox args={[0.46, 0.42, 0.04]} position={[0, 0.69, -0.21]} rotation={[-0.08, 0, 0]} radius={0.018} smoothness={3} castShadow><meshStandardMaterial color="#b7b0a3" roughness={0.95} /></RoundedBox>
    {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.215, z]} castShadow><boxGeometry args={[0.025, 0.43, 0.025]} /><meshStandardMaterial color="#2a2f31" metalness={0.6} roughness={0.4} /></mesh>)}
  </group>
}

/** Étkező: asztal és székek; a székek a kihúzáshoz szükséges helyen. */
function DiningSet({ seats }: { seats: 6 | 8 }) {
  const length = seats === 8 ? 2.2 : 1.8
  const width = seats === 8 ? 1.0 : 0.9
  const along = seats === 8 ? [-0.75, 0, 0.75] : [-0.6, 0, 0.6]
  return <group>
    <RoundedBox args={[length, 0.045, width]} position={[0, 0.75, 0]} radius={0.015} smoothness={3} castShadow receiveShadow><meshStandardMaterial color="#9a7652" roughness={0.7} /></RoundedBox>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x * (length / 2 - 0.12), 0.365, z * (width / 2 - 0.1)]} castShadow><boxGeometry args={[0.06, 0.73, 0.06]} /><meshStandardMaterial color="#2a2f31" metalness={0.6} roughness={0.4} /></mesh>)}
    {along.map((x) => <DiningChair key={`a${x}`} position={[x, 0, -(width / 2 + 0.22)]} rotation={0} />)}
    {along.map((x) => <DiningChair key={`b${x}`} position={[x, 0, width / 2 + 0.22]} rotation={Math.PI} />)}
    {seats === 8 && [-1, 1].map((side) => <DiningChair key={`e${side}`} position={[side * (length / 2 + 0.24), 0, 0]} rotation={side * -Math.PI / 2} />)}
  </group>
}

/** A választott bútorcsomag a pergola alatt, és kérésre a helyigénye (zöld: kényelmes, sárga: szűkös, piros: nem fér el). */
function Furniture({ config, scene, hideZone = false }: { config: PergolaConfig; scene: SceneSettings; hideZone?: boolean }) {
  const set = scene.furniture
  if (set === 'none') return null
  const fit = furnitureFit(set, config)!
  const [zoneLong, zoneShort] = FURNITURE_SETS[set].zone
  const content = FURNITURE_SETS[set].parts.map((part) => <group key={part.kind} position={[part.x, 0, 0]}>
    {part.kind === 'lounge' ? <LoungeSet /> : part.kind === 'dining6' ? <DiningSet seats={6} /> : part.kind === 'dining8' ? <DiningSet seats={8} /> : <HotTub night={getLighting(scene).night} />}
  </group>)
  const zoneColor = fit.level === 'comfortable' ? '#9be26a' : fit.level === 'tight' ? '#ffc24a' : '#ff5b4a'
  const half = [zoneLong / 2, zoneShort / 2]
  const outline: [number, number, number][] = [[-half[0], 0.035, -half[1]], [half[0], 0.035, -half[1]], [half[0], 0.035, half[1]], [-half[0], 0.035, half[1]], [-half[0], 0.035, -half[1]]]
  return <group name="terrace-furniture" rotation={[0, fit.alongWidth ? 0 : Math.PI / 2, 0]}>
    {content}
    {scene.showFurnitureZone && !hideZone && <group name="furniture-zone">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><planeGeometry args={[zoneLong, zoneShort]} /><meshBasicMaterial color={zoneColor} transparent opacity={0.16} depthWrite={false} toneMapped={false} /></mesh>
      <Line points={outline} color={zoneColor} lineWidth={2} dashed dashSize={0.18} gapSize={0.1} />
    </group>}
  </group>
}

function Deck({ config }: { config: PergolaConfig }) {
  const wood = usePBR('oak_wood_planks', [3.5, 0.7])
  // Oldalfalnál a burkolat a fal belső síkjáig tart, különben kifut a pergola mellé.
  const { width, depth, centerX, centerZ } = deckBounds(config)
  const planks = Math.ceil(depth / 0.145)
  // Egyetlen egyesített háló: ~28 külön mesh és anyag helyett 1 draw call. A deszkák egyedi UV-eltolást
  // és enyhe színeltérést (vertex color) kapnak, a fuga alatt sötét alap adja a mélységet.
  const geometry = useMemo(() => {
    const pitch = depth / planks
    const parts = Array.from({ length: planks }, (_, index) => {
      const box = new THREE.BoxGeometry(width, 0.065, pitch - 0.009)
      const uv = box.getAttribute('uv')
      const offsetU = seeded(index, 11)
      const offsetV = seeded(index, 23)
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) + offsetU, uv.getY(k) + offsetV)
      // A vertex color lineáris térben értelmezett: a korábbi #bbb1a3 / #d0c6b8 sRGB színeknek ~0,48 / ~0,62 felel meg.
      const tint = (index % 4 === 0 ? 0.48 : 0.62) + (seeded(index, 7) - 0.5) * 0.08
      const colors = new Float32Array(box.getAttribute('position').count * 3).fill(tint)
      box.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      box.translate(0, 0, -depth / 2 + (index + 0.5) * pitch)
      return box
    })
    const merged = mergeGeometries(parts, false)
    parts.forEach((part) => part.dispose())
    return merged
  }, [width, depth, planks])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group position={[centerX, -0.035, centerZ]}>
    <mesh position={[0, -0.02, 0]} receiveShadow><boxGeometry args={[width - 0.02, 0.05, depth - 0.02]} /><meshStandardMaterial color="#1b1612" roughness={1} /></mesh>
    <mesh geometry={geometry} receiveShadow castShadow><meshStandardMaterial map={wood.diff} normalMap={wood.normal} normalScale={[0.45, 0.45]} roughnessMap={wood.rough} vertexColors roughness={0.78} /></mesh>
  </group>
}

function Tree({ position, scale = 1, wind, bare = false }: { position: [number, number, number]; scale?: number; wind: boolean; bare?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const lastUpdate = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  useFrame(({ clock }) => { if (group.current) { group.current.rotation.z = wind ? Math.sin(clock.elapsedTime * 0.65 + position[0]) * 0.004 : 0; if (wind && clock.elapsedTime - lastUpdate.current >= 1 / 30) { lastUpdate.current = clock.elapsedTime; invalidate() } } })
  return <group ref={group}><RealisticAsset url={TREE_MODEL} position={position} height={4.8 * scale} rotation={position[0] * 0.43} shadows={false} bare={bare} /></group>
}

function Garden({ config, scene, quality }: { config: PergolaConfig; scene: SceneSettings; quality: QualitySettings }) {
  const house = getHouseLayout(config)
  const sideX = house.width / 2 + 2.1
  const rearZ = house.frontZ - house.depth - 0.85
  return <group>
    <Tree position={[-sideX, -0.05, house.frontZ - 1.5]} scale={1.12} wind={scene.wind} />
    <Tree position={[sideX, -0.05, house.frontZ - 2.1]} scale={1.28} wind={scene.wind} />
    {quality.enableExtraPlants && <Tree position={[sideX + 1.4, -0.05, 4.6]} scale={0.86} wind={scene.wind} />}
    {[-0.32, 0, 0.32].map((fraction, index) => <RealisticAsset key={fraction} url={assetUrl('/assets/models/shrub_04/model.gltf')} position={[house.width * fraction, -0.04, rearZ]} height={0.95 + index * 0.08} rotation={index * 0.8} shadows={false} />)}
    {/* Oldalfal esetén a dézsák a fal végéhez, a terasz elejére kerülnek. */}
    <PlantPot position={isWallSide(config.mount, 'left') ? [-config.width / 2 + 0.38, 0.01, config.depth / 2 + 0.62] : [-config.width / 2 - 0.75, 0.01, config.depth / 2]} scale={1.25} />
    <PlantPot position={isWallSide(config.mount, 'right') ? [config.width / 2 - 0.38, 0.01, config.depth / 2 + 0.62] : [config.width / 2 + 0.8, 0.01, hasBackWall(config.mount) ? -config.depth / 2 + 0.5 : -config.depth / 2]} scale={1.05} />
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
    texture.repeat.set(29, 29)
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
    <planeGeometry args={[96, 96]} />
    <meshStandardMaterial map={grass} roughness={0.96} color={scene.time === 'night' ? '#7d887b' : '#c2c9b7'} />
  </mesh>
}

function Stars() {
  const positions = useMemo(() => { const array = new Float32Array(360 * 3); for (let i = 0; i < 360; i++) { const angle = i * 2.399; const radius = 18 + (i % 17); array[i * 3] = Math.sin(angle) * radius; array[i * 3 + 1] = 8 + (i % 13) * 0.8; array[i * 3 + 2] = Math.cos(angle) * radius } return array }, [])
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#dce8ef" size={0.07} transparent opacity={0.8} sizeAttenuation depthWrite={false} /></points>
}

function Rain({ config, quality }: { config: PergolaConfig; quality: QualitySettings }) {
  const count = quality.rainDrops
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

function seatPosition(config: Pick<PergolaConfig, 'width' | 'depth'>, furniture: FurnitureSet): [number, number] {
  if (furniture === 'none') return [0, -config.depth * 0.17 - 0.195]
  const fit = furnitureFit(furniture, config)!
  const first = FURNITURE_SETS[furniture].parts[0]
  const local: [number, number] = [first.x, first.kind === 'dining8' ? -0.72 : first.kind === 'dining6' ? -0.67 : first.kind === 'spa' ? -1.25 : -0.7]
  return fit.alongWidth ? local : [local[1], -local[0]]
}

function CameraController({ view, focus, viewShift, revealed, config, autoRotate, furniture }: { view: CameraView; focus: CameraFocus | null; viewShift: number; revealed: boolean; config: PergolaConfig; autoRotate: boolean; furniture: FurnitureSet }) {
  const { camera, gl, invalidate } = useThree()
  const controls = useRef<OrbitControlsType>(null)
  const destination = useRef(new THREE.Vector3(12, 7, 14))
  const target = useRef(new THREE.Vector3())
  const transitioning = useRef(true)
  // Kameramozgás: időalapú, ívelt (a célpont körül forgó) átmenet, hogy ne csússzon át a szerkezeten.
  const move = useRef({ p: 0, started: false, dur: 1.2, from: new THREE.Vector3(), fromTarget: new THREE.Vector3(), fromDir: new THREE.Vector3(), toDir: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), tmp: new THREE.Vector3(), tmpT: new THREE.Vector3() })
  const beginMove = useCallback(() => { move.current.p = 0; move.current.started = false; transitioning.current = true }, [])
  // Első megjelenés: lassú, drónszerű berepülés magasról a nézetbe.
  const firstFlight = useRef(!REDUCED)
  const idle = useRef(0)
  const autoFrame = useRef(0)
  const yaw = useRef(0)
  const pitch = useRef(0)

  // A nézet alapbeállítása (kameraállás + célpont). Fókusz után is ide térünk vissza, ha a lépés áttekintést kér.
  const applyView = useCallback(() => {
    const size = Math.max(config.width, config.depth)
    // Kanapé nézet: a választott bútor egyik ülőhelyéről, a kert felé.
    const [eyeX, eyeZ] = seatPosition({ width: config.width, depth: config.depth }, furniture)
    // Oldalfalnál a kamera a nyitott oldal felől néz be, hogy a fal ne takarja a pergolát.
    const leftWall = isWallSide(config.mount, 'left')
    const rightWall = isWallSide(config.mount, 'right')
    const niche = leftWall && rightWall
    const side = rightWall && !leftWall ? -1 : 1
    const positions: Record<CameraView, [number, number, number]> = {
      // Fülkében a két házszárny miatt távolabbról és magasabbról nézünk be (kis méretnél is).
      perspective: niche
        ? [Math.max(config.width, 4) * 0.38, config.height * 1.9 + 2.2, Math.max(config.depth, 4) * 1.6 + Math.max(config.width, 4.5) * 0.85 + 4.4]
        : [side * (config.width * 1.3 + 3.4), config.height * 1.7 + 1.4, config.depth * 1.5 + config.width * 0.75 + 3],
      front: [0, config.height * 1.15, size * 2.65],
      top: [0.01, size * 2.2, 0.01],
      // Alulról: meredeken (kb. 50°) felfelé, a lamellák dőlésével egy irányba — laposabb
      // szögből a lamellasor fizikailag is zárt felületnek látszik, így viszont átlátszik az ég.
      interior: [0, 0.82, -config.depth * 0.22],
      detail: niche ? [config.width / 2 - 1.25, config.height - 0.45, config.depth / 2 + 2.1] : [side * (config.width / 2 + 0.75), config.height + 0.45, config.depth / 2 + 0.85],
      sofa: [eyeX, 1.18, eyeZ],
    }
    destination.current.set(...positions[view])
    if (view === 'sofa') target.current.set(0, 1.22, config.depth / 2 + 6)
    else if (view === 'detail') target.current.set(niche ? config.width / 2 - 0.3 : side * config.width / 2, config.height, config.depth / 2)
    else if (view === 'interior') target.current.set(0, config.height, config.depth * 0.16)
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
      beginMove()
    }
    invalidate()
  }, [view, config.width, config.depth, config.height, config.mount, furniture, camera, invalidate, beginMove])
  useEffect(() => { applyView() }, [applyView])

  useEffect(() => { if (revealed) invalidate() }, [revealed, invalidate])

  // Ha a felhasználó megfogja a kamerát, az automatikus mozgás azonnal átadja az irányítást.
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const takeOver = () => { if (!firstFlight.current) transitioning.current = false }
    c.addEventListener('start', takeOver)
    return () => c.removeEventListener('start', takeOver)
  }, [view])

  // Mobilon a félig nyitott alsó lap mögé ne kerüljön a pergola: a képet feljebb toljuk (nézet-eltolás).
  const size = useThree((state) => state.size)
  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera
    if (viewShift > 0) perspectiveCamera.setViewOffset(size.width, size.height, 0, Math.round(size.height * viewShift), size.width, size.height)
    else perspectiveCamera.clearViewOffset()
    perspectiveCamera.updateProjectionMatrix()
    invalidate()
  }, [viewShift, size.width, size.height, camera, invalidate])

  // Egyszeri fókusz: a kiválasztott oldal elé fordul (enyhén oldalról és felülről, hogy a mélység is
  // látsszon), vagy bemutató körbeforgás. A felhasználó bármikor átveheti az irányítást.
  const showcase = useRef(0)
  const focusId = focus?.id
  useEffect(() => {
    if (!focus || view === 'sofa') return
    const { width: w, depth: d, height: h } = config
    if (focus.kind === 'overview' || focus.kind === 'showcase') {
      // Előbb vissza az áttekintő állásba (egy korábbi oldalfókusz után is), bemutatónál utána lassú körbeforgás.
      applyView()
      showcase.current = focus.kind === 'showcase' && !REDUCED ? 7.5 : 0
      idle.current = 0
      return
    }
    const side = focus.side
    if (isWallSide(config.mount, side)) return
    const horizontal = side === 'front' || side === 'back'
    const length = horizontal ? w : d
    const normal = new THREE.Vector3(side === 'left' ? -1 : side === 'right' ? 1 : 0, 0, side === 'front' ? 1 : side === 'back' ? -1 : 0)
    const tangent = new THREE.Vector3(-normal.z, 0, normal.x)
    const center = new THREE.Vector3(normal.x * (w / 2), h * 0.48, normal.z * (d / 2))
    const distance = Math.max(6.4, length * 1.25 + 3.4) * (window.innerWidth < 820 ? 1.3 : 1)
    // A célpont a kiválasztott oldal és a pergola közepe között: az oldal kerül előtérbe, de a teljes szerkezet a képben marad.
    target.current.copy(center).multiplyScalar(0.62).setY(h * 0.45)
    destination.current.copy(center).addScaledVector(normal, distance).addScaledVector(tangent, distance * 0.38)
    destination.current.y = h * 1.05 + 1.3
    beginMove()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- csak új fókuszkérésre fusson
  }, [focusId])

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
    // A berepülés csak akkor induljon, amikor a betöltőkép már eltűnt.
    if (transitioning.current && firstFlight.current && !revealed) return
    if (transitioning.current) {
      if (REDUCED) { camera.position.copy(destination.current); controls.current.target.copy(target.current); transitioning.current = false }
      else {
        const m = move.current
        if (!m.started) {
          m.from.copy(camera.position); m.fromTarget.copy(controls.current.target)
          m.dur = firstFlight.current ? 3.4 : THREE.MathUtils.clamp(0.8 + m.from.distanceTo(destination.current) * 0.045, 0.9, 1.7)
          m.fromDir.copy(m.from).sub(m.fromTarget)
          m.started = true
        }
        // Egy akadó képkocka ne ugorjon: a lépés felső korláttal lassít, nem ugrik.
        m.p = Math.min(1, m.p + Math.min(delta, 0.04) / m.dur)
        const t = m.p
        const e = firstFlight.current ? 1 - Math.pow(1 - t, 3) : t * t * t * (t * (t * 6 - 15) + 10)
        controls.current.target.copy(m.fromTarget).lerp(target.current, e)
        m.toDir.copy(destination.current).sub(target.current)
        const r0 = m.fromDir.length(); const r1 = m.toDir.length()
        m.tmp.copy(m.fromDir).normalize(); m.tmpT.copy(m.toDir).normalize()
        m.q.setFromUnitVectors(m.tmp, m.tmpT)
        const slerped = m.q2.identity().slerp(m.q, e)
        m.tmp.applyQuaternion(slerped).multiplyScalar(r0 + (r1 - r0) * e)
        camera.position.copy(controls.current.target).add(m.tmp)
        if (m.p >= 1) { camera.position.copy(destination.current); controls.current.target.copy(target.current); transitioning.current = false; firstFlight.current = false }
      }
      camera.position.set(camera.position.x, Math.max(0.28, camera.position.y), camera.position.z)
      controls.current.update(); invalidate()
    } else if (showcase.current > 0) {
      // Bemutató: egy lassú, ívelt fél kör a pergola körül, majd megáll.
      const step = Math.min(delta, 0.05)
      showcase.current -= step
      const offset = camera.position.clone().sub(controls.current.target)
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), step * 0.42 * Math.min(1, showcase.current / 1.2 + 0.15))
      camera.position.copy(controls.current.target).add(offset)
      controls.current.update(); invalidate()
    } else if (autoRotate && idle.current > 2 && autoFrame.current >= 1 / 30) { autoFrame.current = 0; invalidate() }
  })
  return <OrbitControls ref={controls} makeDefault enabled={view !== 'sofa'} enableDamping dampingFactor={0.07} minDistance={1.1} maxDistance={24} maxPolarAngle={view === 'interior' ? Math.PI * 0.86 : Math.PI / 1.98} autoRotate={autoRotate && view !== 'sofa'} autoRotateSpeed={0.4} onStart={() => { transitioning.current = false; firstFlight.current = false; showcase.current = 0; idle.current = 0 }} />
}

/** Az égbolt-képeken (HDR) a nap iránya: equirect u koordináta → szög az xz síkban. */
const HDR_SUN_ANGLE: Record<'day' | 'golden', number> = { day: (0.5947 - 0.5) * Math.PI * 2, golden: (0.25 - 0.5) * Math.PI * 2 }
const DEFAULT_ENV_ROTATION = Math.PI * 0.35

function getLighting(scene: SceneSettings) {
  if (scene.sunStudy) return getStudyLighting(scene)
  const t = scene.dayTime
  const night = t >= 20 || t < 7
  const golden = t >= 17 && t < 20
  const daylight = THREE.MathUtils.clamp(Math.sin(((t - 6) / 14) * Math.PI), 0, 1)
  const sunAngle = ((t - 6) / 14) * Math.PI
  return {
    night,
    hdr: night ? HDR_FILES.night : golden ? HDR_FILES.golden : HDR_FILES.day,
    fog: night ? '#17252e' : golden ? '#b09a88' : '#c3cdce',
    sun: night ? '#b5cff2' : golden ? '#ffc890' : '#fff4e2',
    // Erős, irányított napfény és visszafogottabb szórt fény: így a pergola, az oszlopok
    // és a lamellák valódi árnyékot vetnek (korábban a szórt fény szinte eltüntette).
    intensity: night ? 0.52 : golden ? 2.5 : 1.2 + daylight * 2.9,
    ambient: night ? 0.25 : 0.1 + daylight * 0.06,
    hemisphere: night ? 0.3 : 0.3,
    environment: night ? 0.68 : golden ? 0.72 : 0.72,
    exposure: night ? 0.96 : golden ? 0.86 : 0.86,
    position: [Math.cos(sunAngle) * 9, Math.max(0.8, Math.sin(sunAngle) * 10), 4] as [number, number, number],
    envRotation: DEFAULT_ENV_ROTATION,
    shadowExtent: 9,
  }
}

/**
 * Árnyékelemzés: a napfény iránya a valós napállásból (helyszín, nap, idő,
 * tájolás). Az égbolt-kép úgy fordul, hogy a rajta látható nap is erről az
 * oldalról süssön; a fény erőssége és színe a nap magasságát követi.
 */
function getStudyLighting(scene: SceneSettings) {
  const sun = studySun(scene)
  const elevation = sun.elevation
  const night = elevation < -4
  const golden = !night && elevation < 12
  const [x, y, z] = sunVectorInScene(sun, scene.facing)
  const strength = THREE.MathUtils.clamp(Math.sin(Math.max(elevation, 0) * Math.PI / 180) * 1.35, 0, 1)
  const kind = night ? null : golden ? 'golden' : 'day'
  const envRotation = kind ? HDR_SUN_ANGLE[kind] - Math.atan2(z, x) : DEFAULT_ENV_ROTATION
  const lit = elevation > 0
  return {
    night,
    hdr: night ? HDR_FILES.night : golden ? HDR_FILES.golden : HDR_FILES.day,
    fog: night ? '#17252e' : golden ? '#a69a90' : '#c3cdce',
    sun: night ? '#b5cff2' : golden ? (elevation < 5 ? '#ffc995' : '#ffe0bd') : '#ffffff',
    intensity: night ? 0.52 : !lit ? 0.35 : golden ? 1.1 + strength * 2.4 : 1.2 + strength * 2.9,
    ambient: night ? 0.25 : 0.1 + strength * 0.06,
    hemisphere: 0.3,
    environment: night ? 0.68 : 0.72,
    exposure: night ? 0.96 : 0.86,
    // Napnyugta után a fény már nem a horizont alól jön: halvány, magasról érkező szórt fény.
    position: (lit ? [x * 14, y * 14, z * 14] : [4, 9, 6]) as [number, number, number],
    envRotation,
    shadowExtent: 13,
  }
}

function ShadowBudget({ config, sunKey }: { config: PergolaConfig; sunKey: string }) {
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  // Az árnyéktérkép csak változáskor készül újra (akkumulátorkímélés) — ezért a
  // konfiguráció mellett a nap állásának és a nézetnek a változásakor is frissíteni kell.
  useEffect(() => {
    configureShadowBudget(gl)
    invalidate()
  }, [gl, config, sunKey, invalidate])
  return null
}

/** Iránytű a talajon (árnyékelemzésnél): az É jel a valós északot mutatja a megadott tájolás szerint. */
function CompassRose({ config, facing }: { config: PergolaConfig; facing: number }) {
  const [nx, , nz] = sunVectorInScene({ azimuth: 0, elevation: 0, trueElevation: 0 }, facing)
  const angle = Math.atan2(nx, nz)
  const left = isWallSide(config.mount, 'left')
  const position: [number, number, number] = [left ? config.width / 2 + 1.25 : -config.width / 2 - 1.25, 0.03, config.depth / 2 + 1.25]
  const arrow = useMemo(() => { const shape = new THREE.Shape(); shape.moveTo(0, 0.62); shape.lineTo(0.13, 0); shape.lineTo(0, 0.1); shape.lineTo(-0.13, 0); shape.closePath(); return new THREE.ShapeGeometry(shape) }, [])
  useEffect(() => () => arrow.dispose(), [arrow])
  return <group name="compass-rose" position={position} rotation={[0, angle, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.5, 0.54, 64]} /><meshBasicMaterial color="#d8ff72" transparent opacity={0.85} toneMapped={false} /></mesh>
    {[0, 1, 2, 3].map((index) => <mesh key={index} rotation={[-Math.PI / 2, 0, (index * Math.PI) / 2]}><planeGeometry args={[0.02, 1.2]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.45} toneMapped={false} /></mesh>)}
    <mesh geometry={arrow} rotation={[-Math.PI / 2, 0, Math.PI]} position={[0, 0.004, 0]}><meshBasicMaterial color="#d8ff72" toneMapped={false} side={THREE.DoubleSide} /></mesh>
    <Html position={[0, 0.05, 0.84]} center className="compass-label">É</Html>
    <Html position={[0, 0.05, -0.8]} center className="compass-label is-minor">D</Html>
  </group>
}

/**
 * A köd a kamerával együtt távolodik: a ház és a pergola távolról nézve sem
 * fakul ki, a köd csak a horizontot és a talaj szélét olvasztja az égbe.
 */
function FogFollow() {
  useFrame(({ camera, scene, controls }) => {
    const fog = scene.fog
    if (!(fog instanceof THREE.Fog)) return
    const target = (controls as unknown as { target?: THREE.Vector3 } | null)?.target
    const distance = target ? camera.position.distanceTo(target) : camera.position.length()
    const near = distance + 9
    const far = distance + 34
    if (Math.abs(fog.near - near) > 0.05 || Math.abs(fog.far - far) > 0.05) { fog.near = near; fog.far = far }
  })
  return null
}

// ?debug=1 → teljesítménymérő: rajzolási hívások, háromszögek, textúrák, geometriák és a renderelt képkockák (fps) a nézet sarkában.
const PERF_DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'
function PerfProbe({ quality }: { quality: QualitySettings }) {
  const box = useRef<HTMLDivElement | null>(null)
  const frames = useRef({ count: 0, last: 0, fps: 0 })
  useEffect(() => {
    const element = document.createElement('div')
    element.dataset.perfProbe = 'true'
    element.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;padding:6px 9px;border-radius:6px;background:rgba(0,0,0,.78);color:#9ff;font:11px/1.45 ui-monospace,monospace;pointer-events:none;white-space:pre'
    document.body.appendChild(element)
    box.current = element
    return () => { element.remove(); box.current = null }
  }, [])
  const breakdown = useRef<string>('')
  useFrame(({ gl, scene }) => {
    const stats = frames.current
    if (!breakdown.current && gl.info.render.frame > 40) {
      const totals = new Map<string, number>()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (!mesh.isMesh || !mesh.visible) return
        const geometry = mesh.geometry
        const triangles = (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3 * ((mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh).count : 1)
        let label = ''
        for (let node: THREE.Object3D | null = mesh; node; node = node.parent) if (node.name) { label = node.name; break }
        totals.set(label || '(névtelen)', (totals.get(label || '(névtelen)') ?? 0) + triangles)
      })
      breakdown.current = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => `${name}: ${Math.round(count / 1000)}k`).join(' | ')
      ;(window as unknown as { __perfTop?: string }).__perfTop = breakdown.current
    }
    stats.count += 1
    const now = performance.now()
    if (!stats.last) stats.last = now
    if (now - stats.last >= 500) { stats.fps = Math.round((stats.count * 1000) / (now - stats.last)); stats.count = 0; stats.last = now }
    const { render, memory } = gl.info
    const data = { tier: quality.tier, fps: stats.fps, calls: render.calls, triangles: render.triangles, textures: memory.textures, geometries: memory.geometries }
    ;(window as unknown as { __perf?: typeof data }).__perf = data
    if (box.current) box.current.textContent = `${data.tier} · ${data.fps} fps\ncalls ${data.calls} · tri ${(data.triangles / 1000).toFixed(0)}k\ntex ${data.textures} · geo ${data.geometries}`
  })
  return null
}

function SceneRegistration() {
  const scene = useThree((state) => state.scene)
  const store = useThree((state) => state.get)
  useEffect(() => { setActiveScene(scene); return () => setActiveScene(null) }, [scene])
  // Ajánlat-/PDF-kép: rövid időre 2× pixelarány (max. 3000 px széles), kirajzolás után visszaáll a megszokott felbontás.
  useEffect(() => {
    setHiResRenderer(async (ratio) => {
      const { gl, size, setDpr, viewport, invalidate } = store()
      const previous = viewport.dpr
      const target = Math.max(previous, Math.min(ratio, 3000 / Math.max(1, size.width), 3))
      setDpr(target)
      refreshShadows(gl)
      for (let frame = 0; frame < 3; frame++) { invalidate(); await new Promise<void>((resolve) => requestAnimationFrame(() => resolve())) }
      ;(window as unknown as { __hiResRestore?: () => void }).__hiResRestore = () => setDpr(previous)
    })
    return () => setHiResRenderer(null)
  }, [store])
  return null
}

function SceneContent({ config, scene, view, focus, viewShift = 0, revealed = true, quality, coreOnly, onSideSelect, onSceneChange, onShade }: { config: PergolaConfig; scene: SceneSettings; view: CameraView; focus?: CameraFocus | null; viewShift?: number; revealed?: boolean; quality: QualitySettings; coreOnly: boolean; onSideSelect?: (side: SideKey) => void; onSceneChange: (patch: Partial<SceneSettings>) => void; onShade?: (result: ShadeResult) => void }) {
  const lighting = getLighting(scene)
  // Az árnyékkamera a pergolára és a közvetlen környezetére illeszkedik: ugyanazon a felbontáson élesebb árnyék.
  const shadowExtent = scene.sunStudy || scene.photoMode ? lighting.shadowExtent : Math.min(lighting.shadowExtent, Math.max(7, Math.max(config.width, config.depth) / 2 + 4.5))
  const houseLook = useMemo<HouseLook>(() => ({ wallFinish: scene.wallFinish, wallColor: scene.wallColor, windowColor: scene.windowColor }), [scene.wallFinish, scene.wallColor, scene.windowColor])
  useFrame(({ gl }) => { if (gl.toneMappingExposure !== lighting.exposure) gl.toneMappingExposure = lighting.exposure })
  // Fotó módban a pergola csoportját a PhotoRig mozgatja (húzás, csippentés, forgatás); itt csak a kiinduló értékek.
  const { photoX, photoY, photoScale, photoRotation, photoTilt } = scene
  const placement = useMemo(() => ({ photoX, photoY, photoScale, photoRotation, photoTilt }), [photoX, photoY, photoScale, photoRotation, photoTilt])
  const pergola = <group name={PHOTO_GROUP} position={scene.photoMode ? [scene.photoX, scene.photoY, 0] : [0, 0, 0]} rotation={[0, scene.photoMode ? THREE.MathUtils.degToRad(scene.photoRotation) : 0, 0]} scale={scene.photoMode ? scene.photoScale : 1}><PergolaModel config={config} scene={scene} onSideSelect={onSideSelect} onSceneChange={onSceneChange} />{scene.photoMode && <ShadowCatcher size={Math.max(config.width, config.depth) + 6} opacity={lighting.night ? 0.25 : 0.42} />}{!scene.photoMode && !coreOnly && <OptionalSceneAsset name="terrace furniture"><Furniture config={config} scene={scene} hideZone={view === 'sofa'} /></OptionalSceneAsset>}</group>
  return <>
    <ShadowBudget config={config} sunKey={`${lighting.position.join(',')}|${lighting.intensity}|${scene.photoMode}|${scene.wallFinish}|${scene.wallColor}|${scene.windowColor}`} />
    {!scene.photoMode && <><fog attach="fog" args={[lighting.fog, 20, 43]} /><FogFollow /></>}
    <ambientLight intensity={lighting.ambient} /><hemisphereLight args={[lighting.night ? '#9fb8d6' : '#cfdce6', lighting.night ? '#2f3338' : '#5a4d3f', lighting.hemisphere]} /><directionalLight key={shadowExtent} position={lighting.position} color={lighting.sun} intensity={lighting.intensity} castShadow shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]} shadow-radius={quality.shadowRadius} shadow-blurSamples={quality.shadowRadius > 2 ? 16 : 8} shadow-camera-left={-shadowExtent} shadow-camera-right={shadowExtent} shadow-camera-top={shadowExtent} shadow-camera-bottom={-shadowExtent} shadow-bias={-0.0001} shadow-normalBias={0.009} />
    {lighting.night && <><directionalLight position={[5, 6, 8]} color="#b7d5f2" intensity={1.05} /><directionalLight position={[-6, 4, -3]} color="#8fb5dc" intensity={0.62} /></>}
    {!coreOnly && <OptionalSceneAsset name={`${scene.time} HDR environment`}><Environment files={wantsSmallHdr(quality.tier) ? smallHdr(lighting.hdr) : lighting.hdr} background={!scene.photoMode} backgroundBlurriness={0.1} backgroundIntensity={lighting.night ? 0.42 : 0.68} environmentIntensity={lighting.environment * quality.environmentIntensity} environmentRotation={[0, lighting.envRotation, 0]} /></OptionalSceneAsset>}
    {!scene.photoMode && <Ground scene={scene} />}
    {!scene.photoMode && sideWalls(config.mount).length > 0 && <HouseWings config={config} look={houseLook} night={lighting.night} />}
    {!scene.photoMode && !coreOnly && <><OptionalSceneAsset name="terrace decking"><Deck config={config} /></OptionalSceneAsset><Neighborhood config={config} scene={scene} /><OptionalSceneAsset name="garden planting"><Garden config={config} scene={scene} quality={quality} /></OptionalSceneAsset><OptionalSceneAsset name="architectural house"><House config={config} look={houseLook} night={lighting.night} /></OptionalSceneAsset>{lighting.night && <Stars />}</>}
    {pergola}
    {!scene.photoMode && <ContactShadows key={`${config.width}-${config.depth}-${config.height}-${config.mount}`} position={[0, 0.018, 0]} opacity={lighting.night ? 0.25 : 0.38} scale={Math.max(config.width, config.depth) + 3} blur={2.2} far={5} resolution={quality.contactShadowResolution} frames={1} color="#10171d" />}
    {scene.rain && <Rain config={config} quality={quality} />}
    {scene.sunStudy && !scene.photoMode && <CompassRose config={config} facing={scene.facing} />}
    {scene.sunStudy && !scene.photoMode && !coreOnly && onShade && <SceneAssetBoundary name="shade analysis"><Suspense fallback={null}><ShadeProbe config={config} scene={scene} onResult={onShade} /></Suspense></SceneAssetBoundary>}
    {!EFFECTS_DISABLED && !coreOnly && !scene.photoMode && quality.enablePostprocessing && <SceneAssetBoundary name="post-processing"><Suspense fallback={null}><SceneEffects ultra={quality.ultraEffects} night={lighting.night} vignette={quality.vignette} bloomScale={quality.bloomScale} /></Suspense></SceneAssetBoundary>}
    {scene.photoMode
      ? <PhotoRig config={config} placement={placement} onCommit={(next) => onSceneChange(next)} />
      : <CameraController view={view} focus={focus ?? null} viewShift={viewShift} revealed={revealed} config={config} autoRotate={scene.autoRotate} furniture={scene.furniture} />}
  </>
}

/** WebGL elérhetősége: egy eldobható vásznon próbáljuk (egyszer, gyorsítótárazva). */
let webglOk: boolean | undefined
function webglSupported() {
  if (webglOk !== undefined) return webglOk
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    webglOk = Boolean(gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { webglOk = false }
  return webglOk
}

/** 3D nélküli tartalék: a konfigurált pergola méretarányos rajza (a PDF-rajzzal azonos adatból). */
function FallbackDrawing({ config }: { config: PergolaConfig }) {
  const { tenant } = useTenant()
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let alive = true
    // A rajzoló csak hibánál töltődik be: a normál indulást nem terheli.
    import('@/lib/drawing').then(({ technicalDrawing }) => {
      if (alive) setSvg(technicalDrawing(config, { brand: tenant.brand.name, contact: '', title: 'Pergola – méretarányos rajz', code: getSpecCode(config), date: new Date().toLocaleDateString('hu-HU'), notes: [] }).svg)
    }).catch(() => { if (alive) setSvg('') })
    return () => { alive = false }
  }, [config, tenant.brand.name])
  if (!svg) return null
  return <div className="fallback-drawing" aria-label="A konfigurált pergola méretarányos rajza" dangerouslySetInnerHTML={{ __html: svg }} />
}


/** Felépülő pergola: oszlopok nőnek, gerenda csúszik be, lamellák sorban jelennek meg. Tiszta CSS, ismétlődő hurok. */
function BuildAnim() {
  return <svg className="build-anim" viewBox="0 0 120 56" aria-hidden="true">
    <line className="ba-ground" x1="6" y1="50" x2="114" y2="50" />
    <rect className="ba-post" x="20" y="14" width="3.4" height="36" style={{ animationDelay: '0s' }} />
    <rect className="ba-post" x="96.6" y="14" width="3.4" height="36" style={{ animationDelay: '.15s' }} />
    <rect className="ba-beam" x="16" y="10" width="88" height="4" />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} className="ba-louver" x={26 + i * 10.2} y="14.6" width="7.4" height="1.6" style={{ animationDelay: `${.9 + i * .12}s` }} />)}
  </svg>
}

function ScenePoster({ message, onRetry, percent, leaving = false, config }: { message?: string; onRetry?: () => void; percent?: number; leaving?: boolean; config?: PergolaConfig }) {
  const { progress: loaderProgress } = useProgress()
  const progress = percent ?? loaderProgress
  const { tenant } = useTenant()
  const failed = Boolean(onRetry) || Boolean(config)
  return <div className={`scene-poster${failed ? ' is-error' : ''}${leaving ? ' is-leaving' : ''}`} role={failed ? 'alert' : 'status'} aria-live="polite">
    {failed ? <img className="scene-poster-image" src={assetUrl('/assets/pergo-hero.webp')} alt={`${tenant.brand.name} pergola statikus előnézete`} /> : <div className="poster-skeleton"><span /><span /><span /><span /></div>}
    <div className="branded-loader"><div className="loader-brand">{tenant.demo ? <LamelixLogo height={30} title={null} /> : <>{tenant.brand.name}{tenant.brand.suffix && <small> {tenant.brand.suffix}</small>}</>}</div>{!failed && <><BuildAnim /><div className="loader-track"><span style={{ width: `${Math.max(2, progress)}%` }} /></div></>}<div className="loader-status"><span>{message ?? 'Építészeti jelenet előkészítése'}</span>{!failed && <strong>{Math.round(progress)}%</strong>}</div>{failed && <p className="fallback-note">A konfigurálás, az árkalkuláció, a PDF és a felmérési kérelem 3D nélkül is teljes értékűen működik.</p>}{onRetry && <button type="button" className="scene-retry" onClick={onRetry}>3D újraindítása</button>}</div>
    {failed && config && <FallbackDrawing config={config} />}
  </div>
}

class SceneErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void; onFatal: () => void; config: PergolaConfig }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    log.error('Pergola 3D render failed', { error: error.message, stack: error.stack, componentStack: info.componentStack })
    this.props.onFatal()
  }
  render() {
    if (this.state.failed) return <ScenePoster message="A 3D nézet ezen az eszközön most nem érhető el. A konfigurációd megmaradt." onRetry={this.props.onRetry} config={this.props.config} />
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

/**
 * Futásidejű védőháló: ha a megjelenítés tartósan lassabb ~38 fps-nél (forgatás/animáció közben), automatikus
 * minőségnél egy szinttel lejjebb lép (az utófeldolgozás, a felbontás és az árnyék is könnyebb lesz). Csak lefelé
 * lép, és megjegyzi az eszközön, így a következő megnyitásnál már a jó szinten indul. Állóképnél (nincs képkocka) nem mér.
 */
function FrameGovernor({ enabled, onSlow }: { enabled: boolean; onSlow: () => void }) {
  const window_ = useRef({ sum: 0, count: 0, slow: 0, since: 0 })
  useFrame(({ clock }, delta) => {
    if (!enabled) return
    const w = window_.current
    if (!w.since) w.since = clock.elapsedTime
    // Az első másodpercekben shader-fordítás és berepülés zajlik: ezt nem mérjük.
    if (clock.elapsedTime - w.since < 3) return
    // Hosszú szünet (állókép, háttérfül) után az első képkocka nem számít.
    if (delta > 0.25) { w.sum = 0; w.count = 0; return }
    w.sum += delta
    w.count += 1
    if (w.count < 45) return
    const average = w.sum / w.count
    w.sum = 0
    w.count = 0
    w.slow = average > 0.026 ? w.slow + 1 : 0
    if (w.slow >= 2) { w.slow = 0; onSlow() }
  })
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

export default memo(function PergolaScene({ config, scene, view, focus = null, viewShift = 0, onSideSelect, onSceneChange, onShade }: { config: PergolaConfig; scene: SceneSettings; view: CameraView; focus?: CameraFocus | null; viewShift?: number; onSideSelect?: (side: SideKey) => void; onSceneChange: (patch: Partial<SceneSettings>) => void; onShade?: (result: ShadeResult) => void }) {
  const [ready, setReady] = useState(false)
  const [decorativeReady, setDecorativeReady] = useState(false)
  // A nézet csak akkor tárul fel, ha a ház és a környezet is betöltött: addig 0–100% töltőképernyő fedi a jelenetet.
  const { active: assetsLoading, progress: assetProgress } = useProgress()
  const [houseReady, setHouseReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [posterGone, setPosterGone] = useState(false)
  const [shownProgress, setShownProgress] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [contextLost, setContextLost] = useState(false)
  const [coreOnly, setCoreOnly] = useState(false)
  const detectedTier = useMemo(() => detectQualityTier(), [])
  const [degradedTier, setDegradedTier] = useState<QualityTier | null>(() => readTierCap())
  const baseTier = resolveQualityTier(scene.quality, detectedTier)
  // Csak automatikus minőségnél: a kézzel választott szintet nem írjuk felül.
  const activeTier = scene.quality === 'auto' && degradedTier && tierRank(degradedTier) < tierRank(baseTier) ? degradedTier : baseTier
  const quality = useMemo(() => qualitySettings(activeTier), [activeTier])
  const onSlow = useCallback(() => {
    if (scene.quality !== 'auto') return
    const next = lowerTier(activeTier)
    if (next === activeTier) return
    log.warn('Pergola scene too slow, lowering quality', { from: activeTier, to: next })
    writeTierCap(next)
    setDegradedTier(next)
  }, [scene.quality, activeTier])
  useEffect(() => { prefetchSceneAssets(scene) }, [scene])
  const onReady = useMemo(() => () => setReady(true), [])
  const onContextLost = useMemo(() => () => { setReady(false); setLoaded(false); setPosterGone(false); setContextLost(true) }, [])
  const onFatal = useMemo(() => () => {
    if (coreOnly) return
    setCoreOnly(true)
    setReady(false)
    setLoaded(false)
    setPosterGone(false)
    setDecorativeReady(false)
    setAttempt((value) => value + 1)
  }, [coreOnly])
  const retry = useMemo(() => () => {
    setCoreOnly(false)
    setReady(false)
    setLoaded(false)
    setPosterGone(false)
    setDecorativeReady(false)
    setContextLost(false)
    setAttempt((value) => value + 1)
  }, [])
  useEffect(() => {
    if (!ready || decorativeReady || contextLost) return
    const timer = window.setTimeout(() => setDecorativeReady(true), 180)
    return () => window.clearTimeout(timer)
  }, [ready, decorativeReady, contextLost])
  useEffect(() => {
    let alive = true
    getHouseAsset().then(() => { if (alive) setHouseReady(true) }, () => { if (alive) setHouseReady(true) })
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (!ready || !decorativeReady || !houseReady || assetsLoading || loaded) return
    const timer = window.setTimeout(() => setLoaded(true), 600)
    return () => window.clearTimeout(timer)
  }, [ready, decorativeReady, houseReady, assetsLoading, loaded])
  useEffect(() => {
    if (!ready || loaded) return
    const timer = window.setTimeout(() => setLoaded(true), 25000)
    return () => window.clearTimeout(timer)
  }, [ready, loaded])
  useEffect(() => {
    if (!loaded) return
    const timer = window.setTimeout(() => setPosterGone(true), 800)
    return () => window.clearTimeout(timer)
  }, [loaded])
  const progressTarget = Math.min(99, Math.round(assetProgress))
  if (progressTarget > shownProgress) setShownProgress(progressTarget)
  const coreScene = coreOnly || !decorativeReady
  if (!webglSupported()) return <div className="scene-canvas-wrap" data-scene-ready="false"><ScenePoster message="Ez az eszköz nem támogatja a 3D nézetet. A konfigurálás, az ár és az ajánlatkérés így is teljes értékű." config={config} /></div>
  return <div className="scene-canvas-wrap" data-scene-ready={loaded}>
    {!posterGone && !contextLost && <ScenePoster percent={loaded ? 100 : shownProgress} leaving={loaded} />}
    {contextLost && <ScenePoster message="A grafikai kapcsolat megszakadt. A konfigurációd megmaradt." onRetry={retry} config={config} />}
    <SceneErrorBoundary key={`boundary-${attempt}`} onRetry={retry} onFatal={onFatal} config={config}>
      <Canvas
        key={`canvas-${attempt}`}
        frameloop="demand"
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={quality.dpr}
        camera={{ position: REDUCED ? [12, 7, 14] : [30, 21, 34], fov: window.innerWidth < 820 ? 48 : 38, near: 0.1, far: 90 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        performance={{ min: 0.55 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping
          gl.toneMappingExposure = 0.88
          gl.shadowMap.autoUpdate = false
          refreshShadows(gl)
          gl.domElement.dataset.pergolaCanvas = 'true'
          gl.domElement.setAttribute('aria-label', 'Interaktív, valósághű 3D pergola. Forgatás egérrel vagy érintéssel.')
          gl.domElement.setAttribute('role', 'img')
        }}
      >
        <WebGLContextGuard onLost={onContextLost} />
        <SceneRegistration />
        {PERF_DEBUG && <PerfProbe quality={quality} />}
        <QualityContext.Provider value={quality}><Suspense fallback={null}>
          <SceneContent
            config={config}
            scene={coreScene ? { ...scene, showPerson: false } : scene}
            view={view}
            focus={focus}
            viewShift={viewShift}
            revealed={loaded}
            quality={quality}
            coreOnly={coreScene}
            onSideSelect={onSideSelect}
            onSceneChange={onSceneChange}
            onShade={onShade}
          />
        </Suspense></QualityContext.Provider>
        <FrameGovernor enabled={loaded && scene.quality === 'auto'} onSlow={onSlow} />
        <FirstFrameReady onReady={onReady} />
      </Canvas>
    </SceneErrorBoundary>
  </div>
})
