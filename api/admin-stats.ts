// Vercel Edge függvény: GET /api/admin-stats → a gyártó látogatottsági számlálói
import { handleAdminStats } from '../server/analytics'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleAdminStats(request, process.env)
}
