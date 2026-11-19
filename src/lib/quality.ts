// Központi 3D-minőségkezelő: egyetlen igazságforrás a felbontásnak, az árnyéknak, az utófeldolgozásnak,
// a növényzetnek és a textúraélességnek. A jelenet komponensei csak ezt olvassák (QualityContext).
import { createContext, useContext } from 'react'
import type { QualityLevel } from '@/types/pergola'

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra'

export interface QualitySettings {
  tier: QualityTier
  shadowMapSize: number
  /** Renderfelbontás-szorzó tartomány (R3F dpr). */
  dpr: [number, number]
  enablePostprocessing: boolean
  /** Az SSAO/AO-lépés erősebb (ultra) változata. */
  ultraEffects: boolean
  enableContactShadows: boolean
  contactShadowResolution: number
  textureResolution: '1k' | '2k'
  /** A lamellaprofil és a hengeres alkatrészek szegmensszáma. */
  louvreSegments: number
  environmentIntensity: number
  maxAnisotropy: number
  enableGrassDetail: boolean
  enableExtraPlants: boolean
  rainDrops: number
  /** PBR-részletesség: basic = sima Standard, enhanced = lakkréteg + finom szemcse-normáltérkép, ultra = + üveg-transzmisszió. */
  materialDetail: 'basic' | 'enhanced' | 'ultra'
  /** Direkt fény árnyékpuhaság (PCF kernel sugár). */
  shadowRadius: number
  /** Finom vignetta + enyhe színkorrekció az utófeldolgozásban. */
  vignette: boolean
  /** A bloom erősségének szorzója (LED-ek, tükröződések). */
  bloomScale: number
}

export const QUALITY_PROFILES: Record<QualityTier, QualitySettings> = {
  low: { tier: 'low', shadowMapSize: 1024, dpr: [1, 1.25], enablePostprocessing: false, ultraEffects: false, enableContactShadows: true, contactShadowResolution: 256, textureResolution: '1k', louvreSegments: 6, environmentIntensity: 0.9, maxAnisotropy: 2, enableGrassDetail: false, enableExtraPlants: false, rainDrops: 160, materialDetail: 'basic', shadowRadius: 1, vignette: false, bloomScale: 0 },
  medium: { tier: 'medium', shadowMapSize: 1024, dpr: [1, 1.75], enablePostprocessing: false, ultraEffects: false, enableContactShadows: true, contactShadowResolution: 256, textureResolution: '1k', louvreSegments: 8, environmentIntensity: 1, maxAnisotropy: 4, enableGrassDetail: false, enableExtraPlants: true, rainDrops: 260, materialDetail: 'basic', shadowRadius: 1.5, vignette: false, bloomScale: 0 },
  high: { tier: 'high', shadowMapSize: 2048, dpr: [1, 2], enablePostprocessing: true, ultraEffects: false, enableContactShadows: true, contactShadowResolution: 512, textureResolution: '2k', louvreSegments: 12, environmentIntensity: 1, maxAnisotropy: 8, enableGrassDetail: true, enableExtraPlants: true, rainDrops: 320, materialDetail: 'enhanced', shadowRadius: 3, vignette: true, bloomScale: 1 },
  ultra: { tier: 'ultra', shadowMapSize: 4096, dpr: [1, 2], enablePostprocessing: true, ultraEffects: true, enableContactShadows: true, contactShadowResolution: 512, textureResolution: '2k', louvreSegments: 16, environmentIntensity: 1.1, maxAnisotropy: 16, enableGrassDetail: true, enableExtraPlants: true, rainDrops: 650, materialDetail: 'ultra', shadowRadius: 4.5, vignette: true, bloomScale: 1.25 },
}

const ORDER: QualityTier[] = ['low', 'medium', 'high', 'ultra']
const SOFTWARE_GPU = /swiftshader|llvmpipe|software|basic render/i
/** Integrált / mobil GPU: az utófeldolgozás (AO + bloom) itt akadozást okoz, ezért közepes szint (natív MSAA, éles él). */
const WEAK_GPU = /Intel.*(UHD|Iris|HD Graphics|Graphics)|Radeon(\(TM\))? (Graphics|Vega|[0-9]{3}M)|Vega \d|Adreno|Mali|PowerVR|Microsoft Basic/i
const STRONG_GPU = /RTX|GTX 1[0-9]|RX [5-9]\d{2}|Radeon (Pro|VII)|Apple M[1-9]|Arc A[5-9]/i
/**
 * Belépő és középkategóriás mobil GPU (Mali-4xx/T/G5x/G6x, PowerVR, Adreno 6xx és régebbi). Ezeken a tableteken
 * (pl. Redmi Pad 2: Mali-G57 MC2) már a közepes szint is akad nagy felbontású kijelzőn, ezért automatikusan alacsony.
 */
