// Kiegészítő 3D-elem: napelemes tető.
import { useMemo } from 'react'
import * as THREE from 'three'
import { PANEL, panelLayout } from '@/lib/solar'
import type { PergolaConfig } from '@/types/pergola'

const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
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
