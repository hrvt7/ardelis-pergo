// Termékcsalád-motorok: a szerver és a kliens közös, React nélküli szerződése (docs/TOBBTERMEK-TERV.md, 6. pont).
// Egy motor tudja a családja konfigurációját érvényesíteni, beárazni és megosztó-kódot adni neki. A lead-végpont és
// az ajánlat ezen keresztül dolgozik, így egy új család (carport, kerítés…) a saját motorjával illeszthető be, a
// pergola-kód módosítása nélkül. Csak relatív importok: Edge-függvényből is fut.
import type { Tenant } from '../tenants/types'
import type { PergolaConfig, PriceBreakdown } from '../types/pergola'
import { parseConfig, tenantPrice } from '../tenants/rules'
import { shareHash } from '../lib/shareCode'
import type { OutdoorConfig } from '../types/catalog'
import { calculateOutdoorPrice, encodeOutdoorHash, OUTDOOR_PRICE_DEFAULTS, outdoorHeadline, outdoorSpecRows, parseOutdoorConfig } from './outdoor'
import type { ProductFamily } from './index'
import { calculateGaragePrice, encodeGarageHash, GARAGE_PRICE_DEFAULTS, garageHeadline, garageSpecRows, parseGarageConfig, type GarageConfig } from './garage'

export interface ProductEngine<C = unknown> {
  id: ProductFamily
  /** A megosztó hash kulcsa (`#c=…` a pergolánál); családonként más, hogy egy link egyértelműen egy családot jelöljön. */
  shareKey: string
  /** Ismeretlen bemenetből (link, lead) érvényes, a gyártóhoz igazított konfiguráció — vagy null. */
  parse(tenant: Tenant, raw: unknown): C | null
  /** A gyártó árlistájából újraszámolt ár; a böngészőből érkező összeg sosem számít. */
  price(tenant: Tenant, config: C): PriceBreakdown
  /** A konfiguráció megosztó-kódja a hash-be (`kulcs=kód`). */
  shareHash(config: C): string
  /** Egy soros fejléc a lead-e-mailbe és a vevői visszaigazolásba (pl. „Aero · 5,0 × 4,0 m”). A pergolánál a lead-végpont adja. */
  headline?(tenant: Tenant, config: C): string
  /** A konfiguráció olvasható sorai a lead-e-mailhez és az adatbázishoz. A pergolánál a lead-végpont `describeConfig`-ja adja. */
  describe?(tenant: Tenant, config: C, price: PriceBreakdown): [string, string][]
}

export const pergolaEngine: ProductEngine<PergolaConfig> = {
  id: 'pergola',
  shareKey: 'c',
  parse: (tenant, raw) => parseConfig(tenant, raw),
  price: (tenant, config) => tenantPrice(tenant, config),
  shareHash: (config) => shareHash(config),
}

/** Kerítés és kapu: a kültéri (lineáris) mag; ára ma a mintaárlistából, a gyártói árlista később a tenantból. */
export const fenceEngine: ProductEngine<OutdoorConfig> = {
  id: 'fence',
  shareKey: 'k',
  parse: (_tenant, raw) => parseOutdoorConfig(raw, 'fence'),
  price: (_tenant, config) => calculateOutdoorPrice(config, OUTDOOR_PRICE_DEFAULTS),
  shareHash: (config) => encodeOutdoorHash(config),
  headline: (_tenant, config) => outdoorHeadline(config),
  describe: (_tenant, config, price) => outdoorSpecRows(config, price),
}

/** Garázskapu: saját mag (products/garage.ts); ára ma a mintaárlistából, a gyártói árlista később a tenantból. */
export const garageEngine: ProductEngine<GarageConfig> = {
  id: 'garage-door',
  shareKey: 'g',
  parse: (_tenant, raw) => parseGarageConfig(raw),
  price: (_tenant, config) => calculateGaragePrice(config, GARAGE_PRICE_DEFAULTS),
  shareHash: (config) => encodeGarageHash(config),
  headline: (_tenant, config) => garageHeadline(config),
  describe: (_tenant, config, price) => garageSpecRows(config, price),
}

// A carport a keretes-tető család tagja: ugyanaz a konfiguráció (building: 'carport'), ugyanaz a motor.
const ENGINES: Partial<Record<ProductFamily, ProductEngine>> = { pergola: pergolaEngine as ProductEngine, carport: pergolaEngine as ProductEngine, fence: fenceEngine as ProductEngine, 'garage-door': garageEngine as ProductEngine }

/** A család motorja, ha már van (a „hamarosan” családoknak nincs: ezekre lead sem fogadható). */
export const getEngine = (id: ProductFamily): ProductEngine | undefined => ENGINES[id]
