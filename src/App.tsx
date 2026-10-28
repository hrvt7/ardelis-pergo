import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import Home from '@/pages/Home'
import NotFound from '@/pages/NotFound'

const PergoStudio = lazy(() => import('@/pages/PergoStudio'))
const PartnerPage = lazy(() => import('@/pages/PartnerPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const TrackRequest = lazy(() => import('@/pages/TrackRequest'))
const Login = lazy(() => import('@/pages/Login'))

function PageLoading() {
  return <div className="page-loading" role="status"><span>ARDELIS</span><p>Oldal betöltése…</p></div>
}

export default function App() {
  return <Suspense fallback={<PageLoading />}><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/studio/pergola" element={<PergoStudio />} />
    <Route path="/studio/canopy" element={<Navigate to="/" replace />} />
    <Route path="/studio/carport" element={<Navigate to="/" replace />} />
    <Route path="/studio/fence" element={<Navigate to="/" replace />} />
    <Route path="/studio/gate" element={<Navigate to="/" replace />} />
    <Route path="/partnerek" element={<PartnerPage />} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/keresett" element={<TrackRequest />} />
    <Route path="/login" element={<Login />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense>
}
