// A 3D jelenet órája. Élőben a valós idő; `?freeze=<másodperc>` URL-paraméterrel a jelenet egy adott
// pillanatra kimerevedik: az időalapú mozgások (Működés-bemutató, szél, részecskék) ebből a fix időből
// számolnak, az átmenetek (ajtó, kamera, csillapított állítások) azonnal a célállásba ugranak.
// Így ugyanaz az URL mindig ugyanazt a képkockát adja: vizuális regressziós képekhez és pontos kimerevítéshez.

/** A `freeze` paraméter értéke másodpercben, vagy null, ha nincs (vagy hibás). */
export function readFrozenSeconds(search: string): number | null {
  const raw = new URLSearchParams(search).get('freeze')
  if (raw === null || raw.trim() === '') return null
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) && value >= 0 && value <= 86400 ? value : null
}

const FROZEN = typeof window !== 'undefined' && typeof window.location?.search === 'string' ? readFrozenSeconds(window.location.search) : null

/** Ki van-e merevítve a jelenet. */
export const SCENE_FROZEN = FROZEN !== null

/** A kimerevített idő (s), vagy null. */
export const frozenSeconds = () => FROZEN

/** Az időalapú mozgások ideje: kimerevítve a fix pillanat, egyébként a megadott élő idő. */
export const sceneTime = (live: number) => FROZEN ?? live

/** Pillanatszerű-e minden átmenet (csökkentett mozgás vagy kimerevített jelenet). */
export const stillMotion = (reducedMotion: boolean) => reducedMotion || SCENE_FROZEN
