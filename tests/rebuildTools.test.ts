import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const studio = read('src/pages/PergoStudio.tsx')
const rebuildBranch = studio.slice(studio.indexOf('  if (rebuild) {'), studio.indexOf('  return (\n    <div className={`app-shell layout-a'))

describe('új felület: visszavonás, bemutató, döntéstámogatók (M04, M16, M17)', () => {
  it('M04: visszavonás, újra és alaphelyzet a közös történettel, az alaphelyzet megerősítéssel', () => {
    expect(rebuildBranch).toContain('<HistoryBar compact={isNarrow} canUndo={history.current.past.length > 0} canRedo={history.current.future.length > 0} onUndo={undo} onRedo={redo} onReset={() => setModal(\'reset\')} />')
    expect(rebuildBranch).toContain('{studioDialogs}')
    expect(studio).toMatch(/const studioDialogs = <>[\s\S]*modal === 'reset'/)
  })
  it('M16: a bal sín Bemutató panelje minden élményt elér, és teljes képernyőn a panelek eltűnnek', () => {
    for (const id of ["id: 'sun'", "id: 'photo'", "id: 'ar'", "id: 'walk'", "id: 'rain'", "id: 'mechanism'", "id: 'present'"]) expect(rebuildBranch).toContain(id)
    expect(rebuildBranch).toContain('<SceneRail showcase={showcase}')
    expect(rebuildBranch).toContain('const immersive = walking || presentation')
    expect(rebuildBranch).toContain('{frame && !immersive && <StepCard')
    expect(rebuildBranch).toContain('<WalkOverlay')
    expect(rebuildBranch).toContain('<PhotoBar')
    expect(read('src/components/rebuild/SceneRail.tsx')).toContain("{ id: 'showcase' as const, icon: Presentation, label: tr('Bemutató', 'Vorführung') }")
  })
  it('M17: Tanácsadó az 1. lépésben, keretösszeg az árnál és az összegzésben, üzemeltetés a Komfortban', () => {
    expect(rebuildBranch).toContain("onAdvisor={() => setModal('advisor')}")
    expect(rebuildBranch).toContain("onBudget={() => setModal('budget')}")
    expect(rebuildBranch).toContain('onEnergy={openEnergy}')
    expect(read('src/components/rebuild/ProductStep.tsx')).toContain("onAdvisor && building !== 'carport'")
  })
})
