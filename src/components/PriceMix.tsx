// Ár-összetétel: egy színes sáv mutatja, mi mennyit tesz ki a bruttó irányárból.
import { formatHuf } from '@/lib/pricing'
import type { PriceBreakdown } from '@/types/pergola'

const GROUPS = [
  { id: 'structure', label: 'Szerkezet és tető', test: (id: string) => id === 'structure' || id === 'mount' || id.startsWith('wall-') || id === 'posts-saved' },
  { id: 'sides', label: 'Oldalzárás', test: (id: string) => id.startsWith('side-') || id === 'split-profiles' },
  { id: 'comfort', label: 'Komfort és extrák', test: (id: string) => ['led', 'led-rgb', 'heaters', 'speakers', 'sensors', 'fans', 'smart-home'].includes(id) },
  { id: 'finish', label: 'Szín és napelem', test: (id: string) => id.startsWith('color') || id === 'solar' },
] as const

export default function PriceMix({ price, compact = false }: { price: PriceBreakdown; compact?: boolean }) {
  // Bruttó arányban: a telepítés és az ÁFA a tételekre arányosan rakódik, így a szeletek a végösszeget adják ki.
  const factor = price.subtotalNet > 0 ? price.totalGross / price.subtotalNet : 1
  const parts = GROUPS.map((group) => ({ ...group, amount: price.lines.filter((line) => group.test(line.id)).reduce((sum, line) => sum + line.amountNet, 0) * factor }))
  const other = price.lines.filter((line) => !GROUPS.some((group) => group.test(line.id))).reduce((sum, line) => sum + line.amountNet, 0) * factor
  if (other) parts[0].amount += other
  const visible = parts.filter((part) => part.amount > 0)
  const total = visible.reduce((sum, part) => sum + part.amount, 0) || 1
  return <div className={`price-mix${compact ? ' is-compact' : ''}`} aria-label="Az ár összetétele">
    <div className="price-mix-bar">{visible.map((part) => <i key={part.id} className={`mix-${part.id}`} style={{ flexGrow: part.amount / total }} title={`${part.label}: ${formatHuf(part.amount)}`} />)}</div>
    <ul>{visible.map((part) => <li key={part.id}><i className={`mix-${part.id}`} /><span>{part.label}</span><strong>{Math.round((part.amount / total) * 100)}%</strong>{!compact && <small>{formatHuf(Math.round(part.amount / 1000) * 1000)}</small>}</li>)}</ul>
  </div>
}
