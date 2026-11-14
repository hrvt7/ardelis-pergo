import { useEffect, useMemo, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Jacuzzi 2 × 2 m: termofa burkolatú szekrény, ívelt akrilperem, belső héj fúvókákkal, mozdulatlan, buborékos víztükör.
// Nincs animáció: állókép, így nem terheli a megjelenítést. Minden egyedi elem egy-egy egyesített hálóban van (kevés draw call).

/** Közös shader-uniformok: egyetlen jacuzzi van a jelenetben, így modulszintű objektum elég (nincs hook által védett érték módosítása). */
const SHARED = { time: { value: 1.3 }, night: { value: 0 } }

const WATER_Y = 0.79

function roundedRect<T extends THREE.Path>(width: number, depth: number, radius: number, path: T): T {
  const x = -width / 2
  const y = -depth / 2
  path.moveTo(x + radius, y)
  path.lineTo(x + width - radius, y)
  path.quadraticCurveTo(x + width, y, x + width, y + radius)
  path.lineTo(x + width, y + depth - radius)
  path.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth)
  path.lineTo(x + radius, y + depth)
  path.quadraticCurveTo(x, y + depth, x, y + depth - radius)
  path.lineTo(x, y + radius)
  path.quadraticCurveTo(x, y, x + radius, y)
  return path
}

function useTubGeometry() {
  return useMemo(() => {
    // A vízfelszín a modellezett akrilhéj belső nyílását tölti ki (1,7 × 1,7 m, 0,2 m-es sarokívvel).
    const surface = new THREE.ShapeGeometry(roundedRect(1.7, 1.7, 0.2, new THREE.Shape()), 10)
    surface.rotateX(-Math.PI / 2)
    return { surface }
  }, [])
}

const WATER_VERTEX = /* glsl */ `
  varying vec2 vPos;
  varying vec3 vWorld;
  void main() {
    vPos = position.xz;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`
const WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uNight;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  varying vec2 vPos;
  varying vec3 vWorld;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    // Forrás: a medence közepe felé erősebb mozgás, a felszínen cellánként kipattanó buborékgyűrűk.
    vec2 q = vPos * 8.0;
    vec2 cell = floor(q);
    vec2 f = fract(q) - 0.5;
    float h = hash(cell);
    float phase = fract(uTime * (0.55 + h * 0.5) + h * 7.0);
    float ring = (1.0 - smoothstep(0.0, 0.06, abs(length(f - (vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5) * 0.4) - phase * 0.34))) * (1.0 - phase);
    float foam = ring * step(0.35, h);
    float edge = max(abs(vPos.x), abs(vPos.y)) / 0.85;
    float rimFoam = smoothstep(0.86, 1.0, edge) * 0.6;
    float depthMix = clamp(0.35 + (1.0 - edge) * 0.25, 0.0, 1.0);
    vec3 color = mix(uDeep, uShallow, depthMix);
    // Fresnel: laposabb szögből világosabb, az égboltot tükrözi.
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - clamp(viewDir.y, 0.0, 1.0), 3.0);
    color = mix(color, vec3(0.78, 0.9, 0.95), fresnel * 0.55);
    color += vec3(0.85, 0.95, 1.0) * (foam * 0.7 + rimFoam * 0.18);
    color += uNight * vec3(0.05, 0.42, 0.55) * 0.65;
    gl_FragColor = vec4(color, 0.9);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
/** `shell`: a Blenderben modellezett jacuzzi (akrilhéj ülőpadokkal, fúvókák, szekrény, lépcső); a víz és a LED-csík itt készül. */
export default function HotTub({ night = false, shell }: { night?: boolean; shell: ReactNode }) {
  const geometry = useTubGeometry()

  const water = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: SHARED.time, uNight: SHARED.night, uDeep: { value: new THREE.Color('#0d6e86') }, uShallow: { value: new THREE.Color('#4fc3d4') } },
  }), [])
  // A beállítások a képkocka elején kerülnek a shaderbe (nem a renderelés közben módosított objektumba).
  useFrame(() => {
    SHARED.night.value = night ? 1 : 0
  })
  useEffect(() => () => { water.dispose() }, [water])
  useEffect(() => () => Object.values(geometry).forEach((item) => item.dispose()), [geometry])

  return <group name="hot-tub">
    {shell}
    {/* Világító LED-csík a lábazaton. */}
    {[[0, 1.036, 2.06, 0.012], [0, -1.036, 2.06, 0.012], [1.036, 0, 0.012, 2.06], [-1.036, 0, 0.012, 2.06]].map(([x, z, w, d]) => <mesh key={`${x}${z}`} position={[x, 0.07, z]}>
      <boxGeometry args={[w, 0.012, d]} /><meshStandardMaterial color="#0b1f26" emissive="#37d4ee" emissiveIntensity={night ? 2.4 : 0.12} toneMapped={false} />
    </mesh>)}
    {/* Víz és buborékok. */}
    <mesh geometry={geometry.surface} position={[0, WATER_Y, 0]} material={water} renderOrder={2} />
  </group>
}
