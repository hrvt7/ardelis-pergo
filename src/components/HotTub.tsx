import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Jacuzzi 2 × 2 m: termofa burkolatú szekrény, ívelt akrilperem, belső héj fúvókákkal, mozdulatlan, buborékos víztükör.
// Nincs animáció: állókép, így nem terheli a megjelenítést. Minden egyedi elem egy-egy egyesített hálóban van (kevés draw call).

/** Közös shader-uniformok: egyetlen jacuzzi van a jelenetben, így modulszintű objektum elég (nincs hook által védett érték módosítása). */
const SHARED = { time: { value: 1.3 }, night: { value: 0 } }

const HALF = 1.02
const RIM_Y = 0.83
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

/** Determinisztikus áljvéletlen: ugyanaz a jacuzzi minden betöltésnél (és a tesztek is stabilak). */
const rand = (index: number, salt: number) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function useTubGeometry() {
  return useMemo(() => {
    // Termofa lécek a szekrény négy oldalán.
    const slats: THREE.BufferGeometry[] = []
    const count = 34
    const pitch = (HALF * 2 - 0.04) / count
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < count; i++) {
        const box = new THREE.BoxGeometry(pitch - 0.005, 0.8, 0.034)
        box.translate(-HALF + 0.02 + pitch * (i + 0.5), 0.43, HALF - 0.017)
        const tint = 0.8 + rand(i + side * 40, 3) * 0.4
        const colors = new Float32Array(box.getAttribute('position').count * 3)
        for (let k = 0; k < colors.length; k += 3) { colors[k] = 0.17 * tint; colors[k + 1] = 0.085 * tint; colors[k + 2] = 0.045 * tint }
        box.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        box.rotateY((side * Math.PI) / 2)
        slats.push(box)
      }
    }
    const slatGeometry = mergeGeometries(slats, false)!
    slats.forEach((part) => part.dispose())

    // Akrilperem: lekerekített négyzet gyűrű, enyhén lekerekített éllel.
    const ringShape = roundedRect(2.12, 2.12, 0.3, new THREE.Shape())
    ringShape.holes.push(roundedRect(1.7, 1.7, 0.2, new THREE.Path()))
    const rim = new THREE.ExtrudeGeometry(ringShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 3, curveSegments: 10 })
    rim.rotateX(-Math.PI / 2)

    // Belső héj: nyitott tál, amit belülről látunk (BackSide).
    const bowl = new THREE.ExtrudeGeometry(roundedRect(1.74, 1.74, 0.2, new THREE.Shape()), { depth: 0.62, bevelEnabled: false, curveSegments: 10 })
    bowl.rotateX(-Math.PI / 2)

    // Vízfelszín.
    const surface = new THREE.ShapeGeometry(roundedRect(1.7, 1.7, 0.2, new THREE.Shape()), 10)
    surface.rotateX(-Math.PI / 2)

    // Króm fúvókák a belső falakon.
    const jets: THREE.BufferGeometry[] = []
    for (let side = 0; side < 4; side++) {
      for (const [offset, level] of [[-0.42, 0.52], [0, 0.4], [0.42, 0.52], [-0.42, 0.28], [0.42, 0.28]]) {
        const jet = new THREE.CylinderGeometry(0.036, 0.04, 0.014, 14)
        jet.rotateX(Math.PI / 2)
        jet.translate(offset, level, -0.865)
        jet.rotateY((side * Math.PI) / 2)
        jets.push(jet)
      }
    }
    const jetGeometry = mergeGeometries(jets, false)!
    jets.forEach((part) => part.dispose())

    return { slatGeometry, rim, bowl, surface, jetGeometry }
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
export default function HotTub({ night = false }: { night?: boolean }) {
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
    {/* Szekrény: sötét mag + termofa lécek + sötét lábazat világító LED-csíkkal. */}
    {[[0, 0.1, 0, 2.0, 0.2, 2.0], [0, 0.41, 0.935, 2.0, 0.82, 0.13], [0, 0.41, -0.935, 2.0, 0.82, 0.13], [0.935, 0.41, 0, 0.13, 0.82, 1.74], [-0.935, 0.41, 0, 0.13, 0.82, 1.74]].map(([x, y, z, w, h, d]) => <mesh key={`${x}${z}${y}`} position={[x, y, z]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#14110e" roughness={0.9} /></mesh>)}
    <mesh geometry={geometry.slatGeometry} castShadow receiveShadow><meshStandardMaterial color="#ffffff" vertexColors roughness={0.74} /></mesh>
    <mesh position={[0, 0.025, 0]}><boxGeometry args={[2.06, 0.05, 2.06]} /><meshStandardMaterial color="#0c0b0a" roughness={0.9} /></mesh>
    {[[0, 1.036, 2.06, 0.012], [0, -1.036, 2.06, 0.012], [1.036, 0, 0.012, 2.06], [-1.036, 0, 0.012, 2.06]].map(([x, z, w, d]) => <mesh key={`${x}${z}`} position={[x, 0.07, z]}>
      <boxGeometry args={[w, 0.012, d]} /><meshStandardMaterial color="#0b1f26" emissive="#37d4ee" emissiveIntensity={night ? 2.4 : 0.12} toneMapped={false} />
    </mesh>)}
    {/* Akrilperem és belső héj. */}
    <mesh geometry={geometry.rim} position={[0, RIM_Y, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#eef0ee" roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.25} /></mesh>
    <mesh geometry={geometry.bowl} position={[0, 0.2, 0]}><meshStandardMaterial color="#b9d9df" roughness={0.45} side={THREE.BackSide} /></mesh>
    <mesh geometry={geometry.jetGeometry}><meshStandardMaterial color="#d6d9db" metalness={1} roughness={0.22} /></mesh>
    {/* Fejtámlák és kezelőpanel a peremen. */}
    {[-0.38, 0.38].map((x) => <RoundedBox key={x} args={[0.4, 0.14, 0.11]} position={[x, RIM_Y + 0.1, -0.9]} radius={0.05} smoothness={3} castShadow><meshStandardMaterial color="#2c3033" roughness={0.7} /></RoundedBox>)}
    <RoundedBox args={[0.22, 0.02, 0.12]} position={[0.62, RIM_Y + 0.085, 0.92]} radius={0.01} smoothness={2}><meshStandardMaterial color="#0a0c0d" roughness={0.2} metalness={0.4} /></RoundedBox>
    <mesh position={[0.62, RIM_Y + 0.097, 0.92]}><boxGeometry args={[0.07, 0.003, 0.02]} /><meshStandardMaterial color="#05161a" emissive="#37d4ee" emissiveIntensity={1.6} toneMapped={false} /></mesh>
    {/* Víz és buborékok. */}
    <mesh geometry={geometry.surface} position={[0, WATER_Y, 0]} material={water} renderOrder={2} />
    {/* Lépcső. */}
    <RoundedBox args={[0.9, 0.2, 0.34]} position={[0, 0.1, 1.2]} radius={0.04} smoothness={3} castShadow receiveShadow><meshStandardMaterial color="#3d342b" roughness={0.82} /></RoundedBox>
  </group>
}
