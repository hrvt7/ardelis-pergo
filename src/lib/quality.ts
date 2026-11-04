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
}

export const QUALITY_PROFILES: Record<QualityTier, QualitySettings> = {
  low: { tier: 'low', shadowMapSize: 1024, dpr: [1, 1.1], enablePostprocessing: false, ultraEffects: false, enableContactShadows: true, contactShadowResolution: 256, textureResolution: '1k', louvreSegments: 6, environmentIntensity: 0.9, maxAnisotropy: 2, enableGrassDetail: false, enableExtraPlants: false, rainDrops: 160 },
  medium: { tier: 'medium', shadowMapSize: 1024, dpr: [1, 1.35], enablePostprocessing: false, ultraEffects: false, enableContactShadows: true, contactShadowResolution: 256, textureResolution: '1k', louvreSegments: 8, environmentIntensity: 1, maxAnisotropy: 4, enableGrassDetail: false, enableExtraPlants: true, rainDrops: 260 },
  high: { tier: 'high', shadowMapSize: 2048, dpr: [1.25, 1.5], enablePostprocessing: true, ultraEffects: false, enableContactShadows: true, contactShadowResolution: 512, textureResolution: '2k', louvreSegments: 12, environmentIntensity: 1, maxAnisotropy: 8, enableGrassDetail: true, enableExtraPlants: true, rainDrops: 320 },
  ultra: { tier: 'ultra', shadowMapSize: 2048, dpr: [1.5, 1.8], enablePostprocessing: true, ultraEffects: true, enableContactShadows: true, contactShadowResolution: 512, textureResolution: '2k', louvreSegments: 16, environmentIntensity: 1, maxAnisotropy: 16, enableGrassDetail: true, enableExtraPlants: true, rainDrops: 650 },
}

const ORDER: QualityTier[] = ['low', 'medium', 'high', 'ultra']
const SOFTWARE_GPU = /swiftshader|llvmpipe|software|basic render/i
/** Integrált / mobil GPU: az utófeldolgozás (AO + bloom) itt akadozást okoz, ezért közepes szint (natív MSAA, éles él). */
const WEAK_GPU = /Intel.*(UHD|Iris|HD Graphics|Graphics)|Radeon(\(TM\))? (Graphics|Vega|[0-9]{3}M)|Vega \d|Adreno|Mali|PowerVR|Microsoft Basic/i
const STRONG_GPU = /RTX|GTX 1[0-9]|RX [5-9]\d{2}|Radeon (Pro|VII)|Apple M[1-9]|Arc A[5-9]/i

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

/** Automatikus besorolás: mobil + gyenge hardver → low/medium, laptop → high, erős asztali gép → ultra. */
export function detectQualityTier(): QualityTier {
  if (typeof window === 'undefined') return 'high'
  const override = new URLSearchParams(window.location.search).get('quality')
  if (isTier(override)) return override
  const nav = navigator as NavigatorHints
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 8
  const mobile = window.innerWidth < 760 || /Android|iPhone|iPad/i.test(navigator.userAgent)
  if (mobile) return memory <= 3 || cores <= 4 ? 'low' : 'medium'
  const gpu = readGpuName()
  if (SOFTWARE_GPU.test(gpu)) return 'low'
  // Ultra csak különálló (asztali) videókártyán; az Apple-chip és az integrált GPU legfeljebb magas szintet kap automatikusan.
  if (cores >= 8 && memory >= 8 && STRONG_GPU.test(gpu) && !/Apple/i.test(gpu)) return 'ultra'
  if (WEAK_GPU.test(gpu) && !STRONG_GPU.test(gpu)) return 'medium'
  // Ismeretlen GPU-név (elrejtett böngészői adat): csak erős processzor mellett merjük a nehéz szintet.
  if (!gpu && cores < 8) return 'medium'
  return cores <= 2 ? 'medium' : 'high'
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
/** A futásidejű védőháló által megjegyzett, az eszközön még simán futó legmagasabb szint. */
export function readTierCap(): QualityTier | null {
  try { const value = window.localStorage.getItem(TIER_CAP_KEY); return isTier(value) ? value : null } catch { return null }
}
export function writeTierCap(tier: QualityTier) {
  try { window.localStorage.setItem(TIER_CAP_KEY, tier) } catch { /* privát mód: csak erre a munkamenetre érvényes */ }
}
