// Kerítés és kapu 3D modell — valós rendszer-felépítéssel (docs/TERMEKADATOK.md, 2. fejezet):
// - mezőkiosztás: oszlop legfeljebb 2,0 m-enként, 80 × 80-as alu oszlop fedlappal, alapozott talppal vagy talplemezzel;
// - betét: profilos lamella (U-sínben), függőleges léc, átlós léc, klasszikus rúd, kovácsolt (íves, gyűrűs, lándzsahegyes), tömör;
// - lábazati beton szegély a mezők alatt;
// - kapu: keretes szárny azonos betéttel; tolókapu sínnel és görgőkkel, úszókapu farokrésszel és görgős kocsikkal,
//   kétszárnyú nyílókapu zsanérokkal és ejtőreteszel; motor, fogasléc, fotocellák, villogó; kiskapu kilinccsel és zárral; kaputelefon.
// Minden ismétlődő elem példányosított (InstancedMesh), egységgeometriából skálázva — nagy kerítésnél is gyors.
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three-stdlib'
import type { OutdoorConfig } from '@/types/catalog'
import { fenceSystemLength, PED_WIDTH } from '@/components/catalog/fenceLayout'

type Vec3 = [number, number, number]
export type FenceMaterialKey = 'frame' | 'infill' | 'hardware' | 'dark' | 'concrete' | 'glow' | 'amber' | 'screen'
export type FenceMaterials = Record<FenceMaterialKey, THREE.Material>
type Kind = 'box' | 'post' | 'lamella' | 'cone' | 'ring' | 'cyl'
type Part = { kind: Kind; mat: FenceMaterialKey; p: Vec3; s: Vec3; r?: Vec3 }

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Méretek (m). */
const POST = 0.08
const GATE_POST = 0.12
const MAX_FIELD = 2
const CURB_H = 0.08
const LEAF_FRAME = 0.05

// ── Egységgeometriák (egyszer jönnek létre, minden példány ezt skálázza) ──
let geometries: Record<Kind, THREE.BufferGeometry> | null = null
function getGeometries() {
  if (geometries) return geometries
  // Lamella-keresztmetszet: 1 egység magas, 0,22 mély, lekerekített „hajótest” profil (két enyhén domború oldallap).
  const shape = new THREE.Shape()
  const d = 0.11
  shape.moveTo(-d, -0.5)
  shape.lineTo(d * 0.7, -0.5)
  shape.quadraticCurveTo(d, -0.5, d, -0.42)
  shape.quadraticCurveTo(d * 1.18, 0, d, 0.42)
  shape.quadraticCurveTo(d, 0.5, d * 0.7, 0.5)
  shape.lineTo(-d * 0.7, 0.5)
  shape.quadraticCurveTo(-d, 0.5, -d, 0.42)
  shape.quadraticCurveTo(-d * 1.18, 0, -d, -0.42)
  shape.quadraticCurveTo(-d, -0.5, -d * 0.7, -0.5)
  const lamella = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 6 })
  lamella.rotateY(Math.PI / 2)
  lamella.translate(-0.5, 0, 0)
  lamella.computeVertexNormals()
  const cone = new THREE.ConeGeometry(0.5, 1, 4)
  cone.rotateY(Math.PI / 4)
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 18)
  geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    post: new RoundedBoxGeometry(1, 1, 1, 2, 0.12),
    lamella,
    cone,
    ring: new THREE.TorusGeometry(0.5, 0.07, 8, 28),
    cyl,
  }
  return geometries
}

