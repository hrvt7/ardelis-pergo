import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import Platform from '@/pages/Platform'
import NotFound from '@/pages/NotFound'
import TenantStudio from '@/pages/TenantStudio'
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const Home = lazy(() => import('@/pages/Home'))

export default function App() {
  return <Routes>
    <Route path="/" element={<Platform />} />
    {/* A demó gyártó (Lamelix) lakossági mintaoldala */}
    <Route path="/minta" element={<Suspense fallback={null}><Home /></Suspense>} />
    <Route path="/ardelis" element={<Navigate to="/minta" replace />} />
    <Route path="/konfigurator" element={<TenantStudio mode="demo" />} />
    <Route path="/studio/pergola" element={<Navigate to="/konfigurator" replace />} />
    <Route path="/k/demo" element={<Navigate to="/konfigurator" replace />} />
    <Route path="/k/:tenantId/admin" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
    <Route path="/k/:tenantId" element={<TenantStudio mode="standalone" />} />
    <Route path="/embed/:tenantId" element={<TenantStudio mode="embed" />} />
    {/* Régi, már nem létező útvonalak (piactér és katalógus) → kezdőlap */}
    {['/studio/canopy', '/studio/carport', '/studio/fence', '/studio/gate', '/partnerek', '/admin', '/keresett', '/login'].map((path) => <Route key={path} path={path} element={<Navigate to="/" replace />} />)}
    <Route path="*" element={<NotFound />} />
  </Routes>
}
