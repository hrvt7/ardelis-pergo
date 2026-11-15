// Építmény-típusok: nyitott pergola, zárt veranda (üvegezett terasz) és egész éves télikert.
// Egyetlen igazságforrás a választóhoz, a szabályokhoz, az árhoz, a linkhez és a tájékoztatókhoz.
// Tiszta TypeScript — böngészőben és szerveren is fut.
import { isWallSide } from './mount'
import { closedSegments } from './sides'
import type { BuildingType, ClimateType, PergolaConfig, PriceSettings, RoofType, SideKey, SideType, WallGlazing } from '../types/pergola'
import { tr } from '../i18n/locale'

/** Zárt (oldalfalas) építmények; a carport nyitott, a keretes-tető motor negyedik típusa. */
export type ClosedBuilding = 'veranda' | 'conservatory'

export interface BuildingInfo {
  label: string
  /** Egy sor a kártyára. */
  short: string
  description: string
  /** Mire jó, mennyi ideig használható. */
  season: string
  /** Rövid tulajdonságok a kártyán. */
  traits: string[]
}

export const BUILDING_TYPES: BuildingType[] = ['pergola', 'veranda', 'conservatory', 'carport']

/** Egy autóállás szélessége (m): ennyitől egy, 5,3 m-től két autó fér el egymás mellett. */
export const CARPORT_SINGLE_MIN = 2.8
export const CARPORT_DOUBLE_MIN = 5.3
export const isCarport = (building: BuildingType | undefined): building is 'carport' => building === 'carport'
/** Hány autó fér a carport alá a szélesség alapján (0, ha keskenyebb egy állásnál). */
export const carportBays = (width: number) => (width >= CARPORT_DOUBLE_MIN ? 2 : width >= CARPORT_SINGLE_MIN ? 1 : 0)

export const BUILDING_INFO: Record<BuildingType, BuildingInfo> = {
  pergola: {
    label: 'Pergola', short: tr('Nyitott, szellős terasz', 'Offene, luftige Terrasse'), season: tr('Tavasztól őszig', 'Vom Frühling bis Herbst'),
    description: tr('Árnyékolt, nyitott vagy részben zárt terasz állítható lamellákkal vagy fix tetővel.', 'Beschattete, offene oder teilweise geschlossene Terrasse mit verstellbaren Lamellen oder festem Dach.'),
    traits: ['Nyitott oldalak', tr('Mozgatható tető', 'Bewegliches Dach'), tr('Gyors telepítés', 'Schnelle Montage')],
  },
  veranda: {
    label: 'Veranda', short: tr('Zárt üvegezett terasz', 'Geschlossene verglaste Terrasse'), season: tr('Tavasztól késő őszig', 'Vom Frühling bis Spätherbst'),
    description: tr('Üvegfalakkal zárt, nem fűtött (hideg) tér: szél, eső és hűvös estén is használható, de nem egész éves lakótér.', 'Mit Glaswänden geschlossener, unbeheizter (Kalt-)Raum: bei Wind, Regen und kühlen Abenden nutzbar, aber kein ganzjähriger Wohnraum.'),
    traits: [tr('Üveg- vagy fix tető', 'Glas- oder festes Dach'), tr('Üvegfal ajtóval', 'Glaswand mit Tür'), tr('Nem hőszigetelt', 'Nicht wärmegedämmt')],
  },
  conservatory: {
    label: tr('Télikert', 'Wintergarten'), short: tr('Egész éves, fűtött tér', 'Ganzjähriger, beheizter Raum'), season: tr('Egész évben', 'Ganzjährig'),
    description: tr('Hőszigetelt üvegezésű, hőhídmentes profilú, fűtött és hűthető helyiség, alapozott padlóval és ajtóval.', 'Raum mit Wärmeschutzverglasung und thermisch getrennten Profilen, beheiz- und kühlbar, mit Fundamentboden und Tür.'),
    traits: [tr('Hőszigetelt üveg és profil', 'Wärmeschutzglas und -profil'), tr('Fűtés / hűtés', 'Heizung / Kühlung'), tr('Alapozott padló', 'Fundamentboden')],
  },
  carport: {
    label: 'Carport', short: tr('Autóbeálló és előtető', 'Autostellplatz und Vordach'), season: tr('Egész évben', 'Ganzjährig'),
    description: tr('Nyitott, fix tetős autóbeálló egy vagy két autónak, szabadon álló vagy a házhoz rögzítve; lemez-, polikarbonát- vagy üvegtetővel.', 'Offener Stellplatz mit festem Dach für ein oder zwei Autos, freistehend oder am Haus befestigt; mit Blech-, Polycarbonat- oder Glasdach.'),
    traits: [tr('Egy- vagy kétállásos', 'Ein- oder zwei Stellplätze'), tr('Fix tető, nyitott oldalak', 'Festes Dach, offene Seiten'), tr('Burkolt beálló', 'Befestigter Stellplatz')],
  },
}

