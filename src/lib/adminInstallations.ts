// Admin: telepítések (digitális ikerpéldány) betöltése, rögzítése és törlése.
import { useCallback, useEffect, useState } from 'react'
import type { InstallationComponent, WarrantyMonths } from './installations'

export interface AdminInstallation {
  id: number
  leadRef: string | null
  token: string
  product: string
  installedAt: string
  warranty: WarrantyMonths
  status: 'active' | 'archived'
  note: string | null
  createdAt: string
  headline: string
  components: InstallationComponent[]
  price: { totalNet: number; totalGross: number; currency: string; source: 'quote' | 'pricelist' } | null
}

export interface InstallationDraft { leadRef: string; installedAt: string; warranty: WarrantyMonths; note: string }

export const ownerLink = (origin: string, token: string) => `${origin}/t/${token}`

export function useInstallations(token: string, onExpired: () => void, enabled = true) {
  const [installations, setInstallations] = useState<AdminInstallation[] | null>(null)
  const [error, setError] = useState('')
  const auth = { Authorization: `Bearer ${token}` }

  const load = useCallback(async () => {
    if (!enabled) { setInstallations([]); return }
    try {
      const response = await fetch('/api/admin-installations', { headers: { Authorization: `Bearer ${token}` } })
      if (response.status === 401) { onExpired(); return }
      const data = await response.json() as { ok: boolean; installations?: AdminInstallation[]; error?: string }
      if (!response.ok || !data.ok) { setInstallations([]); if (response.status !== 503) setError(data.error ?? 'A telepítések betöltése nem sikerült.'); return }
      setError('')
      setInstallations(data.installations ?? [])
    } catch { setInstallations([]) }
  }, [token, onExpired, enabled])
  useEffect(() => { void load() }, [load])

  const create = useCallback(async (draft: InstallationDraft): Promise<{ ok: true; installation: AdminInstallation } | { ok: false; error: string }> => {
    try {
      const response = await fetch('/api/admin-installations', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      if (response.status === 401) { onExpired(); return { ok: false, error: 'A munkamenet lejárt.' } }
      const data = await response.json() as { ok: boolean; installation?: AdminInstallation; error?: string }
      if (!response.ok || !data.ok || !data.installation) return { ok: false, error: data.error ?? 'A rögzítés nem sikerült.' }
      await load()
      return { ok: true, installation: data.installation }
    } catch { return { ok: false, error: 'A szerver nem érhető el. Próbáld újra.' } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, load, onExpired])

  const remove = useCallback(async (id: number): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/admin-installations?id=${id}`, { method: 'DELETE', headers: auth })
      const data = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null
      if (!response.ok || !data?.ok) return { ok: false, error: data?.error ?? 'A törlés nem sikerült.' }
      await load()
      return { ok: true }
    } catch { return { ok: false, error: 'A szerver nem érhető el. Próbáld újra.' } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, load])

  return { installations, error, reload: load, create, remove }
}

export interface AdminServiceRequest { id: number; installationId: number; component: string; description: string; status: 'new' | 'in_progress' | 'closed'; createdAt: string; consentVersion: string; photos: string[] }
export const SERVICE_STATUS_LABEL: Record<AdminServiceRequest['status'], string> = { new: 'Új', in_progress: 'Folyamatban', closed: 'Lezárva' }

/** Szerviz-bejelentések; a fotólinkek 10 percig élnek, ezért a nézet újratöltéskor újakat kér. */
export function useServiceRequests(token: string, onExpired: () => void, enabled = true) {
  const [requests, setRequests] = useState<AdminServiceRequest[] | null>(null)
  const [error, setError] = useState('')
  const [loadedAt, setLoadedAt] = useState(0)
  const load = useCallback(async () => {
    if (!enabled) { setRequests([]); return }
    try {
      const response = await fetch('/api/admin-service', { headers: { Authorization: `Bearer ${token}` } })
      if (response.status === 401) { onExpired(); return }
      const data = await response.json() as { ok: boolean; requests?: AdminServiceRequest[]; error?: string }
      if (!response.ok || !data.ok) { setRequests([]); if (response.status !== 503) setError(data.error ?? 'A bejelentések betöltése nem sikerült.'); return }
      setError('')
      setRequests(data.requests ?? [])
      setLoadedAt(Date.now())
    } catch { setRequests([]) }
  }, [token, onExpired, enabled])
  useEffect(() => { void load() }, [load])

  const setStatus = useCallback(async (id: number, status: AdminServiceRequest['status']) => {
    setRequests((current) => current?.map((item) => (item.id === id ? { ...item, status } : item)) ?? null)
    try {
      const response = await fetch('/api/admin-service', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
      if (!response.ok) throw new Error('patch')
      return true
    } catch { setError('Az állapot mentése nem sikerült.'); void load(); return false }
  }, [token, load])

  return { requests, error, loadedAt, reload: load, setStatus }
}
