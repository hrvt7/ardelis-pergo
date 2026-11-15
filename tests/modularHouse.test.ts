import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { calculateModularPrice, MODULAR_DEFAULTS, MODULAR_MODELS, MODULAR_PRICE_DEFAULTS, modularSpecCode, parseModularConfig } from '../src/products/modularHouse'

describe('modulház: A45', () => {
  it('a gyártó m²-árával számol: 45 m² × 445 000 Ft nettó, családi háznál 5% ÁFA', () => {
    const price = calculateModularPrice(MODULAR_DEFAULTS, MODULAR_PRICE_DEFAULTS)
    expect(price.area).toBe(45)
    expect(price.totalNet).toBe(20_025_000)
    expect(price.vatNet).toBe(1_001_000)
    expect(price.totalGross).toBe(21_026_000)
    // nincs külön telepítési mintatétel: a gyártó ára beépítve, pontalappal értendő
    expect(price.installationNet).toBe(0)
  })

  it('egyéb felhasználásnál 27% ÁFA; nettó alapterületre váltva 39 m²', () => {
    expect(calculateModularPrice({ ...MODULAR_DEFAULTS, use: 'other' }, MODULAR_PRICE_DEFAULTS).vatNet).toBe(5_407_000)
    expect(calculateModularPrice(MODULAR_DEFAULTS, { ...MODULAR_PRICE_DEFAULTS, areaBasis: 'net' }).totalNet).toBe(17_355_000)
  })

  it('a teljes kulcsrakész kivitel egyedi ajánlat: tételként megjelenik, de nem emeli az irányárat', () => {
    const price = calculateModularPrice({ ...MODULAR_DEFAULTS, finish: 'turnkey' }, MODULAR_PRICE_DEFAULTS)
    const line = price.lines.find((item) => item.id === 'turnkey')
    expect(line?.amountNet).toBe(0)
    expect(line?.detail).toContain('nincs benne')
    expect(price.totalNet).toBe(20_025_000)
  })

  it('a színek csak látványt állítanak, az árat nem; a spec-kód tükrözi a választást', () => {
    const colored = { ...MODULAR_DEFAULTS, facade: 'graphite' as const, joinery: 'white' as const, roof: 'red' as const }
    expect(calculateModularPrice(colored, MODULAR_PRICE_DEFAULTS).totalGross).toBe(calculateModularPrice(MODULAR_DEFAULTS, MODULAR_PRICE_DEFAULTS).totalGross)
    expect(modularSpecCode(colored)).toBe('MODUL-A45-SK-LAK-GRAPHITE-WHITE-RED')
  })

  it('érvénytelen bemenetet elutasít', () => {
    expect(parseModularConfig(MODULAR_DEFAULTS)).toEqual(MODULAR_DEFAULTS)
    expect(parseModularConfig({ ...MODULAR_DEFAULTS, facade: 'pink' })).toBeNull()
    expect(parseModularConfig(null)).toBeNull()
  })

  it('a 3D modell (GLB) megvan, szerepnevekkel és valós mérettel: falak 9,23 × 5,28 m, homlokzat a z = 0 síkon', () => {
    const model = MODULAR_MODELS.a45
    const data = readFileSync(`public${model.glb}`)
    expect(data.toString('ascii', 0, 4)).toBe('glTF')
    const length = data.readUInt32LE(12)
    const json = JSON.parse(data.toString('utf8', 20, 20 + length)) as { nodes: { name: string; mesh?: number }[]; meshes: { primitives: { attributes: { POSITION: number } }[] }[]; accessors: { min?: number[]; max?: number[] }[] }
    const names = json.nodes.filter((node) => node.mesh !== undefined).map((node) => node.name)
    for (const role of ['wall', 'frame', 'glass', 'interior', 'roof', 'trim', 'plinth']) expect(names.some((name) => name.startsWith(role)), role).toBe(true)
    const wall = json.nodes.find((node) => node.name.startsWith('wall'))!
    const box = json.accessors[json.meshes[wall.mesh!].primitives[0].attributes.POSITION]
    expect(box.max![0] - box.min![0]).toBeCloseTo(model.footprint.width, 2)
    expect(box.max![2] - box.min![2]).toBeCloseTo(model.footprint.depth, 2)
    expect(box.max![2]).toBeCloseTo(0, 3)
  })
})
