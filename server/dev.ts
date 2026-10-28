// Helyi fejlesztői API (npm run dev): ugyanaz a lead-kezelő, mint élesben.
import 'dotenv/config'
import { Hono } from 'hono'
import { handleLeadRequest } from './lead'

const app = new Hono()
app.post('/api/lead', (c) => handleLeadRequest(c.req.raw, process.env))
app.all('/api/*', (c) => c.json({ ok: false, error: 'Nem található.' }, 404))

export default app
