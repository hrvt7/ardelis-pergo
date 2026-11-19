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
  it('asztalon/tableten alul a sáv, telefonon a lap tetején a vékony lépésjelző', () => {
    expect(studio).toContain('{frame && !isNarrow && !immersive && <StepBar step={step} onStep={goStep} />}')
    expect(studio).toContain('bar={isNarrow ? <StepStrip step={step} onStep={goStep} /> : undefined}')
  })
})

describe('telefonos lépésjelző (vékony sáv)', () => {
  const strip = read('src/components/rebuild/StepStrip.tsx')
  const css = read('src/components/rebuild/rebuild.css')
  it('hét szegmens, a lépés neve a világító szegmens közepe alatt (sorszám nélkül), koppintásra lenyíló lépéslista', () => {
    expect(css).toContain('.rb-strip-label { transform: translateX(-50%);')
    expect(strip).not.toContain('/{count}</b>')
    expect(strip).not.toContain('translateX(-${count')
    expect(strip).toContain('left: `${((index + 0.5) / count) * 100}%`')
    expect(strip).toContain('aria-expanded={open} aria-controls="rb-strip-menu"')
    expect(strip).toContain("onClick={() => { setOpen(false); onStep(item.id) }}")
    expect(css).toMatch(/\.rb-strip-bars i \{ height: 4px;/)
  })
  it('a lista minden sora legalább 44 px magas, a sáv koppintási felülete is', () => {
    expect(css).toMatch(/\.rb-strip-toggle \{[^}]*min-height: 44px;/)
    expect(css).toMatch(/\.rb-strip-menu button \{[^}]*min-height: 44px;/)
  })
})

describe('reflektoros jelölés (Ádám mintája)', () => {
  const css = readFileSync(new URL('../src/components/rebuild/rebuild.css', import.meta.url), 'utf8')
  const strip = readFileSync(new URL('../src/components/rebuild/StepStrip.tsx', import.meta.url), 'utf8')
  it('asztali lépéssáv és bal eszköztár: lime fénycsík a szélen, fénykúp, izzó ikon', () => {
    expect(css).toContain('.rb-stepbar-pill::before')
    expect(css).toContain('.rb-stepbar-pill::after')
    expect(css).toContain('.rb-rail-bar button.is-open::before')
    expect(css).toContain('.rb-stepbar button.is-current svg { filter: drop-shadow')
  })
  it('telefon: a vékony csíkon az aktuális szegmensből fénykúp csúszik a lépéssel, a listában fénycsík', () => {
    expect(strip).toContain('<span className="rb-strip-beam" style={{ transform: `translate3d(calc(${index} * (100% + 4px)), 0, 0)` }} />')
    expect(css).toContain('.rb-strip-beam::before')
    expect(css).toContain('.rb-strip-menu button.is-current::before')
  })
})
