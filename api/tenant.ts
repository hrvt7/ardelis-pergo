// Vercel Edge függvény: GET /api/tenant?id=… → a gyártó szerkesztett (nyilvános) beállításai
import { handleTenantRequest } from '../server/tenantAdmin'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleTenantRequest(request, process.env)
}
