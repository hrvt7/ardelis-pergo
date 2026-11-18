import type { ConfigStep } from '@/types/pergola'
import { localized, tr } from '../i18n/locale'

/**
 * Az újraépített konfigurátor lépései (docs/rebuild/STEP_ARCHITECTURE.md). Az azonosítók a meglévő
 * `ConfigStep` értékek, így minden meglévő logika (kamera, szabályok) változatlanul használható.
 */
export const REBUILD_STEPS: { id: ConfigStep; label: string; short: string; question: string }[] = localized(() => ([
  { id: 'size', label: tr('Termék', 'Produkt'), short: tr('Termék', 'Produkt'), question: tr('Mit építesz?', 'Was bauen Sie?') },
  { id: 'mount', label: tr('Méret', 'Größe'), short: tr('Méret', 'Größe'), question: tr('Hová kerül és mekkora?', 'Wohin und wie groß?') },
  { id: 'roof', label: tr('Tető', 'Dach'), short: tr('Tető', 'Dach'), question: tr('Milyen tető legyen?', 'Welches Dach?') },
  { id: 'sides', label: tr('Oldalak', 'Seiten'), short: tr('Oldalak', 'Seiten'), question: tr('Mi zárja az oldalakat?', 'Was schließt die Seiten?') },
  { id: 'color', label: tr('Szín', 'Farbe'), short: tr('Szín', 'Farbe'), question: tr('Milyen színű legyen?', 'Welche Farbe?') },
  { id: 'extras', label: tr('Komfort', 'Komfort'), short: tr('Komfort', 'Komfort'), question: tr('Mi kerüljön még bele?', 'Was soll noch dazu?') },
  { id: 'summary', label: tr('Összegzés', 'Übersicht'), short: tr('Összegzés', 'Übersicht'), question: tr('Ez lesz a terved', 'Das ist Ihr Entwurf') },
]))

export function rebuildStepIndex(step: ConfigStep): number {
  return Math.max(0, REBUILD_STEPS.findIndex((item) => item.id === step))
}

/** A szomszédos lépés (a lépéssáv végein nem lép túl). */
export function neighbourStep(step: ConfigStep, direction: 1 | -1): ConfigStep | null {
  return REBUILD_STEPS[rebuildStepIndex(step) + direction]?.id ?? null
}


/** A terasz eleje felé mutató égtájak (fok, É = 0, K = 90, D = 180, Ny = 270). */
export const FACINGS: { id: string; label: string; degrees: number }[] = localized(() => ([
  { id: 'N', label: tr('É', 'N'), degrees: 0 },
  { id: 'E', label: tr('K', 'O'), degrees: 90 },
  { id: 'S', label: tr('D', 'S'), degrees: 180 },
  { id: 'W', label: tr('Ny', 'W'), degrees: 270 },
]))

/**
 * A jelenet napívének elforgatása (`sunDirection`) a terasz tájolásából: alaphelyzetben (0°) a délre néző
 * teraszé (`lightBalance.sunPosition`), és ugyanabba az irányba forog, mint a valós napállás (`sun.sunVectorInScene`).
 */
export function sunDirectionForFacing(facing: number): number {
  return (((facing - 180) % 360) + 360) % 360
}
