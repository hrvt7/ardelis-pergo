// „Fotóba helyezés”: a feltöltött teraszfotó HTML-háttérként a (fotó módban átlátszó) 3D vászon
// mögött jelenik meg, a pergola valós idejű 3D marad. Itt csak a tiszta, tesztelhető logika van:
// fájlellenőrzés, alapértékek, gesztusok → transzformáció, kamera-póz és a háttérkép „cover” vágása.
import type { PergolaConfig, SceneSettings } from '../types/pergola'

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const PHOTO_ACCEPT = PHOTO_TYPES.join(',')

/** A pergola elhelyezése a fotón (a jelenet beállításaiban tárolva). */
export interface PhotoPlacement {
  /** Vízszintes eltolás (m, a kamera síkjában). */
  photoX: number
  /** Függőleges eltolás (m). */
  photoY: number
  /** Egységes méretarány. */
  photoScale: number
  /** Elforgatás a függőleges tengely körül (fok). */
  photoRotation: number
  /** A nézőpont magassága (fok): mennyire felülről néz a kamera — a fotó perspektívájához igazítható. */
  photoTilt: number
  /** A perspektíva erőssége: a kamera távolságának szorzója (0,5 = közelről, széles látószög, erős rövidülés; 2 = távolról, tele, lapos). A pergola látszó mérete nem változik. */
  photoLens: number
}

export const DEFAULT_PLACEMENT: PhotoPlacement = { photoX: 0, photoY: 0, photoScale: 1, photoRotation: -25, photoTilt: 14, photoLens: 1 }
export const PLACEMENT_LIMITS = { x: 8, yMin: -5, yMax: 5, scaleMin: 0.15, scaleMax: 4, tiltMin: 0, tiltMax: 60, lensMin: 0.5, lensMax: 2.2 } as const

export function validatePhotoFile(file: Pick<File, 'type' | 'size' | 'name'>): string | null {
  const type = file.type.toLowerCase()
  const extensionOk = /\.(jpe?g|png|webp)$/i.test(file.name)
  if (/heic|heif/i.test(type) || /\.(heic|heif)$/i.test(file.name)) return 'Ez iPhone-os HEIC fotó, amit a böngésző nem tud megjeleníteni. A Fotók appban „Megosztás → Fájlokba mentés” JPG-ként, vagy készíts képernyőképet a fotóról.'
  if (!(PHOTO_TYPES as readonly string[]).includes(type) && !(type === '' && extensionOk)) return 'Csak JPG, PNG vagy WebP képet tölthetsz fel.'
  if (file.size > PHOTO_MAX_BYTES) return `A kép túl nagy (${(file.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB). Legfeljebb 10 MB lehet.`
  if (file.size === 0) return 'A fájl üres.'
  return null
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
/** −180…180 fok közé hozza a szöget. */
export const wrapDegrees = (value: number) => ((((value + 180) % 360) + 360) % 360) - 180

export function clampPlacement(placement: PhotoPlacement): PhotoPlacement {
  return {
    photoX: clamp(placement.photoX, -PLACEMENT_LIMITS.x, PLACEMENT_LIMITS.x),
    photoY: clamp(placement.photoY, PLACEMENT_LIMITS.yMin, PLACEMENT_LIMITS.yMax),
    photoScale: clamp(placement.photoScale, PLACEMENT_LIMITS.scaleMin, PLACEMENT_LIMITS.scaleMax),
    photoRotation: wrapDegrees(placement.photoRotation),
    photoTilt: clamp(placement.photoTilt, PLACEMENT_LIMITS.tiltMin, PLACEMENT_LIMITS.tiltMax),
    photoLens: clamp(Number.isFinite(placement.photoLens) ? placement.photoLens : 1, PLACEMENT_LIMITS.lensMin, PLACEMENT_LIMITS.lensMax),
  }
}

export const pickPlacement = (scene: Pick<SceneSettings, keyof PhotoPlacement>): PhotoPlacement => ({ photoX: scene.photoX, photoY: scene.photoY, photoScale: scene.photoScale, photoRotation: scene.photoRotation, photoTilt: scene.photoTilt, photoLens: scene.photoLens })

/** Húzás: képernyő-pixel → méter a kamera síkjában (a kamera szemből néz, így x→x, y→y). */
export function dragPlacement(start: PhotoPlacement, dxPx: number, dyPx: number, metersPerPixel: number): PhotoPlacement {
  return clampPlacement({ ...start, photoX: start.photoX + dxPx * metersPerPixel, photoY: start.photoY - dyPx * metersPerPixel })
}

/** Két ujj: csippentés (méret), csavarás (forgatás) és a középpont mozgatása (eltolás). */
export function pinchPlacement(start: PhotoPlacement, scaleFactor: number, twistDeg: number, dxPx: number, dyPx: number, metersPerPixel: number): PhotoPlacement {
  const moved = dragPlacement(start, dxPx, dyPx, metersPerPixel)
  return clampPlacement({ ...moved, photoScale: start.photoScale * (Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1), photoRotation: start.photoRotation - twistDeg })
}

/**
 * A fotó módbeli kamera: szemből, a megadott magasságszögből, a pergola méretéhez igazított távolságból.
 * A `lens` a távolság szorzója; a látószög úgy szűkül/tágul, hogy a pergola látszó mérete ugyanaz maradjon —
 * így csak a perspektíva erőssége (a rövidülés) változik, ami a fotó objektívjéhez igazítható.
 */
export function photoCameraPose(config: Pick<PergolaConfig, 'width' | 'depth' | 'height'>, tiltDeg: number, fovDeg: number, lens = 1) {
  const span = Math.max(config.width, config.depth * 0.8, config.height * 1.4)
  const factor = clamp(Number.isFinite(lens) ? lens : 1, PLACEMENT_LIMITS.lensMin, PLACEMENT_LIMITS.lensMax)
  const baseDistance = (span * 1.05) / Math.tan(((fovDeg * Math.PI) / 180) / 2) + config.depth / 2
  const distance = baseDistance * factor
  const fov = (2 * Math.atan(Math.tan(((fovDeg * Math.PI) / 180) / 2) / factor) * 180) / Math.PI
  const tilt = (clamp(tiltDeg, PLACEMENT_LIMITS.tiltMin, PLACEMENT_LIMITS.tiltMax) * Math.PI) / 180
  const targetY = config.height * 0.45
  return {
    position: [0, targetY + Math.sin(tilt) * distance, Math.cos(tilt) * distance] as [number, number, number],
    target: [0, targetY, 0] as [number, number, number],
    distance,
    fov,
  }
}

/** Méter / képernyőpixel a megadott távolságban (függőleges látószög alapján). */
export const metersPerPixel = (distance: number, fovDeg: number, viewportHeight: number) => (2 * distance * Math.tan(((fovDeg * Math.PI) / 180) / 2)) / Math.max(1, viewportHeight)

/** CSS `object-fit: cover` vágás: a kép melyik része látszik egy adott dobozban. */
export function coverCrop(imageWidth: number, imageHeight: number, boxWidth: number, boxHeight: number) {
  const scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight)
  const width = boxWidth / scale
  const height = boxHeight / scale
  return { sx: (imageWidth - width) / 2, sy: (imageHeight - height) / 2, sw: width, sh: height }
}
