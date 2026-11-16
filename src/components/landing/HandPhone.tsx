// Kódból rajzolt, vonalas kéz (jobb kéz, alulról) egy telefonnal, a képernyőn a VALÓDI konfigurátor képe
// (public/assets/landing/phone-screen.webp, a mobil konfigurátorból rögzítve). A tinta-szűrő (#lx-ink) teszi
// tollrajzzá.
import { PHONE_TILT } from './handGeometry'
import { assetUrl } from '@/lib/assetUrl'

const INK = '#212121'
const PAPER = '#F6F5FA'
const S = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

/** Elkeskenyedő ujjbegy: a tő (0,0)-ban, balra mutat, L hosszú, W széles. */
function finger(L: number, W: number, curl = 2) {
  const w = W / 2
  const t = W * 0.42
  return `M0 ${-w} C ${-L * 0.55} ${-w - curl}, ${-L + t} ${-t - curl * 0.6}, ${-L} ${-curl * 0.3} C ${-L + t * 0.2} ${t - curl * 0.2}, ${-L * 0.55} ${w + curl * 0.2}, 0 ${w}`
}
/** A telefon jobb szélének x-e adott magasságban (a dőlés miatt). */
const rightEdge = (y: number) => 412 - (y - 120) * 0.195
const FINGERS: readonly [number, number, number][] = [[230, 62, 30], [282, 66, 32], [334, 62, 31], [384, 52, 28]]

export default function HandPhone({ label }: { label: string }) {
  return <svg className="lx-hand" viewBox="0 0 620 760" role="img" aria-label={label}>
    <defs>
      <clipPath id="lx-screen"><rect x="-96" y="-206" width="192" height="412" rx="24" /></clipPath>
      <pattern id="lx-knit" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="8" height="8" fill={INK} /><path d="M0 4h8" stroke="#3b3b3d" strokeWidth="1.4" /></pattern>
    </defs>
    <g className="lx-hand-ink">
      {/* a kézfej hátul, a telefon mögött (az ujjak tövével) */}
      <path d="M300 470 C 330 420, 400 400, 430 330 C 440 300, 440 250, 452 222 C 470 196, 512 204, 520 236 C 528 266, 526 300, 532 330 C 538 362, 532 404, 530 440 C 546 500, 560 548, 578 610 L 640 760 L 462 760 C 446 704, 420 660, 380 630 C 330 594, 290 540, 300 470 Z" fill={PAPER} {...S} />
    </g>
    {/* telefon a valódi konfigurátorral (a kép nincs a tinta-szűrő alatt, hogy éles maradjon) */}
    <g className="lx-phone" transform={`translate(300 290) rotate(${PHONE_TILT})`}>
      <rect x="-112" y="-224" width="224" height="448" rx="38" fill={INK} />
      <rect x="-105" y="-217" width="210" height="434" rx="32" fill="#2b2b2d" />
      <image href={assetUrl('/assets/landing/phone-screen.webp')} x="-96" y="-206" width="192" height="412" preserveAspectRatio="xMidYMid slice" clipPath="url(#lx-screen)" />
      <rect x="-26" y="-199" width="52" height="13" rx="6.5" fill={INK} />
      <path d="M112 -130 v30 M112 -82 v50 M-112 -120 v40" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </g>
    <g className="lx-hand-ink">
      {FINGERS.map(([y, L, W]) => <g key={y} transform={`translate(${rightEdge(y) + L - 14} ${y}) rotate(-14)`}>
        <path d={finger(L, W)} fill={PAPER} {...S} />
        <path d={`M${-L + 9} ${-W * 0.16} c 3 -5, 9 -6, 13 -2`} fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      </g>)}
      {/* hüvelykujj elöl, balról */}
      <path d="M232 520 C 226 488, 246 450, 286 424 C 306 410, 330 404, 344 414 C 356 424, 350 442, 334 452 C 306 470, 290 500, 290 532 Z" fill={PAPER} {...S} />
      <path d="M318 418 c 10 -2, 20 4, 22 12" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      {/* tenyér alja elöl */}
      <path d="M226 506 C 214 540, 236 590, 300 604 C 360 616, 420 600, 452 566 C 470 546, 472 520, 460 500 C 420 528, 340 540, 290 532 C 262 528, 240 520, 226 506 Z" fill={PAPER} {...S} />
      <path d="M300 570 c 40 10, 90 6, 126 -12" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      {/* kötött mandzsetta */}
      <path d="M470 600 C 520 566, 596 556, 640 578 L 640 760 L 520 760 C 510 700, 494 648, 470 600 Z" fill="url(#lx-knit)" {...S} />
      <path d="M470 600 C 520 566, 596 556, 640 578" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
    </g>
  </svg>
}
