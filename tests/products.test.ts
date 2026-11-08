import { describe, expect, it } from 'vitest'
import { DEFAULT_PRODUCT, INTEREST_EVENTS, interestEvent, productBySlug, productInfo, productPath, PRODUCTS, tenantProducts } from '../src/products'
import { TRACK_EVENTS } from '../server/analytics'
import { getEngine, pergolaEngine } from '../src/products/engines'
import { shareHash } from '../src/lib/shareCode'
import { parseConfig, tenantPrice } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'

describe('termékcsaládok', () => {
  it('az azonosítók és az URL-szeletek egyediek és URL-biztosak; a pergola él és az alapértelmezett', () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length)
    expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(PRODUCTS.length)
    for (const product of PRODUCTS) expect(product.slug).toMatch(/^[a-z0-9-]+$/)
    expect(productInfo(DEFAULT_PRODUCT).status).toBe('live')
    expect(productBySlug('kerites')?.id).toBe('fence')
    expect(productBySlug('KERITES')?.id).toBe('fence')
    expect(productBySlug('nincs-ilyen')).toBeUndefined()
    expect(productBySlug(undefined)).toBeUndefined()
  })

  it('útvonalak: a pergola a rövid címen marad, a többi család a szelet alatt, módonként', () => {
    expect(productPath('demo', 'demo', 'pergola')).toBe('/konfigurator')
    expect(productPath('demo', 'demo', 'fence')).toBe('/konfigurator/kerites')
    expect(productPath('standalone', 'acme', 'pergola')).toBe('/k/acme')
    expect(productPath('standalone', 'acme', 'garage-door')).toBe('/k/acme/garazskapu')
    expect(productPath('embed', 'acme', 'carport')).toBe('/embed/acme/carport')
  })

  it('a gyártó kínálata: megadás nélkül csak pergola; a demó a teraszfedést és a carportot kínálja', () => {
    expect(tenantProducts({})).toEqual(['pergola'])
    expect(tenantProducts({ products: ['pergola', 'fence'] })).toEqual(['pergola', 'fence'])
    expect(tenantProducts(demoTenant)).toEqual(['pergola', 'carport'])
  })

  it('motor: a pergola motorja ugyanazt adja, mint a meglévő érvényesítés, árazás és megosztókód; a többi családnak még nincs', () => {
    const config = demoTenant.defaultConfig
    expect(getEngine('pergola')).toBe(pergolaEngine)
    expect(pergolaEngine.parse(demoTenant, config)).toEqual(parseConfig(demoTenant, config))
    expect(pergolaEngine.parse(demoTenant, { width: 'x' })).toBeNull()
    expect(pergolaEngine.price(demoTenant, config).totalGross).toBe(tenantPrice(demoTenant, config).totalGross)
    expect(pergolaEngine.shareHash(config)).toBe(shareHash(config))
    expect(pergolaEngine.shareHash(config).startsWith(`${pergolaEngine.shareKey}=`)).toBe(true)
    // A carport a keretes-tető család tagja: a pergola motorján fut.
    expect(getEngine('carport')).toBe(pergolaEngine)
    for (const id of ['fence', 'garage-door', 'garden-building'] as const) expect(getEngine(id)).toBeUndefined()
  })

  it('az érdeklődés-eseményeket a szerver mérése elfogadja', () => {
    expect(interestEvent('fence')).toBe('interest_fence')
    for (const event of INTEREST_EVENTS) expect(TRACK_EVENTS).toContain(event)
    expect(TRACK_EVENTS).toContain('open')
  })
})
