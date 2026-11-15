import { describe, expect, it } from 'vitest'
import { demoTenant } from '../src/tenants/demo'
import { bookingLink, isBookingUrl } from '../src/lib/booking'
import { applyOverrides, tenantOverridesSchema } from '../src/tenants/overrides'
import { customerEmailHtml } from '../server/lead'
import { customerFollowUpHtml, type FollowUpLead } from '../server/followup'

const URL_OK = 'https://calendly.com/pelda-kft/felmeres'
const withBooking = { ...demoTenant, brand: { ...demoTenant.brand, bookingUrl: URL_OK } }

describe('időpontfoglaló link', () => {
  it('csak https cím fogadható el; üres = nincs link', () => {
    expect(isBookingUrl(URL_OK)).toBe(true)
    expect(isBookingUrl('')).toBe(true)
    expect(isBookingUrl('http://calendly.com/x')).toBe(false)
    expect(isBookingUrl('javascript:alert(1)')).toBe(false)
    expect(isBookingUrl('https://')).toBe(false)
    expect(tenantOverridesSchema.safeParse({ brand: { bookingUrl: 'http://pelda.hu' } }).success).toBe(false)
    expect(tenantOverridesSchema.safeParse({ brand: { bookingUrl: URL_OK } }).success).toBe(true)
  })

  it('az admin beállítása a tenantba kerül; üresen törlődik; nem https linket akkor sem ad tovább, ha a kódban szerepel', () => {
    expect(bookingLink(applyOverrides(demoTenant, { brand: { bookingUrl: URL_OK } }))).toBe(URL_OK)
    expect(bookingLink(applyOverrides(withBooking, { brand: { bookingUrl: '' } }))).toBeNull()
    expect(bookingLink({ brand: { bookingUrl: 'http://pelda.hu' } })).toBeNull()
    expect(bookingLink(demoTenant)).toBeNull()
  })

  it('a vevői visszaigazolásban foglalás gomb, ha van link; ha nincs, nincs', () => {
    const record = { tenant: withBooking, ref: 'LX-1', headline: 'Aero · 5,00 × 4,00 m', configUrl: 'https://lamelix.vercel.app/k/demo#c=1', price: { totalGross: 5_648_000 }, input: { customer: { name: 'Kovács Péter' } } }
    expect(customerEmailHtml(record as never)).toContain(URL_OK)
    expect(customerEmailHtml({ ...record, tenant: demoTenant } as never)).not.toContain('Felmérési időpont foglalása')
  })

  it('a 3 napos emlékeztetőben a foglalólink váltja a levélküldő gombot', () => {
    const lead = { ref: 'LX-1', tenant_id: 'demo', customer_name: 'Kovács Péter', email: 'kp@example.com', phone: '+36301234567', city: 'Sárvár', notes: null, address: null, estimate_gross: 5_648_000, config_url: 'https://lamelix.vercel.app/k/demo#c=1', status: 'new', created_at: '2026-11-10T10:00:00Z' } as FollowUpLead
    const html = customerFollowUpHtml(withBooking, lead, {})
    expect(html).toContain(URL_OK)
    expect(html).toContain('Időpontot foglalok')
    expect(html).not.toContain('mailto:')
  })
})
