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
  // A carport a keretes-tető motoron fut (a pergola konfigurátor negyedik építménytípusa), ezért él.
  { id: 'carport', slug: 'carport', label: 'Carport és előtető', short: 'Egy- és kétállásos, bejárati előtető', description: 'Alumínium váz fix lemez-, polikarbonát- vagy üvegtetővel; méret, oszlopok, szín, burkolt beálló — valós 3D-ben, azonnali irányárral.', status: 'live' },
  // A kerítés a kültéri (lineáris) magon fut: saját konfiguráció, árazó és 3D (CatalogStudio).
  { id: 'fence', slug: 'kerites', label: 'Kerítés és kapu', short: 'Lamellás, lécfalas, tömör; toló- és szárnyas kapu', description: 'Alumínium, acél, kovácsoltvas, fa vagy WPC kerítés telekméretre, gépkocsikapuval, kiskapuval és motorral — folyóméter-árral.', status: 'live' },
  // A garázskapu saját magon fut (products/garage.ts): típus, nyílásméret, panel, ablak, szín, motor, saját 3D (GarageStudio).
  { id: 'garage-door', slug: 'garazskapu', label: 'Garázskapu', short: 'Szekcionált, billenő, redőny; motorral', description: 'Nyílásméretre szabott szekcionált, billenő, redőny- vagy oldalra nyíló kapu; panelminta, szigetelés, ablak, szín, motor — valós 3D-ben, azonnali irányárral.', status: 'live' },
  { id: 'garden-building', slug: 'kerti-haz', label: 'Kerti ház és szauna', short: 'Tároló, szauna, kerti iroda', description: 'Méret, tető, nyílászárók, terasz és belső elrendezés; később nyaraló és tiny house.', status: 'soon' },
]

export const DEFAULT_PRODUCT: ProductFamily = 'pergola'
/** A családok azonosítói sémákhoz (zod enum). */
export const PRODUCT_IDS = PRODUCTS.map((product) => product.id) as [ProductFamily, ...ProductFamily[]]

export const productInfo = (id: ProductFamily): ProductInfo => PRODUCTS.find((product) => product.id === id)!
export const productBySlug = (slug: string | undefined | null): ProductInfo | undefined => (slug ? PRODUCTS.find((product) => product.slug === slug.toLowerCase()) : undefined)

/** A gyártó által kínált családok; megadás nélkül csak a pergola (a meglévő gyártók változatlanul működnek). */
export const tenantProducts = (tenant: { products?: readonly ProductFamily[] }): ProductFamily[] => (tenant.products?.length ? [...tenant.products] : [DEFAULT_PRODUCT])

/** Érdeklődés-mérés eseményneve egy még nem elérhető családra (a /api/track fogadja). */
export type InterestEvent = `interest_${ProductFamily}`
export const interestEvent = (id: ProductFamily): InterestEvent => `interest_${id}`
export const INTEREST_EVENTS: readonly InterestEvent[] = PRODUCTS.map((product) => interestEvent(product.id))

const basePath = (mode: 'demo' | 'standalone' | 'embed', tenantId: string) => (mode === 'demo' ? '/konfigurator' : `/${mode === 'embed' ? 'embed' : 'k'}/${tenantId}`)

/** A konfigurátor útvonala egy családhoz, a megjelenítési mód szerint. A pergola a rövid, megszokott útvonalon marad. */
export function productPath(mode: 'demo' | 'standalone' | 'embed', tenantId: string, id: ProductFamily): string {
  const base = basePath(mode, tenantId)
  return id === DEFAULT_PRODUCT ? base : `${base}/${productInfo(id).slug}`
}

/** A termékválasztó oldal szelete: /konfigurator/termekek, /k/<gyártó>/termekek. Egyetlen család sem kaphatja ezt a szeletet. */
export const HUB_SLUG = 'termekek'
/** A termékválasztó oldal: innen indul minden család a saját, különálló kalkulátorába. */
export const hubPath = (mode: 'demo' | 'standalone' | 'embed', tenantId: string) => `${basePath(mode, tenantId)}/${HUB_SLUG}`
