// Az élő 3D-jelenet elérése a Canvason kívülről (AR-export). A PergolaScene
// regisztrálja magát, és leiratkozik, amikor a Canvas megszűnik.
import type * as THREE from 'three'

let activeScene: THREE.Scene | null = null

export function setActiveScene(scene: THREE.Scene | null) {
  activeScene = scene
}

export function getActiveScene() {
  return activeScene
}

// Automatikus teszthez: ?arDebug=1 mellett a jelenet nevesített objektumai lekérdezhetők.
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('arDebug') === '1') {
  (window as Window & { __pergolaSceneNames?: () => string[] }).__pergolaSceneNames = () => {
    const names: string[] = []
    activeScene?.traverse((object) => { if (object.name) names.push(object.name) })
    return names
  }
}
