// Bemutató gyártó az osztrák piacra: EUR, 20% osztrák ÁFA, osztrák tartományok, német terméktartalom.
// URL: /k/demo-at. A bemutató mintaárak a magyar demó árai, ~395 Ft/€ árfolyammal átváltva és 5 €-ra
// kerekítve — NEM osztrák piackutatás [TO VERIFY: osztrák gyártói árlista az első éles gyártónál].
// EUR gyártó egyelőre csak teraszfedést kínálhat (a többi termékcsalád árazója forintos).
import { demoTenant } from './demo'
import type { Tenant } from './types'

/** Az osztrák szövetségi tartományok (Bundesländer) a felmérési űrlaphoz. */
export const AT_REGIONS = ['Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich', 'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien'] as const

export const demoAtTenant: Tenant = {
  ...demoTenant,
  id: 'demo-at',
  demo: true,
  products: ['pergola'],
  brand: {
    name: 'Lamelix',
    legalName: 'Lamelix (Demo)',
    // [TO VERIFY] Német nyelvű adatkezelési tájékoztató jogi átnézéssel; addig a magyar oldal.
    privacyUrl: '/adatkezeles',
  },
  platformCredit: false,
  locale: 'de',
  currency: 'EUR',
  prices: {
    louveredPerM2Net: 420,
    retractablePerM2Net: 610,
    fixedPerM2Net: 215,
    fabricRoofPerM2Net: 315,
    glassRoofPerM2Net: 265,
    polycarbonatePerM2Net: 175,
    freestandingSurchargeNet: 305,
    sideWallAttachPerMeterNet: 60,
    postNet: 165,
    zipPerM2Net: 115,
    glassPerM2Net: 265,
    louverWallPerM2Net: 175,
    ledPerMeterNet: 25,
    heaterUnitNet: 505,
    speakerPairNet: 555,
    sensorsNet: 240,
    solarPerKwpNet: 835,
    glassFramedPerM2Net: 240,
    glassFixedPerM2Net: 205,
    slatAluPerM2Net: 140,
    slatWoodPerM2Net: 115,
    splitProfileNet: 90,
    ledRgbPerMeterNet: 10,
    fanUnitNet: 330,
    smartHomeNet: 305,
    roofShadeAbovePerM2Net: 130,
    roofShadeBelowPerM2Net: 95,
    glazingSatinPerM2Net: 30,
    glazingHeatPerM2Net: 55,
    glazingOpalPerM2Net: 40,
    glazingTintedPerM2Net: 45,
    pitchPerDegreePerMeterNet: 5,
    customColorRate: 0.06,
    woodColorRate: 0.18,
    installationRate: 0.1,
    doorHingedNet: 660,
    doorSlidingNet: 1215,
    wallGlazingDoublePerM2Net: 60,
    wallGlazingTriplePerM2Net: 105,
    thermalProfileRate: 0.14,
    foundationPerM2Net: 95,
    climateSplitNet: 1215,
    underfloorPerM2Net: 75,
    // Österreich: 20% USt.
    vatRate: 0.2,
  },
  roofs: {
    louvered: { name: 'Aero', short: 'motorisierte Lamellen', description: 'Motorisch 0–90° schwenkbare Lamellen' },
    retractable: { name: 'Glide', short: 'verschiebbare Lamellen', description: 'Verschiebbares Lamellenpaket, große offene Fläche' },
    fabric: { name: 'Velum', short: 'einfahrbares Textildach', description: 'Wasserdichte Membran, motorisch einfahrbar' },
    glass: { name: 'Lumen', short: 'Glasdach', description: 'Sicherheitsglas, hell und regendicht' },
    polycarbonate: { name: 'Opal', short: 'Polycarbonatdach', description: 'Opal, streut das Licht, preisgünstig' },
    fixed: { name: 'Line', short: 'festes Aluminiumdach', description: 'Geschlossenes, festes Aluminiumdach' },
  },
  colors: [
    { id: 'anthracite', name: 'Anthrazit', detail: 'RAL 7016', hex: '#343a3d', modelHex: '#323a3d', ral: '7016' },
    { id: 'white', name: 'Weiß', detail: 'RAL 9016', hex: '#dedfd9', ral: '9016' },
    { id: 'black', name: 'Schwarz', detail: 'RAL 9005', hex: '#15191c', modelHex: '#191d20', ral: '9005' },
    { id: 'bronze', name: 'Bronze', detail: 'eloxiert-Optik', hex: '#705b4c' },
  ],
  // Ratenbeispiel nur mit geprüften österreichischen Konditionen; bis dahin aus.
  installmentMonths: 0,
  regions: AT_REGIONS,
  presets: [
    {
      id: 'basic', name: 'Basis', description: '3,5 × 3 m · offen, schlicht',
      config: { width: 3.5, depth: 3, mount: 'freestanding', sides: { front: 'none', back: 'none', left: 'none', right: 'none' }, led: false, sensors: false },
    },
    { id: 'comfort', name: 'Komfort', description: '5 × 4 m · ZIP + LED + Sensor', config: {}, featured: true },
    {
      id: 'premium', name: 'Premium', description: '6 × 4,5 m · Glas + Heizung + Sound',
      config: { width: 6, depth: 4.5, mount: 'freestanding', frameColor: 'black', sides: { front: 'glass', back: 'louver', left: 'glass', right: 'zip' }, heaters: 2, speakers: true },
    },
    {
      id: 'veranda', name: 'Veranda', description: '5 × 3,5 m · Glaswand, Schiebetür, Glasdach',
      config: { width: 5, depth: 3.5, mount: 'wall', roof: 'glass', building: 'veranda', sides: { front: 'doorSliding', back: 'none', left: 'glassFixed', right: 'glassFixed' }, led: true, sensors: false },
    },
    {
      id: 'conservatory', name: 'Wintergarten', description: '5 × 4 m · Wärmeschutzglas, Tür, Klima',
      config: { width: 5, depth: 4, mount: 'wall', roof: 'glass', building: 'conservatory', pitch: 3, climate: 'split', foundation: true, sides: { front: 'door', back: 'none', left: 'glassFixed', right: 'glassFixed' }, led: true, sensors: false },
    },
  ],
  lead: {
    recipients: [],
    subjectPrefix: '[Pergola Demo AT]',
  },
}
