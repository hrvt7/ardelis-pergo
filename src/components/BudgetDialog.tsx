// Költségkeret-varázsló: a vásárló megadja, mennyit szán rá, a rendszer megmutatja,
// mi fér bele a terve megtartásával — három irányból.
import { useEffect, useMemo, useState } from 'react'
import { Check, LoaderCircle, Wallet } from 'lucide-react'
import { Modal } from '@/components/Dialogs'
import { planBudget, type BudgetResult } from '@/lib/budget'
import { formatHuf } from '@/lib/pricing'
import { useTenant } from '@/tenants/TenantContext'
import type { FurnitureSet, PergolaConfig, PriceSettings } from '@/types/pergola'

const parseAmount = (text: string) => Number(text.replace(/\D/g, '')) || 0
const group = (value: number) => new Intl.NumberFormat('hu-HU').format(value)

export default function BudgetDialog({ config, prices, furniture, currentGross, onApply, onClose }: { config: PergolaConfig; prices: PriceSettings; furniture: FurnitureSet; currentGross: number; onApply: (config: PergolaConfig) => void; onClose: () => void }) {
  const { tenant } = useTenant()
  // Kiinduló javaslat: a jelenlegi ár 80%-a, egész százezerre kerekítve.
  const [text, setText] = useState(() => group(Math.round((currentGross * 0.8) / 100000) * 100000))
  const amount = parseAmount(text)
  const [result, setResult] = useState<{ amount: number; value: BudgetResult } | null>(null)
  const chips = useMemo(() => [0.6, 0.7, 0.8, 0.9].map((rate) => Math.round((currentGross * rate) / 500000) * 500000).filter((value, index, list) => value > 0 && list.indexOf(value) === index), [currentGross])

  useEffect(() => {
    if (amount < 100000) return
    // A keresés néhány száz konfigurációt áraz be: begépelés után, a felület blokkolása nélkül.
    const timer = window.setTimeout(() => setResult({ amount, value: planBudget(tenant, config, prices, amount, furniture) }), 300)
    return () => window.clearTimeout(timer)
  }, [amount, tenant, config, prices, furniture])

  const busy = amount >= 100000 && result?.amount !== amount
  const value = result?.amount === amount ? result.value : null

  return <Modal title="Mennyit szánsz rá?" eyebrow="KÖLTSÉGKERET" onClose={onClose} className="budget-dialog">
    <p className="modal-intro">Írd be a keretösszeget (bruttó, telepítéssel). Megmutatjuk, mi fér bele úgy, hogy a terved minél kevésbé változzon. A mostani terved: <strong>{formatHuf(currentGross)}</strong>.</p>
    <div className="budget-input">
      <label htmlFor="budget-amount"><Wallet size={16} /><span>Keretösszeg</span></label>
      <div><input id="budget-amount" inputMode="numeric" autoComplete="off" value={text} onChange={(event) => setText(group(parseAmount(event.target.value)))} /><span>Ft</span></div>
    </div>
    <div className="budget-chips">{chips.map((chip) => <button type="button" key={chip} className={chip === amount ? 'selected' : ''} onClick={() => setText(group(chip))}>{(chip / 1000000).toLocaleString('hu-HU', { maximumFractionDigits: 1 })} M Ft</button>)}</div>

    <div className="budget-results" aria-live="polite">
      {amount < 100000 && <p className="budget-note">Adj meg egy összeget.</p>}
      {busy && <p className="budget-note"><LoaderCircle size={15} className="spin" />Számolás a gyártó árlistájával…</p>}
      {value?.status === 'fits' && <div className="budget-fits"><Check size={18} /><div><strong>Belefér a terved.</strong><span>Marad {formatHuf(value.remaining)} — ebből kényelmesen futja pl. LED-re vagy oldalzárásra.</span></div></div>}
      {value?.status === 'impossible' && <div className="budget-fits is-warning"><Wallet size={18} /><div><strong>Ebbe a keretbe nem fér bele ez a fajta pergola.</strong><span>A legkisebb, alapfelszereltségű változat ára {formatHuf(value.minimumGross)}. Érdemes megnézni egy kisebb vagy fix tetős kivitelt is.</span></div></div>}
      {value?.status === 'plans' && <div className="budget-plans">
        {value.plans.map((plan) => <article key={plan.id} className={`budget-plan${plan.id === 'balanced' ? ' is-best' : ''}`}>
          <header><span>{plan.title}</span>{plan.id === 'balanced' && <em>Ajánlott</em>}</header>
          <strong>{formatHuf(plan.totalGross)}</strong>
          <small>{amount - plan.totalGross > 0 ? `${formatHuf(amount - plan.totalGross)}-tal a keret alatt` : 'Pontosan a keretösszeg'} · {formatHuf(value.totalGross - plan.totalGross)} megtakarítás</small>
          <ul>{plan.changes.map((change) => <li key={change}>{change}</li>)}</ul>
          <button type="button" className={plan.id === 'balanced' ? 'primary-action' : 'secondary-action'} onClick={() => onApply(plan.config)}>Ezt választom</button>
        </article>)}
      </div>}
    </div>
    <p className="budget-note">A tervet a 3D-ben azonnal látod, és a visszavonás gombbal bármikor visszaléphetsz. {furniture !== 'none' ? 'A választott bútor helyigényénél nem lesz kisebb.' : ''}</p>
  </Modal>
}
