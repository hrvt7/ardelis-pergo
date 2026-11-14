// A gyártói nyitóoldal élő 3D-je: a konfigurátor valódi lamellás teteje (LouvreRoof) egy terasz fölött.
// A lamellaszöget a görgetés, a kurzor és a hero-ban lévő csúszka adja; a szerkezet színe a színválasztóból jön.
// Lustán töltődik: amíg nincs kész, a statikus képernyőkép látszik alatta (a nyitócím nem vár rá).
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Environment, RoundedBox } from '@react-three/drei'
import { assetUrl } from '@/lib/assetUrl'
import LouvreRoof from '@/components/LouvreRoof'
import { louvreAngle, type LouvreDrive } from '@/components/platform/louvreDrive'

const W = 4.2
const D = 3.6
const H = 2.55
const BEAM = 0.19
const BEAM_H = 0.23

const skyVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`
const skyFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime; uniform vec2 uSun;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 uv = vUv;
  vec3 zenith = vec3(0.55, 0.66, 0.70);
  vec3 horizon = vec3(0.93, 0.91, 0.84);
  vec3 col = mix(horizon, zenith, smoothstep(0.25, 1.0, uv.y));
  float d = distance(uv, uSun);
  col += vec3(1.0, 0.93, 0.74) * exp(-d * 4.0) * 0.55;
  col += (noise(uv * vec2(3.0, 9.0) + vec2(uTime * 0.01, 0.0)) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}`

function Sky({ drive }: { drive: RefObject<LouvreDrive> }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: skyVertex, fragmentShader: skyFragment, depthWrite: false, depthTest: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: new THREE.Vector2(0.78, 0.86) } },
  }), [])
  useEffect(() => () => mat.dispose(), [mat])
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    const material = mesh.current?.material as THREE.ShaderMaterial | undefined
    if (!material) return
    material.uniforms.uTime.value += delta
    const sun = material.uniforms.uSun.value as THREE.Vector2
    sun.x = THREE.MathUtils.damp(sun.x, 0.78 + drive.current.px * 0.08, 3, delta)
  })
  return <mesh ref={mesh} renderOrder={-1} frustumCulled={false} material={mat}><planeGeometry args={[2, 2]} /></mesh>
}

