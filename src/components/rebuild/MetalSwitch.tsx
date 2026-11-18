import type { LucideIcon } from 'lucide-react'

/** Be/ki opció fém kapcsolóval (Ádám mintája): ikon, név, leírás, felár; a kapcsoló kattanva vált. */
export default function MetalSwitch({ label, description, price, checked, icon: Icon, onChange }: { label: string; description: string; price?: string; checked: boolean; icon?: LucideIcon; onChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} className={`rb-option rb-switch-row${checked ? ' is-on' : ''}`} onClick={() => onChange(!checked)}>
    {Icon && <span className="rb-switch-icon"><Icon size={19} strokeWidth={1.6} /></span>}
    <span className="rb-switch-text"><strong>{label}</strong><small>{description}</small>{price && <em>{price}</em>}</span>
    <span className="rb-metal" aria-hidden="true"><i /></span>
  </button>
}
