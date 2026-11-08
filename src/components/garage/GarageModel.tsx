// Garázskapu 3D: szekcionált (sínen felfutó panelek), billenő (kilendülő lap), redőny (tengelydobozba tekeredő lécek)
// és oldalra nyíló szekcionált (a belső fal mentén elforduló függőleges panelek). Valós méretek méterben; a nyitás
// animált (csillapított), a panelminta, az ablakok, a személybejáró és a vasalat a konfigurációból épül.
// A kapu síkja z = -0.2 (a fal 0,36 m vastag, a homlokzat síkja z = 0, a kapu a kávában ül).
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { garageFeatures, type GarageConfig } from '@/products/garage'

export interface GarageMaterials {
  panel: THREE.Material
  panelDark: THREE.Material
  frame: THREE.Material
  hardware: THREE.Material
  glass: THREE.Material
  rubber: THREE.Material
  screen: THREE.Material
  glow: THREE.Material
}
type Vec3 = [number, number, number]

export const DOOR_Z = -0.2
const PANEL_T = 0.045
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20)
const REDUCED = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function B({ mat, p, s, r = [0, 0, 0], shadow = true }: { mat: THREE.Material; p: Vec3; s: Vec3; r?: Vec3; shadow?: boolean }) {
  return <mesh geometry={BOX} material={mat} position={p} scale={s} rotation={r} castShadow={shadow} receiveShadow={shadow} />
}
function C({ mat, p, s, r = [0, 0, 0] }: { mat: THREE.Material; p: Vec3; s: Vec3; r?: Vec3 }) {
  return <mesh geometry={CYL} material={mat} position={p} scale={s} rotation={r} castShadow receiveShadow />
}

function refreshShadow(renderer: THREE.WebGLRenderer) { renderer.shadowMap.needsUpdate = true }

/** Csillapított nyitás-animáció: minden képkockán az `apply` kapja a 0..1 közti állapotot. */
function useOpening(open: boolean, apply: (t: number) => void) {
  const progress = useRef(open ? 1 : 0)
  const lastShadow = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  useLayoutEffect(() => { apply(progress.current); invalidate() })
  useFrame(({ clock }, delta) => {
    const target = open ? 1 : 0
    const next = REDUCED ? target : THREE.MathUtils.damp(progress.current, target, 2.6, delta)
    if (Math.abs(next - progress.current) < 0.0004 && progress.current === target) return
    progress.current = Math.abs(next - target) < 0.0004 ? target : next
    apply(progress.current)
    if (clock.elapsedTime - lastShadow.current > 0.12 || progress.current === target) { refreshShadow(gl); lastShadow.current = clock.elapsedTime }
    invalidate()
  })
}

type WindowRect = { x: number; w: number; h: number }

