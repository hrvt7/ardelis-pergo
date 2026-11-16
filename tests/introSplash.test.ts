import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'
import { INTRO_HARD_CAP_MS, INTRO_MAX_HOLD_MS, INTRO_SRC, INTRO_START_TIMEOUT_MS, introCanClose, introParam, shouldPlayIntro, type IntroEnvironment } from '../src/lib/introSplash'
import { isOfflineAsset, swStrategy } from '../src/lib/swRoutes'

const app: IntroEnvironment = { pathname: '/konfigurator', search: '', standalone: true, touch: true, reducedMotion: false, playedThisSession: false }

describe('nyitó animáció: mikor fut', () => {
  it('telepített webappként, érintőképernyős eszközön, a konfigurátor útvonalain', () => {
    for (const pathname of ['/konfigurator', '/konfigurator/carport', '/k/acme', '/embed/acme']) expect(shouldPlayIntro({ ...app, pathname }), pathname).toBe(true)
  })
  it('böngészőfülön, asztali gépen, a nyitóoldalon és az adminban nem', () => {
    expect(shouldPlayIntro({ ...app, standalone: false })).toBe(false)
    expect(shouldPlayIntro({ ...app, touch: false })).toBe(false)
    for (const pathname of ['/', '/minta', '/k/acme/admin', '/ajanlat/x']) expect(shouldPlayIntro({ ...app, pathname }), pathname).toBe(false)
  })
  it('munkamenetenként egyszer, és nem csökkentett mozgás beállításnál', () => {
    expect(shouldPlayIntro({ ...app, playedThisSession: true })).toBe(false)
    expect(shouldPlayIntro({ ...app, reducedMotion: true })).toBe(false)
  })
  it('?intro=1 kényszeríti (bemutatóhoz böngészőben is), ?intro=0 tiltja', () => {
    expect(introParam('')).toBeNull()
    expect(shouldPlayIntro({ ...app, standalone: false, touch: false, playedThisSession: true, search: '?intro=1' })).toBe(true)
    expect(shouldPlayIntro({ ...app, search: '?intro=0' })).toBe(false)
    expect(shouldPlayIntro({ ...app, pathname: '/', search: '?intro=1' })).toBe(false)
  })
})

describe('nyitó animáció: mikor tűnik el', () => {
  const base = { started: true, ended: false, skipped: false, blocked: false, sceneReady: false, msSinceOpen: 3000, msSinceEnd: 0 }
  it('lejátszás közben marad, akkor is, ha a 3D már kész', () => {
    expect(introCanClose({ ...base, sceneReady: true })).toBe(false)
  })
  it('a vége után, ha a 3D kész; ha nem, legfeljebb a várakozási ideig áll a logón', () => {
    expect(introCanClose({ ...base, ended: true, sceneReady: true })).toBe(true)
    expect(introCanClose({ ...base, ended: true, msSinceEnd: 1000 })).toBe(false)
    expect(introCanClose({ ...base, ended: true, msSinceEnd: INTRO_MAX_HOLD_MS })).toBe(true)
  })
  it('kihagyásra azonnal', () => {
    expect(introCanClose({ ...base, skipped: true })).toBe(true)
  })
  it('HIBA (iPad): lassú betöltésnél nem adja fel 2,5 mp után – a 3D elkészültéig vagy a türelmi időig vár', () => {
    const loading = { ...base, started: false }
    expect(introCanClose({ ...loading, msSinceOpen: 2600 })).toBe(false)
    expect(introCanClose({ ...loading, msSinceOpen: 8000 })).toBe(false)
    expect(introCanClose({ ...loading, msSinceOpen: INTRO_START_TIMEOUT_MS })).toBe(true)
    expect(introCanClose({ ...loading, msSinceOpen: 2600, sceneReady: true })).toBe(true)
  })
  it('HIBA (iPad): tiltott automatikus lejátszásnál nem tűnik el azonnal – koppintásra indítható, a 3D elkészültéig marad', () => {
    const blocked = { ...base, started: false, blocked: true, msSinceOpen: 400 }
    expect(introCanClose(blocked)).toBe(false)
    expect(introCanClose({ ...blocked, sceneReady: true })).toBe(true)
  })
  it('elakadt lejátszásnál a végső biztosíték után eltűnik', () => {
    expect(introCanClose({ ...base, msSinceOpen: INTRO_HARD_CAP_MS })).toBe(true)
  })
})

describe('nyitó animáció: fájl és offline', () => {
  it('a videó létezik, kicsi, és offline is tárból jön (az előtöltési listában van)', () => {
    const file = path.resolve(import.meta.dirname, '../public', INTRO_SRC.slice(1))
    expect(fs.existsSync(file)).toBe(true)
    expect(fs.statSync(file).size).toBeLessThan(4 * 1024 * 1024)
    expect(isOfflineAsset(INTRO_SRC)).toBe(true)
    expect(swStrategy({ url: INTRO_SRC, origin: 'https://lamelix.vercel.app' })).toBe('cache-first')
  })
  it('az indító szkript lefordul, és nem húz be React-et vagy az alkalmazást (inline, kicsi)', async () => {
    const result = await build({ entryPoints: [path.resolve(import.meta.dirname, '../src/intro/boot.ts')], bundle: true, write: false, format: 'iife', minify: true, logLevel: 'silent' })
    const code = result.outputFiles[0].text
    expect(code).toContain(INTRO_SRC)
    expect(code.length).toBeLessThan(6000)
  })
})