function Terrace({ drive, compact }: { drive: RefObject<LouvreDrive>; compact: boolean }) {
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2f3230', roughness: 0.42, metalness: 0.35 }), [])
  const blade = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2f3230', roughness: 0.38, metalness: 0.3 }), [])
  const deck = useMemo(() => new THREE.MeshStandardMaterial({ map: deckTexture(), roughness: 0.78 }), [])
  const env = useMemo(() => ({
    wall: new THREE.MeshStandardMaterial({ color: '#e4ded0', roughness: 0.92, map: plasterTexture() }),
    glass: new THREE.MeshStandardMaterial({ color: '#1f2826', roughness: 0.06, metalness: 0.7 }),
    trim: new THREE.MeshStandardMaterial({ color: '#2b2e2c', roughness: 0.5 }),
    lawn: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, map: grassTexture() }),
    fabric: new THREE.MeshStandardMaterial({ color: '#d8d1bf', roughness: 0.95 }),
    cushion: new THREE.MeshStandardMaterial({ color: '#6f7a4a', roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: '#6b5236', roughness: 0.7 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#4f6129', roughness: 0.9 }),
    pot: new THREE.MeshStandardMaterial({ color: '#2c2d27', roughness: 0.6 }),
  }), [])
  useEffect(() => () => { frame.dispose(); blade.dispose(); deck.map?.dispose(); deck.dispose(); Object.values(env).forEach((m) => { m.map?.dispose(); m.dispose() }) }, [frame, blade, deck, env])
  const sun = useRef<THREE.DirectionalLight>(null)
  const look = useMemo(() => new THREE.Vector3(0, 1.5, 0), [])
  const color = useMemo(() => new THREE.Color(), [])
  useFrame(({ camera, invalidate }, delta) => {
    const d = drive.current
    // a kamera lassan körbejár a kurzorral, a görgetéssel közelebb lép
    const az = -0.62 + d.px * 0.16
    const r = (compact ? 9.4 : 8.6) - d.progress * 1.2
    camera.position.x = THREE.MathUtils.damp(camera.position.x, Math.sin(az) * r, 2.6, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, Math.cos(az) * r, 2.6, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 5.3 - d.py * 0.4, 2.6, delta)
    camera.lookAt(look)
    if (sun.current) sun.current.position.set(3.4 + d.px * 1.6, 7.5, 2.6)
    color.set(d.frame)
    frame.color.lerp(color, Math.min(1, delta * 6))
    blade.color.copy(frame.color)
    invalidate()
  })
  return <group>
    <Environment files={assetUrl('/assets/hdr/day_clear-512.hdr')} environmentIntensity={0.5} />
    <hemisphereLight args={['#fdfbf0', '#5a5a3a', 0.9]} />
    <directionalLight ref={sun} castShadow intensity={3} color="#fff4d6" position={[3.4, 7.5, 2.6]} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}>
      <orthographicCamera attach="shadow-camera" args={[-5, 5, 5, -5, 0.5, 20]} />
    </directionalLight>
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow material={env.lawn}><planeGeometry args={[40, 40]} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0.3]} receiveShadow material={deck}><planeGeometry args={[6.4, 5.2]} /></mesh>
    <mesh position={[0, 2.6, -D / 2 - 0.16]} material={env.wall} receiveShadow castShadow><boxGeometry args={[11, 5.2, 0.24]} /></mesh>
    {[[-3.4, 1.55, 1.5, 2.3], [0.1, 1.2, 1.2, 2.4], [3.3, 1.65, 1.6, 1.5]].map(([x, y, w, h]) => <group key={x} position={[x, y, -D / 2 - 0.02]}>
      <mesh material={env.trim}><boxGeometry args={[w + 0.12, h + 0.12, 0.05]} /></mesh>
      <mesh material={env.glass} position={[0, 0, 0.03]}><boxGeometry args={[w, h, 0.02]} /></mesh>
    </group>)}
    <group position={[-0.55, 0, -0.78]}>
      <RoundedBox args={[2.2, 0.26, 0.9]} radius={0.05} position={[0, 0.17, 0]} material={env.wood} castShadow receiveShadow />
      {[-0.54, 0.54].map((x) => <RoundedBox key={x} args={[1.04, 0.16, 0.8]} radius={0.06} smoothness={4} position={[x, 0.38, 0.02]} material={env.fabric} castShadow receiveShadow />)}
      {[-0.54, 0.54].map((x) => <RoundedBox key={`b${x}`} args={[1.0, 0.44, 0.18]} radius={0.07} smoothness={4} position={[x, 0.6, -0.33]} rotation-x={-0.12} material={env.fabric} castShadow />)}
      <RoundedBox args={[0.42, 0.34, 0.12]} radius={0.06} smoothness={4} position={[0.78, 0.6, -0.18]} rotation={[-0.2, -0.3, 0.1]} material={env.cushion} castShadow />
    </group>
    <group position={[0.55, 0, 0.55]}>
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} material={env.wood} position={[0, 0.36, -0.27 + i * 0.09]} castShadow receiveShadow><boxGeometry args={[0.95, 0.03, 0.075]} /></mesh>)}
      {[[-0.42, -0.25], [0.42, -0.25], [-0.42, 0.25], [0.42, 0.25]].map(([x, z]) => <mesh key={`${x}${z}`} material={env.pot} position={[x, 0.17, z]} castShadow><boxGeometry args={[0.04, 0.34, 0.04]} /></mesh>)}
    </group>
    {[[2.75, 0.6, 1], [-2.75, 0.2, 0.8], [2.6, -1.3, 1.15]].map(([x, z, k]) => <group key={`${x}${z}`} position={[x, 0, z]} scale={k}>
      <RoundedBox args={[0.5, 0.56, 0.5]} radius={0.04} position={[0, 0.28, 0]} material={env.pot} castShadow />
      {[[0, 0.86, 0, 0.36], [0.16, 0.74, 0.1, 0.26], [-0.15, 0.78, -0.08, 0.28], [0.04, 1.08, -0.05, 0.22]].map(([lx, ly, lz, r]) => <mesh key={`${lx}${ly}`} material={env.leaf} position={[lx, ly, lz]} castShadow><icosahedronGeometry args={[r, 2]} /></mesh>)}
    </group>)}
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <RoundedBox key={`${sx}${sz}`} args={[0.15, H, 0.15]} radius={0.012} smoothness={3} material={frame} position={[sx * (W / 2 - BEAM / 2), H / 2, sz * (D / 2 - BEAM / 2)]} castShadow receiveShadow />)}
    <mesh material={frame} position={[0, H + BEAM_H / 2 + 0.012, D / 2 - 0.01]} castShadow><boxGeometry args={[W, 0.024, 0.04]} /></mesh>
    {[-1, 1].map((s) => <mesh key={`x${s}`} material={frame} position={[0, H, s * (D / 2 - BEAM / 2)]} castShadow receiveShadow><boxGeometry args={[W, BEAM_H, BEAM]} /></mesh>)}
    {[-1, 1].map((s) => <mesh key={`z${s}`} material={frame} position={[s * (W / 2 - BEAM / 2), H, 0]} castShadow receiveShadow><boxGeometry args={[BEAM, BEAM_H, D]} /></mesh>)}
    <AngleRoof drive={drive} frame={frame} blade={blade} />
  </group>
}

