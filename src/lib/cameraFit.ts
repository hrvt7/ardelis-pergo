// Kamera-keretezés: a legkisebb kameratávolság, amelynél a teljes pergola (oszlopokkal, peremmel)
// belefér a képbe a vászon tényleges oldalarányánál. Széles, modulos pergolánál a rögzített
// nézet-távolság kevés volt: a szerkezet széle kilógott a képből.
import type { PergolaConfig } from '../types/pergola'

/** A nézet-távolság alsó határa méterben. */
export function fitDistance(size: Pick<PergolaConfig, 'width' | 'depth' | 'height'>, fovDeg: number, aspect: number, margin = 1.08) {
  // Fél-kiterjedések a célpont körül (a célpont a szerkezet magasságának ~40%-án áll): perem az oszlopokra és a gerendákra.
  const hx = size.width / 2 + 0.6
  const hy = size.height / 2 + 0.5
  const hz = size.depth / 2 + 0.6
  const radius = Math.sqrt(hx * hx + hy * hy + hz * hz)
  const vertical = (fovDeg * Math.PI) / 360
  const horizontal = Math.atan(Math.tan(vertical) * Math.max(0.2, aspect))
  return (radius / Math.sin(Math.min(vertical, horizontal))) * margin
}

/** Az OrbitControls távolságkorlátja: kis pergolánál a megszokott 24 m, nagynál arányosan több. */
export const maxOrbitDistance = (size: Pick<PergolaConfig, 'width' | 'depth'>) => Math.max(24, Math.max(size.width, size.depth) * 2.4)
