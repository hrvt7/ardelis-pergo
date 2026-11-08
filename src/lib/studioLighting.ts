// Közös napszak-világítás a nem-pergola termékcsaládok jeleneteihez (kerítés, garázskapu), a pergola-jelenet
// (PergolaScene getLighting) hangolásával: ugyanazok az égboltok, napszínek és ködszínek. A pergola saját, órára
// állítható világítást használ; itt a három kiinduló napszak elég (nappal / aranyóra / éjszaka).
export type StudioTime = 'day' | 'sunset' | 'night'

export const STUDIO_TIMES: { id: StudioTime; label: string }[] = [
  { id: 'day', label: 'Nappal' },
  { id: 'sunset', label: 'Aranyóra' },
  { id: 'night', label: 'Éjszaka' },
]

/** A pergola-konfigurátorral azonos kiinduló napszak: aranyóra. */
export const DEFAULT_STUDIO_TIME: StudioTime = 'sunset'

export function studioLighting(time: StudioTime) {
  const night = time === 'night'
  const golden = time === 'sunset'
  return {
    night,
    hdr: night ? '/assets/hdr/night_sky.hdr' : golden ? '/assets/hdr/sunset_sky.hdr' : '/assets/hdr/day_clear.hdr',
    fog: night ? '#1d2a30' : golden ? '#c7b5ad' : '#c3cdce',
    /** Semleges stúdió-háttér (környezet nélkül): a pergola „Csak a pergola” színei. */
    studio: night ? '#1b1f22' : '#e8e5de',
    studioFloor: night ? '#555851' : '#dad7cf',
    sun: night ? '#b5cff2' : golden ? '#ffc890' : '#fff0d2',
    sunIntensity: night ? 1.1 : golden ? 2.4 : 3.1,
    /** Aranyórában alacsonyabban, oldalról süt a nap: hosszabb, melegebb árnyékok. */
    sunPosition: (golden ? [-9, 5, 8] : night ? [6, 9, 10] : [7, 12, 8]) as [number, number, number],
    ambient: night ? 0.6 : golden ? 0.45 : 0.55,
    hemisphere: night ? 0.4 : golden ? 0.5 : 0.55,
    environment: night ? 0.55 : golden ? 0.75 : 0.8,
    /** Égbolt-háttér a pergola-jelenet értékeivel (élesen, nem elmosva), hogy a horizont köde és az ég összeérjen. */
    background: night ? 0.55 : 0.95,
    exposure: night ? 1 : golden ? 0.9 : 0.88,
  }
}
