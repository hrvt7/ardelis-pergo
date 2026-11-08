// Fotó mód a 3D jeleneten belül: rögzített kamera (szemből, állítható nézőszögből), a pergola
// húzása / csippentése / csavarása, valamint egy „árnyékfogó” sík, hogy a pergola árnyéka a fotó
// talaján is látsszon. Gesztus közben a transzformációt közvetlenül a 3D objektumon állítjuk
// (nincs React-újrarenderelés képkockánként), elengedéskor egyszer mentjük az állapotba.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { clampPlacement, dragPlacement, metersPerPixel, photoCameraPose, pinchPlacement, type PhotoPlacement } from '@/lib/photoPlacement'
import { applyPlacement, markShadowsDirty, PHOTO_GROUP, setCanvasCursor } from '@/lib/photoScene'
import type { PergolaConfig } from '@/types/pergola'

/** Árnyékfogó: csak az árnyékot rajzolja (átlátszó), így a pergola „ráül” a fotó talajára. */
export function ShadowCatcher({ size, opacity }: { size: number; opacity: number }) {
  return <mesh name="ar-skip-shadow-catcher" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow renderOrder={-1}>
    <planeGeometry args={[size, size]} />
    <shadowMaterial transparent opacity={opacity} depthWrite={false} />
  </mesh>
}

type Pointer = { x: number; y: number }

export default function PhotoRig({ config, placement, onCommit }: { config: Pick<PergolaConfig, 'width' | 'depth' | 'height'>; placement: PhotoPlacement; onCommit: (next: PhotoPlacement) => void }) {
  const { camera, gl, scene, invalidate, size } = useThree()
  const latest = useRef(placement)
  const commit = useRef(onCommit)
  useEffect(() => { latest.current = placement; commit.current = onCommit })
  // Az alap látószög rögzített: a perspektíva-szorzó (photoLens) ebből számolja a távolságot és a tényleges fov-ot.
  const [fovDeg] = useState(() => (camera as THREE.PerspectiveCamera).fov ?? 40)
  const pose = useMemo(() => photoCameraPose({ width: config.width, depth: config.depth, height: config.height }, placement.photoTilt, fovDeg, placement.photoLens), [config.width, config.depth, config.height, placement.photoTilt, placement.photoLens, fovDeg])

  // Kamera: fotó módban nem orbitál, a nézőszög csúszkával állítható.
  useLayoutEffect(() => {
    // A háttérfotó a teljes nézetet kitölti: a mobil alsó lap miatti nézet-eltolás itt nem kell.
    // Mobilon az alsó vezérlősáv takarná a pergolát: a 3D képet feljebb toljuk (a fotó a helyén marad, a húzás így is pontos).
    const perspective = camera as THREE.PerspectiveCamera
    if (size.width < 820) perspective.setViewOffset(size.width, size.height, 0, Math.round(size.height * 0.2), size.width, size.height)
    else if (perspective.view?.enabled) perspective.clearViewOffset()
    Object.assign(perspective, { fov: pose.fov })
    perspective.updateProjectionMatrix()
    camera.position.set(...pose.position)
    camera.lookAt(...pose.target)
    camera.updateMatrixWorld()
    invalidate()
  }, [camera, invalidate, pose, size.width, size.height])

  // Az állapotból jövő értékek (csúszka, gomb, visszaállítás) a 3D objektumra.
  useLayoutEffect(() => {
    const group = scene.getObjectByName(PHOTO_GROUP)
    if (!group) return
    applyPlacement(group, placement)
    markShadowsDirty(gl)
    invalidate()
  }, [scene, gl, invalidate, placement])

  useEffect(() => {
    const element = gl.domElement
    const pointers = new Map<number, Pointer>()
    let start: { placement: PhotoPlacement; pointers: Map<number, Pointer>; rotate: boolean } | null = null
    let wheelTimer = 0
    let wheelValue: PhotoPlacement | null = null
    // A látószög a perspektíva-csúszkával változik: húzáskor mindig az aktuálisat használjuk, hogy a pergola a kurzorral együtt mozogjon.
    const perPixel = () => metersPerPixel(camera.position.distanceTo(new THREE.Vector3(latest.current.photoX, latest.current.photoY, 0)), (camera as THREE.PerspectiveCamera).fov ?? 40, element.clientHeight || size.height)
    const show = (next: PhotoPlacement) => {
      const group = scene.getObjectByName(PHOTO_GROUP)
      if (!group) return
      applyPlacement(group, next)
      markShadowsDirty(gl)
      invalidate()
    }
    const begin = () => { start = { placement: { ...latest.current }, pointers: new Map(pointers), rotate: false } }
    const current = (): PhotoPlacement | null => {
      if (!start) return null
      const ids = [...pointers.keys()]
      if (ids.length === 1) {
        const id = ids[0]
        const from = start.pointers.get(id)
        const now = pointers.get(id)
        if (!from || !now) return null
        if (start.rotate) return clampPlacement({ ...start.placement, photoRotation: start.placement.photoRotation + (now.x - from.x) * 0.25 })
        return dragPlacement(start.placement, now.x - from.x, now.y - from.y, perPixel())
      }
      if (ids.length >= 2) {
        const [a, b] = ids
        const a0 = start.pointers.get(a); const b0 = start.pointers.get(b)
        const a1 = pointers.get(a); const b1 = pointers.get(b)
        if (!a0 || !b0 || !a1 || !b1) return null
        const distance0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1
        const distance1 = Math.hypot(b1.x - a1.x, b1.y - a1.y) || 1
        const angle0 = Math.atan2(b0.y - a0.y, b0.x - a0.x)
        const angle1 = Math.atan2(b1.y - a1.y, b1.x - a1.x)
        const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }
        const mid1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }
        return pinchPlacement(start.placement, distance1 / distance0, THREE.MathUtils.radToDeg(angle1 - angle0), mid1.x - mid0.x, mid1.y - mid0.y, perPixel())
      }
      return null
    }
    const down = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2) return
      element.setPointerCapture?.(event.pointerId)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      begin()
      if (start && (event.shiftKey || event.button === 2)) start.rotate = true
    }
    const move = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const next = current()
      if (next) { latest.current = next; show(next) }
    }
    const up = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.delete(event.pointerId)
      element.releasePointerCapture?.(event.pointerId)
      if (start) commit.current({ ...latest.current })
      // Egy ujj felemelése után a maradék ujjal folytatható a húzás, ugrás nélkül.
      if (pointers.size) begin(); else start = null
    }
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const base = wheelValue ?? latest.current
      wheelValue = clampPlacement({ ...base, photoScale: base.photoScale * Math.exp(-event.deltaY * 0.0012) })
      latest.current = wheelValue
      show(wheelValue)
      window.clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => { if (wheelValue) commit.current(wheelValue); wheelValue = null }, 220)
    }
    const menu = (event: Event) => event.preventDefault()
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', up)
    element.addEventListener('wheel', wheel, { passive: false })
    element.addEventListener('contextmenu', menu)
    setCanvasCursor(element, 'grab')
    return () => {
      window.clearTimeout(wheelTimer)
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', up)
      element.removeEventListener('wheel', wheel)
      element.removeEventListener('contextmenu', menu)
      setCanvasCursor(element, '')
    }
  }, [camera, gl, scene, invalidate, size.height])

  return null
}
