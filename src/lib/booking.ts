// A gyártó időpontfoglaló linkje (pl. Calendly, Google Naptár foglalóoldal), amit a vevő a felmérési kérelem után kap.
// Csak https-cím fogadható el (vevői e-mailbe és beágyazott oldalra kerül). Edge-ből is fut: függőség nélküli.

export const BOOKING_URL_PATTERN = /^https:\/\/[^\s/$.?#][^\s]*$/i

/** Érvényes https-cím, vagy üres szöveg (= nincs link). */
export const isBookingUrl = (value: string) => value === '' || BOOKING_URL_PATTERN.test(value.trim())

/** A gyártó foglalólinkje, ha be van állítva és https; különben null. */
export function bookingLink(tenant: { brand: { bookingUrl?: string } }): string | null {
  const url = tenant.brand.bookingUrl?.trim()
  return url && BOOKING_URL_PATTERN.test(url) ? url : null
}
