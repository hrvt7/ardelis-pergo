import { useTenant } from '@/tenants/TenantContext'
import { formatPrice } from '@/lib/pricing'
import { fromPrice, priceDisplayOf, showsPrices, type PriceDisplay } from '@/lib/priceDisplay'
import { tr } from '@/i18n/locale'

/** A gyártó ármódja (M05) az új felület komponenseinek: mutat-e felárat, és hogyan írja ki az összeget. */
export function usePriceDisplay(): { mode: PriceDisplay; prices: boolean; total: (gross: number) => string } {
  const { tenant } = useTenant()
  const mode = priceDisplayOf(tenant)
  const total = (gross: number) => (mode === 'from' ? tr(`${formatPrice(fromPrice(gross, tenant.currency))}-tól`, `ab ${formatPrice(fromPrice(gross, tenant.currency))}`) : formatPrice(gross))
  return { mode, prices: showsPrices(mode), total }
}
