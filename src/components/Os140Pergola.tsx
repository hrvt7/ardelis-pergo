// Aluprof MB-OpenSky 140 forgólamellás pergola a gyári DWG-profilokból (os140Profiles.ts): oszlop, gerenda takaróval,
// eresz a lamellavégeknél és a lamellák. A lamellák InstancedMesh-ként forognak a tengelyük körül; a „Működés”
// módban ugyanabból az órából (demoSeconds), mint a panel. A motor rejtett (a gerendában), ezért nincs külön modellje.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { stillMotion } from '@/lib/sceneClock'
import { demoAngle, demoSeconds } from '@/lib/louvreSystem'
import { OS140, OS140_WALL_GAP, os140Layout, os140PostSpot } from '@/lib/os140'
import { OS140_BEAM, OS140_BEAM_COVER, OS140_GUTTER, OS140_POST, OS140_SLAT } from '@/lib/os140Profiles'
import { alongX, ident, toShapes, upward, type Map2 } from '@/components/profileGeometry'
import { refreshShadowInMotion } from '@/lib/mechanics'

const REDUCED = stillMotion(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

/** gerendaszelvény: x = kifelé (−u), y = a gerenda tetejétől (v) */
const outward: Map2 = ([u, v]) => [-u, v]

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
function BeamRun({ length, position, rotation, material, gutter, gutterMaterial, shift = 0 }: { length: number; position: [number, number, number]; rotation: number; material: THREE.Material; gutter?: number; gutterMaterial?: THREE.Material; /** a gerenda eltolása saját hossza mentén (az eresz helyben marad) */ shift?: number }) {
  const geo = useMemo(() => {
    const beam = alongX([...toShapes(OS140_BEAM, outward), ...toShapes(OS140_BEAM_COVER, outward)], length)
    const g = gutter ? alongX(toShapes(OS140_GUTTER, outward), gutter) : null
    return { beam, g }
  }, [length, gutter])
  useEffect(() => () => { geo.beam.dispose(); geo.g?.dispose() }, [geo])
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh geometry={geo.beam} material={material} position={[shift, 0, 0]} castShadow receiveShadow />
    {geo.g && <mesh geometry={geo.g} material={gutterMaterial ?? material} castShadow receiveShadow />}
  </group>
}

/**
 * A váz gerendái. Elöl-hátul (x mentén) és a két oldalon (z mentén) a gerendatengelyen; a mezőhatárokon és az
 * 5 m feletti mezők toldásánál dupla gerenda (két szelvény háttal). Az eresz a lamellavégek alatt fut.
 */
export function Os140Beams({ width, depth, height, bays, material, openCorners = {} }: { width: number; depth: number; height: number; bays: number[]; material: THREE.Material; /** oszlop nélküli sarkok (falas oldal): ott az oldalgerenda a sarok külső síkjáig fut, nincs lyuk */ openCorners?: Partial<Record<'backLeft' | 'backRight' | 'frontLeft' | 'frontRight', boolean>> }) {
  const beamTop = height + OS140.beamH / 2
  const half = OS140.beamW / 2
  const clear = depth - OS140.beamW
  const along = width - OS140.post
  // Oldalgerenda: alapból oszloptól oszlopig; oszlop nélküli saroknál a keresztgerenda külső síkjáig (+post/2 + beamW/2).
  const reach = OS140.post / 2 + half
  const sideRun = (back: boolean | undefined, front: boolean | undefined) => {
    const start = -(depth / 2 - OS140.post / 2) - (back ? reach : 0)
    const end = depth / 2 - OS140.post / 2 + (front ? reach : 0)
    return { length: end - start, center: (start + end) / 2 }
  }
  const left = sideRun(openCorners.backLeft, openCorners.frontLeft)
  const right = sideRun(openCorners.backRight, openCorners.frontRight)
  // közbenső (dupla) gerendák: a mezőhatárok és a mezőn belüli toldások
  const bayW = width / (bays.length + 1)
  const joints = [...bays]
  const sub = Math.max(1, Math.ceil(bayW / OS140.maxSpan - 1e-6))
  for (let b = 0; b <= bays.length; b++) for (let k = 1; k < sub; k++) joints.push(-width / 2 + bayW * b + (bayW / sub) * k)
  return <group name="os140-beams">
    <BeamRun length={along} position={[0, beamTop, depth / 2 - half]} rotation={0} material={material} />
    <BeamRun length={along} position={[0, beamTop, -depth / 2 + half]} rotation={Math.PI} material={material} />
    {/* +90° forgatásnál a gerenda saját x-tengelye a világ −z, −90°-nál a +z irányába mutat */}
    <BeamRun length={right.length} shift={-right.center} position={[width / 2 - half, beamTop, 0]} rotation={Math.PI / 2} material={material} gutter={clear} />
    <BeamRun length={left.length} shift={left.center} position={[-width / 2 + half, beamTop, 0]} rotation={-Math.PI / 2} material={material} gutter={clear} />
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
      refreshShadowInMotion(gl, clock.elapsedTime, l.angle === target)
      invalidate()
    }
    if (mechanism) invalidate()
  })

  return <group name="os140-roof">
    <instancedMesh key={`b${total}-${len}`} ref={blades} args={[undefined, undefined, total]} geometry={geo.blade} material={roofMaterial} frustumCulled={false} castShadow receiveShadow />
    <instancedMesh key={`c${total}-${len}`} ref={caps} args={[undefined, undefined, total * 2]} geometry={geo.cap} material={capMat} frustumCulled={false} />
  </group>
}

