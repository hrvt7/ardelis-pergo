// Egy még nem elérhető termékcsalád oldala (/konfigurator/<család>): mit fog tudni, és egy gombbal jelezhető az érdeklődés.
// Az érdeklődés névtelen eseményként mérődik (interest_<család>), ebből látszik, melyik családot érdemes következőnek megépíteni.
import { useState } from 'react'
import { ArrowRight, Bell, Check } from 'lucide-react'
import { Link } from 'react-router'
import { useTenant } from '@/tenants/TenantContext'
import { interestEvent, productInfo, productPath, PRODUCTS, type ProductFamily } from '@/products'
import { track } from '@/lib/analytics'

export default function ProductSoon({ product }: { product: ProductFamily }) {
  const { tenant, mode } = useTenant()
  const info = productInfo(product)
  const [sent, setSent] = useState(false)
  const notify = () => { track(tenant.id, interestEvent(product)); setSent(true) }
  const live = PRODUCTS.filter((item) => item.status === 'live')
  return <main className="product-soon" aria-labelledby="soon-title">
    <section>
      <span className="product-soon-eyebrow">{tenant.brand.name} · hamarosan</span>
      <h1 id="soon-title">{info.label}</h1>
      <p className="product-soon-short">{info.short}</p>
      <p>{info.description}</p>
      <div className="product-soon-actions">
        <button type="button" className="product-soon-notify" onClick={notify} disabled={sent}>{sent ? <><Check size={17} />Köszönjük, jelezzük</> : <><Bell size={17} />Érdekel, szóljatok</>}</button>
        {live.map((item) => <Link key={item.id} className="product-soon-link" to={productPath(mode, tenant.id, item.id)}>{item.label} tervezése <ArrowRight size={16} /></Link>)}
      </div>
      <p className="product-soon-note">A tervezés ugyanúgy működik majd, mint a teraszfedésnél: valós 3D, azonnali irányár, PDF és felmérés egy kattintással.</p>
    </section>
  </main>
}
