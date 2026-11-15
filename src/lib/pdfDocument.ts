// A PDF-összefoglaló dokumentumdefiníciója (pdfmake). DOM nélküli, ezért tesztből és
// szerveren is felépíthető. Négy oldal: borító, konfiguráció + anyaglista, ár + teendők, műszaki rajz.
import { findShadeFabric, ROOF_SHADE_INFO } from './roofShade'
import type { Content, ContentTable, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces'
import { drawingLevels, POST, technicalDrawing, type DrawingResult } from './drawing'
import { isWallSide, MOUNT_LABELS, postPositions, wallLabel } from './mount'
import { formatPrice, formatNumber } from './pricing'
import { ROOF_INFO, GLAZING_INFO, effectiveGlazing, roofRise } from './roofs'
import { getBom, getDeliveryEstimate, getSpecCode } from './specification'
import { buildingSpecRows, permitNotes } from './buildings'
import { DEFAULT_USAGE, energyCostSupported, estimateEnergy, roundCost, TARIFF, type EnergyUsage } from './energy'
import { estimateSolar, PANEL } from './solar'
import { SIDE_INFO, sideSegments, HALF_NAMES } from './sides'
import { colorLabel, colorSummary, frameColorInfo, roofColorInfo, roofPartName, type ColorInfo } from './colors'
import type { Tenant } from '../tenants/types'
import { lamelixSvg } from './lamelixBrand'
import type { PergolaConfig, PriceBreakdown, RoofType, SideKey, SideType } from '../types/pergola'
import { intlLocale, localized, tr } from '../i18n/locale'

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

const SIDE_NAMES: Record<SideKey, string> = localized(() => ({ front: tr('Elöl', 'Vorne'), back: tr('Hátul', 'Hinten'), left: tr('Bal oldal', 'Links'), right: tr('Jobb oldal', 'Rechts') }))

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
const hu = (date: Date) => date.toLocaleDateString(intlLocale(), { year: 'numeric', month: '2-digit', day: '2-digit' })

/** A PDF műszaki rajzlapja (A4 fekvő, a margókon belül) – a DXF-export is ebből készül, így a kettő mindig egyezik. */
export function sheetDrawing(config: PergolaConfig, tenant: Tenant, date = new Date()): DrawingResult {
  const sheetW = PDF_SHEET.width
  const sheetH = PDF_SHEET.height
  const brand = tenant.brand.name
  const code = getSpecCode(config)
  const roof = ROOF_INFO[config.roof]
  const tenantRoof = tenant.roofs[config.roof]
  const roofName = tenantRoof?.name ?? roof.name
  const roofShort = tenantRoof?.short ?? roof.short
  const levels = drawingLevels(config)
  const contact = [tenant.brand.legalName, tenant.brand.address, tenant.brand.phone, tenant.brand.email, tenant.brand.website].filter(Boolean).join(' · ')
  const dateText = hu(date)
  return technicalDrawing(config, {
    brand,
    contact: tenant.demo ? tr(`${tenant.brand.legalName} · bemutató konfiguráció`, `${tenant.brand.legalName} · Demo-Konfiguration`) : contact,
    title: `${config.building === 'conservatory' ? tr('Télikert', 'Wintergarten') : config.building === 'veranda' ? 'Veranda' : 'Pergola'} – ${roofName} ${roofShort} · ${MOUNT_LABELS[config.mount].toLowerCase()}`,
    code,
    date: dateText,
    notes: [
      tr('Méretek cm-ben, szintek m-ben, a kész járófelülettől (±0,00) mérve.', 'Maße in cm, Höhen in m, gemessen ab fertiger Gehfläche (±0,00).'),
      tr(`A névleges magasság (${Math.round(config.height * 100)}) a keretgerenda tengelyére értendő; a szabad belmagasság ${Math.round(levels.beamBottom * 100)}.`, `Die Nennhöhe (${Math.round(config.height * 100)}) bezieht sich auf die Achse des Rahmenträgers; die lichte Höhe beträgt ${Math.round(levels.beamBottom * 100)}.`),
      tr('Statikai méretezést nem tartalmaz. Az alapozás, a falrögzítés és a hó-/szélteher a helyszíni felmérés és a gyártói típusstatika szerint.', 'Enthält keine statische Bemessung. Fundament, Wandbefestigung und Schnee-/Windlast nach Aufmaß vor Ort und Typenstatik des Herstellers.'),
      tr(`Szín: ${colorSummary(tenant, config)}, porszórt alumínium.`, `Farbe: ${colorSummary(tenant, config)}, pulverbeschichtetes Aluminium.`),
      tr('Az alaprajz +1,00 m-en vett vízszintes metszet; a metszősík fölötti elemek szaggatottan.', 'Der Grundriss ist ein Horizontalschnitt auf +1,00 m; Elemente über der Schnittebene gestrichelt.'),
    ],
  }, sheetW, sheetH)
}

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
  const short = (info: ColorInfo) => (info.kind === 'wood' ? { name: info.name, detail: tr('fa hatású bevonat', 'Holzoptik-Beschichtung') } : { name: info.name, detail: info.code || tr('RAL egyeztetés szerint', 'RAL nach Abstimmung') })
  const color = short(frameInfo)
  const levels = drawingLevels(config)
  const posts = postPositions(config).length
  const contact = [tenant.brand.legalName, tenant.brand.address, tenant.brand.phone, tenant.brand.email, tenant.brand.website].filter(Boolean).join(' · ')
  const dateText = hu(date)
  const sideText = (side: SideKey) => (isWallSide(config.mount, side) ? tr(`${wallLabel(side)} (rögzítés)`, `${wallLabel(side)} (Befestigung)`) : sideDetail(config, side))
  const roofState = roof.motion === 'tilt' ? tr(`${config.louverAngle}° lamellaszög`, `${config.louverAngle}° Lamellenwinkel`) : roof.motion === 'slide' ? tr(`${Math.round(config.louverAngle / 0.9)}% nyitás`, `${Math.round(config.louverAngle / 0.9)} % Öffnung`) : null

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
      // Kép nélkül (adminból letöltve, vagy ha a GPU nem engedte a kiolvasást) üres keret helyett útmutatás a 3D-tervhez.
      : { table: { widths: ['*'], body: [[{ text: shareUrl ? tr('A 3D-látványterv az alábbi QR-kódról vagy a terv linkjéről nyitható meg.', 'Die 3D-Visualisierung öffnen Sie über den QR-Code unten oder den Link zum Entwurf.') : tr('A 3D-látványterv a konfigurátorban tekinthető meg.', 'Die 3D-Visualisierung ist im Konfigurator einsehbar.'), fontSize: 9, color: MUTED, fillColor: PAPER, margin: [16, 22, 16, 22], border: [false, false, false, false] }]] }, layout: 'noBorders', margin: [0, 0, 0, 18] },
    {
      columns: [
        fact(tr('Méret', 'Größe'), `${m2(config.width)} × ${m2(config.depth)} m`, tr(`${formatNumber(price.area)} m² lefedett terület`, `${formatNumber(price.area)} m² überdachte Fläche`)),
        fact(tr('Szabad magasság', 'Lichte Höhe'), `${m2(levels.beamBottom)} m`, tr(`névleges ${m2(config.height)} m`, `nominal ${m2(config.height)} m`)),
        fact(tr('Tető', 'Dach'), roofName, roofShort),
        fact(tr('Szín', 'Farbe'), roofInfo ? tr('Kéttónusú', 'Zweifarbig') : color.name, roofInfo ? tr(`${color.name} váz · ${short(roofInfo).name.toLowerCase()} ${roofPartName(config.roof).toLowerCase()}`, `Rahmen ${color.name} · ${roofPartName(config.roof)} ${short(roofInfo).name}`) : color.detail || tr('porszórt alumínium', 'pulverbeschichtetes Aluminium')),
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
              eyebrow(tr('Bruttó irányár, telepítéssel', 'Richtpreis brutto, inkl. Montage'), '#b9c9bf'),
              { text: formatPrice(price.totalGross), font: 'ManropeHeavy', fontSize: 30, color: '#ffffff', margin: [0, 6, 0, 4] },
              { text: tr(`Nettó ${formatPrice(price.totalNet)} + ${Math.round(tenant.prices.vatRate * 100)}% ÁFA`, `Netto ${formatPrice(price.totalNet)} + ${Math.round(tenant.prices.vatRate * 100)} % USt.`), fontSize: 8.5, color: '#cfdcd4', fontFeatures: ['tnum'] },
              ...(tenant.installmentMonths > 0 ? [{ text: [{ text: formatPrice(price.totalGross / tenant.installmentMonths), font: 'ManropeSemi', color: LIME }, { text: tr(` / hó · ${tenant.installmentMonths} egyenlő részre osztva (példa, nem hitelajánlat)`, ` / Monat · in ${tenant.installmentMonths} gleichen Raten (Beispiel, kein Kreditangebot)`), color: '#cfdcd4' }], fontSize: 8.5, margin: [0, 3, 0, 0] } as Content] : []),
            ],
            fillColor: ACCENT, margin: [16, 16, 8, 16], border: [false, false, false, false],
          },
          shareUrl
            ? { stack: [{ qr: shareUrl, fit: 74, foreground: ACCENT, background: '#ffffff', eccLevel: 'M', alignment: 'center' }, { text: tr('3D terv megnyitása', '3D-Entwurf öffnen'), fontSize: 6.5, color: '#cfdcd4', alignment: 'center', margin: [0, 6, 0, 0] }], fillColor: ACCENT, margin: [0, 14, 14, 10], border: [false, false, false, false] }
            : { text: '', fillColor: ACCENT, border: [false, false, false, false] },
        ]],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    },
    { columns: [{ text: tr(`Konfigurációs kód: ${code}`, `Konfigurationscode: ${code}`), fontSize: 7.5, color: MUTED }, { text: `Kelt: ${dateText}`, fontSize: 7.5, color: MUTED, alignment: 'right' }], margin: [0, 8, 0, 0] },
    // Kapcsolat a borítón: itt van hely, és az első oldalon a legfontosabb.
    {
      columns: [
        { width: 'auto', stack: [eyebrow('Kapcsolat', ACCENT), tenant.demo ? { svg: lamelixSvg('horizontal', 'onLight'), width: 86, margin: [0, 5, 0, 0] } : { text: brandLine, font: 'ManropeHeavy', fontSize: 11, color: INK, margin: [0, 3, 0, 0] }] },
        { width: '*', stack: [{ text: tenant.demo ? tr('Bemutató konfiguráció — a gyártó adatai éles használatban itt jelennek meg.', 'Demo-Konfiguration — im Echtbetrieb erscheinen hier die Herstellerdaten.') : contact, fontSize: 8, color: BODY, lineHeight: 1.35 }, { text: tr(`Hivatkozz erre a kódra: ${code}`, `Bitte geben Sie diesen Code an: ${code}`), font: 'ManropeSemi', fontSize: 7.5, color: MUTED, margin: [0, 3, 0, 0] }], margin: [0, 1, 0, 0] },
      ],
      columnGap: 18,
      margin: [0, 18, 0, 0],
      unbreakable: true,
    },
  ]

  // ---------- 2. oldal: konfiguráció + anyaglista ----------
  const structure: [string, string][] = [
    ...buildingSpecRows(config),
    [tr('Kialakítás', 'Ausführung'), MOUNT_LABELS[config.mount]],
    [tr('Külső méret', 'Außenmaß'), `${m2(config.width)} × ${m2(config.depth)} m`],
    [tr('Lefedett terület', 'Überdachte Fläche'), `${formatNumber(price.area)} m²`],
    [tr('Névleges magasság', 'Nennhöhe'), `${m2(config.height)} m (gerendatengely)`],
    [tr('Szabad belmagasság', 'Lichte Höhe innen'), `${m2(levels.beamBottom)} m`],
    ['Oszlopok', posts ? `${posts} db · ${Math.round(POST * 100)} × ${Math.round(POST * 100)} cm` : tr('nincs · a falak tartják', 'keiner · von den Wänden getragen')],
    [tr('Szerkezetszín', 'Konstruktionsfarbe'), colorLabel(frameInfo)],
    ...(roofInfo ? [[tr(`${roofPartName(config.roof)} színe`, `Farbe ${roofPartName(config.roof)}`), colorLabel(roofInfo)] as [string, string]] : []),
    ...(house ? [[tr('A ház (3D látvány)', 'Das Haus (3D-Ansicht)'), house] as [string, string]] : []),
  ]
  const energy = estimateEnergy(config, energyUsage, tenant.energy?.heaterWatts)
  const solarEstimate = config.roof === 'fixed' && config.solar ? estimateSolar(config, energyUsage.householdKwh) : null
  const roofRows: [string, string][] = [
    ['Rendszer', `${roofName} · ${roofShort}`],
    [tr('Árnyékolás', 'Beschattung'), roof.shade],
    [tr('Esővédelem', 'Regenschutz'), roof.rain],
    [tr('Fény', 'Licht'), roof.light],
    [tr('Működtetés', 'Bedienung'), roof.motion === 'none' ? 'fix' : tr('motoros, távirányítóval', 'motorisiert, mit Fernbedienung')],
    ...(roofState ? [[tr('Bemutatott állás', 'Gezeigte Stellung'), roofState] as [string, string]] : []),
    ...(solarEstimate ? [['Napelem', `${solarEstimate.layout.count} × ${PANEL.wp} Wp = ${formatNumber(solarEstimate.layout.kwp, 2)} kWp`] as [string, string], [tr('Becsült termelés', 'Geschätzter Ertrag'), tr(`≈ ${formatNumber(Math.round(solarEstimate.production / 10) * 10, 0)} kWh/év`, `≈ ${formatNumber(Math.round(solarEstimate.production / 10) * 10, 0)} kWh/Jahr`)] as [string, string]] : []),
  ]
  const sideRows = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => [SIDE_NAMES[side], sideText(side)] as [string, string])
  const extraRows: [string, string][] = [
    [tr('LED-világítás', 'LED-Beleuchtung'), config.led ? (config.ledRgb ? tr('színváltós RGB+W, jelenetekkel', 'Farbwechsel RGB+W, mit Szenen') : tr('periméter, szabályozható', 'umlaufend, dimmbar')) : '—'],
    [tr('Teraszfűtés', 'Terrassenheizung'), config.heaters ? tr(`${config.heaters} db infravörös`, `${config.heaters} Stk. Infrarot`) : '—'],
    ['Hangrendszer', config.speakers ? tr('Bluetooth, beépített', 'Bluetooth, eingebaut') : '—'],
    [tr('Eső- és szélérzékelő', 'Regen- und Windsensor'), config.sensors ? tr('automatikus zárással', 'mit automatischem Schließen') : '—'],
    ...(config.pitch ? [[tr('Tetődőlés', 'Dachneigung'), tr(`${config.pitch}° (hátsó él +${roofRise(config).toFixed(2).replace('.', ',')} m)`, `${config.pitch}° (Hinterkante +${roofRise(config).toFixed(2).replace('.', ',')} m)`)] as [string, string]] : []),
    ...(effectiveGlazing(config) ? [[tr('Tetőburkolat', 'Dacheindeckung'), `${GLAZING_INFO[effectiveGlazing(config)!].label.toLowerCase()}`] as [string, string]] : []),
    ...(config.fans ? [[tr('Mennyezeti ventilátor', 'Deckenventilator'), tr(`${config.fans} db, kültéri DC motorral`, `${config.fans} Stk., mit Outdoor-DC-Motor`)] as [string, string]] : []),
    ...(config.smartHome ? [[tr('Okosotthon-vezérlés', 'Smart-Home-Steuerung'), tr('app, időzítés, jelenetek, hangvezérlés', 'App, Zeitpläne, Szenen, Sprachsteuerung')] as [string, string]] : []),
    ...(config.roofShade ? [[tr('Tetőárnyékoló', 'Dachbeschattung'), `${ROOF_SHADE_INFO[config.roofShade].label.toLowerCase()}, motoros · ${findShadeFabric(config.shadeFabric).name.toLowerCase()} ponyva`] as [string, string]] : []),
  ]

  // Sok tételnél (osztott oldalak, sok opció) tömörebb tördelés, hogy az ár egy lapon maradjon.
  const densePrice = price.lines.length > 10
  const bomLines = getBom(config).filter((line) => !/^0 db\b/.test(line.value))
  const denseDetails = bomLines.length > 10 || sideRows.some(([, value]) => value.includes(' · ')) || extraRows.length > 4
  const priceRows: TableCell[][] = [
    [eyebrow(tr('Tétel', 'Position')), { ...(eyebrow(tr('Nettó', 'Netto')) as object), alignment: 'right' } as TableCell],
    ...price.lines.map((line): TableCell[] => [
      densePrice
        ? { text: [{ text: line.label, font: 'ManropeSemi', fontSize: 8.5, color: INK }, ...(line.detail ? [{ text: `   ${line.detail}`, fontSize: 7, color: MUTED }] : [])] }
        : { stack: [{ text: line.label, font: 'ManropeSemi', fontSize: 9, color: INK }, ...(line.detail ? [{ text: line.detail, fontSize: 7.5, color: MUTED, margin: [0, 1.5, 0, 0] } as Content] : [])] },
      { text: formatPrice(line.amountNet), alignment: 'right', fontSize: 9, color: INK, fontFeatures: ['tnum'] },
    ]),
    [{ stack: [{ text: tr('Telepítés és üzembe helyezés', 'Montage und Inbetriebnahme'), font: 'ManropeSemi', fontSize: 9, color: INK }, { text: tr('helyszíni szerelés, beállítás, átadás', 'Montage vor Ort, Einstellung, Übergabe'), fontSize: 7.5, color: MUTED, margin: [0, 1.5, 0, 0] }] }, { text: formatPrice(price.installationNet), alignment: 'right', fontSize: 9, color: INK, fontFeatures: ['tnum'] }],
  ]
  const totals: Content = {
    columns: [
      { width: '*', text: '' },
      {
        width: 230,
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: tr('Nettó összesen', 'Summe netto'), color: MUTED, fontSize: 9 }, { text: formatPrice(price.totalNet), alignment: 'right', fontSize: 9, fontFeatures: ['tnum'] }],
            [{ text: tr(`ÁFA (${Math.round(tenant.prices.vatRate * 100)}%)`, `USt. (${Math.round(tenant.prices.vatRate * 100)} %)`), color: MUTED, fontSize: 9 }, { text: formatPrice(price.vatNet), alignment: 'right', fontSize: 9, fontFeatures: ['tnum'] }],
            [{ text: tr('Bruttó irányár', 'Richtpreis brutto'), font: 'ManropeHeavy', fontSize: 12, color: ACCENT, margin: [0, 4, 0, 0] }, { text: formatPrice(price.totalGross), font: 'ManropeHeavy', fontSize: 14, color: ACCENT, alignment: 'right', fontFeatures: ['tnum'], margin: [0, 2, 0, 0] }],
          ],
        },
        layout: { hLineWidth: (index: number) => (index === 2 ? 1 : 0), hLineColor: () => INK, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 4, paddingBottom: () => 4 },
      },
    ],
    margin: [0, 10, 0, 0],
    unbreakable: true,
  }

  const notesBlock: Content[] = [
    sectionHead(denseDetails ? '05' : '03', tr('Fontos tudnivalók', 'Wichtige Hinweise')),
    {
      ol: [
        tr('Ez a dokumentum tájékoztató jellegű kalkuláció és terv, nem minősül ajánlattételnek, kiviteli tervnek vagy statikai számításnak.', 'Dieses Dokument ist eine unverbindliche Kalkulation und Planung und gilt nicht als Angebot, Ausführungsplan oder statische Berechnung.'),
        tr('A végleges ár a helyszíni felmérés, a statikai ellenőrzés, a rögzítési mód és az egyedi műszaki igények alapján változhat.', 'Der Endpreis kann sich je nach Aufmaß vor Ort, statischer Prüfung, Befestigungsart und individuellen technischen Anforderungen ändern.'),
        tr('A bejelentési vagy engedélyezési kötelezettség a kialakítástól és a helyi szabályozástól (településképi rendelet, HÉSZ) függ; kivitelezés előtt ellenőrizni kell.', 'Eine Anzeige- oder Bewilligungspflicht hängt von Ausführung und örtlichen Vorschriften (Bauordnung des Bundeslandes, Bebauungsplan) ab; vor der Ausführung zu prüfen.'),
        ...permitNotes(config.building),
        tr('A 3D-látványkép illusztráció; a színek a képernyőtől és a nyomtatótól függően eltérhetnek. Színmintát kérésre biztosítunk.', 'Die 3D-Visualisierung ist eine Illustration; Farben können je nach Bildschirm und Drucker abweichen. Farbmuster auf Anfrage.'),
      ],
      fontSize: denseDetails ? 7.5 : 8, color: BODY, lineHeight: denseDetails ? 1.3 : 1.4, markerColor: MUTED,
    },
  ]
  const details: Content[] = [
    sectionHead('01', tr('Konfiguráció', 'Konfiguration')),
    { columns: [kvBlock('Szerkezet', structure), kvBlock(tr('Tetőrendszer', 'Dachsystem'), roofRows)], columnGap: 28, margin: [0, 0, 0, denseDetails ? 12 : 16] },
    { columns: [kvBlock('Oldalak', sideRows), kvBlock(tr('Kiegészítők', 'Zubehör'), extraRows)], columnGap: 28, margin: [0, 0, 0, denseDetails ? 14 : 20] },
    sectionHead('02', 'Anyaglista', tr('tájékoztató, a felmérés után véglegesítjük', 'unverbindlich, wird nach dem Aufmaß finalisiert')),
    hairTable(bomLines.map((line) => [{ text: line.label, color: MUTED, fontSize: denseDetails ? 8 : 8.5 }, { text: line.value, font: 'ManropeSemi', fontSize: denseDetails ? 8 : 8.5, color: INK }]), [150, '*'], denseDetails ? 2.4 : 3.8),
    { text: '', margin: [0, 0, 0, denseDetails ? 8 : 14] },
    ...(denseDetails ? [] : notesBlock),
  ]

  // ---------- Melléklet: műszaki rajz (A4 fekvő) ----------
  const sheetW = PDF_SHEET.width
  const drawing = sheetDrawing(config, tenant, date)

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
    sectionHead(denseDetails ? '03' : '04', tr('Árkalkuláció', 'Preiskalkulation'), tr('nettó egységárak, gyártói árlista', 'Netto-Einheitspreise, Herstellerpreisliste')),
    hairTable(priceRows, ['*', 110], densePrice ? 3 : 3.8),
    totals,
    ...(energyCostSupported(tenant.currency) && (energy.hasElectrics || solarEstimate) ? [{
      margin: [0, 14, 0, 0],
      table: {
        widths: ['*', solarEstimate ? '*' : 0],
        body: [[
          { stack: [eyebrow('Becsült éves üzemeltetés', ACCENT), { text: energy.hasElectrics ? `≈ ${formatPrice(roundCost(energy.cost))} / év` : 'nincs áramfogyasztó', font: 'ManropeHeavy', fontSize: 13, color: INK, margin: [0, 4, 0, 2] }, { text: energy.hasElectrics ? `${formatNumber(Math.round(energy.kwh), 0)} kWh áram évente · ${energy.lines.map((line) => line.label.toLowerCase()).join(', ')}` : '', fontSize: 7.5, color: MUTED }], fillColor: PAPER, margin: [12, 10, 12, 10], border: [false, false, false, false] },
          solarEstimate ? { stack: [eyebrow(tr('Napelemes tető', 'Photovoltaik-Dach'), ACCENT), { text: `≈ ${formatNumber(Math.round(solarEstimate.production / 10) * 10, 0)} kWh / év`, font: 'ManropeHeavy', fontSize: 13, color: INK, margin: [0, 4, 0, 2] }, { text: `≈ ${formatPrice(roundCost(solarEstimate.value))} éves érték (30% saját felhasználás, bruttó elszámolás)`, fontSize: 7.5, color: MUTED }], fillColor: PAPER, margin: [12, 10, 12, 10], border: [false, false, false, false] } : { text: '', border: [false, false, false, false] },
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
    sectionHead(denseDetails ? '04' : '05', tr('Hogyan tovább?', 'Wie geht es weiter?')),
    {
      columns: [
        step('1', tr('Helyszíni felmérés', 'Aufmaß vor Ort'), tr('Megnézzük a falat, a burkolatot és az alapozást, és pontosítjuk a méreteket.', 'Wir prüfen Wand, Belag und Untergrund und präzisieren die Maße.')),
        step('2', tr('Végleges ajánlat', 'Verbindliches Angebot'), tr('Kötelező érvényű ajánlat a felmérés és a gyártói típusstatika alapján.', 'Verbindliches Angebot auf Basis von Aufmaß und Typenstatik des Herstellers.')),
        step('3', tr('Gyártás és telepítés', 'Fertigung und Montage'), getDeliveryEstimate(config).replace(tr(' · nem vállalt határidő', ' · keine zugesagte Frist'), '') + tr(', szakszerelőkkel.', ', durch Fachmonteure.')),
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
    info: { title: `${brandLine} – ${roofName} pergola – ${code}`, author: tenant.brand.legalName, subject: tr('Pergola konfigurációs összefoglaló', 'Pergola-Konfigurationsübersicht'), creator: tr(`${brand} konfigurátor`, `${brand} Konfigurator`) },
    defaultStyle: { font: 'Manrope', fontSize: 9, color: BODY, lineHeight: 1.25 },
    header: (page: number, _pages: number, size: { orientation?: string }) => size.orientation === 'landscape' ? null : ({
      margin: [40, 20, 40, 0],
      columns: [
        tenant.demo
          ? { svg: lamelixSvg('horizontal', 'onLight'), width: 74 }
          : { text: [{ text: brand.toUpperCase(), font: 'ManropeHeavy', characterSpacing: 1.6 }, { text: tenant.brand.suffix ? `  ${tenant.brand.suffix}` : '', color: MUTED }], fontSize: 9, color: INK },
        { text: page === 1 ? tr('KONFIGURÁCIÓS ÖSSZEFOGLALÓ', 'KONFIGURATIONSÜBERSICHT') : `${roofName.toUpperCase()} · ${m2(config.width)} × ${m2(config.depth)} M`, font: 'ManropeSemi', fontSize: 7, characterSpacing: 1.2, color: MUTED, alignment: 'right', margin: [0, 1.5, 0, 0] },
      ],
    }),
    footer: (page: number, pages: number, size: { orientation?: string }) => size.orientation === 'landscape' ? null : ({
      margin: [40, 14, 40, 0],
      columns: [
        { text: tr(`${tenant.brand.legalName} · tájékoztató irányár, nem ajánlattétel`, `${tenant.brand.legalName} · unverbindlicher Richtpreis, kein Angebot`), fontSize: 7, color: MUTED },
        // Diszkrét platform-jelzés (white-label csomagban kikapcsolható: tenant.platformCredit = false).
        ...(tenant.platformCredit !== false ? [{ width: 'auto', columns: [{ svg: lamelixSvg('symbol', 'onLight'), width: 7, margin: [0, 0.5, 0, 0] }, { text: tr('Lamelix konfigurátor', 'Lamelix-Konfigurator'), fontSize: 6.5, color: MUTED, margin: [3, 0.5, 0, 0], width: 'auto' }], columnGap: 0 } as Content] : []),
        { text: `${page} / ${pages}`, fontSize: 7, color: MUTED, alignment: 'right', font: 'ManropeSemi', width: 40 },
      ],
      columnGap: 14,
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
const SIDE_LONG: Partial<Record<SideType, string>> = { zip: tr('ZIP screen (szélálló árnyékoló)', 'ZIP-Screen (windstabiler Sonnenschutz)'), glass: tr('Keret nélküli tolóüveg', 'Rahmenlose Glasschiebewand'), louver: tr('Lamellafal (állítható)', 'Lamellenwand (verstellbar)') }
function sideDetail(config: PergolaConfig, side: SideKey) {
  const segments = sideSegments(config, side)
  const name = (type: SideType) => SIDE_LONG[type] ?? SIDE_INFO[type].label
  if (segments.length < 2) return name(config.sides[side])
  return segments.map((segment, index) => `${HALF_NAMES[side][index]}: ${SIDE_INFO[segment.type].label}`).join(' · ')
}
