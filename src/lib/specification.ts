import { findShadeFabric, ROOF_SHADE_INFO, roofShadeArea, roofShadeSummary } from './roofShade'
import { furnitureFit } from './furniture'
import { PANEL, panelLayout } from './solar'
import { ROOF_INFO, isGlazedRoof, GLAZING_INFO, effectiveGlazing, roofRise } from './roofs'
import { isWallSide, MOUNT_CODES, MOUNT_LABELS, postPositions, sideWalls, wallLabel } from './mount'
import { bayWidth, middlePostCount, moduleCount } from './modules'
import { formatPrice, formatNumber, ROOF_LABELS, SIDE_NAMES } from './pricing'
import { colorSummary } from './colors'
import type { Tenant } from '../tenants/types'
import { CLIMATE_INFO, doorCount } from './buildings'
import { closedSegments, SIDE_INFO, sideSegments, sideSummary, splitProfiles } from './sides'
import type { PergolaConfig, PriceBreakdown, RoofType, SideKey } from '../types/pergola'
import { localized, tr } from '../i18n/locale'

/** Alapszínek a gyártó nélküli hívásokhoz (tesztek, régi hívók). */
const DEFAULT_COLORS: Pick<Tenant, 'colors'> = localized(() => ({ colors: [
  { id: 'anthracite', name: tr('Antracit', 'Anthrazit'), detail: 'RAL 7016', hex: '#343a3d', ral: '7016' },
  { id: 'white', name: tr('Fehér', 'Weiß'), detail: 'RAL 9016', hex: '#dedfd9', ral: '9016' },
  { id: 'black', name: tr('Fekete', 'Schwarz'), detail: 'RAL 9005', hex: '#15191c', ral: '9005' },
  { id: 'bronze', name: tr('Bronz', 'Bronze'), detail: tr('anodizált hatás', 'eloxiert-Optik'), hex: '#705b4c' },
] }))

export interface BomLine { label: string; value: string }

export function getSpecCode(config: PergolaConfig) {
  const roof = ROOF_INFO[config.roof].spec
  const mount = MOUNT_CODES[config.mount]
  const colorCode = (color: PergolaConfig['frameColor'], custom?: string) => color === 'custom'
    ? custom?.normalize('NFD').replace(/[^a-z0-9]/gi, '').replace(/^RAL/i, '').toUpperCase() || 'RAL'
    : { anthracite: '7016', black: '9005', white: '9016', bronze: 'BRZ' }[color]
  // Kéttónusú: „7016/9016” (váz/tető).
  const color = colorCode(config.frameColor, config.customRal) + (config.roofColor ? `/${colorCode(config.roofColor, config.roofRal)}` : '')
  // Oldalanként egy betű; félbe osztott oldalnál a két fél zárójelben, pl. „(G/Z)”.
  const sides = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => (isWallSide(config.mount, side) ? 'W' : (() => { const codes = sideSegments(config, side).map((segment) => SIDE_INFO[segment.type].spec); return codes.length > 1 ? `(${codes.join('/')})` : codes[0] })())).join('')
  const options = [(config.modules ?? 1) > 1 ? `M${config.modules}` : '', config.solar ? 'PV' : '', config.smartHome ? 'SH' : '', config.fans ? `F${config.fans}` : '', config.led && config.ledRgb ? 'RGB' : '', config.roofShade ? ROOF_SHADE_INFO[config.roofShade].spec : '', config.building === 'conservatory' ? 'TK' : config.building === 'veranda' ? 'VR' : ''].filter(Boolean)
  return `PG-${roof}-${Math.round(config.width * 100)}${Math.round(config.depth * 100)}-${mount}-${color}-${sides}${options.map((option) => `-${option}`).join('')}`
}

