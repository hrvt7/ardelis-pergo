// Vercel Edge függvény: POST /api/service-request → hibabejelentés a tulajdonosi oldalról
import { handleServiceRequest } from '../server/serviceRequests'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleServiceRequest(request, process.env)
}