/** Csúcskategóriás mobil GPU (Adreno 750+ / 8xx – pl. Snapdragon 8 Elite Gen 5: Adreno 840 –, Immortalis-G9xx, Xclipse 9xx). */
const FLAGSHIP_MOBILE_GPU = /Adreno(\s*\(TM\))?\s*(8\d{2}|7[5-9]\d)\b|Immortalis-G9\d{2}|Xclipse\s*9\d{2}/i
const ENTRY_MOBILE_GPU = /Mali-(4|T|G[56]\d\b)|PowerVR|Adreno(\s*\(TM\))?\s*[1-6]\d{2}\b/i

/**
 * Érintőképernyős tablet vagy telefon. Az Android-tabletek Chrome-ja alapból asztali oldalt kér (a felhasználói
 * ügynökben nincs „Android”), ezért a durva mutatót és az érintési pontokat is nézzük; az iPad „Macintosh”-nak mutatja magát.
 */
export function isTouchDevice(nav: { maxTouchPoints?: number; userAgent?: string } = navigator, coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) {
  if (/Android|iPhone|iPad/i.test(nav.userAgent ?? '')) return true
  return coarse && (nav.maxTouchPoints ?? 0) > 1
}

/** Tiszta besorolás (tesztelhető): bemenet a GPU neve és a gép jellemzői. */
export function classifyDevice(input: { gpu: string; cores: number; memory: number; touch: boolean; phone: boolean; android: boolean }): QualityTier {
  const { gpu, cores, memory, touch, phone, android } = input
  if (SOFTWARE_GPU.test(gpu)) return 'low'
  if (touch && ENTRY_MOBILE_GPU.test(gpu)) return 'low'
  // Csúcskategóriás mobil GPU tableten: magas szint automatikusan (az ultra kézzel választható, figyelmeztetés nélkül).
  if (touch && !phone && FLAGSHIP_MOBILE_GPU.test(gpu)) return memory >= 6 && cores >= 8 ? 'high' : 'medium'
  // Telefon és Android-eszköz: a régi szabály (kevés mag vagy memória → low, különben medium).
  if (phone || android || (touch && /Mali|Adreno|Xclipse|Immortalis/i.test(gpu))) return memory <= 3 || cores <= 4 ? 'low' : 'medium'
  // iPad és más érintős eszköz ismert, erősebb GPU-val: az asztali besorolás marad (a futásidejű védőháló lejjebb lép, ha kell).
  // Ultra csak különálló (asztali) videókártyán; az Apple-chip és az integrált GPU legfeljebb magas szintet kap automatikusan.
  if (cores >= 8 && memory >= 8 && STRONG_GPU.test(gpu) && !/Apple/i.test(gpu)) return 'ultra'
  if (WEAK_GPU.test(gpu) && !STRONG_GPU.test(gpu)) return 'medium'
  // Ismeretlen GPU-név (elrejtett böngészői adat): csak erős processzor mellett merjük a nehéz szintet.
  if (!gpu && cores < 8) return 'medium'
  return cores <= 2 ? 'medium' : 'high'
}

type NavigatorHints = Navigator & { deviceMemory?: number }

/** A GPU nevének kiolvasása egy eldobható vászonról (egyszer, gyorsítótárazva). */
let gpuName: string | undefined
function readGpuName() {
  if (gpuName !== undefined) return gpuName
  gpuName = ''
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    if (gl && info) gpuName = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? '')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { /* nem elérhető: marad az üres név */ }
  return gpuName
}

export const isTier = (value: string | null | undefined): value is QualityTier => !!value && (ORDER as string[]).includes(value)

/** Automatikus besorolás: gyenge mobil GPU → low, telefon/tablet → low/medium, laptop → high, erős asztali gép → ultra. */
export function detectQualityTier(): QualityTier {
  if (typeof window === 'undefined') return 'high'
  const override = new URLSearchParams(window.location.search).get('quality')
  if (isTier(override)) return override
  const nav = navigator as NavigatorHints
  const gpu = readGpuName()
  const touch = isTouchDevice(nav)
  const agent = navigator.userAgent
  // Az asztali módú Android-tablet „Linux x86_64”-et mutat, de az érintés és a „Linux” együtt is Android.
  const android = /Android/i.test(agent) || (touch && /Linux/i.test(agent) && !/CrOS/i.test(agent))
  const phone = /iPhone|Android.*Mobile/i.test(agent) || (touch && window.innerWidth < 760)
  return classifyDevice({ gpu, cores: nav.hardwareConcurrency ?? 4, memory: nav.deviceMemory ?? 8, touch, phone, android })
}

/** A felhasználó választása → tényleges szint. A régi „mobile” érték a low szintnek felel meg. */
export function resolveQualityTier(level: QualityLevel, detected: QualityTier): QualityTier {
  if (level === 'auto') return detected
  if (level === 'mobile') return 'low'
  return level
}

/** Eggyel gyengébb szint (futásidejű védőháló); a low-nál nincs lejjebb. */
export const lowerTier = (tier: QualityTier): QualityTier => ORDER[Math.max(0, ORDER.indexOf(tier) - 1)]

export const qualitySettings = (tier: QualityTier): QualitySettings => QUALITY_PROFILES[tier]

export const QualityContext = createContext<QualitySettings>(QUALITY_PROFILES.high)
export const useQuality = () => useContext(QualityContext)

