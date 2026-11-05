import { describe, expect, it } from 'vitest'
import { PLATFORM_COPY } from '../src/i18n/platformCopy'
import { compactMoney, formatMoney } from '../src/lib/platformPricing'

type Tree = unknown
const shape = (value: Tree): Tree => {
  if (typeof value === 'function') return 'fn'
  if (Array.isArray(value)) return value.map(shape)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]))
  return typeof value
}
const strings = (value: Tree, out: string[] = []): string[] => {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => strings(item, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => strings(item, out))
  return out
}

describe('főoldal szövegtár (HU / EN)', () => {
  it('az angol ugyanazt a szerkezetet követi, mint a magyar', () => {
    expect(shape(PLATFORM_COPY.en)).toEqual(shape(PLATFORM_COPY.hu))
  })

  it('az angol szövegekben nincs magyar ékezetes betű (a hazai helynevek és személynevek kivételével)', () => {
    const allowed = /Péter Kovács|Anna Nagy|Gábor Szabó|Sárvár|Győr|Kőszeg/g
    const leftovers = strings(PLATFORM_COPY.en).map((text) => text.replace(allowed, '')).filter((text) => /[áéíóöőúüű]/i.test(text))
    expect(leftovers).toEqual([])
  })

  it('az angol szövegek nem üresek (a lábléc mintaoldal-link szándékosan az)', () => {
    const empty = strings({ ...PLATFORM_COPY.en, footer: { text: PLATFORM_COPY.en.footer.text } }).filter((text) => text.trim() === '')
    expect(empty).toEqual([])
  })

  it('a csomagok minden nyelven ugyanannyi funkciót sorolnak fel', () => {
    for (const id of ['start', 'pro', 'partner'] as const) expect(PLATFORM_COPY.en.pricing.plans[id].features).toHaveLength(PLATFORM_COPY.hu.pricing.plans[id].features.length)
    expect(PLATFORM_COPY.en.faq.items).toHaveLength(PLATFORM_COPY.hu.faq.items.length)
  })

  it('az összegek az oldal nyelvén íródnak', () => {
    expect(formatMoney(5_648_000, 'en')).toBe('HUF 5,648,000')
    expect(formatMoney(59_000)).toMatch(/^59\s000 Ft$/)
    expect(compactMoney(5_600_000, 'en')).toBe('HUF 5.6M')
    expect(compactMoney(5_600_000)).toBe('5,6 M Ft')
  })
})
