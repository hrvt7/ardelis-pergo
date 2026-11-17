import { startTransition, useEffect, useState } from 'react'

/**
 * Fokozatos felépítés hosszú oldalakhoz: az első festésnél csak a hajtás feletti rész épül fel, a többi szakasz
 * csoportonként, üresjáratban, megszakítható (startTransition) rendereléssel kerül a DOM-ba. Így a böngésző
 * nem fagy le egyetlen hosszú feladatra induláskor (gyengébb telefonon ez a „lassú indulás”).
 */
export const LANDING_STAGES = 4

/** Ha a cím horgonnyal érkezik (#arak, #demo …), azonnal minden szakasz kell, különben nincs hova görgetni. */
export function initialStage(hash: string, max: number): number {
  return hash && hash !== '#' && hash !== '#top' ? max : 0
}

/** Következő lépés ütemezése: üresjáratban, legkésőbb `timeout` ms múlva. */
export function scheduleIdle(run: () => void, timeout = 180): () => void {
  const w = typeof window === 'undefined' ? undefined : window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
  if (w?.requestIdleCallback) {
    const id = w.requestIdleCallback(run, { timeout })
    return () => w.cancelIdleCallback?.(id)
  }
  const id = setTimeout(run, 32)
  return () => clearTimeout(id)
}

export function useProgressiveStage(max: number): [number, () => void] {
  const [stage, setStage] = useState(() => (typeof window === 'undefined' ? 0 : initialStage(window.location.hash, max)))
  useEffect(() => {
    if (stage >= max) return
    // Az első lépés csak az első festés után indul (két rAF), hogy a héró azonnal megjelenjen.
    let cancel = () => {}
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      cancel = scheduleIdle(() => startTransition(() => setStage((current) => Math.min(max, current + 1))))
    }))
    return () => { cancelAnimationFrame(raf); cancel() }
  }, [stage, max])
  return [stage, () => setStage(max)]
}
