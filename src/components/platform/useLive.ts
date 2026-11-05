import { useEffect, useRef, useState } from 'react'

/** Igaz, amíg az elem látszik: a CSS-animációk csak ilyenkor futnak (is-live osztály). */
export function useLive<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null)
  const [live, setLive] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting), { threshold })
    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, live] as const
}
