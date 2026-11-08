import { describe, expect, it } from 'vitest'
import { productDefaultConfig } from '../src/lib/config'
import { DEFAULT_PRODUCT, HUB_SLUG, hubPath, INTEREST_EVENTS, interestEvent, productBySlug, productInfo, productPath, PRODUCTS, tenantProducts } from '../src/products'
import { TRACK_EVENTS } from '../server/analytics'
import { fenceEngine, getEngine, pergolaEngine } from '../src/products/engines'
import { calculateOutdoorPrice, decodeOutdoorHash, OUTDOOR_DEFAULTS, OUTDOOR_PRICE_DEFAULTS } from '../src/products/outdoor'
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

  it('termékválasztó oldal: saját szelet, amely egyik családé sem; útvonal módonként', () => {
    expect(PRODUCTS.some((product) => product.slug === HUB_SLUG)).toBe(false)
    expect(hubPath('demo', 'demo')).toBe('/konfigurator/termekek')
    expect(hubPath('standalone', 'acme')).toBe('/k/acme/termekek')
    expect(hubPath('embed', 'acme')).toBe('/embed/acme/termekek')
  })

  it('külön kalkulátorok: a carport alapterve carport, a pergoláé a gyártó alapkonfigurációja', () => {
    expect(productDefaultConfig(demoTenant, 'carport').building).toBe('carport')
    expect(productDefaultConfig(demoTenant, 'pergola')).toBe(demoTenant.defaultConfig)
  })

  it('útvonalak: a pergola a rövid címen marad, a többi család a szelet alatt, módonként', () => {
    expect(productPath('demo', 'demo', 'pergola')).toBe('/konfigurator')
    expect(productPath('demo', 'demo', 'fence')).toBe('/konfigurator/kerites')
    expect(productPath('standalone', 'acme', 'pergola')).toBe('/k/acme')
    expect(productPath('standalone', 'acme', 'garage-door')).toBe('/k/acme/garazskapu')
    expect(productPath('embed', 'acme', 'carport')).toBe('/embed/acme/carport')
  })

  it('a gyártó kínálata: megadás nélkül csak pergola; a demó a teraszfedést, a carportot és a kerítést kínálja', () => {
    expect(tenantProducts({})).toEqual(['pergola'])
    expect(tenantProducts({ products: ['pergola', 'fence'] })).toEqual(['pergola', 'fence'])
    expect(tenantProducts(demoTenant)).toEqual(['pergola', 'carport', 'fence'])
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
    for (const id of ['garage-door', 'garden-building'] as const) expect(getEngine(id)).toBeUndefined()
  })

  it('kerítés-motor: csak kerítés-konfigurációt fogad, mintaárlistával áraz, `k=` megosztó kódot ad, leírást és fejlécet ír', () => {
    const fence = OUTDOOR_DEFAULTS.fence
    expect(getEngine('fence')).toBe(fenceEngine)
    expect(fenceEngine.parse(demoTenant, fence)).toEqual(fence)
    expect(fenceEngine.parse(demoTenant, OUTDOOR_DEFAULTS.gate)).toBeNull()
    expect(fenceEngine.parse(demoTenant, { ...fence, length: 999 })).toBeNull()
    expect(fenceEngine.price(demoTenant, fence).totalGross).toBe(calculateOutdoorPrice(fence, OUTDOOR_PRICE_DEFAULTS).totalGross)
    expect(fenceEngine.price(demoTenant, fence).totalGross).toBeGreaterThan(0)
    const hash = fenceEngine.shareHash(fence)
    expect(hash.startsWith('k=')).toBe(true)
    expect(decodeOutdoorHash(`#${hash}`)).toEqual(fence)
    expect(fenceEngine.headline!(demoTenant, fence)).toContain('14 fm')
    const spec = fenceEngine.describe!(demoTenant, fence, fenceEngine.price(demoTenant, fence))
    expect(spec.map(([label]) => label)).toEqual(expect.arrayContaining(['Hossz és magasság', 'Kapu', 'Kiskapu', 'Konfigurációs kód']))
  })

  it('az érdeklődés-eseményeket a szerver mérése elfogadja', () => {
    expect(interestEvent('fence')).toBe('interest_fence')
    for (const event of INTEREST_EVENTS) expect(TRACK_EVENTS).toContain(event)
    expect(TRACK_EVENTS).toContain('open')
  })
})