/** Egy anyag × geometria példányosított hálója. */
function PartsMesh({ kind, material, parts }: { kind: Kind; material: THREE.Material; parts: Part[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = getGeometries()[kind]
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    parts.forEach((part, index) => {
      dummy.position.set(...part.p)
      dummy.rotation.set(...(part.r ?? [0, 0, 0]))
      dummy.scale.set(...part.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.count = parts.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [parts])
  // A geometria és az anyag tulajdonságként kerül a hálóra, nem konstruktor-argumentumként: anyagcserénél (szín, éjszaka)
  // így nem épül újra üres (egységmátrixos) példányokkal (lásd 3.89 – eltűnő lamellák).
  return <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, parts.length)]} geometry={geometry} material={material} castShadow receiveShadow />
}

/** Részek csoportosítása (geometria × anyag) és kirajzolása. */
function Parts({ parts, materials }: { parts: Part[]; materials: FenceMaterials }) {
  const groups = useMemo(() => {
    const map = new Map<string, { kind: Kind; mat: FenceMaterialKey; parts: Part[] }>()
    for (const part of parts) {
      const key = `${part.kind}|${part.mat}`
      if (!map.has(key)) map.set(key, { kind: part.kind, mat: part.mat, parts: [] })
      map.get(key)!.parts.push(part)
    }
    return [...map.entries()]
  }, [parts])
  // A kulcs a darabszámot is tartalmazza: a példányszám-változásnál új háló épül (az InstancedMesh kapacitása rögzített).
  return <>{groups.map(([key, group]) => <PartsMesh key={`${key}|${group.parts.length}`} kind={group.kind} material={materials[group.mat]} parts={group.parts} />)}</>
}

// ── Betétek: egy téglalap kitöltése a választott mintával (x0..x1, y0..y1, a z síkban) ──
function addInfill(out: Part[], style: OutdoorConfig['style'], x0: number, x1: number, y0: number, y1: number, z: number, mat: FenceMaterialKey = 'infill') {
  const w = x1 - x0
  const h = y1 - y0
  const cx = (x0 + x1) / 2
  if (w <= 0.04 || h <= 0.1) return
  if (style === 'horizontal' || style === 'privacy') {
    // Profilos lamellák: 100 mm-es lamella, 18 mm hézag; a tömör (privacy) változat hézag nélküli, nútos-csapos hatású.
    const lam = 0.1
    const gap = style === 'privacy' ? 0.003 : 0.018
    const pitch = lam + gap
    const count = Math.max(1, Math.floor((h + gap) / pitch))
    const start = y0 + (h - (count * pitch - gap)) / 2 + lam / 2
    for (let i = 0; i < count; i++) out.push({ kind: 'lamella', mat, p: [cx, start + i * pitch, z], s: [w, lam, style === 'privacy' ? 0.09 : 0.1] })
    return
  }
  if (style === 'vertical') {
    // Függőleges léc 60 × 20 mm, 22 mm hézaggal, két hátsó tartósínen.
    const slat = 0.06
    const gap = 0.022
    const count = Math.max(1, Math.floor((w + gap) / (slat + gap)))
    const start = x0 + (w - (count * (slat + gap) - gap)) / 2 + slat / 2
    for (let i = 0; i < count; i++) out.push({ kind: 'box', mat, p: [start + i * (slat + gap), (y0 + y1) / 2, z + 0.012], s: [slat, h, 0.02] })
    for (const y of [y0 + 0.14, y1 - 0.14]) out.push({ kind: 'box', mat: 'frame', p: [cx, y, z - 0.012], s: [w, 0.04, 0.03] })
    return
  }
  if (style === 'diagonal') {
    // Átlós léc 40°-ban, a keretre vágva: minden léc a téglalapra metszett szakasz.
    const angle = (40 * Math.PI) / 180
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const spacing = 0.13
    for (let c = -h / Math.tan(angle); c <= w; c += spacing) {
      // Szakasz: (x0 + c + t·dx, y0 + t·dy), t ≥ 0; vágás a téglalapra.
      const tMin = Math.max(0, (0 - c) / dx)
      const tMax = Math.min(h / dy, (w - c) / dx)
      if (tMax - tMin < 0.05) continue
      const tm = (tMin + tMax) / 2
      out.push({ kind: 'box', mat, p: [x0 + c + tm * dx, y0 + tm * dy, z], s: [tMax - tMin, 0.065, 0.02], r: [0, 0, angle] })
    }
    for (const y of [y0 + 0.02, y1 - 0.02]) out.push({ kind: 'box', mat: 'frame', p: [cx, y, z], s: [w, 0.04, 0.04] })
    return
  }
  // Rudas betétek: klasszikus (picket) és kovácsolt (ornamental).
  const ornamental = style === 'ornamental'
  const bar = ornamental ? 0.018 : 0.025
  const pitch = ornamental ? 0.12 : 0.11
  const count = Math.max(2, Math.floor(w / pitch))
  const step = w / count
  const railLow = y0 + (ornamental ? 0.12 : 0.15)
  const railHigh = y1 - (ornamental ? 0.32 : 0.25)
  for (let i = 0; i < count; i++) {
    const x = x0 + (i + 0.5) * step
    // Kovácsoltnál a rudak teteje enyhe ívet ír le (mezőnként), a klasszikusnál egyenes.
    const arch = ornamental ? 0.12 * Math.sin(Math.PI * (i + 0.5) / count) : 0
    const top = y1 - 0.08 + arch
    out.push({ kind: 'box', mat, p: [x, (y0 + top) / 2, z], s: [bar, top - y0, bar] })
    out.push({ kind: 'cone', mat, p: [x, top + (ornamental ? 0.06 : 0.045), z], s: [bar * (ornamental ? 2.6 : 2.2), ornamental ? 0.12 : 0.09, bar * (ornamental ? 2.6 : 2.2)] })
  }
  const rails = ornamental ? [railLow, railLow + 0.16, railHigh, railHigh + 0.16] : [railLow, railHigh]
  for (const y of rails) out.push({ kind: 'box', mat: 'frame', p: [cx, y, z], s: [w, ornamental ? 0.03 : 0.045, ornamental ? 0.022 : 0.03] })
  if (ornamental) {
    // Gyűrűk a felső és alsó sávban, minden második rúdköz közepén.
    for (let i = 1; i < count - 1; i += 2) {
      const x = x0 + (i + 1) * step
      for (const y of [railLow + 0.08, railHigh + 0.08]) out.push({ kind: 'ring', mat, p: [x, y, z], s: [0.13, 0.13, 0.13] })
    }
  }
}

/** Mezőkeret a lamellás/tömör betéthez: U-sín a két oszlopon, fedőprofil felül, alsó záróprofil. */
function addFieldFrame(out: Part[], style: OutdoorConfig['style'], x0: number, x1: number, y0: number, y1: number, z: number) {
  if (style !== 'horizontal' && style !== 'privacy') return
  const cx = (x0 + x1) / 2
  for (const x of [x0 + 0.0125, x1 - 0.0125]) out.push({ kind: 'box', mat: 'frame', p: [x, (y0 + y1) / 2, z], s: [0.025, y1 - y0 + 0.04, 0.034] })
  out.push({ kind: 'box', mat: 'frame', p: [cx, y1 + 0.017, z], s: [x1 - x0, 0.034, 0.042] })
  out.push({ kind: 'box', mat: 'frame', p: [cx, y0 - 0.012, z], s: [x1 - x0, 0.024, 0.038] })
}

function addPost(out: Part[], x: number, height: number, size: number, config: OutdoorConfig, z = 0) {
  out.push({ kind: 'post', mat: 'frame', p: [x, height / 2, z], s: [size, height, size] })
  out.push({ kind: 'box', mat: 'frame', p: [x, height + 0.006, z], s: [size + 0.014, 0.012, size + 0.014] })
  if (config.led) out.push({ kind: 'box', mat: 'glow', p: [x, height - 0.05, z + size / 2 + 0.002], s: [size * 0.55, 0.012, 0.004] })
  if (config.foundation) {
    out.push({ kind: 'box', mat: 'concrete', p: [x, 0.012, z], s: [size + 0.2, 0.024, size + 0.2] })
  } else {
    out.push({ kind: 'box', mat: 'hardware', p: [x, 0.006, z], s: [size + 0.1, 0.012, size + 0.1] })
    for (const bx of [-1, 1]) for (const bz of [-1, 1]) out.push({ kind: 'cyl', mat: 'hardware', p: [x + bx * (size / 2 + 0.03), 0.018, z + bz * (size / 2 + 0.03)], s: [0.016, 0.014, 0.016] })
  }
}

/** Egy kerítésszakasz: oszlopok legfeljebb 2 m-enként, mezők a betéttel, beton szegély alatta.
 *  A végoszlop méretét (kapuoszlop) a mezőszámítás figyelembe veszi; a kapuoszlopot a hívó rajzolja (draw* = false). */
function addRun(out: Part[], config: OutdoorConfig, start: number, end: number, startPost: number, endPost: number, drawStart = true, drawEnd = true) {
  const length = end - start
  if (length <= 0.2) return
  const fields = Math.max(1, Math.ceil(length / MAX_FIELD))
  const height = config.height
  const y0 = CURB_H + 0.04
  const y1 = height - 0.035
  out.push({ kind: 'box', mat: 'concrete', p: [(start + end) / 2, CURB_H / 2, 0], s: [length, CURB_H, 0.14] })
  for (let i = 0; i <= fields; i++) {
    const x = start + (length * i) / fields
    if ((i === 0 && !drawStart) || (i === fields && !drawEnd)) continue
    addPost(out, x, height + 0.04, i === 0 ? startPost : i === fields ? endPost : POST, config)
  }
  for (let i = 0; i < fields; i++) {
    const a = start + (length * i) / fields + (i === 0 ? startPost : POST) / 2
    const b = start + (length * (i + 1)) / fields - (i === fields - 1 ? endPost : POST) / 2
    addFieldFrame(out, config.style, a, b, y0, y1, 0)
    addInfill(out, config.style, a + (config.style === 'horizontal' || config.style === 'privacy' ? 0.012 : 0), b - (config.style === 'horizontal' || config.style === 'privacy' ? 0.012 : 0), y0, y1, 0)
  }
}

/** Kapuszárny (lokális koordinátában, középre igazítva): keret + betét. A farokrész (úszókapu) csak keret és merevítő. */
function leafParts(config: OutdoorConfig, width: number, height: number, bottom: number, tail = 0): Part[] {
  const out: Part[] = []
  const total = width + tail
  const x0 = -total / 2
  const x1 = total / 2
  const top = bottom + height
  const f = LEAF_FRAME
  // Keret
  out.push({ kind: 'box', mat: 'frame', p: [0, top - f / 2, 0], s: [total, f, f] })
  out.push({ kind: 'box', mat: 'frame', p: [0, bottom + f / 2, 0], s: [total, f, f] })
  for (const x of [x0 + f / 2, x1 - f / 2, ...(tail ? [x0 + tail] : [])]) out.push({ kind: 'box', mat: 'frame', p: [x, (bottom + top) / 2, 0], s: [f, height, f] })
  // Betét a szárny teljes nyílásrészén
  addInfill(out, config.style, x0 + tail + f, x1 - f, bottom + f + 0.01, top - f - 0.01, 0)
  // Farokrész átlós merevítője (úszókapu)
  if (tail) {
    const dx = tail - f
    const dy = height - 2 * f
    out.push({ kind: 'box', mat: 'frame', p: [x0 + f / 2 + dx / 2, (bottom + top) / 2, 0], s: [Math.hypot(dx, dy), 0.04, 0.04], r: [0, 0, Math.atan2(dy, dx)] })
  }
  return out
}

/** Az árnyéktérkép frissítése (a jelenet kézi árnyékfrissítéssel fut). */
function refreshShadow(renderer: THREE.WebGLRenderer) { renderer.shadowMap.needsUpdate = true }

function useLeafMotion(open: boolean, apply: (t: number) => void) {
  const progress = useRef(open ? 1 : 0)
  const lastShadow = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  useLayoutEffect(() => { apply(progress.current); invalidate() })
  useFrame(({ clock }, delta) => {
    const target = open ? 1 : 0
    const next = REDUCED ? target : THREE.MathUtils.damp(progress.current, target, 3.2, delta)
    if (Math.abs(next - progress.current) < 0.0004 && progress.current === target) return
    progress.current = Math.abs(next - target) < 0.0004 ? target : next
    apply(progress.current)
    if (clock.elapsedTime - lastShadow.current > 0.12 || progress.current === target) { refreshShadow(gl); lastShadow.current = clock.elapsedTime }
    invalidate()
  })
}

/** Tolókapu / úszókapu: a szárny a telek felőli oldalon, a bal kerítésszakasz mögé fut be. */
function SlidingGate({ config, materials, left, right, open }: { config: OutdoorConfig; materials: FenceMaterials; left: number; right: number; open: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const cantilever = config.gateType === 'cantilever'
  const opening = right - left - GATE_POST
  const leafWidth = opening + 0.16
  const tail = cantilever ? Math.max(1, opening * 0.42) : 0
  const bottom = cantilever ? 0.17 : 0.1
  const height = config.height - bottom - 0.02
  const z = -(GATE_POST / 2 + 0.07)
  const closedX = right - GATE_POST / 2 - 0.02 - (leafWidth + tail) / 2
  const travel = opening + 0.06
  useLeafMotion(open, (t) => { if (ref.current) ref.current.position.x = closedX - t * travel })
  const leaf = useMemo(() => {
    const parts = leafParts(config, leafWidth, height, bottom, tail)
    const total = leafWidth + tail
    if (cantilever) {
      // Alsó tartóprofil (C-profil) a teljes hosszon.
      parts.push({ kind: 'box', mat: 'hardware', p: [0, bottom - 0.05, 0], s: [total, 0.1, 0.08] })
    } else {
      // Futógörgők a szárny alatt.
      for (const x of [-total / 2 + 0.28, total / 2 - 0.28]) parts.push({ kind: 'cyl', mat: 'hardware', p: [x, 0.055, 0], s: [0.1, 0.035, 0.1], r: [Math.PI / 2, 0, 0] })
    }
    // Fogasléc a motorhoz.
    if (config.gateAutomation) parts.push({ kind: 'box', mat: 'dark', p: [0, bottom + 0.03, -0.035], s: [total - 0.1, 0.03, 0.02] })
    return parts
  }, [config, leafWidth, height, bottom, tail, cantilever])
  const fixed = useMemo(() => {
    const parts: Part[] = []
    const parkEnd = left - travel - tail - 0.2
    // Betonsáv a futás alatt; tolókapunál sín, úszókapunál két görgős kocsi.
    parts.push({ kind: 'box', mat: 'concrete', p: [(parkEnd + right) / 2, 0.01, z], s: [right - parkEnd, 0.02, 0.36] })
    if (cantilever) {
      for (const x of [left - 0.35, left - 0.35 - Math.min(tail * 0.85, 1.6)]) {
        parts.push({ kind: 'box', mat: 'concrete', p: [x, 0.03, z], s: [0.42, 0.06, 0.42] })
        parts.push({ kind: 'box', mat: 'dark', p: [x, 0.1, z], s: [0.24, 0.1, 0.16] })
      }
    } else {
      parts.push({ kind: 'box', mat: 'hardware', p: [(parkEnd + right) / 2, 0.03, z], s: [right - parkEnd, 0.022, 0.03] })
    }
    // Felső vezetőgörgő-tartó a bal kapuoszlopon, fogadóelem a jobb oldalon.
    parts.push({ kind: 'box', mat: 'hardware', p: [left, config.height - 0.12, z + 0.02], s: [0.16, 0.12, 0.1] })
    parts.push({ kind: 'box', mat: 'hardware', p: [right - GATE_POST / 2 - 0.015, config.height * 0.45, z], s: [0.03, 0.5, 0.12] })
    if (config.gateAutomation) {
      parts.push({ kind: 'box', mat: 'concrete', p: [left - 0.45, 0.025, z - 0.28], s: [0.5, 0.05, 0.4] })
      parts.push({ kind: 'post', mat: 'dark', p: [left - 0.45, 0.22, z - 0.22], s: [0.28, 0.34, 0.2] })
    }
    return parts
  }, [config, left, right, z, travel, tail, cantilever])
  return <>
    <Parts parts={fixed} materials={materials} />
    <group ref={ref} position={[closedX, 0, z]}><Parts parts={leaf} materials={materials} /></group>
  </>
}

/** Kétszárnyú nyílókapu: a szárnyak befelé (a telek felé) nyílnak. */
function SwingGate({ config, materials, left, right, open }: { config: OutdoorConfig; materials: FenceMaterials; left: number; right: number; open: boolean }) {
  const leftRef = useRef<THREE.Group>(null)
  const rightRef = useRef<THREE.Group>(null)
  const inner = right - left - GATE_POST
  const leafWidth = inner / 2 - 0.02
  const bottom = 0.08
  const height = config.height - bottom - 0.02
  useLeafMotion(open, (t) => {
    const angle = t * 1.45
    if (leftRef.current) leftRef.current.rotation.y = angle
    if (rightRef.current) rightRef.current.rotation.y = -angle
  })
  const leaf = useMemo(() => leafParts(config, leafWidth, height, bottom), [config, leafWidth, height, bottom])
  const leftLeaf = useMemo(() => [...leaf,
    // Ejtőretesz a középső élen
    { kind: 'cyl', mat: 'hardware', p: [leafWidth / 2 - 0.05, bottom + 0.12, -0.04], s: [0.022, 0.32, 0.022] } as Part], [leaf, leafWidth, bottom])
  const rightLeaf = useMemo(() => [...leaf,
    { kind: 'box', mat: 'dark', p: [-leafWidth / 2 + 0.05, Math.min(1.05, config.height * 0.6), 0.045], s: [0.035, 0.16, 0.03] } as Part], [leaf, leafWidth, config.height])
  const hinges = useMemo(() => {
    const parts: Part[] = []
    for (const x of [left + GATE_POST / 2 + 0.012, right - GATE_POST / 2 - 0.012]) for (const y of [bottom + 0.2, bottom + height - 0.2]) parts.push({ kind: 'cyl', mat: 'hardware', p: [x, y, 0], s: [0.035, 0.12, 0.035] })
    if (config.gateAutomation) {
      parts.push({ kind: 'box', mat: 'concrete', p: [right + 0.4, 0.025, -0.45], s: [0.4, 0.05, 0.36] })
      parts.push({ kind: 'post', mat: 'dark', p: [right + 0.4, 0.2, -0.45], s: [0.26, 0.3, 0.18] })
    }
    return parts
  }, [left, right, bottom, height, config.gateAutomation])
  return <>
    <Parts parts={hinges} materials={materials} />
    <group ref={leftRef} position={[left + GATE_POST / 2 + 0.02, 0, 0]}><group position={[leafWidth / 2, 0, 0]}><Parts parts={leftLeaf} materials={materials} /></group></group>
    <group ref={rightRef} position={[right - GATE_POST / 2 - 0.02, 0, 0]}><group position={[-leafWidth / 2, 0, 0]}><Parts parts={rightLeaf} materials={materials} /></group></group>
  </>
}

/** Kiskapu: keretes szárny azonos betéttel, kilinccsel és zárral; a kapunyitással együtt nyílik. */
function PedestrianGate({ config, materials, left, right, open }: { config: OutdoorConfig; materials: FenceMaterials; left: number; right: number; open: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const width = right - left - GATE_POST - 0.04
  const bottom = 0.06
  const height = config.height - bottom - 0.02
  useLeafMotion(open, (t) => { if (ref.current) ref.current.rotation.y = t * 1.3 })
  const leaf = useMemo(() => {
    const parts = leafParts(config, width, height, bottom)
    const handleY = Math.min(1.02, bottom + height * 0.6)
    const x = width / 2 - 0.09
    parts.push({ kind: 'box', mat: 'dark', p: [x, handleY - 0.05, 0.03], s: [0.05, 0.2, 0.025] })
    for (const side of [1, -1]) {
      parts.push({ kind: 'cyl', mat: 'hardware', p: [x, handleY, side * 0.06], s: [0.02, 0.05, 0.02], r: [Math.PI / 2, 0, 0] })
      parts.push({ kind: 'cyl', mat: 'hardware', p: [x - 0.06, handleY, side * 0.085], s: [0.018, 0.13, 0.018], r: [0, 0, Math.PI / 2] })
    }
    return parts
  }, [config, width, height, bottom])
  const hinges = useMemo(() => [bottom + 0.2, bottom + height - 0.2].map((y) => ({ kind: 'cyl', mat: 'hardware', p: [left + GATE_POST / 2 + 0.01, y, 0], s: [0.03, 0.1, 0.03] }) as Part), [left, bottom, height])
  return <>
    <Parts parts={hinges} materials={materials} />
    <group ref={ref} position={[left + GATE_POST / 2 + 0.02, 0, 0]}><group position={[width / 2, 0, 0]}><Parts parts={leaf} materials={materials} /></group></group>
  </>
}

export default function FenceModel({ config, materials, open }: { config: OutdoorConfig; materials: FenceMaterials; open: boolean }) {
  const gate = config.gateType === 'none' ? 0 : config.gateWidth
  const ped = config.pedestrianGate ? PED_WIDTH : 0
  const total = fenceSystemLength(config)
  const split = gate > 0 || ped > 0
  const each = split ? config.length / 2 : config.length
  const x0 = -total / 2
  const gateLeft = x0 + each
  const gateRight = gateLeft + gate
  const pedRight = gateRight + ped
  const end = total / 2
  const fixed = useMemo(() => {
    const parts: Part[] = []
    if (!split) {
      addRun(parts, config, x0, end, POST, POST)
      return parts
    }
    addRun(parts, config, x0, gateLeft, POST, GATE_POST, true, false)
    addRun(parts, config, pedRight, end, GATE_POST, POST, false, true)
    // Kapuoszlopok (erősebb, 120 × 120): a nyílás két oldalán és a kiskapu mellett.
    const gatePosts = [...new Set([gateLeft, ...(gate ? [gateRight] : []), ...(ped ? [pedRight] : [])])]
    for (const x of gatePosts) addPost(parts, x, config.height + 0.08, GATE_POST, config)
    // Kiskapu küszöbe
    if (ped) parts.push({ kind: 'box', mat: 'concrete', p: [(gateRight + pedRight) / 2, 0.015, 0], s: [ped, 0.03, 0.3] })
    // Fotocellák és villogó (biztonsági csomag)
    if (gate && config.gateAutomation && config.safetyKit) {
      for (const x of [gateLeft + GATE_POST / 2 + 0.03, gateRight - GATE_POST / 2 - 0.03]) parts.push({ kind: 'box', mat: 'dark', p: [x, 0.5, 0.02], s: [0.05, 0.11, 0.05] })
      parts.push({ kind: 'cyl', mat: 'amber', p: [gateLeft, config.height + 0.16, 0], s: [0.09, 0.1, 0.09] })
    }
    // Kaputelefon a kiskapu oszlopán, utcai oldalon
    if (config.intercom) {
      const x = ped ? pedRight : gateRight
      parts.push({ kind: 'box', mat: 'dark', p: [x, 1.32, GATE_POST / 2 + 0.018], s: [0.1, 0.2, 0.03] })
      parts.push({ kind: 'box', mat: 'screen', p: [x, 1.36, GATE_POST / 2 + 0.034], s: [0.06, 0.05, 0.004] })
    }
    return parts
  }, [config, split, x0, end, gateLeft, gateRight, pedRight, gate, ped])
  return <group>
    <Parts parts={fixed} materials={materials} />
    {gate > 0 && (config.gateType === 'swing'
      ? <SwingGate config={config} materials={materials} left={gateLeft} right={gateRight} open={open} />
      : <SlidingGate config={config} materials={materials} left={gateLeft} right={gateRight} open={open} />)}
    {ped > 0 && <PedestrianGate config={config} materials={materials} left={gateRight} right={pedRight} open={open} />}
  </group>
}
