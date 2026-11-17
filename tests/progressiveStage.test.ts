import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { initialStage, LANDING_STAGES } from '@/lib/progressiveStage'

const platform = readFileSync(new URL('../src/pages/Platform.tsx', import.meta.url), 'utf8')
const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')

describe('nyitóoldal fokozatos felépítése (4.96)', () => {
  it('horgonnyal érkezve azonnal minden szakasz felépül, egyébként csak a héró', () => {
    expect(initialStage('', LANDING_STAGES)).toBe(0)
    expect(initialStage('#top', LANDING_STAGES)).toBe(0)
    expect(initialStage('#arak', LANDING_STAGES)).toBe(LANDING_STAGES)
  })

  it('a lenti szakaszok csoportonként épülnek, a belépő animációk csak a végén indulnak', () => {
    for (let stage = 1; stage <= LANDING_STAGES; stage += 1) expect(platform).toContain(`{stage >= ${stage} && <>`)
    expect(platform).toMatch(/\}, \[ready\]\)/)
    expect(platform).toContain('ScrollTrigger.refresh()')
  })

  it('korai horgonykattintásnál előbb minden felépül, utána a Lenis újramér és görget', () => {
    expect(platform).toContain('flushSync(completeStages)')
    expect(platform).toMatch(/lenis\.resize\(\)/)
  })

  it('a nyitóoldal HTML-je előtölti a héró képét és betűjét', () => {
    expect(vite).toContain('rel="preload" as="image" href="/assets/landing/clouds-back.webp" fetchpriority="high"')
    expect(vite).toMatch(/urbanist-latin-wght-normal/)
  })
})
