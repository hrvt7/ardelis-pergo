// A jelenet napvektora (irány a pergolától a nap felé): árnyékelemzésben a valós napállás,
// egyébként a napszak-csúszka íve a napiránnyal elforgatva. Külön fájl, mert a sunSite böngészős
// (import.meta.env) függőséget hoz; a tiszta számítások (smartLouver, lightBalance) tesztből is futnak.
import { sunPosition } from './lightBalance'
import { sunVectorInScene } from './sun'
import { studySun } from './sunSite'
import type { SceneSettings } from '../types/pergola'

export function sceneSunVector(scene: Pick<SceneSettings, 'sunStudy' | 'dayTime' | 'sunDirection' | 'sunDate' | 'sunHour' | 'site' | 'facing'>): [number, number, number] {
  if (scene.sunStudy) return sunVectorInScene(studySun(scene), scene.facing)
  return sunPosition(scene.dayTime, scene.sunDirection ?? 0)
}
