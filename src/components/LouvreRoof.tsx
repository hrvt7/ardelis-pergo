// Forgólamellás tető valós profillal és működő hajtással (louvreSystem.ts adatai).
// A lamellák InstancedMesh-ként (penge + két véglap + hajtókar + tengelycsonk), a hajtórúd és a lineáris motor
// a hajtásoldali gerenda tetején. A „Működés” módban a burkolat felemelkedik, a hajtás kiemelt színt kap,
// és a lamellák a gyári 0–110° tartományban járnak (a panel ugyanabból az órából számol).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { crankPin, demoAngle, demoSeconds, DRIVE, drivePlan, LOUVRE, louvreLayout, louvreProfile } from '@/lib/louvreSystem'

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const ACCENT = new THREE.Color('#c9ef4f')
const STEEL = new THREE.Color('#9aa1a6')

/** egy (z, y) síkú alakzat kihúzása az x tengely mentén, középre igazítva */
function sectionExtrude(shape: THREE.Shape, length: number, curveSegments = 6) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments })
  g.translate(0, 0, -length / 2)
  g.rotateY(-Math.PI / 2) // az alakzat x → világ z, a kihúzás → világ x
  g.computeVertexNormals()
  return g
}
const toShape = (pts: [number, number][]) => {
  const s = new THREE.Shape()
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  s.closePath()
  return s
}
/** a hajtókar lemeze: agy a tengelyen, csap a karsugáron (zárt állás) */
function crankShape() {
  const [px, py] = crankPin(0)
  const a = Math.atan2(py, px)
  const pts: [number, number][] = []
  for (let t = 90; t <= 270; t += 15) pts.push([0.026 * Math.cos(a + (t * Math.PI) / 180), 0.026 * Math.sin(a + (t * Math.PI) / 180)])
  for (let t = -90; t <= 90; t += 15) pts.push([px + 0.012 * Math.cos(a + (t * Math.PI) / 180), py + 0.012 * Math.sin(a + (t * Math.PI) / 180)])
  return toShape(pts)
}

export interface LouvreRoofProps {
  width: number
  depth: number
  /** a gerendák középmagassága (a jelenetben a `height`) */
  height: number
  beam: number
  beamHeight: number
  /** a konfigurált lamellaszög (0–90) */
  angle: number
  /** melyik oldali gerendán fut a hajtás (+1 jobb, −1 bal) */
  driveSide: 1 | -1
  mechanism: boolean
  /** a hajtás burkolata felemelkedik és a hajtás kiemelést kap, de a lamellák a konfigurált szögben maradnak (esőbemutató) */
  reveal?: boolean
  /** lassú, filmszerű lamellamozgás (esőzárás) a gyors kapcsolás helyett */
  slow?: boolean
  /** esik-e: az eső elmúltával a lamellák 3,5 s-ig ugyanilyen lassan nyílnak vissza */
  rain?: boolean
  roofMaterial: THREE.Material
  frameMaterial: THREE.Material
  segments: number
  showLabels: boolean
}

