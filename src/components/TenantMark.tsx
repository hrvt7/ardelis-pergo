// A gyártó (tenant) márkajele a fejlécben és a betöltőben: a bemutató gyártó a Lamelix logót kapja,
// a valós gyártó a saját logóját (vagy a beépített jelet és nevet).
import type { Tenant } from '@/tenants/types'
import LamelixLogo from '@/components/LamelixLogo'

export default function TenantMark({ tenant, height = 26 }: { tenant: Pick<Tenant, 'demo' | 'brand'>; height?: number }) {
  if (tenant.demo) return <LamelixLogo className="tenant-mark tenant-mark-lamelix" height={height} title={null} />
  const { logoUrl, name, suffix } = tenant.brand
  return <>
    {logoUrl
      ? <img src={logoUrl} alt="" aria-hidden="true" style={{ height: height + 4, width: 'auto' }} />
      : <svg viewBox="0 0 30 30" aria-hidden="true"><path d="M3 23V7h17l7 7-7 7H3Zm6-5h10l3-2-3-2H9v4Z" fill="currentColor" /><path d="M3 26 27 3" stroke="currentColor" strokeWidth="1.4" /></svg>}
    <span><strong>{name}</strong>{suffix && <small>{suffix}</small>}</span>
  </>
}
