// Titkos tokenes útvonalak (tulajdonosi oldal /t/<token>, ajánlat /ajanlat/<token>) elrejtése a mérésekből és naplókból:
// a token maga a hozzáférés, ezért sem a webanalitikába, sem a naplóba, sem az og:url-be nem kerülhet.
const PRIVATE = /\/(t|ajanlat)\/[^/?#]+/g

export const redactPrivatePath = (value: string) => value.replace(PRIVATE, (_match, prefix: string) => `/${prefix}/[token]`)
