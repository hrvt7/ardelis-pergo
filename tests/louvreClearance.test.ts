import { describe, expect, it } from 'vitest'
import { LOUVRE, louvreLayout, louvreSealBoxes, louvreSection } from '../src/lib/louvreSystem'
import { polygonsIntersect, rectPolygon } from '../src/lib/mechanics'
import { SB400 } from '../src/lib/sb400'

// A lamellák forgása egyetlen szögből (0 … 110°) számolódik; minden szögnél ellenőrizzük, hogy
// a szomszédos lamellák, a záró profilok és a keretgerendák keresztmetszete nem metszi egymást.
const ANGLES = Array.from({ length: LOUVRE.maxAngle + 1 }, (_, index) => index)
const DEPTHS = [2.5, 2.8, 3, 3.3, 3.6, 4, 4.4, 4.7, 5, 6, 7]
const BEAM = SB400.strutW
const TOP = 2.7

describe('lamellák: ütközésmentes forgás a teljes tartományban', () => {
  it('a vizsgálat nem üres: egymásra tolt lamellákat metszőnek talál', () => {
    expect(polygonsIntersect(louvreSection(30, 0, 0), louvreSection(30, 0.02, 0))).toBe(true)
    expect(polygonsIntersect(louvreSection(0, 0, 0), louvreSection(0, 0.5, 0))).toBe(false)
  })
  it('szomszédos lamellák egyetlen szögnél sem metszik egymást (zárva sem)', () => {
    const bad = ANGLES.filter((angle) => polygonsIntersect(louvreSection(angle, 0, 0, 24), louvreSection(angle, LOUVRE.pitch, 0, 24)))
    expect(bad).toEqual([])
  })
  it('zárva felülnézetben átfednek (vízzárás), nyitva rés nyílik', () => {
    const zs = (angle: number, at: number) => louvreSection(angle, at, 0).map(([z]) => z)
    expect(Math.max(...zs(0, 0))).toBeGreaterThan(Math.min(...zs(0, LOUVRE.pitch)))
    expect(Math.max(...zs(90, 0))).toBeLessThan(Math.min(...zs(90, LOUVRE.pitch)))
  })
  it('a szélső lamellák nem érnek a záró profilokba és a gerendába, semmilyen mélységnél', () => {
    const failures: string[] = []
    for (const depth of DEPTHS) {
      const layout = louvreLayout(4, depth, BEAM, TOP, SB400.endGap)
      const innerHalf = (depth - BEAM) / 2
      const seals = louvreSealBoxes(layout, depth, BEAM)
      const obstacles: [string, [number, number][]][] = [
        ['elülső gerenda', rectPolygon(innerHalf, innerHalf + BEAM, TOP - SB400.strutH, TOP)],
        ['hátsó gerenda', rectPolygon(-innerHalf - BEAM, -innerHalf, TOP - SB400.strutH, TOP)],
      ]
      if (seals.front) obstacles.push(['elülső záróprofil', rectPolygon(...seals.front)])
      if (seals.back) obstacles.push(['hátsó záróprofil', rectPolygon(...seals.back)])
      const edges = [layout.z[0], layout.z[layout.z.length - 1]]
      for (const angle of ANGLES) for (const z of edges) {
        const blade = louvreSection(angle, z, layout.axleY, 24)
        for (const [label, box] of obstacles) if (polygonsIntersect(blade, box)) failures.push(`${depth} m, ${angle}°, lamella z=${z.toFixed(3)} → ${label}`)
      }
    }
    expect(failures).toEqual([])
  })
})
