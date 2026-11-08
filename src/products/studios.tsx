/* eslint-disable react-refresh/only-export-components */
// Termékcsaládonként a konfigurátor (Stúdió) komponense, lustán. Csak a kliens használja.
// Egy új család itt kapja meg a saját Stúdióját; amíg nincs, a „hamarosan” oldal jelenik meg (TenantStudio).
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { ProductFamily } from './index'

const LOADERS: Partial<Record<ProductFamily, () => Promise<{ default: ComponentType }>>> = {
  pergola: () => import('@/pages/PergoStudio'),
}

const STUDIOS: Partial<Record<ProductFamily, LazyExoticComponent<ComponentType>>> = Object.fromEntries(
  Object.entries(LOADERS).map(([id, loader]) => [id, lazy(loader!)]),
) as Partial<Record<ProductFamily, LazyExoticComponent<ComponentType>>>

/** Van-e már Stúdió a családhoz. */
export const hasStudio = (id: ProductFamily) => Boolean(STUDIOS[id])
/** A Stúdió kódjának előtöltése (a gyártói beállítások lekérésével párhuzamosan). */
export const preloadStudio = (id: ProductFamily) => LOADERS[id]?.()

/** A család Stúdiója; a hívó Suspense-be teszi. Nincs Stúdió → nem rajzol semmit (a hívó dönt a „hamarosan” oldalról). */
export function ProductStudio({ id }: { id: ProductFamily }) {
  const Studio = STUDIOS[id]
  return Studio ? <Studio /> : null
}
