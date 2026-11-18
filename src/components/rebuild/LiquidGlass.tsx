import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { displacementMap, supportsLiquidRefraction } from '@/lib/liquidGlass'

interface Props {
  className?: string
  /** lekerekítés px-ben (a térképhez is) */
  radius: number
  /** a fénytörő perem szélessége px-ben */
  bezel?: number
  /** a törés erőssége (px) */
  strength?: number
  /** a háttér elmosása (px) a törés után */
  blur?: number
  style?: CSSProperties
  children: ReactNode
  as?: 'div' | 'section' | 'nav' | 'aside'
  [key: `aria-${string}`]: string | undefined
}

/** Folyékony üveg felület: Chromiumban valódi peremtörés, máshol matt üveg (ugyanaz a kinézet, törés nélkül). */
export default function LiquidGlass({ className = '', radius, bezel = 18, strength = 34, blur = 14, style, children, as: Tag = 'div', ...aria }: Props) {
  const ref = useRef<HTMLElement | null>(null)
  const id = `lx-glass-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  const [refract] = useState(supportsLiquidRefraction)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [map, setMap] = useState('')

  useLayoutEffect(() => {
    if (!refract || !ref.current) return
    const element = ref.current
    const update = () => { const box = element.getBoundingClientRect(); setSize((prev) => (prev && Math.abs(prev.w - box.width) < 1 && Math.abs(prev.h - box.height) < 1 ? prev : { w: Math.round(box.width), h: Math.round(box.height) })) }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [refract])

  useEffect(() => {
    if (!refract || !size || size.w < 2 || size.h < 2) return
    const timer = window.setTimeout(() => {
      const canvas = document.createElement('canvas')
      canvas.width = size.w
      canvas.height = size.h
      const context = canvas.getContext('2d')
      if (!context) return
      context.putImageData(new ImageData(displacementMap(size.w, size.h, radius, bezel) as Uint8ClampedArray<ArrayBuffer>, size.w, size.h), 0, 0)
      setMap(canvas.toDataURL())
    }, 60)
    return () => window.clearTimeout(timer)
  }, [refract, size, radius, bezel])

  const active = refract && map && size
  const backdrop = active ? `url(#${id}) blur(${blur}px) saturate(165%) brightness(1.03)` : `blur(${blur + 8}px) saturate(165%) brightness(1.03)`
  return (
    <Tag ref={(node: HTMLElement | null) => { ref.current = node }} className={`lx-glass ${active ? 'is-refracting' : ''} ${className}`} style={{ ...style, borderRadius: radius, backdropFilter: backdrop, WebkitBackdropFilter: backdrop }} {...aria}>
      {active && <svg className="lx-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id={id} x="0" y="0" width={size.w} height={size.h} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage href={map} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={strength} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>}
      {children}
    </Tag>
  )
}
