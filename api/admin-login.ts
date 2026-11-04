// Vercel Edge függvény: POST /api/admin-login → munkamenet-token
import { handleAdminLogin } from '../server/tenantAdmin'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleAdminLogin(request, process.env)
}
