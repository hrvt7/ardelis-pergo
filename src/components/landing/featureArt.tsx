// A funkciók vonalas SVG-jelenetei (a funkciókártyák és a záró blokk csempéi is ezeket használják).
import type { CSSProperties, ReactNode } from 'react'

const INK = '#212121'
const S = { stroke: INK, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }

/** Kis pergola elölnézetből (lamellákkal), a jelenetek közös eleme. */
function pergolaFront({ x, y, w = 120, h = 70, fill = '#fff' }: { x: number; y: number; w?: number; h?: number; fill?: string }) {
  const blades = 9
  return <g transform={`translate(${x} ${y})`}>
    <rect x="0" y="0" width={w} height="10" rx="2" {...S} style={{ fill }} />
    {Array.from({ length: blades }, (_, i) => <line key={i} className="lx-blade" x1={8 + i * ((w - 16) / (blades - 1))} x2={8 + i * ((w - 16) / (blades - 1)) + 4} y1="2" y2="8" {...S} strokeWidth={1.2} />)}
    <line x1="4" x2="4" y1="10" y2={h} {...S} />
    <line x1={w - 4} x2={w - 4} y1="10" y2={h} {...S} />
  </g>
}

export const SCENES: Record<string, (labels: Labels) => ReactNode> = {
  ar: () => <svg viewBox="0 0 260 170" aria-hidden="true">
    <rect x="82" y="8" width="96" height="156" rx="16" {...S} style={{ fill: '#fff' }} />
    <rect x="118" y="14" width="24" height="5" rx="2.5" fill={INK} />
    <g className="lx-ar-floor">{[0, 1, 2, 3, 4, 5].map((i) => <line key={`h${i}`} x1={92 - i * 2} x2={168 + i * 2} y1={104 + i * 10} y2={104 + i * 10} stroke={INK} strokeWidth=".8" opacity=".35" />)}{[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={`v${i}`} x1={110 + i * 7} x2={90 + i * 14} y1="104" y2="156" stroke={INK} strokeWidth=".8" opacity=".35" />)}</g>
    <g className="lx-ar-model"><path d="M104 96l26-12 26 12-26 12z" {...S} style={{ fill: '#EFF0A3' }} /><path d="M104 96v28M130 108v28M156 96v28" {...S} /></g>
    <line className="lx-ar-scan" x1="88" x2="172" y1="40" y2="40" stroke={INK} strokeWidth="1.5" />
    <circle cx="44" cy="120" r="18" {...S} style={{ fill: '#CFDECA' }} /><path d="M37 120l5 5 9-10" {...S} />
  </svg>,
  photo: () => <svg viewBox="0 0 260 170" aria-hidden="true">
    <rect x="20" y="14" width="220" height="142" rx="12" {...S} style={{ fill: '#D8DFE9' }} />
    <path d="M40 120V72l48-30 48 30v48z" {...S} style={{ fill: '#fff' }} /><rect x="58" y="86" width="22" height="34" {...S} /><rect x="98" y="84" width="22" height="18" {...S} />
    <line x1="20" x2="240" y1="120" y2="120" {...S} />
    <g className="lx-photo-model">{pergolaFront({ x: 128, y: 64, w: 92, h: 56, fill: '#EFF0A3', })}<rect x="124" y="60" width="100" height="64" rx="3" stroke={INK} strokeWidth="1" strokeDasharray="4 4" fill="none" />{[[124, 60], [224, 60], [124, 124], [224, 124]].map(([cx, cy]) => <rect key={`${cx}${cy}`} x={cx - 3} y={cy - 3} width="6" height="6" fill="#fff" stroke={INK} strokeWidth="1.2" />)}</g>
  </svg>,
  sun: () => <svg viewBox="0 0 260 170" aria-hidden="true">
    <path d="M30 130a100 100 0 0 1 200 0" {...S} strokeDasharray="2 6" />
    <g className="lx-sun-orbit"><circle cx="30" cy="130" r="11" {...S} style={{ fill: '#EFF0A3' }} /></g>
    {pergolaFront({ x: 70, y: 86, w: 120, h: 44, })}
    <ellipse className="lx-sun-shade" cx="130" cy="140" rx="54" ry="7" fill={INK} opacity=".16" />
    <line x1="14" x2="246" y1="132" y2="132" {...S} />
  </svg>,
  budget: (l) => <svg viewBox="0 0 260 170" aria-hidden="true">
    <text x="20" y="34" fontSize="11" fontWeight="600" fill="#5C5E64">{l.budgetLabel}</text>
    <text x="240" y="34" textAnchor="end" fontSize="13" fontWeight="700" fill={INK}>{l.budgetValue}</text>
    <rect x="20" y="48" width="220" height="16" rx="8" {...S} style={{ fill: '#F6F5FA' }} />
    <rect className="lx-budget-fill" x="20" y="48" width="220" height="16" rx="8" fill="#CFDECA" stroke={INK} strokeWidth="1.5" />
    <line x1="196" x2="196" y1="40" y2="72" stroke={INK} strokeWidth="2" />
    {l.budgetTags.map((tag, i) => <g key={tag} className="lx-budget-tag" style={{ '--i': i } as CSSProperties}><rect x={20 + i * 112} y="92" width="104" height="26" rx="13" {...S} style={{ fill: '#EFF0A3' }} /><text x={72 + i * 112} y="109" textAnchor="middle" fontSize="11" fontWeight="600" fill={INK}>{tag}</text></g>)}
    <path d="M20 140h220" stroke={INK} strokeWidth="1" opacity=".2" />
  </svg>,
  advisor: (l) => <svg viewBox="0 0 260 170" aria-hidden="true">
    {l.advisorChips.map((chip, i) => <g key={chip} className="lx-adv-chip" style={{ '--i': i } as CSSProperties}><rect x={i % 2 ? 136 : 20} y={i < 2 ? 18 : 56} width="104" height="28" rx="14" {...S} /><text x={(i % 2 ? 136 : 20) + 52} y={(i < 2 ? 18 : 56) + 18} textAnchor="middle" fontSize="11" fontWeight="600" fill={INK}>{chip}</text></g>)}
    <g className="lx-adv-result"><rect x="20" y="108" width="220" height="40" rx="20" fill={INK} /><text x="130" y="133" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">{l.advisorResult}</text></g>
  </svg>,
  night: () => <svg viewBox="0 0 260 170" aria-hidden="true">
    <circle cx="214" cy="34" r="12" fill="none" stroke="#EFF0A3" strokeWidth="1.5" /><circle cx="220" cy="30" r="10" fill="#212121" />
    {[[40, 26], [70, 44], [150, 20], [180, 54]].map(([cx, cy]) => <circle key={`${cx}${cy}`} className="lx-star" cx={cx} cy={cy} r="1.6" fill="#EFF0A3" />)}
    <g stroke="#ECECEF" strokeWidth="1.5" fill="none" strokeLinecap="round"><rect x="56" y="74" width="148" height="10" rx="2" /><line x1="62" x2="62" y1="84" y2="140" /><line x1="198" x2="198" y1="84" y2="140" /><line x1="20" x2="240" y1="140" y2="140" /></g>
    <line className="lx-led" x1="62" x2="198" y1="87" y2="87" stroke="#EFF0A3" strokeWidth="3" strokeLinecap="round" />
    <path className="lx-led-glow" d="M62 88L40 140h180l-22-52z" fill="#EFF0A3" opacity=".22" />
  </svg>,
  energy: (l) => <svg viewBox="0 0 260 170" aria-hidden="true">
    <text x="20" y="30" fontSize="13" fontWeight="700" fill={INK}>{l.energy}</text>
    {[34, 46, 62, 80, 96, 104, 100, 90, 70, 52, 38, 30].map((h, i) => <rect key={i} className="lx-bar" style={{ '--i': i } as CSSProperties} x={22 + i * 18} y={150 - h} width="12" height={h} rx="3" {...S} fill={i === 5 ? '#EFF0A3' : '#CFDECA'} />)}
    <line x1="16" x2="244" y1="150" y2="150" {...S} />
  </svg>,
  pdf: () => <svg viewBox="0 0 260 170" aria-hidden="true">
    <g className="lx-pdf-page"><rect x="40" y="10" width="104" height="146" rx="6" {...S} style={{ fill: '#fff' }} /><rect x="50" y="22" width="84" height="44" rx="4" {...S} style={{ fill: '#D8DFE9' }} /><g transform="translate(62 36) scale(.5)">{pergolaFront({ x: 0, y: 0, w: 120, h: 46, })}</g><path d="M50 78h84M50 90h60M50 102h72M50 114h48" stroke={INK} strokeWidth="1.3" strokeLinecap="round" opacity=".55" /><rect x="50" y="126" width="40" height="18" rx="9" fill="#EFF0A3" stroke={INK} strokeWidth="1.2" /></g>
    <g className="lx-qr" transform="translate(160 54)">
      <rect x="0" y="0" width="64" height="64" rx="8" {...S} style={{ fill: '#fff' }} />
      {[[8, 8], [40, 8], [8, 40]].map(([x, y]) => <g key={`${x}${y}`}><rect x={x} y={y} width="16" height="16" rx="2" fill="none" stroke={INK} strokeWidth="3" /><rect x={x + 5} y={y + 5} width="6" height="6" fill={INK} /></g>)}
      {[[30, 10], [32, 30], [42, 32], [50, 44], [36, 46], [44, 52], [30, 52], [52, 30]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="5" fill={INK} />)}
      <line className="lx-qr-scan" x1="-6" x2="70" y1="0" y2="0" stroke={INK} strokeWidth="2" />
    </g>
  </svg>,
}

export type Labels = { budgetLabel: string; budgetValue: string; budgetTags: readonly string[]; advisorChips: readonly string[]; advisorResult: string; energy: string }

