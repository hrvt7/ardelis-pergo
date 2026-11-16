// Vercel Edge függvény: POST /api/service-photo?t=… → egy hibabejelentési fotó (JPEG, metaadat nélkül) a privát tárhelyre
import { handleServicePhoto } from '../server/serviceRequests'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleServicePhoto(request, process.env)
}