export const tierRank = (tier: QualityTier) => ORDER.indexOf(tier)

const TIER_CAP_KEY = 'pergola-tier-cap'
/** A lejegyzett korlát ennyi ideig él: egy egyszeri akadás (háttérfül, más program, frissítés) ne rontsa a minőséget örökre. */
export const TIER_CAP_TTL_MS = 6 * 60 * 60 * 1000
/**
 * A futásidejű védőháló által megjegyzett, az eszközön még simán futó legmagasabb szint.
 * Lejárt vagy URL-ben kért (?quality=) szint esetén nincs korlát.
 */
export function readTierCap(now = Date.now()): QualityTier | null {
  try {
    if (isTier(new URLSearchParams(window.location.search).get('quality'))) return null
    const raw = window.localStorage.getItem(TIER_CAP_KEY)
    if (!raw) return null
    const [value, stamp] = raw.split('@')
    if (!isTier(value)) return null
    const at = Number(stamp)
    if (!Number.isFinite(at) || now - at > TIER_CAP_TTL_MS) { window.localStorage.removeItem(TIER_CAP_KEY); return null }
    return value
  } catch { return null }
}
export function writeTierCap(tier: QualityTier, now = Date.now()) {
  try { window.localStorage.setItem(TIER_CAP_KEY, `${tier}@${now}`) } catch { /* privát mód: csak erre a munkamenetre érvényes */ }
}

/**
 * Képpont-keret: a vászon legfeljebb ennyi tényleges képpontot rajzol. Nagy felbontású tableten (2560 × 1600) a teljes
 * képernyős álló vászon különben többszörösen túllépné a mobil GPU-k teljesítményét. Magas és ultra szinten is van keret
 * (teljesítmény-audit, 2026-11-19): 1-es skálázású monitoron a szint nem rajzol több képpontot, mint ami látszik
 * (korábban ultra 1,5×, magas 1,25× kényszerített túlmintavételezés), nagy monitoron és retina kijelzőn pedig
 * legfeljebb 3,5, illetve 5 millió képpont (4K helyett) – az élsimítást az MSAA adja.
 */
export const PIXEL_BUDGET: Partial<Record<QualityTier, number>> = { low: 1_200_000, medium: 2_000_000, high: 3_500_000, ultra: 5_000_000 }

/** A szint dpr-tartománya a vászon CSS-méretéhez igazítva (R3F `dpr` prop). */
export function budgetDpr(settings: Pick<QualitySettings, 'tier' | 'dpr'>, cssWidth: number, cssHeight: number): [number, number] {
  const [min, max] = settings.dpr
  const budget = PIXEL_BUDGET[settings.tier]
  const area = cssWidth * cssHeight
  if (!budget || area <= 0) return [min, max]
  const cap = Math.max(0.75, Math.min(max, Math.sqrt(budget / area)))
  return [Math.min(min, cap), cap]
}

export const TIER_LABEL: Record<QualityTier, string> = { low: 'Alacsony', medium: 'Közepes', high: 'Magas', ultra: 'Ultra' }

/** Kézzel választott szint az eszköznek ajánlott fölött: a felület figyelmeztet, de nem írja felül a választást. */
export function qualityAboveDevice(level: QualityLevel, detected: QualityTier) {
  if (!isTier(level)) return false
  const gap = tierRank(level) - tierRank(detected)
  // Egy szinttel feljebb csak gyenge eszközön (alacsony besorolás) figyelmeztetünk; MacBook vagy csúcstablet „magas” → ultra rendben.
  return gap >= 2 || (gap === 1 && detected === 'low')
}

/**
 * Finom felbontás-szabályozás kézzel választott szinten és bemutató módban (ahol a szintet nem írjuk felül):
 * tartósan lassú képkockáknál a felbontás-szorzó felső határa lépésenként csökken, gyors képkockáknál visszanő.
 * A szint (árnyék, utófeldolgozás, anyagok) változatlan marad, csak a képpontszám igazodik a géphez.
 */
export const DPR_GOVERNOR = { slow: 0.034, fast: 0.018, down: 0.15, up: 0.1, floor: 0.85 } as const

/** A következő dpr-felső határ az ablak átlagos képkocka-ideje (s) alapján; null = nincs korlát (a szint saját értéke). */
export function nextDprCap(cap: number | null, average: number, base: number): number | null {
  const current = cap ?? base
  if (average > DPR_GOVERNOR.slow) return Math.max(DPR_GOVERNOR.floor, Math.round((current - DPR_GOVERNOR.down) * 100) / 100)
  if (average < DPR_GOVERNOR.fast && cap !== null) {
    const raised = Math.round((current + DPR_GOVERNOR.up) * 100) / 100
    return raised >= base ? null : raised
  }
  return cap
}

/** A dpr-tartomány a szabályozó korlátjával (a korlát a tartomány alsó értékét is lejjebb viheti). */
export function applyDprCap(range: [number, number], cap: number | null): [number, number] {
  if (cap === null || cap >= range[1]) return range
  return [Math.min(range[0], cap), cap]
}
