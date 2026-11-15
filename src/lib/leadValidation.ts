import { tr } from '../i18n/locale'
// Az ajánlatkérő űrlap kliensoldali ellenőrzése: mezőnként érthető magyar hibaüzenet.
// A szerver ugyanezeket újra ellenőrzi; ez csak azt szolgálja, hogy a vásárló lássa, mit kell javítania.

export type LeadFieldName = 'customerName' | 'phone' | 'email' | 'city' | 'consent'

export interface LeadFormValues {
  customerName: string
  phone: string
  email: string
  city: string
  consent: boolean
}

/** A mezők sorrendje: az első hibás mezőre kerül a fókusz. */
export const LEAD_FIELD_ORDER: readonly LeadFieldName[] = ['customerName', 'phone', 'email', 'city', 'consent']

const PHONE = /^[+0-9 ()/-]{6,40}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function validateLead(values: LeadFormValues): Partial<Record<LeadFieldName, string>> {
  const errors: Partial<Record<LeadFieldName, string>> = {}
  const name = values.customerName.trim()
  const phone = values.phone.trim()
  const email = values.email.trim()
  const city = values.city.trim()
  if (name.length < 2) errors.customerName = tr('Add meg a neved (legalább 2 karakter).', 'Bitte Namen angeben (mindestens 2 Zeichen).')
  if (!phone) errors.phone = tr('Add meg a telefonszámod, hogy egyeztetni tudjunk.', 'Bitte Telefonnummer angeben, damit wir uns abstimmen können.')
  else if (!PHONE.test(phone) || phone.replace(/\D/g, '').length < 6) errors.phone = tr('A telefonszámban csak számjegy, szóköz és + - / ( ) lehet, pl. +36 30 123 4567.', 'Die Telefonnummer darf nur Ziffern, Leerzeichen und + - / ( ) enthalten, z. B. +43 664 1234567.')
  if (!email) errors.email = tr('Add meg az e-mail-címed.', 'Bitte E-Mail-Adresse angeben.')
  else if (!EMAIL.test(email)) errors.email = tr('Az e-mail-cím formátuma nem jó, pl. nev@email.hu.', 'Das E-Mail-Format ist ungültig, z. B. name@beispiel.at.')
  if (city.length < 2) errors.city = tr('Add meg a települést, ahol a felmérés lenne.', 'Bitte den Ort des Aufmaßes angeben.')
  if (!values.consent) errors.consent = tr('A kérelem elküldéséhez fogadd el az adatkezelést.', 'Bitte stimmen Sie der Datenverarbeitung zu, um die Anfrage zu senden.')
  return errors
}

export function firstInvalid(errors: Partial<Record<LeadFieldName, string>>): LeadFieldName | undefined {
  return LEAD_FIELD_ORDER.find((name) => errors[name])
}

/** A vevőnek szóló terméknév a belső termékcsalád-név nélkül: „Pergo · pergola” → „Pergola”. */
export function buyerProductName(label: string): string {
  const name = label.split(' · ').pop() ?? label
  return name.charAt(0).toLocaleUpperCase('hu') + name.slice(1)
}
