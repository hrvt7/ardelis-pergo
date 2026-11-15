// „Bemutató eszköz” mód: az üzletkötő tabletje. Bekapcsolva a 3D minőség fixen ultra (a futásidejű védőháló nem lép
// vissza), a Nézet panelen elérhető az offline letöltés. Bekapcsolás: ?bemutato=1 (kikapcsolás: ?bemutato=0) vagy a
// Nézet panel kapcsolója; a választás az eszközön megmarad (localStorage, privát módban csak a munkamenetre).
import { useSyncExternalStore } from 'react'
import type { QualityLevel } from '@/types/pergola'

export const DEMO_DEVICE_KEY = 'lamelix-bemutato-eszkoz'

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

/** A ?bemutato= paraméter: true/false, ha kifejezetten kérik, különben null. */
export function demoParam(search: string): boolean | null {
  const value = new URLSearchParams(search).get('bemutato')
  if (value === null) return null
  return !/^(0|false|ki|off|nem)$/i.test(value)
}

/** Az aktuális állapot: az URL-paraméter elsőbbséget kap és el is mentődik; különben a megjegyzett választás. */
export function readDemoDevice(search: string, storage: StorageLike | null): boolean {
  const param = demoParam(search)
  if (param !== null) { writeDemoDevice(param, storage); return param }
  try { return storage?.getItem(DEMO_DEVICE_KEY) === '1' } catch { return false }
}

export function writeDemoDevice(on: boolean, storage: StorageLike | null) {
  try { if (on) storage?.setItem(DEMO_DEVICE_KEY, '1'); else storage?.removeItem(DEMO_DEVICE_KEY) } catch { /* privát mód: csak erre a munkamenetre */ }
}

/** A jelenetben ténylegesen használt minőségi szint: bemutató módban mindig ultra (a kézi választó ilyenkor rögzített). */
export const effectiveQualityLevel = (level: QualityLevel, demo: boolean): QualityLevel => (demo ? 'ultra' : level)

/** A futásidejű védőháló (FrameGovernor) csak automatikus szintnél és nem bemutató módban léphet vissza. */
export const governorEnabled = (level: QualityLevel, demo: boolean, loaded: boolean) => loaded && effectiveQualityLevel(level, demo) === 'auto'

// Egyszerű, az egész alkalmazásban közös állapot (a Nézet panel kapcsolója és a 3D jelenet ugyanezt látja).
const safeStorage = (): StorageLike | null => { try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null } }
let current: boolean | null = null
const listeners = new Set<() => void>()
const snapshot = () => {
  if (current === null) current = typeof window === 'undefined' ? false : readDemoDevice(window.location.search, safeStorage())
  return current
}

export function setDemoDevice(on: boolean) {
  current = on
  writeDemoDevice(on, safeStorage())
  listeners.forEach((listener) => listener())
}

/** Csak tesztekhez: a modulszintű állapot visszaállítása. */
export function resetDemoDeviceForTests() { current = null }

export function useDemoDevice(): boolean {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener) } }, snapshot, () => false)
}
