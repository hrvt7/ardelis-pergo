import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { A45_HOUSE, HOUSE_STYLES, HOUSE_STYLE_INFO, parseHouseLook, STYLED_HOUSE, styledHouseScale } from '@/lib/house'
import { getHouseLayout } from '@/lib/sceneLayout'
import { DEFAULT_SCENE } from '@/lib/config'

/** a GLB JSON-fejléce: a hálók (node-ok) neve adja a szerepüket a jelenetben */
function glbNodes(path: string): string[] {
  const data = readFileSync(path)
  expect(data.toString('ascii', 0, 4)).toBe('glTF')
  const length = data.readUInt32LE(12)
  const json = JSON.parse(data.toString('utf8', 20, 20 + length)) as { nodes: { name: string; mesh?: number }[] }
  return json.nodes.filter((node) => node.mesh !== undefined).map((node) => node.name)
}

describe('háztípusok', () => {
  it('négy típus, mindegyikhez felirat; az alap a fa–cink ház', () => {
    expect(HOUSE_STYLES).toEqual(['classic', 'modern', 'gable', 'a45'])
    for (const style of HOUSE_STYLES) expect(HOUSE_STYLE_INFO[style].label.length).toBeGreaterThan(3)
    expect(DEFAULT_SCENE.houseStyle).toBe('classic')
    expect(parseHouseLook({}).houseStyle).toBe('classic')
    expect(parseHouseLook({ houseStyle: 'modern' }).houseStyle).toBe('modern')
    expect(parseHouseLook({ houseStyle: 'a45' }).houseStyle).toBe('a45')
  })

  it('a modellezett ház csak akkor nő, ha a pergola nem fér el a főtömeg előtt', () => {
    expect(styledHouseScale(5)).toBe(1)
    expect(styledHouseScale(STYLED_HOUSE.main - 1.2)).toBe(1)
    expect(styledHouseScale(12)).toBeCloseTo(1.32, 6)
  })

  it.each(['house_modern', 'house_gable'])('%s.glb: megvannak a színezhető részek', (file) => {
    const names = glbNodes(`public/assets/models/houses/${file}.glb`)
    // a jelenet névelőtag alapján rendel anyagot: fal → homlokzat, keret → nyílászárószín, üveg/belső → éjjeli fény
    for (const role of ['wall', 'frame', 'glass', 'interior', 'lamp', 'trim', 'plinth']) expect(names.some((name) => name.startsWith(role)), `${file}: ${role}`).toBe(true)
  })

  it('az A45 típusház valós méretű: széles pergolánál sem nő', () => {
    for (const width of [3, 6, 12]) {
      const layout = getHouseLayout({ width, depth: 4, height: 2.6, mount: 'wall' }, 'a45')
      expect(layout.scale).toBe(1)
      expect(layout.width).toBe(A45_HOUSE.width)
      expect(layout.depth).toBe(A45_HOUSE.depth)
      expect(layout.frontZ).toBeCloseTo(-2 - 0.185, 6)
    }
  })

  it('house_a45.glb: színezhető részek és valós méret (homlokzat a z = 0 síkon)', () => {
    const data = readFileSync('public/assets/models/houses/house_a45.glb')
    const length = data.readUInt32LE(12)
    const json = JSON.parse(data.toString('utf8', 20, 20 + length)) as { nodes: { name: string; mesh?: number }[]; meshes: { name: string; primitives: { attributes: { POSITION: number } }[] }[]; accessors: { min?: number[]; max?: number[] }[] }
    const names = json.nodes.filter((node) => node.mesh !== undefined).map((node) => node.name)
    for (const role of ['wall', 'frame', 'glass', 'interior', 'trim', 'plinth', 'roof']) expect(names.some((name) => name.startsWith(role)), role).toBe(true)
    const wall = json.nodes.find((node) => node.name.startsWith('wall'))!
    const box = json.meshes[wall.mesh!].primitives.map((primitive) => json.accessors[primitive.attributes.POSITION])[0]
    // a falak befoglalója: 9,23 m széles, 5,28 m mély, a homlokzat külső síkja z = 0
    expect(box.max![0] - box.min![0]).toBeCloseTo(A45_HOUSE.width, 2)
    expect(box.max![2]).toBeCloseTo(0, 3)
    expect(box.max![2] - box.min![2]).toBeCloseTo(A45_HOUSE.depth, 2)
  })

  it('a kertelemek GLB-i megvannak, a lámpás elemben van világító háló', () => {
    for (const file of ['hedge', 'planter', 'fence']) expect(glbNodes(`public/assets/models/garden/${file}.glb`).length).toBeGreaterThan(0)
    expect(glbNodes('public/assets/models/garden/bollard.glb').some((name) => name.startsWith('lamp'))).toBe(true)
  })
})
