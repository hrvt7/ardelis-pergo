import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('asztali lépéssáv', () => {
  const bar = read('src/components/rebuild/StepBar.tsx')
  const studio = read('src/pages/PergoStudio.tsx')
  it('a hét lépés ikonnal és rövid névvel, egy sorban, az aktuálist pirula jelöli', () => {
    expect(bar).toContain('REBUILD_STEPS.map')
    expect(bar).toContain('<StepIcon step={item.id}')
    expect(bar).toContain('<span>{item.short}</span>')
    expect(bar).toMatch(/aria-current=\{i === index \? 'step'/)
    expect(bar).toContain('translate3d(${index * 100}%, 0, 0)')
  })
  it('asztalon/tableten alul a sáv, telefonon a lap tetején marad a dokk', () => {
    expect(studio).toContain('{frame && !isNarrow && !immersive && <StepBar step={step} onStep={goStep} />}')
    expect(studio).toContain('bar={isNarrow ? <StepDock step={step} onStep={goStep} /> : undefined}')
  })
})