export function getBom(config: PergolaConfig): BomLine[] {
  const segments = closedSegments(config)
  const panes = (types: string[], width: number, min: number) => segments.filter((segment) => types.includes(segment.type)).reduce((sum, segment) => sum + Math.max(min, Math.round(segment.length / width)), 0)
  const glassPanes = panes(['glass'], 1.12, 2)
  const framedPanes = panes(['glassFramed'], 1.2, 2)
  const fixedPanes = panes(['glassFixed'], 1.5, 1)
  const screens = segments.filter((segment) => segment.type === 'zip').length
  const runs = (type: string) => segments.filter((segment) => segment.type === type)
  const runText = (type: string) => runs(type).map((segment) => `${formatNumber(segment.length, 2)} m`).join(' + ')
  const profiles = splitProfiles(config)
  const slatCount = (type: string) => runs(type).length ? Math.ceil((config.height - 0.12) / (type === 'slatWood' ? 0.115 : 0.105)) : 0
  const optional: BomLine[] = [
    ...(framedPanes ? [{ label: tr('Keretes tolóüveg elem', 'Gerahmtes Schiebeglaselement'), value: tr(`${framedPanes} db · alumínium keret, kefés tömítés`, `${framedPanes} Stk. · Aluminiumrahmen, Bürstendichtung`) }] : []),
    ...(fixedPanes ? [{ label: tr('Fix üvegtábla', 'Festglasscheibe'), value: `${fixedPanes} db · 8 mm ESG, U-profilban` }] : []),
    ...(() => { const doors = doorCount(config); return [
      ...(doors.hinged ? [{ label: tr('Nyíló ajtó', 'Drehtür'), value: tr(`${doors.hinged} db · 90 cm szabad szélesség, háromponton záródó zár`, `${doors.hinged} Stk. · 90 cm lichte Breite, Dreipunktverriegelung`) }] : []),
      ...(doors.sliding ? [{ label: tr('Toló ajtószerkezet', 'Schiebetürsystem'), value: tr(`${doors.sliding} db · alsó sín, kefés tömítés`, `${doors.sliding} Stk. · Bodenschiene, Bürstendichtung`) }] : []),
    ] })(),
    ...(runs('louver').length ? [{ label: tr('Lamellafal', 'Lamellenwand'), value: tr(`${runText('louver')} · állítható lamellák`, `${runText('louver')} · verstellbare Lamellen`) }] : []),
    ...(runs('slatAlu').length ? [{ label: tr('Alumínium lécfal', 'Aluminium-Lattenwand'), value: tr(`${runText('slatAlu')} · ${slatCount('slatAlu')} léc / mező, 25 mm hézag`, `${runText('slatAlu')} · ${slatCount('slatAlu')} Latten / Feld, 25 mm Abstand`) }] : []),
    ...(runs('slatWood').length ? [{ label: tr('Fa lécfal (hőkezelt)', 'Holz-Lattenwand (Thermoholz)'), value: tr(`${runText('slatWood')} · ${slatCount('slatWood')} léc / mező, 20 mm hézag`, `${runText('slatWood')} · ${slatCount('slatWood')} Latten / Feld, 20 mm Abstand`) }] : []),
    ...(profiles ? [{ label: tr('Osztóprofil (félbe osztott oldal)', 'Teilungsprofil (geteilte Seite)'), value: `${profiles} db · ${formatNumber(config.height, 2)} m` }] : []),
    ...(config.pitch ? [{ label: tr('Tetődőlés', 'Dachneigung'), value: tr(`${config.pitch}° · hátsó él +${formatNumber(roofRise(config), 2)} m`, `${config.pitch}° · Hinterkante +${formatNumber(roofRise(config), 2)} m`) }] : []),
    ...(effectiveGlazing(config) ? [{ label: tr('Tetőburkolat', 'Dacheindeckung'), value: GLAZING_INFO[effectiveGlazing(config)!].label + ' · ' + GLAZING_INFO[effectiveGlazing(config)!].short.toLowerCase() }] : []),
    ...(config.fans ? [{ label: tr('Mennyezeti ventilátor', 'Deckenventilator'), value: tr(`${config.fans} db · tartógerendával, fali kapcsolóval`, `${config.fans} Stk. · mit Tragbalken, Wandschalter`) }] : []),
    ...(config.roofShade ? [{ label: tr('Motoros tetőárnyékoló', 'Motorisierte Dachbeschattung'), value: tr(`${ROOF_SHADE_INFO[config.roofShade].short} · ${formatNumber(roofShadeArea(config), 2)} m² · ${findShadeFabric(config.shadeFabric).name.toLowerCase()} ponyva, vezetősínnel, rádiós motorral`, `${ROOF_SHADE_INFO[config.roofShade].short} · ${formatNumber(roofShadeArea(config), 2)} m² · Tuch ${findShadeFabric(config.shadeFabric).name.toLowerCase()}, mit Führungsschiene, Funkmotor`) }] : []),
  ]
  const posts = postPositions(config).length
  const middlePosts = middlePostCount(config)
  const modules = moduleCount(config)
  const sharedPosts = (modules - 1) * (config.mount === 'freestanding' ? 2 : 1)
  const walls = sideWalls(config.mount)
  return [
    ...(modules > 1 ? [{ label: tr('Összekapcsolt modulok', 'Gekoppelte Module'), value: tr(`${modules} × ${formatNumber(bayWidth(config), 2)} m mező · közös oszlopokkal, összesen ${formatNumber(config.width, 2)} m`, `${modules} × ${formatNumber(bayWidth(config), 2)} m Feld · mit gemeinsamen Stehern, gesamt ${formatNumber(config.width, 2)} m`) }] : []),
    { label: tr('Hordozó oszlop', 'Tragender Steher'), value: posts === 0 ? tr('nincs · a falak tartják', 'keiner · von den Wänden getragen') : `${posts - middlePosts - sharedPosts} db${sharedPosts ? ` + ${sharedPosts} db közös modul-oszlop` : ''}${middlePosts ? ` + ${middlePosts} db középoszlop` : ''} · ${formatNumber(config.height, 2)} m` },
    ...(walls.length ? [{ label: tr('Oldalfali csatlakozó profil', 'Seitliches Wandanschlussprofil'), value: walls.map((side) => `${side === 'left' ? 'bal' : 'jobb'} ${formatNumber(config.depth, 2)} m`).join(' + ') }] : []),
    { label: tr('Keretgerenda', 'Rahmenträger'), value: `2 × ${formatNumber(config.width, 2)} m + 2 × ${formatNumber(config.depth, 2)} m${modules > 1 ? ` + ${modules - 1} × ${formatNumber(config.depth, 2)} m modulgerenda` : ''}` },
    roofBomLine(config),
    ...(config.solar ? [solarBomLine(config)] : []),
    { label: tr('Tolóüveg panel', 'Glasschiebepaneel'), value: `${glassPanes} db` },
    { label: tr('ZIP screen kazetta', 'ZIP-Screen-Kassette'), value: `${screens} db` },
    ...optional,
    { label: tr('Rejtett lefolyó', 'Verdeckte Entwässerung'), value: posts === 0 ? tr('1 db · falon vezetett lefolyócső', '1 Stk. · Fallrohr an der Wand') : tr(`${config.mount === 'freestanding' ? 2 : 1} db · oszlopba integrálva`, `${config.mount === 'freestanding' ? 2 : 1} Stk. · im Steher integriert`) },
    { label: tr('Villamos opciók', 'Elektrische Optionen'), value: tr(`${config.led ? (config.ledRgb ? 'RGB+W LED' : 'LED') : 'LED nélkül'} · ${config.heaters} db fűtés${config.speakers ? ' · hangrendszer' : ''}${config.sensors ? ' · szenzor' : ''}${config.smartHome ? ' · okosotthon-központ' : ''}`, `${config.led ? (config.ledRgb ? 'RGB+W LED' : 'LED') : 'ohne LED'} · ${config.heaters} Stk. Heizung${config.speakers ? ' · Soundsystem' : ''}${config.sensors ? ' · Sensor' : ''}${config.smartHome ? ' · Smart-Home-Zentrale' : ''}`) },
  ]
}

