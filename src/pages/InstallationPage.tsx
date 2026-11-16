// Tulajdonosi oldal: /t/:token — a felszerelt termék digitális ikerpéldánya, bejelentkezés nélkül.
// A titkos link a hitelesítés. Személyes adatot nem mutat; a 3D a rögzítéskor befagyasztott konfigurációból készül.
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { Box, Mail, Phone, ShieldCheck, ShieldOff, Globe } from 'lucide-react'
import { usePageSeo } from '@/lib/usePageSeo'
import { intlLocale, setLocale, tr } from '@/i18n/locale'
import { setDisplayCurrency } from '@/lib/money'
import { DEFAULT_SCENE } from '@/lib/config'
import { getTenant } from '@/tenants'
import { TenantProvider } from '@/tenants/TenantContext'
import { applyOverrides } from '@/tenants/overrides'
import { warrantyGroupLabel, type WarrantyGroup } from '@/lib/installations'
import type { PergolaConfig, SceneSettings } from '@/types/pergola'
import '@/owner.css'

const PergolaScene = lazy(() => import('@/components/PergolaScene'))

export interface OwnerComponent { key: string; label: string; group: WarrantyGroup; months: number; expiresAt: string; active: boolean }
export interface OwnerInstallation {
  tenantId: string
  overrides: unknown
  brand: { name: string; legalName: string; logoUrl: string | null; phone: string | null; email: string | null; website: string | null; privacyUrl: string | null }
  product: 'pergola' | 'veranda' | 'conservatory'
  headline: string
  spec: [string, string][]
  config: PergolaConfig
  shareCode: string
  installedAt: string
  schemaVersion: number
  components: OwnerComponent[]
}

type Load = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ok'; data: OwnerInstallation }

const day = (value: string) => new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'long' }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
const productName = (product: OwnerInstallation['product']) => ({ pergola: 'Pergola', veranda: 'Veranda', conservatory: tr('Télikert', 'Wintergarten') })[product]

/** A garancia csoportonként (a csoport legkorábbi lejárata, ha több komponens van benne). */
function warrantyGroups(components: OwnerComponent[]) {
  const groups = new Map<WarrantyGroup, OwnerComponent>()
  for (const component of components) if (component.key !== 'other' && !groups.has(component.group)) groups.set(component.group, component)
  return [...groups.values()]
}

function Scene({ config }: { config: PergolaConfig }) {
  const scene = useMemo<SceneSettings>(() => ({ ...DEFAULT_SCENE, time: 'day', dayTime: 13, ground: 'studio', autoRotate: true, labels: false, quality: 'auto' }), [])
  return <Suspense fallback={<div className="owner-scene-wait" role="status">{tr('3D betöltése…', '3D wird geladen…')}</div>}>
    <PergolaScene cyclorama cycloramaTone="light" config={config} scene={scene} view="perspective" onSceneChange={() => undefined} />
  </Suspense>
}

