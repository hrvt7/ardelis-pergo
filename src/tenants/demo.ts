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
  // Bemutató árak — 2026. októberi magyar piaci középkategória (nettó, telepítés nélkül; a
  // telepítést az installationRate adja hozzá). Források: hazai gyártói árlisták (pl. 6×4 m
  // motoros lamellás LED-del br. ~5,5 M Ft), tudjukki.hu átlagárak (bioklimatikus ~250–310e,
  // eltolható ~380–440e Ft/m² nettó telepítve), ZIP ~50e Ft/m², keret nélküli tolóüveg ~105e Ft/m²
  // (5 × 2,6 m nettó 1,4 M Ft), kulcsrakész napelem 300–350e Ft/kWp nettó. Éles gyártónál a saját
  // árlistája kerül ide.
  prices: {
    louveredPerM2Net: 165000,
    retractablePerM2Net: 240000,
    fixedPerM2Net: 85000,
    fabricRoofPerM2Net: 125000,
    glassRoofPerM2Net: 105000,
    polycarbonatePerM2Net: 70000,
    freestandingSurchargeNet: 120000,
    sideWallAttachPerMeterNet: 24000,
    postNet: 65000,
    zipPerM2Net: 45000,
    glassPerM2Net: 105000,
    louverWallPerM2Net: 70000,
    ledPerMeterNet: 10000,
    heaterUnitNet: 200000,
    speakerPairNet: 220000,
    sensorsNet: 95000,
    solarPerKwpNet: 330000,
    glassFramedPerM2Net: 95000,
    glassFixedPerM2Net: 80000,
    slatAluPerM2Net: 55000,
    slatWoodPerM2Net: 45000,
    splitProfileNet: 35000,
    ledRgbPerMeterNet: 4000,
    fanUnitNet: 130000,
    smartHomeNet: 120000,
    customColorRate: 0.06,
    woodColorRate: 0.18,
    installationRate: 0.1,
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
  sides: ['zip', 'glass', 'glassFramed', 'glassFixed', 'louver', 'slatAlu', 'slatWood'],
  colors: [
    { id: 'anthracite', name: 'Antracit', detail: 'RAL 7016', hex: '#343a3d', modelHex: '#323a3d', ral: '7016' },
    { id: 'white', name: 'Fehér', detail: 'RAL 9016', hex: '#dedfd9', ral: '9016' },
    { id: 'black', name: 'Fekete', detail: 'RAL 9005', hex: '#15191c', modelHex: '#191d20', ral: '9005' },
    { id: 'bronze', name: 'Bronz', detail: 'anodizált hatás', hex: '#705b4c' },
  ],
  customRal: true,
  twoTone: true,
  extras: { led: true, speakers: true, sensors: true, solar: true, rgb: true, fans: true, smartHome: true },
  energy: { heaterWatts: 2000 },
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
