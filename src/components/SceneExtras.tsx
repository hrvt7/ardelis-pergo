// Kiegészítő 3D-elemek: napelemes tető, téli hó (talaj, terasz, tető) és havazás.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { deckBounds } from '@/lib/deck'
import { isGlazedRoof } from '@/lib/roofs'
import { PANEL, panelLayout } from '@/lib/solar'
import type { PergolaConfig, QualityLevel } from '@/types/pergola'

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

/** A tető legfelső síkja (m) — a hóréteg és a havazás „padlója”. */
function roofTopY(config: Pick<PergolaConfig, 'height' | 'roof' | 'solar'>) {
  if (config.roof === 'fixed' && config.solar) return config.height + 0.3
  return config.height + (isGlazedRoof(config.roof) ? 0.245 : 0.21)
}

// ── Napelem ────────────────────────────────────────────────────────────────
let cellTexture: THREE.CanvasTexture | null = null
/** 108 félcellás modul mintázata: 6 × 18 cella, középen osztva, finom gyűjtősínekkel. */
function getCellTexture() {
  if (cellTexture) return cellTexture
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 400
  const context = canvas.getContext('2d')!
  context.fillStyle = '#c9d0d6'
  context.fillRect(0, 0, canvas.width, canvas.height)
  const cols = 6
  const rows = 18
  const margin = 6
  const gap = 2.2
  const cellW = (canvas.width - margin * 2 - gap * (cols - 1)) / cols
  const cellH = (canvas.height - margin * 2 - gap * (rows - 1) - 6) / rows
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    const x = margin + col * (cellW + gap)
    const y = margin + row * (cellH + gap) + (row >= rows / 2 ? 6 : 0)
    const shade = 18 + Math.round(seeded(row * cols + col, 3) * 8)
    context.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 22})`
    context.fillRect(x, y, cellW, cellH)
    context.fillStyle = 'rgba(160,170,185,.22)'
    for (let bus = 1; bus <= 4; bus += 1) context.fillRect(x + (cellW * bus) / 5, y, 0.8, cellH)
  }
  cellTexture = new THREE.CanvasTexture(canvas)
  cellTexture.colorSpace = THREE.SRGBColorSpace
  cellTexture.anisotropy = 8
  return cellTexture
}

export function SolarPanels({ config }: { config: PergolaConfig }) {
  const layout = useMemo(() => panelLayout(config), [config])
  const texture = useMemo(() => getCellTexture(), [])
  const [sx, sz] = layout.size
  const y = config.height + 0.255
  // Fekvő elrendezésnél a cellaminta 90°-kal elfordul (a modul hossza x irányba esik).
  const rotation = layout.portrait ? 0 : Math.PI / 2
  const rails = useMemo(() => {
    const zs = Array.from(new Set(layout.positions.map(([, z]) => Math.round(z * 1000) / 1000)))
    return zs.flatMap((z) => [z - sz * 0.28, z + sz * 0.28])
  }, [layout, sz])
  if (!layout.count) return null
  return <group name="solar-panels">
    {rails.map((z, index) => <mesh key={index} position={[0, config.height + 0.215, z]} castShadow><boxGeometry args={[Math.min(config.width - 0.3, layout.cols * (sx + PANEL.gap)), 0.04, 0.04]} /><meshStandardMaterial color="#9aa2a6" metalness={0.75} roughness={0.35} /></mesh>)}
    {layout.positions.map(([x, z], index) => <group key={index} position={[x, y, z]}>
      <mesh castShadow receiveShadow><boxGeometry args={[sx - 0.004, 0.035, sz - 0.004]} /><meshStandardMaterial color="#b5bcc1" metalness={0.8} roughness={0.32} /></mesh>
      <mesh position={[0, 0.0182, 0]} rotation={[-Math.PI / 2, 0, rotation]} receiveShadow>
        <planeGeometry args={layout.portrait ? [sx - 0.03, sz - 0.03] : [sz - 0.03, sx - 0.03]} />
        <meshPhysicalMaterial map={texture} roughness={0.18} metalness={0.15} clearcoat={1} clearcoatRoughness={0.06} envMapIntensity={1.1} />
      </mesh>
    </group>)}
  </group>
}

// ── Tél ────────────────────────────────────────────────────────────────────
let snowTexture: THREE.CanvasTexture | null = null
/** Finom, szemcsés hómintázat (ismétlődő), hogy a felület ne legyen műanyag hatású. */
function getSnowTexture() {
  if (snowTexture) return snowTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')!
  const image = context.createImageData(size, size)
  for (let index = 0; index < size * size; index += 1) {
    const value = 236 + Math.round(seeded(index, 7) * 19)
    image.data[index * 4] = value - 4
    image.data[index * 4 + 1] = value - 1
    image.data[index * 4 + 2] = Math.min(255, value + 3)
    image.data[index * 4 + 3] = 255
  }
  context.putImageData(image, 0, 0)
  snowTexture = new THREE.CanvasTexture(canvas)
  snowTexture.wrapS = snowTexture.wrapT = THREE.RepeatWrapping
  snowTexture.repeat.set(36, 36)
  snowTexture.colorSpace = THREE.SRGBColorSpace
  return snowTexture
}

function SnowMaterial({ repeat }: { repeat?: number }) {
  const map = useMemo(() => {
    const base = getSnowTexture()
    if (!repeat) return base
    const texture = base.clone()
    texture.repeat.set(repeat, repeat)
    texture.needsUpdate = true
    return texture
  }, [repeat])
  return <meshStandardMaterial map={map} color="#f6f8fa" roughness={0.93} metalness={0} envMapIntensity={0.55} />
}

export interface HouseRect { minX: number; maxX: number; minZ: number; maxZ: number }

/**
 * Hó a kertben: egy nagy felület, amelyből a ház és a terasz alaprajza ki van vágva;
 * a teraszon csak a tető alól kilógó részen van hó (a tető alatt száraz).
 */
export function SnowCover({ config, house, roofOpen }: { config: PergolaConfig; house: HouseRect | null; roofOpen: boolean }) {
  const deck = deckBounds(config)
  const geometry = useMemo(() => {
    const half = 48
    const shape = new THREE.Shape([new THREE.Vector2(-half, -half), new THREE.Vector2(half, -half), new THREE.Vector2(half, half), new THREE.Vector2(-half, half)])
    // A ShapeGeometry az x–y síkban van; -90°-os forgatás után y → -z, ezért a z-t negáljuk.
    const rect = (minX: number, maxX: number, minZ: number, maxZ: number) => new THREE.Path([new THREE.Vector2(minX, -maxZ), new THREE.Vector2(maxX, -maxZ), new THREE.Vector2(maxX, -minZ), new THREE.Vector2(minX, -minZ)].reverse())
    const overlaps = house && deck.minZ < house.maxZ
    if (house && overlaps) {
      // Falhoz rögzített pergolánál a terasz a házhoz ér: a két kivágás egy közös sokszög.
      const points: [number, number][] = [
        [house.minX, house.minZ], [house.maxX, house.minZ], [house.maxX, house.maxZ], [deck.maxX, house.maxZ],
        [deck.maxX, deck.maxZ], [deck.minX, deck.maxZ], [deck.minX, house.maxZ], [house.minX, house.maxZ],
      ]
      shape.holes.push(new THREE.Path(points.map(([x, z]) => new THREE.Vector2(x, -z)).reverse()))
    } else {
      shape.holes.push(rect(deck.minX, deck.maxX, deck.minZ, deck.maxZ))
      if (house) shape.holes.push(rect(house.minX, house.maxX, house.minZ, house.maxZ))
    }
    const result = new THREE.ShapeGeometry(shape, 1)
    // UV a világkoordinátából, hogy a minta mérete egyenletes legyen.
    const position = result.attributes.position as THREE.BufferAttribute
    const uv = new Float32Array(position.count * 2)
    for (let index = 0; index < position.count; index += 1) { uv[index * 2] = (position.getX(index) + half) / (half * 2); uv[index * 2 + 1] = (position.getY(index) + half) / (half * 2) }
    result.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return result
  }, [deck.minX, deck.maxX, deck.minZ, deck.maxZ, house])
  useEffect(() => () => geometry.dispose(), [geometry])

  // A teraszon: a tető vetületén kívüli sávok (nyitott/behúzott tetőnél az egész terasz).
  const strips = useMemo(() => {
    const t = 0.03
    const y = 0.012
    if (roofOpen) return [{ position: [deck.centerX, y, deck.centerZ] as [number, number, number], size: [deck.width, t, deck.depth] as [number, number, number] }]
    const items: { position: [number, number, number]; size: [number, number, number] }[] = []
    const front = config.depth / 2 + 0.12
    if (deck.maxZ > front) items.push({ position: [deck.centerX, y, (front + deck.maxZ) / 2], size: [deck.width, t, deck.maxZ - front] })
    const left = -config.width / 2 - 0.12
    const right = config.width / 2 + 0.12
    if (deck.minX < left) items.push({ position: [(deck.minX + left) / 2, y, (deck.minZ + front) / 2], size: [left - deck.minX, t, front - deck.minZ] })
    if (deck.maxX > right) items.push({ position: [(right + deck.maxX) / 2, y, (deck.minZ + front) / 2], size: [deck.maxX - right, t, front - deck.minZ] })
    return items
  }, [config.width, config.depth, deck, roofOpen])

  return <group name="snow-cover">
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, 0]} receiveShadow><SnowMaterial /></mesh>
    {strips.map((strip, index) => <RoundedBox key={index} args={strip.size} radius={0.012} smoothness={2} position={strip.position} receiveShadow><SnowMaterial repeat={2} /></RoundedBox>)}
  </group>
}

/** Hóréteg a zárt tetőn (lekerekített peremmel). */
export function RoofSnow({ config }: { config: PergolaConfig }) {
  const top = roofTopY(config)
  return <RoundedBox name="ar-skip-roof-snow" args={[config.width - 0.04, 0.075, config.depth - 0.04]} radius={0.035} smoothness={3} position={[0, top + 0.03, 0]} castShadow receiveShadow><SnowMaterial repeat={3} /></RoundedBox>
}

/** Havazás: lassan hulló, enyhén lengő pelyhek; a tető alatt nem esik. */
export function Snowfall({ config, quality, roofOpen }: { config: PergolaConfig; quality: QualityLevel; roofOpen: boolean }) {
  const count = quality === 'mobile' ? 260 : quality === 'ultra' ? 900 : 520
  const points = useRef<THREE.Points>(null)
  const lastUpdate = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  const top = roofTopY(config)
  const positions = useMemo(() => { const array = new Float32Array(count * 3); for (let i = 0; i < count; i++) { array[i * 3] = (seeded(i, 21) - 0.5) * 18; array[i * 3 + 1] = seeded(i, 22) * 8; array[i * 3 + 2] = (seeded(i, 23) - 0.5) * 16 } return array }, [count])
  useFrame(({ clock }) => {
    if (REDUCED || !points.current) return
    const elapsed = clock.elapsedTime
    if (elapsed - lastUpdate.current < 1 / 30) return
    const delta = Math.min(0.1, elapsed - lastUpdate.current)
    lastUpdate.current = elapsed
    const attribute = points.current.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      let y = attribute.getY(i) - delta * (0.55 + seeded(i, 24) * 0.45)
      const x = attribute.getX(i) + Math.sin(elapsed * 0.9 + i) * delta * 0.18
      const z = attribute.getZ(i)
      const underRoof = !roofOpen && Math.abs(x) < config.width / 2 && Math.abs(z) < config.depth / 2
      if (y < (underRoof ? top + 0.08 : 0.05)) y = 6.5 + seeded(i + Math.floor(elapsed), 25) * 1.5
      attribute.setXYZ(i, x, y, z)
    }
    attribute.needsUpdate = true
    invalidate()
  })
  return <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#ffffff" size={0.05} transparent opacity={0.9} depthWrite={false} /></points>
}
