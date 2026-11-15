// Rövid körbejáró videó a tervről (MP4, ahol a böngésző tudja; különben WebM), hogy a vevő WhatsAppon is
// továbbküldhesse. A 3D-vászon képét egy 2D-vászonra másoljuk (fotó módban a háttérfotó fölé), alul márkázott
// sávval, és ezt rögzíti a böngésző saját MediaRecorder-e. A kamerát a PergolaScene mozgatja (sceneRegistry).
import { coverCrop } from './photoPlacement'
import { getOrbitDriver } from './sceneRegistry'

/** A felvétel hossza (mp) és a kamera kilengése, ha a ház miatt nem járható körbe (fok, a kiinduló nézettől mindkét irányba). */
export const VIDEO_SECONDS = 10
export const SWING_DEGREES = 55

const MIME_PREFERENCE = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']

/** Az első formátum, amit a böngésző rögzíteni tud; MP4 előnyben, mert a WhatsApp és az iPhone azt játssza le biztosan. */
export function pickVideoMime(isTypeSupported: (type: string) => boolean): string | null {
  for (const type of MIME_PREFERENCE) {
    try { if (isTypeSupported(type)) return type } catch { /* ismeretlen típus */ }
  }
  return null
}

export const videoExtension = (mime: string) => (mime.startsWith('video/mp4') ? 'mp4' : 'webm')

/** A videó mérete: a vászon arányával, legfeljebb `max` px a hosszabbik oldalon, páros számokkal (a kódolók ezt várják). */
export function videoSize(width: number, height: number, max = 1280): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height, 1))
  const even = (value: number) => Math.max(2, Math.round((value * scale) / 2) * 2)
  return { width: even(width), height: even(height) }
}

/**
 * A kamera iránya (radián) a felvétel `t` (0–1) pillanatában. Ha nincs ház a képen, teljes kör; ha van, a kiinduló
 * nézet körül lengés (így a kamera sosem kerül a ház mögé vagy a falba). Mindkettő a kiinduló nézetben ér véget.
 */
export function orbitAzimuth(t: number, start: number, fullTurn: boolean, swingDegrees = SWING_DEGREES): number {
  const p = Math.min(1, Math.max(0, t))
  if (fullTurn) return start + p * Math.PI * 2
  return start + Math.sin(p * Math.PI * 2) * (swingDegrees * Math.PI) / 180
}

export function videoRecordingSupported(): boolean {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return false
  if (typeof HTMLCanvasElement === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return false
  return pickVideoMime((type) => MediaRecorder.isTypeSupported(type)) !== null
}

export interface VideoOverlay {
  brand: string
  title: string
  price: string
  accent: string
}

function drawOverlay(context: CanvasRenderingContext2D, width: number, height: number, overlay: VideoOverlay) {
  const bar = Math.round(height * 0.14)
  const gradient = context.createLinearGradient(0, height - bar * 1.6, 0, height)
  gradient.addColorStop(0, 'rgba(10,14,12,0)')
  gradient.addColorStop(1, 'rgba(10,14,12,0.82)')
  context.fillStyle = gradient
  context.fillRect(0, height - bar * 1.6, width, bar * 1.6)
  const pad = Math.round(width * 0.04)
  const big = Math.max(14, Math.round(bar * 0.3))
  const small = Math.max(11, Math.round(bar * 0.2))
  context.textBaseline = 'alphabetic'
  context.fillStyle = overlay.accent
  context.font = `700 ${small}px system-ui, sans-serif`
  context.textAlign = 'left'
  context.fillText(overlay.brand.toUpperCase(), pad, height - pad - big * 1.25)
  context.fillStyle = '#ffffff'
  context.font = `700 ${big}px system-ui, sans-serif`
  context.fillText(overlay.title, pad, height - pad)
  context.textAlign = 'right'
  context.fillText(overlay.price, width - pad, height - pad)
  context.fillStyle = 'rgba(255,255,255,0.7)'
  context.font = `500 ${small}px system-ui, sans-serif`
  context.fillText('bruttó irányár', width - pad, height - pad - big * 1.25)
}

const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve))

/** A körbejáró videó felvétele. `onProgress` 0–1 között. A kamera a felvétel után visszaáll a kiinduló nézetbe. */
export async function recordTurntable(overlay: VideoOverlay, onProgress?: (progress: number) => void, seconds = VIDEO_SECONDS): Promise<{ blob: Blob; extension: string }> {
  const source = document.querySelector<HTMLCanvasElement>('canvas[data-pergola-canvas="true"]')
  const driver = getOrbitDriver()
  const mime = typeof MediaRecorder !== 'undefined' ? pickVideoMime((type) => MediaRecorder.isTypeSupported(type)) : null
  if (!source || !source.width || !driver || !mime) throw new Error('A videó ebben a böngészőben nem készíthető el.')

  const size = videoSize(source.width, source.height)
  const output = document.createElement('canvas')
  output.width = size.width
  output.height = size.height
  const context = output.getContext('2d')
  if (!context) throw new Error('A videó ebben a böngészőben nem készíthető el.')
  const photo = document.querySelector<HTMLImageElement>('img.photo-backdrop')
  const draw = () => {
    if (photo?.complete && photo.naturalWidth > 0) {
      const crop = coverCrop(photo.naturalWidth, photo.naturalHeight, size.width, size.height)
      context.drawImage(photo, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, size.width, size.height)
    } else {
      context.fillStyle = '#0d1210'
      context.fillRect(0, 0, size.width, size.height)
    }
    context.drawImage(source, 0, 0, size.width, size.height)
    drawOverlay(context, size.width, size.height, overlay)
  }

  const stream = output.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })

  driver.begin()
  try {
    // Pár képkocka, hogy a kamera biztosan a kiinduló helyén álljon (az esetleges lendület lecsengjen).
    for (let i = 0; i < 3; i++) { driver.step(0); await frame() }
    draw()
    recorder.start(250)
    const started = performance.now()
    for (;;) {
      const t = Math.min(1, (performance.now() - started) / (seconds * 1000))
      driver.step(t)
      await frame()
      draw()
      onProgress?.(t)
      if (t >= 1) break
    }
    await frame()
    draw()
    recorder.stop()
    await stopped
  } finally {
    stream.getTracks().forEach((track) => track.stop())
    driver.end()
  }
  if (!chunks.length) throw new Error('A videó üres maradt.')
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), extension: videoExtension(mime) }
}