/** Építménytípushoz választható tetők: zártnál a mozgó tető nem zárható, carportnál fix tető kell (hóteher, csapadék). */
export const BUILDING_ROOFS: Record<Exclude<BuildingType, 'pergola'>, RoofType[]> = {
  veranda: ['glass', 'polycarbonate', 'fixed'],
  conservatory: ['glass', 'fixed'],
  carport: ['fixed', 'polycarbonate', 'glass'],
}

export const isClosedBuilding = (building: BuildingType | undefined): building is ClosedBuilding => building === 'veranda' || building === 'conservatory'

export const DOOR_TYPES: SideType[] = ['door', 'doorSliding']
export const isDoorType = (type: SideType) => type === 'door' || type === 'doorSliding'
/** Az üvegfal-típusok (az oldalfal-üvegezés felára ezekre vonatkozik). */
export const GLASS_WALL_TYPES: SideType[] = ['glass', 'glassFramed', 'glassFixed', 'door', 'doorSliding']
/** Télikertben csak üveg és ajtó engedett (a zip, lamella és lécfal nem hőszigetelő). */
export const CONSERVATORY_SIDE_TYPES: SideType[] = ['none', ...GLASS_WALL_TYPES]

export const WALL_GLAZING_INFO: Record<WallGlazing, { label: string; short: string; share: string; priceKey: keyof Pick<PriceSettings, 'wallGlazingDoublePerM2Net' | 'wallGlazingTriplePerM2Net'> | null; ug: string }> = {
  single: { label: tr('Edzett üveg', 'ESG-Glas'), short: tr('8–10 mm egyrétegű, hideg használatra', '8–10 mm einfach, für Kaltnutzung'), share: 's', priceKey: null, ug: 'Ug ≈ 5,8 W/m²K' },
  double: { label: tr('Kétrétegű hőszigetelt', '2-fach-Wärmeschutzglas'), short: tr('Low-E bevonat, argon töltet', 'Low-E-Beschichtung, Argonfüllung'), share: 'd', priceKey: 'wallGlazingDoublePerM2Net', ug: 'Ug ≈ 1,1 W/m²K' },
  triple: { label: tr('Háromrétegű hőszigetelt', '3-fach-Wärmeschutzglas'), short: tr('Két Low-E réteg, legjobb hőtartás', 'Zwei Low-E-Schichten, beste Wärmedämmung'), share: 't', priceKey: 'wallGlazingTriplePerM2Net', ug: 'Ug ≈ 0,6 W/m²K' },
}
export const WALL_GLAZINGS: WallGlazing[] = ['single', 'double', 'triple']

