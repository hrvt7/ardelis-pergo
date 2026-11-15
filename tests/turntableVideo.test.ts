import { describe, expect, it } from 'vitest'
import { orbitAzimuth, pickVideoMime, SWING_DEGREES, videoExtension, videoSize } from '../src/lib/turntableVideo'

describe('körbejáró videó', () => {
  it('MP4-et választ, ha a böngésző tudja; különben WebM-et; semmit, ha egyiket sem', () => {
    expect(pickVideoMime((type) => type.startsWith('video/mp4'))).toBe('video/mp4;codecs=avc1.42E01E')
    expect(pickVideoMime((type) => type === 'video/webm;codecs=vp9' || type === 'video/webm')).toBe('video/webm;codecs=vp9')
    expect(pickVideoMime(() => false)).toBeNull()
    expect(pickVideoMime(() => { throw new Error('ismeretlen') })).toBeNull()
    expect(videoExtension('video/mp4;codecs=avc1')).toBe('mp4')
    expect(videoExtension('video/webm;codecs=vp9')).toBe('webm')
  })

  it('a videó mérete páros, legfeljebb 1280 px, a vászon arányával', () => {
    expect(videoSize(2560, 1440)).toEqual({ width: 1280, height: 720 })
    expect(videoSize(1179, 2556)).toEqual({ width: 590, height: 1280 })
    const small = videoSize(801, 601)
    expect(small.width % 2).toBe(0)
    expect(small.height % 2).toBe(0)
  })

  it('ház nélkül teljes kör, a kiinduló nézetben ér véget', () => {
    expect(orbitAzimuth(0, 1, true)).toBeCloseTo(1)
    expect(orbitAzimuth(0.5, 1, true)).toBeCloseTo(1 + Math.PI)
    expect(orbitAzimuth(1, 1, true)).toBeCloseTo(1 + 2 * Math.PI)
  })

  it('házzal csak lengés a kiinduló nézet körül, sosem fordul a ház mögé', () => {
    const limit = (SWING_DEGREES * Math.PI) / 180
    const samples = Array.from({ length: 101 }, (_, i) => orbitAzimuth(i / 100, 0.3, false) - 0.3)
    expect(Math.max(...samples)).toBeCloseTo(limit, 3)
    expect(Math.min(...samples)).toBeCloseTo(-limit, 3)
    expect(orbitAzimuth(0, 0.3, false)).toBeCloseTo(0.3)
    expect(orbitAzimuth(1, 0.3, false)).toBeCloseTo(0.3)
    expect(orbitAzimuth(2, 0.3, false)).toBeCloseTo(0.3)
  })
})
