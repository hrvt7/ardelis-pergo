// Árnyékmérés a valós napálláshoz: a pergola alapterületén mintapontokból sugarat
// küldünk a Nap felé, és megnézzük, mi takarja. Takarás: a pergola szerkezete
// (lamellák, gerendák, ZIP-roló, lamellás fal), a ház és a házszárnyak. Az üveg
// átengedi a fényt, a bútor és a díszkert nem számít (azok nem a valós kert részei).
import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh'
import { sunDay, sunVectorInScene } from '@/lib/sun'
import { DEFAULT_SITE, studyDate, studySun } from '@/lib/sunSite'
import type { PergolaConfig, SceneSettings } from '@/types/pergola'

THREE.Mesh.prototype.raycast = acceleratedRaycast
;(THREE.BufferGeometry.prototype as unknown as { computeBoundsTree: typeof computeBoundsTree }).computeBoundsTree = computeBoundsTree
;(THREE.BufferGeometry.prototype as unknown as { disposeBoundsTree: typeof disposeBoundsTree }).disposeBoundsTree = disposeBoundsTree

export interface ShadeSample { hour: number; shade: number; elevation: number }
export interface ShadeResult {
  /** A pergola alatti terület hány százaléka van árnyékban most (0–100); null, ha a nap nincs fenn. */
  now: number | null
  /** A nap folyamán negyedóránként, napkeltétől napnyugtáig. */
  curve: ShadeSample[]
  sunrise: number | null
  sunset: number | null
}

const GRID = 14
const OBSTACLE_GROUPS = ['pergola-model', 'house', 'house-wings']

function isVisible(object: THREE.Object3D) {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return false
  return true
}

function blocksLight(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  // Üveg és más áttetsző felület átengedi a fényt; a ZIP-roló (90%-os fedés) nem.
  return materials.some((material) => !(material.transparent && material.opacity < 0.6) && material.visible)
}

function collectObstacles(scene: THREE.Scene) {
  const meshes: THREE.Mesh[] = []
  for (const name of OBSTACLE_GROUPS) {
    scene.getObjectByName(name)?.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object.name === 'ar-skip-overlays' || !isVisible(object) || !blocksLight(object)) return
      let skip = false
      for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node.name === 'ar-skip-overlays') skip = true
      if (skip) return
      const geometry = object.geometry as THREE.BufferGeometry & { boundsTree?: unknown; computeBoundsTree: () => void }
      if (!geometry.boundsTree) geometry.computeBoundsTree()
      meshes.push(object)
    })
  }
  return meshes
}

function measure(meshes: THREE.Mesh[], config: PergolaConfig, direction: THREE.Vector3) {
  const raycaster = new THREE.Raycaster()
  ;(raycaster as THREE.Raycaster & { firstHitOnly: boolean }).firstHitOnly = true
  const inset = 0.12
  let shaded = 0
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x = -config.width / 2 + inset + ((i + 0.5) / GRID) * (config.width - inset * 2)
      const z = -config.depth / 2 + inset + ((j + 0.5) / GRID) * (config.depth - inset * 2)
      raycaster.set(new THREE.Vector3(x, 0.06, z), direction)
      raycaster.far = 60
      if (raycaster.intersectObjects(meshes, false).length > 0) shaded++
    }
  }
  return Math.round((shaded / (GRID * GRID)) * 100)
}

