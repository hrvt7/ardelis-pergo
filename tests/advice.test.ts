import { describe, expect, it } from 'vitest'
import { getAdvice } from '@/lib/advice'
import { demoTenant as tenant } from '@/tenants/demo'

describe('getAdvice', () => {
  it('alapértelmezett konfigurációra nem dob hibát', () => {
    expect(Array.isArray(getAdvice(tenant.defaultConfig))).toBe(true)
  })
  it('széles tolóüvegnél figyelmeztet', () => {
    const cfg = { ...tenant.defaultConfig, width: 6, sides: { ...tenant.defaultConfig.sides, front: 'glass' as const } }
    expect(getAdvice(cfg).some((a) => a.id === 'wide-glass')).toBe(true)
  })
})