/** Egy kapupanel (vagy a billenő lap) arca a mintával és az ablakokkal; középre igazítva, az arc +z felé néz. */
function PanelFace({ width, height, config, m, windows = [], seamsX = [] }: { width: number; height: number; config: GarageConfig; m: GarageMaterials; windows?: WindowRect[]; seamsX?: number[] }) {
  const face = PANEL_T / 2
  const grooves: number[] = []
  if (config.panel === 'microRib') { const n = Math.max(1, Math.round(height / 0.125)); for (let i = 1; i < n; i++) grooves.push(-height / 2 + (i * height) / n) }
  else if (config.panel === 'largeRib' && height > 0.3) grooves.push(0)
  else if (config.panel === 'woodgrain') { const n = Math.max(1, Math.round(height / 0.25)); for (let i = 1; i < n; i++) grooves.push(-height / 2 + (i * height) / n) }
  const cassettes = config.panel === 'cassette' ? Math.max(1, Math.round(width / 0.62)) : 0
  return <group>
    <B mat={m.panel} p={[0, 0, 0]} s={[width, height - 0.012, PANEL_T]} />
    {grooves.map((y) => <B key={y} mat={m.panelDark} p={[0, y, face + 0.001]} s={[width - 0.016, config.panel === 'woodgrain' ? 0.003 : 0.007, 0.004]} shadow={false} />)}
    {Array.from({ length: cassettes }, (_, i) => {
      const x = -width / 2 + ((i + 0.5) * width) / cassettes
      const cw = Math.min(0.5, width / cassettes - 0.14)
      return <group key={i}>
        <B mat={m.panel} p={[x, 0, face + 0.006]} s={[cw, height * 0.62, 0.012]} />
        <B mat={m.panelDark} p={[x, 0, face + 0.013]} s={[cw - 0.1, height * 0.62 - 0.1, 0.003]} shadow={false} />
      </group>
    })}
    {seamsX.map((x) => <B key={x} mat={m.panelDark} p={[x, 0, face + 0.001]} s={[0.007, height - 0.02, 0.004]} shadow={false} />)}
    {windows.map((win, i) => <group key={i}>
      <B mat={m.frame} p={[win.x, 0, face + 0.004]} s={[win.w + 0.07, win.h + 0.07, 0.012]} />
      <B mat={m.glass} p={[win.x, 0, face + 0.011]} s={[win.w, win.h, 0.004]} shadow={false} />
    </group>)}
  </group>
}

/** Ablakok paneleken: a szekcionált kapu paneljeire sorolva (i = panel index alulról, n = panelszám). */
function panelWindows(config: GarageConfig, width: number, i: number, n: number, ph: number): WindowRect[] {
  if (config.windows === 'none') return []
  if (config.windows === 'topRow' && i === n - 1) {
    const count = Math.max(1, Math.floor((width - 0.3) / 0.62))
    const h = Math.min(0.3, ph * 0.56)
    return Array.from({ length: count }, (_, k) => ({ x: -width / 2 + ((k + 0.5) * width) / count, w: Math.min(0.5, width / count - 0.14), h }))
  }
  if (config.windows === 'vertical' && i >= 1) return [-1, 1].map((side) => ({ x: side * (width / 2 - 0.46), w: 0.22, h: ph - 0.1 }))
  if (config.windows === 'square' && i === n - 1) {
    const size = Math.min(0.34, ph * 0.6)
    const count = Math.max(2, Math.min(5, Math.round(width / 0.7)))
    return Array.from({ length: count }, (_, k) => ({ x: -width / 2 + ((k + 0.5) * width) / count, w: size, h: size }))
  }
  return []
}

/** Közös tok: két oldalsó szár, szemöldök, alsó tömítés; a kapu síkjában. */
function Jambs({ width, height, m }: { width: number; height: number; m: GarageMaterials }) {
  return <group position={[0, 0, DOOR_Z]}>
    {[-1, 1].map((s) => <B key={s} mat={m.frame} p={[s * (width / 2 + 0.04), height / 2 + 0.03, 0]} s={[0.08, height + 0.06, 0.1]} />)}
    <B mat={m.frame} p={[0, height + 0.04, 0]} s={[width + 0.16, 0.08, 0.1]} />
    <B mat={m.rubber} p={[0, 0.012, 0.02]} s={[width, 0.024, 0.04]} shadow={false} />
  </group>
}

