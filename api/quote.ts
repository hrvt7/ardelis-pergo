// Vercel Edge függvény: GET/POST /api/quote → server/quotes.ts (a vevő ajánlatoldala)
import { handleQuote } from '../server/quotes'

export const config = { runtime: 'edge' }

// A második paraméter a Vercel Edge környezete: `waitUntil` a webhookot a válasz után kézbesíti (4.93).
export default function handler(request: Request, context?: { waitUntil?: (promise: Promise<unknown>) => void }) {
  return handleQuote(request, process.env, context)
}
