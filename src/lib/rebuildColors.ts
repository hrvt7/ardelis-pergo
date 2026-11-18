import type { FrameColor } from '@/types/pergola'
import type { Tenant } from '@/tenants/types'
import { findColor } from './colors'

/** Gyakori pergolaszínek (RAL), amelyekkel a gyártó alapszínei kiegészülnek, ha egyedi RAL-t is vállal. */
export const COMMON_RAL = ['RAL 7016', 'RAL 9005', 'RAL 9016', 'RAL 7021', 'RAL 7039', 'RAL 8019']

export interface QuickColor { key: string; color: FrameColor; custom?: string; name: string; detail: string; hex: string; standard: boolean }

/**
 * A Szín lépés rövid listája (Ádám: „5–6 tipikus szín + egyedi RAL kód”): előbb a gyártó felár nélküli
 * alapszínei, majd – ha a gyártó egyedi RAL színt is vállal – a gyakori RAL színek, legfeljebb `max` darab.
 */
export function quickColors(tenant: Pick<Tenant, 'colors' | 'customRal'>, max = 6): QuickColor[] {
  const list: QuickColor[] = tenant.colors.slice(0, max).map((item) => ({ key: item.id, color: item.id, name: item.name, detail: item.detail ?? (item.ral ? `RAL ${item.ral}` : ''), hex: item.hex, standard: true }))
  if (!tenant.customRal) return list
  for (const code of COMMON_RAL) {
    if (list.length >= max) break
    if (tenant.colors.some((item) => item.ral && `RAL ${item.ral}` === code)) continue
    const catalog = findColor(code)
    if (catalog) list.push({ key: code, color: 'custom', custom: code, name: catalog.name, detail: code, hex: catalog.hex, standard: false })
  }
  return list
}
