// Személyautó a carport alá: paraméteres, de valós arányú modern szedán/kombi (4,55 × 1,83 × 1,45 m).
// A karosszéria oldalsziluettből kihúzott, lekerekített élű test (kerékjárati ívekkel), üvegezett utastér
// tetőpanellel és oszlopokkal, könnyűfém felni küllőkkel és féktárcsával, LED fényszóró és teljes szélességű hátsó lámpasor.
// Egy autó ~25 rajzolási hívás; a geometriák modul-szinten, egyszer épülnek.
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

const LENGTH = 4.55
const WIDTH = 1.83
const WHEEL_R = 0.34
const AXLE_FRONT = 1.4
const AXLE_REAR = -1.36
/** Lekerekített váll: a karosszéria oldala felül befelé ível (nem doboz). */
const BEVEL = 0.13
const CABIN_WIDTH = WIDTH - 0.2

type Geometries = { body: THREE.BufferGeometry; cabin: THREE.BufferGeometry; roof: THREE.BufferGeometry; tire: THREE.BufferGeometry; rim: THREE.BufferGeometry; spoke: THREE.BufferGeometry; disc: THREE.BufferGeometry; liner: THREE.BufferGeometry; box: THREE.BufferGeometry }
let cached: Geometries | null = null

/** Oldalprofil kihúzása a szélesség mentén, lekerekített élekkel; a hossz a z tengelyre kerül (orr: +z). */
function extrudeSide(shape: THREE.Shape, width: number, bevel: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 18 })
  geometry.translate(0, 0, -(width - 2 * bevel) / 2)
  geometry.rotateY(-Math.PI / 2)
  geometry.computeVertexNormals()
  return geometry
}

function geometries(): Geometries {
  if (cached) return cached
  const front = LENGTH / 2
  const rear = -LENGTH / 2
  // Alsó karosszéria: x = hossz (orr: +), y = magasság. A kerékjáratok az alsó élbe vágott ívek.
  const body = new THREE.Shape()
  body.moveTo(rear + 0.12, 0.24)
  body.lineTo(AXLE_REAR - 0.44, 0.24)
  body.absarc(AXLE_REAR, 0.34, 0.44, Math.PI, 0, true)
  body.lineTo(AXLE_FRONT - 0.44, 0.24)
  body.absarc(AXLE_FRONT, 0.34, 0.44, Math.PI, 0, true)
  body.lineTo(front - 0.16, 0.24)
  // orr: lökhárító, majd ívesen fel a motorháztetőre
  body.quadraticCurveTo(front, 0.26, front, 0.48)
  body.quadraticCurveTo(front - 0.02, 0.72, front - 0.32, 0.8)
  body.quadraticCurveTo(front - 0.9, 0.88, 0.82, 0.93)
  // ék alakú övvonal hátrafelé emelkedve, csomagtartó, hátsó lökhárító
  body.lineTo(-1.62, 1.01)
  body.quadraticCurveTo(rear + 0.12, 0.99, rear + 0.04, 0.88)
  body.quadraticCurveTo(rear - 0.02, 0.6, rear + 0.02, 0.42)
  body.quadraticCurveTo(rear + 0.02, 0.26, rear + 0.12, 0.24)
  // Utastér (üveg): szélvédő tövétől a tetőn át a hátsó ablakig.
  const cabin = new THREE.Shape()
  cabin.moveTo(0.92, 0.88)
  cabin.quadraticCurveTo(0.3, 1.32, 0.02, 1.4)
  cabin.lineTo(-0.95, 1.41)
  cabin.quadraticCurveTo(-1.32, 1.38, -1.72, 0.9)
  cabin.lineTo(0.92, 0.88)
  // Tetőpanel (karosszériaszín) a tetőn
  const roof = new THREE.Shape()
  roof.moveTo(0.06, 1.385)
  roof.lineTo(-0.98, 1.395)
  roof.quadraticCurveTo(-1.06, 1.44, -0.95, 1.455)
  roof.lineTo(0.02, 1.445)
  roof.quadraticCurveTo(0.12, 1.43, 0.06, 1.385)
  // Gumiabroncs: lekerekített keresztmetszet körbeforgatva (tengely: x)
  const tireProfile = [new THREE.Vector2(0.2, -0.11), new THREE.Vector2(0.29, -0.115), new THREE.Vector2(0.325, -0.1), new THREE.Vector2(WHEEL_R, -0.06), new THREE.Vector2(WHEEL_R, 0.06), new THREE.Vector2(0.325, 0.1), new THREE.Vector2(0.29, 0.115), new THREE.Vector2(0.2, 0.11)]
  const tire = new THREE.LatheGeometry(tireProfile, 36)
  tire.rotateZ(Math.PI / 2)
  const rim = new THREE.CylinderGeometry(0.205, 0.205, 0.05, 32, 1, true)
  rim.rotateZ(Math.PI / 2)
  const disc = new THREE.CylinderGeometry(0.16, 0.16, 0.03, 24)
  disc.rotateZ(Math.PI / 2)
  const spoke = new THREE.BoxGeometry(0.02, 0.19, 0.045)
  spoke.translate(0, 0.1, 0)
  // Kerékjárati takaró (sötét, félhenger) — a kivágott ív belseje
  // θ ∈ [0, π] → a Z körüli forgatás után a felső félhenger (y ≥ 0).
  const liner = new THREE.CylinderGeometry(0.43, 0.43, WIDTH - 0.24, 24, 1, true, 0, Math.PI)
  liner.rotateZ(Math.PI / 2)
  cached = {
    body: extrudeSide(body, WIDTH, BEVEL),
    cabin: extrudeSide(cabin, CABIN_WIDTH, 0.09),
    roof: extrudeSide(roof, CABIN_WIDTH - 0.08, 0.035),
    tire,
    rim,
    spoke,
    disc,
    liner,
    box: new THREE.BoxGeometry(1, 1, 1),
  }
  return cached
}

