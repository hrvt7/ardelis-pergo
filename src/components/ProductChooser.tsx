// „Mit tervezel?” — termékcsalád-választó a konfigurátor első lépésének tetején (docs/TOBBTERMEK-TERV.md, 3. pont).
// Az élő családok linkek a saját útvonalukra; a „hamarosan” családok a bemutató gyártónál jelennek meg, és egy
// kattintással jelezhető rájuk az érdeklődés (névtelen interest_<család> esemény). Nem felugró ablak: linkelhető, kereshető.
import { useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { Link } from 'react-router'
import { useTenant } from '@/tenants/TenantContext'
import { interestEvent, productPath, PRODUCTS, tenantProducts, type ProductFamily } from '@/products'
import { track } from '@/lib/analytics'

export default function ProductChooser() {
  const { tenant, product, mode } = useTenant()
  const offered = tenantProducts(tenant)
  const [interested, setInterested] = useState<ProductFamily[]>([])
  // Élő, a gyártó által kínált családok elöl; a demónál a még nem elérhetők is, hogy mérhető legyen az igény.
  const items = PRODUCTS.filter((item) => offered.includes(item.id) || (tenant.demo && item.status === 'soon'))
  if (items.length < 2) return null
  const mark = (id: ProductFamily) => { track(tenant.id, interestEvent(id)); setInterested((list) => [...list, id]) }
  return <div className="product-chooser" role="group" aria-label="Mit tervezel?">
    <span className="product-chooser-title">Mit tervezel?</span>
    <div className="product-chips">
      {items.map((item) => {
        const current = item.id === product
        if (item.status === 'live' && offered.includes(item.id)) {
          return <Link key={item.id} className={`product-chip${current ? ' is-current' : ''}`} to={productPath(mode, tenant.id, item.id)} aria-current={current ? 'page' : undefined}><strong>{item.label}</strong><small>{item.short}</small></Link>
        }
        const done = interested.includes(item.id)
        return <button key={item.id} type="button" className={`product-chip is-soon${done ? ' is-done' : ''}`} onClick={() => !done && mark(item.id)} title={done ? 'Köszönjük, jelezzük, amikor elérhető' : `${item.label}: hamarosan — kattints, ha érdekel`}>
          <strong>{item.label}</strong><small>{done ? <><Check size={12} /> jelezzük</> : <><Bell size={12} /> hamarosan · érdekel</>}</small>
        </button>
      })}
    </div>
  </div>
}
