// Vercel Edge függvény: GET/POST/PATCH /api/admin-quotes → server/quotes.ts (gyártói ajánlatkezelés)
import { handleAdminQuotes } from '../server/quotes'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleAdminQuotes(request, process.env)
}