export const CLIMATE_INFO: Record<ClimateType, { label: string; short: string; share: string }> = {
  split: { label: tr('Split klíma', 'Split-Klimagerät'), short: tr('Fűtés és hűtés egy készülékkel (inverteres)', 'Heizen und Kühlen mit einem Gerät (Inverter)'), share: 's' },
  underfloor: { label: tr('Padlófűtés', 'Fußbodenheizung'), short: tr('Egyenletes, csendes alapfűtés', 'Gleichmäßige, leise Grundheizung'), share: 'u' },
  both: { label: tr('Padlófűtés + split klíma', 'Fußbodenheizung + Split-Klima'), short: tr('Egész éves komfort, nyáron hűtés', 'Ganzjähriger Komfort, im Sommer Kühlung'), share: 'b' },
}

export const hasSplitUnit = (climate: ClimateType | undefined) => climate === 'split' || climate === 'both'
export const hasUnderfloor = (climate: ClimateType | undefined) => climate === 'underfloor' || climate === 'both'

export const defaultWallGlazing = (building: BuildingType | undefined): WallGlazing | undefined => building === 'conservatory' ? 'double' : building === 'veranda' ? 'single' : undefined
export const wallGlazingOptions = (building: BuildingType | undefined): WallGlazing[] => building === 'conservatory' ? ['double', 'triple'] : building === 'veranda' ? ['single', 'double', 'triple'] : []
export const effectiveWallGlazing = (config: Pick<PergolaConfig, 'building' | 'wallGlazing'>): WallGlazing | undefined =>
  config.wallGlazing && wallGlazingOptions(config.building).includes(config.wallGlazing) ? config.wallGlazing : defaultWallGlazing(config.building)

/** Mely építmény-típusok kínálhatók a gyártó tetői és oldalfalai alapján. A pergola mindig. */
export function availableBuildings(roofs: RoofType[], sides: SideType[]): BuildingType[] {
  const hasGlassWall = sides.some((type) => GLASS_WALL_TYPES.includes(type))
  const hasDoor = sides.some(isDoorType)
  const result: BuildingType[] = ['pergola']
  if (hasGlassWall && BUILDING_ROOFS.veranda.some((roof) => roofs.includes(roof))) result.push('veranda')
  if (hasGlassWall && hasDoor && sides.includes('glassFixed') && BUILDING_ROOFS.conservatory.some((roof) => roofs.includes(roof))) result.push('conservatory')
  if (BUILDING_ROOFS.carport.some((roof) => roofs.includes(roof))) result.push('carport')
  return result
}

/** Üvegfal-felület m² (a felárhoz): az üveg- és ajtós szegmensek hossza × oldalmagasság. */
export function glassWallArea(config: Pick<PergolaConfig, 'sides' | 'split' | 'mount' | 'width' | 'depth' | 'height'>) {
  return closedSegments(config).filter((segment) => GLASS_WALL_TYPES.includes(segment.type)).reduce((sum, segment) => sum + segment.length * config.height, 0)
}

export function doorCount(config: Pick<PergolaConfig, 'sides' | 'split' | 'mount' | 'width' | 'depth'>) {
  const segments = closedSegments(config)
  return { hinged: segments.filter((segment) => segment.type === 'door').length, sliding: segments.filter((segment) => segment.type === 'doorSliding').length }
}

export interface BuildingIssue { id: string; level: 'warn' | 'info'; text: string }

