import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { budgetDpr, classifyDevice, isTouchDevice, qualityAboveDevice, qualitySettings } from '../src/lib/quality'
import { SHEET_LAYOUT_QUERY, overviewFov, sheetDistanceScale, usesSheetLayout, viewportKind } from '../src/lib/viewport'

const base = { cores: 8, memory: 8, touch: false, phone: false, android: false }

describe('automatikus 3D-szint eszközönként', () => {
  it('belépő mobil GPU-s tablet (Redmi Pad 2, Mali-G57 MC2) alacsony szintet kap, asztali módú Chrome-ban is', () => {
    expect(classifyDevice({ ...base, gpu: 'Mali-G57 MC2', touch: true, android: true })).toBe('low')
    expect(classifyDevice({ ...base, gpu: 'Adreno (TM) 610', touch: true, android: true })).toBe('low')
    expect(classifyDevice({ ...base, gpu: 'PowerVR Rogue GE8320', touch: true })).toBe('low')
  })
  it('erősebb Android GPU közepes; kevés memóriánál alacsony', () => {
    expect(classifyDevice({ ...base, gpu: 'Adreno (TM) 740', touch: true, android: true })).toBe('medium')
    expect(classifyDevice({ ...base, gpu: 'Mali-G715', touch: true, android: true })).toBe('medium')
    expect(classifyDevice({ ...base, gpu: 'Adreno (TM) 740', touch: true, android: true, memory: 3 })).toBe('low')
  })
  it('asztali gépek besorolása változatlan (MacBook M4: magas, erős videókártya: ultra, Intel: közepes)', () => {
    expect(classifyDevice({ ...base, gpu: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)' })).toBe('high')
    expect(classifyDevice({ ...base, gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070)' })).toBe('ultra')
    expect(classifyDevice({ ...base, gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620)' })).toBe('medium')
    expect(classifyDevice({ ...base, gpu: 'Google SwiftShader' })).toBe('low')
  })
  it('iPad (Apple GPU, érintős): a korábbi besorolás marad; iPhone a telefonos szabályt kapja', () => {
    expect(classifyDevice({ ...base, gpu: 'Apple GPU', touch: true })).toBe('high')
    expect(classifyDevice({ ...base, gpu: 'Apple GPU', touch: true, phone: true })).toBe('medium')
  })
  it('érintős eszköz: Android-UA, iPad (Macintosh + érintés), de egérrel használt laptop nem', () => {
    expect(isTouchDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 15; 25040RP0AE)', maxTouchPoints: 10 }, false)).toBe(true)
    expect(isTouchDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 5 }, true)).toBe(true)
    expect(isTouchDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 0 }, false)).toBe(false)
  })
  it('csúcskategóriás Android-tablet (Snapdragon 8 Elite Gen 5, Adreno 840) magas szintet kap; telefonon közepes marad', () => {
    expect(classifyDevice({ ...base, gpu: 'Adreno (TM) 840', touch: true, android: true })).toBe('high')
    expect(classifyDevice({ ...base, gpu: 'Immortalis-G925', touch: true, android: true })).toBe('high')
    expect(classifyDevice({ ...base, gpu: 'Adreno (TM) 840', touch: true, android: true, phone: true })).toBe('medium')
    expect(classifyDevice({ ...base, gpu: 'Adreno (TM) 740', touch: true, android: true })).toBe('medium')
  })
  it('kézzel választott, az eszköznél magasabb szintnél figyelmeztetés jár; automatikusnál nem', () => {
    expect(qualityAboveDevice('ultra', 'low')).toBe(true)
    expect(qualityAboveDevice('ultra', 'medium')).toBe(true)
    expect(qualityAboveDevice('medium', 'low')).toBe(true)
    expect(qualityAboveDevice('ultra', 'high')).toBe(false)
    expect(qualityAboveDevice('low', 'low')).toBe(false)
    expect(qualityAboveDevice('auto', 'low')).toBe(false)
  })
})

describe('képpont-keret (budgetDpr)', () => {
  it('álló, nagy felbontású tableten az alacsony szint legfeljebb ~1,2 MP-t rajzol', () => {
    const [, max] = budgetDpr(qualitySettings('low'), 800, 1280)
    expect(800 * 1280 * max * max).toBeLessThanOrEqual(1_200_001)
    expect(max).toBeGreaterThanOrEqual(0.75)
  })
  it('kis vásznon a szint saját dpr-e marad', () => {
    expect(budgetDpr(qualitySettings('medium'), 600, 500)).toEqual(qualitySettings('medium').dpr)
  })
  it('magas és ultra szinten nincs keret (asztali kép változatlan)', () => {
    expect(budgetDpr(qualitySettings('ultra'), 2560, 1440)).toEqual(qualitySettings('ultra').dpr)
    expect(budgetDpr(qualitySettings('high'), 1015, 830)).toEqual(qualitySettings('high').dpr)
  })
})

describe('oldalarányok', () => {
  it('besorolás: telefon, fekvő telefon, álló tablet (3:4, 10:16, 7:10), asztal', () => {
    expect(viewportKind(390, 844, true)).toBe('phone')
    expect(viewportKind(844, 390, true)).toBe('landscape-phone')
    expect(viewportKind(768, 1024, true)).toBe('tablet-portrait')
    expect(viewportKind(800, 1280, true)).toBe('tablet-portrait')
    expect(viewportKind(834, 1194, true)).toBe('tablet-portrait')
    expect(viewportKind(1024, 1366, true)).toBe('tablet-portrait')
    expect(viewportKind(1024, 768, true)).toBe('desktop')
    expect(viewportKind(1400, 1000, false)).toBe('desktop')
    expect(viewportKind(1280, 800, true)).toBe('desktop')
    expect(usesSheetLayout('tablet-portrait')).toBe(true)
  })
  it('kamera: álló képen tágabb látószög; a telefonos hátrébb állás nem érvényes tabletre', () => {
    expect(overviewFov(0.75)).toBe(48)
    expect(overviewFov(16 / 10)).toBe(38)
    expect(sheetDistanceScale('phone')).toBe(1.45)
    expect(sheetDistanceScale('tablet-portrait')).toBeLessThan(1.2)
    expect(sheetDistanceScale('desktop')).toBe(1)
  })
  it('a CSS minden lapos/oldalpaneles töréspontja tartalmazza az álló tabletet (szinkronban a JS-sel)', () => {
    const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
    const portrait = '(orientation: portrait) and (max-width: 1100px)'
    expect(SHEET_LAYOUT_QUERY).toContain(portrait)
    const queries = css.match(/@media[^{]+\{/g) ?? []
    const sheet = queries.filter((query) => query.includes('(max-width: 820px), (orientation: landscape) and (max-height: 520px) and (pointer: coarse)'))
    const desktop = queries.filter((query) => query.includes('(min-width: 821px) and (not ((orientation: landscape) and (max-height: 520px) and (pointer: coarse)))'))
    expect(sheet.length).toBeGreaterThan(10)
    expect(desktop.length).toBeGreaterThan(3)
    for (const query of sheet) expect(query).toContain(portrait)
    for (const query of desktop) expect(query).toContain(`(not (${portrait}))`)
  })
})