function solarBomLine(config: PergolaConfig): BomLine {
  const layout = panelLayout(config)
  return { label: tr('Napelem modul', 'PV-Modul'), value: tr(`${layout.count} db × ${PANEL.wp} Wp (${formatNumber(layout.kwp, 2)} kWp) · ${layout.cols} × ${layout.rows} kiosztás`, `${layout.count} Stk. × ${PANEL.wp} Wp (${formatNumber(layout.kwp, 2)} kWp) · ${layout.cols} × ${layout.rows} Belegung`) }
}

/** A tető anyaglista-sora tetőtípusonként. */
function roofBomLine(config: PergolaConfig) {
  const span = formatNumber(Math.max(0, config.width - 0.18), 2)
  if (config.roof === 'fixed') return { label: tr('Fix tetőpanel', 'Festes Dachpaneel'), value: tr(`${Math.max(2, Math.floor(config.depth / 0.65))} résszel`, `${Math.max(2, Math.floor(config.depth / 0.65))} Teile`) }
  if (isGlazedRoof(config.roof)) {
    const bays = Math.max(2, Math.ceil(config.width / 0.95))
    return { label: config.roof === 'glass' ? tr('VSG üvegtábla', 'VSG-Glasscheibe') : tr('Polikarbonát lemez', 'Polycarbonatplatte'), value: `${bays} db × ${formatNumber(config.depth - 0.2, 2)} m · ${bays + 1} db borda` }
  }
  if (config.roof === 'fabric') return { label: tr('Textil ponyva + futósín', 'Textilmembran + Laufschiene'), value: tr(`${formatNumber(config.width * config.depth, 1)} m² · ${Math.max(4, Math.ceil(config.depth / 0.5))} db ponyvatartó`, `${formatNumber(config.width * config.depth, 1)} m² · ${Math.max(4, Math.ceil(config.depth / 0.5))} Stk. Tuchträger`) }
  return { label: tr('Aerofoil tetőlamella', 'Aerofoil-Dachlamelle'), value: `${Math.max(10, Math.floor(config.depth / 0.22))} db × ${span} m` }
}

