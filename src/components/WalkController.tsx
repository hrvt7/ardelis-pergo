// Bejárás: első személyű kamera emberi szemmagasságban, sétálás ütközésvizsgálattal.
// A kamera a megszokott jelenetet nézi (ugyanaz a konfiguráció és modell), csak az irányítás más:
// húzással körbenézés, joystickkal / WASD-vel séta. A belépés és a kilépés rövid repüléssel történik.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { buildWalkArea, entryPoint, resolvePosition, stepPosition } from '@/lib/walkArea'
import { resetWalkInput, walkInput, walkIntent } from '@/lib/walkInput'
import type { PergolaConfig, SceneSettings } from '@/types/pergola'
import { sofaFov } from '@/lib/viewport'

const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
/** Séta sebessége (m/s) és fordulás (rad/s). */
const WALK_SPEED = 1.3
const TURN_SPEED = 1.6
const ENTER_SECONDS = 0.7

export default function WalkController({ config, scene }: { config: PergolaConfig; scene: SceneSettings }) {
  const { camera, gl, invalidate } = useThree()
  const area = useMemo(() => buildWalkArea(config, { furniture: config.building === 'carport' ? 'none' : scene.furniture, houseStyle: scene.houseStyle ?? 'classic', studio: scene.ground === 'studio' }), [config, scene.furniture, scene.houseStyle, scene.ground])
  const areaRef = useRef(area)
  const state = useRef({ x: 0, z: 0, yaw: 0, pitch: -0.04, vx: 0, vz: 0 })
  const enter = useRef({ t: REDUCED ? 1 : 0, started: 0, fromPos: new THREE.Vector3(), fromQuat: new THREE.Quaternion(), toQuat: new THREE.Quaternion(), euler: new THREE.Euler(0, 0, 0, 'YXZ') })

  // Belépés: a pergola elé, kívülre, a pergola felé nézve; a kamera a jelenlegi állásából repül oda.
  useEffect(() => {
    const start = entryPoint(config, areaRef.current)
    Object.assign(state.current, { x: start.x, z: start.z, yaw: start.yaw, pitch: -0.04, vx: 0, vz: 0 })
    const perspective = camera as THREE.PerspectiveCamera
    perspective.fov = sofaFov(window.innerWidth / Math.max(1, window.innerHeight))
    perspective.clearViewOffset()
    perspective.updateProjectionMatrix()
    enter.current.fromPos.copy(camera.position)
    enter.current.fromQuat.copy(camera.quaternion)
    enter.current.t = REDUCED ? 1 : 0
    enter.current.started = performance.now()
    walkInput.wake = invalidate
    invalidate()
    return () => { walkInput.wake = () => {}; resetWalkInput() }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- csak belépéskor
  }, [])

  // Konfigurációváltás bejárás közben: az új ütközőkből (pl. új oldalfal) a kamera a legközelebbi szabad helyre kerül.
  useEffect(() => {
    areaRef.current = area
    const [x, z] = resolvePosition(state.current.x, state.current.z, area)
    state.current.x = x
    state.current.z = z
    invalidate()
  }, [area, invalidate])

  // Körbenézés húzással (egér és ujj), mint a kanapé-nézetben.
  useEffect(() => {
    const element = gl.domElement
    let dragging: number | null = null
    let previousX = 0
    let previousY = 0
    const down = (event: PointerEvent) => {
      if (dragging !== null || (event.pointerType === 'mouse' && event.button !== 0)) return
      dragging = event.pointerId
      previousX = event.clientX
      previousY = event.clientY
      element.setPointerCapture(event.pointerId)
      element.style.setProperty('cursor', 'grabbing')
    }
    const move = (event: PointerEvent) => {
      if (event.pointerId !== dragging) return
      state.current.yaw -= (event.clientX - previousX) * 0.004
      state.current.pitch = THREE.MathUtils.clamp(state.current.pitch - (event.clientY - previousY) * 0.003, -1.05, 1.05)
      previousX = event.clientX
      previousY = event.clientY
      invalidate()
    }
    const up = (event: PointerEvent) => {
      if (event.pointerId !== dragging) return
      dragging = null
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
      element.style.setProperty('cursor', 'grab')
    }
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable || event.metaKey || event.ctrlKey) return
      const key = event.key.toLowerCase()
      if (!['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) return
      event.preventDefault()
      walkInput.keys.add(key)
      invalidate()
    }
    const keyUp = (event: KeyboardEvent) => { walkInput.keys.delete(event.key.toLowerCase()) }
    const blur = () => walkInput.keys.clear()
    element.style.setProperty('cursor', 'grab')
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', up)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blur)
    return () => {
      element.style.removeProperty('cursor')
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', up)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blur)
    }
  }, [gl, invalidate])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const walk = state.current
    const { eye } = areaRef.current
    const target = enter.current
    target.euler.set(walk.pitch, walk.yaw, 0, 'YXZ')
    target.toQuat.setFromEuler(target.euler)
    if (target.t < 1) {
      // Belépő repülés: lágy indulás és érkezés; falióra szerint, hogy lassú gépen se húzódjon el.
      target.t = Math.min(1, (performance.now() - target.started) / 1000 / ENTER_SECONDS)
      const eased = target.t < 0.5 ? 4 * target.t ** 3 : 1 - (-2 * target.t + 2) ** 3 / 2
      camera.position.lerpVectors(target.fromPos, new THREE.Vector3(walk.x, eye, walk.z), eased)
      camera.quaternion.slerpQuaternions(target.fromQuat, target.toQuat, eased)
      invalidate()
      return
    }
    const [right, forward, turn] = walkIntent(walkInput)
    walk.yaw += turn * TURN_SPEED * delta
    // A néző saját iránya: yaw 0-nál −z felé néz.
    const sin = Math.sin(walk.yaw)
    const cos = Math.cos(walk.yaw)
    const desiredX = (-sin * forward + cos * right) * WALK_SPEED
    const desiredZ = (-cos * forward - sin * right) * WALK_SPEED
    // Enyhe gyorsulás és lassulás (nem rángat).
    const blend = Math.min(1, delta * 8)
    walk.vx += (desiredX - walk.vx) * blend
    walk.vz += (desiredZ - walk.vz) * blend
    if (Math.hypot(walk.vx, walk.vz) < 0.002 && forward === 0 && right === 0) { walk.vx = 0; walk.vz = 0 }
    else [walk.x, walk.z] = stepPosition(walk.x, walk.z, walk.vx * delta, walk.vz * delta, areaRef.current)
    camera.position.set(walk.x, eye, walk.z)
    camera.quaternion.copy(target.toQuat)
    if (walk.vx !== 0 || walk.vz !== 0 || turn !== 0 || right !== 0 || forward !== 0) invalidate()
  })

  return null
}
