import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import Platform from '@/pages/Platform'
import NotFound from '@/pages/NotFound'
import TenantStudio from '@/pages/TenantStudio'
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const QuotePage = lazy(() => import('@/pages/QuotePage'))
const Home = lazy(() => import('@/pages/Home'))
const Privacy = lazy(() => import('@/pages/Privacy'))

/** Átirányítás, ami megtartja a lekérdezést és a #hash-t (megosztott konfigurációs linkek). */
function Redirect({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Platform />} />
    <Route path="/en" element={<Platform lang="en" />} />
    {/* A demó gyártó (Lamelix) lakossági mintaoldala */}
    <Route path="/adatkezeles" element={<Suspense fallback={null}><Privacy /></Suspense>} />
    <Route path="/privacy" element={<Redirect to="/adatkezeles" />} />
    <Route path="/minta" element={<Suspense fallback={null}><Home /></Suspense>} />
    <Route path="/ardelis" element={<Redirect to="/minta" />} />
    <Route path="/konfigurator" element={<TenantStudio mode="demo" />} />
    <Route path="/studio/pergola" element={<Redirect to="/konfigurator" />} />
    <Route path="/k/demo" element={<Redirect to="/konfigurator" />} />
    <Route path="/ajanlat/:token" element={<Suspense fallback={null}><QuotePage /></Suspense>} />
    <Route path="/k/:tenantId/admin" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
    <Route path="/k/:tenantId" element={<TenantStudio mode="standalone" />} />
    <Route path="/embed/:tenantId" element={<TenantStudio mode="embed" />} />
    {/* Régi, már nem létező útvonalak (piactér és katalógus) → kezdőlap */}
    {['/studio/canopy', '/studio/carport', '/studio/fence', '/studio/gate', '/partnerek', '/admin', '/keresett', '/login'].map((path) => <Route key={path} path={path} element={<Navigate to="/" replace />} />)}
    <Route path="*" element={<NotFound />} />
  </Routes>
}
