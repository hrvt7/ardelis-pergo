import { describe, expect, it } from 'vitest'
import { quickColors } from '../src/lib/rebuildColors'

const colors = [
  { id: 'anthracite', name: 'Antracit', detail: 'RAL 7016', hex: '#343a3d', ral: '7016' },
  { id: 'white', name: 'Fehér', detail: 'RAL 9016', hex: '#dedfd9', ral: '9016' },
  { id: 'black', name: 'Fekete', detail: 'RAL 9005', hex: '#15191c', ral: '9005' },
  { id: 'bronze', name: 'Bronz', detail: 'anodizált hatás', hex: '#705b4c' },
]

describe('rövid színlista', () => {
  it('a gyártó alapszínei elöl, majd a gyakori RAL színek ismétlés nélkül, összesen 6', () => {
    const list = quickColors({ colors, customRal: true } as never)
    expect(list).toHaveLength(6)
    expect(list.slice(0, 4).map((item) => item.key)).toEqual(['anthracite', 'white', 'black', 'bronze'])
    expect(list.slice(4).every((item) => item.color === 'custom' && !item.standard)).toBe(true)
    expect(new Set(list.map((item) => item.detail)).size).toBe(6)
  })

  it('ha a gyártó nem vállal egyedi RAL-t, csak az alapszínei', () => {
    expect(quickColors({ colors, customRal: false } as never).map((item) => item.key)).toEqual(['anthracite', 'white', 'black', 'bronze'])
  })
})
