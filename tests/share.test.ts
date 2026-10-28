import { describe, expect, it } from 'vitest'
import { configToCompact, decodeShareHash, shareHash } from '../src/lib/shareCode'
import { parseConfig } from '../src/tenants/rules'
import { demoTenant } from '../src/tenants/demo'
import type { PergolaConfig, SideType } from '../src/types/pergola'

const SIDES: SideType[] = ['none', 'zip', 'glass', 'louver']
let seed = 7
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
const pick = <T,>(list: readonly T[]) => list[Math.floor(rnd() * list.length)]

describe('megosztó link oda-vissza', () => {
  it('1000 véletlen konfiguráció változatlanul visszajön', () => {
    for (let i = 0; i < 1000; i++) {
      const frameColor = pick(['anthracite', 'black', 'white', 'bronze', 'custom'] as const)
      const config: PergolaConfig = {
        width: Math.round((2.5 + rnd() * 4.5) * 20) / 20, depth: Math.round((2.5 + rnd() * 2.5) * 20) / 20, height: Math.round((2.2 + rnd()) * 20) / 20,
        mount: pick(['wall', 'corner-left', 'corner-right', 'niche', 'freestanding'] as const), roof: pick(['louvered', 'retractable', 'fixed'] as const),
        frameColor, ...(frameColor === 'custom' ? { customRal: pick(['RAL 7016', 'ral_9005 (m)', "7035'*!~", 'ŐÜ 1234', '']) } : {}),
        sides: { front: pick(SIDES), back: pick(SIDES), left: pick(SIDES), right: pick(SIDES) },
        louverAngle: Math.round(rnd() * 90), screenOpen: Math.round(rnd() * 100), led: rnd() > 0.5, heaters: Math.floor(rnd() * 5), speakers: rnd() > 0.5, sensors: rnd() > 0.5,
      }
      const expected = parseConfig(demoTenant, config)
      const decoded = parseConfig(demoTenant, decodeShareHash(`#${shareHash(config)}`))
      expect(decoded, configToCompact(config)).toEqual(expected)
    }
  })
  it('a link csak URL-biztos karaktereket tartalmaz', () => {
    const config = { ...demoTenant.defaultConfig, frameColor: 'custom' as const, customRal: "RAL (7016)'!*" }
    expect(shareHash(config)).toMatch(/^c=[A-Za-z0-9_.%-]+$/)
  })
  it('hibás link nem dob hibát', () => {
    for (const hash of ['#c=', '#c=abc', '#k=!!!', '#c=500_400', '#k=e30', '#c=1_2_3_X_y_q_zzzz_a_b_c_d_e_f']) expect(() => parseConfig(demoTenant, decodeShareHash(hash))).not.toThrow()
  })
})