export default function LouvreRoof({ width, depth, height, beam, beamHeight, angle, driveSide, mechanism, reveal = false, slow = false, rain = false, roofMaterial, frameMaterial, segments, showLabels }: LouvreRoofProps) {
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const beamTop = height + beamHeight / 2
  const layout = useMemo(() => louvreLayout(width, depth, beam, beamTop), [width, depth, beam, beamTop])
  const innerHalf = (depth - beam) / 2
  const plan = useMemo(() => drivePlan(layout.z, layout.axleY, beamTop, innerHalf - 0.04), [layout, beamTop, innerHalf])
  const n = layout.z.length
  const total = n * layout.modules.length
  const modLen = layout.modules[0].length
  // a hajtás x-helye modulonként: a modul hajtásoldali gerendájának belső síkja
  const driveX = layout.modules.map((m) => m.x + driveSide * (m.inner / 2))
  const labelAnchor = useMemo(() => new THREE.Vector3(driveX[0], plan.pivot[1], plan.pivot[0] - 0.3), [driveX, plan])

  const geo = useMemo(() => {
    const profile = louvreProfile(Math.max(6, Math.min(16, segments)))
    const blade = sectionExtrude(toShape(profile), modLen, 6)
    const cap = sectionExtrude(toShape(profile), 0.008, 6)
    const crank = sectionExtrude(crankShape(), 0.008, 6)
    const shaft = new THREE.CylinderGeometry(0.008, 0.008, 0.03, 10).rotateZ(Math.PI / 2)
    return { blade, cap, crank, shaft }
  }, [modLen, segments])
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo])

  // a hajtás anyagai: alapból acél/antracit, „Működés” módban kiemelt színnel
  const mats = useMemo(() => ({
    drive: new THREE.MeshStandardMaterial({ color: STEEL.clone(), metalness: 0.85, roughness: 0.32 }),
    motor: new THREE.MeshStandardMaterial({ color: '#25292c', metalness: 0.4, roughness: 0.45 }),
    rod: new THREE.MeshStandardMaterial({ color: '#d5d9dc', metalness: 1, roughness: 0.18 }),
    caps: new THREE.MeshStandardMaterial({ color: '#16191b', roughness: 0.7, metalness: 0.1 }),
    cover: (frameMaterial as THREE.MeshStandardMaterial).clone(),
  }), [frameMaterial])
  useEffect(() => { mats.cover.transparent = true; return () => Object.values(mats).forEach((m) => m.dispose()) }, [mats])

  const blades = useRef<THREE.InstancedMesh>(null)
  const caps = useRef<THREE.InstancedMesh>(null)
  const cranks = useRef<THREE.InstancedMesh>(null)
  const shafts = useRef<THREE.InstancedMesh>(null)
  const bars = useRef<(THREE.Group | null)[]>([])
  const motors = useRef<(THREE.Group | null)[]>([])
  const rods = useRef<(THREE.Mesh | null)[]>([])
  const covers = useRef<(THREE.Group | null)[]>([])
  const live = useRef({ angle: -1, shown: mechanism || reveal ? 1 : 0, wave: 0, rain, slowUntil: 0 })
  const tools = useMemo(() => ({ m: new THREE.Matrix4(), part: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), x: new THREE.Vector3(1, 0, 0), target: new THREE.Vector3() }), [])
  const offsets = useMemo(() => ({
    capL: new THREE.Matrix4().makeTranslation(-(modLen / 2 + 0.004), 0, 0),
    capR: new THREE.Matrix4().makeTranslation(modLen / 2 + 0.004, 0, 0),
    crank: new THREE.Matrix4().makeTranslation(driveSide * (modLen / 2 + LOUVRE.endGap + 0.004), 0, 0),
    shaft: new THREE.Matrix4().makeTranslation(driveSide * (modLen / 2 + 0.012), 0, 0),
  }), [modLen, driveSide])

  const write = (deg: number) => {
    const { m, part, q, p, s, x } = tools
    q.setFromAxisAngle(x, -(deg * Math.PI) / 180)
    let k = 0
    layout.modules.forEach((mod) => {
      for (let i = 0; i < n; i++, k++) {
        p.set(mod.x, layout.axleY, layout.z[i])
        m.compose(p, q, s)
        blades.current?.setMatrixAt(k, m)
        caps.current?.setMatrixAt(k * 2, part.multiplyMatrices(m, offsets.capL))
        caps.current?.setMatrixAt(k * 2 + 1, part.multiplyMatrices(m, offsets.capR))
        cranks.current?.setMatrixAt(k, part.multiplyMatrices(m, offsets.crank))
        shafts.current?.setMatrixAt(k, part.multiplyMatrices(m, offsets.shaft))
      }
    })
    for (const mesh of [blades.current, caps.current, cranks.current, shafts.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true
    // hajtórúd: a csapok együtt mozognak (paralelogramma), a motor a rúd vezetőbakjára mutat
    const [pz, py] = crankPin(deg)
    layout.modules.forEach((_, j) => {
      const bar = bars.current[j]
      if (bar) bar.position.set(0, layout.axleY + py, pz)
      const motor = motors.current[j]
      const rod = rods.current[j]
      if (motor && rod) {
        motor.updateWorldMatrix(true, false)
        const target = tools.target.set(0, layout.axleY + py + DRIVE.lug, layout.z[plan.lugIndex] + pz)
        motor.parent?.localToWorld(target)
        motor.lookAt(target)
        const len = Math.hypot(layout.z[plan.lugIndex] + pz - plan.pivot[0], layout.axleY + py + DRIVE.lug - plan.pivot[1])
        rod.scale.set(1, 1, Math.max(0.001, len - DRIVE.body))
      }
    })
  }

  useLayoutEffect(() => { live.current.angle = -1 }, [layout, geo])
  // A címkék csak közelről (a hajtásoldali kamera) jelennek meg; távolról egymásra csúsznának.
  const [near, setNear] = useState(false)
  const nearRef = useRef(false)
  useFrame(({ camera }) => {
    if (!mechanism || !showLabels) return
    const d = camera.position.distanceTo(labelAnchor)
    const next = nearRef.current ? d < 6.4 : d < 5.6
    if (next !== nearRef.current) { nearRef.current = next; setNear(next) }
  })
  // Védőháló: ha az R3F bármi okból új InstancedMesh-t hoz létre (az üres, egységmátrixos), a lamellákat újra a helyükre írjuk.
  // Enélkül anyag- vagy minőségváltás után (pl. színcsere, telefonon az első másodpercek automatikus minőségállítása)
  // minden lamella a nullpontba esett, és a tető lamellák nélkül látszott.
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([])
  useFrame(({ clock }, delta) => {
    const l = live.current
    const current = [blades.current, caps.current, cranks.current, shafts.current]
    if (current.some((mesh, index) => mesh !== meshes.current[index])) { meshes.current = current; l.angle = -1 }
    if (l.rain !== rain) { l.rain = rain; if (!rain) l.slowUntil = clock.elapsedTime + 3.5 }
    const slowNow = slow || clock.elapsedTime < l.slowUntil
    // burkolat és kiemelés átúsztatása
    const shownTarget = mechanism || reveal ? 1 : 0
    if (Math.abs(l.shown - shownTarget) > 0.002) {
      l.shown = REDUCED ? shownTarget : THREE.MathUtils.damp(l.shown, shownTarget, reveal ? 2.5 : 4, delta)
      if (Math.abs(l.shown - shownTarget) < 0.002) l.shown = shownTarget
      mats.drive.color.copy(STEEL).lerp(ACCENT, l.shown)
      mats.cover.opacity = 1 - l.shown
      mats.cover.depthWrite = l.shown < 0.5
      for (const c of covers.current) if (c) { c.visible = l.shown < 0.98; c.position.y = 0.16 * l.shown }
      invalidate()
    }
    const target = mechanism ? demoAngle(demoSeconds()).angle : THREE.MathUtils.clamp(angle, 0, 90)
    // Lassú módban legfeljebb 30°/s, a vége felé csillapodva — egy valós hajtás tempója, nem kapcsolás.
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

  // a lamellasor és a gerenda közti rést elöl-hátul fix záróprofil fedi
  const front0 = layout.z[n - 1] + 0.112
  const back0 = layout.z[0] - 0.1038
  const frontSeal = Math.max(0, innerHalf - front0)
  const backSeal = Math.max(0, back0 + innerHalf)
  const coverLen = depth - beam - 0.04
  const motorBody = useMemo(() => new THREE.CylinderGeometry(0.024, 0.024, DRIVE.body, 20).rotateX(Math.PI / 2).translate(0, 0, DRIVE.body / 2), [])
  const motorCap = useMemo(() => new THREE.CylinderGeometry(0.027, 0.027, 0.03, 20).rotateX(Math.PI / 2), [])
  const rodGeo = useMemo(() => new THREE.CylinderGeometry(0.009, 0.009, 1, 12).rotateX(Math.PI / 2).translate(0, 0, 0.5), [])
  useEffect(() => () => { motorBody.dispose(); motorCap.dispose(); rodGeo.dispose() }, [motorBody, motorCap, rodGeo])
  const [pz0, py0] = crankPin(0)
  const labelZ = layout.z[Math.min(n - 1, Math.round(n * 0.55))]

  return <group name="louvre-roof">
    <instancedMesh key={`b${total}`} ref={blades} args={[undefined, undefined, total]} geometry={geo.blade} material={roofMaterial} frustumCulled={false} castShadow receiveShadow />
    <instancedMesh key={`c${total}`} ref={caps} args={[undefined, undefined, total * 2]} geometry={geo.cap} material={mats.caps} frustumCulled={false} />
    <instancedMesh key={`k${total}`} ref={cranks} args={[undefined, undefined, total]} geometry={geo.crank} material={mats.drive} frustumCulled={false} castShadow />
    <instancedMesh key={`s${total}`} ref={shafts} args={[undefined, undefined, total]} geometry={geo.shaft} material={mats.rod} frustumCulled={false} />
    {/* 4 m feletti szélességnél a modulok közös (dupla) gerendán találkoznak */}
    {layout.modules.slice(1).map((mod, j) => <mesh key={`d${j}`} material={frameMaterial} position={[mod.x - (mod.inner + beam) / 2, height, 0]} castShadow receiveShadow><boxGeometry args={[beam, beamHeight, depth - beam]} /></mesh>)}
    {layout.modules.map((mod, j) => <group key={j}>
      {/* záróprofilok a lamellasor két végén */}
      {frontSeal > 0.004 && <mesh material={roofMaterial} position={[mod.x, layout.axleY + 0.006, innerHalf - frontSeal / 2]} castShadow receiveShadow><boxGeometry args={[mod.length, 0.022, frontSeal]} /></mesh>}
      {backSeal > 0.004 && <mesh material={roofMaterial} position={[mod.x, layout.axleY + 0.006, -innerHalf + backSeal / 2]} castShadow receiveShadow><boxGeometry args={[mod.length, 0.022, backSeal]} /></mesh>}
      {/* hajtórúd 20×20×2 a csapokon */}
      <group position={[driveX[j] + driveSide * 0.026, 0, 0]}>
        <group ref={(g) => { bars.current[j] = g }} position={[0, layout.axleY + py0, pz0]}>
          <mesh material={mats.drive} position={[0, 0.012, (layout.z[0] + layout.z[n - 1]) / 2]} castShadow><boxGeometry args={[0.02, 0.02, layout.z[n - 1] - layout.z[0] + 0.06]} /></mesh>
          <mesh material={mats.motor} position={[0, DRIVE.lug / 2 + 0.006, layout.z[plan.lugIndex]]}><boxGeometry args={[0.014, DRIVE.lug + 0.012, 0.05]} /></mesh>
        </group>
        {/* lineáris motor: tartóbak + henger + dugattyúrúd */}
        <mesh material={mats.motor} position={[0, beamTop + 0.012, plan.pivot[0] + 0.012]}><boxGeometry args={[0.05, 0.024, 0.08]} /></mesh>
        <group ref={(g) => { motors.current[j] = g }} position={[0, plan.pivot[1], plan.pivot[0]]}>
          <mesh geometry={motorBody} material={mats.motor} castShadow />
          <mesh geometry={motorCap} material={mats.drive} position={[0, 0, 0.015]} />
          <mesh geometry={motorCap} material={mats.drive} position={[0, 0, DRIVE.body - 0.015]} />
          <mesh ref={(m) => { rods.current[j] = m }} geometry={rodGeo} material={mats.rod} position={[0, 0, DRIVE.body]} />
        </group>
      </group>
      {/* a hajtás burkolata a gerendán (Működés módban felemelkedik és eltűnik) */}
      <group ref={(g) => { covers.current[j] = g }} visible={!mechanism} position={[0, mechanism ? 0.16 : 0, 0]}>
        <RoundedBox args={[0.082, 0.15, coverLen]} radius={0.016} smoothness={3} material={mats.cover} position={[driveX[j] + driveSide * 0.032, beamTop + 0.06, 0]} castShadow receiveShadow />
      </group>
    </group>)}
    {mechanism && showLabels && near && <group name="ar-skip-overlays">
      <Html position={[driveX[0] + driveSide * 0.03, plan.pivot[1] + 0.1, plan.pivot[0] - 0.3]} center zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}><span className="explode-label mech-label" style={{ display: 'inline-block', transform: 'translateY(34px)' }}>Lineáris motor · {DRIVE.force} N</span></Html>
      <Html position={[driveX[0] + driveSide * 0.03, layout.axleY + 0.16, labelZ]} center zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}><span className="explode-label mech-label" style={{ display: 'inline-block', transform: 'translateY(-30px)' }}>Hajtórúd 20×20 · minden lamellát egyszerre forgat</span></Html>
      <Html position={[driveX[0], layout.axleY - 0.05, layout.z[Math.max(0, Math.round(n * 0.3))]]} center zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}><span className="explode-label mech-label" style={{ display: 'inline-block', transform: 'translateY(6px)' }}>Hajtókar R115 mm</span></Html>
      <Html position={[layout.modules[0].x - driveSide * modLen * 0.2, layout.axleY + 0.08, layout.z[Math.round(n * 0.4)]]} center zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}><span className="explode-label mech-label" style={{ display: 'inline-block', transform: 'translateY(-64px)' }}>Lamella 215,8 × 39,8 mm · vízcsatornás</span></Html>
    </group>}
  </group>
}
