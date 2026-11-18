// Aluprof MB-OpenSky 140 forgólamellás pergola a gyári DWG-profilokból (os140Profiles.ts): oszlop, gerenda takaróval,
// eresz a lamellavégeknél és a lamellák. A lamellák InstancedMesh-ként forognak a tengelyük körül; a „Működés”
// módban ugyanabból az órából (demoSeconds), mint a panel. A motor rejtett (a gerendában), ezért nincs külön modellje.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { stillMotion } from '@/lib/sceneClock'
import { demoAngle, demoSeconds } from '@/lib/louvreSystem'
import { OS140, os140Layout, os140PostSpot } from '@/lib/os140'
import { OS140_BEAM, OS140_BEAM_COVER, OS140_GUTTER, OS140_POST, OS140_SLAT, type Loop, type ProfileShape } from '@/lib/os140Profiles'

const REDUCED = stillMotion(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

type Map2 = (p: [number, number]) => [number, number]
const ident: Map2 = (p) => p
/** gerendaszelvény: x = kifelé (−u), y = a gerenda tetejétől (v) */
const outward: Map2 = ([u, v]) => [-u, v]

function toShapes(profile: ProfileShape[], map: Map2, holes = true) {
  const path = (loop: Loop, target: THREE.Path) => loop.forEach((p, i) => { const [x, y] = map(p); if (i) target.lineTo(x, y); else target.moveTo(x, y) })
  return profile.map(({ outer, holes: hs }) => {
    const shape = new THREE.Shape()
    path(outer, shape)
    shape.closePath()
    if (holes) for (const h of hs) { const hole = new THREE.Path(); path(h, hole); hole.closePath(); shape.holes.push(hole) }
    return shape
  })
}

/** a szelvény (x → világ z, y → világ y) kihúzása az x tengely mentén, középre igazítva */
function alongX(shapes: THREE.Shape[], length: number) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth: length, bevelEnabled: false, curveSegments: 1 })
  g.translate(0, 0, -length / 2)
  g.rotateY(-Math.PI / 2)
  g.computeVertexNormals()
  return g
}

/** függőleges kihúzás (oszlop) 0-tól `height`-ig */
function upward(shapes: THREE.Shape[], height: number) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth: height, bevelEnabled: false, curveSegments: 1 })
  g.rotateX(-Math.PI / 2)
  g.computeVertexNormals()
  return g
}

export function Os140Posts({ posts, width, depth, height, material }: { posts: [number, number][]; width: number; depth: number; height: number; material: THREE.Material }) {
  const beamTop = height + OS140.beamH / 2
  const spots = posts.map((p) => os140PostSpot(p, width, depth))
  const full = useMemo(() => upward(toShapes(OS140_POST, ident), beamTop), [beamTop])
  const short = useMemo(() => upward(toShapes(OS140_POST, ident), beamTop - OS140.beamH), [beamTop])
  const cap = useMemo(() => upward(toShapes(OS140_POST, ident, false), 0.003), [])
  useEffect(() => () => { full.dispose(); short.dispose(); cap.dispose() }, [full, short, cap])
  return <group name="os140-posts">{spots.map((s, i) => <group key={i} position={[s.x, 0, s.z]}>
    <mesh geometry={s.corner ? full : short} material={material} castShadow receiveShadow />
    {s.corner && <mesh geometry={cap} material={material} position={[0, beamTop - 0.003, 0]} />}
  </group>)}</group>
}

/** Egy gerenda (K440141X + K440142X takaró) a belső síkjánál elhelyezve; a szelvény kifelé nyúlik. */
function BeamRun({ length, position, rotation, material, gutter, gutterMaterial }: { length: number; position: [number, number, number]; rotation: number; material: THREE.Material; gutter?: number; gutterMaterial?: THREE.Material }) {
  const geo = useMemo(() => {
    const beam = alongX([...toShapes(OS140_BEAM, outward), ...toShapes(OS140_BEAM_COVER, outward)], length)
    const g = gutter ? alongX(toShapes(OS140_GUTTER, outward), gutter) : null
    return { beam, g }
  }, [length, gutter])
  useEffect(() => () => { geo.beam.dispose(); geo.g?.dispose() }, [geo])
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh geometry={geo.beam} material={material} castShadow receiveShadow />
    {geo.g && <mesh geometry={geo.g} material={gutterMaterial ?? material} castShadow receiveShadow />}
  </group>
}

/**
 * A váz gerendái. Elöl-hátul (x mentén) és a két oldalon (z mentén) a gerendatengelyen; a mezőhatárokon és az
 * 5 m feletti mezők toldásánál dupla gerenda (két szelvény háttal). Az eresz a lamellavégek alatt fut.
 */
