// Termékcsaládok szétválasztása (docs/TOBBTERMEK-TERV.md): minden család saját, különálló kalkulátor.
// - ProductHub: a termékválasztó oldal (/konfigurator/termekek, /k/<gyártó>/termekek) — innen indul a vevő.
// - ProductSwitch: kis link a kalkulátor fejlécében a választó oldalra; a kalkulátoron belül nincs más család.
// A „hamarosan” családok a bemutató gyártónál jelennek meg, egy kattintással jelezhető rájuk az érdeklődés (interest_<család>).
import { useState } from 'react'
import { ArrowRight, Bell, Check, LayoutGrid } from 'lucide-react'
import { Link } from 'react-router'
import { useTenant } from '@/tenants/TenantContext'
import { hubPath, interestEvent, productInfo, productPath, PRODUCTS, tenantProducts, type ProductFamily } from '@/products'
import { track } from '@/lib/analytics'

/** A választóban megjelenő családok: a gyártó élő kínálata, a demónál a még nem elérhetők is (érdeklődés-mérés). */
function useHubItems() {
  const { tenant } = useTenant()
  const offered = tenantProducts(tenant)
  return PRODUCTS.filter((item) => offered.includes(item.id) || (tenant.demo && item.status === 'soon')).map((item) => ({ ...item, available: item.status === 'live' && offered.includes(item.id) }))
}

/** Fejléc-link a termékválasztóra; csak ha a gyártó egynél több családot kínál. */
export function ProductSwitch() {
  const { tenant, product, mode } = useTenant()
  const items = useHubItems()
  if (items.length < 2) return null
  return <Link className="product-switch" to={hubPath(mode, tenant.id)} title="Másik termék tervezése">
    <span>{productInfo(product).label}</span><small><LayoutGrid size={12} />Másik termék</small>
  </Link>
}

export default function ProductHub() {
  const { tenant, mode } = useTenant()
  const items = useHubItems()
  const [interested, setInterested] = useState<ProductFamily[]>([])
  const mark = (id: ProductFamily) => { track(tenant.id, interestEvent(id)); setInterested((list) => [...list, id]) }
  return <main className="product-hub" aria-labelledby="hub-title">
    <section>
      <span className="product-soon-eyebrow">{tenant.brand.name} · 3D tervező</span>
      <h1 id="hub-title">Mit tervezel?</h1>
      <p className="product-soon-short">Válaszd ki a terméket — mindegyiknek saját tervezője van, valós 3D-vel és azonnali irányárral.</p>
      <div className="product-hub-grid">
        {items.map((item) => {
          if (item.available) return <Link key={item.id} className="product-hub-card" to={productPath(mode, tenant.id, item.id)}>
            <strong>{item.label}</strong><small>{item.short}</small><p>{item.description}</p><em>Tervezés indítása <ArrowRight size={15} /></em>
          </Link>
          const done = interested.includes(item.id)
          return <button key={item.id} type="button" className={`product-hub-card is-soon${done ? ' is-done' : ''}`} onClick={() => !done && mark(item.id)}>
            <strong>{item.label}</strong><small>{item.short}</small><p>{item.description}</p><em>{done ? <><Check size={14} /> Jelezzük, amikor elérhető</> : <><Bell size={14} /> Hamarosan · érdekel</>}</em>
          </button>
        })}
      </div>
    </section>
  </main>
}
