/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { roofLabels } from './rules'
import type { Tenant } from './types'
import type { RoofType } from '../types/pergola'
import type { ProductFamily } from '../products'

export interface TenantContextValue {
  tenant: Tenant
  /** Melyik termékcsalád konfigurátora fut (ma csak a pergola él). */
  product: ProductFamily
  /** Megjelenítési mód az útvonalképzéshez: demo → /konfigurator, standalone → /k/:id, embed → /embed/:id. */
  mode: 'demo' | 'standalone' | 'embed'
  labels: Record<RoofType, string>
  /** Árszerkesztő látható-e (csak ?admin=1 esetén, bemutatóhoz). */
  admin: boolean
  /** Beágyazott (iframe) mód: nincs kifelé mutató navigáció. */
  embed: boolean
  /** Hová vigyen a „Kezdőlap” link; null esetén nem jelenik meg. */
  homeHref: string | null
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ tenant, admin, embed, homeHref, product = 'pergola', mode = 'demo', children }: Omit<TenantContextValue, 'labels' | 'product' | 'mode'> & { product?: ProductFamily; mode?: TenantContextValue['mode']; children: ReactNode }) {
  const value = useMemo(() => ({ tenant, product, mode, labels: roofLabels(tenant), admin, embed, homeHref }), [tenant, product, mode, admin, embed, homeHref])
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant(): TenantContextValue {
  const value = useContext(TenantContext)
  if (!value) throw new Error('useTenant: hiányzó TenantProvider')
  return value
}