export function Os140Beams({ width, depth, height, bays, material }: { width: number; depth: number; height: number; bays: number[]; material: THREE.Material }) {
  const beamTop = height + OS140.beamH / 2
  const half = OS140.beamW / 2
  const clear = depth - OS140.beamW
  const along = width - OS140.post
  const sides = depth - OS140.post
  // közbenső (dupla) gerendák: a mezőhatárok és a mezőn belüli toldások
  const bayW = width / (bays.length + 1)
  const joints = [...bays]
  const sub = Math.max(1, Math.ceil(bayW / OS140.maxSpan - 1e-6))
  for (let b = 0; b <= bays.length; b++) for (let k = 1; k < sub; k++) joints.push(-width / 2 + bayW * b + (bayW / sub) * k)
  return <group name="os140-beams">
    <BeamRun length={along} position={[0, beamTop, depth / 2 - half]} rotation={0} material={material} />
    <BeamRun length={along} position={[0, beamTop, -depth / 2 + half]} rotation={Math.PI} material={material} />
    <BeamRun length={sides} position={[width / 2 - half, beamTop, 0]} rotation={Math.PI / 2} material={material} gutter={clear} />
    <BeamRun length={sides} position={[-width / 2 + half, beamTop, 0]} rotation={-Math.PI / 2} material={material} gutter={clear} />
    {joints.map((x) => <group key={x}>
      <BeamRun length={clear} position={[x + half, beamTop, 0]} rotation={-Math.PI / 2} material={material} gutter={clear} />
      <BeamRun length={clear} position={[x - half, beamTop, 0]} rotation={Math.PI / 2} material={material} gutter={clear} />
    </group>)}
  </group>
}

export interface Os140RoofProps {
  /** egy mező gerendatengelyei közti szélesség */
  width: number
  depth: number
  height: number
  angle: number
  mechanism: boolean
  slow?: boolean
  rain?: boolean
  roofMaterial: THREE.Material
}

/** A lamellasor egy mezőben (a mező közepéhez képest). */
export function Os140Roof({ width, depth, height, angle, mechanism, slow = false, rain = false, roofMaterial }: Os140RoofProps) {
  const invalidate = useThree((s) => s.invalidate)
  const layout = useMemo(() => os140Layout(width, depth, height), [width, depth, height])
  const n = layout.z.length
  const total = n * layout.spans.length
  const len = layout.spans[0].length
  const geo = useMemo(() => ({
    blade: alongX(toShapes(OS140_SLAT, ident), len),
    cap: alongX(toShapes(OS140_SLAT, ident, false), 0.003),
  }), [len])
  useEffect(() => () => { geo.blade.dispose(); geo.cap.dispose() }, [geo])
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#16191b', roughness: 0.7, metalness: 0.1 }), [])
  useEffect(() => () => capMat.dispose(), [capMat])
  const blades = useRef<THREE.InstancedMesh>(null)
  const caps = useRef<THREE.InstancedMesh>(null)
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([])
  const live = useRef({ angle: -1, rain, slowUntil: 0 })
  const tools = useMemo(() => ({ m: new THREE.Matrix4(), part: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), x: new THREE.Vector3(1, 0, 0) }), [])
  const ends = useMemo(() => [new THREE.Matrix4().makeTranslation(-(len / 2 + 0.0015), 0, 0), new THREE.Matrix4().makeTranslation(len / 2 + 0.0015, 0, 0)], [len])

  const write = (deg: number) => {
    const { m, part, q, p, s, x } = tools
    q.setFromAxisAngle(x, -(deg * Math.PI) / 180)
    let k = 0
    for (const span of layout.spans) for (let i = 0; i < n; i++, k++) {
      p.set(span.x, layout.axleY, layout.z[i])
      m.compose(p, q, s)
      blades.current?.setMatrixAt(k, m)
      caps.current?.setMatrixAt(k * 2, part.multiplyMatrices(m, ends[0]))
      caps.current?.setMatrixAt(k * 2 + 1, part.multiplyMatrices(m, ends[1]))
    }
    for (const mesh of [blades.current, caps.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true
  }

  useEffect(() => { live.current.angle = -1; invalidate() }, [layout, geo, invalidate])
  useFrame(({ clock, gl }, delta) => {
    const l = live.current
    const current = [blades.current, caps.current]
    // új InstancedMesh (anyag- vagy minőségváltás után) üres: újraírjuk a lamellákat
    if (current.some((mesh, i) => mesh !== meshes.current[i])) { meshes.current = current; l.angle = -1 }
    if (l.rain !== rain) { l.rain = rain; if (!rain) l.slowUntil = clock.elapsedTime + 3.5 }
    const slowNow = slow || clock.elapsedTime < l.slowUntil
    const target = mechanism ? Math.min(OS140.maxAngle, demoAngle(demoSeconds()).angle) : THREE.MathUtils.clamp(angle, 0, 90)
    const damped = THREE.MathUtils.damp(l.angle, target, slowNow ? 1.6 : 6, delta)
    const next = mechanism || REDUCED || l.angle < 0 ? target : slowNow ? l.angle + THREE.MathUtils.clamp(damped - l.angle, -30 * delta, 30 * delta) : damped
    if (Math.abs(next - l.angle) > 0.01) {
      l.angle = Math.abs(next - target) < 0.01 ? target : next
      write(l.angle)
      gl.shadowMap.needsUpdate = true
      invalidate()
    }
    if (mechanism) invalidate()
  })

  return <group name="os140-roof">
    <instancedMesh key={`b${total}-${len}`} ref={blades} args={[undefined, undefined, total]} geometry={geo.blade} material={roofMaterial} frustumCulled={false} castShadow receiveShadow />
    <instancedMesh key={`c${total}-${len}`} ref={caps} args={[undefined, undefined, total * 2]} geometry={geo.cap} material={capMat} frustumCulled={false} />
  </group>
}
