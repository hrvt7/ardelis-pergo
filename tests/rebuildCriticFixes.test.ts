import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REBUILD_STEPS } from '@/lib/rebuildSteps'

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
const css = read('src/components/rebuild/rebuild.css')

describe('kritikus kör javításai – új konfigurátor (5.28)', () => {
  it('telefonon a lépéslap alapból nyitva, összecsukva is látszik a lépéssáv és a kérdés', () => {
    expect(read('src/pages/PergoStudio.tsx')).toContain('const [rebuildSheetOpen, setRebuildSheetOpen] = useState(true)')
    expect(css).toMatch(/\.rb-stepcard\.is-sheet:not\(\.is-open\) \.rb-dock, \.rb-stepcard\.is-sheet:not\(\.is-open\) \.rb-stepcard-head \{ display: block; \}/)
    expect(css).toMatch(/\.rb-sheet-handle::before \{[^}]*top: -10px; bottom: -8px;/)
  })

  it('lépésváltáskor a panel a tetejéről indul, a görgetett tartalom elhalványul a szélen', () => {
    expect(read('src/components/rebuild/StepCard.tsx')).toContain('useEffect(() => { if (body.current) body.current.scrollTop = 0 }, [step])')
    expect(css).toMatch(/\.rb-stepcard-body \{ -webkit-mask-image: linear-gradient/)
  })

  it('egy lépésnév mindenhol és érthető 6. kérdés', () => {
    const mount = REBUILD_STEPS.find((step) => step.id === 'mount')!
    expect(mount.label).toBe(mount.short)
    expect(REBUILD_STEPS.find((step) => step.id === 'extras')!.question).toBe('Mi kerüljön még bele?')
  })

  it('az összegzésen egy ajánlatkérő gomb van, az ár egyszer szerepel, üres képhely nincs', () => {
    const studio = read('src/pages/PergoStudio.tsx')
    expect(studio).toContain("step !== 'summary' && <PriceBar")
    expect(studio).toContain('variant="rebuild"')
    const card = read('src/components/rebuild/StepCard.tsx')
    expect(card).not.toContain("tr('Felmérést kérek'")
    const panel = read('src/components/SummaryPanel.tsx')
    expect(panel).toContain("{!rebuild && <div className=\"showroom-image\">")
    expect(panel).toContain("submitLabel={rebuild ? tr('Ajánlatot kérek', 'Angebot anfragen') : undefined}")
  })

  it('oldaltípusok olvasható listában, minden soron felárral', () => {
    const sides = read('src/components/rebuild/SidesStep.tsx')
    expect(sides).not.toContain('ArcPicker')
    expect(sides).toContain('typePicker={listTypes}')
  })

  it('komfortopciók ára egységesen a teljes ár változása, „fm” nélkül', () => {
    const comfort = read('src/components/rebuild/ComfortStep.tsx')
    expect(comfort).not.toMatch(/\/ fm/)
    expect(comfort).not.toContain("'db, bruttó'")
    expect(comfort).toContain('const cost = (on: Partial<PergolaConfig>, off: Partial<PergolaConfig>) => signedPrice(gross(on) - gross(off))')
  })

  it('egy „kiválasztva” jel: sötét pipa; a lime nem jelöl jelvényt, árat, kész-pontot', () => {
    expect(css).toMatch(/\.rb-option-check \{ background: var\(--rb-ink\); color: #fff; \}/)
    expect(css).toMatch(/\.rb-summary-total strong \{ color: #fff; \}/)
    expect(css).toMatch(/\.rb-badge \{ background: rgba\(21, 23, 26, \.08\)/)
  })

  it('érintésen legalább 44 px-es vezérlők, legalább 12 px-es szöveg', () => {
    const coarse = css.slice(css.lastIndexOf('@media (pointer: coarse)'))
    for (const rule of ['.rb-segmented button { height: 44px; }', '.rb-stepper button { width: 44px; height: 44px; }', '.rb-price.is-compact .rb-price-request { height: 44px;']) expect(coarse).toContain(rule)
    expect(css).toMatch(/\.rb-stepbar button span \{ font-size: 12px; \}/)
    expect(css).toMatch(/\.rb-rail-bar button span \{ font-size: 12px; \}/)
  })
})