function Sectional({ config, m, open }: { config: GarageConfig; m: GarageMaterials; open: boolean }) {
  const { width, height } = config
  const n = Math.max(3, Math.round(height / 0.5))
  const ph = height / n
  const headroom = config.lowHeadroom ? 0.16 : 0.36
  const r = config.lowHeadroom ? 0.24 : 0.34
  const vertical = height + headroom - r
  const refs = useRef<(THREE.Group | null)[]>([])
  const wicketX = -width / 2 + 0.2
  const handlePanel = Math.min(n - 1, Math.floor(1.05 / ph))
  useOpening(open, (t) => {
    const travel = t * (height + 0.12)
    refs.current.forEach((group, i) => {
      if (!group) return
      const d = (i + 0.5) * ph + travel
      if (d <= vertical) { group.position.set(0, d, 0); group.rotation.x = 0 }
      else if (d <= vertical + (r * Math.PI) / 2) {
        const a = (d - vertical) / r
        group.position.set(0, vertical + r * Math.sin(a), -(r - r * Math.cos(a)))
        group.rotation.x = -a
      } else {
        group.position.set(0, vertical + r, -(r + (d - vertical - (r * Math.PI) / 2)))
        group.rotation.x = -Math.PI / 2
      }
    })
  })
  const trackY = height + headroom
  const arc = Array.from({ length: 6 }, (_, k) => { const a = ((k + 0.5) / 6) * (Math.PI / 2); return { p: [vertical + r * Math.sin(a), -(r - r * Math.cos(a))] as [number, number], rot: -a } })
  return <group position={[0, 0, DOOR_Z]}>
    {Array.from({ length: n }, (_, i) => <group key={i} ref={(el) => { refs.current[i] = el }}>
      <PanelFace width={width - 0.02} height={ph} config={config} m={m} windows={panelWindows(config, width, i, n, ph)} seamsX={config.wicket ? [wicketX, wicketX + 0.9] : []} />
      {i === 0 && <B mat={m.rubber} p={[0, -ph / 2 + 0.012, 0]} s={[width - 0.02, 0.024, PANEL_T + 0.01]} shadow={false} />}
      {config.wicket && i === handlePanel && <>
        <B mat={m.hardware} p={[wicketX + 0.78, 1.05 - (i + 0.5) * ph, PANEL_T / 2 + 0.03]} s={[0.025, 0.17, 0.025]} />
        <B mat={m.hardware} p={[wicketX + 0.78, 1.05 - (i + 0.5) * ph + 0.06, PANEL_T / 2 + 0.018]} s={[0.025, 0.025, 0.03]} />
        <C mat={m.hardware} p={[wicketX + 0.78, 1.05 - (i + 0.5) * ph - 0.09, PANEL_T / 2 + 0.006]} s={[0.014, 0.004, 0.014]} r={[Math.PI / 2, 0, 0]} />
      </>}
      {/* Görgők a panel szélein (a sínben futnak) */}
      {[-1, 1].map((s) => <C key={s} mat={m.hardware} p={[s * (width / 2 + 0.03), 0, -0.06]} s={[0.022, 0.012, 0.022]} r={[0, 0, Math.PI / 2]} />)}
    </group>)}
    {/* Függőleges és vízszintes sínek, ív */}
    {[-1, 1].map((s) => <group key={s} position={[s * (width / 2 + 0.07), 0, -0.06]}>
      <B mat={m.hardware} p={[0, vertical / 2, 0]} s={[0.04, vertical, 0.06]} />
      {arc.map((seg, k) => <B key={k} mat={m.hardware} p={[0, seg.p[0], seg.p[1]]} s={[0.04, (r * Math.PI) / 2 / 6 + 0.01, 0.06]} r={[seg.rot, 0, 0]} />)}
      <B mat={m.hardware} p={[0, trackY, -(r + (height + 0.6) / 2)]} s={[0.04, 0.06, height + 0.6]} />
      <B mat={m.hardware} p={[0, trackY - 0.1, -(r + (height + 0.6) / 2)]} s={[0.03, 0.03, height + 0.6]} />
    </group>)}
    {/* Torziós rugó tengelye, rugók és kötéldobok a szemöldök fölött */}
    <C mat={m.hardware} p={[0, trackY + 0.14, -0.1]} s={[0.014, width + 0.34, 0.014]} r={[0, 0, Math.PI / 2]} />
    {[-1, 1].map((s) => <group key={s}>
      <C mat={m.hardware} p={[s * (width / 4), trackY + 0.14, -0.1]} s={[0.05, Math.min(0.9, width / 2 - 0.3), 0.05]} r={[0, 0, Math.PI / 2]} />
      <C mat={m.frame} p={[s * (width / 2 + 0.1), trackY + 0.14, -0.1]} s={[0.07, 0.09, 0.07]} r={[0, 0, Math.PI / 2]} />
    </group>)}
    <B mat={m.frame} p={[0, trackY + 0.14, -0.1]} s={[0.1, 0.26, 0.08]} />
    {/* Motor: mennyezeti sín a kapu közepén, hajtófej hátul, fény a fejen */}
    {config.motor && <group position={[0, trackY + 0.1, 0]}>
      <B mat={m.hardware} p={[0, 0, -(r + 0.2 + (height + 0.9) / 2)]} s={[0.07, 0.05, height + 0.9]} />
      <B mat={m.frame} p={[0, -0.1, -(r + 0.2 + height + 0.9)]} s={[0.34, 0.17, 0.44]} />
      <B mat={m.glow} p={[0, -0.19, -(r + 0.2 + height + 0.9)]} s={[0.22, 0.012, 0.3]} shadow={false} />
      <B mat={m.hardware} p={[0, -0.04, -(r + 0.3)]} s={[0.05, 0.03, 0.22]} />
    </group>}
  </group>
}

