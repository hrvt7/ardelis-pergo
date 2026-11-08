import { describe, expect, it } from 'vitest'
import { describeConfig } from '../server/lead'
import { buildPdfDefinition } from '../src/lib/pdfDocument'
import { technicalDrawing } from '../src/lib/drawing'
import { glazingOptions } from '../src/lib/roofs'
import { doorLeafWidth } from '../src/lib/sides'
import { DEFAULT_USAGE, estimateEnergy } from '../src/lib/energy'
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

  it('veranda: a zip-árnyékolós oldal is üvegfal lesz; pergolára visszaváltva a zip visszakerül', () => {
    const withZip: PergolaConfig = { ...base, sides: { front: 'none', back: 'none', left: 'zip', right: 'none' } }
    const veranda = normalizeConfig(demoTenant, { ...withZip, ...buildingPatch(withZip, 'veranda', roofs, demoTenant.sides) })
    expect(veranda.sides.left).not.toBe('zip')
    expect(['glass', 'glassFixed', 'door', 'doorSliding']).toContain(veranda.sides.left)
    expect(veranda.openSides).toEqual(withZip.sides)
    // télikertre tovább, majd vissza pergolára: az eredeti oldalak állnak helyre, nem marad üveg
    const conservatoryNext = normalizeConfig(demoTenant, { ...veranda, ...buildingPatch(veranda, 'conservatory', roofs, demoTenant.sides) })
    expect(conservatoryNext.openSides).toEqual(withZip.sides)
    const pergola = normalizeConfig(demoTenant, { ...conservatoryNext, ...buildingPatch(conservatoryNext, 'pergola', roofs, demoTenant.sides) })
    expect(pergola.building).toBeUndefined()
    expect(pergola.sides).toEqual(withZip.sides)
    expect(pergola.openSides).toBeUndefined()
    // megosztó kódban is megmarad a pergola állapota (openSides nélkül)
    expect(parseConfig(demoTenant, compactToJson(configToCompact(pergola)))?.sides).toEqual(withZip.sides)
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

describe('üvegtető-burkolatok és ajtók (3.51)', () => {
  const area = 5 * 4
  const surcharge = (config: PergolaConfig) => calculatePrice(config, prices).lines.find((line) => line.id === 'glazing')?.amountNet ?? 0

  it('üvegtetőn öt burkolat választható, polikarbonáton négy; felárak a ténylegesen választottra', () => {
    expect(glazingOptions('glass')).toEqual(['clear', 'satin', 'opal', 'heat', 'tinted'])
    expect(glazingOptions('polycarbonate')).toEqual(['opal', 'clear', 'heat', 'tinted'])
    expect(surcharge({ ...base, glazing: undefined })).toBe(0)
    expect(surcharge({ ...base, glazing: 'satin' })).toBe(area * prices.glazingSatinPerM2Net)
    expect(surcharge({ ...base, glazing: 'opal' })).toBe(area * prices.glazingOpalPerM2Net)
    expect(surcharge({ ...base, glazing: 'heat' })).toBe(area * prices.glazingHeatPerM2Net)
    expect(surcharge({ ...base, glazing: 'tinted' })).toBe(area * prices.glazingTintedPerM2Net)
    // polikarbonát: az opál az alapkivitel, nincs felár
    expect(surcharge({ ...base, roof: 'polycarbonate', glazing: undefined })).toBe(0)
  })

  it('a füstös burkolat megy a megosztási linken és a normalizáción át', () => {
    const config = conservatory({ glazing: 'tinted' })
    expect(config.glazing).toBe('tinted')
    const json = compactToJson(configToCompact(config))
    expect(JSON.stringify(json)).toContain('tinted')
    expect(getSpecCode(config).length).toBeGreaterThan(0)
  })

  it('rövid falszakasz ajtónak és tiszta üvegtető árnyékoló nélkül figyelmeztetést kap', () => {
    const narrow = { ...conservatory(), depth: 1.0, sides: { front: 'glassFixed', back: 'none', left: 'door', right: 'glassFixed' } } as PergolaConfig
    expect(buildingIssues(narrow).some((issue) => issue.level === 'warn' && issue.text.includes('szűk'))).toBe(true)
    expect(buildingIssues(conservatory({ glazing: 'clear' })).some((issue) => issue.text.includes('felmelegedhet'))).toBe(true)
    expect(buildingIssues(conservatory({ glazing: 'heat' })).some((issue) => issue.text.includes('felmelegedhet'))).toBe(false)
  })
})

describe('ajtószárny és üzemeltetés (3.51)', () => {
  it('az ajtószárny mérete a falszakaszhoz igazodik, a toló legfeljebb a szakasz fele', () => {
    expect(doorLeafWidth('door', 5)).toBe(0.95)
    expect(doorLeafWidth('door', 1.0)).toBeCloseTo(0.8)
    expect(doorLeafWidth('doorSliding', 5)).toBe(1.3)
    expect(doorLeafWidth('doorSliding', 2)).toBe(1)
    expect(doorLeafWidth('doorSliding', 1.2)).toBe(0.6)
    for (const length of [1.2, 1.6, 2, 3, 4, 5, 6]) expect(doorLeafWidth('doorSliding', length) * 2).toBeLessThanOrEqual(length + 0.001 + (length < 1.3 ? 0.6 : 0))
  })

  it('a klíma és a padlófűtés megjelenik az éves áramfogyasztásban', () => {
    const kwh = (climate: PergolaConfig['climate']) => estimateEnergy({ ...conservatory(), climate, led: false, sensors: false }, DEFAULT_USAGE).lines.filter((line) => line.id === 'climate').reduce((sum, line) => sum + line.kwh, 0)
    expect(kwh(undefined)).toBe(0)
    expect(kwh('split')).toBe(900)
    expect(kwh('underfloor')).toBeCloseTo((5 * 4 * 70 * 700) / 1000)
    expect(kwh('both')).toBeCloseTo(900 + (5 * 4 * 70 * 700) / 1000)
  })
})
