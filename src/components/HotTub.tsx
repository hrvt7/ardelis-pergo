import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { useQuality } from '@/lib/quality'

// Jacuzzi 2 × 2 m: termofa burkolatú szekrény, ívelt akrilperem, belső héj fúvókákkal, animált víztükör és
// felszálló, a felszínen kipattanó buborékok. Minden egyedi elem egy-egy egyesített hálóban van (kevés draw call).

/** Közös shader-uniformok: egyetlen jacuzzi van a jelenetben, így modulszintű objektum elég (nincs hook által védett érték módosítása). */
const SHARED = { time: { value: 1.3 }, night: { value: 0 }, height: { value: 800 } }

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
const BUBBLE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uHeight;
  attribute vec4 aBubble; // x, z kiindulás, seed, típus (0 = vízalatti, 1 = felszín feletti)
  varying float vAlpha;
  varying float vKind;
  void main() {
    float seed = aBubble.z;
    float life = fract(uTime * (0.32 + seed * 0.4) + seed * 13.0);
    vec3 p = vec3(aBubble.x, 0.0, aBubble.y);
    float size;
    if (aBubble.w < 0.5) {
      p.y = 0.3 + life * 0.49;
      p.x += sin(uTime * 2.0 + seed * 30.0) * 0.02;
      p.z += cos(uTime * 1.7 + seed * 20.0) * 0.02;
      size = 0.018 + 0.02 * seed + life * 0.012;
      vAlpha = sin(life * 3.14159) * 0.75;
    } else {
      float hop = sin(life * 3.14159);
      p.y = 0.8 + hop * (0.045 + seed * 0.05);
      p.x += (life - 0.5) * 0.06 * (seed - 0.5);
      size = 0.01 + 0.012 * seed;
      vAlpha = hop * 0.95;
    }
    vKind = aBubble.w;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = max(1.5, size * projectionMatrix[1][1] * uHeight * 0.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`
const BUBBLE_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying float vKind;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float rim = smoothstep(0.28, 0.5, d);
    float spec = 1.0 - smoothstep(0.0, 0.2, length(c - vec2(-0.12, -0.12)));
    vec3 color = mix(vec3(0.82, 0.94, 1.0), vec3(1.0), spec);
    float alpha = vAlpha * (0.25 + rim * 0.55 + spec * 0.6);
    gl_FragColor = vec4(color, alpha);
  }
`

/** Az animáció csak addig fut, amíg a jacuzzi tényleg látszik (a képernyőn renderelődik), és legfeljebb 30 fps-sel. */
function useBubbling(animated: boolean) {
  const invalidate = useThree((state) => state.invalidate)
  const lastSeen = useRef(0)
  const lastTick = useRef(0)
  const mark = useMemo(() => () => { lastSeen.current = performance.now() }, [])
  useFrame(({ clock }) => {
    if (!animated) return
    if (performance.now() - lastSeen.current > 250) return
    if (clock.elapsedTime - lastTick.current < 1 / 30) return
    lastTick.current = clock.elapsedTime
    SHARED.time.value = clock.elapsedTime
    invalidate()
  })
  return mark
}

export default function HotTub({ night = false }: { night?: boolean }) {
  const { tier } = useQuality()
  const animated = tier !== 'low'
  const geometry = useTubGeometry()
  const size = useThree((state) => state.size)
  const gl = useThree((state) => state.gl)

  const water = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: SHARED.time, uNight: SHARED.night, uDeep: { value: new THREE.Color('#0d6e86') }, uShallow: { value: new THREE.Color('#4fc3d4') } },
  }), [])
  const bubbleGeometry = useMemo(() => {
    const underwater = tier === 'low' ? 24 : 70
    const surface = tier === 'low' ? 14 : 44
    const data = new Float32Array((underwater + surface) * 4)
    const spot = (index: number, salt: number) => (rand(index, salt) - 0.5) * 1.5
    for (let i = 0; i < underwater + surface; i++) {
      data.set([spot(i, 1), spot(i, 2), rand(i, 3), i < underwater ? 0 : 1], i * 4)
    }
    const bufferGeometry = new THREE.BufferGeometry()
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((underwater + surface) * 3), 3))
    bufferGeometry.setAttribute('aBubble', new THREE.BufferAttribute(data, 4))
    bufferGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.8, 0), 1.3)
    return bufferGeometry
  }, [tier])
  const bubbleMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: BUBBLE_VERTEX,
    fragmentShader: BUBBLE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: SHARED.time, uHeight: SHARED.height },
  }), [])
  const markSeen = useBubbling(animated)
  // A beállítások a képkocka elején kerülnek a shaderbe (nem a renderelés közben módosított objektumba).
  useFrame(() => {
    SHARED.height.value = size.height * gl.getPixelRatio()
    SHARED.night.value = night ? 1 : 0
  })
  useEffect(() => () => { water.dispose(); bubbleMaterial.dispose(); bubbleGeometry.dispose() }, [water, bubbleMaterial, bubbleGeometry])
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
    <mesh geometry={geometry.surface} position={[0, WATER_Y, 0]} material={water} renderOrder={2} onBeforeRender={markSeen} />
    <points geometry={bubbleGeometry} material={bubbleMaterial} renderOrder={3} frustumCulled={false} />
    {/* Lépcső. */}
    <RoundedBox args={[0.9, 0.2, 0.34]} position={[0, 0.1, 1.2]} radius={0.04} smoothness={3} castShadow receiveShadow><meshStandardMaterial color="#3d342b" roughness={0.82} /></RoundedBox>
  </group>
}
