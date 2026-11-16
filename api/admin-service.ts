// Vercel Edge függvény: GET/PATCH /api/admin-service → a gyártó Szerviz nézete (bejelentések, állapot)
import { handleAdminService } from '../server/serviceRequests'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleAdminService(request, process.env)
}
