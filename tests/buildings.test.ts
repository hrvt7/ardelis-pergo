import { describe, expect, it } from 'vitest'
import { describeConfig } from '../server/lead'
import { buildPdfDefinition } from '../src/lib/pdfDocument'
import { technicalDrawing } from '../src/lib/drawing'
import { availableBuildings, buildingIssues, buildingPatch, doorCount, effectiveWallGlazing, glassWallArea, permitNotes } from '../src/lib/buildings'
import { calculatePrice } from '../src/lib/pricing'
import { compactToJson, configToCompact } from '../src/lib/shareCode'
import { createTextSummary, getBom, getSpecCode } from '../src/lib/specification'
import { enabledRoofs, normalizeConfig, parseConfig, tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig } from '../src/types/pergola'

const prices = demoTenant.prices
const roofs = enabledRoofs(demoTenant)
const base: PergolaConfig = { ...demoTenant.defaultConfig, width: 5, depth: 4, height: 2.6, mount: 'wall', roof: 'glass', sides: { front: 'none', back: 'none', left: 'none', right: 'none' }, split: undefined, led: false, heaters: 0, speakers: false, sensors: false, fans: undefined, solar: undefined, roofShade: undefined, pitch: undefined, glazing: undefined }
const conservatory = (patch: Partial<PergolaConfig> = {}): PergolaConfig => normalizeConfig(demoTenant, { ...base, ...buildingPatch(base, 'conservatory', roofs, demoTenant.sides), ...patch })

describe('épülettípusok', () => {
  it('a demó gyártónál mindhárom típus elérhető; ajtó nélküli kínálatnál nincs télikert', () => {
    expect(availableBuildings(roofs, demoTenant.sides)).toEqual(['pergola', 'veranda', 'conservatory'])
    expect(availableBuildings(roofs, ['zip', 'glass'])).toEqual(['pergola', 'veranda'])
    expect(availableBuildings(['louvered'], demoTenant.sides)).toEqual(['pergola'])
  })

  it('télikert: üvegtető, lezárt oldalak, egy ajtó, dőlés, alap és klíma alapból', () => {
    const config = conservatory()
    expect(config.building).toBe('conservatory')
    expect(config.roof).toBe('glass')
    expect(config.pitch).toBe(3)
    expect(config.foundation).toBe(true)
    expect(config.climate).toBe('split')
    expect(config.sides.back).toBe('none') // fali oldal: nem épül
    const doors = doorCount(config)
    expect(doors.hinged + doors.sliding).toBe(1)
    expect(['front', 'left', 'right'].every((side) => config.sides[side as 'front'] !== 'none')).toBe(true)
    expect(buildingIssues(config).filter((issue) => issue.level === 'warn')).toHaveLength(0)
  })

  it('a normalizáció a mozgó tetőt és a nem szigetelő oldalfalat lecseréli', () => {
    const config = normalizeConfig(demoTenant, { ...base, building: 'conservatory', roof: 'louvered', sides: { front: 'zip', back: 'none', left: 'louver', right: 'slatAlu' } })
    expect(config.roof).toBe('glass')
    expect(config.sides).toMatchObject({ front: 'glassFixed', left: 'glassFixed', right: 'glassFixed' })
    const veranda = normalizeConfig(demoTenant, { ...base, building: 'veranda', roof: 'retractable' })
    expect(['glass', 'polycarbonate', 'fixed']).toContain(veranda.roof)
  })

  it('a zárt építmény mezői pergolánál elmaradnak, a télikert-mezők verandánál is', () => {
    const pergola = normalizeConfig(demoTenant, { ...base, wallGlazing: 'triple', climate: 'both', foundation: true })
    expect(pergola.building).toBeUndefined()
    expect(pergola.wallGlazing).toBeUndefined()
    expect(pergola.climate).toBeUndefined()
    expect(pergola.foundation).toBeUndefined()
    const veranda = normalizeConfig(demoTenant, { ...base, building: 'veranda', climate: 'split', foundation: true, wallGlazing: 'double' })
    expect(veranda.climate).toBeUndefined()
    expect(veranda.foundation).toBeUndefined()
    expect(veranda.wallGlazing).toBe('double')
    // Télikertben az edzett üveg nem választható, az alap (kétrétegű) nem külön tétel.
    expect(normalizeConfig(demoTenant, { ...conservatory(), wallGlazing: 'single' }).wallGlazing).toBeUndefined()
    expect(effectiveWallGlazing(conservatory())).toBe('double')
  })

  it('a gyártó kínálata nélkül a zárt típus pergolára esik vissza', () => {
    const limited = { ...demoTenant, sides: demoTenant.sides.filter((type) => type !== 'door' && type !== 'doorSliding') }
    expect(normalizeConfig(limited, { ...base, building: 'conservatory' }).building).toBeUndefined()
    expect(normalizeConfig({ ...demoTenant, roofs: { louvered: demoTenant.roofs.louvered } }, { ...base, building: 'veranda' }).building).toBeUndefined()
  })
})

