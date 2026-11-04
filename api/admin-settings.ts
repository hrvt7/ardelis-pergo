// Vercel Edge függvény: GET/PUT /api/admin-settings → a gyártó beállításainak olvasása és mentése
import { handleAdminSettings } from '../server/tenantAdmin'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleAdminSettings(request, process.env)
}
