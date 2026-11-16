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
    expect(tasks.find((task) => task.lead.ref === 'E')).toMatchObject({ title: 'Ajánlat követése', overdue: true })
  })

  it('a felület: sötét munkaterület-téma, Vanilla kiemelő, fordított sugarú kivágás maszk nélkül, fotó helyett monogram', () => {
    const css = readFileSync('src/admin-workspace.css', 'utf8')
    const ws = readFileSync('src/components/admin/Workspace.tsx', 'utf8')
    expect(css).toMatch(/--ws-accent: #EFF0A3/)
    // A korábbi maszk elfedte a gombokat és „fekete foltot” hagyott: a kivágás most a felület színével festett fül.
    expect(css).not.toMatch(/mask:/)
    expect(css).toMatch(/\.ws-notch::before, \.ws-notch::after/)
    expect(ws).toMatch(/className="ws-avatar">\{initials\(lead\.customer_name\)\}/)
    expect(ws).not.toMatch(/<img/)
    expect(readFileSync('src/pages/AdminOverview.tsx', 'utf8')).toMatch(/<Workspace leads=\{leads\}/)
  })

  it('UX-kör: a teendők jönnek először, rácsban (nincs vízszintes görgetés), minden kártyán hívás; nincs ismétlődő KPI-sor', () => {
    const ws = readFileSync('src/components/admin/Workspace.tsx', 'utf8')
    const css = readFileSync('src/admin-workspace.css', 'utf8')
    const overview = readFileSync('src/pages/AdminOverview.tsx', 'utf8')
    expect(ws.indexOf('id="ws-tasks"')).toBeGreaterThan(0)
    expect(ws.indexOf('id="ws-tasks"')).toBeLessThan(ws.indexOf('id="ws-new"'))
    expect(ws).not.toMatch(/ws-track/)
    expect(css).not.toMatch(/overflow-x: auto; padding: 4px 2px 12px/)
    expect((ws.match(/href=\{tel\(lead\)\}/g) ?? []).length).toBe(2)
    expect(overview).not.toMatch(/className="kpis"/)
    expect(overview).not.toMatch(/Legfrissebb|Státuszok/)
    expect(overview).toMatch(/<details className="card span-2 dash-more">/)
    // 2. forduló: a napi grafikon egyenes szakaszokkal, nem kitalált hullámokkal; csak egy Vanilla kártya
    expect(overview).not.toMatch(/smoothPath/)
    expect(ws).not.toMatch(/ws-stat is-accent/)
  })

  it('UX-kör: egy hangcsalád az állapotokra (nincs szivárvány-zöld/piros), és nincs fejlesztői szakszó a mentési hibában', async () => {
    const { STATUS_COLORS } = await import('../src/lib/adminLeads')
    const { TIER_COLORS } = await import('../src/lib/leadScore')
    expect(STATUS_COLORS.new).toBe('#EFF0A3')
    expect(Object.values({ ...STATUS_COLORS, ...TIER_COLORS })).not.toContain('#ff8a80')
    expect(Object.values({ ...STATUS_COLORS, ...TIER_COLORS })).not.toContain('#59d499')
    const page = readFileSync('src/pages/AdminPage.tsx', 'utf8')
    expect(page).not.toMatch(/szerver tárhelye/)
    expect(page).toMatch(/A mentés most nem működik/)
  })
})
