// A kiküldött linkeknek örökké működniük kell: a kódolás bővítésekor a régi minták nem törhetnek el.
import { describe, expect, it } from 'vitest'
import { decodeShareHash, shareHash } from '../src/lib/shareCode'
import { demoTenant } from '../src/tenants/demo'
import { parseConfig } from '../src/tenants/rules'

// Rögzített, korábban kiküldött linkek (NEM generáljuk újra): ha egy flag betűje vagy a mezők sorrendje
// változna, itt derül ki, hogy a régi QR-kódok és e-mailben küldött hivatkozások elromlanának.
const FROZEN = {
  /** 3.4x — flagek nélküli alapformátum (13 mező). */
  base: '#c=500_400_260_W_l_a_00z0_35_65_1_0_0_1',
  /** 3.5x — fix tető, egyedi RAL (a 7016 katalógusszín lenne, ezért 3020) + napelem, RGB LED, 2 ventilátor, okosotthon. */
  flags: '#c=620_350_280_F_f_c_z0z0_45_30_1_2_1_1_RAL3020_p-r-v2-h',
  /** 3.66 — három összekapcsolt modul, üres RAL-mező. */
  modules: '#c=1200_400_260_W_l_a_00z0_35_65_1_0_0_1__n3',
  /** Legrégebbi (#k=) base64 JSON forma. */
  legacy: '#k=eyJ3aWR0aCI6NSwiZGVwdGgiOjQsImhlaWdodCI6Mi42LCJtb3VudCI6IndhbGwiLCJyb29mIjoibG91dmVyZWQiLCJmcmFtZUNvbG9yIjoiYW50aHJhY2l0ZSIsInNpZGVzIjp7ImZyb250Ijoibm9uZSIsImJhY2siOiJub25lIiwibGVmdCI6InppcCIsInJpZ2h0Ijoibm9uZSJ9LCJsb3V2ZXJBbmdsZSI6MzUsInNjcmVlbk9wZW4iOjY1LCJsZWQiOnRydWUsImhlYXRlcnMiOjAsInNwZWFrZXJzIjpmYWxzZSwic2Vuc29ycyI6dHJ1ZX0',
}

describe('megosztó link kompatibilitás', () => {
  it('a mai kód visszafejthető, és ugyanazt a konfigurációt adja', () => {
    const hash = `#${shareHash(demoTenant.defaultConfig)}`
    const back = parseConfig(demoTenant, decodeShareHash(hash))
    expect(back).toEqual(parseConfig(demoTenant, decodeShareHash(hash)))
    expect(back).not.toBeNull()
  })
  it('a hibás vagy csonka link nem dob hibát', () => {
    for (const hash of ['#c=', '#c=999', '#k=@@@', '#c=1_2_3', '#semmi']) {
      expect(() => parseConfig(demoTenant, decodeShareHash(hash))).not.toThrow()
    }
  })
  it('a flag nélküli régi link ma is ugyanazt a pergolát adja', () => {
    const config = parseConfig(demoTenant, decodeShareHash(FROZEN.base))
    expect(config).toMatchObject({ width: 5, depth: 4, height: 2.6, mount: 'wall', roof: 'louvered', frameColor: 'anthracite', louverAngle: 35, screenOpen: 65, led: true, heaters: 0, speakers: false, sensors: true })
    expect(config?.sides).toEqual({ front: 'none', back: 'none', left: 'zip', right: 'none' })
    expect(config?.modules ?? 1).toBe(1)
  })
  it('a RAL-t és a kapcsolókat hordozó régi link minden mezője megmarad', () => {
    const config = parseConfig(demoTenant, decodeShareHash(FROZEN.flags))
    expect(config).toMatchObject({ width: 6.2, depth: 3.5, height: 2.8, mount: 'freestanding', roof: 'fixed', frameColor: 'custom', customRal: 'RAL 3020', heaters: 2, speakers: true, solar: true, ledRgb: true, fans: 2, smartHome: true })
    expect(config?.sides).toEqual({ front: 'zip', back: 'none', left: 'zip', right: 'none' })
  })
  it('a modulos link a modulszámot és a teljes szélességet adja vissza', () => {
    const config = parseConfig(demoTenant, decodeShareHash(FROZEN.modules))
    expect(config).toMatchObject({ width: 12, modules: 3 })
  })
  it('a legrégebbi (#k=) link is beolvasható', () => {
    const config = parseConfig(demoTenant, decodeShareHash(FROZEN.legacy))
    expect(config).toMatchObject({ width: 5, depth: 4, roof: 'louvered', led: true })
  })
  it('a mai kódolás nem tér el a rögzített mintától (ha mégis, a régi linkek is sérülnek)', () => {
    expect(`#${shareHash(demoTenant.defaultConfig)}`).toBe(FROZEN.base)
  })
})
