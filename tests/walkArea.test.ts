import { describe, expect, it } from 'vitest'
import { demoTenant } from '../src/tenants/demo'
import { normalizeConfig } from '../src/tenants/rules'
import { BODY_RADIUS, buildWalkArea, entryPoint, isFree, isPassable, resolvePosition, stepPosition } from '../src/lib/walkArea'
import { postPositions } from '../src/lib/mount'
import { getHouseLayout } from '../src/lib/sceneLayout'
import type { PergolaConfig } from '../src/types/pergola'

const base = normalizeConfig(demoTenant, { ...demoTenant.defaultConfig })
const make = (patch: Partial<PergolaConfig>) => normalizeConfig(demoTenant, { ...base, ...patch })
const open = { front: 'none', back: 'none', left: 'none', right: 'none' } as PergolaConfig['sides']
const area = (config: PergolaConfig, furniture: 'none' | 'lounge' = 'none') => buildWalkArea(config, { furniture })

/** Egyenesen előre sétál (−z irányba) adott lépésszámmal, 5 cm-es lépésekkel. */
function walk(config: PergolaConfig, from: [number, number], to: [number, number], furniture: 'none' | 'lounge' = 'none') {
  const walkArea = area(config, furniture)
  let [x, z] = from
  const steps = 200
  for (let index = 0; index < steps; index += 1) [x, z] = stepPosition(x, z, (to[0] - from[0]) / steps, (to[1] - from[1]) / steps, walkArea)
  return [x, z]
}

describe('bejárás: járható terület és ütközés', () => {
  it('a kezdőpont a pergola előtt, kívül, szabad helyen van', () => {
    const config = make({ mount: 'freestanding', width: 4, depth: 3, height: 2.5, sides: open })
    const walkArea = area(config)
    const start = entryPoint(config, walkArea)
    expect(start.z).toBeGreaterThan(config.depth / 2)
    expect(isFree(start.x, start.z, walkArea)).toBe(true)
  })

  it('nyitott pergolán át lehet sétálni, oszlopon nem', () => {
    const config = make({ mount: 'freestanding', width: 4, depth: 3, height: 2.5, sides: open })
    // A pergola közepén át: végig lehet menni a túloldalig.
    const [, zEnd] = walk(config, [0, 3.5], [0, -3.5])
    expect(zEnd).toBeLessThan(-config.depth / 2)
    // Egy oszlopba „belesétálva” a kamera megáll vagy elcsúszik mellette, de az oszlopban nem lehet.
    const [px, pz] = postPositions(config)[0]
    const walkArea = area(config)
    const [x, z] = resolvePosition(px, pz, walkArea)
    expect(Math.hypot(x - px, z - pz)).toBeGreaterThanOrEqual(BODY_RADIUS + 0.12 - 1e-3)
  })

  it('üvegfalon és lamellafalon nem lehet átmenni', () => {
    for (const type of ['glass', 'louver', 'glassFixed'] as const) {
      const config = make({ mount: 'freestanding', width: 4, depth: 3, height: 2.5, sides: { ...open, front: type } })
      const [, z] = walk(config, [0, 3.5], [0, 0])
      expect(z).toBeGreaterThan(config.depth / 2)
    }
  })

  it('félbe osztott oldalnál a nyitott felén be lehet menni, a zárt felén nem', () => {
    const config = make({ mount: 'freestanding', width: 4, depth: 3, height: 2.5, sides: { ...open, front: 'glass' }, split: { front: 'none' } })
    // Első fél = bal (−x): üveg; második fél = jobb (+x): nyitott.
    expect(walk(config, [-1, 3.5], [-1, 0])[1]).toBeGreaterThan(config.depth / 2)
    expect(walk(config, [1, 3.5], [1, 0])[1]).toBeLessThan(config.depth / 2)
  })

  it('ZIP-screen: leengedve fal, felhúzva átjárható', () => {
    expect(isPassable('zip', { height: 2.6, screenOpen: 0 })).toBe(false)
    expect(isPassable('zip', { height: 2.6, screenOpen: 100 })).toBe(true)
    expect(isPassable('none', { height: 2.6, screenOpen: 0 })).toBe(true)
    expect(isPassable('door', { height: 2.6, screenOpen: 100 })).toBe(false)
  })

  it('ha a belmagasság kisebb a szemmagasságnál, a tető alá nem lehet besétálni', () => {
    const config = make({ mount: 'freestanding', width: 4, depth: 3, height: 2.5, sides: open })
    expect(area(config).roofBlocked).toBe(false)
    // Magas (2,5 m-es szemmagasságú) nézőnek ez a pergola alacsony.
    const tall = buildWalkArea(config, { furniture: 'none' }, 2.5)
    expect(tall.roofBlocked).toBe(true)
    expect(isFree(0, 0, tall)).toBe(false)
    expect(isFree(0, 0, area(config))).toBe(true)
  })

  it('falhoz rögzített pergolánál a házba nem lehet besétálni', () => {
    const config = make({ mount: 'wall', width: 4, depth: 3, height: 2.5, sides: open })
    const [, z] = walk(config, [0, 3.5], [0, -12])
    const house = getHouseLayout(config)
    expect(z).toBeGreaterThan(house.frontZ)
  })

  it('a telekhatáron és az utca felé nem lehet kimenni', () => {
    const config = make({ mount: 'freestanding', width: 4, depth: 3, height: 2.5, sides: open })
    const walkArea = area(config)
    const [x] = walk(config, [0, 3.5], [40, 3.5])
    expect(x).toBeLessThanOrEqual(walkArea.bounds.maxX)
    const [, z] = walk(config, [0, 3.5], [0, 40])
    expect(z).toBeLessThanOrEqual(walkArea.bounds.maxZ)
  })

  it('bútorba nem lehet besétálni', () => {
    const config = make({ mount: 'freestanding', width: 5, depth: 4, height: 2.6, sides: open })
    const walkArea = area(config, 'lounge')
    expect(walkArea.colliders.some((collider) => collider.label.startsWith('bútor'))).toBe(true)
    expect(isFree(0, 0, walkArea)).toBe(false)
  })

  it('fal mentén elcsúszik, nem akad meg (ferde mozgásnál halad tovább)', () => {
    const config = make({ mount: 'freestanding', width: 4, depth: 3, height: 2.5, sides: { ...open, front: 'glass' } })
    const [x, z] = walk(config, [-1, 2.2], [1.5, 0])
    expect(z).toBeGreaterThan(config.depth / 2)
    expect(x).toBeGreaterThan(0.5)
  })

  it('konfigurációváltás után a kamera kikerül az új ütközőből', () => {
    const before = make({ mount: 'freestanding', width: 4, depth: 3, height: 2.5, sides: open })
    const after = make({ ...before, sides: { ...open, front: 'glass' } })
    const [x, z] = resolvePosition(0, before.depth / 2, area(after))
    expect(isFree(x, z, area(after))).toBe(true)
  })
})
