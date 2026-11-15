import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'

export type CameraViewOption<T extends string> = { id: T; label: string; icon: LucideIcon }

/**
 * Kameranézet-választó egyetlen gombként a jelenet eszközsorában (a korábbi alsó, középső sáv helyett,
 * hogy ne takarja a képet). Kattintásra lenyíló lista; Esc vagy kattintás máshova bezárja.
 */
export default function CameraViewMenu<T extends string>({ views, value, onChange, initialOpen = false }: { views: CameraViewOption<T>[]; value: T; onChange: (id: T) => void; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer) }
  }, [open])
  const current = views.find((view) => view.id === value) ?? views[0]
  const Icon = current.icon
  return <div className="camera-menu" ref={root}>
    <button type="button" className={`camera-menu-toggle${open ? ' selected' : ''}`} aria-haspopup="true" aria-expanded={open} aria-label={`Nézet: ${current.label}`} title="Kameranézet váltása" onClick={() => setOpen((state) => !state)}>
      <Icon size={17} /><span>{current.label}</span><ChevronDown size={14} className="camera-menu-chevron" aria-hidden="true" />
    </button>
    {open && <div className="camera-menu-list" role="radiogroup" aria-label="Kameranézetek">
      {views.map(({ id, label, icon: ItemIcon }) => <button type="button" role="radio" key={id} aria-checked={id === value} className={id === value ? 'selected' : ''} onClick={() => { onChange(id); setOpen(false) }}>
        <ItemIcon size={17} /><span>{label}</span>{id === value && <Check size={15} className="camera-menu-check" aria-hidden="true" />}
      </button>)}
    </div>}
  </div>
}
