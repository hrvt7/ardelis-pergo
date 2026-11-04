// Vercel Edge függvény: POST /api/demo-request → server/demoRequest.ts
import { handleDemoRequest } from '../server/demoRequest'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleDemoRequest(request, process.env)
}
