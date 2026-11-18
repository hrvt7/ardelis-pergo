// A gyártó által az admin felületen szerkesztett beállítások (felülírások) és azok ráfésülése a kódban
// lévő alap-tenantra. Böngészőben és szerveren is fut: ugyanaz a logika számol árat és fogad leadet.
//
// A tárolt adat NEM teljes tenant, csak a szerkeszthető része; ami hiányzik, azt a kód adja (demo.ts…).
import { z } from 'zod'
import { MOUNT_TYPES } from '../lib/mount'
import { ROOF_INFO, ROOF_TYPES } from '../lib/roofs'
import { SIDE_TYPES } from '../lib/sides'
import { MONEY_FIELDS } from './priceFields'
import { isBookingUrl } from '../lib/booking'
import { normalizeConfig, priceSettingsSchema } from './rules'
import { DEALER_ID_PATTERN } from './pricingRules'
import { isAllowedWebhookUrl, WEBHOOK_EVENTS } from './crm'
import { PRICE_DISPLAYS } from '../lib/priceDisplay'
import type { Tenant, TenantRoof } from './types'
import type { PriceSettings, RoofType, SideType } from '../types/pergola'

const text = (max: number) => z.string().trim().max(max)
const optionalText = (max: number) => text(max).optional()
const url = text(300).refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), 'Érvényes http(s) cím kell.')
const email = text(320).refine((value) => value === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), 'Érvénytelen e-mail cím.')

const months = z.number().int().min(0).max(240)

const RATE_KEYS = ['customColorRate', 'woodColorRate', 'installationRate', 'vatRate', 'thermalProfileRate'] as const
const ROOF_PRICE_KEYS = ROOF_TYPES.map((roof) => ROOF_INFO[roof].priceKey)
export const EDITABLE_PRICE_KEYS: string[] = [...ROOF_PRICE_KEYS, ...MONEY_FIELDS.map((field) => field.key), ...RATE_KEYS]

