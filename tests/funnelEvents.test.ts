import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { FUNNEL_EVENTS, sceneEvent, stepEvent } from '../src/lib/funnelEvents'
import { TRACK_EVENTS } from '../server/analytics'
import { eventTotals, SCENE_SPEED, STEP_REACH } from '../src/lib/statsFunnel'
import { STEPS } from '../src/lib/configSteps'

describe('lépésenkénti és betöltési mérés', () => {
  it('minden lépésnek (a Típus kivételével, az az „open”) van mérési eseménye', () => {
    for (const step of STEPS.slice(1)) expect(stepEvent(step.id), step.id).not.toBeNull()
    expect(stepEvent('size')).toBeNull()
    expect(stepEvent('nincs-ilyen')).toBeNull()
  })
  it('a betöltési idő három sávba esik, pontos ms nem megy ki', () => {
    expect(sceneEvent(1200)).toBe('scene_fast')
    expect(sceneEvent(4000)).toBe('scene_mid')
    expect(sceneEvent(10000)).toBe('scene_mid')
    expect(sceneEvent(10001)).toBe('scene_slow')
  })
  it('a szerver elfogadja az új eseményneveket', () => {
    for (const name of FUNNEL_EVENTS) expect(TRACK_EVENTS).toContain(name)
  })
  it('az admin összesíti a lépésenkénti elérést és a betöltési sávokat', () => {
    const rows = [{ day: '2026-11-15', name: 'open', count: 10 }, { day: '2026-11-16', name: 'open', count: 5 }, { day: '2026-11-15', name: 'step_roof', count: 6 }, { day: '2026-11-15', name: 'scene_slow', count: 2 }]
    const steps = eventTotals(rows, STEP_REACH)
    expect(steps[0]).toEqual({ key: 'open', label: 'Típus', count: 15 })
    expect(steps.find((step) => step.key === 'step_roof')?.count).toBe(6)
    expect(eventTotals(rows, SCENE_SPEED).map((item) => item.count)).toEqual([0, 0, 2])
  })
  it('a hibás beküldési kísérlet mérése az űrlapban', () => {
    expect(readFileSync('src/components/LeadForm.tsx', 'utf8').match(/track\(tenant\.id, 'lead_error'\)/g)?.length).toBe(2)
  })
})

describe('admin (audit H17–H20)', () => {
  const admin = readFileSync('src/pages/AdminPage.tsx', 'utf8')
  it('a belépésnél van segítség elfelejtett jelszóhoz, a tárhely-hiba nem fejlesztői szöveg', () => {
    expect(admin).toMatch(/Elfelejtette a jelszót\?/)
    expect(admin).not.toMatch(/\(Supabase\)/)
    expect(readFileSync('server/tenantAdmin.ts', 'utf8')).not.toMatch(/Az adattár \(Supabase\)/)
  })
  it('az áttekintés kártyacímei h2-k (h1 után nincs ugrás h3-ra)', () => {
    const overview = readFileSync('src/pages/AdminOverview.tsx', 'utf8')
    expect(overview).not.toMatch(/<header><h3>/)
  })
  it('mobilon a rejtett fejlécsor nem hagy üres sávot, a gombfelirat nem törik', () => {
    const css = readFileSync('src/admin-premium.css', 'utf8')
    expect(css).toMatch(/\.table \.tr-wrap:has\(> \.tr\.th\)\{display:none\}/)
    expect(css).toMatch(/\.admin-light \.btn\{white-space:nowrap\}/)
  })
})
