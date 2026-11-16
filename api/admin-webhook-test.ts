// Vercel Edge függvény: POST /api/admin-webhook-test → CRM-webhook tesztesemény a gyártó beállításával
import { handleWebhookTest } from '../server/webhook'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleWebhookTest(request, process.env)
}
