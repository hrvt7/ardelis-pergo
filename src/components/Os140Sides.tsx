// Az MB-OpenSky 140 oldalzárásai gyári metszetekből és szabályokból (os140Sides.ts):
//  • SkyRoll ZIP: SRS90E/100 tok a gerenda alatt, a belső síkkal egy vonalban; PP SRS/35/T vezetősín az oszlopok
//    oldallapján, a szövet a tok résében (20 mm-re a belső síktól); BOA SRS záróléc; 5 m / 16 m² felett osztva.
//  • MB-OpenSlide: felső vezető és küszöb sínekkel, a szárnyszám a gyári táblázatból; nyitáskor egy oldalra tolódnak.
// A szegmens helyi kerete: x a szegmens mentén (középen 0), y felfelé, z: `inward` a pergola belseje felé.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { stillMotion, sceneTime } from '@/lib/sceneClock'
import { OS140 } from '@/lib/os140'
import { openSlidePlan, sideEndInsets, ZIP, zipPlan, OPENSLIDE } from '@/lib/os140Sides'
import { ZIP_BAR, ZIP_BOX, ZIP_GUIDE } from '@/lib/zipProfiles'
import { alongX, loopsToShapes, upward } from '@/components/profileGeometry'
import { tr } from '@/i18n/locale'
import { GLASS_SLIDE_SECONDS, glideEase, glideStep, MAX_FRAME_DELTA, refreshShadowInMotion } from '@/lib/mechanics'

const REDUCED = stillMotion(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
const HALF_BEAM = OS140.beamW / 2
/** a vezetősín résének közepe a sín metszetében (a) és az oszloptól (b) */
const SLOT_A = -0.0395
const SLOT_B = 0.008

export function Os140Zip({ length, height, inward, open, wind, material, wallEnds }: { length: number; height: number; inward: 1 | -1; open: number; wind: boolean; material: THREE.Material; /** a szakasz −x / +x vége falhoz ér-e (ott a sín a homlokzaton) */ wallEnds?: readonly [boolean, boolean] }) {
  const s = -inward
  const zIn = inward * HALF_BEAM
  const beamBottom = height - OS140.beamH / 2
  const [insetStart, insetEnd] = sideEndInsets(wallEnds)
  const opening = Math.max(0.3, length - insetStart - insetEnd)
  const shift = (insetStart - insetEnd) / 2
  const plan = useMemo(() => zipPlan(opening, beamBottom), [opening, beamBottom])
  const boxBottom = beamBottom - ZIP.box
  const fabricZ = zIn + s * ZIP.fabric
  const sw = plan.screenWidth
  const centers = Array.from({ length: plan.screens }, (_, i) => -opening / 2 + sw * (i + 0.5))

  const geo = useMemo(() => {
    const box = alongX(loopsToShapes(ZIP_BOX, ([u, v]) => [zIn + s * u, beamBottom + v]), opening)
    // vezetősín: bal végen a nyílás felé (+x), jobb végen −x; a metszet résére esik a szövet síkja
    const guide = (dir: 1 | -1) => upward(loopsToShapes([ZIP_GUIDE[0]], ([a, b]) => [dir * b, -(zIn + s * (a - SLOT_A + ZIP.fabric))]), boxBottom)
    const bar = alongX(loopsToShapes(ZIP_BAR, ([x, y]) => [fabricZ + s * (x - 0.0202), y + 0.1916]), Math.max(0.2, sw - 0.012))
    return { box, left: guide(1), right: guide(-1), bar }
  }, [zIn, s, beamBottom, opening, boxBottom, fabricZ, sw])
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo])
  const fabricMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2c2d2e', roughness: 0.95, transparent: true, opacity: 0.93, side: THREE.DoubleSide }), [])
  useEffect(() => () => fabricMat.dispose(), [fabricMat])

  const fabrics = useRef<(THREE.Mesh | null)[]>([])
  const bars = useRef<(THREE.Group | null)[]>([])
  const group = useRef<THREE.Group>(null)
  const current = useRef(-1)
  const lastWind = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  useFrame(({ clock, gl }, delta) => {
    const previous = current.current
    current.current = REDUCED || previous < 0 ? open : THREE.MathUtils.damp(current.current, open, 8, Math.min(delta, MAX_FRAME_DELTA))
    const fraction = Math.max(0.012, 1 - current.current / 100)
    const barY = Math.max(0, boxBottom - fraction * boxBottom)
    const visible = Math.max(0.005, boxBottom - barY - 0.024)
    fabrics.current.forEach((mesh) => { if (mesh) { mesh.scale.y = visible; mesh.position.y = boxBottom - visible / 2 } })
    bars.current.forEach((bar) => { if (bar) bar.position.y = barY })
    if (group.current) group.current.rotation.z = wind ? Math.sin(sceneTime(clock.elapsedTime) * 1.6) * 0.0012 * fraction : 0
    if (Math.abs(previous - current.current) > 0.001) { refreshShadowInMotion(gl, clock.elapsedTime, Math.abs(current.current - open) < 0.05); invalidate() }
    else if (wind && clock.elapsedTime - lastWind.current >= 1 / 30) { lastWind.current = clock.elapsedTime; invalidate() }
  })

  return <group name="os140-zip" ref={group} position={[shift, 0, 0]}>
    <mesh geometry={geo.box} material={material} castShadow receiveShadow />
    {/* vezetősínek a két oszlopon; screenek között dupla sín (két sín háttal) */}
    <mesh geometry={geo.left} material={material} position={[-opening / 2, 0, 0]} castShadow />
    <mesh geometry={geo.right} material={material} position={[opening / 2, 0, 0]} castShadow />
    {centers.slice(1).map((c, i) => { const x = c - sw / 2; return <group key={i}>
      <mesh geometry={geo.right} material={material} position={[x, 0, 0]} castShadow />
      <mesh geometry={geo.left} material={material} position={[x, 0, 0]} castShadow />
    </group> })}
    {centers.map((c, i) => <group key={i} position={[c, 0, 0]}>
      <mesh ref={(m) => { fabrics.current[i] = m }} material={fabricMat} position={[0, boxBottom / 2, fabricZ]} castShadow receiveShadow>
        <boxGeometry args={[sw - 2 * SLOT_B, 1, 0.002]} />
      </mesh>
      <group ref={(g) => { bars.current[i] = g }}><mesh geometry={geo.bar} material={material} castShadow /></group>
    </group>)}
  </group>
}