function Wheel({ x, z, mats }: { x: number; z: number; mats: Record<string, THREE.Material> }) {
  const g = geometries()
  const side = Math.sign(x)
  return <group position={[x, WHEEL_R, z]}>
    <mesh geometry={g.tire} material={mats.tire} castShadow />
    <mesh geometry={g.rim} material={mats.rim} position={[side * 0.07, 0, 0]} />
    <mesh geometry={g.disc} material={mats.dark} position={[side * 0.03, 0, 0]} />
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} geometry={g.spoke} material={mats.rim} position={[side * 0.085, 0, 0]} rotation={[(i * Math.PI * 2) / 5, 0, 0]} />)}
    <mesh geometry={g.box} material={mats.rim} position={[side * 0.09, 0, 0]} scale={[0.02, 0.06, 0.06]} />
  </group>
}

export default function Car({ color, position, rotation = 0 }: { color: string; position: [number, number, number]; rotation?: number }) {
  const g = geometries()
  const mats = useMemo(() => ({
    body: new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#0d1418', metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }),
    trim: new THREE.MeshStandardMaterial({ color: '#16191b', metalness: 0.2, roughness: 0.55 }),
    dark: new THREE.MeshStandardMaterial({ color: '#2a2d30', metalness: 0.6, roughness: 0.45 }),
    tire: new THREE.MeshStandardMaterial({ color: '#141617', roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: '#b9bec2', metalness: 0.9, roughness: 0.22 }),
    head: new THREE.MeshStandardMaterial({ color: '#f4f8fb', emissive: '#dbe9f5', emissiveIntensity: 0.6, roughness: 0.1 }),
    tail: new THREE.MeshStandardMaterial({ color: '#8f1712', emissive: '#c0221a', emissiveIntensity: 0.55, roughness: 0.25 }),
    plate: new THREE.MeshStandardMaterial({ color: '#eef0ee', roughness: 0.5 }),
    liner: new THREE.MeshStandardMaterial({ color: '#0e0f10', roughness: 0.95, side: THREE.BackSide }),
  }), [color])
  useEffect(() => () => Object.values(mats).forEach((material) => material.dispose()), [mats])
  const box = (key: string, material: THREE.Material, p: [number, number, number], s: [number, number, number], r: [number, number, number] = [0, 0, 0]) => <mesh key={key} geometry={g.box} material={material} position={p} scale={s} rotation={r} castShadow />
  const half = WIDTH / 2
  return <group position={position} rotation={[0, rotation, 0]} name="car">
    <mesh geometry={g.body} material={mats.body} castShadow receiveShadow />
    <mesh geometry={g.cabin} material={mats.glass} castShadow />
    <mesh geometry={g.roof} material={mats.body} castShadow />
    {/* Kerékjárati takarók */}
    {[AXLE_FRONT, AXLE_REAR].map((z) => <mesh key={z} geometry={g.liner} material={mats.liner} position={[0, 0.34, z]} />)}
    {/* Oszlopok: B-oszlop és a hátsó C-oszlop sávja karosszériaszínben */}
    {[-1, 1].flatMap((s) => [
      box(`b${s}`, mats.trim, [s * (CABIN_WIDTH / 2 + 0.004), 1.15, -0.32], [0.012, 0.46, 0.09]),
      box(`sill${s}`, mats.trim, [s * (half - 0.02), 0.3, 0.02], [0.03, 0.06, 2.0]),
      box(`seam1${s}`, mats.trim, [s * (half + 0.001), 0.66, 0.74], [0.004, 0.62, 0.006]),
      box(`seam2${s}`, mats.trim, [s * (half + 0.001), 0.66, -0.36], [0.004, 0.62, 0.006]),
      box(`handle1${s}`, mats.dark, [s * (half + 0.006), 0.88, 0.28], [0.012, 0.025, 0.16]),
      box(`handle2${s}`, mats.dark, [s * (half + 0.006), 0.88, -0.84], [0.012, 0.025, 0.16]),
      // Visszapillantó tükör
      box(`mirror${s}`, mats.body, [s * (half + 0.08), 1.02, 0.74], [0.16, 0.09, 0.12]),
    ])}
    {/* Elöl: LED fényszórók, nappali menetfény, hűtőrács, rendszám */}
    {[-1, 1].flatMap((s) => [
      box(`head${s}`, mats.head, [s * 0.62, 0.74, LENGTH / 2 - 0.13], [0.42, 0.06, 0.12], [0.2, 0, 0]),
      box(`fog${s}`, mats.trim, [s * 0.66, 0.38, LENGTH / 2 - 0.03], [0.22, 0.06, 0.03]),
    ])}
    {box('grille', mats.trim, [0, 0.52, LENGTH / 2 - 0.02], [0.92, 0.2, 0.04])}
    {box('plateF', mats.plate, [0, 0.4, LENGTH / 2 + 0.005], [0.5, 0.11, 0.01])}
    {/* Hátul: teljes szélességű lámpasor, rendszám, diffúzor */}
    {box('tail', mats.tail, [0, 0.86, -LENGTH / 2 + 0.05], [1.6, 0.06, 0.04])}
    {[-1, 1].map((s) => box(`tailc${s}`, mats.tail, [s * 0.74, 0.83, -LENGTH / 2 + 0.1], [0.24, 0.1, 0.06]))}
    {box('plateR', mats.plate, [0, 0.62, -LENGTH / 2 + 0.005], [0.5, 0.11, 0.01])}
    {box('diffuser', mats.trim, [0, 0.3, -LENGTH / 2 + 0.05], [1.3, 0.1, 0.06])}
    {[[-half + 0.13, AXLE_FRONT], [half - 0.13, AXLE_FRONT], [-half + 0.13, AXLE_REAR], [half - 0.13, AXLE_REAR]].map(([x, z]) => <Wheel key={`${x}:${z}`} x={x} z={z} mats={mats} />)}
  </group>
}
