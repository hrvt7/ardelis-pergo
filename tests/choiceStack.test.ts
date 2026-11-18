import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { RoofType, SideType } from '@/types/pergola'
import { ROOF_GROUPS, roofGroup, SIDE_GROUPS, sideGroup, thumbFor } from '@/lib/choiceGroups'

const SIDES: SideType[] = ['none', 'zip', 'glass', 'glassFramed', 'glassFixed', 'door', 'doorSliding', 'louver', 'slatAlu', 'slatWood']
const ROOFS: RoofType[] = ['louvered', 'retractable', 'fabric', 'glass', 'polycarbonate', 'fixed']
const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')

describe('egy fő döntés + halk lehetőségek (tető, oldalak)', () => {
  it('minden oldal- és tetőtípusnak van saját 3D-ből renderelt bélyegképe', () => {
    for (const type of SIDES) expect(existsSync(new URL(`../public${thumbFor('side', type)}`, import.meta.url))).toBe(true)
    for (const roof of ROOFS) expect(existsSync(new URL(`../public${thumbFor('roof', roof)}`, import.meta.url))).toBe(true)
  })
  it('oldalak három csoportban: nyitott / árnyékoló, üveg (5), lamella / léc (3)', () => {
    const [open, glass, slat] = SIDE_GROUPS()
    expect(SIDES.filter((t) => sideGroup(t) === open)).toEqual(['none', 'zip'])
    expect(SIDES.filter((t) => sideGroup(t) === glass)).toEqual(['glass', 'glassFramed', 'glassFixed', 'door', 'doorSliding'])
    expect(SIDES.filter((t) => sideGroup(t) === slat)).toEqual(['louver', 'slatAlu', 'slatWood'])
  })
  it('tetők két csoportban: mozgatható és fix fedés', () => {
    const [moving, fixed] = ROOF_GROUPS()
    expect(ROOFS.filter((r) => roofGroup(r) === moving)).toEqual(['louvered', 'retractable', 'fabric'])
    expect(ROOFS.filter((r) => roofGroup(r) === fixed)).toEqual(['glass', 'polycarbonate', 'fixed'])
  })
  it('a kiválasztott nagy kártyán lime bal sáv és beúszás; a többi sor halk felárral', () => {
    const css = read('src/components/rebuild/rebuild.css')
    expect(css).toMatch(/\.rb-choice-hero::before \{[^}]*background: var\(--rb-accent\);/)
    expect(css).toMatch(/\.rb-choice-row em \{[^}]*font-size: 12\.5px; font-weight: 500;/)
    expect(css).toContain('@keyframes rb-hero-in')
    expect(read('src/components/rebuild/RoofStep.tsx')).toContain('<ChoiceStack')
    expect(read('src/components/rebuild/SidesStep.tsx')).toContain('<ChoiceStack')
  })
  it('a ZIP nyitottság csúszkája csak ZIP-es oldalnál látszik', () => {
    expect(read('src/components/rebuild/SidesStep.tsx')).toContain("{hasZip && types.includes('zip') && <LiquidSlider")
  })
})
