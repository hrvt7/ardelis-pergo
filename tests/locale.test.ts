import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLocale, setLocale, tenantIdFromPath, tr } from '../src/i18n/locale'
import { demoAtTenant } from '../src/tenants/demo-at'
import { demoTenant } from '../src/tenants/demo'

// Magyar ékezetes betűk, amelyek a németben nem fordulnak elő (az ö és ü közös, ezért nincs a listában).
const HUNGARIAN = /[áéíóőúűÁÉÍÓŐÚŰ]/

/** Minden szöveg egy (beágyazott) adatszerkezetből. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => strings(item, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => strings(item, out))
  return out
}

afterEach(() => { setLocale('hu'); vi.resetModules() })

describe('felületi nyelv', () => {
  it('a gyártó-azonosító a konfigurátor URL-jéből jön', () => {
    expect(tenantIdFromPath('/k/demo-at')).toBe('demo-at')
    expect(tenantIdFromPath('/embed/Demo-AT/carport')).toBe('demo-at')
    expect(tenantIdFromPath('/k/demo-at/admin')).toBe('demo-at')
    expect(tenantIdFromPath('/konfigurator')).toBeNull()
    expect(tenantIdFromPath('/')).toBeNull()
  })

  it('tr: magyar az alapértelmezés, németre váltható; a szerver (alapérték) mindig magyar', () => {
    expect(getLocale()).toBe('hu')
    expect(tr('Tető', 'Dach')).toBe('Tető')
    setLocale('de')
    expect(tr('Tető', 'Dach')).toBe('Dach')
  })

  it('a gyártók nyelve: a magyar demó magyar, az osztrák német', () => {
    expect(demoTenant.locale ?? 'hu').toBe('hu')
    expect(demoAtTenant.locale).toBe('de')
  })

  it('német módban a vevői szövegtárakban nem marad magyar szöveg', async () => {
    vi.resetModules()
    const locale = await import('../src/i18n/locale')
    locale.setLocale('de')
    const [steps, roofs, sides, mount, buildings, colors, furniture, advisor, house, roofShade] = await Promise.all([
      import('../src/lib/configSteps'), import('../src/lib/roofs'), import('../src/lib/sides'), import('../src/lib/mount'),
      import('../src/lib/buildings'), import('../src/lib/colors'), import('../src/lib/furniture'), import('../src/lib/advisor'),
      import('../src/lib/house'), import('../src/lib/roofShade'),
    ])
    const texts = strings([
      steps.STEPS.map(({ label, short }) => [label, short]),
      Object.values(roofs.ROOF_INFO).map(({ control, shade, rain, light, short, description }) => [control, shade, rain, light, short, description]),
      roofs.GLAZING_INFO, sides.SIDE_INFO, sides.HALF_NAMES, mount.MOUNT_LABELS, mount.MOUNT_DESCRIPTIONS,
      buildings.BUILDING_INFO, buildings.WALL_GLAZING_INFO, buildings.CLIMATE_INFO,
      colors.COLOR_GROUPS, colors.COLOR_CATALOG.map(({ name }) => name),
      Object.values(furniture.FURNITURE_SETS).map(({ label, people, description }) => [label, people, description]),
      advisor.ADVISOR_QUESTIONS, house.HOUSE_STYLE_INFO, roofShade.ROOF_SHADE_INFO,
    ])
    expect(texts.length).toBeGreaterThan(200)
    const left = texts.filter((text) => HUNGARIAN.test(text))
    expect(left).toEqual([])
  })

  it('német módban az ártételek németek és euróban vannak', async () => {
    vi.resetModules()
    const locale = await import('../src/i18n/locale')
    locale.setLocale('de')
    const { tenantPrice } = await import('../src/tenants/rules')
    const { demoAtTenant: tenant } = await import('../src/tenants/demo-at')
    const config = { ...tenant.defaultConfig, heaters: 2, fans: 1, smartHome: true, mount: 'corner-left' as const, sides: { ...tenant.defaultConfig.sides, front: 'door' as const } }
    const price = tenantPrice(tenant, config)
    const left = price.lines.flatMap(({ label, detail }) => [label, detail]).filter((text) => HUNGARIAN.test(text) || /\bFt\b|\bdb\b|\bfm\b/.test(text))
    expect(left).toEqual([])
    expect(price.lines.some((line) => line.detail.includes('€'))).toBe(true)
  })
})

describe('vevői PDF németül', () => {
  it('a PDF-összefoglaló szövegében nem marad magyar szöveg (EUR gyártó, áramköltség nélkül)', async () => {
    vi.resetModules()
    const locale = await import('../src/i18n/locale')
    locale.setLocale('de')
    const money = await import('../src/lib/money')
    money.setDisplayCurrency('EUR')
    const { buildPdfDefinition } = await import('../src/lib/pdfDocument')
    const { tenantPrice } = await import('../src/tenants/rules')
    const { demoAtTenant: tenant } = await import('../src/tenants/demo-at')
    const config = { ...tenant.defaultConfig, heaters: 1, fans: 1, smartHome: true }
    const definition = buildPdfDefinition({ config, price: tenantPrice(tenant, config), tenant, shareUrl: 'https://example.test/k/demo-at#x' })
    const texts = strings(definition.content).filter((text) => text.length > 1 && !/^(data:|https?:)/.test(text))
    expect(texts.length).toBeGreaterThan(40)
    expect(texts.filter((text) => HUNGARIAN.test(text))).toEqual([])
    money.setDisplayCurrency('HUF')
  })
})
