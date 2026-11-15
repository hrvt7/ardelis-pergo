import { describe, expect, it } from 'vitest'
import { CAMERA_VIEW_LIST, cameraViewsFor } from '@/lib/cameraViews'

describe('kameranézetek a Nézet menüben', () => {
  it('pergolánál mind az öt nézet, sorrendben', () => {
    expect(cameraViewsFor('pergola').map((view) => view.label)).toEqual(['Kívülről', 'Alulról', 'Felülről', 'Részlet', 'Kanapé'])
  })
  it('carportnál nincs kanapé-panoráma', () => {
    expect(cameraViewsFor('carport').map((view) => view.id)).not.toContain('sofa')
    expect(cameraViewsFor('carport')).toHaveLength(CAMERA_VIEW_LIST.length - 1)
  })
})
