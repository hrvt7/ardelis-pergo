// Éles gyártónál (nem demó) a leadek fogadásához kötelező egy valós adatkezelési tájékoztató címe.
// Szerveren és a felületen is ugyanez a szabály fut. A demó gyártó a Lamelix saját /adatkezeles oldalát használja.
import type { Tenant } from './types'

const PLACEHOLDER_HOSTS = ['gyarto.hu', 'www.gyarto.hu', 'example.com', 'www.example.com', 'ceg.hu', 'www.ceg.hu']

export function hasPrivacyUrl(tenant: Pick<Tenant, 'demo' | 'brand'>): boolean {
  if (tenant.demo) return true
  const value = tenant.brand.privacyUrl?.trim()
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !PLACEHOLDER_HOSTS.includes(url.hostname.toLowerCase())
  } catch { return false }
}
