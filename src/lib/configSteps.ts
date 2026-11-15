import type { ConfigStep } from '@/types/pergola'

/** A pergola-konfigurátor lépései, sorrendben (a panel fülei és a mobil „Tovább” gomb is ebből dolgozik). */
export const STEPS: { id: ConfigStep; label: string; short: string }[] = [
  { id: 'size', label: 'Típus', short: 'Mit építesz' },
  { id: 'mount', label: 'Méret', short: 'Méret és szerkezet' },
  { id: 'sides', label: 'Tető', short: 'Tető és oldalak' },
  { id: 'color', label: 'Szín', short: 'Felület' },
  { id: 'extras', label: 'Extrák', short: 'Komfort' },
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
