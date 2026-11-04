import { describe, expect, it } from 'vitest'
import { clampPlacement, coverCrop, DEFAULT_PLACEMENT, dragPlacement, metersPerPixel, photoCameraPose, PHOTO_MAX_BYTES, pinchPlacement, validatePhotoFile, wrapDegrees } from '../src/lib/photoPlacement'
import { DEFAULT_SCENE } from '../src/lib/config'

const file = (name: string, type: string, size = 1000) => ({ name, type, size })

describe('fotóba helyezés', () => {
  it('csak JPG/PNG/WebP-t enged, 10 MB alatt', () => {
    expect(validatePhotoFile(file('a.jpg', 'image/jpeg'))).toBeNull()
    expect(validatePhotoFile(file('a.png', 'image/png'))).toBeNull()
    expect(validatePhotoFile(file('a.webp', 'image/webp'))).toBeNull()
    expect(validatePhotoFile(file('a.jpg', ''))).toBeNull()
    expect(validatePhotoFile(file('a.gif', 'image/gif'))).toMatch(/JPG, PNG vagy WebP/)
    expect(validatePhotoFile(file('IMG_1.HEIC', 'image/heic'))).toMatch(/HEIC/)
    expect(validatePhotoFile(file('a.pdf', 'application/pdf'))).not.toBeNull()
    expect(validatePhotoFile(file('a.jpg', 'image/jpeg', PHOTO_MAX_BYTES + 1))).toMatch(/túl nagy/)
    expect(validatePhotoFile(file('a.jpg', 'image/jpeg', 0))).toMatch(/üres/)
  })

  it('az alapértékek egyeznek a jelenet alapértékeivel', () => {
    expect({ photoX: DEFAULT_SCENE.photoX, photoY: DEFAULT_SCENE.photoY, photoScale: DEFAULT_SCENE.photoScale, photoRotation: DEFAULT_SCENE.photoRotation, photoTilt: DEFAULT_SCENE.photoTilt }).toEqual(DEFAULT_PLACEMENT)
  })

  it('a határok közé szorít és a szöget −180…180 közé hozza', () => {
    expect(wrapDegrees(190)).toBe(-170)
    expect(wrapDegrees(-190)).toBe(170)
    const clamped = clampPlacement({ photoX: 99, photoY: -99, photoScale: 50, photoRotation: 370, photoTilt: 90 })
    expect(clamped).toEqual({ photoX: 8, photoY: -5, photoScale: 4, photoRotation: 10, photoTilt: 60 })
  })

  it('húzás: jobbra-le húzás → +x, −y', () => {
    const next = dragPlacement(DEFAULT_PLACEMENT, 100, 50, 0.01)
    expect(next.photoX).toBeCloseTo(1)
    expect(next.photoY).toBeCloseTo(-0.5)
  })

  it('csippentés: méret és forgatás, a középpont mozgásával', () => {
    const next = pinchPlacement(DEFAULT_PLACEMENT, 2, 30, 10, 0, 0.01)
    expect(next.photoScale).toBeCloseTo(2)
    expect(next.photoRotation).toBeCloseTo(DEFAULT_PLACEMENT.photoRotation - 30)
    expect(next.photoX).toBeCloseTo(0.1)
    expect(pinchPlacement(DEFAULT_PLACEMENT, Number.NaN, 0, 0, 0, 0.01).photoScale).toBe(1)
  })

  it('kamera: a nézőszög emeli a kamerát, a pergola középre kerül', () => {
    const low = photoCameraPose({ width: 5, depth: 4, height: 2.6 }, 0, 40)
    const high = photoCameraPose({ width: 5, depth: 4, height: 2.6 }, 40, 40)
    expect(high.position[1]).toBeGreaterThan(low.position[1])
    expect(Math.hypot(high.position[1] - high.target[1], high.position[2])).toBeCloseTo(high.distance)
    expect(metersPerPixel(10, 40, 800)).toBeCloseTo((2 * 10 * Math.tan((20 * Math.PI) / 180)) / 800)
  })

  it('cover vágás: álló képből fekvő dobozba középen vág', () => {
    const crop = coverCrop(1000, 2000, 1600, 900)
    expect(crop.sw).toBeCloseTo(1000)
    expect(crop.sh).toBeCloseTo(562.5)
    expect(crop.sy).toBeCloseTo((2000 - 562.5) / 2)
    expect(crop.sx).toBeCloseTo(0)
  })
})
