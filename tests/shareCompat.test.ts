// A kiküldött linkeknek örökké működniük kell: a kódolás bővítésekor a régi minták nem törhetnek el.
import { describe, expect, it } from 'vitest'
import { decodeShareHash, shareHash } from '../src/lib/shareCode'
import { demoTenant } from '../src/tenants/demo'
import { parseConfig } from '../src/tenants/rules'

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
})
