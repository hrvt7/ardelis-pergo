import { describe, expect, it } from 'vitest'
import { SB400, sb400LouvreLength, sb400Outer, sb400Post } from '../src/lib/sb400'
import { drivePlan, LOUVRE, louvreLayout, motorLength } from '../src/lib/louvreSystem'
import { postPositions } from '../src/lib/mount'

describe('SB 400 gyári váz', () => {
  it('az adatlap profilméretei', () => {
    expect([SB400.strutW, SB400.strutH]).toEqual([0.085, 0.212])
    expect([SB400.postW, SB400.postD]).toEqual([0.085, 0.15])
    expect([SB400.gutterW, SB400.gutterBack]).toEqual([0.0916, 0.075])
  })

  it('lamellahossz = befoglaló szélesség − 210 mm, és a jelenet ugyanezt számolja', () => {
    const width = 4 - SB400.strutW // 4000 mm befoglaló szélesség
    expect(sb400Outer(width)).toBeCloseTo(4, 9)
    expect(sb400LouvreLength(width) * 1000).toBeCloseTo(3790, 6)
    const layout = louvreLayout(width, 4, SB400.strutW, 3.012, SB400.endGap)
    expect(layout.modules[0].length * 1000).toBeCloseTo(3790, 6)
  })

  it('7000 mm kinyúlásnál 34 lamella, 200 mm-es osztással (adatlap-rajz)', () => {
    const layout = louvreLayout(4 - SB400.strutW, 7 - SB400.strutW, SB400.strutW, 3.012, SB400.endGap)
    expect(layout.z).toHaveLength(34)
    expect((layout.z[1] - layout.z[0]) * 1000).toBeCloseTo(200, 6)
    // a tengely a csapágyoldalon 43, a hajtásoldalon 23 mm-rel a gerenda teteje alatt
    expect((3.012 - layout.axleY) * 1000).toBeCloseTo(43, 6)
    expect((3.012 - (layout.axleY + SB400.fall)) * 1000).toBeCloseTo(23, 6)
  })

  it('a régi hívás (hézag megadása nélkül) változatlan', () => {
    expect(louvreLayout(4, 4, 0.19, 3).modules[0].length).toBeCloseTo(4 - 0.19 - 2 * LOUVRE.endGap, 9)
  })

  it('a motor zárt hossza az esés mellett is 732 mm, és nyitásra nő', () => {
    const layout = louvreLayout(3.915, 3.915, SB400.strutW, 2.906, SB400.endGap)
    const axle = layout.axleY + SB400.fall
    const plan = drivePlan(layout.z, axle, 2.906, (3.915 - SB400.strutW) / 2 - 0.04)
    expect(motorLength(plan, layout.z, axle, 0) * 1000).toBeCloseTo(732, 3)
    expect(motorLength(plan, layout.z, axle, LOUVRE.maxAngle)).toBeGreaterThan(0.85)
  })

  it('a sarokoszlop a gerenda külső síkjában áll, a talp befelé nyúlik', () => {
    const [w, d] = [4, 5]
    for (const at of postPositions({ width: w, depth: d, mount: 'freestanding', modules: 1 })) {
      const p = sb400Post(at, w, d)
      const sx = Math.sign(at[0]); const sz = Math.sign(at[1])
      // oszlop külső síkja = gerenda külső síkja
      expect(p.x + sx * SB400.postW / 2).toBeCloseTo(sx * (w / 2 + SB400.strutW / 2), 9)
      expect(p.z + sz * SB400.postD / 2).toBeCloseTo(sz * (d / 2 + SB400.strutW / 2), 9)
      // talp 142,5 × 200, a körvonalon belül marad
      expect([p.footW, p.footD]).toEqual([0.1425, 0.2])
      expect(Math.abs(p.footX) + p.footW / 2).toBeCloseTo(w / 2 + SB400.strutW / 2, 9)
      expect(Math.abs(p.footZ) + p.footD / 2).toBeCloseTo(d / 2 + SB400.strutW / 2, 9)
      // 3 horgony: az oszlop alatti külső sarokban nincs furat, és egyik sem esik az oszlop alá
      expect(p.anchors).toHaveLength(3)
      for (const [ax, az] of p.anchors) {
        const underPost = Math.abs(ax - p.x) < SB400.postW / 2 && Math.abs(az - p.z) < SB400.postD / 2
        expect(underPost).toBe(false)
      }
    }
  })

  it('a közbenső oszlop teljes (200 × 200) talpat kap négy horgonnyal', () => {
    const p = sb400Post([0, 2.41], 8, 5)
    expect(p.x).toBe(0)
    expect([p.footW, p.footD]).toEqual([0.2, 0.2])
    expect(p.anchors).toHaveLength(4)
  })
})
