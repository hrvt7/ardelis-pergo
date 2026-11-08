import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleAdminStats, handleTrack, resetTrackRateLimit } from '../server/analytics'
import { signToken } from '../server/tenantAdmin'
import { computeFunnel } from '../src/lib/adminStats'
import { leadsToCsv, type LeadRow } from '../src/lib/adminLeads'

const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', ADMIN_TOKEN_SECRET: 's'.repeat(32) }
const post = (body: unknown, headers: Record<string, string> = {}) => new Request('https://a.test/api/track', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })

describe('konverziómérés', () => {
  beforeEach(() => { resetTrackRateLimit(); vi.restoreAllMocks() })

  it('ismert eseményt számol, ismeretlent elutasít', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }))
    expect((await handleTrack(post({ tenantId: 'demo', name: 'open' }), env)).status).toBe(204)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    for (const name of ['pdf', 'ar', 'share']) expect((await handleTrack(post({ tenantId: 'demo', name }), env)).status).toBe(204)
    expect((await handleTrack(post({ tenantId: 'demo', name: 'hack' }), env)).status).toBe(422)
    expect((await handleTrack(post({ tenantId: 'nincs-ilyen', name: 'open' }), env)).status).toBe(422)
  })

  it('botot és adattár nélküli környezetet csendben kihagy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }))
    expect((await handleTrack(post({ tenantId: 'demo', name: 'open' }, { 'user-agent': 'Googlebot' }), env)).status).toBe(204)
    expect((await handleTrack(post({ tenantId: 'demo', name: 'open' }), {})).status).toBe(204)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a statisztika csak tokennel érhető el, a saját tenantra szűrve', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([{ day: '2026-11-01', name: 'open', count: 3 }]), { status: 200 }))
    expect((await handleAdminStats(new Request('https://a.test/api/admin-stats'), env)).status).toBe(401)
    const token = await signToken(env.ADMIN_TOKEN_SECRET, 'demo')
    const response = await handleAdminStats(new Request('https://a.test/api/admin-stats?days=30', { headers: { authorization: `Bearer ${token}` } }), env)
    expect(response.status).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toContain('tenant_id=eq.demo')
  })

  it('tölcsér: lépésarányok és konverzió', () => {
    const funnel = computeFunnel([{ day: 'a', name: 'open', count: 100 }, { day: 'b', name: 'open', count: 100 }, { day: 'a', name: 'configure', count: 100 }, { day: 'a', name: 'lead_view', count: 40 }, { day: 'a', name: 'lead_start', count: 20 }], 10)
    expect(funnel.steps.map((step) => step.count)).toEqual([200, 100, 40, 20, 10])
    expect(funnel.steps[1].rate).toBe(0.5)
    expect(funnel.conversion).toBe(0.05)
    expect(computeFunnel([], 3).conversion).toBeNull()
  })

  it('CSV: idézőjelek, sortörés és BOM kezelése', () => {
    const lead = { ref: 'DEMO-1', created_at: '2026-11-01T10:00:00Z', customer_name: 'Kiss "Béla"', phone: '+36 30', email: 'a@b.hu', postal_code: '9700', city: 'Szombathely', region: 'Vas', address: null, estimate_gross: 1000, status: 'new', notes: 'sor1\nsor2', owner_note: null, config_url: 'https://x', source: 's', config: null } as LeadRow
    const csv = leadsToCsv([lead])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('"Kiss ""Béla"""')
    expect(csv).toContain('"sor1 sor2"')
    expect(csv).toContain('"Új"')
  })
})
