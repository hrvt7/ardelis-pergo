// A konfigurátor (vevői felület) nyelve: magyar vagy német, gyártónként (Tenant.locale).
//
// Hogyan működik:
//  - Egy oldalbetöltés egy gyártót mutat. A nyelv a betöltéskor, az URL-ből (/k/:id, /embed/:id) dől el,
//    MÉG az alkalmazás moduljai előtt (src/i18n/bootLocale.ts a main.tsx első importja). Így a modulszintű
//    szövegtárak (tetők, színek, oldalak…) is már a jó nyelven jönnek létre.
//  - A szövegek a helyükön fordítódnak: tr('magyar szöveg', 'deutscher Text'). A magyar a hivatkozási nyelv.
//  - A szerver ezt NEM használja (ott a nyelv mindig a 'hu' alapérték); a szerveroldali szövegek
//    (e-mailek) a gyártó nyelvét kifejezetten kapják meg.
//
// Böngészőben és szerveren is betöltődhet: import nélkül, tiszta TypeScript.

export type Locale = 'hu' | 'de'

export const LOCALES: readonly Locale[] = ['hu', 'de']

/** Számok és dátumok formázásának nyelvi kódja. */
export const INTL_LOCALE: Record<Locale, string> = { hu: 'hu-HU', de: 'de-AT' }

let current: Locale = 'hu'

export function setLocale(locale: Locale) {
  current = locale
}

export const getLocale = (): Locale => current

export const intlLocale = () => INTL_LOCALE[current]

/** Szöveg a felület nyelvén. Az első paraméter a magyar (hivatkozási) szöveg, a második a német. */
export function tr(hu: string, de: string): string {
  return current === 'de' ? de : hu
}

export const isLocale = (value: unknown): value is Locale => value === 'hu' || value === 'de'

/** A gyártó-azonosító a konfigurátor URL-jéből (/k/:id…, /embed/:id…), vagy null. */
export function tenantIdFromPath(pathname: string): string | null {
  const match = /^\/(?:k|embed)\/([a-z0-9-]+)(?:\/|$)/i.exec(pathname)
  return match ? match[1].toLowerCase() : null
}
