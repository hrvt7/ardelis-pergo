// Termékcsaládok szétválasztása (docs/TOBBTERMEK-TERV.md): minden család saját, különálló kalkulátor.
// - ProductHub: a termékválasztó oldal (/konfigurator/termekek, /k/<gyártó>/termekek) — innen indul a vevő.
// - ProductSwitch: kis link a kalkulátor fejlécében a választó oldalra; a kalkulátoron belül nincs más család.
// A „hamarosan” családok a bemutató gyártónál jelennek meg, egy kattintással jelezhető rájuk az érdeklődés (interest_<család>).
import { useState } from 'react'
import { assetUrl } from '@/lib/assetUrl'
import { ArrowRight, Bell, Check, LayoutGrid } from 'lucide-react'
import { Link } from 'react-router'
import { useTenant } from '@/tenants/TenantContext'
import { hubPath, interestEvent, productInfo, productPath, PRODUCTS, tenantProducts, type ProductFamily } from '@/products'
import { track } from '@/lib/analytics'
import { tr } from '../i18n/locale'

/** A termékek saját 3D-jelenetéből készült kártyakép (aranyóra, családi ház környezetben). */
const PRODUCT_IMAGES: Partial<Record<ProductFamily, string>> = {
  pergola: '/assets/products/pergola.webp',
  carport: '/assets/products/carport.webp',
  fence: '/assets/products/fence.webp',
  'garage-door': '/assets/products/garage.webp',
}

/** Kártyakép betöltés közben csillogó helykitöltővel (mint a ui.live kártyái). */
function HubImage({ id, label }: { id: ProductFamily; label: string }) {
  const [loaded, setLoaded] = useState(false)
  const src = PRODUCT_IMAGES[id]
  if (!src) return <div className="product-hub-media is-empty" aria-hidden="true" />
  return <div className={`product-hub-media${loaded ? ' is-loaded' : ''}`}><img src={assetUrl(src)} alt={`${label}${tr(' — 3D látvány', ' — 3D-Ansicht')}`} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} /></div>
}

const HOW_IT_WORKS = [
  { title: tr('Tervezd meg', 'Planen Sie'), text: tr('Méret, kivitel, szín — a 3D azonnal mutatja.', 'Größe, Ausführung, Farbe — die 3D-Ansicht zeigt es sofort.') },
  { title: tr('Lásd az árat', 'Preis sehen'), text: tr('Tételes irányár minden módosítás után.', 'Detaillierter Richtpreis nach jeder Änderung.') },
  { title: tr('Kérj felmérést', 'Aufmaß anfragen'), text: tr('A terv és az ár egy kattintással a gyártóhoz kerül.', 'Entwurf und Preis gehen mit einem Klick an den Hersteller.') },
]

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
  return <Link className="product-switch" to={hubPath(mode, tenant.id)} title={tr('Másik termék tervezése', 'Anderes Produkt planen')}>
    <span>{productInfo(product).label}</span><small><LayoutGrid size={12} />{tr('Másik termék', 'Anderes Produkt')}</small>
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
      <p className="product-soon-short">{tr('Válaszd ki a terméket — mindegyiknek saját tervezője van, valós 3D-vel és azonnali irányárral.', 'Wählen Sie das Produkt — jedes hat einen eigenen Planer mit echtem 3D und sofortigem Richtpreis.')}</p>
      <div className="product-hub-grid">
        {items.map((item) => {
          if (item.available) return <Link key={item.id} className="product-hub-card" to={productPath(mode, tenant.id, item.id)}>
            <HubImage id={item.id} label={item.label} />
            <strong>{item.label}</strong><small>{item.short}</small><p>{item.description}</p><em>{tr('Tervezés indítása', 'Planung starten')} <ArrowRight size={15} /></em>
          </Link>
          const done = interested.includes(item.id)
          return <button key={item.id} type="button" className={`product-hub-card is-soon${done ? ' is-done' : ''}`} onClick={() => !done && mark(item.id)}>
            <HubImage id={item.id} label={item.label} />
            <strong>{item.label}</strong><small>{item.short}</small><p>{item.description}</p><em>{done ? <><Check size={14} /> {tr('Jelezzük, amikor elérhető', 'Wir melden uns, sobald verfügbar')}</> : <><Bell size={14} /> {tr('Hamarosan · érdekel', 'Demnächst · interessiert mich')}</>}</em>
          </button>
        })}
      </div>
      <ol className="product-hub-steps" aria-label={tr('Hogyan működik', 'So funktioniert es')}>
        {HOW_IT_WORKS.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step.title}</strong><p>{step.text}</p></li>)}
      </ol>
    </section>
  </main>
}
