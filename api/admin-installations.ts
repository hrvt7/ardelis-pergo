// Vercel Edge függvény: GET/POST/DELETE /api/admin-installations → a gyártó telepítései (digitális ikerpéldány)
import { handleAdminInstallations } from '../server/installations'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleAdminInstallations(request, process.env)
}
