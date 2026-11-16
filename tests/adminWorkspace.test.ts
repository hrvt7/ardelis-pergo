// Gyártói munkaterület (4.73): a kártyák adatai valódiak – pontszám, viselkedési jelek, teendők a státuszból és korból.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { engagementChips, interestDots, todayTasks } from '../src/lib/workspace'
import { scoreLead } from '../src/lib/leadScore'
import type { LeadRow } from '../src/lib/adminLeads'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 16, 12)
const lead = (over: Partial<LeadRow>): LeadRow => ({ ref: 'X-1', customer_name: 'Teszt Elek', email: 't@example.hu', phone: '+36 30 000 0000', postal_code: null, city: 'Sopron', region: '', address: null, notes: null, estimate_gross: 5_000_000, config_url: '/k/demo', status: 'new', source: 'konfigurator', created_at: new Date(NOW).toISOString(), ...over })

describe('munkaterület – valódi adatokból', () => {
  it('az érdeklődés pöttyei a lead-pontszámot követik (0 pont → 0 pötty, 100 → 5)', () => {
    expect(interestDots(0)).toBe(0)
    expect(interestDots(1)).toBe(1)
    expect(interestDots(55)).toBe(3)
    expect(interestDots(100)).toBe(5)
    const hot = lead({ engagement: { pdf: true, ar: true, visits: 3, steps: 6, minutes: 12 } })
    expect(interestDots(scoreLead(hot).score)).toBeGreaterThanOrEqual(interestDots(scoreLead(lead({})).score))
  })

  it('a chipek csak a valóban megtörtént jeleket mutatják', () => {
    expect(engagementChips(lead({}))).toEqual(['Konfigurátor'])
    expect(engagementChips(lead({ engagement: { pdf: true, ar: true, share: true, visits: 2 } }))).toEqual(['Konfigurátor', 'PDF', 'AR', 'Megosztás', 'Visszatérő'])
  })

  it('a mai teendők a státuszból és a korból jönnek, a lejárt jelölés határidő szerint', () => {
    const tasks = todayTasks([
      lead({ ref: 'A', status: 'new', created_at: new Date(NOW - 3 * DAY).toISOString() }),
      lead({ ref: 'B', status: 'new', created_at: new Date(NOW - 2 * 3600_000).toISOString() }),
      lead({ ref: 'C', status: 'contacted', created_at: new Date(NOW - 4 * DAY).toISOString() }),
      lead({ ref: 'D', status: 'contacted', created_at: new Date(NOW - 1 * DAY).toISOString() }),
      lead({ ref: 'E', status: 'offered', created_at: new Date(NOW - 8 * DAY).toISOString() }),
      lead({ ref: 'F', status: 'won', created_at: new Date(NOW - 9 * DAY).toISOString() }),
    ], NOW)
    expect(tasks.map((task) => task.lead.ref)).toEqual(['A', 'B', 'E', 'C'])
    expect(tasks.find((task) => task.lead.ref === 'A')).toMatchObject({ title: 'Első hívás', overdue: true })
    expect(tasks.find((task) => task.lead.ref === 'B')).toMatchObject({ why: 'Ma érkezett', overdue: false })
    expect(tasks.find((task) => task.lead.ref === 'E')).toMatchObject({ title: 'Ajánlat nyomon követése', overdue: true })
  })

  it('a felület: sötét munkaterület-téma, Vanilla kiemelő (egy változóban), kerek gombok a sarokkivágásban, fotó helyett monogram', () => {
    const css = readFileSync('src/admin-workspace.css', 'utf8')
    const ws = readFileSync('src/components/admin/Workspace.tsx', 'utf8')
    expect(css).toMatch(/--ws-accent: #EFF0A3/)
    expect(css).toMatch(/mask: radial-gradient\(circle 33px at calc\(100% - 30px\) 30px/)
    expect(ws).toMatch(/className="ws-avatar">\{initials\(lead\.customer_name\)\}/)
    expect(ws).not.toMatch(/<img/)
    expect(ws).toMatch(/href=\{`tel:\$\{phone\}`\}/)
    expect(readFileSync('src/pages/AdminOverview.tsx', 'utf8')).toMatch(/<Workspace leads=\{leads\}/)
  })
})
