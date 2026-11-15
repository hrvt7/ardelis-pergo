import { describe, expect, it } from 'vitest'
import { mobileBarAction, nextStep, STEPS } from '@/lib/configSteps'

describe('konfigurációs lépések', () => {
  it('hat lépés, az összegzés az utolsó', () => {
    expect(STEPS.map((step) => step.id)).toEqual(['size', 'mount', 'sides', 'color', 'extras', 'summary'])
  })

  it('a következő lépés sorrendben jön, az utolsó után nincs', () => {
    expect(nextStep('size')).toBe('mount')
    expect(nextStep('extras')).toBe('summary')
    expect(nextStep('summary')).toBeNull()
  })

  it('a mobil gomb a következő lépésre visz, nem ugrik az összegzésre', () => {
    expect(mobileBarAction('size')).toEqual({ kind: 'step', step: 'mount', label: 'Tovább: Méret' })
    expect(mobileBarAction('color')).toEqual({ kind: 'step', step: 'extras', label: 'Tovább: Extrák' })
  })

  it('az utolsó lépésen a felmérés-kérésre visz', () => {
    expect(mobileBarAction('summary')).toEqual({ kind: 'lead', label: 'Felmérést kérek' })
  })
})