describe('ajtók és árazás', () => {
  const door = (type: 'door' | 'doorSliding'): PergolaConfig => ({ ...base, sides: { ...base.sides, front: type } })

  it('az ajtó a fix üvegfal m² ára plusz az ajtószárny egységára', () => {
    const hinged = calculatePrice(door('door'), prices)
    expect(hinged.lines.find((line) => line.id === 'side-front')!.amountNet).toBeCloseTo(5 * 2.6 * prices.glassFixedPerM2Net, -4)
    expect(hinged.lines.find((line) => line.id === 'door-hinged')!.amountNet).toBe(prices.doorHingedNet)
    expect(calculatePrice(door('doorSliding'), prices).lines.find((line) => line.id === 'door-sliding')!.amountNet).toBe(prices.doorSlidingNet)
  })

  it('a tolóajtó drágább a nyílónál; az ajtó drágább a fix üvegfalnál', () => {
    const total = (config: PergolaConfig) => calculatePrice(config, prices).totalGross
    expect(total(door('doorSliding'))).toBeGreaterThan(total(door('door')))
    expect(total(door('door'))).toBeGreaterThan(total({ ...base, sides: { ...base.sides, front: 'glassFixed' } }))
  })

  it('a rajz és az anyaglista kezeli az ajtót', () => {
    for (const type of ['door', 'doorSliding'] as const) {
      const config = door(type)
      const drawing = technicalDrawing(config, { brand: 'T', contact: 'T', title: 'T', code: 'T', date: 'T', notes: [] })
      expect(drawing.svg).toContain(type === 'door' ? 'nyíló ajtós fal' : 'tolóajtós fal')
      expect(getBom(config).some((line) => /ajtó/i.test(line.label))).toBe(true)
      expect(getSpecCode(config)).toMatch(type === 'door' ? /D/ : /T/)
    }
  })
})

