// Termékcsaládok nyilvántartása (docs/TOBBTERMEK-TERV.md). Függőség nélküli, értékeket exportáló modul:
// a szerver (Edge) és a tesztek is relatív úton importálják, ezért itt nincs React, Vite vagy más import.
// Egy család akkor „live”, ha van hozzá konfigurátor; a „soon” családok a választóban érdeklődés-méréssel szerepelnek.

export type ProductFamily = 'pergola' | 'carport' | 'fence' | 'garage-door' | 'garden-building'

export interface ProductInfo {
  id: ProductFamily
  /** URL-szelet: /konfigurator/<slug>, /k/<gyarto>/<slug>. Csak kisbetű, szám, kötőjel. */
  slug: string
  label: string
  short: string
  description: string
  status: 'live' | 'soon'
}

export const PRODUCTS: readonly ProductInfo[] = [
  { id: 'pergola', slug: 'teraszfedes', label: 'Teraszfedés', short: 'Pergola, veranda, télikert', description: 'Lamellás, üveg- vagy textiltető, oldalzárás, szín és komfort — valós 3D-ben, azonnali irányárral.', status: 'live' },
  { id: 'carport', slug: 'carport', label: 'Carport és előtető', short: 'Egy- és kétállásos, bejárati előtető', description: 'Alumínium vagy acél váz, polikarbonát, üveg vagy lemeztető; méret, oszlopok, szín és vízelvezetés.', status: 'soon' },
  { id: 'fence', slug: 'kerites', label: 'Kerítés és kapu', short: 'Lamellás, lécfalas, tömör; toló- és szárnyas kapu', description: 'Alumínium lamellás vagy lécfalas kerítés telekméretre, kapuval és motorral, folyóméter-árral.', status: 'soon' },
  { id: 'garage-door', slug: 'garazskapu', label: 'Garázskapu', short: 'Szekcionált és billenő, motorral', description: 'Szabvány és egyedi nyílásméret, panelminta, szín, ablak, motor — beépítési ellenőrzéssel.', status: 'soon' },
  { id: 'garden-building', slug: 'kerti-haz', label: 'Kerti ház és szauna', short: 'Tároló, szauna, kerti iroda', description: 'Méret, tető, nyílászárók, terasz és belső elrendezés; később nyaraló és tiny house.', status: 'soon' },
]

export const DEFAULT_PRODUCT: ProductFamily = 'pergola'

export const productInfo = (id: ProductFamily): ProductInfo => PRODUCTS.find((product) => product.id === id)!
export const productBySlug = (slug: string | undefined | null): ProductInfo | undefined => (slug ? PRODUCTS.find((product) => product.slug === slug.toLowerCase()) : undefined)

/** A gyártó által kínált családok; megadás nélkül csak a pergola (a meglévő gyártók változatlanul működnek). */
export const tenantProducts = (tenant: { products?: readonly ProductFamily[] }): ProductFamily[] => (tenant.products?.length ? [...tenant.products] : [DEFAULT_PRODUCT])

/** Érdeklődés-mérés eseményneve egy még nem elérhető családra (a /api/track fogadja). */
export type InterestEvent = `interest_${ProductFamily}`
export const interestEvent = (id: ProductFamily): InterestEvent => `interest_${id}`
export const INTEREST_EVENTS: readonly InterestEvent[] = PRODUCTS.map((product) => interestEvent(product.id))

/** A konfigurátor útvonala egy családhoz, a megjelenítési mód szerint. A pergola a rövid, megszokott útvonalon marad. */
export function productPath(mode: 'demo' | 'standalone' | 'embed', tenantId: string, id: ProductFamily): string {
  const base = mode === 'demo' ? '/konfigurator' : `/${mode === 'embed' ? 'embed' : 'k'}/${tenantId}`
  return id === DEFAULT_PRODUCT ? base : `${base}/${productInfo(id).slug}`
}