export function getDeliveryEstimate(config: PergolaConfig) {
  const complexity = closedSegments(config).length + config.heaters + (config.speakers ? 1 : 0) + (config.fans ?? 0)
  const min = Math.min(8, 4 + Math.floor(complexity / 3))
  return tr(`${min}–${min + 2} hét a műszaki jóváhagyástól · nem vállalt határidő`, `${min}–${min + 2} Wochen ab technischer Freigabe · keine zugesagte Frist`)
}

/** Hány főnek való, és mi fér el alatta — ugyanazzal a helyigény-számítással, mint a bútorválasztó. */
export function getSizeRecommendation(config: PergolaConfig) {
  const fits = (set: Parameters<typeof furnitureFit>[0]) => furnitureFit(set, config)?.level === 'comfortable'
  if (fits('combo')) return tr('8–10 főnek ajánlott · étkező és pihenősarok együtt is kényelmesen elfér', 'Empfohlen für 8–10 Personen · Essplatz und Lounge passen bequem gemeinsam')
  if (fits('dining8')) return tr('6–8 főnek ajánlott · 8 fős étkező vagy pihenősarok kényelmesen elfér', 'Empfohlen für 6–8 Personen · Essplatz für 8 oder Lounge passt bequem')
  if (fits('dining6')) return tr('4–6 főnek ajánlott · 6 fős étkező vagy pihenősarok elfér', 'Empfohlen für 4–6 Personen · Essplatz für 6 oder Lounge passt')
  if (fits('lounge')) return tr('4–5 főnek ajánlott · kanapé és dohányzóasztal kényelmesen elfér', 'Empfohlen für 4–5 Personen · Sofa und Couchtisch passen bequem')
  return tr('2–4 főnek ajánlott · kompakt étkező vagy kisebb pihenősarok', 'Empfohlen für 2–4 Personen · kompakter Essplatz oder kleine Lounge')
}

