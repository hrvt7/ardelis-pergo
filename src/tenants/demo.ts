// Bemutató gyártó: a konfigurátor eddigi tartalma változatlanul.
// Ezt mutatod a gyártóknak; egy valós ügyfélnél ennek a fájlnak a másolatát
// kell kitölteni (lásd docs/UJ-GYARTO.md).
import { SERVICE_REGIONS } from '../../contracts/catalog'
import type { Tenant } from './types'

export const demoTenant: Tenant = {
  id: 'demo',
  demo: true,
  brand: {
    name: 'ARDELIS',
    suffix: '/ PERGO',
    legalName: 'ARDELIS Atelier (bemutató)',
  },
  currency: 'HUF',
  prices: {
    louveredPerM2Net: 220000,
    retractablePerM2Net: 340000,
    fixedPerM2Net: 80000,
    fabricRoofPerM2Net: 195000,
    glassRoofPerM2Net: 150000,
    polycarbonatePerM2Net: 95000,
    freestandingSurchargeNet: 120000,
    sideWallAttachPerMeterNet: 24000,
    postNet: 65000,
    zipPerM2Net: 85000,
    glassPerM2Net: 165000,
    louverWallPerM2Net: 120000,
    ledPerMeterNet: 12000,
    heaterUnitNet: 220000,
    speakerPairNet: 280000,
    sensorsNet: 180000,
    customColorRate: 0.06,
    installationRate: 0.12,
    vatRate: 0.27,
  },
  limits: {
    width: [2.5, 7],
    depth: [2.5, 5],
    height: [2.2, 3.2],
    maxHeaters: 4,
  },
  mounts: ['wall', 'corner-left', 'corner-right', 'niche', 'freestanding'],
  roofs: {
    louvered: { name: 'Aero', short: 'motoros lamellás', description: 'Motoros, 0–90°-ban dönthető lamellák' },
    retractable: { name: 'Glide', short: 'eltolható lamellás', description: 'Eltolható lamellacsomag, nagy nyitott felület' },
    fabric: { name: 'Velum', short: 'behúzható textiltető', description: 'Vízzáró ponyva, motorral behúzható' },
    glass: { name: 'Lumen', short: 'üvegtető', description: 'Biztonsági üveg, világos és esőálló' },
    polycarbonate: { name: 'Opal', short: 'polikarbonát tető', description: 'Opál, szórt fényt adó, kedvező árú' },
    fixed: { name: 'Line', short: 'fix alumínium', description: 'Zárt, fix alumínium tető' },
  },
  sides: ['zip', 'glass', 'louver'],
  colors: [
    { id: 'anthracite', name: 'Antracit', detail: 'RAL 7016', hex: '#343a3d', modelHex: '#323a3d' },
    { id: 'white', name: 'Fehér', detail: 'RAL 9016', hex: '#dedfd9' },
    { id: 'black', name: 'Fekete', detail: 'RAL 9005', hex: '#15191c', modelHex: '#191d20' },
    { id: 'bronze', name: 'Bronz', detail: 'anodizált hatás', hex: '#705b4c' },
  ],
  customRal: true,
  extras: { led: true, speakers: true, sensors: true },
  installmentMonths: 60,
  regions: SERVICE_REGIONS,
  defaultConfig: {
    width: 5,
    depth: 4,
    height: 2.6,
    mount: 'wall',
    roof: 'louvered',
    frameColor: 'anthracite',
    sides: { front: 'none', back: 'none', left: 'zip', right: 'none' },
    louverAngle: 35,
    screenOpen: 65,
    led: true,
    heaters: 0,
    speakers: false,
    sensors: true,
  },
  presets: [
    {
      id: 'basic', name: 'Alap', description: '3,5 × 3 m · nyitott, letisztult',
      config: { width: 3.5, depth: 3, mount: 'freestanding', sides: { front: 'none', back: 'none', left: 'none', right: 'none' }, led: false, sensors: false },
    },
    { id: 'comfort', name: 'Komfort', description: '5 × 4 m · ZIP + LED + szenzor', config: {} },
    {
      id: 'premium', name: 'Prémium', description: '6 × 4,5 m · üveg + fűtés + hang',
      config: { width: 6, depth: 4.5, mount: 'freestanding', frameColor: 'black', sides: { front: 'glass', back: 'louver', left: 'glass', right: 'zip' }, heaters: 2, speakers: true },
    },
  ],
  lead: {
    recipients: [],
    subjectPrefix: '[Pergola demó]',
  },
}
