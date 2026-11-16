// A 3D jelenet csak a nyitó animáció vége után épül fel (lásd src/lib/introSplash.ts): amíg az animáció fut, a jelenet
// helyén üres keret áll, így az animáció nem szaggat. Nyitó animáció nélkül (böngészőfül, asztali gép) azonnal kész.
import { useSyncExternalStore } from 'react'
import { INTRO_DONE_EVENT, INTRO_FLAG } from './introSplash'

export const introPlaying = () => typeof document !== 'undefined' && document.documentElement.dataset[INTRO_FLAG] === 'playing'

const subscribe = (listener: () => void) => {
  window.addEventListener(INTRO_DONE_EVENT, listener)
  return () => window.removeEventListener(INTRO_DONE_EVENT, listener)
}

/** true, ha a 3D jelenet felépülhet (nincs, vagy már véget ért a nyitó animáció). */
export function useIntroDone() {
  return useSyncExternalStore(subscribe, () => !introPlaying(), () => true)
}
