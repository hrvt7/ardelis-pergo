// Vercel Edge függvény: POST /api/track → névtelen eseményszámláló (konverziómérés)
import { handleTrack } from '../server/analytics'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleTrack(request, process.env)
}
