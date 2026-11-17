// Vercel Edge függvény: POST /api/lead → server/lead.ts
import { handleLeadRequest } from '../server/lead'

export const config = { runtime: 'edge' }

// A második paraméter a Vercel Edge környezete: `waitUntil` a webhookot a válasz után kézbesíti (4.93).
export default function handler(request: Request, context?: { waitUntil?: (promise: Promise<unknown>) => void }) {
  return handleLeadRequest(request, process.env, context)
}
