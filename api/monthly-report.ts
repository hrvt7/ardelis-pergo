// Vercel Edge függvény, havi időzítéssel (vercel.json → crons, minden hónap 1-jén): GET /api/monthly-report → server/monthlyReport.ts
import { handleMonthlyReport } from '../server/monthlyReport'

export const config = { runtime: 'edge' }

export default function handler(request: Request) {
  return handleMonthlyReport(request, process.env)
}
