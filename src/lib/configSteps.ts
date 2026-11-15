import type { ConfigStep } from '@/types/pergola'
import { tr } from '../i18n/locale'

/** A pergola-konfigurátor lépései, sorrendben (a panel fülei és a mobil „Tovább” gomb is ebből dolgozik). */
export const STEPS: { id: ConfigStep; label: string; short: string }[] = [
  { id: 'size', label: tr('Típus', 'Typ'), short: tr('Mit építesz', 'Was bauen Sie') },
  { id: 'mount', label: tr('Méret', 'Größe'), short: tr('Elhelyezés és méret', 'Montage und Größe') },
  { id: 'roof', label: tr('Tető', 'Dach'), short: tr('Tetőrendszer', 'Dachsystem') },
  { id: 'sides', label: tr('Oldalak', 'Seiten'), short: tr('Oldalzárás', 'Seitenelemente') },
  { id: 'color', label: tr('Szín', 'Farbe'), short: tr('Felület', 'Oberfläche') },
  { id: 'extras', label: tr('Komfort', 'Komfort'), short: tr('Komfort és vezérlés', 'Komfort und Steuerung') },
  { id: 'summary', label: tr('Összegzés', 'Übersicht'), short: tr('Felmérés', 'Aufmaß') },
]

/** A következő lépés; az utolsón null. */
export function nextStep(step: ConfigStep): ConfigStep | null {
  const index = STEPS.findIndex((item) => item.id === step)
  return index >= 0 && index < STEPS.length - 1 ? STEPS[index + 1].id : null
}

/**
 * A mobil alsó sáv gombja: mindig a következő lépésre visz (nem ugorja át a lépéseket az összegzésig);
 * az utolsó lépésen a felmérés-kérő űrlaphoz.
 */
export function mobileBarAction(step: ConfigStep): { kind: 'step'; step: ConfigStep; label: string } | { kind: 'lead'; label: string } {
  const next = nextStep(step)
  if (!next) return { kind: 'lead', label: tr('Felmérést kérek', 'Aufmaß anfragen') }
  return { kind: 'step', step: next, label: `${tr('Tovább', 'Weiter')}: ${STEPS.find((item) => item.id === next)!.label}` }
}

/**
 * Melyik lépésben javítható egy jelzés (buildingIssues azonosító): ott, és csak ott jelenik meg,
 * így egy figyelmeztetés sosem duplikálódik, és mindig a hozzá tartozó beállítás mellett látszik.
 */
export const ISSUE_STEP: Record<string, ConfigStep> = {
  'carport-narrow': 'mount', 'carport-double': 'mount', 'carport-depth': 'mount', 'carport-height': 'mount',
  'roof-heat': 'roof', 'cons-pitch': 'roof', 'carport-pitch': 'roof',
  'short-door': 'sides', 'cons-open': 'sides', 'cons-door': 'sides', 'veranda-open': 'sides', 'veranda-access': 'sides',
  'cons-foundation': 'extras', 'cons-climate': 'extras',
}

export function issuesForStep(step: ConfigStep): string[] {
  return Object.entries(ISSUE_STEP).filter(([, target]) => target === step).map(([id]) => id)
}
