import { lazy, Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import NotFound from '@/pages/NotFound'
import { DEFAULT_TENANT_ID, getTenant } from '@/tenants'
import { TenantProvider } from '@/tenants/TenantContext'
import { applyOverrides } from '@/tenants/overrides'
import type { Tenant } from '@/tenants/types'

const loadStudio = () => import('@/pages/PergoStudio')
const PergoStudio = lazy(loadStudio)

function PageLoading() {
  return <div className="page-loading" role="status"><span>3D</span><p>Konfigurátor betöltése…</p></div>
}

/**
 * A gyártó admin felületen szerkesztett adatai (ha vannak). A lekérés a konfigurátor kódjának
 * betöltésével párhuzamosan fut, legfeljebb ~1,5 s-ot vár; hiba vagy időtúllépés esetén a kódban
 * lévő alapbeállítás érvényes. Így az ár nem „ugrik” a megnyitás után.
 */
function useEffectiveTenant(base: Tenant | undefined): Tenant | undefined | null {
  const [state, setState] = useState<{ id: string; tenant: Tenant } | null>(null)
  const id = base?.id
  useEffect(() => {
    if (!base || !id) return
    if (import.meta.env.VITE_PREVIEW_MODE === '1') return
    void loadStudio()
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 1500)
    fetch(`/api/tenant?id=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { overrides?: unknown } | null) => setState({ id, tenant: data?.overrides ? applyOverrides(base, data.overrides) : base }))
      .catch(() => setState({ id, tenant: base }))
      .finally(() => window.clearTimeout(timer))
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [base, id])
  if (!base) return undefined
  // Előnézeti buildben nincs szerver: az alapbeállítás érvényes.
  if (import.meta.env.VITE_PREVIEW_MODE === '1') return base
  return state && state.id === id ? state.tenant : null
}

/**
 * Egy gyártó konfigurátora.
 * - /studio/pergola        → bemutató (demo) gyártó, a saját nyitóoldaladdal
 * - /k/:tenantId           → önálló oldal egy gyártónak (hirdetésekbe, e-mailbe)
 * - /embed/:tenantId       → a gyártó weboldalába ágyazható változat (iframe)
 * Bármelyikhez ?admin=1 → árszerkesztő gomb (csak helyi kipróbáláshoz).
 */
export default function TenantStudio({ mode }: { mode: 'demo' | 'standalone' | 'embed' }) {
  const params = useParams()
  const [search] = useSearchParams()
  const base = getTenant(mode === 'demo' ? DEFAULT_TENANT_ID : params.tenantId)
  const tenant = useEffectiveTenant(base)
  if (!base) return <NotFound />
  if (!tenant) return <PageLoading />
  const embed = mode === 'embed'
  const homeHref = embed ? null : tenant.demo ? '/minta' : tenant.brand.website ?? null
  return (
    <TenantProvider key={tenant.id} tenant={tenant} admin={search.get('admin') === '1'} embed={embed} homeHref={homeHref}>
      <Suspense fallback={<PageLoading />}><PergoStudio /></Suspense>
    </TenantProvider>
  )
}
