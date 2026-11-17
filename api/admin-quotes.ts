// Vercel Edge függvény: GET/POST/PATCH /api/admin-quotes → server/quotes.ts (gyártói ajánlatkezelés)
import { handleAdminQuotes } from '../server/quotes'

export const config = { runtime: 'edge' }

// A második paraméter a Vercel Edge környezete: `waitUntil` a webhookot a válasz után kézbesíti (4.93).
export default function handler(request: Request, context?: { waitUntil?: (promise: Promise<unknown>) => void }) {
  return handleAdminQuotes(request, process.env, context)
}
