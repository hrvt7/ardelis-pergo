import { describe, expect, it } from 'vitest'
import { missingShadowMap } from '../src/lib/shadowGuard'

describe('missingShadowMap', () => {
  it('az újonnan létrejött, árnyékot vető fénynél frissítést kér', () => {
    expect(missingShadowMap([{ isLight: true, castShadow: true, shadow: { map: null } }])).toBe(true)
  })
  it('kész árnyéktérképnél, árnyék nélküli vagy rejtett fénynél nem', () => {
    expect(missingShadowMap([{ isLight: true, castShadow: true, shadow: { map: {} } }])).toBe(false)
    expect(missingShadowMap([{ isLight: true, castShadow: false, shadow: { map: null } }])).toBe(false)
    expect(missingShadowMap([{ isLight: true, castShadow: true, visible: false, shadow: { map: null } }])).toBe(false)
    expect(missingShadowMap([{ isLight: false, castShadow: true, shadow: { map: null } }])).toBe(false)
  })
})