/**
 * Falra szerelt gerenda csatlakozása (MB-OpenSky 140, fali kivitel): a gerenda külső síkja és a fal között csak a
 * szerelési hézag van (OS140_WALL_GAP), benne sötét tömítőszalag; felül a falhoz hajló fali takaróprofil, alul a
 * konzolok. `side` = melyik falhoz csatlakozik; a hossz a gerendák külső síkjai közti teljes méret.
 * A konzolok osztása (≤ 1,2 m) és a takaróprofil mérete feltételezés (a gyári adatlap nem adja meg).
 */
export function Os140WallJoint({ side, width, depth, height, material }: { side: 'back' | 'left' | 'right'; width: number; depth: number; height: number; material: THREE.Material }) {
  const beamTop = height + OS140.beamH / 2
  const bottom = beamTop - OS140.beamH
  const outer = OS140.beamW / 2
  const gap = OS140_WALL_GAP
  const along = side === 'back' ? width + OS140.beamW : depth + OS140.beamW
  const sealMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15181a', roughness: 0.85, metalness: 0 }), [])
  const boltMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#737b7d', roughness: 0.25, metalness: 0.88 }), [])
  useEffect(() => () => { sealMat.dispose(); boltMat.dispose() }, [sealMat, boltMat])
  const count = Math.max(2, Math.ceil(along / 1.2) + 1)
  const brackets = Array.from({ length: count }, (_, i) => -along / 2 + 0.2 + (i * (along - 0.4)) / (count - 1))
  // Helyi tengelyek: x a fal mentén, z a faltól befelé (+), a fal síkja z = 0, a gerenda külső síkja z = gap.
  const frame = side === 'back' ? { position: [0, 0, -depth / 2 - outer - gap] as [number, number, number], rotation: 0 }
    : side === 'left' ? { position: [-width / 2 - outer - gap, 0, 0] as [number, number, number], rotation: Math.PI / 2 }
      : { position: [width / 2 + outer + gap, 0, 0] as [number, number, number], rotation: -Math.PI / 2 }
  // fali takaróprofil: függőleges szár a falon, ferde szár a hézag fölött a gerenda tetejére
  const capRun = gap + 0.03
  const capRise = 0.012
  const capLength = Math.hypot(capRun, capRise)
  return <group name={`os140-wall-joint-${side}`} position={frame.position} rotation={[0, frame.rotation, 0]}>
    <mesh position={[0, (beamTop + bottom) / 2, gap / 2]} material={sealMat}><boxGeometry args={[along, OS140.beamH - 0.01, gap]} /></mesh>
    <mesh position={[0, beamTop + 0.045, 0.002]} material={material} castShadow><boxGeometry args={[along, 0.07, 0.004]} /></mesh>
    <mesh position={[0, beamTop + 0.004 + capRise / 2, capRun / 2]} rotation={[Math.atan2(capRise, capRun), 0, 0]} material={material} castShadow><boxGeometry args={[along, 0.004, capLength]} /></mesh>
    {brackets.map((x) => <group key={x} position={[x, bottom, 0]}>
      <mesh position={[0, -0.045, 0.004]} material={material} castShadow><boxGeometry args={[0.08, 0.09, 0.008]} /></mesh>
      <mesh position={[0, -0.004, (gap + 0.07) / 2]} material={material} castShadow><boxGeometry args={[0.08, 0.008, gap + 0.07]} /></mesh>
      {[-0.022, 0.022].map((bx) => <mesh key={bx} position={[bx, -0.055, 0.01]} rotation={[Math.PI / 2, 0, 0]} material={boltMat}><cylinderGeometry args={[0.008, 0.008, 0.006, 10]} /></mesh>)}
    </group>)}
  </group>
}
