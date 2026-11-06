// Vercel Edge függvény: GET/POST /api/quote → server/quotes.ts (a vevő ajánlatoldala)
import { handleQuote } from '../server/quotes'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleQuote(request, process.env)
}
