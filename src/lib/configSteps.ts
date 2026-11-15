import type { ConfigStep } from '@/types/pergola'

/** A pergola-konfigurátor lépései, sorrendben (a panel fülei és a mobil „Tovább” gomb is ebből dolgozik). */
export const STEPS: { id: ConfigStep; label: string; short: string }[] = [
  { id: 'size', label: 'Típus', short: 'Mit építesz' },
  { id: 'mount', label: 'Méret', short: 'Elhelyezés és méret' },
  { id: 'roof', label: 'Tető', short: 'Tetőrendszer' },
  { id: 'sides', label: 'Oldalak', short: 'Oldalzárás' },
  { id: 'color', label: 'Szín', short: 'Felület' },
  { id: 'extras', label: 'Komfort', short: 'Komfort és vezérlés' },
  { id: 'summary', label: 'Összegzés', short: 'Felmérés' },
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
  if (!next) return { kind: 'lead', label: 'Felmérést kérek' }
  return { kind: 'step', step: next, label: `Tovább: ${STEPS.find((item) => item.id === next)!.label}` }
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
