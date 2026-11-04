// A Lamelix logó React-komponensként (inline SVG: éles minden méreten, nincs külön letöltés).
import { HORIZONTAL_WIDTH, LAMELIX, SYMBOL_L, SYMBOL_SLATS, WORDMARK_DOT, WORDMARK_GLYPHS, type LamelixTone } from '@/lib/lamelixBrand'

const TONES: Record<LamelixTone, { l: string; slats: string; word: string; dot: string }> = {
  onDark: { l: LAMELIX.colors.bone, slats: LAMELIX.colors.lime, word: LAMELIX.colors.bone, dot: LAMELIX.colors.lime },
  onLight: { l: LAMELIX.colors.ink, slats: LAMELIX.colors.limeDark, word: LAMELIX.colors.ink, dot: LAMELIX.colors.limeDark },
  mono: { l: 'currentColor', slats: 'currentColor', word: 'currentColor', dot: 'currentColor' },
}

/** Szűk (margó nélküli) nézetdobozok: a jel 40–216 × 28–228, a felirat jobb széle ≈ 838. */
const VIEWBOX = { symbol: '40 28 176 200', horizontal: `40 28 ${HORIZONTAL_WIDTH - 80} 200` } as const

export default function LamelixLogo({ variant = 'horizontal', tone = 'onDark', height = 28, className, title = 'Lamelix' }: { variant?: 'symbol' | 'horizontal'; tone?: LamelixTone; height?: number; className?: string; title?: string | null }) {
  const colors = TONES[tone]
  const [, , w, h] = VIEWBOX[variant].split(' ').map(Number)
  return <svg className={className} viewBox={VIEWBOX[variant]} width={(height * w) / h} height={height} role={title ? 'img' : undefined} aria-label={title ?? undefined} aria-hidden={title ? undefined : true} focusable="false">
    <path d={SYMBOL_L} fill={colors.l} />
    {SYMBOL_SLATS.map((slat) => <rect key={slat.y} x={98} y={slat.y} width={118} height={24} rx={12} fill={colors.slats} transform={`rotate(${slat.angle} 98 ${slat.cy})`} />)}
    {variant === 'horizontal' && <g transform="translate(296 228) scale(1.08)">
      <g fill={colors.word}>{WORDMARK_GLYPHS.map((d, index) => <path key={index} d={d} />)}</g>
      <rect x={WORDMARK_DOT.x} y={WORDMARK_DOT.y} width={WORDMARK_DOT.width} height={WORDMARK_DOT.height} rx={WORDMARK_DOT.rx} fill={colors.dot} />
    </g>}
  </svg>
}