export function createTextSummary(config: PergolaConfig, price: PriceBreakdown, roofLabels: Record<RoofType, string> = ROOF_LABELS, brandName = 'Lamelix', colors: Pick<Tenant, 'colors'> = DEFAULT_COLORS) {
  const sides = (['front', 'back', 'left', 'right'] as SideKey[]).map((side) => `${SIDE_NAMES[side]}: ${isWallSide(config.mount, side) ? wallLabel(side).toLowerCase() : sideSummary(config, side)}`).join(', ')
  const extras = [
    config.led ? (config.ledRgb ? tr('színváltós RGB+W LED', 'Farbwechsel-LED RGB+W') : tr('periméter LED', 'umlaufende LED')) : null,
    config.heaters > 0 ? tr(`${config.heaters} db teraszfűtés`, `${config.heaters} Stk. Terrassenheizung`) : null,
    config.speakers ? 'hangrendszer' : null,
    config.sensors ? tr('eső- és szélszenzor', 'Regen- und Windsensor') : null,
    config.fans ? tr(`${config.fans} db mennyezeti ventilátor`, `${config.fans} Stk. Deckenventilator`) : null,
    config.smartHome ? tr('okosotthon-vezérlés', 'Smart-Home-Steuerung') : null,
    config.roofShade ? roofShadeSummary(config) : null,
    config.solar ? tr(`napelemes tető (${formatNumber(panelLayout(config).kwp, 2)} kWp)`, `Photovoltaik-Dach (${formatNumber(panelLayout(config).kwp, 2)} kWp)`) : null,
  ].filter((item): item is string => Boolean(item))
  return [
    `${brandName} / ${config.building === 'conservatory' ? tr('Télikert', 'Wintergarten') : config.building === 'veranda' ? 'Veranda' : 'Pergola'} – ${roofLabels[config.roof]}`,
    tr(`Méret: ${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} × ${formatNumber(config.height, 2)} m (${formatNumber(price.area)} m²)`, `Größe: ${formatNumber(config.width, 2)} × ${formatNumber(config.depth, 2)} × ${formatNumber(config.height, 2)} m (${formatNumber(price.area)} m²)`),
    ...(config.building ? [`${tr('Építmény', 'Bauwerk')}: ${config.building === 'conservatory' ? tr('télikert', 'Wintergarten') : config.building === 'carport' ? 'Carport' : 'Veranda'}${config.climate ? ` · ${CLIMATE_INFO[config.climate].label.toLowerCase()}` : ''}`] : []),
    tr(`Kialakítás: ${MOUNT_LABELS[config.mount].toLowerCase()} · ${sides}`, `Ausführung: ${MOUNT_LABELS[config.mount].toLowerCase()} · ${sides}`),
    tr(`Szín: ${colorSummary(colors, config)}`, `Farbe: ${colorSummary(colors, config)}`),
    `${tr('Kiegészítők', 'Zubehör')}: ${extras.length ? extras.join(', ') : tr('nincs kiegészítő', 'kein Zubehör')}`,
    tr(`Bruttó irányár: ${formatPrice(price.totalGross)} (telepítéssel, nem ajánlattétel)`, `Richtpreis brutto: ${formatPrice(price.totalGross)} (inkl. Montage, kein Angebot)`),
    tr(`Konfigurációs kód: ${getSpecCode(config)}`, `Konfigurationscode: ${getSpecCode(config)}`),
  ].join('\n')
}
