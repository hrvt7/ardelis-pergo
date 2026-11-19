import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { facadeOffset, getHouseLayout, wingFootprints } from '../src/lib/sceneLayout'
import { openCorners, postPositions } from '../src/lib/mount'
import { OS140, OS140_WALL_GAP } from '../src/lib/os140'

const base = { width: 5, depth: 4, height: 2.6, modules: 1 } as const

describe('forgólamellás váz falra szerelve (fali csatlakozás)', () => {
  it('a homlokzat a fali gerenda külső síkja mögött csak a szerelési hézaggal (nem vág bele, nem lóg el)', () => {
    const face = facadeOffset({ roof: 'louvered' })
    expect(face.back).toBeCloseTo(OS140.beamW / 2 + OS140_WALL_GAP, 6)
    expect(face.back).toBeGreaterThan(OS140.beamW / 2)
    expect(getHouseLayout({ ...base, mount: 'wall', roof: 'louvered' }).frontZ).toBeCloseTo(-base.depth / 2 - face.back, 6)
    const [wing] = wingFootprints({ ...base, mount: 'corner-left', roof: 'louvered' })
    expect(wing.inner).toBeCloseTo(-(base.width / 2 + face.side), 6)
  })
  it('a többi tetőnél a fali szerelőprofil helye változatlan', () => {
    expect(facadeOffset({ roof: 'fixed' })).toEqual({ back: 0.185, side: 0.125 })
    expect(getHouseLayout({ ...base, mount: 'wall', roof: 'glass' }).frontZ).toBeCloseTo(-base.depth / 2 - 0.185, 6)
  })
  it('oszlop nélküli sarkok: pontosan ott, ahol a falas oldal miatt nincs oszlop', () => {
    for (const mount of ['freestanding', 'wall', 'corner-left', 'corner-right', 'niche'] as const) {
      const corners = openCorners(mount)
      const posts = postPositions({ ...base, mount })
      const has = (sx: number, sz: number) => posts.some(([x, z]) => Math.sign(x) === sx && Math.sign(z) === sz && Math.abs(x) > base.width / 2 - 0.2 && Math.abs(z) > base.depth / 2 - 0.2)
      expect(corners.backLeft).toBe(!has(-1, -1))
      expect(corners.backRight).toBe(!has(1, -1))
      expect(corners.frontLeft).toBe(!has(-1, 1))
      expect(corners.frontRight).toBe(!has(1, 1))
    }
  })
  it('bekötés: OS140 fali csatlakozó, sarokig futó oldalgerenda, a stúdió fala a homlokzat síkjában, érzékelő a gerendán', () => {
    const scene = readFileSync(new URL('../src/components/PergolaScene.tsx', import.meta.url), 'utf8')
    const os140 = readFileSync(new URL('../src/components/Os140Pergola.tsx', import.meta.url), 'utf8')
    expect(scene).toContain('<Os140WallJoint side="back"')
    expect(scene).toContain('<Os140Beams openCorners={openCorners(mount)}')
    expect(scene).toContain('-depth / 2 - face.back - 0.14')
    expect(scene).toContain('height + OS140.beamH / 2 + 0.06')
    expect(os140).toContain('const reach = OS140.post / 2 + half')
  })
})