function Tilt({ config, m, open }: { config: GarageConfig; m: GarageMaterials; open: boolean }) {
  const { width, height } = config
  const pivot = useRef<THREE.Group>(null)
  const arms = useRef<(THREE.Group | null)[]>([])
  useOpening(open, (t) => {
    if (pivot.current) {
      pivot.current.position.set(0, height + 0.05 * t, -t * height * 0.6)
      pivot.current.rotation.x = -t * (Math.PI / 2) * 0.98
    }
    arms.current.forEach((arm) => {
      if (!arm) return
      // A kar a tokszár közepétől a lap alsó harmadáig ér: nyitva vízszintes közelbe fordul.
      arm.rotation.x = -t * 1.25
    })
  })
  const rowCount = Math.max(1, Math.floor((width - 0.3) / 0.62))
  const windows: WindowRect[] = config.windows === 'none' ? [] : config.windows === 'vertical'
    ? [-1, 1].map((s) => ({ x: s * (width / 2 - 0.46), w: 0.22, h: height * 0.45 }))
    : Array.from({ length: rowCount }, (_, k) => ({ x: -width / 2 + ((k + 0.5) * width) / rowCount, w: config.windows === 'square' ? 0.32 : Math.min(0.5, width / rowCount - 0.14), h: config.windows === 'square' ? 0.32 : 0.3 }))
  return <group position={[0, 0, DOOR_Z]}>
    <group ref={pivot} position={[0, height, 0]}>
      <group position={[0, -height / 2, 0]}>
        <PanelFace width={width - 0.02} height={height - 0.02} config={config} m={m} />
        {/* Ablakok a lap felső harmadában (függőleges sávnál középen), kilincs középen */}
        {windows.length > 0 && <group position={[0, config.windows === 'vertical' ? 0.1 : height * 0.3, 0]}><PanelFace width={0.001} height={0.001} config={config} m={m} windows={windows} /></group>}
        <B mat={m.hardware} p={[0, -(height / 2 - 1.0), PANEL_T / 2 + 0.03]} s={[0.26, 0.03, 0.03]} />
        <B mat={m.hardware} p={[0, -(height / 2 - 1.0), PANEL_T / 2 + 0.012]} s={[0.06, 0.06, 0.02]} />
        <B mat={m.rubber} p={[0, -height / 2 + 0.012, 0]} s={[width - 0.02, 0.024, PANEL_T + 0.01]} shadow={false} />
      </group>
    </group>
    {/* Billenő karok és húzórugók a tokszárakon */}
    {[-1, 1].map((s, i) => <group key={s} position={[s * (width / 2 + 0.08), height * 0.55, -0.05]}>
      <group ref={(el) => { arms.current[i] = el }}>
        <B mat={m.hardware} p={[0, -0.45, 0]} s={[0.03, 0.9, 0.04]} />
      </group>
      <C mat={m.hardware} p={[0, 0.35, -0.08]} s={[0.035, 0.7, 0.035]} />
    </group>)}
  </group>
}