const SASH = { stile: 0.02, depth: 0.03, bottom: 0.045, top: 0.03, glass: 0.01, overlap: 0.03 }

export function Os140Slide({ length, height, inward, opened, onToggle, label, material, wallEnds }: { length: number; height: number; inward: 1 | -1; opened: boolean; onToggle: () => void; label: boolean; material: THREE.Material; wallEnds?: readonly [boolean, boolean] }) {
  const s = -inward
  const zIn = inward * HALF_BEAM
  const beamBottom = height - OS140.beamH / 2
  const [insetStart, insetEnd] = sideEndInsets(wallEnds)
  const opening = Math.max(0.6, length - insetStart - insetEnd)
  const shift = (insetStart - insetEnd) / 2
  const plan = useMemo(() => openSlidePlan(opening, beamBottom), [opening, beamBottom])
  const n = plan.sashes
  const t = plan.tracks
  const sw = plan.sashWidth
  const trackZ = (k: number) => zIn + s * (0.0275 + k * OPENSLIDE.trackPitch)
  const midZ = (trackZ(0) + trackZ(t - 1)) / 2
  const guideW = Math.max(0.118, (t - 1) * OPENSLIDE.trackPitch + 0.05)
  const y0 = 0.021
  const y1 = beamBottom - 0.025
  const sashH = y1 - y0
  const closedX = (i: number) => -opening / 2 + sw * (i + 0.5)
  const openX = (i: number) => { const j = n - 1 - i; return opening / 2 - sw / 2 - Math.floor(j / t) * sw }
  const sashes = useRef<(THREE.Group | null)[]>([])
  const progress = useRef(-1)
  const invalidate = useThree((state) => state.invalidate)
  useFrame(({ gl, clock }, delta) => {
    const target = opened ? 1 : 0
    const prev = progress.current
    progress.current = REDUCED || prev < 0 ? target : glideStep(prev, target, delta, GLASS_SLIDE_SECONDS)
    const eased = glideEase(progress.current)
    sashes.current.forEach((g, i) => { if (g) g.position.x = THREE.MathUtils.lerp(closedX(i), openX(i), eased) })
    if (Math.abs(prev - progress.current) > 0.0005) { refreshShadowInMotion(gl, clock.elapsedTime, progress.current === target); invalidate() }
  })
  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b4cdd0', metalness: 0.02, roughness: 0.045, transparent: true, opacity: 0.28, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false }), [])
  useEffect(() => () => glassMat.dispose(), [glassMat])
  const w = sw + SASH.overlap
  return <group name="os140-openslide" position={[shift, 0, 0]} onClick={(event) => { event.stopPropagation(); onToggle(); invalidate() }}>
    {/* felső vezető (50 mm) a gerenda alatt, küszöb (19 mm) a padlón, sínek a küszöbön */}
    <mesh material={material} position={[0, beamBottom - 0.025, midZ]} castShadow receiveShadow><boxGeometry args={[opening, 0.05, guideW]} /></mesh>
    <mesh material={material} position={[0, 0.0095, midZ]} receiveShadow><boxGeometry args={[opening, 0.019, guideW]} /></mesh>
    {Array.from({ length: t }, (_, k) => <mesh key={k} material={material} position={[0, 0.019 + 0.004, trackZ(k)]}><boxGeometry args={[opening, 0.008, 0.004]} /></mesh>)}
    {Array.from({ length: n }, (_, i) => {
      const track = (n - 1 - i) % t
      return <group key={i} ref={(g) => { sashes.current[i] = g }} position={[closedX(i), 0, trackZ(track)]}>
        <mesh material={material} position={[-w / 2 + SASH.stile / 2, y0 + sashH / 2, 0]} castShadow><boxGeometry args={[SASH.stile, sashH, SASH.depth]} /></mesh>
        <mesh material={material} position={[w / 2 - SASH.stile / 2, y0 + sashH / 2, 0]} castShadow><boxGeometry args={[SASH.stile, sashH, SASH.depth]} /></mesh>
        <mesh material={material} position={[0, y0 + SASH.bottom / 2, 0]} castShadow><boxGeometry args={[w, SASH.bottom, SASH.depth]} /></mesh>
        <mesh material={material} position={[0, y1 - SASH.top / 2, 0]} castShadow><boxGeometry args={[w, SASH.top, SASH.depth]} /></mesh>
        <mesh material={glassMat} position={[0, y0 + SASH.bottom + (sashH - SASH.bottom - SASH.top) / 2, 0]} renderOrder={2}><boxGeometry args={[w - 2 * SASH.stile, sashH - SASH.bottom - SASH.top, SASH.glass]} /></mesh>
      </group>
    })}
    {label && <Html position={[0, 0.3, midZ + inward * 0.12]} center className="interaction-label" zIndexRange={[7, 0]}>{opened ? tr('Üveg bezárása', 'Glas schließen') : tr('Üveg eltolása', 'Glas verschieben')}</Html>}
  </group>
}
