import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import Home from '@/pages/Home'
import NotFound from '@/pages/NotFound'
import TenantStudio from '@/pages/TenantStudio'
const AdminPage = lazy(() => import('@/pages/AdminPage'))

export default function App() {
  return <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/studio/pergola" element={<TenantStudio mode="demo" />} />
    <Route path="/k/:tenantId/admin" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
    <Route path="/k/:tenantId" element={<TenantStudio mode="standalone" />} />
    <Route path="/embed/:tenantId" element={<TenantStudio mode="embed" />} />
    {/* Régi, már nem létező útvonalak (piactér és katalógus) → kezdőlap */}
    {['/studio/canopy', '/studio/carport', '/studio/fence', '/studio/gate', '/partnerek', '/admin', '/keresett', '/login'].map((path) => <Route key={path} path={path} element={<Navigate to="/" replace />} />)}
    <Route path="*" element={<NotFound />} />
  </Routes>
}