function Roller({ config, m, open }: { config: GarageConfig; m: GarageMaterials; open: boolean }) {
  const { width, height } = config
  const slat = 0.077
  const max = Math.ceil(height / slat) + 1
  const slats = useRef<(THREE.Mesh | null)[]>([])
  const coil = useRef<THREE.Mesh>(null)
  useOpening(open, (t) => {
    const bottom = t * (height - 0.05)
    slats.current.forEach((mesh, i) => {
      if (!mesh) return
      const y = height - (i + 0.5) * slat
      const visible = y - slat / 2 >= bottom - slat
      mesh.visible = visible
      mesh.position.y = Math.max(y, bottom + slat / 2)
    })
    if (coil.current) { const rad = 0.09 + t * 0.07; coil.current.scale.set(rad, width + 0.1, rad) }
  })
  return <group position={[0, 0, DOOR_Z]}>
    {Array.from({ length: max }, (_, i) => <mesh key={i} ref={(el) => { slats.current[i] = el }} geometry={BOX} material={i % 2 === 0 ? m.panel : m.panelDark} position={[0, height - (i + 0.5) * slat, 0]} scale={[width - 0.02, slat - 0.004, 0.02]} castShadow receiveShadow />)}
    <B mat={m.rubber} p={[0, 0.02, 0]} s={[width - 0.02, 0.04, 0.03]} shadow={false} />
    {/* Tengelydoboz a szemöldök fölött (elöl zárt), benne a feltekeredő tengely */}
    <B mat={m.frame} p={[0, height + 0.21, -0.05]} s={[width + 0.3, 0.36, 0.36]} />
    <mesh ref={coil} geometry={CYL} material={m.panelDark} position={[0, height + 0.21, -0.05]} rotation={[0, 0, Math.PI / 2]} scale={[0.1, width + 0.1, 0.1]} castShadow />
    {[-1, 1].map((s) => <B key={s} mat={m.frame} p={[s * (width / 2 + 0.035), height / 2, 0]} s={[0.07, height, 0.09]} />)}
    {config.motor && <B mat={m.hardware} p={[width / 2 + 0.22, height + 0.21, -0.05]} s={[0.14, 0.12, 0.12]} />}
  </group>
}

function SideSliding({ config, m, open }: { config: GarageConfig; m: GarageMaterials; open: boolean }) {
  const { width, height } = config
  const pw = 0.5
  const n = Math.ceil(width / pw)
  const refs = useRef<(THREE.Group | null)[]>([])
  const seams = useMemo(() => [-pw / 2 + 0.002, pw / 2 - 0.002], [])
  useOpening(open, (t) => {
    refs.current.forEach((group, i) => {
      if (!group) return
      const x = -width / 2 + (i + 0.5) * pw - t * (width + 0.3)
      const past = -width / 2 - x
      if (past <= 0) { group.position.set(x, height / 2, 0); group.rotation.y = 0 }
      else { group.position.set(-width / 2 - 0.12, height / 2, -(past + pw / 2)); group.rotation.y = Math.PI / 2 }
    })
  })
  return <group position={[0, 0, DOOR_Z]}>
    {Array.from({ length: n }, (_, i) => <group key={i} ref={(el) => { refs.current[i] = el }}>
      <PanelFace width={pw - 0.004} height={height - 0.02} config={config} m={m} windows={config.windows !== 'none' && i >= n - 3 ? [{ x: 0, w: pw - 0.22, h: config.windows === 'vertical' ? height * 0.6 : 0.3 }] : []} seamsX={config.panel === 'flat' ? [] : seams} />
    </group>)}
    <B mat={m.hardware} p={[-width / 4, height + 0.09, -0.08]} s={[width * 1.6, 0.06, 0.06]} />
    <B mat={m.hardware} p={[-width / 4, 0.03, -0.08]} s={[width * 1.6, 0.03, 0.06]} />
    {config.motor && <B mat={m.frame} p={[-width / 2 - 0.2, height + 0.2, -0.3]} s={[0.3, 0.16, 0.24]} />}
  </group>
}