export const tenantOverridesSchema = z.object({
  brand: z.object({
    name: text(60).min(1, 'A megjelenített név kötelező.'),
    legalName: text(160).min(1, 'A cégnév kötelező.'),
    logoUrl: url,
    website: url,
    phone: text(40),
    email,
    address: text(200),
    privacyUrl: url,
    bookingUrl: text(300).refine(isBookingUrl, 'Csak https:// kezdetű cím adható meg.'),
  }).partial().optional(),
  /** Csak az ismert, szám típusú árkulcsok; a teljes sémát a mentés előtt a priceSettingsSchema is ellenőrzi. */
  prices: z.record(z.string(), z.unknown()).optional(),
  priceMatrix: priceSettingsSchema.shape.priceMatrix,
  roofs: z.array(z.enum(ROOF_TYPES as [RoofType, ...RoofType[]])).max(ROOF_TYPES.length).optional(),
  sides: z.array(z.enum(SIDE_TYPES.filter((type) => type !== 'none') as [Exclude<SideType, 'none'>, ...Exclude<SideType, 'none'>[]])).optional(),
  mounts: z.array(z.enum(MOUNT_TYPES as [Tenant['mounts'][number], ...Tenant['mounts']])).optional(),
  extras: z.object({
    led: z.boolean(), speakers: z.boolean(), sensors: z.boolean(), solar: z.boolean(),
    rgb: z.boolean(), fans: z.boolean(), smartHome: z.boolean(), roofShade: z.boolean(),
  }).partial().optional(),
  lead: z.object({
    recipients: z.array(email.min(1)).max(10),
    subjectPrefix: optionalText(80),
    followUp: z.boolean(),
    monthlyReport: z.boolean(),
  }).partial().optional(),
  installations: z.object({
    warranty: z.object({ structure: months, electronics: months, led: months, other: months }),
    retentionMonths: z.number().int().min(12).max(360),
  }).partial().optional(),
  /** Gyártói terméknevek a tetőrendszerekhez (fehér címke: a platform nevei helyett a gyártó sajátjai). */
  roofNames: z.partialRecord(z.enum(ROOF_TYPES as [RoofType, ...RoofType[]]), z.object({ name: text(40), short: text(60), description: text(400) }).partial()).optional(),
  /** Gyártható mérettartomány (m) és a fűtőpanelek maximuma – a konfigurátor csak ezen belül enged tervezni. */
  limits: z.object({
    width: z.tuple([z.number().min(1).max(30), z.number().min(1).max(30)]),
    depth: z.tuple([z.number().min(1).max(30), z.number().min(1).max(30)]),
    height: z.tuple([z.number().min(1.8).max(6), z.number().min(1.8).max(6)]),
    maxHeaters: z.number().int().min(0).max(20),
  }).partial().refine((limits) => (['width', 'depth', 'height'] as const).every((key) => !limits[key] || limits[key]![0] < limits[key]![1]), 'A minimum kisebb kell legyen a maximumnál.').optional(),
  /** Árazási szabályok: regionális felár (régiónként) és viszonteladói árrés (viszonteladónként). */
  pricingRules: z.object({
    regionSurcharges: z.record(text(80), z.object({
      percent: z.number().min(0, 'A felár nem lehet negatív.').max(50, 'A regionális felár legfeljebb 50% lehet.').optional(),
      net: z.number().int().min(0, 'A felár nem lehet negatív.').max(100_000_000).optional(),
    })).optional(),
    dealers: z.array(z.object({
      id: text(40).regex(DEALER_ID_PATTERN, 'A viszonteladó azonosítója kisbetű, szám és kötőjel lehet (pl. graz).'),
      name: text(80).min(1, 'A viszonteladó neve kötelező.'),
      marginPercent: z.number().min(0, 'Az árrés nem lehet negatív.').max(100, 'Az árrés legfeljebb 100% lehet.'),
      email: email.optional(),
    })).max(200).refine((dealers) => new Set(dealers.map((dealer) => dealer.id)).size === dealers.length, 'Két viszonteladónak nem lehet azonos azonosítója.').optional(),
  }).optional(),
  /** Ár megjelenítése a vevő felé (M05): becsült teljes ár / irányár „-tól” / ár nélkül. */
  priceDisplay: z.enum(PRICE_DISPLAYS).optional(),
  /** CRM-webhook (csak a szerver és az admin látja; a böngészőbe nem kerül). */
  crm: z.object({
    webhookUrl: text(500).refine((value) => value === '' || isAllowedWebhookUrl(value), 'Csak nyilvános https:// cím adható meg.'),
    secret: text(200),
    events: z.array(z.enum(WEBHOOK_EVENTS)).max(WEBHOOK_EVENTS.length),
  }).partial().refine((crm) => !crm.webhookUrl || (crm.secret ?? '').length >= 16, 'A webhookhoz legalább 16 karakteres titok kell (Generálás gomb).').optional(),
})

export type TenantOverrides = z.infer<typeof tenantOverridesSchema>

/** Ellenőrzi a beküldött beállításokat; hibánál az első hiba magyar szövege. */
export function parseOverrides(input: unknown): { ok: true; data: TenantOverrides } | { ok: false; error: string } {
  const parsed = tenantOverridesSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, error: `${issue?.path.join(' › ') || 'Adat'}: ${issue?.message ?? 'érvénytelen'}` }
  }
  const data = parsed.data
  if (data.roofs && data.roofs.length === 0) return { ok: false, error: 'Legalább egy tetőtípust engedélyezni kell.' }
  if (data.mounts && data.mounts.length === 0) return { ok: false, error: 'Legalább egy rögzítési módot engedélyezni kell.' }
  for (const [key, value] of Object.entries(data.prices ?? {})) {
    if (!EDITABLE_PRICE_KEYS.includes(key)) return { ok: false, error: `Ismeretlen ár: ${key}` }
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return { ok: false, error: `Az ár nem lehet negatív vagy üres: ${key}` }
    if ((RATE_KEYS as readonly string[]).includes(key) && value > 1) return { ok: false, error: `Az arány 0 és 1 között lehet: ${key}` }
  }
  return { ok: true, data }
}

/**
 * Az ügyfél számára is látható rész. Nem kerül a böngészőbe: a lead-fogadók e-mail címei, a telepítési beállítások, a CRM-webhook (cím, titok),
 * a viszonteladók e-mail címei, és a többi viszonteladó adata — egy viszonteladói link (`?h=`) csak a saját árrését kapja,
 * viszonteladó nélkül egyiket sem.
 */
