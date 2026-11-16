// Vercel Edge függvény: GET /api/installation?t=… → a tulajdonosi oldal (digitális ikerpéldány) adatai, személyes adat nélkül
import { handleInstallation } from '../server/installations'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleInstallation(request, process.env)
}
