// Vercel Edge függvény: POST /api/lead → server/lead.ts
import { handleLeadRequest } from '../server/lead'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleLeadRequest(request, process.env)
}
