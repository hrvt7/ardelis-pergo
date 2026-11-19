import { describe, expect, it } from 'vitest'
import { openSlidePlan, zipBoxSize, zipPlan, ZIP } from '../src/lib/os140Sides'

describe('SkyRoll ZIP szabályok (SRS90E)', () => {
  it('tokméret a max. magasság szerint (Szövet 1, Ø63): 85 ≤ 2,2 m, 100 ≤ 4,5 m, felette 120', () => {
    expect(zipBoxSize(2.1)).toBe(85)
    expect(zipBoxSize(2.44)).toBe(100)
    expect(zipBoxSize(4.8)).toBe(120)
  })
  it('a Blender-referencia: 4,72 m-es nyílás, 2,8 m gerendatető → 1 screen, 100-as tok', () => {
    const plan = zipPlan(4.72, 2.8 - 0.255)
    expect(plan.screens).toBe(1)
    expect(plan.box).toBe(100)
    expect(plan.height).toBeCloseTo(2.545 - ZIP.box, 6)
  })
  it('5 m vagy 16 m² felett osztás (köztük dupla sín)', () => {
    expect(zipPlan(5.86, 2.4).screens).toBe(2)
    expect(zipPlan(4.9, 3.6).screens).toBe(2) // 4,9 × 3,5 = 17,1 m² > 16
  })
  it('túl keskeny nyílásnál jelez', () => {
    expect(zipPlan(0.5, 2.4).issues.length).toBeGreaterThan(0)
  })
})

describe('MB-OpenSlide szárnytáblázat', () => {
  it('5,72 m → 5 szárny (3920–5920), 1144 mm-es szárnyak, 5 sín', () => {
    const plan = openSlidePlan(5.72, 2.4)
    expect(plan.sashes).toBe(5)
    expect(plan.sashWidth).toBeCloseTo(1.144, 3)
    expect(plan.tracks).toBe(5)
    expect(plan.issues).toEqual([])
  })
  it('a legkisebb illeszkedő szárnyszám', () => {
    expect(openSlidePlan(3, 2.4).sashes).toBe(3)
    expect(openSlidePlan(4.2, 2.4).sashes).toBe(4)
    expect(openSlidePlan(6.5, 2.4).sashes).toBe(6)
  })
  it('magasság- és mérethatár', () => {
    expect(openSlidePlan(4, 2.9).issues.some((text) => text.includes('magas'))).toBe(true)
    expect(openSlidePlan(2, 2.4).issues.length).toBeGreaterThan(0)
  })
})

import { buildingIssues } from '../src/lib/buildings'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig } from '../src/types/pergola'

describe('MB-OpenSky 140 jelzések', () => {
  const base = { ...demoTenant.defaultConfig, roof: 'louvered', building: undefined, mount: 'freestanding', width: 5, depth: 4, height: 2.5, sides: { front: 'none', back: 'none', left: 'none', right: 'none' } } as PergolaConfig
  it('a mintaprojekt határain belül nincs jelzés', () => {
    expect(buildingIssues(base)).toEqual([])
  })
  it('túl nagy kinyúlás és magasság: figyelmeztetés', () => {
    const ids = buildingIssues({ ...base, depth: 7.2, height: 3 }).map((issue) => issue.id)
    expect(ids).toContain('os140-depth')
    expect(ids).toContain('os140-height')
  })
  it('hosszú ZIP-oldal: két screen; túl magas toló üvegfal: jelzés', () => {
    expect(buildingIssues({ ...base, width: 5.9, sides: { ...base.sides, front: 'zip' } }).map((issue) => issue.id)).toContain('zip-split')
    expect(buildingIssues({ ...base, height: 2.95, sides: { ...base.sides, front: 'glass' } }).map((issue) => issue.id)).toContain('openslide-size')
  })
})

import { segmentWallEnds, sideEndInsets, SIDE_POST_INSET, SIDE_WALL_INSET } from '../src/lib/os140Sides'

describe('oldalzárás a falnál (nincs rés a fal és a ZIP/üvegfal között)', () => {
  it('falra szerelt pergola bal/jobb oldala: a hátsó (+x) vég a falnál', () => {
    expect(segmentWallEnds('left', ['back'], true, true)).toEqual([false, true])
    expect(segmentWallEnds('right', ['back'], true, true)).toEqual([false, true])
  })
  it('sarokrögzítés: az elülső oldal fal felőli vége', () => {
    expect(segmentWallEnds('front', ['back', 'left'], true, true)).toEqual([true, false])
    expect(segmentWallEnds('front', ['back', 'right'], true, true)).toEqual([false, true])
  })
  it('osztott oldal belső vége (osztóprofil) nem falnál van', () => {
    expect(segmentWallEnds('left', ['back'], true, false)).toEqual([false, false])
  })
  it('falnál a nyílás a fal síkjáig tart, oszlopnál az oszlop oldallapjáig', () => {
    expect(sideEndInsets([false, true])).toEqual([SIDE_POST_INSET, SIDE_WALL_INSET])
    expect(SIDE_WALL_INSET).toBeCloseTo(-(0.1395 / 2 + 0.015), 6)
  })
})

describe('ZIP-osztás jelzése a falig érő nyílással', () => {
  it('sarokrögzítésnél az 5 m-es elülső oldal a falig ér → 5 m felett két screen (a 3D-vel egyezően)', () => {
    const corner = { ...demoTenant.defaultConfig, roof: 'louvered', building: undefined, mount: 'corner-left', width: 5, depth: 4, height: 2.5, sides: { front: 'zip', back: 'none', left: 'none', right: 'none' } } as PergolaConfig
    expect(buildingIssues(corner).map((issue) => issue.id)).toContain('zip-split')
    const free = { ...corner, mount: 'freestanding' } as PergolaConfig
    expect(buildingIssues(free).map((issue) => issue.id)).not.toContain('zip-split')
  })
})
