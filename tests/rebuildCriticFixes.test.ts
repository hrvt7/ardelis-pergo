import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REBUILD_STEPS } from '@/lib/rebuildSteps'

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
const css = read('src/components/rebuild/rebuild.css')

describe('kritikus kör javításai – új konfigurátor (5.28)', () => {
  it('telefonon a lépéslap alapból nyitva, összecsukva is látszik a lépéssáv és a kérdés', () => {
    expect(read('src/pages/PergoStudio.tsx')).toContain('const [rebuildSheetOpen, setRebuildSheetOpen] = useState(true)')
    expect(css).toMatch(/\.rb-stepcard\.is-sheet:not\(\.is-open\) \.rb-dock, \.rb-stepcard\.is-sheet:not\(\.is-open\) \.rb-stepcard-head \{ display: block; \}/)
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
    expect(studio).not.toContain("step !== 'summary' && <PriceBar")
    expect(studio).toContain('variant="rebuild"')
    const card = read('src/components/rebuild/StepCard.tsx')
    expect(card).not.toContain("tr('Felmérést kérek'")
    const panel = read('src/components/SummaryPanel.tsx')
    expect(panel).toContain("{!rebuild && <div className=\"showroom-image\">")
    expect(panel).toContain("submitLabel={rebuild ? tr('Elküldöm', 'Absenden') : undefined}")
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

describe('kritikus kör, 2. forduló', () => {
  it('az ár és az ajánlatkérés a lépéslap láblécében van, nem lebegő szigeten', () => {
    const card = read('src/components/rebuild/StepCard.tsx')
    expect(card).toContain('{next && !compact && price}')
    expect(card).toContain('{next && compact && price}')
    expect(card).toContain("tr('Ajánlatot kérek', 'Angebot anfragen')")
    expect(read('src/pages/PergoStudio.tsx')).toContain('price={moduleVisible(\'M05\', true) ? <PriceBar')
  })

  it('a tételes kalkuláció külön lapon nyílik, a tájékoztató mindig látszik, és jelzi a nettó/bruttó alapot', () => {
    const bar = read('src/components/rebuild/PriceBar.tsx')
    expect(bar).toContain('createPortal(')
    expect(bar).toContain('rb-price-basis')
    expect(bar).toContain('rb-price-sheet-request')
    expect(css).toMatch(/\.rb-price-details-scroll \{ flex: 1; min-height: 0; overflow: auto; \}/)
    expect(css).toMatch(/\.rb-price-sheet \.rb-price-note \{ flex: none;/)
  })

  it('egy kiválasztva-jel a jobb felső sarokban, a lime csak az aktuális lépésé', () => {
    expect(css).toMatch(/\.rb-option-check, \.rb-option\.rb-roof \.rb-option-check, \.rb-option\.rb-preset \.rb-option-check \{ position: absolute; top: 10px; right: 10px;/)
    expect(css).toMatch(/\.rb-arc-fill \{ stroke: var\(--rb-ink\); \}/)
    expect(css).toMatch(/\.rb-slider-track i \{ background: linear-gradient\(90deg, #3a3e43, var\(--rb-ink\)\); \}/)
  })

  it('telefonos lépéssáv a lépés nevével, 44 px-es eszköztár-fül, nagy űrlapmezők', () => {
    expect(read('src/components/rebuild/StepDock.tsx')).toContain('className="rb-dock-label"')
    expect(css).toMatch(/\.rb-rail-tab \{ width: 44px;/)
    expect(css).toMatch(/\.rb-summary-legacy \.lead-grid input, [^{]+\{ min-height: 44px;/)
    expect(css).toMatch(/\.rb-summary-legacy \.consent-row input \{ width: 22px; height: 22px;/)
  })

  it('csomagok teljes árral; az összegzés sorai nagybetűvel és RAL-kóddal', () => {
    expect(read('src/components/rebuild/ProductStep.tsx')).toContain('rb-preset-price')
    const summary = read('src/lib/rebuildSummary.ts')
    expect(summary).toContain("'Periméter LED'")
  })
})
