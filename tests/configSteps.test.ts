import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ISSUE_STEP, issuesForStep, mobileBarAction, nextStep, STEPS } from '@/lib/configSteps'

describe('konfigurációs lépések', () => {
  it('hét lépés: típus, elhelyezés és méret, tető, oldalak, szín, komfort, összegzés', () => {
    expect(STEPS.map((step) => step.id)).toEqual(['size', 'mount', 'roof', 'sides', 'color', 'extras', 'summary'])
    expect(STEPS.map((step) => step.label)).toEqual(['Típus', 'Méret', 'Tető', 'Oldalak', 'Szín', 'Komfort', 'Összegzés'])
  })

  it('minden jelzés pontosan egy lépéshez tartozik (nincs duplikáció, nincs gazdátlan jelzés)', () => {
    const source = readFileSync('src/lib/buildings.ts', 'utf8')
    const ids = [...new Set([...source.matchAll(/id: '([a-z-]+)'/g)].map((match) => match[1]))]
    expect(ids.length).toBeGreaterThan(10)
    for (const id of ids) expect(ISSUE_STEP[id], id).toBeDefined()
    const shown = STEPS.flatMap((step) => issuesForStep(step.id))
    expect(shown.length).toBe(new Set(shown).size)
    expect(issuesForStep('roof')).toEqual(expect.arrayContaining(['cons-pitch', 'carport-pitch', 'roof-heat']))
    expect(issuesForStep('sides')).toEqual(expect.arrayContaining(['cons-door', 'cons-open']))
  })

  it('a következő lépés sorrendben jön, az utolsó után nincs', () => {
    expect(nextStep('size')).toBe('mount')
    expect(nextStep('mount')).toBe('roof')
    expect(nextStep('roof')).toBe('sides')
    expect(nextStep('extras')).toBe('summary')
    expect(nextStep('summary')).toBeNull()
  })

  it('a mobil gomb a következő lépésre visz, nem ugrik az összegzésre', () => {
    expect(mobileBarAction('size')).toEqual({ kind: 'step', step: 'mount', label: 'Tovább: Méret' })
    expect(mobileBarAction('color')).toEqual({ kind: 'step', step: 'extras', label: 'Tovább: Komfort' })
    expect(mobileBarAction('roof')).toEqual({ kind: 'step', step: 'sides', label: 'Tovább: Oldalak' })
  })

  it('az utolsó lépésen a felmérés-kérésre visz', () => {
    expect(mobileBarAction('summary')).toEqual({ kind: 'lead', label: 'Felmérést kérek' })
  })
})
