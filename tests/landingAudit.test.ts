// A 2026-11-16-i független kritikus-audit (docs/landing/AUDIT-2026-11-16.md) javításainak őrei.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { PLATFORM_COPY } from '../src/i18n/platformCopy'
import { PLANS, SETUP_FEE } from '../src/lib/platformPricing'

const read = (path: string) => readFileSync(path, 'utf8')
const page = read('src/pages/Platform.tsx')
const css = read('src/landing.css')
const hu = PLATFORM_COPY.hu
const en = PLATFORM_COPY.en
const start = PLANS.find((plan) => plan.id === 'start')!
const pro = PLANS.find((plan) => plan.id === 'pro')!

describe('nyitóoldal-audit javításai (4.71)', () => {
  it('a demókérő űrlap és a GYIK csak egyszer szerepel (korábban duplán, kétszeres id="demo")', () => {
    expect(page.match(/id="demo"/g)).toHaveLength(1)
    expect(page.match(/<FaqChat /g)).toHaveLength(1)
  })

  it('a héró első képernyőjén mindhárom érv ott van, a havidíj egyezik a Start árával', () => {
    expect(hu.hero.proof).toHaveLength(3)
    expect(hu.hero.proof[0]).toContain('59 000 Ft')
    expect(start.monthly).toBe(59_000)
    expect(hu.hero.proof[1]).toMatch(/PDF.*QR/)
    expect(hu.hero.proof[2]).toMatch(/5–10 munkanap.*hűségidő nélkül/)
    expect(en.hero.proof[0]).toContain('59,000')
  })

  it('az árak egy képernyőn: minden csomag ára a fülön, a bevezetés és az áfa a kártyán', () => {
    const plans = read('src/components/landing/PlanSwitch.tsx')
    expect(plans).toMatch(/<small>\{monthlyPrice\(item, annual\) === null \? pr\.custom/)
    expect(plans).toMatch(/pr\.extraNote\(formatMoney\(SETUP_FEE, lang\)\)/)
    expect(hu.pricing.extraNote('490 000 Ft')).toContain('+27% áfa')
    expect(SETUP_FEE).toBe(490_000)
  })

  it('a GYIK árai pontosan a valódi csomagárak', () => {
    const answer = hu.faq.items[0].a
    expect(answer).toContain('59 000 Ft')
    expect(answer).toContain('119 000 Ft')
    expect(answer).toContain('490 000 Ft')
    expect(pro.monthly).toBe(119_000)
  })

  it('a megtérülés-kalkulátor eredménye „becsült”, és a látható Start csomaggal indul', () => {
    expect(hu.roi.netPos).toMatch(/^Becsült/)
    expect(hu.roi.barGain(3)).toMatch(/^Becsült/)
    expect(en.roi.netPos).toMatch(/^Estimated/)
    const roi = read('src/components/platform/LandingSections.tsx')
    expect(roi).toMatch(/useState<Exclude<PlanId, 'partner'>>\('start'\)/)
  })

  it('nincs túlígérés: az előtte–utána kép bemutató jelenet, nem „egy fotóból”; az ajánlat nem „generálódik”', () => {
    expect(page).not.toMatch(/egy fotóból/)
    expect(page).not.toMatch(/Az ajánlat generálódik/)
    expect(page).toMatch(/A kép bemutató jelenet/)
    expect(hu.final.title.join('')).not.toMatch(/Nem még egy/)
  })

  it('egy hangnem: magázó gombfelirat, a redőny mondata nem ismétli a következő címet', () => {
    expect(hu.live.activate).toBe('Kattintson a kipróbáláshoz')
    expect(hu.v2.hero.louver.join('')).not.toMatch(/Hét lépés/)
  })

  it('közös rács, egységes címméret, palettán belüli színek, legalább 13 px szöveg', () => {
    expect(css).toMatch(/\.lx-page \.lx-build-sticky, \.lx-page \.lx-problem-sticky, \.lx-page \.lx-compare-section, \.lx-page \.lx-stats, \.lx-page \.lx-stats-lead \{ max-width: var\(--pf-max\)/)
    expect(css).toMatch(/main > section:not\(\.lx-final\) h2[^{]*\{ font-size: clamp\(34px, 4\.3vw, 62px\)/)
    expect(css).toMatch(/@keyframes sv-brand \{ 0% \{ background: #EFF0A3; \} 33\.3% \{ background: #CFDECA; \}/)
    expect(css).toMatch(/\.lx-eyebrow, \.lx-page \.roi-kicker \{ font-size: 13px; \}/)
    expect(css).toMatch(/\.lx-cloud \{ -webkit-mask-image/)
  })

  it('a probléma-kollázs lapjai a saját mezőjükben maradnak (nem csúsznak a címre)', () => {
    expect(css).toMatch(/\.lx-problem-field \{ position: relative; height: min\(64vh, 560px\); container-type: size; \}/)
    expect(css).not.toMatch(/var\(--x\) \* \.62vw/)
  })

  it('a „Miért éri meg?” rajzai a termék geometriájából készülnek, nem általános ikonok', () => {
    const why = read('src/components/landing/WhyStrip.tsx')
    expect(why).toMatch(/key="huf"[\s\S]*M12 14v8M18 14v8/)
    expect(why).not.toMatch(/key="home"|key="days"/)
  })

  it('2. kör: a „Hét lépés” címkéje a cím fölött, a redőny a gyártóhoz szól, a becslések jelölve', () => {
    expect(css).toMatch(/\.lx-build-head \.lx-eyebrow \{ grid-column: 1 \/ -1; position: static; transform: none;/)
    expect(hu.v2.hero.louverLabel).toBe('A gyártó oldalán')
    expect(hu.pricing.sub).toMatch(/^Becslésünk szerint/)
    expect(hu.hero.proof[0]).toMatch(/egyszeri bevezetés/)
    expect(read('src/components/landing/Hero.tsx')).toMatch(/\{h\.chipA\.label\}<em className="lx-example">/)
    expect(css).toMatch(/\.lx-page \.roi-bar\.is-gain i \{ background: linear-gradient\(90deg, #212121, #3A3C41\)/)
  })
})
