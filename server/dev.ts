// Helyi fejlesztői API (npm run dev): ugyanaz a lead-kezelő, mint élesben.
import 'dotenv/config'
import { Hono } from 'hono'
import { handleLeadRequest } from './lead'
import { handleDemoRequest } from './demoRequest'
import { handleAdminStats, handleTrack } from './analytics'
import { handleAdminLeads, handleAdminLogin, handleAdminSettings, handleTenantRequest } from './tenantAdmin'

const app = new Hono()
app.post('/api/lead', (c) => handleLeadRequest(c.req.raw, process.env))
app.post('/api/demo-request', (c) => handleDemoRequest(c.req.raw, process.env))
app.get('/api/tenant', (c) => handleTenantRequest(c.req.raw, process.env))
app.post('/api/admin-login', (c) => handleAdminLogin(c.req.raw, process.env))
app.on(['GET', 'PUT'], '/api/admin-settings', (c) => handleAdminSettings(c.req.raw, process.env))
app.on(['GET', 'PATCH'], '/api/admin-leads', (c) => handleAdminLeads(c.req.raw, process.env))
app.post('/api/track', (c) => handleTrack(c.req.raw, process.env))
app.get('/api/admin-stats', (c) => handleAdminStats(c.req.raw, process.env))
app.all('/api/*', (c) => c.json({ ok: false, error: 'Nem található.' }, 404))

export default app
