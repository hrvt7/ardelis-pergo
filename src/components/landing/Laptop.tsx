// Lebegő laptop (Ádám választása, 2026-11-16, a kézben tartott telefon rajza helyett): letisztult, kódból épített
// keret, a kijelzőn a VALÓDI asztali konfigurátor képe (public/assets/landing/laptop-screen.webp: Tető lépés,
// Aero tető, 5 648 000 Ft bruttó irányár). A dőlést a héró írja (kurzorra mozdul), a lebegés CSS-animáció.
import { forwardRef } from 'react'
import { assetUrl } from '@/lib/assetUrl'

const Laptop = forwardRef<HTMLDivElement, { label: string }>(function Laptop({ label }, ref) {
  return <div className="lx-laptop" ref={ref} role="img" aria-label={label}>
    <div className="lx-lid">
      <i className="lx-cam" aria-hidden="true" />
      <img className="lx-screen" src={assetUrl('/assets/landing/laptop-screen-960.webp')} srcSet={`${assetUrl('/assets/landing/laptop-screen-960.webp')} 960w, ${assetUrl('/assets/landing/laptop-screen.webp')} 1440w`} sizes="(max-width: 760px) 94vw, 1100px" width={1440} height={900} alt="" decoding="async" fetchPriority="high" />
      <i className="lx-glare" aria-hidden="true" />
    </div>
    <div className="lx-base" aria-hidden="true"><i className="lx-notch" /></div>
  </div>
})

export default Laptop
