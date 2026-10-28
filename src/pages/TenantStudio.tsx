import { lazy, Suspense } from 'react'
import { useParams, useSearchParams } from 'react-router'
import NotFound from '@/pages/NotFound'
import { DEFAULT_TENANT_ID, getTenant } from '@/tenants'
import { TenantProvider } from '@/tenants/TenantContext'

const PergoStudio = lazy(() => import('@/pages/PergoStudio'))

function PageLoading() {
  return <div className="page-loading" role="status"><span>3D</span><p>Konfigurátor betöltése…</p></div>
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
  const tenant = getTenant(mode === 'demo' ? DEFAULT_TENANT_ID : params.tenantId)
  if (!tenant) return <NotFound />
  const embed = mode === 'embed'
  const homeHref = embed ? null : tenant.demo ? '/' : tenant.brand.website ?? null
  return (
    <TenantProvider key={tenant.id} tenant={tenant} admin={search.get('admin') === '1'} embed={embed} homeHref={homeHref}>
      <Suspense fallback={<PageLoading />}><PergoStudio /></Suspense>
    </TenantProvider>
  )
}
