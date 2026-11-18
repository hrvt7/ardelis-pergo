import type { ConfigStep } from '@/types/pergola'

/** Saját, a lépésekhez rajzolt vonalikonok (24-es rács, lekerekített vonalvég). */
const PATHS: Record<ConfigStep, string> = {
  // Termék: pergola keret tetővel
  size: 'M3.5 8.5 6 5.5h12l2.5 3H3.5Z M5.5 8.5V19 M18.5 8.5V19 M3 19h3.5 M17.5 19H21',
  // Hely és méret: alaprajz méretnyíllal
  mount: 'M5 10h14v9H5Z M5 6.5h14 M5 5v3 M19 5v3 M8.5 6.5 7 5.5 M15.5 6.5 17 5.5',
  // Tető: elfordított lamellák
  roof: 'M3.5 12.5h17 M4.5 10.5 8 7 M10.25 10.5l3.5-3.5 M16 10.5l3.5-3.5 M5.5 12.5V19 M18.5 12.5V19',
  // Oldalak: félig leengedett screen
  sides: 'M4.5 4.5h15v15h-15Z M4.5 12h15 M8.5 4.5V12 M12 4.5V12 M15.5 4.5V12',
  // Szín: festékcsepp
  color: 'M12 3.5c3.2 3.7 6 6.8 6 10.2a6 6 0 0 1-12 0c0-3.4 2.8-6.5 6-10.2Z M9.5 14.5a2.6 2.6 0 0 0 2.5 2.5',
  // Komfort: függőlámpa fénnyel
  extras: 'M12 3v3.5 M6.5 13a5.5 5.5 0 0 1 11 0Z M10 16h4 M6 18.5l-1.2 1.2 M18 18.5l1.2 1.2 M12 18.5V20.5',
  // Összegzés: lap pipával
  summary: 'M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z M8.5 12.5l2.4 2.4 4.6-5',
}

export default function StepIcon({ step, size = 22 }: { step: ConfigStep; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[step]} /></svg>
}
