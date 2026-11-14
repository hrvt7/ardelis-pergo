import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HOUSE_STYLES, HOUSE_STYLE_INFO, parseHouseLook, STYLED_HOUSE, styledHouseScale } from '@/lib/house'
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
  it('három típus, mindegyikhez felirat; az alap a fa–cink ház', () => {
    expect(HOUSE_STYLES).toEqual(['classic', 'modern', 'gable'])
    for (const style of HOUSE_STYLES) expect(HOUSE_STYLE_INFO[style].label.length).toBeGreaterThan(3)
    expect(DEFAULT_SCENE.houseStyle).toBe('classic')
    expect(parseHouseLook({}).houseStyle).toBe('classic')
    expect(parseHouseLook({ houseStyle: 'modern' }).houseStyle).toBe('modern')
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

  it('a kertelemek GLB-i megvannak, a lámpás elemben van világító háló', () => {
    for (const file of ['hedge', 'planter', 'fence']) expect(glbNodes(`public/assets/models/garden/${file}.glb`).length).toBeGreaterThan(0)
    expect(glbNodes('public/assets/models/garden/bollard.glb').some((name) => name.startsWith('lamp'))).toBe(true)
  })
})
