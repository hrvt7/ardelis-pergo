// Helyszín irányítószám alapján (GeoNames, CC BY 4.0) és a vizsgált nap/időpont feloldása.
import { assetUrl } from '@/lib/assetUrl'
import { sunPosition, zonedTimeToUtc } from '@/lib/sun'
import type { SceneSettings, SunSite } from '@/types/pergola'

/** Ha a látogató nem ad meg helyszínt: Budapest. (A napállás országon belül legfeljebb ~1–2°-ot tér el.) */
export const DEFAULT_SITE: SunSite = { postalCode: '1051', name: 'Budapest', region: 'Budapest', lat: 47.4984, lon: 19.0404, timeZone: 'Europe/Budapest' }

type PostalTable = Record<string, [number, number, string, string]>
let table: Promise<PostalTable> | null = null

function loadTable() {
  table ??= fetch(assetUrl('/assets/data/postal-hu.json'))
    .then((response) => { if (!response.ok) throw new Error(`Irányítószám-lista: ${response.status}`); return response.json() as Promise<{ codes: PostalTable }> })
    .then((data) => data.codes)
    .catch((error) => { table = null; throw error })
  return table
}

/** Magyar irányítószám → helyszín, vagy null, ha nincs ilyen. */
export async function lookupPostalCode(code: string): Promise<SunSite | null> {
  const clean = code.trim()
  if (!/^\d{4}$/.test(clean)) return null
  const codes = await loadTable()
  const row = codes[clean]
  if (!row) return null
  const [lat, lon, name, region] = row
  return { postalCode: clean, name, region, lat, lon, timeZone: 'Europe/Budapest' }
}

/** A vizsgált nap: a megadott dátum, vagy a mai (a helyszín időzónájában). */
export function studyDate(scene: Pick<SceneSettings, 'sunDate'>, timeZone = DEFAULT_SITE.timeZone): [number, number, number] {
  if (/^\d{4}-\d{2}-\d{2}$/.test(scene.sunDate)) {
    const [y, m, d] = scene.sunDate.split('-').map(Number)
    return [y, m, d]
  }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number)
  return [parts[0], parts[1], parts[2]]
}

export function isoDate([y, m, d]: [number, number, number]) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** A Nap helyzete a jelenet beállításai szerint (helyszín, nap, időpont). */
export function studySun(scene: Pick<SceneSettings, 'sunDate' | 'sunHour' | 'site'>, hour = scene.sunHour) {
  const site = scene.site ?? DEFAULT_SITE
  const [y, m, d] = studyDate(scene, site.timeZone)
  return sunPosition(zonedTimeToUtc(y, m, d, hour, site.timeZone), site.lat, site.lon)
}