export default function InstallationPage() {
  const { token = '' } = useParams()
  usePageSeo('/t', { noindex: true, title: tr('Termékkönyv', 'Produktpass') })
  const [state, setState] = useState<Load>({ kind: 'loading' })
  const [show3d, setShow3d] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/installation?t=${encodeURIComponent(token)}`, { referrerPolicy: 'no-referrer' })
      .then(async (response) => {
        const data = await response.json() as { ok: boolean; installation?: OwnerInstallation; error?: string }
        if (!alive) return
        setState(response.ok && data.ok && data.installation ? { kind: 'ok', data: data.installation } : { kind: 'error', message: data.error ?? 'A link érvénytelen vagy megszűnt.' })
      })
      .catch(() => { if (alive) setState({ kind: 'error', message: 'A szerver nem érhető el. Próbáld újra később.' }) })
    return () => { alive = false }
  }, [token])

  const tenant = useMemo(() => {
    if (state.kind !== 'ok') return null
    const base = getTenant(state.data.tenantId)
    return base ? (state.data.overrides ? applyOverrides(base, state.data.overrides) : base) : null
  }, [state])

  if (state.kind === 'loading') return <div className="owner-shell"><p className="owner-note" role="status">{tr('Betöltés…', 'Wird geladen…')}</p></div>
  if (state.kind === 'error' || !tenant) return <div className="owner-shell"><div className="owner-card owner-empty"><h1>{tr('Az oldal nem érhető el', 'Seite nicht verfügbar')}</h1><p>{state.kind === 'error' ? state.message : ''}</p><p>{tr('Ha a terméken lévő QR-kódot vagy a kapott linket használtad, kérj újat a gyártótól.', 'Wenn Sie den QR-Code am Produkt oder den erhaltenen Link verwendet haben, fordern Sie beim Hersteller einen neuen an.')}</p></div></div>

  const { data } = state
  // A nyelv és a pénznem a gyártóé (renderelés közben, a tartalom előtt; ugyanígy, mint az ajánlatoldalon).
  setLocale(tenant.locale ?? 'hu')
  setDisplayCurrency(tenant.currency)
  const groups = warrantyGroups(data.components)
  const contacts = [
    data.brand.phone && { icon: <Phone size={16} />, label: data.brand.phone, href: `tel:${data.brand.phone.replace(/[^+0-9]/g, '')}` },
    data.brand.email && { icon: <Mail size={16} />, label: data.brand.email, href: `mailto:${data.brand.email}` },
    data.brand.website && { icon: <Globe size={16} />, label: data.brand.website.replace(/^https?:\/\//, ''), href: data.brand.website },
  ].filter(Boolean) as { icon: ReactNode; label: string; href: string }[]

  return <TenantProvider tenant={tenant} admin={false} embed={false} homeHref={null} mode="standalone">
    <div className="owner-shell">
      <header className="owner-top">
        {data.brand.logoUrl ? <img src={data.brand.logoUrl} alt={data.brand.name} height={32} /> : <strong className="owner-brand">{data.brand.name}</strong>}
        <span>{tr('Digitális termékkönyv', 'Digitaler Produktpass')}</span>
      </header>

      <main className="owner-card">
        <section className="owner-hero">
          <div className="owner-title">
            <span className="owner-eyebrow">{productName(data.product)} · {tr('telepítve', 'montiert am')} {day(data.installedAt)}</span>
            <h1>{data.headline}</h1>
          </div>
          <div className="owner-scene">
            {show3d ? <Scene config={data.config} /> : <button type="button" className="owner-scene-wait" onClick={() => setShow3d(true)}><Box size={18} />{tr('3D nézet', '3D-Ansicht')}</button>}
          </div>
          <p className="owner-hint">{tr('A 3D-modell a felszereléskor rögzített terv. Forgatható, nagyítható; nem módosítható.', 'Das 3D-Modell zeigt den bei der Montage festgehaltenen Entwurf. Drehbar und zoombar, nicht änderbar.')}</p>
        </section>

        <section>
          <h2>{tr('Garancia', 'Garantie')}</h2>
          <ul className="owner-warranty">
            {groups.map((component) => <li key={component.group} className={component.active ? 'is-active' : 'is-expired'}>
              {component.active ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
              <div><b>{warrantyGroupLabel(component.group)}</b><small>{component.months} {tr('hónap', 'Monate')}</small></div>
              <span>{component.active ? tr('Érvényes', 'Gültig bis') : tr('Lejárt', 'Abgelaufen')}{component.active ? tr(' eddig: ', ' ') : ': '}{day(component.expiresAt)}</span>
            </li>)}
          </ul>
          <p className="owner-hint">{tr(`A garancia feltételeit a(z) ${data.brand.name} szerződése és garanciajegye határozza meg; ez az oldal csak a lejárati dátumokat mutatja.`, `Die Garantiebedingungen richten sich nach dem Vertrag und Garantieschein von ${data.brand.name}; diese Seite zeigt nur die Ablaufdaten.`)}</p>
        </section>

        <section>
          <h2>{tr('Komponensek', 'Komponenten')}</h2>
          <ul className="owner-components">
            {data.components.filter((component) => component.key !== 'other').map((component) => <li key={component.key}><span>{component.label}</span><small className={component.active ? 'is-active' : 'is-expired'}>{component.active ? tr('garanciális', 'in Garantie') : tr('garancián túl', 'außerhalb der Garantie')}</small></li>)}
          </ul>
        </section>

        <section>
          <h2>{tr('Műszaki adatok', 'Technische Daten')}</h2>
          <dl className="owner-spec">{data.spec.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>

        {contacts.length > 0 && <section>
          <h2>{tr('Kapcsolat', 'Kontakt')}</h2>
          <p className="owner-legal">{data.brand.legalName}</p>
          <div className="owner-contacts">{contacts.map((contact) => <a key={contact.href} href={contact.href} target={contact.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{contact.icon}{contact.label}</a>)}</div>
        </section>}
      </main>

      <footer className="owner-foot">
        <p>{tr('Ez az oldal nem tartalmaz személyes adatot. A linket csak a termék tulajdonosa kapja; ne tedd közzé.', 'Diese Seite enthält keine personenbezogenen Daten. Den Link erhält nur der Eigentümer des Produkts; bitte nicht veröffentlichen.')}</p>
        {data.brand.privacyUrl && <a href={data.brand.privacyUrl} target="_blank" rel="noopener noreferrer">{tr('Adatkezelési tájékoztató', 'Datenschutzerklärung')}</a>}
      </footer>
    </div>
  </TenantProvider>
}
