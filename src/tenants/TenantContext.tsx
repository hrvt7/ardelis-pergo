/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { roofLabels } from './rules'
import type { Tenant } from './types'
import type { RoofType } from '../types/pergola'

export interface TenantContextValue {
  tenant: Tenant
  labels: Record<RoofType, string>
  /** Árszerkesztő látható-e (csak ?admin=1 esetén, bemutatóhoz). */
  admin: boolean
  /** Beágyazott (iframe) mód: nincs kifelé mutató navigáció. */
  embed: boolean
  /** Hová vigyen a „Kezdőlap” link; null esetén nem jelenik meg. */
  homeHref: string | null
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ tenant, admin, embed, homeHref, children }: Omit<TenantContextValue, 'labels'> & { children: ReactNode }) {
  const value = useMemo(() => ({ tenant, labels: roofLabels(tenant), admin, embed, homeHref }), [tenant, admin, embed, homeHref])
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant(): TenantContextValue {
  const value = useContext(TenantContext)
  if (!value) throw new Error('useTenant: hiányzó TenantProvider')
  return value
}
