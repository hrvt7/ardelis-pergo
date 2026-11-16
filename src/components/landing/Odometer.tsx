// Árpörgetés: a szám számjegyenként, tekercsként gördül az új értékre (a konfigurátor ár-dokkjának mintájára).
import type { CSSProperties } from 'react'

const DIGITS = '0123456789'

/** Egy formázott szám (pl. „5 648 000 Ft”) gördülő számjegyekkel; a nem számjegy karakterek állók. */
export default function Odometer({ text, label }: { text: string; label?: string }) {
  return <span className="lx-odo" role="text" aria-label={label ? `${label}: ${text}` : text}>
    {[...text].map((char, index) => DIGITS.includes(char)
      ? <span className="lx-odo-digit" key={index} aria-hidden="true" style={{ '--d': Number(char) } as CSSProperties}><span>{[...DIGITS].map((digit) => <i key={digit}>{digit}</i>)}</span></span>
      : <span className="lx-odo-char" key={index} aria-hidden="true">{char === ' ' || char === ' ' ? ' ' : char}</span>)}
  </span>
}