/** Műszaki/logikai észrevételek a zárt építményhez (nem tiltások: a felhasználó dönt). */
export function buildingIssues(config: PergolaConfig): BuildingIssue[] {
  if (isCarport(config.building)) {
    const issues: BuildingIssue[] = []
    const bays = carportBays(config.width)
    if (bays === 0) issues.push({ id: 'carport-narrow', level: 'warn', text: tr(`${config.width.toFixed(1).replace('.', ',')} m szélesség szűk egy autónak: egy állásnak legalább ${CARPORT_SINGLE_MIN.toFixed(1).replace('.', ',')} m, kényelmesen 3 m kell.`, `${config.width.toFixed(1).replace('.', ',')} m Breite ist für ein Auto knapp: ein Stellplatz braucht mindestens ${CARPORT_SINGLE_MIN.toFixed(1).replace('.', ',')} m, bequem 3 m.`) })
    else if (config.width >= 4.6 && bays === 1) issues.push({ id: 'carport-double', level: 'info', text: tr(`Két autóhoz legalább ${CARPORT_DOUBLE_MIN.toFixed(1).replace('.', ',')} m szélesség javasolt; ekkora méretnél egy autó és egy tároló-sáv fér el.`, `Für zwei Autos werden mindestens ${CARPORT_DOUBLE_MIN.toFixed(1).replace('.', ',')} m Breite empfohlen; bei dieser Größe passen ein Auto und ein Abstellstreifen.`) })
    if (config.depth < 5) issues.push({ id: 'carport-depth', level: 'info', text: tr('Egy személyautóhoz legalább 5 m mélység ajánlott (kombinak, SUV-nak 5,5 m), hogy az ajtók és a csomagtartó a tető alatt legyenek.', 'Für einen Pkw werden mindestens 5 m Tiefe empfohlen (Kombi, SUV: 5,5 m), damit Türen und Kofferraum unter dem Dach liegen.') })
    if (config.height < 2.1) issues.push({ id: 'carport-height', level: 'warn', text: tr('A 2,1 m alatti belmagasság magasabb autónál (SUV, tetőbox) kevés; 2,3 m javasolt.', 'Unter 2,1 m lichter Höhe ist es für höhere Autos (SUV, Dachbox) zu wenig; 2,3 m empfohlen.') })
    if (!config.pitch && (config.roof === 'glass' || config.roof === 'polycarbonate')) issues.push({ id: 'carport-pitch', level: 'info', text: tr('Üveg- és polikarbonát tetőnél pár fokos dőlés javasolt a vízelfolyáshoz.', 'Bei Glas- und Polycarbonatdächern wird ein paar Grad Neigung für den Wasserablauf empfohlen.') })
    return issues
  }
  if (!isClosedBuilding(config.building)) return []
  const issues: BuildingIssue[] = []
  const sides = (['front', 'back', 'left', 'right'] as const)
  const segments = sides.flatMap((side) => {
    const wall = config.mount === 'wall' ? side === 'back' : config.mount === 'corner-left' ? side === 'back' || side === 'left' : config.mount === 'corner-right' ? side === 'back' || side === 'right' : config.mount === 'niche' ? side !== 'front' : false
    if (wall) return []
    const second = config.split?.[side]
    return [config.sides[side], ...(second ? [second] : [])]
  })
  const open = segments.filter((type) => type === 'none').length
  const doors = doorCount(config)
  const hasDoor = doors.hinged + doors.sliding > 0
  const hasSlidingGlass = segments.some((type) => type === 'glass' || type === 'glassFramed')
  // Túl rövid falszakasz ajtónak (nyíló szárny ~0,95 m, toló ~0,6–1,3 m).
  const shortDoor = closedSegments(config).find((segment) => isDoorType(segment.type) && segment.length < 1.2)
  if (shortDoor) issues.push({ id: 'short-door', level: 'warn', text: tr(`Az ajtós falszakasz csak ${shortDoor.length.toFixed(1).replace('.', ',')} m hosszú, ez szűk a bejárathoz. Válassz hosszabb oldalt, vagy ne ossz fel.`, `Der Wandabschnitt mit Tür ist nur ${shortDoor.length.toFixed(1).replace('.', ',')} m lang, das ist für einen Zugang knapp. Wählen Sie eine längere Seite oder teilen Sie nicht.`) })
  // Üveg- és polikarbonát tető alatti túlmelegedés: tiszta/matt/opál burkolat tetőárnyékoló nélkül.
  if ((config.roof === 'glass' || config.roof === 'polycarbonate') && !config.roofShade) {
    const g = config.glazing ?? (config.roof === 'glass' ? 'clear' : 'opal')
    if (g === 'clear' || g === 'satin' || g === 'opal') issues.push({ id: 'roof-heat', level: 'info', text: tr('Nyáron az üvegtető alatt erősen felmelegedhet a tér. Hővisszaverő vagy füstös burkolat, illetve tetőárnyékoló (Extrák) sokat javít rajta.', 'Im Sommer kann es unter dem Glasdach sehr warm werden. Wärmereflektierende oder getönte Eindeckung bzw. eine Dachbeschattung (Extras) hilft deutlich.') })
  }
  if (config.building === 'conservatory') {
    if (!config.foundation) issues.push({ id: 'cons-foundation', level: 'warn', text: tr('Alapozás nélkül a télikert nem használható egész évben: kapcsold be az alapozott padlót (Extrák).', 'Ohne Fundament ist der Wintergarten nicht ganzjährig nutzbar: Fundamentboden einschalten (Extras).') })
    if (open > 0) issues.push({ id: 'cons-open', level: 'warn', text: tr(`${open === 1 ? 'Egy oldal' : `${open} oldal`} nyitott. A télikert zárt, fűtött tér: zárd le üveggel vagy ajtóval.`, `${open === 1 ? 'Eine Seite ist' : `${open} Seiten sind`} offen. Der Wintergarten ist ein geschlossener, beheizter Raum: mit Glas oder Tür schließen.`) })
    if (!hasDoor) issues.push({ id: 'cons-door', level: 'warn', text: tr('Nincs ajtó. A télikertbe legalább egy bejárati ajtó kell (nyíló vagy toló).', 'Keine Tür. Der Wintergarten braucht mindestens eine Eingangstür (Dreh- oder Schiebetür).') })
    if (!config.climate) issues.push({ id: 'cons-climate', level: 'info', text: tr('Egész éves használathoz válassz fűtést vagy hűtést.', 'Für ganzjährige Nutzung Heizung oder Kühlung wählen.') })
    if (!config.pitch) issues.push({ id: 'cons-pitch', level: 'info', text: tr('Üvegtetőnél pár fokos dőlés javasolt a vízelfolyáshoz és a tisztán tartáshoz.', 'Bei Glasdächern wird ein paar Grad Neigung für Wasserablauf und Sauberkeit empfohlen.') })
  } else {
    if (open >= 2) issues.push({ id: 'veranda-open', level: 'info', text: tr(`${open} oldal nyitott. A veranda általában legalább három oldalról zárt.`, `${open} Seiten sind offen. Eine Veranda ist meist an mindestens drei Seiten geschlossen.`) })
    if (!hasDoor && !hasSlidingGlass) issues.push({ id: 'veranda-access', level: 'info', text: tr('Nincs sem ajtó, sem tolóüveg: nehezen lesz bejárható a zárt tér.', 'Weder Tür noch Glasschiebewand: der geschlossene Raum ist schwer zugänglich.') })
  }
  return issues
}