export default function ShadeProbe({ config, scene, onResult }: { config: PergolaConfig; scene: SceneSettings; onResult: (result: ShadeResult) => void }) {
  const three = useThree((state) => state.scene)
  const latest = useRef(onResult)
  useEffect(() => { latest.current = onResult }, [onResult])
  const site = scene.site ?? DEFAULT_SITE
  const [y, m, d] = studyDate(scene, site.timeZone)
  const day = useMemo(() => sunDay(y, m, d, site.lat, site.lon, site.timeZone), [y, m, d, site.lat, site.lon, site.timeZone])
  const curveKey = JSON.stringify([config, scene.facing, site.lat, site.lon, y, m, d, scene.glassOpen, scene.wallLouverOpen, scene.rain])
  const curveRef = useRef<ShadeSample[]>([])
  const meshesRef = useRef<THREE.Mesh[]>([])
  // A késleltetett mérések mindig a legfrissebb beállításokkal dolgozzanak (ne a régi időponttal).
  const current = useRef({ scene, config })
  useEffect(() => { current.current = { scene, config } })
  const nowFor = (meshes: THREE.Mesh[]) => {
    const { scene: latestScene, config: latestConfig } = current.current
    const sun = studySun(latestScene)
    return sun.elevation > 0 ? measure(meshes, latestConfig, new THREE.Vector3(...sunVectorInScene(sun, latestScene.facing)).normalize()) : null
  }

  // Napi görbe: a konfiguráció, helyszín, nap vagy tájolás változásakor. A lamellák
  // mozgása (kb. 1,5 s) után mérünk, majd még egyszer, ha a ház később töltődött be.
  useEffect(() => {
    let cancelled = false
    const run = () => {
      if (cancelled) return
      three.updateMatrixWorld(true)
      const meshes = collectObstacles(three)
      meshesRef.current = meshes
      const curve: ShadeSample[] = []
      const { scene: latestScene, config: latestConfig } = current.current
      if (day.sunrise !== null && day.sunset !== null) {
        for (let hour = Math.ceil(day.sunrise * 4) / 4; hour <= day.sunset; hour += 0.25) {
          const sun = studySun(latestScene, hour)
          if (sun.elevation <= 0) continue
          curve.push({ hour, shade: measure(meshes, latestConfig, new THREE.Vector3(...sunVectorInScene(sun, latestScene.facing)).normalize()), elevation: sun.elevation })
        }
      }
      curveRef.current = curve
      latest.current({ now: nowFor(meshes), curve, sunrise: day.sunrise, sunset: day.sunset })
    }
    const first = window.setTimeout(run, 1600)
    const second = window.setTimeout(run, 4500)
    return () => { cancelled = true; window.clearTimeout(first); window.clearTimeout(second) }
  }, [curveKey, three, day])

  // Az aktuális időpont: gyors, csak egy mérés (csúszkahúzás és lejátszás közben is).
  useEffect(() => {
    if (!meshesRef.current.length) return
    const timer = window.setTimeout(() => {
      latest.current({ now: nowFor(meshesRef.current), curve: curveRef.current, sunrise: day.sunrise, sunset: day.sunset })
    }, 30)
    return () => window.clearTimeout(timer)
  }, [scene.sunHour]) // eslint-disable-line react-hooks/exhaustive-deps

  // Automatikus teszthez (?arDebug=1): egy pontból a Nap felé küldött sugár találatai.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('arDebug') !== '1') return
    const target = window as Window & { __shadeRay?: (x: number, z: number, bvh?: boolean) => string[] }
    target.__shadeRay = (x, z, bvh = true) => {
      three.updateMatrixWorld(true)
      const meshes = collectObstacles(three)
      const sun = studySun(scene)
      const raycaster = new THREE.Raycaster(new THREE.Vector3(x, 0.06, z), new THREE.Vector3(...sunVectorInScene(sun, scene.facing)).normalize())
      ;(raycaster as THREE.Raycaster & { firstHitOnly: boolean }).firstHitOnly = bvh
      return [`meshes ${meshes.length}`, ...raycaster.intersectObjects(meshes, false).slice(0, 6).map((hit) => `${hit.object.name || hit.object.type} <${hit.object.parent?.name ?? ''}> d=${hit.distance.toFixed(3)} p=${hit.point.toArray().map((v) => v.toFixed(2)).join(',')}`)]
    }
    return () => { delete target.__shadeRay }
  })

  return null
}