function AngleRoof({ drive, frame, blade }: { drive: RefObject<LouvreDrive>; frame: THREE.Material; blade: THREE.Material }) {
  const [angle, setAngle] = useState(70)
  const last = useRef(70)
  const start = useRef(-1)
  useFrame(({ clock }) => {
    if (start.current < 0) start.current = clock.elapsedTime
    // belépő: a lamellák nyitva érkeznek, és ~2,2 s alatt beállnak
    const t = Math.min(1, (clock.elapsedTime - start.current) / 2.2)
    const next = Math.round(louvreAngle(drive.current, (1 - t) * (1 - t) * 60))
    if (next !== last.current) { last.current = next; setAngle(next) }
  })
  return <LouvreRoof width={W} depth={D} height={H} beam={BEAM} beamHeight={BEAM_H} angle={angle} driveSide={1} mechanism={false} roofMaterial={blade} frameMaterial={frame} segments={10} showLabels={false} />
}

export default function HeroLouvre({ drive, compact, onReady }: { drive: RefObject<LouvreDrive>; compact: boolean; onReady?: () => void }) {
  return <Canvas
    shadows
    dpr={compact ? [1, 1.5] : [1, 1.75]}
    camera={{ fov: 32, position: [-6.5, 5.3, 6.9], near: 0.1, far: 60 }}
    gl={{ antialias: true, powerPreference: 'high-performance' }}
    onCreated={({ gl, scene, camera }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.toneMappingExposure = 1.05
      gl.shadowMap.type = THREE.PCFSoftShadowMap
      // A rajzolás csak a shaderek lefordítása után indul (a projekt WebGL-szabálya).
      void (gl as THREE.WebGLRenderer).compileAsync(scene, camera).finally(() => onReady?.())
    }}
    aria-hidden="true"
  >
    <Sky drive={drive} />
    <Terrace drive={drive} compact={compact} />
  </Canvas>
}

/** Fa teraszburkolat kódból rajzolt textúrája (deszkák, fugák, enyhe színszórás). */
function deckTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const boards = 16
    for (let i = 0; i < boards; i++) {
      const tone = 150 + Math.round(Math.sin(i * 12.9898) * 14)
      ctx.fillStyle = `rgb(${tone + 22}, ${tone}, ${tone - 44})`
      ctx.fillRect(0, (i * 512) / boards, 512, 512 / boards - 3)
      ctx.fillStyle = 'rgba(40, 30, 18, 0.55)'
      ctx.fillRect(0, (i * 512) / boards + 512 / boards - 3, 512, 3)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1.6)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Vakolt fal finom, kódból rajzolt szemcséje. */
function plasterTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2600; i++) {
      const v = 214 + Math.floor(Math.abs(Math.sin(i * 78.233)) * 40)
      ctx.fillStyle = `rgb(${v}, ${v}, ${v - 6})`
      ctx.fillRect(Math.abs(Math.sin(i * 12.9898)) * 256, Math.abs(Math.sin(i * 4.1414)) * 256, 2, 2)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 3)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Gyep kódból: sávos nyírás és finom szemcse, hogy ne egyszínű sík legyen. */
function grassTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#5a6a31' : '#637538'; ctx.fillRect(0, i * 32, 256, 32) }
    for (let i = 0; i < 4200; i++) {
      const g = 80 + Math.floor(Math.abs(Math.sin(i * 91.7)) * 50)
      ctx.fillStyle = `rgba(${g - 30}, ${g + 10}, ${g - 50}, .55)`
      ctx.fillRect(Math.abs(Math.sin(i * 12.9898)) * 256, Math.abs(Math.sin(i * 4.1414)) * 256, 1, 3)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(10, 10)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