/** Tájékoztató az építéshatósági és energetikai teendőkről (nem jogi tanács). */
export function permitNotes(building: BuildingType | undefined): string[] {
  if (building === 'veranda') return [
    tr('A zárt, tartósan álló szerkezet (veranda) a település helyi építési szabályzata és a telek adatai (beépítettség, telekhatár-távolság) alapján bejelentés- vagy engedélykötelessé válhat.', 'Eine geschlossene, dauerhaft errichtete Konstruktion (Veranda) kann je nach Bauordnung des Bundeslandes, Bebauungsplan und Grundstücksdaten (Bebauungsdichte, Grenzabstand) anzeige- oder bewilligungspflichtig sein.'),
    tr('Kérj tájékoztatást az illetékes építési hatóságtól (jegyző/főépítész) a megrendelés előtt. A településképi bejelentés helyi rendelettől függhet.', 'Holen Sie vor der Bestellung Auskunft bei der zuständigen Baubehörde (Gemeinde) ein. Ortsbildvorgaben können je nach Gemeinde gelten.'),
  ]
  if (building === 'conservatory') return [
    tr('A télikert zárt, fűtött helyiség, ezért jellemzően építéshatósági eljárás (egyszerű bejelentés vagy építési engedély) tárgya. Ez a telek adatai és a helyi építési szabályzat szerint dől el, ezért a tervezés előtt egyeztess az illetékes hatósággal vagy jogosult tervezővel.', 'Ein Wintergarten ist ein geschlossener, beheizter Raum und daher meist Gegenstand eines Bauverfahrens (Bauanzeige oder Baubewilligung). Das hängt von Grundstück und Bauordnung des Bundeslandes ab; stimmen Sie sich vor der Planung mit der Baubehörde oder einem befugten Planer ab.'),
    tr('Egész éves használatnál az épületenergetikai követelmények (hőátbocsátás, tüzelő- és hűtőberendezés) is érintettek lehetnek.', 'Bei ganzjähriger Nutzung können auch energietechnische Anforderungen (Wärmedurchgang, Heiz- und Kühlanlagen) betroffen sein.'),
    tr('Az irányár nem tartalmazza az engedélyezési tervet, a tervezői és eljárási díjakat.', 'Der Richtpreis enthält keine Einreichplanung, Planungs- oder Verfahrenskosten.'),
  ]
  if (building === 'carport') return [
    tr('A carport nyitott, tetővel fedett szerkezet; a helyi építési szabályzat, a telek beépítettsége és a telekhatártól mért távolság dönti el, hogy bejelentés- vagy engedélyköteles-e. A megrendelés előtt kérj tájékoztatást az építési hatóságtól.', 'Ein Carport ist eine offene, überdachte Konstruktion; Bauordnung, Bebauungsdichte und Grenzabstand entscheiden, ob er anzeige- oder bewilligungspflichtig ist. Holen Sie vor der Bestellung Auskunft bei der Baubehörde ein.'),
    tr('A tető hóteher-osztályát a telepítés helyének hózónája szerint kell megválasztani; ezt a felmérésen a gyártó ellenőrzi.', 'Die Schneelastklasse des Dachs richtet sich nach der Schneelastzone am Aufstellort; der Hersteller prüft das beim Aufmaß.'),
  ]
  return []
}

