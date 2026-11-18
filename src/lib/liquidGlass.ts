/**
 * „Liquid glass” fénytörés: elmozdítási térkép (displacement map) egy lekerekített téglalaphoz.
 * A perem `bezel` széles sávjában a háttér befelé hajlik (mint egy vastag üveglap szélén),
 * a belseje torzítatlan. R = vízszintes, G = függőleges elmozdulás; 128 = nincs elmozdulás.
 *
 * Valódi háttértörés csak Chromium-alapú böngészőben működik (`backdrop-filter: url(#…)`);
 * máshol a panel matt üveg marad (lásd `supportsLiquidRefraction`).
 */
export function displacementMap(width: number, height: number, radius: number, bezel: number): Uint8ClampedArray {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const data = new Uint8ClampedArray(w * h * 4)
  const hw = w / 2
  const hh = h / 2
  const rad = Math.min(radius, hw, hh)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw
      const py = y + 0.5 - hh
      const qx = Math.abs(px) - (hw - rad)
      const qy = Math.abs(py) - (hh - rad)
      const ox = Math.max(qx, 0)
      const oy = Math.max(qy, 0)
      // Előjeles távolság a peremtől (pozitív = belül).
      const inside = rad - Math.hypot(ox, oy) - Math.min(Math.max(qx, qy), 0)
      let nx = 0
      let ny = 0
      if (inside > 0 && inside < bezel) {
        // A perem kifelé mutató normálisa; a háttér befelé, a középpont felé hajlik.
        if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = (qx / l) * Math.sign(px); ny = (qy / l) * Math.sign(py) } else if (qx > qy) nx = Math.sign(px)
        else ny = Math.sign(py)
        const t = 1 - inside / bezel
        const strength = t * t
        nx *= -strength
        ny *= -strength
      }
      const i = (y * w + x) * 4
      data[i] = Math.round(128 + nx * 127)
      data[i + 1] = Math.round(128 + ny * 127)
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }
  return data
}

/** Chromium-alapú böngésző egérrel: itt kapcsoljuk be a valódi törést (telefonon a teljesítmény miatt nem). */
export function supportsLiquidRefraction(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  try {
    return 'userAgentData' in navigator && window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-transparency: reduce)').matches
  } catch { return false }
}