describe('télikert árazás', () => {
  const lineIds = (config: PergolaConfig) => calculatePrice(config, prices).lines.map((line) => line.id)

  it('minden zárt-építmény tétel megjelenik a telikertben', () => {
    const ids = lineIds(conservatory({ climate: 'both' }))
    for (const id of ['thermal-profile', 'wall-glazing', 'foundation', 'climate-split', 'climate-underfloor', 'door-hinged']) expect(ids.includes(id) || ids.includes('door-sliding')).toBe(true)
    expect(ids).toContain('foundation')
    expect(ids).toContain('climate-split')
    expect(ids).toContain('climate-underfloor')
    expect(ids).toContain('thermal-profile')
  })

  it('a háromrétegű üveg drágább a kétrétegűnél; az alap és a klíma külön kapcsolható', () => {
    const total = (config: PergolaConfig) => tenantPrice(demoTenant, config).totalGross
    expect(total(conservatory({ wallGlazing: 'triple' }))).toBeGreaterThan(total(conservatory()))
    expect(total(conservatory({ foundation: undefined }))).toBeLessThan(total(conservatory()))
    expect(total(conservatory({ climate: undefined }))).toBeLessThan(total(conservatory({ climate: 'split' })))
    expect(total(conservatory({ climate: 'both' }))).toBeGreaterThan(total(conservatory({ climate: 'split' })))
  })

  it('a veranda üvegezése alapból edzett (nincs felár), a pergola ára nem változik', () => {
    const veranda = normalizeConfig(demoTenant, { ...base, ...buildingPatch(base, 'veranda', roofs, demoTenant.sides) })
    expect(lineIds(veranda)).not.toContain('wall-glazing')
    expect(lineIds(veranda)).not.toContain('thermal-profile')
    expect(lineIds(base).some((id) => ['foundation', 'wall-glazing', 'climate-split'].includes(id))).toBe(false)
  })

  it('a demó télikert bruttó m²-ára reális tartományban van', () => {
    const config = conservatory()
    const price = calculatePrice(config, prices)
    const perM2 = price.totalGross / price.area
    expect(perM2).toBeGreaterThan(250000)
    expect(perM2).toBeLessThan(700000)
    expect(glassWallArea(config)).toBeGreaterThan(0)
  })
})

describe('megosztás és specifikáció', () => {
  it('a zárt építmény mezői visszaolvashatók a linkből', () => {
    const config = conservatory({ wallGlazing: 'triple', climate: 'both' })
    const back = parseConfig(demoTenant, compactToJson(configToCompact(config)))
    expect(back).toEqual(config)
  })

  it('a régi linkek (építmény nélkül) változatlanul működnek', () => {
    const config = normalizeConfig(demoTenant, base)
    expect(configToCompact(config)).not.toMatch(/-?e[vc]\b|-q\b/)
    expect(parseConfig(demoTenant, compactToJson(configToCompact(config)))).toEqual(config)
  })

  it('a szöveges összefoglaló és a tájékoztató megnevezi a típust', () => {
    const config = conservatory()
    expect(createTextSummary(config, calculatePrice(config, prices))).toContain('Télikert')
    expect(getSpecCode(config)).toContain('TK')
    expect(permitNotes('conservatory').length).toBeGreaterThan(1)
    expect(permitNotes(undefined)).toEqual([])
  })

  it('figyelmeztet, ha a télikert nyitott vagy ajtó nélküli', () => {
    const open = normalizeConfig(demoTenant, { ...base, building: 'conservatory', roof: 'glass', sides: { front: 'none', back: 'none', left: 'glassFixed', right: 'glassFixed' } })
    const texts = buildingIssues(open).map((issue) => issue.text).join(' ')
    expect(texts).toMatch(/nyitott/)
    expect(texts).toMatch(/ajtó/)
  })
})

describe('lead és ajánlat', () => {
  it('a lead-leírás tartalmazza az épülettípust, az üvegezést és a klímát', () => {
    const config = conservatory({ wallGlazing: 'triple', climate: 'both' })
    const rows = describeConfig(demoTenant, config, calculatePrice(config, prices))
    const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n')
    expect(text).toContain('Építmény típusa: Télikert')
    expect(text).toContain('Háromrétegű')
    expect(text).toContain('Padlófűtés + split klíma')
  })

  it('pergolánál nincs épület-sor', () => {
    const rows = describeConfig(demoTenant, base, calculatePrice(base, prices))
    expect(rows.some(([label]) => label === 'Építmény típusa')).toBe(false)
  })
})

describe('PDF', () => {
  it('a télikert PDF-je tartalmazza az építmény-sorokat és a hatósági tudnivalót', () => {
    const config = conservatory({ climate: 'both' })
    const definition = buildPdfDefinition({ config, price: calculatePrice(config, prices), tenant: demoTenant, shareUrl: 'https://example.com/#c=1', date: new Date('2026-11-06') })
    const text = JSON.stringify(definition)
    expect(text).toContain('Építmény típusa')
    expect(text).toContain('Padlófűtés + split klíma')
    expect(text).toContain('építéshatósági')
  })
})
