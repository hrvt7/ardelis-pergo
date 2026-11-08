// Termékfüggetlen stúdió-állapotok a pergola stúdió viselkedésével: összecsukott árpanel (megjegyezve, ugyanazzal
// a kulccsal, mint a pergolánál) és bemutató mód (Esc-re kilép).
import { useCallback, useEffect, useRef, useState } from 'react'

const PRICE_KEY = 'pergo-price-collapsed'

export function usePriceCollapse(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(PRICE_KEY) === '1' } catch { return false } })
  const toggle = useCallback(() => setCollapsed((current) => { try { localStorage.setItem(PRICE_KEY, current ? '0' : '1') } catch { /* privát mód */ } return !current }), [])
  return [collapsed, toggle]
}

export function usePresentation(): [boolean, (value: boolean) => void] {
  const [presentation, setPresentation] = useState(false)
  useEffect(() => {
    if (!presentation) return
    const exit = (event: KeyboardEvent) => { if (event.key === 'Escape') setPresentation(false) }
    window.addEventListener('keydown', exit)
    return () => window.removeEventListener('keydown', exit)
  }, [presentation])
  return [presentation, setPresentation]
}

export type PriceChange = { id: number; amount: number; label: string }

/** Ármódosító buborék (mint a pergolánál): minden változás után 6 mp-ig látszik, visszavonással. */
export function useChangePill(): [PriceChange | null, (amount: number, label: string) => void, () => void] {
  const [change, setChange] = useState<PriceChange | null>(null)
  const seq = useRef(0)
  useEffect(() => {
    if (!change) return
    const timer = window.setTimeout(() => setChange(null), 6000)
    return () => window.clearTimeout(timer)
  }, [change])
  const announce = useCallback((amount: number, label: string) => { seq.current += 1; setChange({ id: seq.current, amount, label }) }, [])
  const clear = useCallback(() => setChange(null), [])
  return [change, announce, clear]
}

/**
 * A jelenet pillanatképe az összegzéshez (mint a pergolánál): amíg `active`, kis késleltetéssel lemásolja a 3D vásznat.
 * A vászon `preserveDrawingBuffer`-rel fut, így olvasható.
 */
export function useSceneThumbnail(active: boolean, deps: unknown): string {
  const [image, setImage] = useState('')
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => {
      try {
        const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-catalog-canvas="true"]')
        if (!canvas?.width) return
        const scale = Math.min(1, 900 / canvas.width)
        const copy = document.createElement('canvas')
        copy.width = Math.round(canvas.width * scale); copy.height = Math.round(canvas.height * scale)
        const context = copy.getContext('2d')
        if (!context) return
        context.fillStyle = '#0d1210'; context.fillRect(0, 0, copy.width, copy.height)
        context.drawImage(canvas, 0, 0, copy.width, copy.height)
        setImage(copy.toDataURL('image/jpeg', 0.8))
      } catch { /* GPU-visszaolvasás nem elérhető */ }
    }, 900)
    return () => window.clearTimeout(timer)
  }, [active, deps])
  return image
}
