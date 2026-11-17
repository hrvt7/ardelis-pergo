import { describe, expect, it } from 'vitest'
import { installationModel, isOverdue, serviceStats, type StatsInstallation, type StatsRequest } from '../src/lib/serviceStats'
import { demoServiceInstallations, demoServiceRequests } from '../src/lib/adminDemo'

const NOW = new Date('2026-11-17T10:00:00')
const inst = (id: number, model: string, keys: string[]): StatsInstallation => ({
  id, product: 'pergola', headline: `${model} · 4 × 3 m`,
  components: keys.map((key) => ({ key, label: key === 'roof' ? `Tető: ${model}` : key === 'heaters' ? 'Fűtőpanel (2 db)' : key.startsWith('side-') ? `${key}: ZIP` : key, group: 'electronics' as const })),
})
const req = (id: number, installationId: number, component: string, extra: Partial<StatsRequest> = {}): StatsRequest => ({ id, installationId, component, status: 'new', createdAt: '2026-11-10T09:00:00', ...extra })

describe('szervizjegy: késés', () => {
  it('csak a nyitott, lejárt határidejű jegy késik', () => {
    expect(isOverdue({ status: 'new', dueDate: '2026-11-16' }, '2026-11-17')).toBe(true)
    expect(isOverdue({ status: 'new', dueDate: '2026-11-17' }, '2026-11-17')).toBe(false)
    expect(isOverdue({ status: 'closed', dueDate: '2026-11-01' }, '2026-11-17')).toBe(false)
    expect(isOverdue({ status: 'in_progress', dueDate: null }, '2026-11-17')).toBe(false)
  })
})

describe('hibastatisztika', () => {
  const installations = [inst(1, 'Aero', ['frame', 'roof', 'roof-drive', 'side-front', 'side-left']), inst(2, 'Aero', ['frame', 'roof', 'roof-drive']), inst(3, 'Lumen', ['frame', 'roof', 'heaters']), inst(4, 'Lumen', ['frame', 'roof'])]
  const requests = [
    req(1, 1, 'roof-drive', { status: 'closed', createdAt: '2026-11-01T09:00:00', closedAt: '2026-11-03T09:00:00', warrantyCase: true, costNet: 100000, laborMinutes: 90, outcome: 'fixed' }),
    req(2, 1, 'roof-drive', { status: 'closed', createdAt: '2026-10-05T09:00:00', closedAt: '2026-10-11T09:00:00', warrantyCase: false, costNet: 20000, laborMinutes: 30, outcome: 'temporary' }),
    req(3, 2, 'roof-drive', { status: 'in_progress', dueDate: '2026-11-12' }),
    req(4, 1, 'side-left'),
    req(5, 3, 'heaters', { dueDate: '2026-11-30' }),
    req(6, 3, 'other'),
  ]
  const stats = serviceStats(requests, installations, NOW)

  it('állapotok, késés és a megoldási idő mediánja (napban)', () => {
    expect(stats).toMatchObject({ total: 6, open: 4, closed: 2, overdue: 1, medianDays: 4 })
  })
  it('komponensenként: darab, telepített darab és arány; az oldalzárások egy sorban', () => {
    const drive = stats.byComponent.find((row) => row.key === 'roof-drive')!
    expect(drive).toMatchObject({ label: 'roof-drive', count: 3, installed: 2, rate: 1.5 })
    expect(stats.byComponent[0].key).toBe('roof-drive')
    expect(stats.byComponent.find((row) => row.key === 'side')).toMatchObject({ label: 'Oldalzárás', count: 1, installed: 1 })
    expect(stats.byComponent.find((row) => row.key === 'heaters')?.label).toBe('Fűtőpanel')
    // Az „Egyéb / nem tudom” bejelentés megjelenik, de nincs telepített nevezője.
    expect(stats.byComponent.find((row) => row.key === 'other')).toMatchObject({ count: 1, installed: 0, rate: null })
  })
  it('modellenként a tetőrendszer neve szerint', () => {
    expect(installationModel(installations[0])).toBe('Aero')
    expect(stats.byModel).toEqual([
      { key: 'Aero', label: 'Aero', count: 4, installed: 2, rate: 2 },
      { key: 'Lumen', label: 'Lumen', count: 2, installed: 2, rate: 1 },
    ])
  })
  it('visszatérő hiba: ugyanaz a termék és komponens legalább kétszer', () => {
    expect(stats.repeats).toEqual([{ installationId: 1, component: 'roof-drive', label: 'roof-drive', count: 2 }])
  })
  it('költség: garanciális és fizetős külön, munkaidő órában, eredmények', () => {
    expect(stats.costs).toEqual({ warranty: 100000, paid: 20000, laborHours: 2, withCost: 2 })
    expect(stats.outcomes).toMatchObject({ fixed: 1, temporary: 1, not_fixed: 0, no_fault: 0 })
  })
  it('az utolsó 6 hónap havonta, a legrégebbitől', () => {
    expect(stats.months.map((month) => month.month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(stats.months.at(-1)!.count).toBe(5)
    expect(stats.months.at(-2)!.count).toBe(1)
  })
  it('kis mintánál nem megbízható; üres adatnál sem hibázik', () => {
    expect(stats.reliable).toBe(false)
    const empty = serviceStats([], [], NOW)
    expect(empty).toMatchObject({ total: 0, medianDays: null, byComponent: [], repeats: [], reliable: false })
  })
  it('a demó adatok konzisztensek: minden bejelentés létező telepítésre és annak komponensére mutat', () => {
    const now = NOW.getTime()
    const demoInst = demoServiceInstallations(now)
    const demoReq = demoServiceRequests(now)
    for (const item of demoReq) {
      const owner = demoInst.find((entry) => entry.id === item.installationId)
      expect(owner, `${item.id}`).toBeDefined()
      expect(owner!.components.some((component) => component.key === item.component), `${item.id} ${item.component}`).toBe(true)
    }
    const demoStats = serviceStats(demoReq, demoInst, NOW)
    expect(demoStats.reliable).toBe(true)
    expect(demoStats.overdue).toBeGreaterThan(0)
    expect(demoStats.repeats.length).toBeGreaterThan(0)
  })
})
