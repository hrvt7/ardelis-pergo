// A 3D jelenet környezetének elrendezése (ház, házszárnyak, kert), tiszta TypeScript.
// Egyetlen igazságforrás: a jelenet ebből rajzol, a bejárás ütközésvizsgálata ebből számol.
import { HOUSE_RAW } from './houseDims'
import { A45_HOUSE, STYLED_HOUSE, styledHouseScale } from './house'
import { hasBackWall, isWallSide, sideWalls } from './mount'
import type { HouseStyle, PergolaConfig, SideKey } from '../types/pergola'

type Layout = Pick<PergolaConfig, 'width' | 'depth' | 'height' | 'mount'>

/**
 * frontZ a ház homlokzatának síkja. Falhoz rögzítve a pergola 18 cm-es fali
 * profilja közvetlenül a homlokzaton ül. A ház úgy méreteződik, hogy az eresz
 * mindig a pergola fölé essen (magas pergolánál arányosan nagyobb a ház).
 */
export function getHouseLayout(config: Layout, style: HouseStyle = 'classic') {
  const attached = hasBackWall(config.mount)
  if (style === 'a45') {
    // Valós méretű típusház: léptéke 1, a pergola a bejárati homlokzat közepe elé kerül.
    const frontZ = attached ? -config.depth / 2 - 0.185 : -config.depth / 2 - 4.6
    return { frontZ, attached, width: A45_HOUSE.width, scale: 1, depth: A45_HOUSE.depth }
  }
  if (style !== 'classic') {
    // Modellezett ház: a pergola a főtömeg közepe elé kerül; jobbra a melléképület nyúlik túl (a kert ehhez igazodik).
    const scale = styledHouseScale(config.width)
    const frontZ = attached ? -config.depth / 2 - 0.185 : -config.depth / 2 - 4.6
    return { frontZ, attached, width: (STYLED_HOUSE.main + 2 * STYLED_HOUSE.annex) * scale, scale, depth: STYLED_HOUSE.depth * scale }
  }
  // A ház léptéke a pergola szélességétől és az oszlopmagasságtól függ, a tető dőlésétől NEM:
  // a dőlés csak a hátsó (fali) élt emeli, a ház mérete nem változhat vele (arányos marad).
  const scale = Math.max(Math.max(17, config.width + 6) / HOUSE_RAW.width, (config.height + 0.32) / HOUSE_RAW.eave)
  const frontZ = attached ? -config.depth / 2 - 0.185 : -config.depth / 2 - 4.6 - HOUSE_RAW.facadeInset * scale
  return { frontZ, attached, width: HOUSE_RAW.width * scale, scale, depth: HOUSE_RAW.depth * scale }
}

/** A házszárny szélessége (x irányban), méter. */
export const WING_DEPTH = 4.4

/** Sarok- és fülkerögzítésnél a pergola melletti házszárnyak alaprajza (x: belső és külső fal, z: hátsó és elülső vég). */
export function wingFootprints(config: Layout, style: HouseStyle = 'classic') {
  const layout = getHouseLayout(config, style)
  const zBack = layout.frontZ - 0.9
  const zFront = layout.frontZ + Math.max(config.depth + 1.5, 5.2)
  return sideWalls(config.mount).map((side) => {
    const sx = side === 'left' ? -1 : 1
    const inner = sx * (config.width / 2 + 0.125)
    return { side, sx, inner, outer: inner + sx * WING_DEPTH, zBack, zFront }
  })
}

/** Van-e nyíló (szárnyas) ajtó az adott oldalon – egész vagy fél oldalon. */
export function hasSwingDoor(config: Pick<PergolaConfig, 'sides' | 'split'>, side: SideKey) {
  return config.sides[side] === 'door' || config.split?.[side] === 'door'
}

/** [x, z, forgatás, lépték] */
export type Placement = [number, number, number, number]

/** A kert elemeinek helye: sövény, ültetőládák, kerti lámpák, dézsák és a telekhatár. */
export function gardenLayout(config: Layout & Pick<PergolaConfig, 'sides' | 'split'>, style: HouseStyle = 'classic') {
  const house = getHouseLayout(config, style)
  // Nyírt sövény a két telekhatáron (a kerítésen belül), a ház vonalától az utcáig.
  const boundary = house.width / 2 + 1.05
  const hedgeFrom = house.frontZ + 0.9
  const hedgeCount = Math.max(0, Math.floor((8.3 - hedgeFrom) / 2))
  const hedges = [-1, 1].flatMap((side) => Array.from({ length: hedgeCount }, (_, index): Placement => [side * (boundary - 0.55), hedgeFrom + 1 + index * 2, Math.PI / 2, 1]))
  // Ültetőládák a homlokzat előtt, a pergola két oldalán (falas oldalon és önálló pergolánál nincs).
  const planters = house.attached ? (['left', 'right'] as const).filter((side) => !isWallSide(config.mount, side)).map((side): Placement => [(side === 'left' ? -1 : 1) * (config.width / 2 + 2.15), house.frontZ + 0.42, 0, 1]) : []
  // Kerti lámpák a lépőkövek mentén, a pergola előtt.
  const bollards = [4.1, 5.75, 7.4].filter((z) => z > config.depth / 2 + 0.7).flatMap((z): Placement[] => [[-0.95, z, 0, 1], [0.95, z, 0, 1]])
  // Oldalfal esetén a dézsák a fal végéhez, a terasz elejére kerülnek. Nyíló ajtós oldal mellől a dézsa kijjebb kerül, hogy a kinyíló szárny ne ütközzön bele.
  const leftPot: Placement = isWallSide(config.mount, 'left') ? [-config.width / 2 + 0.38, config.depth / 2 + (hasSwingDoor(config, 'front') ? 1.75 : 0.62), 0, 1.25] : [-config.width / 2 - (hasSwingDoor(config, 'left') ? 1.9 : 0.75), config.depth / 2, 0, 1.25]
  const rightPot: Placement = isWallSide(config.mount, 'right') ? [config.width / 2 - 0.38, config.depth / 2 + (hasSwingDoor(config, 'front') ? 1.75 : 0.62), 0, 1.05] : [config.width / 2 + (hasSwingDoor(config, 'right') ? 1.9 : 0.8), hasBackWall(config.mount) ? -config.depth / 2 + 0.5 : -config.depth / 2, 0, 1.05]
  return { house, boundary, hedgeFrom, hedges, planters, bollards, pots: [leftPot, rightPot] }
}
