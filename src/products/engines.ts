// Termékcsalád-motorok: a szerver és a kliens közös, React nélküli szerződése (docs/TOBBTERMEK-TERV.md, 6. pont).
// Egy motor tudja a családja konfigurációját érvényesíteni, beárazni és megosztó-kódot adni neki. A lead-végpont és
// az ajánlat ezen keresztül dolgozik, így egy új család (carport, kerítés…) a saját motorjával illeszthető be, a
// pergola-kód módosítása nélkül. Csak relatív importok: Edge-függvényből is fut.
import type { Tenant } from '../tenants/types'
import type { PergolaConfig, PriceBreakdown } from '../types/pergola'
import { parseConfig, tenantPrice } from '../tenants/rules'
import { shareHash } from '../lib/shareCode'
import type { ProductFamily } from './index'

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
}

export const pergolaEngine: ProductEngine<PergolaConfig> = {
  id: 'pergola',
  shareKey: 'c',
  parse: (tenant, raw) => parseConfig(tenant, raw),
  price: (tenant, config) => tenantPrice(tenant, config),
  shareHash: (config) => shareHash(config),
}

const ENGINES: Partial<Record<ProductFamily, ProductEngine>> = { pergola: pergolaEngine as ProductEngine }

/** A család motorja, ha már van (a „hamarosan” családoknak nincs: ezekre lead sem fogadható). */
export const getEngine = (id: ProductFamily): ProductEngine | undefined => ENGINES[id]