/** A zárt építmény sorai a specifikációhoz, a PDF-hez és a lead-e-mailhez. */
export function buildingSpecRows(config: PergolaConfig): [string, string][] {
  if (isCarport(config.building)) {
    const bays = carportBays(config.width)
    return [
      [tr('Építmény típusa', 'Bauwerkstyp'), `Carport · ${bays >= 2 ? tr('kétállásos', 'zwei Stellplätze') : bays === 1 ? tr('egyállásos', 'ein Stellplatz') : tr('előtető', 'Vordach')}`],
      [tr('Autóállás', 'Stellplätze'), bays >= 2 ? tr('2 autó egymás mellett', '2 Autos nebeneinander') : bays === 1 ? tr('1 autó', '1 Auto') : tr('autónak szűk', 'für ein Auto zu schmal')],
    ]
  }
  if (!isClosedBuilding(config.building)) return []
  const rows: [string, string][] = [[tr('Építmény típusa', 'Bauwerkstyp'), `${BUILDING_INFO[config.building].label} · ${BUILDING_INFO[config.building].season.toLowerCase()}`]]
  const glazing = effectiveWallGlazing(config)
  if (glazing) rows.push([tr('Oldalüvegezés', 'Seitenverglasung'), `${WALL_GLAZING_INFO[glazing].label} · ${WALL_GLAZING_INFO[glazing].ug}`])
  const doors = doorCount(config)
  if (doors.hinged + doors.sliding > 0) rows.push([tr('Ajtó', 'Tür'), [doors.hinged ? `${doors.hinged} ${tr('db nyíló', 'Drehtür(en)')}` : '', doors.sliding ? `${doors.sliding} ${tr('db toló', 'Schiebetür(en)')}` : ''].filter(Boolean).join(' + ')])
  if (config.climate) rows.push([tr('Fűtés / hűtés', 'Heizung / Kühlung'), CLIMATE_INFO[config.climate].label])
  if (config.foundation) rows.push([tr('Alap és padló', 'Fundament und Boden'), tr('Alapozott, szigetelt padlószerkezet', 'Fundamentierter, gedämmter Bodenaufbau')])
  if (config.building === 'conservatory') rows.push(['Profilrendszer', tr('Hőhídmentes alumínium', 'Thermisch getrenntes Aluminium')])
  return rows
}

