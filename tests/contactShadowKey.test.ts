import { describe, expect, it } from 'vitest'
import { contactShadowKey } from '@/lib/fixtures'

const config = { width: 4, depth: 3, height: 2.5, mount: 'wall', furniture: 'lounge' }

describe('talajárnyék újrasütése', () => {
  it('kert → semleges háttér váltáskor új kulcs (a dézsák árnyéka nem marad ott)', () => {
    expect(contactShadowKey(config, 'garden', 'classic', 10)).not.toBe(contactShadowKey(config, 'studio', 'classic', 10))
  })
  it('bútor vagy háztípus cseréjekor és késői modellbetöltéskor is újrasül', () => {
    const base = contactShadowKey(config, 'garden', 'classic', 10)
    expect(contactShadowKey({ ...config, furniture: 'dining' }, 'garden', 'classic', 10)).not.toBe(base)
    expect(contactShadowKey(config, 'garden', 'modern', 10)).not.toBe(base)
    expect(contactShadowKey(config, 'garden', 'classic', 11)).not.toBe(base)
  })
  it('változatlan jelenetre ugyanaz a kulcs (nincs fölösleges újrasütés)', () => {
    expect(contactShadowKey({ ...config }, 'garden', 'classic', 10)).toBe(contactShadowKey(config, 'garden', 'classic', 10))
  })
})
