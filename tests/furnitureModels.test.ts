import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type Gltf = { accessors: { min?: number[]; max?: number[] }[]; meshes: { primitives: { attributes: { POSITION: number } }[] }[] }

/** a GLB befoglaló mérete (szélesség x, magasság y, mélység z) a POSITION accessorok min/max értékeiből */
function glbSize(name: string) {
  const data = readFileSync(`public/assets/models/furniture/${name}.glb`)
  expect(data.toString('ascii', 0, 4)).toBe('glTF')
  const json = JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12))) as Gltf
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
    const accessor = json.accessors[primitive.attributes.POSITION]
    accessor.min!.forEach((value, axis) => { min[axis] = Math.min(min[axis], value) })
    accessor.max!.forEach((value, axis) => { max[axis] = Math.max(max[axis], value) })
  }
  return { width: max[0] - min[0], height: max[1] - min[1], depth: max[2] - min[2], floor: min[1], meshes: json.meshes.length }
}

// A jelenet a bútorokat a régi, kódból rajzolt elemek helyére teszi: a méreteknek egyezniük kell a csomagok helyigényével.
const EXPECTED: Record<string, { width: number; depth: number; height: [number, number] }> = {
  sofa: { width: 2.2, depth: 0.85, height: [0.75, 0.95] },
  chair: { width: 0.54, depth: 0.56, height: [0.8, 0.9] },
  table6: { width: 1.8, depth: 0.9, height: [0.74, 0.76] },
  table8: { width: 2.2, depth: 1.0, height: [0.74, 0.76] },
  table4: { width: 1.2, depth: 0.8, height: [0.74, 0.76] },
  stool: { width: 0.43, depth: 0.45, height: [0.9, 1.0] },
  bistro: { width: 0.7, depth: 0.7, height: [0.73, 0.76] },
  sunbed: { width: 0.77, depth: 1.96, height: [0.7, 0.95] },
  sidetable: { width: 0.44, depth: 0.44, height: [0.4, 0.45] },
  hottub: { width: 2.13, depth: 2.5, height: [0.95, 1.1] },
  grill: { width: 0.77, depth: 0.58, height: [0.25, 0.3] },
}

describe('Blenderben modellezett bútorok', () => {
  it.each(Object.entries(EXPECTED))('%s.glb: méretarányos, a padlón áll', (name, expected) => {
    const size = glbSize(name)
    expect(size.width).toBeCloseTo(expected.width, 1)
    expect(size.depth).toBeCloseTo(expected.depth, 1)
    expect(size.height).toBeGreaterThanOrEqual(expected.height[0])
    expect(size.height).toBeLessThanOrEqual(expected.height[1])
    expect(Math.abs(size.floor)).toBeLessThan(0.002)
    // anyagonként egy háló: kevés rajzolási hívás a sok székes csomagoknál is
    expect(size.meshes).toBeLessThanOrEqual(7)
  })
})
