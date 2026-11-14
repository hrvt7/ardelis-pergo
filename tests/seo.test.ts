import { describe, expect, it } from 'vitest'
import { buildStructuredData, getSeoPage, SEO_SITEMAP_PATHS } from '../contracts/seo'

describe('SEO', () => {
  it('a sitemap minden oldala indexelhető és saját címmel rendelkezik', () => {
    const titles = new Set<string>()
    for (const path of SEO_SITEMAP_PATHS) {
      const page = getSeoPage(path)
      expect(page.indexable, path).toBe(true)
      expect(page.description.length, path).toBeGreaterThan(60)
      titles.add(page.title)
    }
    expect(titles.size).toBe(SEO_SITEMAP_PATHS.length)
  })

  it('MVP: a félretett termékek (carport, kerítés, garázskapu) oldala nincs a sitemapben', () => {
    for (const path of ['/konfigurator/carport', '/konfigurator/kerites', '/konfigurator/garazskapu']) expect(SEO_SITEMAP_PATHS as readonly string[]).not.toContain(path)
  })

  it('a /minta nem állítja, hogy a Lamelix maga kivitelez', () => {
    const page = getSeoPage('/minta')
    expect(page.title).toContain('Élő termékbemutató')
    const graph = JSON.stringify(buildStructuredData('/minta', 'https://x.test'))
    expect(graph).not.toContain('"@type":"Service"')
    expect(graph).not.toMatch(/felmérése/)
  })

  it('a privát és ismeretlen oldalak nem indexelhetők', () => {
    expect(getSeoPage('/admin').indexable).toBe(false)
    expect(getSeoPage('/nincs-ilyen').robots).toContain('noindex')
  })
})
