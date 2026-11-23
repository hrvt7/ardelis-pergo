import { describe, expect, it } from 'vitest'
import { brightenPhotoColor, defaultWallColor, findWindowColor, houseSummary, isOriginalCedar, parseHouseLook, WALL_COLORS, wallColorHex, wallColorName, WINDOW_COLORS } from '@/lib/house'
import { findColor, normalizeColorCode, pickCatalogColor } from '@/lib/colors'
import { DEFAULT_SCENE } from '@/lib/config'
import { demoTenant } from '@/tenants/demo'

const HEX = /^#[0-9a-f]{6}$/

describe('ház kinézete', () => {
  it('a katalógus érvényes: egyedi azonosítók, hex színek', () => {
    for (const list of Object.values(WALL_COLORS)) {
      expect(new Set(list.map((item) => item.id)).size).toBe(list.length)
      list.forEach((item) => expect(item.hex).toMatch(HEX))
    }
    expect(new Set(WINDOW_COLORS.map((item) => item.id)).size).toBe(WINDOW_COLORS.length)
    WINDOW_COLORS.forEach((item) => expect(item.hex).toMatch(HEX))
  })

  it('minden nyílászáró-színhez van rendelhető pergolaszín (a demó gyártónál)', () => {
    for (const swatch of WINDOW_COLORS) {
      expect(findColor(swatch.match), swatch.match).toBeTruthy()
      const pick = pickCatalogColor(demoTenant, swatch.match)
      expect(pick, swatch.id).toBeTruthy()
    }
    // Antracit ablak → a gyártó antracit alapszíne (felár nélkül), nem egyedi RAL.
    expect(pickCatalogColor(demoTenant, findWindowColor('anthracite').match)?.color).not.toBe('custom')
    expect(normalizeColorCode(findWindowColor('white').match)).toBe('RAL 9016')
  })

  it('az alapjelenet a mintaház eredeti cédrus homlokzatát mutatja', () => {
    expect(DEFAULT_SCENE.wallColor).toBe(defaultWallColor('cedar'))
    expect(isOriginalCedar(DEFAULT_SCENE.wallFinish, DEFAULT_SCENE.wallColor)).toBe(true)
    expect(isOriginalCedar('cedar', WALL_COLORS.cedar[4].hex)).toBe(false)
    expect(isOriginalCedar('plaster', defaultWallColor('cedar'))).toBe(false)
  })

  it('hibás vagy hiányzó mentett értéknél alapértéket ad', () => {
    expect(parseHouseLook(null)).toEqual({ houseStyle: 'classic', wallFinish: 'cedar', wallColor: defaultWallColor('cedar'), windowColor: 'anthracite' })
    expect(parseHouseLook({ houseStyle: 'castle', wallFinish: 'marble', wallColor: 'red', windowColor: 'pink' })).toEqual({ houseStyle: 'classic', wallFinish: 'cedar', wallColor: defaultWallColor('cedar'), windowColor: 'anthracite' })
    expect(parseHouseLook({ houseStyle: 'gable', wallFinish: 'plaster', wallColor: '#ABCDEF', windowColor: 'white' })).toEqual({ houseStyle: 'gable', wallFinish: 'plaster', wallColor: '#abcdef', windowColor: 'white' })
    // Anyagváltásnál hiányzó szín: az anyag alapszíne.
    expect(parseHouseLook({ wallFinish: 'brick' }).wallColor).toBe(defaultWallColor('brick'))
    expect(wallColorHex('plaster', undefined)).toBe(defaultWallColor('plaster'))
  })

  it('színnév: katalógusszín, közeli árnyalat, egyedi', () => {
    expect(wallColorName('plaster', '#f1efe9')).toBe('Fehér')
    expect(wallColorName('plaster', '#eee8dc')).toMatch(/árnyalat$/)
    expect(wallColorName('plaster', '#1060ff')).toBe('egyedi szín')
  })

  it('összegzés a gyártónak és a PDF-hez', () => {
    expect(houseSummary({ wallFinish: 'plaster', wallColor: '#ebe3d2', windowColor: 'anthracite' })).toBe('Vakolt homlokzat (törtfehér) · antracit nyílászárók')
    expect(houseSummary({ wallFinish: 'brick', wallColor: '#9b5640', windowColor: 'goldenoak' })).toBe('Tégla homlokzat (vörös) · aranytölgy nyílászárók')
  })

  it('fotós szín világosítása: világosabb, de nem fehér', () => {
    const lifted = brightenPhotoColor('#806040')
    expect(lifted).toMatch(HEX)
    expect(parseInt(lifted.slice(1, 3), 16)).toBeGreaterThan(0x80)
    expect(lifted).not.toBe('#ffffff')
    expect(brightenPhotoColor('nonsense')).toMatch(HEX)
  })
})
