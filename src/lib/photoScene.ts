// Fotó mód: a 3D objektumra és a renderelőre ható apró segédek (a komponensen kívül, hogy a
// gesztus-kezelő képkockánként, React-újrarenderelés nélkül dolgozhasson).
import * as THREE from 'three'
import type { PhotoPlacement } from './photoPlacement'

export const PHOTO_GROUP = 'photo-placement'

export function applyPlacement(object: THREE.Object3D, placement: PhotoPlacement) {
  object.position.set(placement.photoX, placement.photoY, 0)
  object.rotation.set(0, THREE.MathUtils.degToRad(placement.photoRotation), 0)
  object.scale.setScalar(placement.photoScale)
}

/** Az árnyéktérkép csak kérésre frissül (akkumulátorkímélés): mozgatás után újra kell rajzolni. */
export function markShadowsDirty(renderer: THREE.WebGLRenderer) {
  renderer.shadowMap.needsUpdate = true
}

export function setCanvasCursor(element: HTMLElement, cursor: string) {
  element.style.cursor = cursor
}
