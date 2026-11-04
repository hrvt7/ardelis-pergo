import { describe, expect, it } from 'vitest'
import { computeLeadStats, type LeadRow } from '../src/lib/adminLeads'

const now = Date.parse('2026-11-04T12:00:00Z')
const lead = (over: Partial<LeadRow>): LeadRow => ({ ref: 'R', customer_name: 'T', email: 'a@b.hu', phone: '123456', postal_code: null, city: 'Sárvár', region: 'Vas', address: null, notes: null, estimate_gross: 1000000, config_url: 'x', status: 'new', source: 's', created_at: '2026-11-04T08:00:00Z', config: { roof: 'louvered' }, ...over })

describe('computeLeadStats', () => {
  it('üres listára biztonságos', () => {
    const s = computeLeadStats([], now)
    expect(s.total).toBe(0)
    expect(s.winRate).toBeNull()
    expect(s.daily).toHaveLength(30)
  })
  it('mutatókat számol', () => {
    const s = computeLeadStats([
      lead({ ref: '1' }),
      lead({ ref: '2', status: 'won', estimate_gross: 3000000, config: { roof: 'glass' }, created_at: '2026-10-20T08:00:00Z' }),
      lead({ ref: '3', status: 'lost', city: 'Vép' }),
    ], now)
    expect(s.total).toBe(3)
    expect(s.fresh).toBe(1)
    expect(s.last7).toBe(2)
    expect(s.averageGross).toBe(1666667)
    expect(s.openValue).toBe(1000000)
    expect(s.winRate).toBe(0.5)
    expect(s.daily.at(-1)?.count).toBe(2)
    expect(s.byRoof[0]).toEqual({ key: 'louvered', count: 2 })
    expect(s.byPlace[0]).toEqual({ key: 'Sárvár', count: 2 })
  })
})
