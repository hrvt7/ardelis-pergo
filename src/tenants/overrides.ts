// A gyártó által az admin felületen szerkesztett beállítások (felülírások) és azok ráfésülése a kódban
// lévő alap-tenantra. Böngészőben és szerveren is fut: ugyanaz a logika számol árat és fogad leadet.
//
// A tárolt adat NEM teljes tenant, csak a szerkeszthető része; ami hiányzik, azt a kód adja (demo.ts…).
import { z } from 'zod'
import { MOUNT_TYPES } from '../lib/mount'
import { ROOF_INFO, ROOF_TYPES } from '../lib/roofs'
import { SIDE_TYPES } from '../lib/sides'
import { MONEY_FIELDS } from './priceFields'
import { normalizeConfig, priceSettingsSchema } from './rules'
import type { Tenant, TenantRoof } from './types'
import type { PriceSettings, RoofType, SideType } from '../types/pergola'

const text = (max: number) => z.string().trim().max(max)
const optionalText = (max: number) => text(max).optional()
const url = text(300).refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), 'Érvényes http(s) cím kell.')
const email = text(320).refine((value) => value === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), 'Érvénytelen e-mail cím.')

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
  }).partial().optional(),
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

/** Az ügyfél számára is látható rész: a lead-fogadók e-mail címei nem kerülnek a böngészőbe. */
export function publicOverrides(overrides: TenantOverrides): TenantOverrides {
  const { lead, ...rest } = overrides
  void lead
  return rest
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

  const roofs = o.roofs
    ? Object.fromEntries(o.roofs.map((roof) => [roof, base.roofs[roof] ?? defaultRoof(roof)])) as Tenant['roofs']
    : base.roofs

  const tenant: Tenant = {
    ...base,
    brand,
    prices,
    roofs,
    sides: o.sides ?? base.sides,
    mounts: o.mounts ?? base.mounts,
    extras: { ...base.extras, ...o.extras },
    lead: {
      recipients: o.lead?.recipients ?? base.lead.recipients,
      subjectPrefix: o.lead?.subjectPrefix || base.lead.subjectPrefix,
    },
  }
  // Az alapértelmezett konfiguráció is feleljen meg a (szűkített) kínálatnak.
  return { ...tenant, defaultConfig: normalizeConfig(tenant, base.defaultConfig) }
}
