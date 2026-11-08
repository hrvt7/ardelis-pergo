// Termékfüggetlen stúdió-állapotok a pergola stúdió viselkedésével: összecsukott árpanel (megjegyezve, ugyanazzal
// a kulccsal, mint a pergolánál) és bemutató mód (Esc-re kilép).
import { useCallback, useEffect, useState } from 'react'

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
