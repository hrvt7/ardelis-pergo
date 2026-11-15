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
  if (name.length < 2) errors.customerName = 'Add meg a neved (legalább 2 karakter).'
  if (!phone) errors.phone = 'Add meg a telefonszámod, hogy egyeztetni tudjunk.'
  else if (!PHONE.test(phone) || phone.replace(/\D/g, '').length < 6) errors.phone = 'A telefonszámban csak számjegy, szóköz és + - / ( ) lehet, pl. +36 30 123 4567.'
  if (!email) errors.email = 'Add meg az e-mail-címed.'
  else if (!EMAIL.test(email)) errors.email = 'Az e-mail-cím formátuma nem jó, pl. nev@email.hu.'
  if (city.length < 2) errors.city = 'Add meg a települést, ahol a felmérés lenne.'
  if (!values.consent) errors.consent = 'A kérelem elküldéséhez fogadd el az adatkezelést.'
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
