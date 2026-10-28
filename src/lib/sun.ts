// Napállás-számítás (NOAA / Meeus algoritmus). Böngészőben és szerveren is fut.
// Pontosság 1900–2100 között: a NREL SPA referenciához képest ~0,02°-on belül
// (tests/sun.test.ts ellenőrzi). Ez 3 m magas tárgynál ~1 mm árnyékeltérés.

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

export interface SunPosition {
  /** Irány az északhoz képest, az óramutató járásával (0 = É, 90 = K, 180 = D, 270 = Ny). */
  azimuth: number
  /** Magasság a horizont fölött, légköri fénytöréssel korrigálva (fok) — ezt látjuk. */
  elevation: number
  /** Geometriai magasság fénytörés nélkül (fok). */
  trueElevation: number
}

/** A Nap helyzete egy adott pillanatban (UTC időbélyeg, földrajzi szélesség/hosszúság fokban). */
export function sunPosition(utcMs: number, lat: number, lon: number): SunPosition {
  const jd = utcMs / 86400000 + 2440587.5
  const t = (jd - 2451545) / 36525
  const l0 = mod(280.46646 + t * (36000.76983 + t * 0.0003032), 360)
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
  const c = Math.sin(m * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * m * RAD) * (0.019993 - 0.000101 * t) + Math.sin(3 * m * RAD) * 0.000289
  const omega = 125.04 - 1934.136 * t
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(omega * RAD)
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD)
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD))
  const y = Math.tan((eps / 2) * RAD) ** 2
  const eqTime = 4 * DEG * (y * Math.sin(2 * l0 * RAD) - 2 * e * Math.sin(m * RAD) + 4 * e * y * Math.sin(m * RAD) * Math.cos(2 * l0 * RAD) - 0.5 * y * y * Math.sin(4 * l0 * RAD) - 1.25 * e * e * Math.sin(2 * m * RAD))
  const minutes = mod(utcMs / 60000, 1440)
  const trueSolar = mod(minutes + eqTime + 4 * lon, 1440)
  const hourAngle = (trueSolar / 4 - 180) * RAD
  const phi = lat * RAD
  const cosZenith = clamp(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(hourAngle), -1, 1)
  const zenith = Math.acos(cosZenith)
  const azimuth = mod(Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) * DEG + 180, 360)
  const elevation = 90 - zenith * DEG
  return { azimuth, elevation: elevation + refraction(elevation), trueElevation: elevation }
}

/** Légköri fénytörés (NOAA közelítés), fokban. */
function refraction(elevation: number) {
  if (elevation > 85) return 0
  const te = Math.tan(elevation * RAD)
  let arcsec: number
  if (elevation > 5) arcsec = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5
  else if (elevation > -0.575) arcsec = 1735 + elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)))
  else arcsec = -20.774 / te
  return arcsec / 3600
}

/**
 * Helyi falióra-idő → UTC, a nyári időszámítással együtt (pl. Europe/Budapest).
 * `hour` tizedes óra (14.5 = 14:30).
 */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, timeZone: string) {
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0) + Math.round(hour * 3600000)
  let utc = naive - zoneOffsetMs(naive, timeZone)
  // Második kör: az átállás napján az eltolás a valódi időpontban számít.
  utc = naive - zoneOffsetMs(utc, timeZone)
  return utc
}

/** Az időzóna eltolása UTC-hez képest egy adott pillanatban (ms). */
export function zoneOffsetMs(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

export interface SunDay {
  /** Napkelte és napnyugta helyi idő szerint, tizedes órában (null: nincs aznap). */
  sunrise: number | null
  sunset: number | null
  /** Delelés (legmagasabb napállás) helyi időben, tizedes óra. */
  noon: number
  maxElevation: number
}

/** Napkelte, napnyugta és delelés egy napra (a napkorong felső széle, fénytöréssel: −0,833°). */
export function sunDay(year: number, month: number, day: number, lat: number, lon: number, timeZone: string): SunDay {
  // A −0,833° határ már tartalmazza a fénytörést, ezért itt a geometriai magasság számít.
  const at = (hour: number) => sunPosition(zonedTimeToUtc(year, month, day, hour, timeZone), lat, lon).trueElevation
  let noon = 12
  let best = -90
  for (let hour = 0; hour <= 24; hour += 0.25) { const value = at(hour); if (value > best) { best = value; noon = hour } }
  // Finomítás aranymetszéssel a csúcs körül.
  let lo = noon - 0.25
  let hi = noon + 0.25
  for (let i = 0; i < 40; i++) { const a = lo + (hi - lo) * 0.382; const b = lo + (hi - lo) * 0.618; if (at(a) < at(b)) lo = a; else hi = b }
  noon = (lo + hi) / 2
  const limit = -0.833
  const cross = (from: number, to: number) => {
    if ((at(from) - limit) * (at(to) - limit) > 0) return null
    let a = from
    let b = to
    for (let i = 0; i < 40; i++) { const mid = (a + b) / 2; if ((at(a) - limit) * (at(mid) - limit) <= 0) b = mid; else a = mid }
    return (a + b) / 2
  }
  return { sunrise: cross(0, noon), sunset: cross(noon, 24), noon, maxElevation: sunPosition(zonedTimeToUtc(year, month, day, noon, timeZone), lat, lon).elevation }
}

/**
 * A nap iránya a 3D-jelenet koordinátáiban (egységvektor). A jelenetben a pergola
 * nyitott eleje a +z felé néz; `facing` az, hogy ez valójában melyik égtáj (fok, É = 0).
 * A házfal felől kinézve a jobb kéz a −x irány.
 */
export function sunVectorInScene(sun: SunPosition, facing: number): [number, number, number] {
  const relative = (sun.azimuth - facing) * RAD
  const flat = Math.cos(sun.elevation * RAD)
  return [-Math.sin(relative) * flat, Math.sin(sun.elevation * RAD), Math.cos(relative) * flat]
}

export const COMPASS_POINTS = ['É', 'ÉK', 'K', 'DK', 'D', 'DNy', 'Ny', 'ÉNy'] as const
export function compassLabel(azimuth: number) {
  return COMPASS_POINTS[Math.round(mod(azimuth, 360) / 45) % 8]
}

export function formatClock(hour: number) {
  const total = Math.round(mod(hour, 24) * 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function mod(value: number, by: number) { return ((value % by) + by) % by }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)) }
