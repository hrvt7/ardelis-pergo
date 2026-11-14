import { lazy, Suspense } from 'react'
import Platform from '@/pages/Platform'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import NotFound from '@/pages/NotFound'
// A konfigurátor (three.js), a belépő és az admin csak a saját útvonalán töltődik; a nyitóoldal nem tölti elő őket.
const TenantStudio = lazy(() => import('@/pages/TenantStudio'))
const Login = lazy(() => import('@/pages/Login'))
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
    {/* Konfigurátor: a pergola a rövid útvonalon, a többi termékcsalád a /konfigurator/<család> alatt (src/products). */}
    <Route path="/konfigurator" element={<Suspense fallback={null}><TenantStudio mode="demo" /></Suspense>} />
    <Route path="/konfigurator/:product" element={<Suspense fallback={null}><TenantStudio mode="demo" /></Suspense>} />
    <Route path="/studio/pergola" element={<Redirect to="/konfigurator" />} />
    <Route path="/k/demo" element={<Redirect to="/konfigurator" />} />
    <Route path="/ajanlat/:token" element={<Suspense fallback={null}><QuotePage /></Suspense>} />
    <Route path="/k/:tenantId/admin" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
    <Route path="/k/:tenantId" element={<Suspense fallback={null}><TenantStudio mode="standalone" /></Suspense>} />
    <Route path="/k/:tenantId/:product" element={<Suspense fallback={null}><TenantStudio mode="standalone" /></Suspense>} />
    <Route path="/embed/:tenantId" element={<Suspense fallback={null}><TenantStudio mode="embed" /></Suspense>} />
    <Route path="/embed/:tenantId/:product" element={<Suspense fallback={null}><TenantStudio mode="embed" /></Suspense>} />
    {/* Régi termék-útvonalak → az új termékcsalád-oldalak */}
    <Route path="/studio/canopy" element={<Redirect to="/konfigurator/carport" />} />
    <Route path="/studio/carport" element={<Redirect to="/konfigurator/carport" />} />
    <Route path="/studio/fence" element={<Redirect to="/konfigurator/kerites" />} />
    <Route path="/studio/gate" element={<Redirect to="/konfigurator/kerites" />} />
    {/* Régi, már nem létező útvonalak (piactér) → kezdőlap */}
    <Route path="/belepes" element={<Suspense fallback={null}><Login /></Suspense>} />
    <Route path="/login" element={<Redirect to="/belepes" />} />
    <Route path="/admin" element={<Redirect to="/belepes" />} />
    {['/partnerek', '/keresett'].map((path) => <Route key={path} path={path} element={<Navigate to="/" replace />} />)}
    <Route path="*" element={<NotFound />} />
  </Routes>
}
