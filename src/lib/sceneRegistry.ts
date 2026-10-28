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
  ;(window as Window & { __pergolaUv?: () => string[] }).__pergolaUv = () => {
    const rows: string[] = []
    activeScene?.traverse((object) => {
      const mesh = object as unknown as { isMesh?: boolean; name: string; geometry: { getAttribute: (n: string) => { count: number; getX: (i: number) => number; getY: (i: number) => number } | undefined; computeBoundingBox: () => void; boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } }; material: unknown }
      if (!mesh.isMesh) return
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as { name: string; map?: { wrapS: number; repeat: { x: number; y: number }; image?: { width?: number } } | null }[]
      const wood = mats.find((m) => /wood|metal|stone|trim|glass/.test(m.name))
      if (!wood || rows.length > 40) return
      const uv = mesh.geometry.getAttribute('uv')
      mesh.geometry.computeBoundingBox()
      const b = mesh.geometry.boundingBox
      let umin = 1e9, umax = -1e9, vmin = 1e9, vmax = -1e9
      if (uv) for (let i = 0; i < uv.count; i++) { umin = Math.min(umin, uv.getX(i)); umax = Math.max(umax, uv.getX(i)); vmin = Math.min(vmin, uv.getY(i)); vmax = Math.max(vmax, uv.getY(i)) }
      rows.push(`${mesh.name} | ${mats.map((m) => m.name).join(',')} | size ${(b.max.x-b.min.x).toFixed(2)}x${(b.max.y-b.min.y).toFixed(2)}x${(b.max.z-b.min.z).toFixed(2)} | uv ${umin.toFixed(2)}..${umax.toFixed(2)} / ${vmin.toFixed(2)}..${vmax.toFixed(2)} | map ${wood.map ? `${wood.map.image?.width} wrap${wood.map.wrapS} rep${wood.map.repeat.x}` : '-'}`)
    })
    return rows
  }
  ;(window as Window & { __pergolaMaterials?: () => Record<string, string> }).__pergolaMaterials = () => {
    const materials: Record<string, string> = {}
    activeScene?.traverse((object) => {
      const mesh = object as unknown as { isMesh?: boolean; material?: { name: string; color?: { getHexString: () => string }; map?: unknown; roughness?: number; metalness?: number } | unknown[] }
      if (!mesh.isMesh || !mesh.material || Array.isArray(mesh.material)) return
      const material = mesh.material as { name: string; color?: { getHexString: () => string }; map?: { image?: { width?: number } } | null; roughness?: number; metalness?: number }
      if (material.name && !materials[material.name]) materials[material.name] = `${object.name} #${material.color?.getHexString() ?? '-'} map:${material.map ? material.map.image?.width ?? 'y' : 'n'} r:${material.roughness} m:${material.metalness}`
    })
    return materials
  }
}
