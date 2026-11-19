import { OS140 } from '@/lib/os140'
import { isMovableRoof } from '@/lib/roofs'
import type { RoofType } from '@/types/pergola'

/** A váz gerendájának fél-szélessége és fél-magassága (m): generikus váz vagy MB-OpenSky 140. */
export type FrameBeam = { half: number; halfHeight: number }

export const GENERIC_BEAM: FrameBeam = { half: 0.095, halfHeight: 0.115 }
export const OS140_BEAM: FrameBeam = { half: OS140.beamW / 2, halfHeight: OS140.beamH / 2 }

export function frameBeam(realLouvres: boolean): FrameBeam {
  return realLouvres ? OS140_BEAM : GENERIC_BEAM
}

/** LED-szalag a gerenda belső alsó élén: magasság, beljebb húzás és a két hossz. */
export function ledStripLayout(width: number, depth: number, height: number, beam: FrameBeam) {
  return {
    y: height - beam.halfHeight - 0.009,
    inset: beam.half + 0.012,
    runX: width - 2 * beam.half - 0.04,
    runZ: depth - 2 * beam.half - 0.04,
  }
}

/** A ventilátor tartórúdja a két gerenda belső síkja közt fut, a gerenda aljához rögzítve. */
export function fanBarSpan(width: number, depth: number, height: number, beam: FrameBeam) {
  return { beamBottom: height - beam.halfHeight, spanX: width - 2 * beam.half, spanZ: depth - 2 * beam.half }
}

/** A generikus motorház csak mozgó tetőn (lamella, zip-tető) jelenik meg; az OS140 saját hajtást rajzol. */
export function showsMotorHousing(realLouvres: boolean, roof: RoofType): boolean {
  return !realLouvres && isMovableRoof(roof)
}

/** Oldalfal (lamella- és lécfal) felső tartóprofiljának teteje: a gerenda alja alatt 11 cm. */
export function sideWallTop(height: number): number {
  return height - 0.11
}
