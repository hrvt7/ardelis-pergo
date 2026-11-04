// Vercel Edge függvény: GET/PATCH /api/admin-leads → a gyártó érdeklődői és azok státusza
import { handleAdminLeads } from '../server/tenantAdmin'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleAdminLeads(request, process.env)
}
