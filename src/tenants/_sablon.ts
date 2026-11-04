// SABLON új gyártóhoz — másold le (pl. kovacs-arnyekolas.ts), töltsd ki,
// majd vedd fel az index.ts TENANTS listájába. Részletes leírás: docs/UJ-GYARTO.md
//
// Minden, ami itt nincs felsorolva, a konfigurátorban sem jelenik meg
// (pl. ha nincs `retractable` tető, a választóban sem lesz ott).
import { demoTenant } from './demo'
import type { Tenant } from './types'

export const sablonTenant: Tenant = {
  ...demoTenant,
  id: 'sablon',                         // URL: /k/sablon és /embed/sablon
  demo: false,                          // valós gyártó: „mintaár” feliratok eltűnnek
  brand: {
    name: 'GYÁRTÓ NEVE',
    suffix: '/ PERGOLA',
    // logoUrl: '/tenants/sablon/logo.svg',   // public/tenants/sablon/logo.svg
    legalName: 'Gyártó Kft.',
    website: 'https://www.gyarto.hu',
    phone: '+36 1 234 5678',
    email: 'ajanlat@gyarto.hu',
    address: '1234 Település, Fő utca 1.',
    privacyUrl: 'https://www.gyarto.hu/adatkezeles',
  },
  prices: {
    ...demoTenant.prices,
    // OPCIONÁLIS ármátrix, tetőtípusonként (louvered, retractable, fabric, glass, polycarbonate, fixed).
    // Ha egy tetőtípusra megadod, a m²-ár helyett ez érvényes: { width (m), depth (m), netPrice (Ft, nettó) }.
    // Nem kell minden méretet kitölteni: a köztes méretet a rendszer interpolálja. Törölheted, ha m²-árral dolgozol.
    // priceMatrix: {
    //   louvered: [
    //     { width: 3.0, depth: 3.0, netPrice: 1450000 }, { width: 3.0, depth: 4.0, netPrice: 1820000 },
    //     { width: 4.0, depth: 3.0, netPrice: 1830000 }, { width: 4.0, depth: 4.0, netPrice: 2310000 },
    //   ],
    // },               // ← a gyártó NETTÓ árai kerüljenek ide
  },
  limits: { width: [3, 6], depth: [3, 4.5], height: [2.4, 3], maxHeaters: 2 },
  // Elérhető: 'wall', 'corner-left', 'corner-right', 'niche', 'freestanding'
  mounts: ['wall', 'corner-left', 'corner-right', 'freestanding'],
  roofs: {
    louvered: { name: 'Bioclima', short: 'motoros lamellás', description: 'Motoros, 0–135°-ban dönthető lamellák' },
    fixed: { name: 'Solid', short: 'fix alumínium', description: 'Zárt, fix alumínium tető' },
  },
  sides: ['zip', 'glass'],
  colors: demoTenant.colors.filter((color) => color.id !== 'bronze'),
  customRal: false,
  extras: { led: true, speakers: false, sensors: true, solar: false }, // solar: napelemes fix tető
  energy: { heaterWatts: 2000 },         // a kínált fűtőpanel teljesítménye (W) az üzemeltetési becsléshez
  installmentMonths: 0,                 // 0 = nincs havi részlet példa
  defaultConfig: { ...demoTenant.defaultConfig, sides: { front: 'none', back: 'none', left: 'zip', right: 'none' } },
  presets: [
    { id: 'alap', name: 'Alap', description: '4 × 3 m · falhoz csatlakozó', config: { width: 4, depth: 3, mount: 'wall' } },
    { id: 'komfort', name: 'Komfort', description: '5 × 4 m · ZIP + LED', config: { width: 5, depth: 4, led: true } },
  ],
  lead: {
    recipients: ['ajanlat@gyarto.hu'],
    subjectPrefix: '[Pergola érdeklődő]',
  },
}