const SIDE_ORDER: SideKey[] = ['front', 'left', 'right', 'back']

/**
 * Épülettípus-váltás okos alapértékekkel: megfelelő tető, nyitott oldalak lezárva, egy bejárati ajtó,
 * télikertnél enyhe tetődőlés, alap és klíma. A kliens ezt alkalmazza; a végső szabályokat a normalizáció adja.
 */
export function buildingPatch(config: PergolaConfig, building: BuildingType, roofs: RoofType[], sides: SideType[]): Partial<PergolaConfig> {
  // Vissza pergolára: a zárt építmény előtti oldalak (pl. zip-árnyékoló) visszakerülnek, nem marad üvegfal.
  if (building === 'pergola') return { building: undefined, wallGlazing: undefined, climate: undefined, foundation: undefined, ...(config.openSides ? { sides: { ...config.openSides } } : {}), openSides: undefined }
  const allowed = BUILDING_ROOFS[building].filter((roof) => roofs.includes(roof))
  const roof = allowed.includes(config.roof) ? config.roof : (allowed[0] ?? config.roof)
  // Carport: fix tető, minden nyitott oldal nyitva marad (az oldalzárás kézzel visszatehető), nincs üvegezés/klíma/alap.
  if (building === 'carport') {
    const openSides = Object.fromEntries((['front', 'back', 'left', 'right'] as SideKey[]).map((side) => [side, isWallSide(config.mount, side) ? config.sides[side] : 'none'])) as PergolaConfig['sides']
    return {
      building, roof, sides: openSides, split: undefined,
      openSides: config.openSides ?? (config.building ? undefined : { ...config.sides }),
      wallGlazing: undefined, climate: undefined, foundation: undefined,
    }
  }
  const has = (type: SideType) => sides.includes(type)
  const closing: SideType = has('glassFixed') ? 'glassFixed' : has('glass') ? 'glass' : 'none'
  const door: SideType = has('doorSliding') ? 'doorSliding' : has('door') ? 'door' : 'none'
  const open = SIDE_ORDER.filter((side) => !isWallSide(config.mount, side))
  const next = { ...config.sides }
  // Zárt építményben minden nyitott oldal üvegfal (vagy ajtó) lesz: a zip, a lamella és a lécfal is cserélődik, nem csak az üres oldal.
  open.forEach((side) => { if (!GLASS_WALL_TYPES.includes(next[side])) next[side] = closing })
  const hasDoor = open.some((side) => isDoorType(next[side]) || isDoorType(config.split?.[side] ?? 'none'))
  if (!hasDoor && door !== 'none') {
    const entrance = open.find((side) => next[side] === 'glassFixed' || next[side] === 'glass' || next[side] === 'none')
    if (entrance) next[entrance] = door
  }
  return {
    building,
    roof,
    sides: next,
    // Az eredeti (nyitott) oldalak megőrzése, hogy pergolára visszaváltva helyreálljanak.
    openSides: config.openSides ?? (config.building ? undefined : { ...config.sides }),
    wallGlazing: undefined,
    pitch: building === 'conservatory' && !config.pitch && roof === 'glass' ? 3 : config.pitch,
    climate: building === 'conservatory' ? (config.climate ?? 'split') : undefined,
    foundation: building === 'conservatory' ? true : undefined,
  }
}
