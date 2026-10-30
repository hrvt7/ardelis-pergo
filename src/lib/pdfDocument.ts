// A PDF-összefoglaló dokumentumdefiníciója (pdfmake). DOM nélküli, ezért tesztből és
// szerveren is felépíthető. Négy oldal: borító, konfiguráció + anyaglista, ár + teendők, műszaki rajz.
import type { Content, ContentTable, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces'
import { drawingLevels, POST, technicalDrawing } from './drawing'
import { isWallSide, MOUNT_LABELS, postPositions, wallLabel } from './mount'
import { formatHuf, formatNumber } from './pricing'
import { ROOF_INFO } from './roofs'
import { getBom, getDeliveryEstimate, getSpecCode } from './specification'
import { DEFAULT_USAGE, estimateEnergy, roundCost, TARIFF, type EnergyUsage } from './energy'
import { estimateSolar, PANEL } from './solar'
import { SIDE_INFO, sideSegments, HALF_NAMES } from './sides'
import { colorLabel, colorSummary, frameColorInfo, roofColorInfo, roofPartName, type ColorInfo } from './colors'
import type { Tenant } from '../tenants/types'
import type { PergolaConfig, PriceBreakdown, RoofType, SideKey, SideType } from '../types/pergola'

export const PDF_FONT_FILES = { regular: 'Manrope-400.ttf', semi: 'Manrope-600.ttf', bold: 'Manrope-700.ttf', heavy: 'Manrope-800.ttf' } as const
export const PDF_FONTS = {
  Manrope: { normal: PDF_FONT_FILES.regular, bold: PDF_FONT_FILES.bold, italics: PDF_FONT_FILES.regular, bolditalics: PDF_FONT_FILES.bold },
  ManropeSemi: { normal: PDF_FONT_FILES.semi, bold: PDF_FONT_FILES.semi, italics: PDF_FONT_FILES.semi, bolditalics: PDF_FONT_FILES.semi },
  ManropeHeavy: { normal: PDF_FONT_FILES.heavy, bold: PDF_FONT_FILES.heavy, italics: PDF_FONT_FILES.heavy, bolditalics: PDF_FONT_FILES.heavy },
}

const INK = '#141a19'
const BODY = '#2b3331'
const MUTED = '#6a7470'
const HAIR = '#dfe3de'
const PAPER = '#f3f5f1'
const ACCENT = '#18322b'
const LIME = '#d9f99d'
const MM = 72 / 25.4
/** A műszaki rajz lapja (mm): A4 fekvő a PDF margóin belül. */
export const PDF_SHEET = { width: (841.89 - 80) / MM, height: (595.28 - 44 - 40) / MM }

const SIDE_NAMES: Record<SideKey, string> = { front: 'Elöl', back: 'Hátul', left: 'Bal oldal', right: 'Jobb oldal' }

export interface PdfInput {
  config: PergolaConfig
  price: PriceBreakdown
  tenant: Tenant
  /** Nem használt (a gyártói tetőneveket a tenantból vesszük); visszafelé kompatibilitás miatt marad. */
  roofLabels?: Record<RoofType, string>
  /** A 3D-nézet képe (data URL); ha nincs, a borító kép nélkül készül. */
  image?: string
  imageAspect?: number
  /** A konfiguráció megosztó linkje — a borítón QR-kódként. */
  shareUrl?: string
  date?: Date
  /** Az üzemeltetési becslés beállításai (a felületen állítottak szerint). */
  energyUsage?: EnergyUsage
  /** A vásárló által adott név (pl. „Kovácsék terasza”) a borítón. */
  projectName?: string
  /** A vásárló házának leírása (a 3D-ben beállított homlokzat és nyílászárók). */
  house?: string
}

const m2 = (value: number) => formatNumber(value, 2)
const hu = (date: Date) => date.toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' })

export function buildPdfDefinition({ config, price, tenant, image, imageAspect = 16 / 10, shareUrl, date = new Date(), energyUsage = DEFAULT_USAGE, projectName, house }: PdfInput): TDocumentDefinitions {
  const brand = tenant.brand.name
  const brandLine = [brand, tenant.brand.suffix].filter(Boolean).join(' ')
  const code = getSpecCode(config)
  const roof = ROOF_INFO[config.roof]
  const tenantRoof = tenant.roofs[config.roof]
  const roofName = tenantRoof?.name ?? roof.name
  const roofShort = tenantRoof?.short ?? roof.short
  const frameInfo = frameColorInfo(tenant, config)
  const roofInfo = config.roofColor ? roofColorInfo(tenant, config) : null
  const short = (info: ColorInfo) => (info.kind === 'wood' ? { name: info.name, detail: 'fa hatású bevonat' } : { name: info.name, detail: info.code || 'RAL egyeztetés szerint' })
  const color = short(frameInfo)
  const levels = drawingLevels(config)
  const posts = postPositions(config).length
  const contact = [tenant.brand.legalName, tenant.brand.address, tenant.brand.phone, tenant.brand.email, tenant.brand.website].filter(Boolean).join(' · ')
  const dateText = hu(date)
  const sideText = (side: SideKey) => (isWallSide(config.mount, side) ? `${wallLabel(side)} (rögzítés)` : sideDetail(config, side))
  const roofState = roof.motion === 'tilt' ? `${config.louverAngle}° lamellaszög` : roof.motion === 'slide' ? `${Math.round(config.louverAngle / 0.9)}% nyitás` : null

  // ---------- Építőelemek ----------
  const eyebrow = (text: string, color = MUTED): Content => ({ text: text.toUpperCase(), font: 'ManropeSemi', fontSize: 7, characterSpacing: 1.4, color })
  const rule = (color = HAIR, width = 0.6, margin: [number, number, number, number] = [0, 0, 0, 0]): Content => ({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: width, lineColor: color }], margin })
  const sectionHead = (index: string, title: string, note?: string): Content => ({
    margin: [0, 0, 0, 10],
    stack: [
      { columns: [{ width: 26, text: index, font: 'ManropeHeavy', fontSize: 9, color: MUTED, margin: [0, 6, 0, 0] }, { width: '*', text: title, font: 'ManropeHeavy', fontSize: 17, color: INK }, ...(note ? [{ width: 'auto', text: note, fontSize: 8, color: MUTED, margin: [0, 7, 0, 0] } as Content] : [])] },
      rule(INK, 0.9, [0, 7, 0, 0]),
    ],
  })
  const hairTable = (body: TableCell[][], widths: (string | number)[], pad = 3.8): ContentTable => ({
    table: { widths, body },
    layout: { hLineWidth: (index: number, node) => (index === 0 || index === (node as ContentTable).table.body.length ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => HAIR, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => pad, paddingBottom: () => pad },
  })
  const kvBlock = (title: string, rows: [string, string][]): Content => ({
    stack: [
      { ...(eyebrow(title, ACCENT) as object), margin: [0, 0, 0, 4] } as Content,
      hairTable(rows.map(([label, value]) => [{ text: label, color: MUTED, fontSize: 8.5 }, { text: value, font: 'ManropeSemi', fontSize: 8.5, color: INK, alignment: 'right' }]), [92, '*']),
    ],
    unbreakable: true,
  })

  // ---------- 1. oldal: borító ----------
  const fact = (label: string, value: string, sub: string): Content => ({
    stack: [eyebrow(label), { text: value, font: 'ManropeHeavy', fontSize: 14, color: INK, margin: [0, 5, 0, 1] }, { text: sub, fontSize: 7.5, color: MUTED }],
  })
  const imageHeight = Math.min(292, 515 / imageAspect)
  const cover: Content[] = [
    { text: `${projectName ? `${projectName.toUpperCase()} · ` : ''}PERGOLA · ${MOUNT_LABELS[config.mount].toUpperCase()}`, font: 'ManropeSemi', fontSize: 7.5, characterSpacing: 1.6, color: ACCENT, margin: [0, 8, 0, 8] },
    { text: roofName, font: 'ManropeHeavy', fontSize: 44, color: INK, lineHeight: 0.95 },
    { text: `${roofShort} pergola`, fontSize: 19, color: MUTED, margin: [0, 2, 0, 18] },
    image
      ? { image, cover: { width: 515, height: imageHeight, valign: 'center', align: 'center' }, width: 515, height: imageHeight, margin: [0, 0, 0, 18] }
      : { canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 120, color: PAPER }], margin: [0, 0, 0, 18] },
    {
      columns: [
        fact('Méret', `${m2(config.width)} × ${m2(config.depth)} m`, `${formatNumber(price.area)} m² lefedett terület`),
        fact('Szabad magasság', `${m2(levels.beamBottom)} m`, `névleges ${m2(config.height)} m`),
        fact('Tető', roofName, roofShort),
        fact('Szín', roofInfo ? 'Kéttónusú' : color.name, roofInfo ? `${color.name} váz · ${short(roofInfo).name.toLowerCase()} ${roofPartName(config.roof).toLowerCase()}` : color.detail || 'porszórt alumínium'),
      ],
      columnGap: 14,
      margin: [0, 0, 0, 18],
    },
    {
      table: {
        widths: ['*', shareUrl ? 92 : 0],
        body: [[
          {
            stack: [
              eyebrow('Bruttó irányár, telepítéssel', '#b9c9bf'),
              { text: formatHuf(price.totalGross), font: 'ManropeHeavy', fontSize: 30, color: '#ffffff', margin: [0, 6, 0, 4] },
              { text: `Nettó ${formatHuf(price.totalNet)} + ${Math.round(tenant.prices.vatRate * 100)}% ÁFA`, fontSize: 8.5, color: '#cfdcd4', fontFeatures: ['tnum'] },
              ...(tenant.installmentMonths > 0 ? [{ text: [{ text: formatHuf(price.totalGross / tenant.installmentMonths), font: 'ManropeSemi', color: LIME }, { text: ` / hó · ${tenant.installmentMonths} egyenlő részre osztva (példa, nem hitelajánlat)`, color: '#cfdcd4' }], fontSize: 8.5, margin: [0, 3, 0, 0] } as Content] : []),
            ],
            fillColor: ACCENT, margin: [16, 16, 8, 16], border: [false, false, false, false],
          },
          shareUrl
            ? { stack: [{ qr: shareUrl, fit: 74, foreground: ACCENT, background: '#ffffff', eccLevel: 'M', alignment: 'center' }, { text: '3D terv megnyitása', fontSize: 6.5, color: '#cfdcd4', alignment: 'center', margin: [0, 6, 0, 0] }], fillColor: ACCENT, margin: [0, 14, 14, 10], border: [false, false, false, false] }
            : { text: '', fillColor: ACCENT, border: [false, false, false, false] },
        ]],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    },
    { columns: [{ text: `Konfigurációs kód: ${code}`, fontSize: 7.5, color: MUTED }, { text: `Kelt: ${dateText}`, fontSize: 7.5, color: MUTED, alignment: 'right' }], margin: [0, 8, 0, 0] },
    // Kapcsolat a borítón: itt van hely, és az első oldalon a legfontosabb.
    {
      columns: [
        { width: 'auto', stack: [eyebrow('Kapcsolat', ACCENT), { text: brandLine, font: 'ManropeHeavy', fontSize: 11, color: INK, margin: [0, 3, 0, 0] }] },
        { width: '*', stack: [{ text: tenant.demo ? 'Bemutató konfiguráció — a gyártó adatai éles használatban itt jelennek meg.' : contact, fontSize: 8, color: BODY, lineHeight: 1.35 }, { text: `Hivatkozz erre a kódra: ${code}`, font: 'ManropeSemi', fontSize: 7.5, color: MUTED, margin: [0, 3, 0, 0] }], margin: [0, 1, 0, 0] },
      ],
      columnGap: 18,
      margin: [0, 18, 0, 0],
      unbreakable: true,
    },
  ]

  // ---------- 2. oldal: konfiguráció + anyaglista ----------
  const structure: [string, string][] = [
    ['Kialakítás', MOUNT_LABELS[config.mount]],
    ['Külső méret', `${m2(config.width)} × ${m2(config.depth)} m`],
    ['Lefedett terület', `${formatNumber(price.area)} m²`],
    ['Névleges magasság', `${m2(config.height)} m (gerendatengely)`],
    ['Szabad belmagasság', `${m2(levels.beamBottom)} m`],
    ['Oszlopok', posts ? `${posts} db · ${Math.round(POST * 100)} × ${Math.round(POST * 100)} cm` : 'nincs · a falak tartják'],
    ['Szerkezetszín', colorLabel(frameInfo)],
    ...(roofInfo ? [[`${roofPartName(config.roof)} színe`, colorLabel(roofInfo)] as [string, string]] : []),
    ...(house ? [['A ház (3D látvány)', house] as [string, string]] : []),
  ]
  const energy = estimateEnergy(config, energyUsage, tenant.energy?.heaterWatts)
  const solarEstimate = config.roof === 'fixed' && config.solar ? estimateSolar(config, energyUsage.householdKwh) : null
  const roofRows: [string, string][] = [
    ['Rendszer', `${roofName} · ${roofShort}`],
    ['Árnyékolás', roof.shade],
    ['Esővédelem', roof.rain],
    ['Fény', roof.light],
    ['Működtetés', roof.motion === 'none' ? 'fix' : 'motoros, távirányítóval'],
    ...(roofState ? [['Bemutatott állás', roofState] as [string, string]] : []),
    ...(solarEstimate ? [['Napelem', `${solarEstimate.layout.count} × ${PANEL.wp} Wp = ${formatNumber(solarEstimate.layout.kwp, 2)} kWp`] as [string, string], ['Becsült termelés', `≈ ${formatNumber(Math.round(solarEstimate.production / 10) * 10, 0)} kWh/év`] as [string, string]] : []),
  ]
  const sideRows = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => [SIDE_NAMES[side], sideText(side)] as [string, string])
  const extraRows: [string, string][] = [
    ['LED-világítás', config.led ? (config.ledRgb ? 'színváltós RGB+W, jelenetekkel' : 'periméter, szabályozható') : '—'],
    ['Teraszfűtés', config.heaters ? `${config.heaters} db infravörös` : '—'],
    ['Hangrendszer', config.speakers ? 'Bluetooth, beépített' : '—'],
    ['Eső- és szélérzékelő', config.sensors ? 'automatikus zárással' : '—'],
    ...(config.fans ? [['Mennyezeti ventilátor', `${config.fans} db, kültéri DC motorral`] as [string, string]] : []),
    ...(config.smartHome ? [['Okosotthon-vezérlés', 'app, időzítés, jelenetek, hangvezérlés'] as [string, string]] : []),
  ]

  // Sok tételnél (osztott oldalak, sok opció) tömörebb tördelés, hogy az ár egy lapon maradjon.
  const densePrice = price.lines.length > 10
  const bomLines = getBom(config).filter((line) => !/^0 db\b/.test(line.value))
  const denseDetails = bomLines.length > 10 || sideRows.some(([, value]) => value.includes(' · ')) || extraRows.length > 4
  const priceRows: TableCell[][] = [
    [eyebrow('Tétel'), { ...(eyebrow('Nettó') as object), alignment: 'right' } as TableCell],
    ...price.lines.map((line): TableCell[] => [
      densePrice
        ? { text: [{ text: line.label, font: 'ManropeSemi', fontSize: 8.5, color: INK }, ...(line.detail ? [{ text: `   ${line.detail}`, fontSize: 7, color: MUTED }] : [])] }
        : { stack: [{ text: line.label, font: 'ManropeSemi', fontSize: 9, color: INK }, ...(line.detail ? [{ text: line.detail, fontSize: 7.5, color: MUTED, margin: [0, 1.5, 0, 0] } as Content] : [])] },
      { text: formatHuf(line.amountNet), alignment: 'right', fontSize: 9, color: INK, fontFeatures: ['tnum'] },
    ]),
    [{ stack: [{ text: 'Telepítés és üzembe helyezés', font: 'ManropeSemi', fontSize: 9, color: INK }, { text: 'helyszíni szerelés, beállítás, átadás', fontSize: 7.5, color: MUTED, margin: [0, 1.5, 0, 0] }] }, { text: formatHuf(price.installationNet), alignment: 'right', fontSize: 9, color: INK, fontFeatures: ['tnum'] }],
  ]
  const totals: Content = {
    columns: [
      { width: '*', text: '' },
      {
        width: 230,
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'Nettó összesen', color: MUTED, fontSize: 9 }, { text: formatHuf(price.totalNet), alignment: 'right', fontSize: 9, fontFeatures: ['tnum'] }],
            [{ text: `ÁFA (${Math.round(tenant.prices.vatRate * 100)}%)`, color: MUTED, fontSize: 9 }, { text: formatHuf(price.vatNet), alignment: 'right', fontSize: 9, fontFeatures: ['tnum'] }],
            [{ text: 'Bruttó irányár', font: 'ManropeHeavy', fontSize: 12, color: ACCENT, margin: [0, 4, 0, 0] }, { text: formatHuf(price.totalGross), font: 'ManropeHeavy', fontSize: 14, color: ACCENT, alignment: 'right', fontFeatures: ['tnum'], margin: [0, 2, 0, 0] }],
          ],
        },
        layout: { hLineWidth: (index: number) => (index === 2 ? 1 : 0), hLineColor: () => INK, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 4, paddingBottom: () => 4 },
      },
    ],
    margin: [0, 10, 0, 0],
    unbreakable: true,
  }

  const notesBlock: Content[] = [
    sectionHead(denseDetails ? '05' : '03', 'Fontos tudnivalók'),
    {
      ol: [
        'Ez a dokumentum tájékoztató jellegű kalkuláció és terv, nem minősül ajánlattételnek, kiviteli tervnek vagy statikai számításnak.',
        'A végleges ár a helyszíni felmérés, a statikai ellenőrzés, a rögzítési mód és az egyedi műszaki igények alapján változhat.',
        'A bejelentési vagy engedélyezési kötelezettség a kialakítástól és a helyi szabályozástól (településképi rendelet, HÉSZ) függ; kivitelezés előtt ellenőrizni kell.',
        'A 3D-látványkép illusztráció; a színek a képernyőtől és a nyomtatótól függően eltérhetnek. Színmintát kérésre biztosítunk.',
      ],
      fontSize: denseDetails ? 7.5 : 8, color: BODY, lineHeight: denseDetails ? 1.3 : 1.4, markerColor: MUTED,
    },
  ]
  const details: Content[] = [
    sectionHead('01', 'Konfiguráció'),
    { columns: [kvBlock('Szerkezet', structure), kvBlock('Tetőrendszer', roofRows)], columnGap: 28, margin: [0, 0, 0, denseDetails ? 12 : 16] },
    { columns: [kvBlock('Oldalak', sideRows), kvBlock('Kiegészítők', extraRows)], columnGap: 28, margin: [0, 0, 0, denseDetails ? 14 : 20] },
    sectionHead('02', 'Anyaglista', 'tájékoztató, a felmérés után véglegesítjük'),
    hairTable(bomLines.map((line) => [{ text: line.label, color: MUTED, fontSize: denseDetails ? 8 : 8.5 }, { text: line.value, font: 'ManropeSemi', fontSize: denseDetails ? 8 : 8.5, color: INK }]), [150, '*'], denseDetails ? 2.4 : 3.8),
    { text: '', margin: [0, 0, 0, denseDetails ? 8 : 14] },
    ...(denseDetails ? [] : notesBlock),
  ]

  // ---------- Melléklet: műszaki rajz (A4 fekvő) ----------
  const sheetW = PDF_SHEET.width
  const sheetH = PDF_SHEET.height
  const drawing = technicalDrawing(config, {
    brand,
    contact: tenant.demo ? `${tenant.brand.legalName} · bemutató konfiguráció` : contact,
    title: `Pergola – ${roofName} ${roofShort} · ${MOUNT_LABELS[config.mount].toLowerCase()}`,
    code,
    date: dateText,
    notes: [
      'Méretek cm-ben, szintek m-ben, a kész járófelülettől (±0,00) mérve.',
      `A névleges magasság (${Math.round(config.height * 100)}) a keretgerenda tengelyére értendő; a szabad belmagasság ${Math.round(levels.beamBottom * 100)}.`,
      'Statikai méretezést nem tartalmaz. Az alapozás, a falrögzítés és a hó-/szélteher a helyszíni felmérés és a gyártói típusstatika szerint.',
      `Szín: ${colorSummary(tenant, config)}, porszórt alumínium.`,
      'Az alaprajz +1,00 m-en vett vízszintes metszet; a metszősík fölötti elemek szaggatottan.',
    ],
  }, sheetW, sheetH)

  // ---------- 3. oldal: ár, teendők, kapcsolat ----------
  const step = (number: string, title: string, text: string): Content => ({
    stack: [
      { canvas: [{ type: 'rect', x: 0, y: 0, w: 22, h: 22, r: 11, color: ACCENT }], margin: [0, 0, 0, -18] },
      { text: number, font: 'ManropeHeavy', fontSize: 9, color: '#ffffff', margin: [7.6, 0, 0, 10] },
      { text: title, font: 'ManropeHeavy', fontSize: 10.5, color: INK, margin: [0, 2, 0, 3] },
      { text, fontSize: 8, color: MUTED, lineHeight: 1.35 },
    ],
  })
  const closing: Content[] = [
    sectionHead(denseDetails ? '03' : '04', 'Árkalkuláció', 'nettó egységárak, gyártói árlista'),
    hairTable(priceRows, ['*', 110], densePrice ? 3 : 3.8),
    totals,
    ...(energy.hasElectrics || solarEstimate ? [{
      margin: [0, 14, 0, 0],
      table: {
        widths: ['*', solarEstimate ? '*' : 0],
        body: [[
          { stack: [eyebrow('Becsült éves üzemeltetés', ACCENT), { text: energy.hasElectrics ? `≈ ${formatHuf(roundCost(energy.cost))} / év` : 'nincs áramfogyasztó', font: 'ManropeHeavy', fontSize: 13, color: INK, margin: [0, 4, 0, 2] }, { text: energy.hasElectrics ? `${formatNumber(Math.round(energy.kwh), 0)} kWh áram évente · ${energy.lines.map((line) => line.label.toLowerCase()).join(', ')}` : '', fontSize: 7.5, color: MUTED }], fillColor: PAPER, margin: [12, 10, 12, 10], border: [false, false, false, false] },
          solarEstimate ? { stack: [eyebrow('Napelemes tető', ACCENT), { text: `≈ ${formatNumber(Math.round(solarEstimate.production / 10) * 10, 0)} kWh / év`, font: 'ManropeHeavy', fontSize: 13, color: INK, margin: [0, 4, 0, 2] }, { text: `≈ ${formatHuf(roundCost(solarEstimate.value))} éves érték (30% saját felhasználás, bruttó elszámolás)`, fontSize: 7.5, color: MUTED }], fillColor: PAPER, margin: [12, 10, 12, 10], border: [false, false, false, false] } : { text: '', border: [false, false, false, false] },
        ]],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: (index: number) => (index === 1 ? 6 : 0), paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      unbreakable: true,
    } as Content, { text: `Áramár: ${TARIFF.source}, ${TARIFF.asOf} — ${TARIFF.below.toLocaleString('hu-HU')} Ft/kWh ${TARIFF.limit} kWh/év-ig, felette ${TARIFF.above.toLocaleString('hu-HU')} Ft/kWh (bruttó). ${energyUsage.householdKwh === null ? 'A háztartás fogyasztása nem ismert, ezért a felső sávval számoltunk.' : ''} Tájékoztató becslés, alapdíjak nélkül.`, fontSize: 6.5, color: MUTED, margin: [0, 5, 0, 0] } as Content] : []),
    { text: '', margin: [0, 0, 0, 14] },
    {
      unbreakable: true,
      ...(denseDetails ? { pageBreak: 'before' as const } : {}),
      stack: [
    sectionHead(denseDetails ? '04' : '05', 'Hogyan tovább?'),
    {
      columns: [
        step('1', 'Helyszíni felmérés', 'Megnézzük a falat, a burkolatot és az alapozást, és pontosítjuk a méreteket.'),
        step('2', 'Végleges ajánlat', 'Kötelező érvényű ajánlat a felmérés és a gyártói típusstatika alapján.'),
        step('3', 'Gyártás és telepítés', getDeliveryEstimate(config).replace(' · nem vállalt határidő', '') + ', szakszerelőkkel.'),
      ],
      columnGap: 22,
      margin: [0, 0, 0, 16],
    },
      ],
    },
  ]

  return {
    pageSize: 'A4',
    pageMargins: [40, 44, 40, 40],
    info: { title: `${brandLine} – ${roofName} pergola – ${code}`, author: tenant.brand.legalName, subject: 'Pergola konfigurációs összefoglaló', creator: `${brand} konfigurátor` },
    defaultStyle: { font: 'Manrope', fontSize: 9, color: BODY, lineHeight: 1.25 },
    header: (page: number, _pages: number, size: { orientation?: string }) => size.orientation === 'landscape' ? null : ({
      margin: [40, 20, 40, 0],
      columns: [
        { text: [{ text: brand.toUpperCase(), font: 'ManropeHeavy', characterSpacing: 1.6 }, { text: tenant.brand.suffix ? `  ${tenant.brand.suffix}` : '', color: MUTED }], fontSize: 9, color: INK },
        { text: page === 1 ? 'KONFIGURÁCIÓS ÖSSZEFOGLALÓ' : `${roofName.toUpperCase()} · ${m2(config.width)} × ${m2(config.depth)} M`, font: 'ManropeSemi', fontSize: 7, characterSpacing: 1.2, color: MUTED, alignment: 'right', margin: [0, 1.5, 0, 0] },
      ],
    }),
    footer: (page: number, pages: number, size: { orientation?: string }) => size.orientation === 'landscape' ? null : ({
      margin: [40, 14, 40, 0],
      columns: [
        { text: `${tenant.brand.legalName} · tájékoztató irányár, nem ajánlattétel`, fontSize: 7, color: MUTED },
        { text: `${page} / ${pages}`, fontSize: 7, color: MUTED, alignment: 'right', font: 'ManropeSemi' },
      ],
    }),
    content: [
      ...cover,
      { text: '', pageBreak: 'after' },
      ...details,
      // Sűrű tervnél (osztott oldalak, sok opció) a második lap túlfuthat: ilyenkor az ár folyamatosan követi.
      { stack: closing, pageBreak: 'before' },
      // Sűrű tervnél (osztott oldalak, sok opció) a tudnivalók a „Hogyan tovább?” után, külön lapon.
      ...(denseDetails ? [{ stack: [{ text: '', margin: [0, 10, 0, 0] }, ...notesBlock], unbreakable: true } as Content] : []),
      // Melléklet: műszaki rajz A4 fekvő lapon (saját rajzi fejléccel).
      { svg: drawing.svg, width: sheetW * MM, pageBreak: 'before', pageOrientation: 'landscape' },
    ],
  }
}

/** PDF-be szánt oldalleírás: teljes név, osztott oldalnál a két fél. */
const SIDE_LONG: Partial<Record<SideType, string>> = { zip: 'ZIP screen (szélálló árnyékoló)', glass: 'Keret nélküli tolóüveg', louver: 'Lamellafal (állítható)' }
function sideDetail(config: PergolaConfig, side: SideKey) {
  const segments = sideSegments(config, side)
  const name = (type: SideType) => SIDE_LONG[type] ?? SIDE_INFO[type].label
  if (segments.length < 2) return name(config.sides[side])
  return segments.map((segment, index) => `${HALF_NAMES[side][index]}: ${SIDE_INFO[segment.type].label}`).join(' · ')
}
