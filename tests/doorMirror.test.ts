import { describe, expect, it } from 'vitest'
import { technicalDrawing } from '../src/lib/drawing'
import { decodeShareHash, shareHash } from '../src/lib/shareCode'
import { demoTenant } from '../src/tenants/demo'
import { normalizeConfig, parseConfig } from '../src/tenants/rules'
import type { PergolaConfig } from '../src/types/pergola'

const base: PergolaConfig = { ...demoTenant.defaultConfig, mount: 'freestanding', sides: { front: 'door', back: 'glassFixed', left: 'doorSliding', right: 'none' } }
const meta = { brand: 'TESZT', contact: 'Teszt Kft.', title: 'Pergola', code: 'PG-TEST', date: '2026. 11. 07.', notes: ['Méretek cm-ben.'] }

describe('ajtó nyitásirány tükrözése', () => {
  it('a megosztó linkben oda-vissza megmarad', () => {
    const config = { ...base, doorMirror: { front: true, left: true } }
    const decoded = parseConfig(demoTenant, decodeShareHash(`#${shareHash(config)}`))
    expect(decoded?.doorMirror).toEqual({ front: true, left: true })
  })
  it('csak ajtós oldalon marad meg', () => {
    const normalized = normalizeConfig(demoTenant, { ...base, doorMirror: { front: true, right: true } })
    expect(normalized.doorMirror).toEqual({ front: true })
    expect(normalizeConfig(demoTenant, { ...base, sides: { ...base.sides, front: 'zip' }, doorMirror: { front: true } }).doorMirror).toBeUndefined()
  })
  it('az alaprajzon a nyitási ív a másik sarokba kerül', () => {
    const leaf = (config: PergolaConfig) => technicalDrawing(config, meta).svg.match(/<line[^>]*class="d-leaf"[^>]*>/)?.[0] ?? ''
    const x = (line: string) => Number(line.match(/x1="([-\d.]+)"/)?.[1])
    const normal = leaf(base)
    const mirrored = leaf({ ...base, doorMirror: { front: true } })
    expect(normal).not.toBe('')
    expect(x(mirrored)).not.toBeCloseTo(x(normal), 1)
  })
})
