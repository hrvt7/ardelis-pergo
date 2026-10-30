// Motoros tetőárnyékoló üveg- és polikarbonát tetőhöz: tető feletti (kívül, a napot az üveg előtt fogja meg)
// vagy tető alatti (belül, védett, olcsóbb). Egyetlen igazságforrás az árhoz, a linkhez, a 3D-hez és a szöveghez.
import { isGlazedRoof } from './roofs'
import type { PergolaConfig, PriceSettings, RoofShade, RoofType, ShadeFabric } from '../types/pergola'

export const ROOF_SHADES: RoofShade[] = ['above', 'below']

export const ROOF_SHADE_INFO: Record<RoofShade, { label: string; short: string; description: string; benefit: string; share: string; spec: string; priceKey: keyof Pick<PriceSettings, 'roofShadeAbovePerM2Net' | 'roofShadeBelowPerM2Net'> }> = {
  above: {
    label: 'Tető feletti árnyékoló',
    short: 'tető feletti',
    description: 'Kívül, az üveg felett futó ponyva, oldalsó vezetősínben',
    benefit: 'A napot még az üveg előtt fogja meg: alatta érezhetően hűvösebb',
    share: 'a',
    spec: 'SA',
    priceKey: 'roofShadeAbovePerM2Net',
  },
  below: {
    label: 'Tető alatti árnyékoló',
    short: 'tető alatti',
    description: 'Belül, a bordázat alatt futó ponyva, időjárástól védve',
    benefit: 'Védett helyen, kedvezőbb áron; a fényt szűri, a hőt kevésbé',
    share: 'b',
    spec: 'SB',
    priceKey: 'roofShadeBelowPerM2Net',
  },
}

export const SHADE_FABRICS: { id: ShadeFabric; name: string; hex: string; share: string }[] = [
  { id: 'white', name: 'Fehér', hex: '#ecebe5', share: 'w' },
  { id: 'sand', name: 'Homok', hex: '#d6c9ae', share: 's' },
  { id: 'grey', name: 'Szürke', hex: '#9b9d9b', share: 'g' },
  { id: 'anthracite', name: 'Antracit', hex: '#4a4e50', share: 'a' },
]

export const DEFAULT_SHADE_FABRIC: ShadeFabric = 'white'

/** Csak bordázott (üveg / polikarbonát) tetőhöz kérhető. */
export const supportsRoofShade = (roof: RoofType) => isGlazedRoof(roof)

export const findShadeFabric = (id: ShadeFabric | undefined) => SHADE_FABRICS.find((item) => item.id === id) ?? SHADE_FABRICS[0]

/** Az árnyékolt felület (m²): a tető teljes alapterülete. */
export const roofShadeArea = (config: Pick<PergolaConfig, 'width' | 'depth'>) => Math.round(config.width * config.depth * 100) / 100

/** Rövid leírás (összegzés, kérelem, PDF): „tető feletti motoros árnyékoló, fehér ponyva”. */
export function roofShadeSummary(config: Pick<PergolaConfig, 'roofShade' | 'shadeFabric'>) {
  if (!config.roofShade) return ''
  return `${ROOF_SHADE_INFO[config.roofShade].short} motoros árnyékoló, ${findShadeFabric(config.shadeFabric).name.toLowerCase()} ponyva`
}
