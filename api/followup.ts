// Vercel Edge függvény, napi időzítéssel (vercel.json → crons): GET /api/followup → server/followup.ts
import { handleFollowUp } from '../server/followup'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleFollowUp(request, process.env)
}