export function publicOverrides(overrides: TenantOverrides, dealerId?: string, dealerScaledPrices?: (marginPercent: number) => PriceSettings): TenantOverrides {
  const { lead, installations, crm, pricingRules, ...rest } = overrides
  void lead; void installations; void crm
  if (!pricingRules) return rest
  const dealer = dealerId ? pricingRules.dealers?.find((item) => item.id === dealerId) : undefined
  // 4.92: az árrés-százalék nem kerül a böngészőbe (eddig bárki kiolvashatta a `?h=` értékek próbálgatásával).
  // A szerver a viszonteladói árrésszel már felszorzott árlistát küldi, a viszonteladó árrése a böngészőben 0.
  const scaled = dealer && dealerScaledPrices ? dealerScaledPrices(dealer.marginPercent) : null
  return {
    ...rest,
    ...(scaled ? {
      prices: Object.fromEntries(Object.entries(scaled).filter(([key, value]) => typeof value === 'number' && EDITABLE_PRICE_KEYS.includes(key))),
      ...(scaled.priceMatrix ? { priceMatrix: scaled.priceMatrix } : {}),
    } : {}),
    pricingRules: {
      regionSurcharges: pricingRules.regionSurcharges,
      dealers: dealer ? [{ id: dealer.id, name: dealer.name, marginPercent: scaled ? 0 : dealer.marginPercent }] : [],
    },
  }
}

const defaultRoof = (roof: RoofType): TenantRoof => ({ name: ROOF_INFO[roof].name, short: ROOF_INFO[roof].short, description: ROOF_INFO[roof].description })

/** A kódban lévő alap-tenant + a gyártó felülírásai = az érvényes tenant. Az alap nem módosul. */
export function applyOverrides(base: Tenant, overrides: unknown): Tenant {
  const checked = parseOverrides(overrides)
  if (!checked.ok) return base
  const o = checked.data

  const brand = { ...base.brand }
  for (const [key, value] of Object.entries(o.brand ?? {})) {
    if (typeof value !== 'string') continue
    ;(brand as Record<string, string | undefined>)[key] = value === '' && !['name', 'legalName'].includes(key) ? undefined : value
  }

  const prices: PriceSettings = { ...base.prices }
  for (const [key, value] of Object.entries(o.prices ?? {})) {
    if (typeof value === 'number') (prices as unknown as Record<string, number>)[key] = value
  }
  if (o.priceMatrix) prices.priceMatrix = o.priceMatrix

  const enabledRoofs = o.roofs ?? (Object.keys(base.roofs) as RoofType[])
  const roofs = Object.fromEntries(enabledRoofs.map((roof) => {
    const named = o.roofNames?.[roof] ?? {}
    const cleaned = Object.fromEntries(Object.entries(named).filter(([, value]) => typeof value === 'string' && value.trim() !== ''))
    return [roof, { ...(base.roofs[roof] ?? defaultRoof(roof)), ...cleaned }]
  })) as Tenant['roofs']

  const tenant: Tenant = {
    ...base,
    brand,
    prices,
    roofs,
    sides: o.sides ?? base.sides,
    mounts: o.mounts ?? base.mounts,
    limits: { ...base.limits, ...o.limits },
    extras: { ...base.extras, ...o.extras },
    pricingRules: o.pricingRules ? {
      regionSurcharges: o.pricingRules.regionSurcharges ?? base.pricingRules?.regionSurcharges,
      dealers: (o.pricingRules.dealers ?? base.pricingRules?.dealers)?.map((dealer) => ({ ...dealer, email: dealer.email || undefined })),
    } : base.pricingRules,
    crm: o.crm ? { ...base.crm, ...o.crm, webhookUrl: o.crm.webhookUrl || undefined, secret: o.crm.secret || undefined } : base.crm,
    lead: {
      recipients: o.lead?.recipients ?? base.lead.recipients,
      subjectPrefix: o.lead?.subjectPrefix || base.lead.subjectPrefix,
      followUp: o.lead?.followUp ?? base.lead.followUp ?? true,
      monthlyReport: o.lead?.monthlyReport ?? base.lead.monthlyReport ?? true,
    },
    installations: { ...base.installations, ...o.installations },
    priceDisplay: o.priceDisplay ?? base.priceDisplay,
  }
  // Az alapértelmezett konfiguráció is feleljen meg a (szűkített) kínálatnak.
  return { ...tenant, defaultConfig: normalizeConfig(tenant, base.defaultConfig) }
}