/** Fotocellák, okos kódkapcsoló, személybejáró feletti címke — a kapu típusától függetlenül. */
function Accessories({ config, m }: { config: GarageConfig; m: GarageMaterials }) {
  const { width } = config
  return <group>
    {config.motor && config.photocell && [-1, 1].map((s) => <group key={s} position={[s * (width / 2 + 0.04), 0.38, DOOR_Z + 0.07]}>
      <B mat={m.frame} p={[0, 0, 0]} s={[0.06, 0.1, 0.035]} />
      <B mat={m.screen} p={[0, 0, 0.018]} s={[0.03, 0.03, 0.004]} shadow={false} />
    </group>)}
    {config.motor && config.smartControl && <group position={[width / 2 + 0.26, 1.38, 0.025]}>
      <B mat={m.frame} p={[0, 0, 0]} s={[0.1, 0.16, 0.035]} />
      <B mat={m.screen} p={[0, 0.035, 0.019]} s={[0.07, 0.05, 0.004]} shadow={false} />
      {[0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => <B key={`${row}${col}`} mat={m.hardware} p={[-0.025 + col * 0.025, -0.02 - row * 0.022, 0.019]} s={[0.016, 0.014, 0.004]} shadow={false} />))}
    </group>}
  </group>
}

/** Illeszkedő oldalajtó a kapu mellett (jobbra), azonos panelmintával és színnel; a homlokzat síkjában ül. */
export function SideDoor({ config, m, x }: { config: GarageConfig; m: GarageMaterials; x: number }) {
  const w = 0.95
  const h = 2.1
  return <group position={[x, 0, DOOR_Z]}>
    {[-1, 1].map((s) => <B key={s} mat={m.frame} p={[s * (w / 2 + 0.035), h / 2 + 0.03, 0]} s={[0.07, h + 0.06, 0.1]} />)}
    <B mat={m.frame} p={[0, h + 0.035, 0]} s={[w + 0.14, 0.07, 0.1]} />
    <group position={[0, h / 2, 0]}><PanelFace width={w - 0.02} height={h - 0.02} config={{ ...config, panel: config.type === 'roller' ? 'flat' : config.panel }} m={m} /></group>
    <B mat={m.hardware} p={[w / 2 - 0.12, 1.05, PANEL_T / 2 + 0.03]} s={[0.025, 0.17, 0.025]} />
    <B mat={m.hardware} p={[w / 2 - 0.12, 1.11, PANEL_T / 2 + 0.018]} s={[0.025, 0.025, 0.03]} />
    <C mat={m.hardware} p={[w / 2 - 0.12, 0.96, PANEL_T / 2 + 0.006]} s={[0.014, 0.004, 0.014]} r={[Math.PI / 2, 0, 0]} />
  </group>
}

export default function GarageModel({ config, materials: m, open }: { config: GarageConfig; materials: GarageMaterials; open: boolean }) {
  const features = garageFeatures(config.type)
  const effective = features.wicket ? config : { ...config, wicket: false }
  return <group name="garage-door">
    <Jambs width={config.width} height={config.height} m={m} />
    {config.type === 'sectional' && <Sectional config={effective} m={m} open={open} />}
    {config.type === 'tilt' && <Tilt config={effective} m={m} open={open} />}
    {config.type === 'roller' && <Roller config={effective} m={m} open={open} />}
    {config.type === 'sideSliding' && <SideSliding config={effective} m={m} open={open} />}
    <Accessories config={config} m={m} />
  </group>
}
